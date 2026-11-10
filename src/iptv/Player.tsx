import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, Tv } from 'lucide-react'
import { LanguageMenu } from './LanguageMenu'
import { PlayerChrome } from './PlayerChrome'
import { HostPlayer } from './HostPlayer'
import { IS_HOST } from './host'
import { loadVolume, saveVolume } from './volume'
import { EMPTY_TRACKS, type TrackInfo, labelFor, loadSubtitle, subtitleFromFile } from './tracks'
import type { Channel, SubtitleSource } from './types'

type Engine = 'hls' | 'ts' | 'native'
const NO_SOURCES: SubtitleSource[] = []
type HlsInstance = import('hls.js').default

/* Audio languages and subtitles: from the HLS playlist when there is one, otherwise from the video element itself. */
interface NativeAudioTrack {
  enabled: boolean
  label: string
  language: string
}
interface NativeAudioList {
  length: number
  [index: number]: NativeAudioTrack | undefined
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}
const nativeAudio = (video: HTMLVideoElement): NativeAudioList | undefined => (video as unknown as { audioTracks?: NativeAudioList }).audioTracks
const textTracksOf = (video: HTMLVideoElement): TextTrack[] => Array.from(video.textTracks).filter((t) => t.kind === 'subtitles' || t.kind === 'captions')

/** `extras` are the subtitle files added by hand or listed by the portal (<track> elements we created). */
function readTracks(video: HTMLVideoElement, hls: HlsInstance | null, extras: HTMLTrackElement[]): TrackInfo {
  if (hls) {
    const own = hls.subtitleTracks
    const extraShowing = extras.findIndex((el) => el.track.mode === 'showing')
    return {
      audio: hls.audioTracks.map((t, i) => ({ label: labelFor(t.name, t.lang, `Ses ${i + 1}`) })),
      audioIndex: hls.audioTrack,
      audioSupported: true,
      subs: [...own.map((t, i) => ({ label: labelFor(t.name, t.lang, `Altyazı ${i + 1}`) })), ...extras.map((el, i) => ({ label: el.label || `Altyazı ${own.length + i + 1}` }))],
      subIndex: hls.subtitleTrack >= 0 ? hls.subtitleTrack : extraShowing >= 0 ? own.length + extraShowing : -1,
    }
  }
  const audio: TrackInfo['audio'] = []
  let audioIndex = -1
  const list = nativeAudio(video)
  for (let i = 0; list && i < list.length; i++) {
    const t = list[i]
    if (!t) continue
    audio.push({ label: labelFor(t.label, t.language, `Ses ${i + 1}`) })
    if (t.enabled) audioIndex = i
  }
  const texts = textTracksOf(video)
  return {
    audio,
    audioIndex,
    audioSupported: list !== undefined,
    subs: texts.map((t, i) => ({ label: labelFor(t.label, t.language, `Altyazı ${i + 1}`) })),
    subIndex: texts.findIndex((t) => t.mode === 'showing'),
  }
}

function engineFor(url: string): Engine {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (path.endsWith('.m3u8') || path.includes('.m3u8')) return 'hls'
  if (/\.(mp4|mkv|webm|m4v|mov|ogv|ogg|mp3|aac)$/.test(path)) return 'native'
  return 'ts' // ".ts" and extension-less live URLs (typical for Xtream portals)
}

/** An https page cannot load http streams. Desktop (file://) and plain http pages can. */
const mixedContent = (url: string) => window.location.protocol === 'https:' && url.startsWith('http://')

const HIDE_AFTER_MS = 3000

interface CoreProps {
  channel: Channel
  autoplay: boolean
  className: string
  /** Corner mini player: no control bar, a click pauses and plays. */
  compact: boolean
  onPrev?: () => void
  onNext?: () => void
  /** "12 / 340": where the channel is in its list. */
  navLabel?: string
  /** Buttons shown at the top right with the other controls. */
  topRight?: ReactNode
  /** Enter full screen as soon as this player shows, for a film or episode the user just chose to play. */
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
  /** Right-click in full screen. Meant as "back": leave full screen and close the player. */
  onBack?: () => void
  /** Show the audio language and subtitle menus (films and episodes). */
  trackMenus?: boolean
}

