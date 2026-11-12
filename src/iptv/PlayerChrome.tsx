import type { ReactNode } from 'react'
import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { clock, minutesText } from './epgFormat'
import type { Channel } from './types'
import type { NowNext } from './xmltv'

export const clockTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  size = 'md',
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  /** `lg` is for the three buttons in the middle of the bar, `play` adds a ring behind the play button. */
  size?: 'md' | 'lg' | 'play'
  children: ReactNode
}) {
  const box = size === 'play' ? 'h-14 w-14 bg-white/20 ring-1 ring-white/25 hover:bg-white/30' : size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) onClick()
      }}
      aria-label={label}
      title={label}
      className={`grid shrink-0 place-items-center rounded-full transition ${box} ${
        disabled ? 'cursor-default text-white/30' : 'text-white/90 hover:bg-white/15 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

interface Props {
  /** Controls are visible (they hide after a few seconds of no activity). */
  show: boolean
  channel: Channel
  /** Buttons at the top right (close, etc.). */
  topRight?: ReactNode
  paused: boolean
  /** A film or episode with a known length. False for a live channel. */
  isVod: boolean
  time: number
  total: number
  volume: number
  muted: boolean
  fullscreen: boolean
  /** "12 / 340": where the channel is in its list. */
  navLabel?: string
  onPrev?: () => void
  onNext?: () => void
  /** Episode buttons keep their place on the first/last episode, just without an action. */
  prevDisabled?: boolean
  nextDisabled?: boolean
  prevLabel?: string
  nextLabel?: string
  /** A film or episode stopped part-way: ask whether to continue, right in the control bar. */
  resume?: { position: number; onContinue: () => void; onRestart: () => void } | null
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  onVolume: (value: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  /** The audio and subtitle menu, drawn just before the full screen button. */
  languageMenu?: ReactNode
  /** The picture shape menu, drawn before the language menu. */
  aspectMenu?: ReactNode
  /** What is on now and next on a live channel. The program band under the controls uses it, in full screen only. */
  guide?: NowNext | null
}

/** A band under the controls: the program on now with its progress, and the next three programs with their times. */
function GuideBand({ guide }: { guide: NowNext }) {
  const now = guide.now
  const upcoming = [guide.next, ...guide.later].filter((p) => p !== undefined).slice(0, 3)
  if (!now && upcoming.length === 0) return null
  const total = now ? Math.max(1, Math.round((now.stop - now.start) / 60000)) : 0
  const left = now ? Math.round((1 - guide.progress) * total) : 0
  const percent = now ? Math.round(Math.min(1, Math.max(0, guide.progress)) * 100) : 0
  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-black/75 px-3 py-2.5 shadow-lg" role="group" aria-label="Program rehberi">
      <div className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {now ? (
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <p className="min-w-0 truncate font-medium text-white">
                <span className="mr-2 text-xs font-bold tracking-wider text-accent">ŞİMDİ</span>
                {now.title}
              </p>
              <p className="shrink-0 tabular-nums text-white/85">
                {minutesText(left)} kaldı <span className="text-white/55">/ {minutesText(total)}</span>
              </p>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Programın ilerleyişi">
              <div className="h-full rounded-full bg-accent transition-[width] duration-1000" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 text-xs tabular-nums text-white/55">
              <span>
                {clock(now.start)} - {clock(now.stop)}
              </span>
            </div>
            {now.desc && <p className="mt-1 line-clamp-1 text-xs text-white/55">{now.desc}</p>}
          </div>
        ) : (
          <div />
        )}

        {upcoming.length > 0 && (
          <div className="min-w-0 lg:border-l lg:border-white/15 lg:pl-6">
            <p className="text-[11px] font-bold tracking-wider text-white/55">SIRADAKİ</p>
            <ol className="mt-1.5 space-y-1.5">
              {upcoming.map((p) => (
                <li key={p.start} className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 text-xs tabular-nums text-white/65">{clock(p.start)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white/90">{p.title}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-white/45">{minutesText(Math.max(1, Math.round((p.stop - p.start) / 60000)))}</span>
                  </div>
                  {p.desc && <p className="truncate text-[11px] text-white/45">{p.desc}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

/** The title bar and the control bar over the picture. Shared by the HTML5 player and the player that drives LibVLC. */
export function PlayerChrome(p: Props) {
  const gone = 'pointer-events-none opacity-0'
  return (
    <>
      {/* Top: the name, plus the window buttons. */}
      <div className={`absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 pb-10 transition-opacity duration-300 sm:p-4 sm:pb-12 ${p.show ? 'opacity-100' : gone}`}>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white drop-shadow sm:text-lg">{p.channel.name}</p>
          {p.channel.subtitle && <p className="truncate text-sm text-white/75">{p.channel.subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">{p.topRight}</div>
      </div>

      {/* Bottom: the controls. */}
      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2 pt-12 transition-opacity duration-300 sm:px-4 sm:pb-3 ${p.show ? 'opacity-100' : gone}`}>
        {p.isVod && (
          <input
            type="range"
            min={0}
            max={Math.floor(p.total)}
            value={Math.floor(p.time)}
            onChange={(e) => p.onSeek(Number(e.target.value))}
            aria-label="Konum"
            className="mb-1 h-1.5 w-full cursor-pointer accent-accent"
          />
        )}
        {p.resume && (
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/75 px-3 py-2.5 shadow-lg" role="group" aria-label="Kaldığınız yerden devam">
            <p className="min-w-0 text-sm text-white/90">
              <span className="mr-2 text-xs font-bold tracking-wider text-accent">DEVAM</span>
              Kaldığınız yerden devam edilsin mi?
              <span className="ml-2 tabular-nums text-white/60">{clockTime(p.resume.position)}</span>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  p.resume?.onContinue()
                }}
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-[var(--accent-ink)] transition hover:opacity-90"
              >
                Devam et
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  p.resume?.onRestart()
                }}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/85 transition hover:bg-white/10"
              >
                Baştan başlat
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-2">
          {/* Left: sound. */}
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            <ControlButton label={p.muted || p.volume === 0 ? 'Sesi aç (M)' : 'Sesi kapat (M)'} onClick={p.onToggleMute}>
              {p.muted || p.volume === 0 ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.muted ? 0 : p.volume}
              onChange={(e) => p.onVolume(Number(e.target.value))}
              aria-label="Ses düzeyi"
              className="hidden h-1.5 w-24 cursor-pointer accent-accent sm:block"
            />
          </div>
          {/* Middle: previous, play, next. Always in the centre of the bar, and easy to hit. */}
          <div className="flex shrink-0 items-center justify-center gap-1 sm:gap-3">
            {(p.onPrev !== undefined || p.prevLabel !== undefined) && (
              <ControlButton label={p.prevLabel ?? 'Önceki kanal (←)'} onClick={p.onPrev ?? (() => undefined)} disabled={p.prevDisabled} size="lg">
                <SkipBack size={24} fill="currentColor" aria-hidden="true" />
              </ControlButton>
            )}
            <ControlButton label={p.paused ? 'Oynat (boşluk)' : 'Duraklat (boşluk)'} onClick={p.onTogglePlay} size="play">
              {p.paused ? <Play size={26} fill="currentColor" aria-hidden="true" /> : <Pause size={26} fill="currentColor" aria-hidden="true" />}
            </ControlButton>
            {(p.onNext !== undefined || p.nextLabel !== undefined) && (
              <ControlButton label={p.nextLabel ?? 'Sonraki kanal (→)'} onClick={p.onNext ?? (() => undefined)} disabled={p.nextDisabled} size="lg">
                <SkipForward size={24} fill="currentColor" aria-hidden="true" />
              </ControlButton>
            )}
          </div>
          {/* Right: the clock, the menus and full screen. */}
          <div className="flex min-w-0 items-center justify-end gap-0.5 sm:gap-1">
            <div className="min-w-0 truncate px-1 text-right text-sm tabular-nums text-white/80">
              {p.isVod ? (
                <span className="inline-flex items-center gap-2">
                  {p.navLabel && <span className="text-white/55">{p.navLabel}</span>}
                  <span>
                    {clockTime(p.time)} / {clockTime(p.total)}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  {p.navLabel && <span className="hidden text-white/65 sm:inline">{p.navLabel}</span>}
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/90 px-2 py-0.5 text-xs font-bold tracking-wider text-white">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" /> CANLI
                  </span>
                </span>
              )}
            </div>
            {p.aspectMenu}
            {p.languageMenu}
            <ControlButton label={p.fullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran (F)'} onClick={p.onToggleFullscreen}>
              {p.fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
            </ControlButton>
          </div>
        </div>
        {p.fullscreen && p.guide && <GuideBand guide={p.guide} />}
      </div>
    </>
  )
}
