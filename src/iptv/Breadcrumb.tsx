import { ChevronRight } from 'lucide-react'
import { FAVORITES, KIND_LABEL, type Kind, categoryCrumbs } from './kinds'
import { t } from './i18n'

/** "Canlı TV > TR > Disney+": where you are. Lives in the page, so it stays visible whether or not the menu is collapsed. */
export function Breadcrumb({ kind, selected, small = false }: { kind: Kind; selected: string; small?: boolean }) {
  const trail = [KIND_LABEL[kind], ...(selected === '' ? [t('Tümü')] : selected === FAVORITES ? ['Favoriler'] : categoryCrumbs(selected))]
  return (
    <nav aria-label={t('Bulunduğun yer')} className="min-w-0">
      <ol className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 font-semibold ${small ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1
          return (
            <li key={`${i}-${crumb}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && <ChevronRight size={small ? 15 : 18} className="shrink-0 text-[var(--subtle)]" aria-hidden="true" />}
              <span className={`display truncate ${last ? 'text-accent' : 'text-[var(--ink-2)]'}`} aria-current={last ? 'page' : undefined}>
                {crumb}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
