import { useEffect, useRef, useState } from 'react'
import { Check, FileUp, Languages } from 'lucide-react'
import type { TrackInfo } from './tracks'

interface Props {
  tracks: TrackInfo
  onAudio: (index: number) => void
  onSubtitle: (index: number) => void
  /** A subtitle file the user picked (.srt or .vtt). */
  onSubtitleFile: (file: File) => void
  /** Lets the player keep its controls on screen while the menu is open. */
  onOpenChange: (open: boolean) => void
  /** A line under "Altyazı", for example while the subtitle files are still being prepared. */
  subtitleNote?: string
}

function Row({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition hover:bg-white/10 ${on ? 'font-semibold text-accent' : 'text-[var(--ink-2)]'}`}
    >
      <span className="grid h-4 w-4 shrink-0 place-items-center" aria-hidden="true">
        {on && <Check size={14} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  )
}

/**
 * One menu for the audio language and the subtitles. It is always there, so there is always a place to look:
 * when the file's own tracks cannot be read it says so, and a subtitle file can still be added by hand.
 */
export function LanguageMenu({ tracks, onAudio, onSubtitle, onSubtitleFile, onOpenChange, subtitleNote }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const picker = useRef<HTMLInputElement>(null)

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChange(next)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: Event) => {
      if (box.current && e.target instanceof Node && !box.current.contains(e.target)) {
        setOpen(false)
        onOpenChange(false)
      }
    }
    // Escape closes only the menu, not the player window behind it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setOpen(false)
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, onOpenChange])

  const audioNote = tracks.audio.length > 0 ? null : tracks.audioSupported ? 'Bu dosyada ayrı bir ses izi bulunamadı.' : 'Bu tarayıcı dosyadaki ses izlerini göstermiyor. C# uygulamasında (LibVLC) tüm ses izleri listelenir.'
  const active = tracks.subIndex >= 0

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          change(!open)
        }}
        aria-label="Ses ve altyazı"
        title="Ses ve altyazı"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-white/15 hover:text-white ${open || active ? 'text-accent' : 'text-white/90'}`}
      >
        <Languages size={21} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" aria-label="Ses ve altyazı" className="absolute bottom-full right-0 z-10 mb-2 max-h-[min(24rem,55vh)] w-72 max-w-[85vw] overflow-y-auto rounded-xl border border-white/15 bg-elev p-2 shadow-2xl">
          <p className="label px-3 pb-1 pt-2">Ses</p>
          {tracks.audio.map((t, i) => (
            <Row key={i} on={i === tracks.audioIndex} onClick={() => onAudio(i)}>
              {t.label}
            </Row>
          ))}
          {audioNote && <p className="px-3 pb-2 text-xs leading-relaxed text-[var(--subtle)]">{audioNote}</p>}

          <p className="label px-3 pb-1 pt-3">Altyazı</p>
          {subtitleNote && <p className="px-3 pb-1 text-xs leading-relaxed text-[var(--subtle)]">{subtitleNote}</p>}
          <Row on={tracks.subIndex < 0} onClick={() => onSubtitle(-1)}>
            Kapalı
          </Row>
          {tracks.subs.map((t, i) => (
            <Row key={i} on={i === tracks.subIndex} onClick={() => onSubtitle(i)}>
              {t.label}
            </Row>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              picker.current?.click()
            }}
            className="mt-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-[var(--ink-2)] transition hover:bg-white/10"
          >
            <FileUp size={15} className="shrink-0 text-accent" aria-hidden="true" />
            <span className="min-w-0 flex-1">Dosyadan altyazı ekle (.srt, .vtt)</span>
          </button>
          <input
            ref={picker}
            type="file"
            accept=".srt,.vtt,text/vtt,application/x-subrip"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) {
                onSubtitleFile(file)
                change(false)
              }
            }}
          />
        </div>
      )}
    </div>
  )
}
