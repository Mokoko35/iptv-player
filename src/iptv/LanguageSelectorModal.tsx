import { Check, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { flagOf } from './countries'
import { LANGUAGES, t, type Lang } from './i18n'
import { useMedia } from './useMedia'

/** Interface language picker. Picking a language switches the whole interface straight away. */
export function LanguageSelectorModal({ onClose }: { onClose: () => void }) {
  const { lang, setLanguage } = useMedia()
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const filtered = LANGUAGES.filter((l) => l.name.toLowerCase().includes(q) || l.code.includes(q))

  const choose = (code: Lang) => {
    setLanguage(code)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Dil seçimi')}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-elev shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">{t('Dil seçimi')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Kapat')} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Dil ara')}
              aria-label={t('Dil ara')}
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 ps-11 pe-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-accent"
            />
          </div>

          <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((l) => {
              const on = lang === l.code
              return (
                <button
                  key={l.code}
                  type="button"
                  lang={l.code}
                  aria-pressed={on}
                  onClick={() => choose(l.code)}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition ${
                    on ? 'border-accent bg-accent text-[var(--accent-ink)]' : 'border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {on && (
                    <span className="absolute end-2 top-2 rounded-full bg-black/20 p-0.5">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                  <span className="flag text-3xl" aria-hidden="true">
                    {flagOf(l.region)}
                  </span>
                  <span className="text-xs font-medium">{l.name}</span>
                </button>
              )
            })}
            {filtered.length === 0 && <div className="col-span-full py-8 text-center text-sm text-white/50">{t('Eşleşen dil bulunamadı.')}</div>}
          </div>
        </div>

        <div className="flex justify-end border-t border-white/5 bg-black/20 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white transition hover:bg-white/20">
            {t('Kapat')}
          </button>
        </div>
      </div>
    </div>
  )
}
