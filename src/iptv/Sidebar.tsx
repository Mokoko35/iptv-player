import { Clapperboard, Download, Heart, Home, Library, ListPlus, Menu, Settings, Tv } from 'lucide-react'
import { useDownloads } from './downloads'
import { hrefFor, type Page } from './router'
import { useMedia } from './useMedia'
import { t, tr, locale } from './i18n'

const ITEMS: { page: Page; label: string; icon: typeof Home }[] = [
  { page: 'home', label: tr('Ana Sayfa'), icon: Home },
  { page: 'live', label: tr('Canlı TV'), icon: Tv },
  { page: 'movies', label: tr('Filmler'), icon: Clapperboard },
  { page: 'series', label: tr('Diziler'), icon: Library },
  { page: 'favorites', label: tr('Favoriler'), icon: Heart },
  { page: 'downloads', label: tr('İndirilenler'), icon: Download },
  { page: 'settings', label: tr('Ayarlar'), icon: Settings },
]

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-[var(--accent-ink)]">
        <Tv size={19} aria-hidden="true" />
      </div>
      <span className="display text-xl font-semibold tracking-tight">{t('IPTV')}</span>
    </div>
  )
}

export function Sidebar() {
  const { route, parts, lists, openAdd, prefs, updatePrefs } = useMedia()
  const collapsed = prefs.sidebarCollapsed
  const downloaded = useDownloads().items.filter((i) => i.status === 'done').length
  const counts: Partial<Record<Page, number>> = { live: parts.live.length, movies: parts.movie.length, series: parts.series.length, downloads: downloaded }
  const toggle = () => updatePrefs({ sidebarCollapsed: !collapsed })

  return (
    <>
      <aside
        className={`fixed inset-y-0 start-0 z-30 hidden flex-col border-e border-white/10 bg-nav py-5 lg:flex ${collapsed ? 'w-[72px] px-2' : 'w-60 px-3'}`}
        aria-label={t('Ana menü')}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2 px-1'}`}>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? t('Menüyü genişlet') : t('Menüyü daralt')}
            aria-expanded={!collapsed}
            title={collapsed ? t('Menüyü genişlet') : t('Menüyü daralt')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--ink)]"
          >
            <Menu size={22} aria-hidden="true" />
          </button>
          {!collapsed && <Brand />}
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {ITEMS.map(({ page, label, icon: Icon }) => {
            const on = route.page === page
            const count = counts[page]
            return (
              <a
                key={page}
                href={hrefFor(page)}
                aria-current={on ? 'page' : undefined}
                aria-label={collapsed ? t(label) : undefined}
                title={collapsed ? t(label) : undefined}
                className={`relative flex min-h-11 items-center rounded-xl text-sm font-medium transition ${collapsed ? 'justify-center' : 'gap-3 px-3'} ${
                  on ? 'bg-accent/15 text-accent' : 'text-[var(--subtle)] hover:bg-white/5 hover:text-[var(--ink)]'
                }`}
              >
                {on && <span aria-hidden="true" className="absolute inset-y-2 start-0 w-1 rounded-e-full bg-accent" />}
                <Icon size={20} aria-hidden="true" />
                {!collapsed && <span className="flex-1">{t(label)}</span>}
                {!collapsed && count !== undefined && count > 0 && <span className="text-xs tabular-nums opacity-60">{count.toLocaleString(locale())}</span>}
              </a>
            )
          })}
        </nav>

        <div className="mt-auto space-y-3 px-1">
          {lists.active && !collapsed && (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="label">{t('Aktif liste')}</p>
              <p className="mt-1 truncate text-sm font-medium text-[var(--ink-2)]">{lists.active.name}</p>
              <p className="text-xs tabular-nums text-[var(--subtle)]">{lists.active.channelCount.toLocaleString(locale())}{' '}{t('öğe')}</p>
            </div>
          )}
          {collapsed ? (
            <button type="button" onClick={openAdd} aria-label={t('Liste ekle')} title={t('Liste ekle')} className="btn-primary w-full !px-0">
              <ListPlus size={18} aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={openAdd} className="btn-primary w-full">
              <ListPlus size={16} aria-hidden="true" />{' '}{t('Liste ekle')}</button>
          )}
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-white/10 bg-nav/95 lg:hidden" aria-label={t('Ana menü')}>
        {ITEMS.map(({ page, label, icon: Icon }) => {
          const on = route.page === page
          return (
            <a
              key={page}
              href={hrefFor(page)}
              aria-current={on ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${on ? 'text-accent' : 'text-[var(--subtle)]'}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="max-w-full truncate px-0.5">{t(label)}</span>
            </a>
          )
        })}
      </nav>
    </>
  )
}
