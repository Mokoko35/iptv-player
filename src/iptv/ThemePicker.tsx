import { Check } from 'lucide-react'
import { THEMES, type Theme } from './themes'
import { useMedia } from './useMedia'

/** A tiny picture of the app in a theme's colors. */
function Preview({ theme }: { theme: Theme }) {
  const { bg, nav, elev, accent } = theme.preview
  return (
    <div className="flex h-24 overflow-hidden rounded-xl border border-white/10" style={{ background: bg }} aria-hidden="true">
      <div className="flex w-8 flex-col items-center gap-1.5 py-2" style={{ background: nav }}>
        <span className="h-3.5 w-3.5 rounded" style={{ background: accent }} />
        <span className="h-1.5 w-4 rounded-full bg-white/20" />
        <span className="h-1.5 w-4 rounded-full bg-white/20" />
      </div>
      <div className="flex-1 space-y-1.5 p-2">
        <span className="block h-2 w-16 rounded-full" style={{ background: accent }} />
        <div className="grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-8 rounded" style={{ background: elev }} />
          ))}
        </div>
        <span className="block h-1 rounded-full" style={{ background: accent, opacity: 0.55, width: '60%' }} />
      </div>
      <div className="w-1.5 py-2 pr-0.5">
        <span className="block h-8 w-full rounded-full" style={{ background: accent, opacity: 0.6 }} />
      </div>
    </div>
  )
}

export function ThemePicker() {
  const { prefs, updatePrefs } = useMedia()
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="display text-lg font-semibold">Temalar</h2>
        <p className="mt-0.5 text-sm text-[var(--subtle)]">Vurgu rengini, zemin tonlarını ve kaydırma çubuğu rengini değiştirir. Seçimin kaydedilir.</p>
      </div>
      <div role="radiogroup" aria-label="Tema" className="grid gap-4 p-5 sm:grid-cols-2">
        {THEMES.map((t) => {
          const on = prefs.theme === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => updatePrefs({ theme: t.id })}
              className={`relative rounded-2xl border p-3 text-left transition hover:bg-white/5 ${on ? 'border-accent bg-accent/10' : 'border-white/10'}`}
            >
              <Preview theme={t} />
              <div className="mt-3 flex items-center justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink-2)]">{t.name}</p>
                  <p className="truncate text-xs text-[var(--subtle)]">{t.description}</p>
                </div>
                {on && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-[var(--accent-ink)]">
                    <Check size={14} strokeWidth={3} aria-hidden="true" />
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
