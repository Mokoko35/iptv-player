import { Heart, SlidersHorizontal } from 'lucide-react'
import { CountrySelect } from './CountrySelect'
import { FAVORITES, type Category } from './kinds'
import { t, locale } from './i18n'

interface Props {
  categories: Category[]
  total: number
  favoriteCount: number
  selected: string
  onSelect: (key: string) => void
  onManage: () => void
  /** Categories with no recognized country. Listed under "Diğer" while a country is picked. */
  otherNames?: Set<string>
}

interface Entry {
  key: string
  label: string
  count: number
  favorite?: boolean
  /** A section title ("Diğer") instead of a category. */
  heading?: boolean
}

function entries({ categories, total, favoriteCount, otherNames }: Props): Entry[] {
  const toEntry = (c: Category): Entry => ({ key: c.name, label: c.name, count: c.count })
  const others = otherNames ? categories.filter((c) => otherNames.has(c.name)) : []
  const main = otherNames ? categories.filter((c) => !otherNames.has(c.name)) : categories
  return [
    { key: '', label: t('Tümü'), count: total },
    { key: FAVORITES, label: t('Favoriler'), count: favoriteCount, favorite: true },
    ...main.map(toEntry),
    ...(others.length > 0 ? [{ key: '__other__', label: t('Diğer'), count: 0, heading: true }, ...others.map(toEntry)] : []),
  ]
}

/**
 * Category list as its own full-height panel, right next to the main menu. It does not depend on the
 * menu's width: when the menu shrinks to icons, this panel simply moves left and stays fully usable.
 */
export function CategorySidebar(props: Props) {
  const { selected, onSelect, onManage } = props
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col self-start border-r border-white/10 bg-rail lg:flex" aria-label={t('Kategoriler')}>
      <div className="px-4 pt-5">
        <CountrySelect />
      </div>
      <div className="flex items-center justify-between px-5 pb-2 pt-4">
        <h2 className="label">{t('Kategoriler')}</h2>
        <button
          type="button"
          onClick={onManage}
          aria-label={t('Kategorileri yönet')}
          title={t('Kategorileri yönet')}
          className="grid h-9 w-9 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-accent"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-6" role="tablist" aria-orientation="vertical">
        {entries(props).map((e) => {
          const on = selected === e.key
          if (e.heading) {
            return (
              <li key={e.key} role="presentation" className="label px-3 pb-1 pt-4">
                {e.label}
              </li>
            )
          }
          return (
            <li key={e.key || 'all'}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onSelect(e.key)}
                className={`relative flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-start text-sm transition ${
                  on ? 'bg-accent/15 font-semibold text-accent' : 'text-[var(--subtle)] hover:bg-white/5 hover:text-[var(--ink)]'
                }`}
              >
                {on && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent" />}
                {e.favorite && <Heart size={14} fill={on ? 'currentColor' : 'none'} aria-hidden="true" className="shrink-0" />}
                <span className="min-w-0 flex-1 truncate">{e.label}</span>
                <span className="shrink-0 text-xs tabular-nums opacity-60">{e.count.toLocaleString(locale())}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

/** The same list as a row of chips, for small screens. */
export function CategoryChips(props: Props) {
  const { selected, onSelect, onManage } = props
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:hidden" role="tablist" aria-label={t('Kategoriler')}>
      {entries(props)
        .filter((e) => !e.heading)
        .map((e) => (
        <button
          key={e.key || 'all'}
          type="button"
          role="tab"
          aria-selected={selected === e.key}
          onClick={() => onSelect(e.key)}
          className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm transition ${
            selected === e.key ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-[var(--subtle)] hover:text-[var(--ink)]'
          }`}
        >
          {e.favorite && <Heart size={13} fill={selected === e.key ? 'currentColor' : 'none'} aria-hidden="true" />}
          {e.label}
        </button>
      ))}
      <button type="button" onClick={onManage} aria-label={t('Kategorileri yönet')} className="grid min-h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-[var(--subtle)]">
        <SlidersHorizontal size={16} />
      </button>
    </div>
  )
}