function PlayerCore({ channel, autoplay, className, compact, onPrev, onNext, navLabel, topRight, wantFullscreen = false, onFullscreenHandled, onBack, trackMenus = false }: CoreProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  // Status belongs to one stream address. A new channel starts as "loading" without remounting the player,
  // which is what keeps full screen alive when you change channels.
  const [status, setStatus] = useState<{ url: string; loading: boolean; error: string | null } | null>(null)
  const own = status?.url === channel.url ? status : null
  const loading = own ? own.loading : true
  const error = own ? own.error : null
  const [paused, setPaused] = useState(true)
  const [{ volume, muted }, setSound] = useState(loadVolume)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [awake, setAwake] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)
  const hlsRef = useRef<HlsInstance | null>(null)
  const extrasRef = useRef<{ el: HTMLTrackElement; url: string }[]>([])
  const [tracks, setTracks] = useState<TrackInfo>(EMPTY_TRACKS)
  const [menuOpen, setMenuOpen] = useState(false)
  const blocked = mixedContent(channel.url)
  const total = duration
  const isVod = Number.isFinite(total) && total > 0

  // Controls appear on any activity and go away after three seconds of none.
  const arm = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setAwake(false), HIDE_AFTER_MS)
  }, [])
  const wake = useCallback(() => {
    setAwake(true)
    arm()
  }, [arm])
  useEffect(() => {
    arm() // first three seconds on a new channel show the name and controls, then they hide
    return () => window.clearTimeout(hideTimer.current)
  }, [arm])

  useEffect(() => {
    const video = videoRef.current
    if (!video || blocked) return
    let disposed = false
    let teardown: (() => void) | undefined
    video.volume = volume
    video.muted = muted

    const url = channel.url
    const patch = (p: { loading?: boolean; error?: string | null }) =>
      setStatus((prev) => ({ ...(prev?.url === url ? prev : { url, loading: true, error: null }), ...p }))
    const fail = (message: string) => {
      if (!disposed) patch({ error: message, loading: false })
    }
    const onPlaying = () => patch({ loading: false, error: null })
    const onWaiting = () => patch({ loading: true })
    // Emptying the element when a channel is swapped can raise an error with no cause; only a real one counts.
    const onNativeError = () => {
      if (video.error) fail('Bu yayın oynatılamadı. Adres geçersiz olabilir veya kodek tarayıcıda desteklenmiyor.')
    }
    const refreshTracks = () => setTracks(readTracks(video, hlsRef.current, extrasRef.current.map((x) => x.el)))
    const onEmptied = () => {
      setTracks(EMPTY_TRACKS)
      setTime(0)
      setDuration(0)
      setPaused(video.paused)
    }
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    const onTime = () => setTime(video.currentTime)
    const onDuration = () => setDuration(video.duration)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('error', onNativeError)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('durationchange', onDuration)
    video.addEventListener('emptied', onEmptied)
    video.addEventListener('loadedmetadata', refreshTracks)
    const audioList = nativeAudio(video)
    for (const type of ['addtrack', 'removetrack', 'change']) {
      audioList?.addEventListener(type, refreshTracks)
      video.textTracks.addEventListener(type, refreshTracks)
    }

    const start = async () => {
      const source = channel.url
      const engine = engineFor(channel.url)
      try {
        if (engine === 'hls') {
          const { default: Hls } = await import('hls.js')
          if (disposed) return
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true })
            let retried = false
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (!data.fatal) return
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !retried) {
                retried = true
                hls.startLoad()
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError()
              } else {
                fail('Yayına bağlanılamadı. Sunucu kapalı olabilir veya tarayıcıya erişimi engelliyor (CORS).')
              }
            })
            hlsRef.current = hls
            for (const event of [Hls.Events.MANIFEST_PARSED, Hls.Events.AUDIO_TRACKS_UPDATED, Hls.Events.AUDIO_TRACK_SWITCHED, Hls.Events.SUBTITLE_TRACKS_UPDATED, Hls.Events.SUBTITLE_TRACK_SWITCH] as const) {
              hls.on(event, refreshTracks)
            }
            hls.loadSource(source)
            hls.attachMedia(video)
            teardown = () => {
              hlsRef.current = null
              hls.destroy()
            }
          } else {
            video.src = channel.url
          }
        } else if (engine === 'ts') {
          const { default: mpegts } = await import('mpegts.js')
          if (disposed) return
          if (mpegts.isSupported()) {
            const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: channel.url })
            player.on(mpegts.Events.ERROR, () => fail('Yayına bağlanılamadı. Sunucu kapalı olabilir veya tarayıcıya erişimi engelliyor (CORS).'))
            player.attachMediaElement(video)
            player.load()
            teardown = () => player.destroy()
          } else {
            video.src = source
          }
        } else {
          video.src = channel.url
        }
        if (autoplay) await video.play().catch(() => undefined) // Autoplay can be refused; the user can press play.
      } catch {
        fail('Oynatıcı başlatılamadı.')
      }
    }
    void start()

    return () => {
      disposed = true
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('error', onNativeError)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('durationchange', onDuration)
      video.removeEventListener('emptied', onEmptied)
      video.removeEventListener('loadedmetadata', refreshTracks)
      for (const type of ['addtrack', 'removetrack', 'change']) {
        audioList?.removeEventListener(type, refreshTracks)
        video.textTracks.removeEventListener(type, refreshTracks)
      }
      teardown?.()
      video.removeAttribute('src')
      video.load()
    }
    // volume and muted are applied once here; later changes go straight to the element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.url, blocked, autoplay])

  // Subtitle files added by hand or listed by the portal live as <track> elements. They go away with the channel.
  useEffect(
    () => () => {
      for (const { el, url } of extrasRef.current) {
        el.remove()
        URL.revokeObjectURL(url)
      }
      extrasRef.current = []
      loadedSubs.current = new Set()
    },
    [channel.url],
  )

  const attachTrack = (video: HTMLVideoElement, url: string, label: string, lang?: string): HTMLTrackElement => {
    const el = document.createElement('track')
    el.kind = 'subtitles'
    el.label = label
    if (lang) el.srclang = lang
    el.src = url
    video.appendChild(el)
    el.track.mode = 'disabled'
    extrasRef.current.push({ el, url })
    return el
  }

  const subtitleSources = channel.subtitleTracks ?? NO_SOURCES
  const loadedSubs = useRef(new Set<string>())

  // The portal lists subtitle files: download them, turn SRT into WebVTT, and offer them (all off to start with).
  useEffect(() => {
    const video = videoRef.current
    const sources = subtitleSources.filter((s) => !loadedSubs.current.has(s.url))
    if (!video || blocked || sources.length === 0) return
    let disposed = false
    void (async () => {
      for (const [i, source] of sources.slice(0, 12).entries()) {
        const url = await loadSubtitle(source.url).catch(() => null)
        if (!url) continue
        if (disposed) {
          URL.revokeObjectURL(url)
          continue
        }
        loadedSubs.current.add(source.url)
        attachTrack(video, url, source.label ?? labelFor(undefined, source.lang, `Altyazı ${i + 1}`), source.lang)
      }
      if (!disposed) setTracks(readTracks(video, hlsRef.current, extrasRef.current.map((x) => x.el)))
    })()
    return () => {
      disposed = true
    }
    // attachTrack only touches refs and the video element.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.url, subtitleSources, blocked])

  const selectAudio = (index: number) => {
    const video = videoRef.current
    if (!video) return
    const hls = hlsRef.current
    if (hls) hls.audioTrack = index
    else {
      const list = nativeAudio(video)
      for (let i = 0; list && i < list.length; i++) {
        const t = list[i]
        if (t) t.enabled = i === index
      }
    }
    setTracks(readTracks(video, hls, extrasRef.current.map((x) => x.el)))
  }

  // -1 is "off". With HLS the playlist's own subtitles come first, then the added files.
  const selectSubtitle = (index: number) => {
    const video = videoRef.current
    if (!video) return
    const hls = hlsRef.current
    const extras = extrasRef.current.map((x) => x.el)
    if (hls) {
      const own = hls.subtitleTracks.length
      const fromPlaylist = index >= 0 && index < own
      hls.subtitleDisplay = fromPlaylist
      hls.subtitleTrack = fromPlaylist ? index : -1
      extras.forEach((el, i) => {
        el.track.mode = index >= own && i === index - own ? 'showing' : 'disabled'
      })
    } else {
      textTracksOf(video).forEach((t, i) => {
        t.mode = i === index ? 'showing' : 'disabled'
      })
    }
    setTracks(readTracks(video, hls, extras))
  }

  // A subtitle file from the user's computer: added and switched on right away.
  const addSubtitleFile = (file: File) => {
    const video = videoRef.current
    if (!video) return
    void subtitleFromFile(file)
      .then((url) => {
        const el = attachTrack(video, url, file.name.replace(/\.[^.]+$/, ''))
        const hls = hlsRef.current
        selectSubtitle(hls ? hls.subtitleTracks.length + extrasRef.current.length - 1 : textTracksOf(video).indexOf(el.track))
      })
      .catch(() => undefined)
  }

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }, [])

  const setVolume = (next: number, nextMuted = next === 0) => {
    const video = videoRef.current
    if (video) {
      video.volume = next
      video.muted = nextMuted
    }
    setSound({ volume: next, muted: nextMuted })
    saveVolume(next, nextMuted)
  }
  const toggleMute = useCallback(() => setVolume(volume === 0 ? 1 : volume, !muted), [volume, muted]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void el.requestFullscreen().catch(() => undefined)
  }, [])
  // Full screen on request. The click on "Oynat" is the user action the browser needs; it stays valid for a few seconds,
  // which is longer than it takes this player to appear.
  useEffect(() => {
    if (!wantFullscreen) return
    if (!compact && !document.fullscreenElement) void wrapRef.current?.requestFullscreen().catch(() => undefined)
    onFullscreenHandled?.()
  }, [wantFullscreen, compact, onFullscreenHandled])

  useEffect(() => {
    const onChange = () => {
      setFullscreen(document.fullscreenElement === wrapRef.current)
      wake() // entering or leaving full screen always brings the controls back
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [wake])

  // Shrinking to the corner removes the controls, so full screen must not be left running with nothing to click.
  useEffect(() => {
    if (compact && document.fullscreenElement === wrapRef.current) void document.exitFullscreen().catch(() => undefined)
  }, [compact])

  // Going from the corner back to a window starts with the controls showing, not with whatever state they were left in.
  useEffect(() => {
    const id = window.setTimeout(wake, 0)
    return () => window.clearTimeout(id)
  }, [compact, wake])

  // Mouse or touch anywhere in full screen counts as activity, even over the overlay or the close button.
  useEffect(() => {
    if (!fullscreen) return
    const events = ['pointermove', 'mousemove', 'pointerdown', 'touchstart'] as const
    for (const name of events) document.addEventListener(name, wake, { passive: true })
    return () => {
      for (const name of events) document.removeEventListener(name, wake)
    }
  }, [fullscreen, wake])

  const seek = useCallback(
    (seconds: number) => {
      const video = videoRef.current
      if (video && isVod) video.currentTime = Math.max(0, Math.min(total, seconds))
    },
    [isVod, total],
  )

  // Keyboard: left/right change the channel (or skip 10 seconds in a film), space pauses, M mutes, F is full screen.
  useEffect(() => {
    if (compact) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const video = videoRef.current
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const back = e.key === 'ArrowLeft'
        if (back && onPrev) onPrev()
        else if (!back && onNext) onNext()
        else if (video && isVod) seek(video.currentTime + (back ? -10 : 10))
        else return
      } else if (e.key === ' ' && t?.tagName !== 'BUTTON') togglePlay()
      else if (e.key === 'm' || e.key === 'M') toggleMute()
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen()
      else return
      e.preventDefault()
      wake()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [compact, onPrev, onNext, togglePlay, toggleMute, toggleFullscreen, wake, seek, isVod])

  const message = blocked
    ? 'Bu yayın http:// ile başlıyor. https sayfalarda tarayıcı bunu engeller. C# uygulamasında veya http:// ile açılan sayfada oynar.'
    : error
  const show = !compact && (awake || paused || message !== null || menuOpen)
  const hideCursor = !compact && !show && !paused

  return (
    <div
      ref={wrapRef}
      onContextMenu={(e) => {
        // Right-click on the full screen picture is "back".
        if (!onBack || compact || document.fullscreenElement !== wrapRef.current) return
        e.preventDefault()
        onBack()
      }}
      onPointerMove={compact ? undefined : wake}
      onPointerDown={compact ? undefined : wake}
      onFocusCapture={compact ? undefined : wake}
      className={`player-surface relative aspect-video w-full overflow-hidden bg-black ${hideCursor ? 'cursor-none' : ''} ${className}`}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onDoubleClick={compact ? undefined : toggleFullscreen}
        className="h-full w-full"
      />

      {loading && !message && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <Loader2 className="animate-spin text-white/70" size={36} aria-label="Yükleniyor" />
        </div>
      )}

      {!compact && (
        <PlayerChrome
          show={show}
          channel={channel}
          topRight={topRight}
          paused={paused}
          isVod={isVod}
          time={time}
          total={total}
          volume={volume}
          muted={muted}
          fullscreen={fullscreen}
          navLabel={navLabel}
          onPrev={onPrev}
          onNext={onNext}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onVolume={(v) => setVolume(v)}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          languageMenu={trackMenus ? <LanguageMenu tracks={tracks} onAudio={selectAudio} onSubtitle={selectSubtitle} onSubtitleFile={addSubtitleFile} onOpenChange={setMenuOpen} /> : undefined}
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

interface PlayerProps {
  channel: Channel | null
  autoplay?: boolean
  className?: string
  layoutKey?: string
  compact?: boolean
  onPrev?: () => void
  onNext?: () => void
  navLabel?: string
  topRight?: ReactNode
  wantFullscreen?: boolean
  onFullscreenHandled?: () => void
  onBack?: () => void
  trackMenus?: boolean
}

export function Player({ channel, autoplay = true, className = 'rounded-2xl border border-white/10', layoutKey, compact = false, onPrev, onNext, navLabel, topRight, wantFullscreen, onFullscreenHandled, onBack, trackMenus }: PlayerProps) {
  if (!channel) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl border border-dashed border-white/15 bg-black/40 p-6 text-center">
        <div>
          <Tv className="mx-auto text-[var(--subtle)]" size={34} aria-hidden="true" />
          <p className="mt-3 text-sm text-[var(--subtle)]">İzlemek için listeden bir kanal seç.</p>
        </div>
      </div>
    )
  }
  // Inside the C# app the picture comes from LibVLC and this page only draws the controls.
  if (IS_HOST) {
    return <HostPlayer channel={channel} autoplay={autoplay} className={className} layoutKey={layoutKey} compact={compact} onPrev={onPrev} onNext={onNext} navLabel={navLabel} topRight={topRight} wantFullscreen={wantFullscreen} onFullscreenHandled={onFullscreenHandled} onBack={onBack} trackMenus={trackMenus} />
  }
  // No key on purpose: the same <video> and wrapper stay mounted for every channel, so full screen survives a channel change.
  return <PlayerCore channel={channel} autoplay={autoplay} className={className} compact={compact} onPrev={onPrev} onNext={onNext} navLabel={navLabel} topRight={topRight} wantFullscreen={wantFullscreen} onFullscreenHandled={onFullscreenHandled} onBack={onBack} trackMenus={trackMenus} />
}
