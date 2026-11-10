import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical, Maximize2, Pause, Play, X } from 'lucide-react'
import { IS_HOST, send, setHostFullscreen, useHostState, useVideoRect } from './host'
import { kindOf } from './kinds'
import { NowPlayingInfo } from './NowPlayingInfo'
import { Player } from './Player'
import { usePipBox } from './pip'
import { useMedia } from './useMedia'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * The one player. It is a single element that is drawn in one of three places, so changing place never restarts the stream:
 * - inline: over an empty box in the Live TV / Favorites page (no window),
 * - modal: a large window over the page,
 * - mini: docked in the corner while you browse.
 */
export function PlayerOverlay() {
  const { current, playerMode, inlineHost, inlineSlot, minimizePlayer, expandPlayer, stopPlayer, prefs, channelNav, fullscreenPending, fullscreenHandled } = useMedia()
  const mode = !current || playerMode === 'closed' ? 'closed' : inlineHost ? 'inline' : playerMode
  const modal = mode === 'modal'
  const inline = mode === 'inline'

  // Is the player filling the screen? Decides what the X button and a right-click do.
  // In the C# app the window goes full screen (the host state says so); in a browser the page uses the Fullscreen API.
  const host = useHostState()
  const hostFull = host.fullscreen
  const [domFull, setDomFull] = useState(false)
  useEffect(() => {
    const onChange = () => setDomFull(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const isFull = IS_HOST ? hostFull : domFull

  // The small player is a free window (drag it anywhere, resize it) in a browser, and in the C# app when C# says it can draw
  // the video above the page (`hello.frontLayer`). Otherwise it stays docked in the strip at the right.
  const pipFree = mode === 'mini' && (!IS_HOST || host.frontLayer)
  const pip = usePipBox(pipFree)
  // The free small player must show the video even if the picture ends up behind the page (a WebView2 that is drawn above
  // every other element of the window does that): the page gets a hole where the video is. If C# really draws the video
  // above the page the hole changes nothing. `localStorage['iptv-player:pip-hole'] = '0'` turns the hole off.
  const pipHole = IS_HOST && pipFree && localStorage.getItem('iptv-player:pip-hole') !== '0'
  const videoRect = useVideoRect()
  useEffect(() => {
    const page = document.getElementById('root')
    if (!page || !pipHole || !videoRect) return
    let frame = 0
    let last = ''
    const cut = () => {
      frame = 0
      const p = page.getBoundingClientRect() // the page scrolls, the player does not
      const x = Math.round(videoRect.x - p.left)
      const y = Math.round(videoRect.y - p.top)
      const right = Math.round(x + videoRect.width)
      const bottom = Math.round(y + videoRect.height)
      const next = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x}px ${y}px, ${right}px ${y}px, ${right}px ${bottom}px, ${x}px ${bottom}px, ${x}px ${y}px)`
      if (next !== last) page.style.clipPath = last = next
    }
    const later = () => {
      if (!frame) frame = requestAnimationFrame(cut)
    }
    cut()
    window.addEventListener('scroll', later, true)
    window.addEventListener('resize', later)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', later, true)
      window.removeEventListener('resize', later)
    }
  }, [pipHole, videoRect])
  useEffect(
    () => () => {
      document.getElementById('root')?.style.removeProperty('clip-path') // hole off, or the player gone
    },
    [pipHole],
  )
  const vod = current !== null && kindOf(current) !== 'live'
  // "Back": leave full screen first, then close. A film or episode is stopped; a live channel shrinks to the corner.
  const goBack = () => {
    if (IS_HOST) setHostFullscreen(false)
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    if (vod) stopPlayer()
    else minimizePlayer()
  }

  // Inline: follow the empty box in the page.
  const [box, setBox] = useState<Box | null>(null)
  useEffect(() => {
    if (!inline || !inlineSlot) return
    const measure = () => {
      const r = inlineSlot.getBoundingClientRect()
      setBox((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : { top: r.top, left: r.left, width: r.width, height: r.height }))
    }
    const observer = new ResizeObserver(measure) // also runs once right away
    observer.observe(inlineSlot)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [inline, inlineSlot, prefs.sidebarCollapsed])

  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') minimizePlayer()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [modal, minimizePlayer])

  // In the C# app the picture is drawn behind the page, so no page pixel may sit on top of it. The page is told what the
  // player is doing and index.css does the rest: the page is hidden while the player window is open, and it leaves a free
  // strip on the right while the small player is docked. Nothing here draws, clips or catches the mouse for the page.
  useEffect(() => {
    if (!IS_HOST) return
    document.documentElement.dataset.playerMode = pipFree ? 'pip' : mode
    return () => {
      delete document.documentElement.dataset.playerMode
    }
  }, [mode, pipFree])

  if (!current || mode === 'closed') return null

  const player = (
    <Player
      channel={current}
      autoplay={prefs.autoplay}
      className={IS_HOST && inline ? 'rounded-none !aspect-auto h-full' : pipFree ? `shrink-0 rounded-none ${pipHole ? '' : '!bg-black'}` : 'rounded-none'}
      layoutKey={pipFree ? pip.key : undefined}
      compact={mode === 'mini'}
      wantFullscreen={fullscreenPending}
      onFullscreenHandled={fullscreenHandled}
      onPrev={!(mode === 'mini') && channelNav ? () => channelNav.step(-1) : undefined}
      onNext={!(mode === 'mini') && channelNav ? () => channelNav.step(1) : undefined}
      onBack={(modal || inline) && vod ? goBack : undefined}
      trackMenus={vod && mode !== 'mini'}
      navLabel={channelNav ? `${channelNav.position} / ${channelNav.total}` : undefined}
      topRight={
        modal || (inline && vod && isFull) ? (
          <button
            type="button"
            onClick={isFull ? goBack : minimizePlayer}
            aria-label={isFull && vod ? 'Geri: tam ekrandan çık ve oynatıcıyı kapat' : 'Pencereyi kapat ve köşeye küçült'}
            title={isFull && vod ? 'Geri (sağ tık da aynı işi yapar)' : 'Kapat (yayın köşede devam eder)'}
            className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white/90 hover:bg-black/75 hover:text-white"
          >
            <X size={20} />
          </button>
        ) : undefined
      }
    />
  )

  // In the C# app the video is drawn behind the page, so everything over the video area has to be see-through.
  // The container loses its background and rounding; the position is absolute inside a full-page layer, because a
  // transformed parent would trap the full screen player (it is position: fixed).
  const positioned = IS_HOST ? 'absolute' : 'fixed'
  // In full screen nothing but the picture and its controls may remain: no border, no title panel, no dark backdrop.
  const bare = IS_HOST && isFull
  const containerClass = bare
    ? 'pointer-events-auto absolute inset-0'
    : inline
    ? IS_HOST
      ? 'pointer-events-auto absolute overflow-hidden rounded-[14px] border-8 border-white/[0.14] shadow-2xl'
      : 'fixed z-20 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl'
    : modal
      ? IS_HOST
        ? 'pointer-events-auto absolute inset-x-0 top-[3dvh] mx-auto max-h-[94dvh] w-[min(1100px,96vw,calc((100dvh_-_400px)*1.7778))] min-w-[min(96vw,360px)] overflow-y-auto rounded-[18px] border-8 border-white/[0.14] shadow-2xl'
        : 'fixed left-1/2 top-1/2 z-50 max-h-[96dvh] w-[min(1100px,96vw,calc((100dvh_-_400px)*1.7778))] min-w-[min(96vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/15 bg-elev shadow-2xl'
      : pipFree
        ? IS_HOST
          ? 'pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border-[5px] border-white/[0.16] shadow-2xl'
          : 'fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl'
        : IS_HOST
          ? 'pointer-events-auto absolute bottom-[4.5rem] right-3 w-64 overflow-hidden rounded-xl border-[5px] border-white/[0.16] shadow-2xl sm:w-80 lg:bottom-5 lg:right-5'
          : 'fixed bottom-[4.5rem] right-3 z-40 w-64 overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl sm:w-80 lg:bottom-5 lg:right-5'

  const container = (
    <div
      role={modal ? 'dialog' : 'complementary'}
      aria-modal={modal || undefined}
      aria-label={`Oynatıcı: ${current.name}`}
      style={inline ? (box ? { position: positioned, top: box.top, left: box.left, width: box.width, height: box.height } : { visibility: 'hidden' }) : pipFree ? { left: pip.box.x, top: pip.box.y, width: pip.box.w } : undefined}
      className={containerClass}
    >
      {/* Slot 0 is empty in every mode but the free small player, so the player below keeps its place (and its stream). */}
      {pipFree ? <PipBar title={current.name} handlers={pip.move} onReset={pip.reset} onKeyDown={pip.onKeyDown} onExpand={expandPlayer} onStop={stopPlayer} /> : null}
      {player}

      {modal && !bare && (
        <div className={`p-5 sm:p-6 ${IS_HOST ? 'rounded-b-lg bg-elev' : ''}`}>
          <NowPlayingInfo channel={current} windowed />
        </div>
      )}

      {pipFree && <PipResizeStrip handlers={pip.size} />}

      {mode === 'mini' && !pipFree && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/80 to-transparent p-2">
          <p className="min-w-0 flex-1 truncate pl-1 pt-1.5 text-xs font-medium text-white/90">{current.name}</p>
          <div className="pointer-events-auto flex shrink-0 gap-1">
            <button type="button" onClick={expandPlayer} aria-label="Büyüt" title="Büyüt" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white/85 hover:text-white">
              <Maximize2 size={15} />
            </button>
            <button type="button" onClick={stopPlayer} aria-label="Yayını kapat" title="Yayını kapat" className="grid h-9 w-9 place-items-center rounded-full bg-black/55 text-white/85 hover:text-danger">
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  if (!IS_HOST) {
    return (
      <>
        {modal && <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" onClick={minimizePlayer} aria-hidden="true" />}
        {/* The same element in every mode: only its class and position change. */}
        {container}
      </>
    )
  }
  // The small player and the player window are always the top layer; the Live TV preview box sits in the page.
  const layer = isFull || mode === 'mini' ? 'z-[2147483000]' : modal ? 'z-[2147482000]' : 'z-20'
  const tree = (
    <div data-player-layer className={`pointer-events-none fixed inset-0 ${layer}`}>
      {modal && !bare && <HoleBackdrop onClick={minimizePlayer} />}
      {container}
    </div>
  )
  // Outside the page root: the page is hidden or cut while the player is up, and the player must not be hidden with it.
  return createPortal(tree, document.getElementById('player-root') ?? document.body)
}

/** The dark layer behind the player window, with a hole where the video is, so the native video stays visible. */
function HoleBackdrop({ onClick }: { onClick: () => void }) {
  const r = useVideoRect()
  const hole = r ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${r.x}px ${r.y}px, ${r.x + r.width}px ${r.y}px, ${r.x + r.width}px ${r.y + r.height}px, ${r.x}px ${r.y + r.height}px, ${r.x}px ${r.y}px)` : undefined
  return <div className="pointer-events-auto absolute inset-0 bg-black/85" style={{ clipPath: hole }} onClick={onClick} aria-hidden="true" />
}

/** Title bar of the free small player: drag it to move the window; arrow keys move it too. Double click: back to the corner. */
function PipBar({ title, handlers, onReset, onKeyDown, onExpand, onStop }: { title: string; handlers: ReturnType<typeof usePipBox>['move']; onReset: () => void; onKeyDown: ReturnType<typeof usePipBox>['onKeyDown']; onExpand: () => void; onStop: () => void }) {
  // Pressing a button in the bar must not start a drag or count as a double click on the bar.
  const own = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation(), onDoubleClick: (e: React.MouseEvent) => e.stopPropagation() }
  return (
    <div
      {...handlers}
      tabIndex={0}
      role="group"
      aria-label="Küçük oynatıcıyı taşı (ok tuşları taşır, Shift ile boyutlar)"
      title="Sürükleyerek taşı. Çift tık: köşeye al"
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className="flex h-9 shrink-0 cursor-grab touch-none select-none items-center gap-1 bg-black/75 pl-1.5 pr-1 text-white/90 active:cursor-grabbing"
    >
      <GripVertical size={16} className="shrink-0 text-white/45" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-xs font-medium">{title}</p>
      {IS_HOST && <PauseButton />}
      <button type="button" {...own} onClick={onExpand} aria-label="Büyüt" title="Büyüt" className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white">
        <Maximize2 size={15} />
      </button>
      <button type="button" {...own} onClick={onStop} aria-label="Yayını kapat" title="Yayını kapat" className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-danger">
        <X size={16} />
      </button>
    </div>
  )
}

/** Pause and resume for the host: the picture is C#'s, so the page asks. */
function PauseButton() {
  const paused = useHostState().paused
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={() => send({ cmd: paused ? 'resume' : 'pause' })}
      aria-label={paused ? 'Oynat' : 'Duraklat'}
      title={paused ? 'Oynat' : 'Duraklat'}
      className="grid h-8 w-8 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
    >
      {paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}
    </button>
  )
}

/** The strip under the video of the free small player. Drag its corner to resize. It sits outside the video area. */
function PipResizeStrip({ handlers }: { handlers: ReturnType<typeof usePipBox>['size'] }) {
  return (
    <div className="flex h-3.5 shrink-0 justify-end bg-black/75">
      <div {...handlers} role="separator" aria-label="Boyutu değiştir" title="Boyutu değiştir" className="grid h-3.5 w-7 cursor-nwse-resize touch-none place-items-center text-white/55 hover:text-white">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M9 1 1 9M9 5 5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
