import { useEffect, useRef, useState } from 'react'
import { Check, Proportions } from 'lucide-react'
import { ASPECT_LABELS, type AspectMode } from './prefs'
import { t, tr } from './i18n'

interface Props {
  value: AspectMode
  onChange: (mode: AspectMode) => void
  /** Forced shapes (16:9, 4:3) need the host to compute the picture; the browser player only has the first three. */
  forced: boolean
  /** Lets the player keep its controls on screen while the menu is open. */
  onOpenChange: (open: boolean) => void
}

const HINTS: Record<AspectMode, string> = {
  fit: tr('Filmin kendi oranı. Kenarlarda siyah çubuk kalabilir.'),
  fill: tr('Ekranı doldurur, oranı korur. Kenarlar kırpılabilir.'),
  stretch: tr('Ekrana yayar. Görüntü uzar ya da basıklaşır.'),
  '16:9': tr('Görüntüyü 16:9 olarak gösterir.'),
  '4:3': tr('Görüntüyü 4:3 olarak gösterir.'),
}

/** The picture shape: the film's own, filled (cropped), stretched, or a forced 16:9 / 4:3. */
export function AspectMenu({ value, onChange, forced, onOpenChange }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const modes: AspectMode[] = forced ? ['fit', 'fill', 'stretch', '16:9', '4:3'] : ['fit', 'fill', 'stretch']

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

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          change(!open)
        }}
        aria-label={t('Görüntü oranı: {v0}', { v0: t(ASPECT_LABELS[value]) })}
        title={t('Görüntü oranı: {v0}', { v0: t(ASPECT_LABELS[value]) })}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition hover:bg-white/15 hover:text-white ${open || value !== 'fit' ? 'text-accent' : 'text-white/90'}`}
      >
        <Proportions size={21} aria-hidden="true" />
      </button>

      {open && (
        <div role="menu" aria-label={t('Görüntü oranı')} className="absolute bottom-full right-0 z-10 mb-2 w-72 max-w-[85vw] rounded-xl border border-white/15 bg-elev p-2 shadow-2xl">
          <p className="label px-3 pb-1 pt-2">{t('Görüntü oranı')}</p>
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              role="menuitemradio"
              aria-checked={mode === value}
              onClick={(e) => {
                e.stopPropagation()
                onChange(mode)
                change(false)
              }}
              className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-start transition hover:bg-white/10 ${mode === value ? 'text-accent' : 'text-[var(--ink-2)]'}`}
            >
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center" aria-hidden="true">
                {mode === value && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${mode === value ? 'font-semibold' : ''}`}>{t(ASPECT_LABELS[mode])}</span>
                <span className="block text-xs leading-snug text-[var(--subtle)]">{t(HINTS[mode])}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
