import { useState, useEffect } from 'react'
import { Search, X, Check } from 'lucide-react'

const LANGUAGES = [
  { code: 'tr', name: 'Türkçe', flag: 'tr' },
  { code: 'en', name: 'English', flag: 'gb' },
  { code: 'de', name: 'Deutsch', flag: 'de' },
  { code: 'fr', name: 'Français', flag: 'fr' },
  { code: 'es', name: 'Español', flag: 'es' },
  { code: 'it', name: 'Italiano', flag: 'it' },
  { code: 'ru', name: 'Русский', flag: 'ru' },
  { code: 'ar', name: 'العربية', flag: 'sa' },
  { code: 'nl', name: 'Nederlands', flag: 'nl' },
  { code: 'pl', name: 'Polski', flag: 'pl' },
  { code: 'pt', name: 'Português', flag: 'pt' },
  { code: 'ro', name: 'Română', flag: 'ro' },
  { code: 'sv', name: 'Svenska', flag: 'se' },
  { code: 'uk', name: 'Українська', flag: 'ua' },
  { code: 'vi', name: 'Tiếng Việt', flag: 'vn' },
  { code: 'da', name: 'Dansk', flag: 'dk' },
  { code: 'cs', name: 'Čeština', flag: 'cz' },
  { code: 'hu', name: 'Magyar', flag: 'hu' },
  { code: 'fi', name: 'Suomi', flag: 'fi' },
  { code: 'bg', name: 'Български', flag: 'bg' },
  { code: 'sl', name: 'Slovenčina', flag: 'sk' },
  { code: 'zh', name: '简体中文', flag: 'cn' },
  { code: 'hi', name: 'हिन्दी', flag: 'in' },
]

export function LanguageSelectorModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => localStorage.getItem('app-lang') || 'tr')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const q = query.trim().toLowerCase()
  const filtered = LANGUAGES.filter(l => l.name.toLowerCase().includes(q) || l.code.includes(q))

  const handleSelect = (code: string) => {
    setSelected(code)
    localStorage.setItem('app-lang', code)
    // Burada dil değişim mantığı tetiklenebilir
    // window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} role="presentation">
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15171e] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Dil seçimi</h2>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative mb-6">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Dil ara"
              className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm text-white placeholder-white/40 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {filtered.map((lang) => {
              const isSelected = selected === lang.code
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 transition ${
                    isSelected 
                      ? 'border-accent bg-accent text-white shadow-[0_0_15px_rgba(var(--accent-rgb),0.3)]' 
                      : 'border-white/5 bg-white/[0.02] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 rounded-full bg-white/20 p-0.5">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  <img 
                    src={`https://flagcdn.com/w80/${lang.flag}.png`} 
                    alt={lang.name} 
                    className="h-8 w-12 rounded object-cover shadow-sm"
                  />
                  <span className="text-xs font-medium">{lang.name}</span>
                </button>
              )
            })}
            {filtered.length === 0 && (
              <div className="col-span-full py-8 text-center text-sm text-white/50">
                Eşleşen dil bulunamadı.
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 bg-black/20 px-6 py-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-white/10 px-6 py-2 text-sm font-medium text-white hover:bg-white/20 transition">
            Kapat
          </button>
        </div>
      </div>
    </div>
  )
}
