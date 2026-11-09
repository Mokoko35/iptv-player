import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { hostSnapshot, resetPlayback, send, setHostFullscreen, setLocal, setVideoRect, useHostState } from './host'
import { kindOfUrl } from './kinds'
import { LanguageMenu } from './LanguageMenu'
import { PlayerChrome } from './PlayerChrome'
import { type TrackInfo, decodeSubtitle } from './tracks'
import type { Channel } from './types'
import { loadVolume, saveVolume } from './volume'

const HIDE_AFTER_MS = 3000

interface Props {
  channel: Channel
  autoplay: boolean
  className: string
  /** Corner mini player: no control bar, a click pauses and plays. */
  compact: boolean
  onPrev?: () => void
  onNext?: () => void
  navLabel?: string
  topRight?: ReactNode
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
  onBack?: () => void
  trackMenus?: boolean
}

/**
 * The player inside the C# app. The picture is drawn by LibVLC in a native view behind this page, so this element
 * is an empty, transparent window onto it. It tells C# what to play and where the video area is, and shows the
 * controls on top. See docs/HOST-BRIDGE.md.
 */
export function HostPlayer({ channel, autoplay, className, compact, onPrev, onNext, navLabel, topRight, wantFullscreen = false, onFullscreenHandled, onBack, trackMenus = false }: Props) {
  const host = useHostState()
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const [{ volume, muted }, setSound] = useState(loadVolume)
  const [awake, setAwake] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const fullscreen = host.fullscreen
  const isVod = host.duration > 0

  /* Start what is chosen; stop when the player goes away. ---------------------------------------------------- */
  useEffect(() => {
    resetPlayback()
    send({
      cmd: 'play',
      url: channel.url,
      title: channel.name,
      kind: kindOfUrl(channel.url),
      autoplay,
      volume,
      muted,
      subtitles: channel.subtitleTracks ?? [],
    })
    // Only a different address restarts playback; the volume and the rest are sent by their own controls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.url])

  useEffect(
    () => () => {
      send({ cmd: 'stop' })
      setVideoRect(null)
      if (hostSnapshot().fullscreen) setHostFullscreen(false)
    },
    [],
  )

  /* Tell C# where the video area is. ------------------------------------------------------------------------- */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setVideoRect({ x: r.left, y: r.top, width: r.width, height: r.height })
    }
    const observer = new ResizeObserver(measure) // also runs once right away
    observer.observe(el)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    // A move without a resize (a window sliding into place, a list scrolling) is caught here.
    const poll = window.setInterval(measure, 400)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      window.clearInterval(poll)
    }
  }, [compact, fullscreen])

  /* Ask for the audio and subtitle tracks. LibVLC only finds them a moment after it starts playing, so a single message
     sent at the "Playing" event is often empty or never sent. Asking again a few times is cheap and always works. ---- */
  useEffect(() => {
    const timers = [800, 2000, 4000, 8000, 15000].map((ms) =>
      window.setTimeout(() => {
        const s = hostSnapshot()
        const known = s.audio.some((t) => t.id !== -1) || s.subtitles.some((t) => t.id !== -1)
        if (!known) send({ cmd: 'tracks' })
      }, ms),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [channel.url])

  /* Controls that hide after three seconds. ------------------------------------------------------------------ */
  const arm = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setAwake(false), HIDE_AFTER_MS)
  }, [])
  const wake = useCallback(() => {
    setAwake(true)
    arm()
  }, [arm])
  useEffect(() => {
    arm()
    return () => window.clearTimeout(hideTimer.current)
  }, [arm])
  useEffect(() => {
    const id = window.setTimeout(wake, 0)
    return () => window.clearTimeout(id)
  }, [compact, fullscreen, wake])

  // Any mouse movement over the video area brings the controls back, wherever the event lands: the check is on the position,
  // not on which element received the event, so a layer above the player cannot hide the movement from it.
  useEffect(() => {
    if (compact) return
    let lastLog = 0
    const onMove = (e: Event) => {
      const el = wrapRef.current
      if (!el) return
      const point = e as MouseEvent
      const r = el.getBoundingClientRect()
      const inside = point.clientX >= r.left && point.clientX <= r.right && point.clientY >= r.top && point.clientY <= r.bottom
      if (inside) wake()
      // Debugging aid: localStorage.setItem('iptv-player:debug-osd', '1') in the console, then move the mouse over the video.
      if (localStorage.getItem('iptv-player:debug-osd') === '1' && Date.now() - lastLog > 1000) {
        lastLog = Date.now()
        console.log('[osd]', e.type, { x: point.clientX, y: point.clientY, inside, rect: { left: r.left, top: r.top, width: r.width, height: r.height }, hit: document.elementFromPoint(point.clientX, point.clientY)?.className })
      }
    }
    const events = ['mousemove', 'pointermove', 'mousedown', 'pointerdown', 'touchstart', 'wheel'] as const
    for (const name of events) document.addEventListener(name, onMove, { passive: true })
    return () => {
      for (const name of events) document.removeEventListener(name, onMove)
    }
  }, [compact, wake])

  // C# can also report mouse movement over the video itself (see docs/HOST-BRIDGE.md, "activity").
  useEffect(() => {
    if (host.activity === 0) return
    const id = window.setTimeout(wake, 0)
    return () => window.clearTimeout(id)
  }, [host.activity, wake])

  /* Actions. ------------------------------------------------------------------------------------------------- */
  const togglePlay = useCallback(() => send({ cmd: hostSnapshot().paused ? 'resume' : 'pause' }), [])
  const seek = useCallback(
    (seconds: number) => {
      if (host.duration > 0) send({ cmd: 'seek', seconds: Math.max(0, Math.min(host.duration, seconds)) })
    },
    [host.duration],
  )
  const changeVolume = (value: number, nextMuted = value === 0) => {
    setSound({ volume: value, muted: nextMuted })
    saveVolume(value, nextMuted)
    setLocal({ volume: value, muted: nextMuted })
    send({ cmd: 'volume', value })
    send({ cmd: 'mute', on: nextMuted })
  }
  const toggleMute = useCallback(() => changeVolume(volume === 0 ? 1 : volume, !muted), [volume, muted]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggleFullscreen = useCallback(() => setHostFullscreen(!hostSnapshot().fullscreen), [])

  // A film asked to start full screen.
  useEffect(() => {
    if (!wantFullscreen) return
    if (!compact) setHostFullscreen(true)
    onFullscreenHandled?.()
  }, [wantFullscreen, compact, onFullscreenHandled])

  // Shrinking to the corner leaves full screen, so the controls never vanish while the window stays full.
  useEffect(() => {
    if (compact && hostSnapshot().fullscreen) setHostFullscreen(false)
  }, [compact])

  /* Audio and subtitles come from LibVLC. -------------------------------------------------------------------- */
  // LibVLC lists a "disabled" entry with id -1 for each; the menu has its own "Kapalı", so leave it out.
  const audio = host.audio.filter((t) => t.id !== -1)
  const subs = host.subtitles.filter((t) => t.id !== -1)
  const tracks: TrackInfo = {
    audio: audio.map((t) => ({ label: t.label })),
    audioIndex: audio.findIndex((t) => t.selected),
    audioSupported: true,
    subs: subs.map((t) => ({ label: t.label })),
    subIndex: subs.findIndex((t) => t.selected),
  }
  const selectAudio = (index: number) => {
    const t = audio[index]
    if (t) send({ cmd: 'audioTrack', id: t.id })
  }
  const selectSubtitle = (index: number) => send({ cmd: 'subtitleTrack', id: subs[index]?.id ?? -1 })
  const addSubtitleFile = (file: File) => {
    void file
      .arrayBuffer()
      .then((buf) => send({ cmd: 'addSubtitle', name: file.name, text: decodeSubtitle(buf) }))
      .catch(() => undefined)
  }

  /* Keyboard: ← → change channel (or skip 10 s), space pauses, M mutes, F full screen, Esc leaves full screen. -- */
  useEffect(() => {
    if (compact) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const state = hostSnapshot()
      if (e.key === 'Escape' && state.fullscreen) {
        e.stopPropagation() // leave full screen only; do not also close the window behind
        setHostFullscreen(false)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const back = e.key === 'ArrowLeft'
        if (back && onPrev) onPrev()
        else if (!back && onNext) onNext()
        else if (state.duration > 0) seek(state.time + (back ? -10 : 10))
        else return
      } else if (e.key === ' ' && t?.tagName !== 'BUTTON') togglePlay()
      else if (e.key === 'm' || e.key === 'M') toggleMute()
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else return
      e.preventDefault()
      wake()
    }
    window.addEventListener('keydown', onKey, true) // capture: runs before the window's own Escape handling
    return () => window.removeEventListener('keydown', onKey, true)
  }, [compact, onPrev, onNext, seek, togglePlay, toggleMute, toggleFullscreen, wake])

  const message = host.error
  const show = !compact && (awake || host.paused || message !== null || menuOpen)
  const hideCursor = !compact && !show && !host.paused

  return (
    <div
      ref={wrapRef}
      onContextMenu={(e) => {
        // Right-click on the full screen picture is "back".
        if (!onBack || compact || !hostSnapshot().fullscreen) return
        e.preventDefault()
        onBack()
      }}
      onPointerMove={compact ? undefined : wake}
      onMouseMove={compact ? undefined : wake}
      onPointerDown={compact ? undefined : wake}
      onFocusCapture={compact ? undefined : wake}
      // Transparent on purpose: the video is behind this element. In full screen it covers the whole page.
      className={`player-surface bg-transparent ${fullscreen ? 'fixed inset-0 z-[100] h-screen w-screen' : 'relative aspect-video w-full overflow-hidden'} ${hideCursor ? 'cursor-none' : ''} ${className}`}
    >
      {/* The click target over the picture (the controls sit above it). */}
      <div className="absolute inset-0" onClick={togglePlay} onDoubleClick={compact ? undefined : toggleFullscreen} />

      {host.buffering && !message && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="animate-spin text-white/80 drop-shadow" size={36} aria-label="Yükleniyor" />
        </div>
      )}

      {!compact && (
        <PlayerChrome
          show={show}
          channel={channel}
          topRight={topRight}
          paused={host.paused}
          isVod={isVod}
          time={host.time}
          total={host.duration}
          volume={volume}
          muted={muted}
          fullscreen={fullscreen}
          navLabel={navLabel}
          onPrev={onPrev}
          onNext={onNext}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onVolume={(v) => changeVolume(v)}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          // Films and episodes always have the menu; a live channel gets it when LibVLC found extra audio or subtitles.
          languageMenu={trackMenus || audio.length > 1 || subs.length > 0 ? <LanguageMenu tracks={tracks} onAudio={selectAudio} onSubtitle={selectSubtitle} onSubtitleFile={addSubtitleFile} onOpenChange={setMenuOpen} /> : undefined}
        />
      )}

      {message && (
        <div role="alert" className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
          <div className="max-w-md">
            <AlertTriangle className="mx-auto text-danger" size={28} aria-hidden="true" />
            <p className="mt-3 text-pretty text-sm text-[var(--ink-2)]">{message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
