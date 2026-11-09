import type { ReactNode } from 'react'
import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import type { Channel } from './types'

export const clockTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white"
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
  onTogglePlay: () => void
  onSeek: (seconds: number) => void
  onVolume: (value: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  /** The audio and subtitle menu, drawn just before the full screen button. */
  languageMenu?: ReactNode
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
        <div className="flex items-center gap-0.5 sm:gap-1">
          {p.onPrev && (
            <ControlButton label="Önceki kanal (←)" onClick={p.onPrev}>
              <SkipBack size={20} fill="currentColor" aria-hidden="true" />
            </ControlButton>
          )}
          <ControlButton label={p.paused ? 'Oynat (boşluk)' : 'Duraklat (boşluk)'} onClick={p.onTogglePlay}>
            {p.paused ? <Play size={22} fill="currentColor" aria-hidden="true" /> : <Pause size={22} fill="currentColor" aria-hidden="true" />}
          </ControlButton>
          {p.onNext && (
            <ControlButton label="Sonraki kanal (→)" onClick={p.onNext}>
              <SkipForward size={20} fill="currentColor" aria-hidden="true" />
            </ControlButton>
          )}
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
          <div className="min-w-0 flex-1 px-2 text-right text-sm tabular-nums text-white/80">
            {p.isVod ? (
              `${clockTime(p.time)} / ${clockTime(p.total)}`
            ) : (
              <span className="inline-flex items-center gap-2">
                {p.navLabel && <span className="hidden text-white/65 sm:inline">{p.navLabel}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-danger/90 px-2 py-0.5 text-xs font-bold tracking-wider text-white">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white" /> CANLI
                </span>
              </span>
            )}
          </div>
          {p.languageMenu}
          <ControlButton label={p.fullscreen ? 'Tam ekrandan çık (F)' : 'Tam ekran (F)'} onClick={p.onToggleFullscreen}>
            {p.fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
          </ControlButton>
        </div>
      </div>
    </>
  )
}
