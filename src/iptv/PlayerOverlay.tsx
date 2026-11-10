import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { IS_HOST, setHostFullscreen, useHostState, useVideoRect } from './host'
import { kindOf } from './kinds'
import { NowPlayingInfo } from './NowPlayingInfo'
import { Player } from './Player'
import { useMedia } from './useMedia'

interface Box {
  top: number
  left: number
  width: number
  height: number
}

/**
 * The one player. It is a single element that is drawn in one of two places, so changing place never restarts the stream:
 * - inline: over an empty box in the Live TV / Favorites page (no window),
 * - modal: a large window over the page.
 * Closing the window, or leaving Live TV / Favorites, stops the stream. There is no small corner player.
 */
export function PlayerOverlay() {
  const { current, playerMode, inlineHost, inlineSlot, stopPlayer, prefs, channelNav, fullscreenPending, fullscreenHandled, route } = useMedia()
  // A player that was in the page stays on screen as a window if the window just got too narrow for the page player, and is
  // gone as soon as you leave Live TV / Favorites.
  const onInlinePage = route.page === 'live' || route.page === 'favorites'
  const mode = !current || playerMode === 'closed' ? 'closed' : inlineHost ? 'inline' : playerMode === 'modal' || (playerMode === 'inline' && onInlinePage) ? 'modal' : 'closed'
  const modal = mode === 'modal'
  const inline = mode === 'inline'

  // Is the player filling the screen? Decides what the X button and a right-click do.
  // In the C# app the window goes full screen (the host state says so); in a browser the page uses the Fullscreen API.
  const hostFull = useHostState().fullscreen
  const [domFull, setDomFull] = useState(false)
  useEffect(() => {
    const onChange = () => setDomFull(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const isFull = IS_HOST ? hostFull : domFull
  const vod = current !== null && kindOf(current) !== 'live'
  // "Back": leave full screen first, then close and stop.
  const goBack = () => {
    if (IS_HOST) setHostFullscreen(false)
    else if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    stopPlayer()
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

  // The window closes with Esc, and the page behind it does not scroll meanwhile.
  useEffect(() => {
    if (!modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopPlayer()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [modal, stopPlayer])

  // In the C# app the picture is drawn behind the page, so no page pixel may sit on top of it. The page is told what the
  // player is doing and index.css does the rest: the page is hidden while the player window is open.
  useEffect(() => {
    if (!IS_HOST) return
    document.documentElement.dataset.playerMode = mode
    return () => {
      delete document.documentElement.dataset.playerMode
    }
  }, [mode])

  if (!current || mode === 'closed') return null

  const player = (
    <Player
      channel={current}
      autoplay={prefs.autoplay}
      className={IS_HOST && inline ? 'rounded-none !aspect-auto h-full' : 'rounded-none'}
      wantFullscreen={fullscreenPending}
      onFullscreenHandled={fullscreenHandled}
      onPrev={channelNav ? () => channelNav.step(-1) : undefined}
      onNext={channelNav ? () => channelNav.step(1) : undefined}
      onBack={vod ? goBack : undefined}
      trackMenus={vod}
      navLabel={channelNav ? `${channelNav.position} / ${channelNav.total}` : undefined}
      topRight={
        modal || (inline && vod && isFull) ? (
          <button
            type="button"
            onClick={isFull ? goBack : stopPlayer}
            aria-label={isFull && vod ? 'Geri: tam ekrandan çık ve oynatıcıyı kapat' : 'Oynatıcıyı kapat'}
            title={isFull && vod ? 'Geri (sağ tık da aynı işi yapar)' : 'Kapat (yayın durur)'}
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
    : IS_HOST
      ? 'pointer-events-auto absolute inset-x-0 top-[3dvh] mx-auto max-h-[94dvh] w-[min(1100px,96vw,calc((100dvh_-_400px)*1.7778))] min-w-[min(96vw,360px)] overflow-y-auto rounded-[18px] border-8 border-white/[0.14] shadow-2xl'
      : 'fixed left-1/2 top-1/2 z-50 max-h-[96dvh] w-[min(1100px,96vw,calc((100dvh_-_400px)*1.7778))] min-w-[min(96vw,360px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/15 bg-elev shadow-2xl'

  const container = (
    <div
      role={modal ? 'dialog' : 'complementary'}
      aria-modal={modal || undefined}
      aria-label={`Oynatıcı: ${current.name}`}
      style={inline ? (box ? { position: positioned, top: box.top, left: box.left, width: box.width, height: box.height } : { visibility: 'hidden' }) : undefined}
      className={containerClass}
    >
      {player}

      {modal && !bare && (
        <div className={`p-5 sm:p-6 ${IS_HOST ? 'rounded-b-lg bg-elev' : ''}`}>
          <NowPlayingInfo channel={current} />
        </div>
      )}
    </div>
  )

  if (!IS_HOST) {
    return (
      <>
        {modal && <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" onClick={stopPlayer} aria-hidden="true" />}
        {/* The same element in both places: only its class and position change. */}
        {container}
      </>
    )
  }
  // The player window and full screen are the top layer; the Live TV preview box sits in the page.
  const layer = isFull ? 'z-[2147483000]' : modal ? 'z-[2147482000]' : 'z-20'
  const tree = (
    <div data-player-layer className={`pointer-events-none fixed inset-0 ${layer}`}>
      {modal && !bare && <HoleBackdrop onClick={stopPlayer} />}
      {container}
    </div>
  )
  // Outside the page root: the page is hidden while the player window is up, and the player must not be hidden with it.
  return createPortal(tree, document.getElementById('player-root') ?? document.body)
}

/** The dark layer behind the player window, with a hole where the video is, so the native video stays visible. */
function HoleBackdrop({ onClick }: { onClick: () => void }) {
  const r = useVideoRect()
  const hole = r ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${r.x}px ${r.y}px, ${r.x + r.width}px ${r.y}px, ${r.x + r.width}px ${r.y + r.height}px, ${r.x}px ${r.y + r.height}px, ${r.x}px ${r.y}px)` : undefined
  return <div className="pointer-events-auto absolute inset-0 bg-black/85" style={{ clipPath: hole }} onClick={onClick} aria-hidden="true" />
}
