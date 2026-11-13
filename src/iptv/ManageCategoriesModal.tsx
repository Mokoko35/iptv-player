import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownAZ, Check, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Clapperboard, Film, Search, Tv, X } from 'lucide-react'
import { KIND_LABEL, type Kind, categoriesOf, sortByOrder } from './kinds'
import { useMedia } from './useMedia'
import { t, tr, locale } from './i18n'

const TABS: { id: Kind; label: string; icon: React.ReactNode }[] = [
  { id: 'live', label: tr('Canlı TV'), icon: <Tv size={16} /> },
  { id: 'movie', label: tr('Filmler'), icon: <Film size={16} /> },
  { id: 'series', label: tr('Diziler'), icon: <Clapperboard size={16} /> },
]

/** Checked = shown. The arrows set the order the categories have in the category list. */
function ModalBody({ kind, onKindChange }: { kind: Kind; onKindChange: (k: Kind) => void }) {
  const { allParts, hiddenFor, setHiddenFor, orderFor, setOrderFor, closeManage } = useMedia()
  const [domOrder] = useState<string[]>(() => sortByOrder(categoriesOf(allParts[kind]), orderFor(kind)).map((c) => c.name))
  const [names, setNames] = useState<string[]>(domOrder)
  const rank = useMemo(() => new Map(names.map((n, i) => [n, i])), [names])
  const scroller = useRef<HTMLUListElement>(null)
  const pinned = useRef<number | null>(null)
  const counts = useMemo(() => new Map(categoriesOf(allParts[kind]).map((c) => [c.name, c.count])), [allParts, kind])
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(hiddenFor(kind)))
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeManage()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeManage])

  const q = query.trim().toLocaleLowerCase('tr')
  const matches = (name: string) => !q || name.toLocaleLowerCase('tr').includes(q)
  const shown = names.filter(matches)
  const firstShown = shown[0]
  const lastShown = shown[shown.length - 1]
  const visibleCount = names.filter((n) => !hidden.has(n)).length

  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  const setMany = (list: string[], hide: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev)
      for (const n of list) {
        if (hide) next.add(n)
        else next.delete(n)
      }
      return next
    })

  const pinScroll = () => {
    pinned.current = scroller.current?.scrollTop ?? null
  }
  useLayoutEffect(() => {
    const top = pinned.current
    const el = scroller.current
    if (top === null || !el) return
    pinned.current = null
    el.scrollTop = top
    const frame = requestAnimationFrame(() => {
      el.scrollTop = top
    })
    return () => cancelAnimationFrame(frame)
  }, [names])

  const moveUp = (name: string) => {
    const from = names.indexOf(name)
    let to = -1
    for (let i = from - 1; i >= 0; i--) {
      if (matches(names[i] ?? '')) {
        to = i
        break
      }
    }
    if (from < 0 || to < 0) return
    pinScroll()
    const next = names.filter((n) => n !== name)
    next.splice(to, 0, name)
    setNames(next)
    setNote(t('{name} yukarı taşındı: {v1}. sıra', { name, v1: to + 1 }))
  }

  const moveDown = (name: string) => {
    const from = names.indexOf(name)
    let to = -1
    for (let i = from + 1; i < names.length; i++) {
      if (matches(names[i] ?? '')) {
        to = i
        break
      }
    }
    if (from < 0 || to < 0) return
    pinScroll()
    const next = names.filter((n) => n !== name)
    next.splice(to, 0, name)
    setNames(next)
    setNote(t('{name} aşağı taşındı: {v1}. sıra', { name, v1: to + 1 }))
  }

  const moveBottom = (name: string) => {
    if (names[names.length - 1] === name) return
    pinScroll()
    setNames([...names.filter((n) => n !== name), name])
    setNote(t('{name} en alta taşındı', { name }))
  }

  const moveTop = (name: string) => {
    if (names[0] === name) return
    pinScroll()
    setNames([name, ...names.filter((n) => n !== name)])
    setNote(t('{name} en üste taşındı', { name }))
  }

  const resetOrder = () => {
    setNames([...names].sort((a, b) => a.localeCompare(b, 'tr')))
    setNote(t('Sıra A-Z olarak sıfırlandı'))
  }

  const save = () => {
    setHiddenFor(
      kind,
      names.filter((n) => hidden.has(n)),
    )
    setOrderFor(kind, names)
    closeManage()
  }

  const iconButton = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--subtle)] transition hover:bg-white/10 hover:text-accent disabled:pointer-events-none disabled:opacity-30'

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={closeManage} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-title"
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl border border-white/15 bg-elev shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 id="manage-title" className="display text-xl font-semibold">{t('Kategorileri Yönet')}</h2>
            <p className="mt-0.5 text-xs text-[var(--subtle)]">{t('işaretliler gösterilir, oklar sırayı belirler')}</p>
          </div>
          <button type="button" onClick={closeManage} aria-label={t('Kapat')} className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-1 px-5 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onKindChange(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                kind === tab.id
                  ? 'bg-accent text-[var(--accent-ink)]'
                  : 'bg-white/5 text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]'
              }`}
            >
              {tab.icon}
              {t(tab.label)}
            </button>
          ))}
        </div>

        <div className="space-y-3 px-5 pb-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Kategori ara')} aria-label={t('Kategori ara')} className="field !pl-9" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMany(shown, false)} className="btn-ghost !min-h-9 flex-1 text-xs">{t('Tümünü seç')}</button>
            <button type="button" onClick={() => setMany(shown, true)} className="btn-ghost !min-h-9 flex-1 text-xs">{t('Hiçbirini seçme')}</button>
            <button type="button" onClick={resetOrder} title={t('Sırayı A-Z yap')} aria-label={t('Sırayı A-Z yap')} className="btn-ghost !min-h-9 !px-3 text-xs">
              <ArrowDownAZ size={15} aria-hidden="true" />
            </button>
          </div>
        </div>

        <ul ref={scroller} className="flex min-h-0 flex-1 flex-col overflow-y-auto border-y border-white/10 px-2 py-1 [overflow-anchor:none]" aria-label={t('Kategoriler')}>
          {names.length === 0 ? (
            <li className="p-6 text-center text-sm text-[var(--subtle)]">{t('Bu türde kategori yok.')}</li>
          ) : shown.length === 0 ? (
            <li className="p-6 text-center text-sm text-[var(--subtle)]">{t('Eşleşen kategori yok.')}</li>
          ) : (
            domOrder.map((name) => {
              const on = !hidden.has(name)
              return (
                <li key={name} style={{ order: rank.get(name) ?? 0 }} className={matches(name) ? 'flex items-center gap-1' : 'hidden'}>
                  <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-white/5">
                    <input type="checkbox" checked={on} onChange={() => toggle(name)} className="peer sr-only" />
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${
                        on ? 'border-accent bg-accent text-[var(--accent-ink)]' : 'border-white/30'
                      }`}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={`min-w-0 flex-1 truncate text-sm ${on ? 'text-[var(--ink-2)]' : 'text-[var(--subtle)]'}`}>{name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--subtle)]">{(counts.get(name) ?? 0).toLocaleString(locale())}</span>
                  </label>
                  <button type="button" onClick={() => moveTop(name)} disabled={names[0] === name} aria-label={t('{name} en üste taşı', { name })} title={t('En üste')} className={iconButton}>
                    <ChevronsUp size={18} />
                  </button>
                  <button type="button" onClick={() => moveUp(name)} disabled={firstShown === name} aria-label={t('{name} bir yukarı taşı', { name })} title={t('1 yukarı')} className={iconButton}>
                    <ChevronUp size={18} />
                  </button>
                  <button type="button" onClick={() => moveDown(name)} disabled={lastShown === name} aria-label={t('{name} bir aşağı taşı', { name })} title={t('1 aşağı')} className={iconButton}>
                    <ChevronDown size={18} />
                  </button>
                  <button type="button" onClick={() => moveBottom(name)} disabled={names[names.length - 1] === name} aria-label={t('{name} en alta taşı', { name })} title={t('En alta')} className={iconButton}>
                    <ChevronsDown size={18} />
                  </button>
                </li>
              )
            })
          )}
        </ul>
        <p className="sr-only" role="status" aria-live="polite">
          {note}
        </p>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-xs tabular-nums text-[var(--subtle)]">
            {visibleCount} / {names.length}{' '}{t('gösteriliyor')}</p>
          <div className="flex gap-2">
            <button type="button" onClick={closeManage} className="btn-ghost">{t('İptal')}</button>
            <button type="button" onClick={save} className="btn-primary">{t('Kaydet')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ManageCategoriesModal() {
  const { managing } = useMedia()
  const [activeKind, setActiveKind] = useState<Kind>(managing ?? 'live')

  useEffect(() => {
    if (managing) setActiveKind(managing)
  }, [managing])

  if (!managing) return null

  return <ModalBody key={activeKind} kind={activeKind} onKindChange={setActiveKind} />
}
