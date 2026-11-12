import { Search, X } from 'lucide-react'
import { Breadcrumb } from './Breadcrumb'
import { CategoryChips, CategorySidebar } from './CategoryRail'
import { Empty } from './EmptyState'
import { CountrySelect } from './CountrySelect'
import { InlinePlayerColumn } from './InlinePlayerColumn'
import { ChannelListItem } from './ListItems'
import { ProgressiveGrid } from './ProgressiveGrid'
import { SkeletonRows } from './Skeletons'
import { flagOf } from './countries'
import { FAVORITES } from './kinds'
import type { Channel } from './types'
import { useCategoryBrowse } from './useCategoryBrowse'
import { useMedia } from './useMedia'

/**
 * Live TV in four columns: the main menu, the categories, the channels of the picked category,
 * and a fixed player with the program guide. Picking a channel plays it right there, with no window.
 * On a narrow window the player column goes away and a channel opens in the player window instead.
 */
export function LivePage() {
  const { lists, parts, prefs, current, openItem, isFavorite, toggleFavorite, epg, openManage, activeCountries, setCountries } = useMedia()
  const { base, items, rail, selected, query, setQuery, deferred } = useCategoryBrowse('live')
  const hasAny = parts.live.length > 0
  const showRail = !lists.starting && lists.playlists.length > 0 && hasAny && base.length > 0

  return (
    <div className="lg:-mx-8 lg:-mb-16 lg:-mt-8 lg:flex lg:h-dvh">
      {/* Column 2: categories */}
      {showRail && <CategorySidebar {...rail} />}

      {/* Column 3: channels */}
      <section aria-label="Kanallar" className="min-w-0 lg:flex lg:h-dvh lg:w-[22rem] lg:flex-none lg:flex-col lg:border-r lg:border-white/10 xl:w-[25rem]">
        <header className="shrink-0 pb-3 lg:px-4 lg:pb-3 lg:pt-5">
          <Breadcrumb kind="live" selected={selected} small />
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-[var(--subtle)]">
            {items.length.toLocaleString('tr-TR')} kanal
            {activeCountries.length > 0 && (
              <button type="button" onClick={() => setCountries([])} aria-label="Ülke filtresini temizle" className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 text-xs text-accent">
                <span className="flag" aria-hidden="true">
                  {activeCountries.slice(0, 4).map(flagOf).join(' ')}
                </span>
                {activeCountries.length > 4 ? `${activeCountries.length} ülke` : activeCountries.join(' ')}
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </p>
          {hasAny && (
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Kanal ara" aria-label="Kanal ara" className="field !pl-9 !pr-9" />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--subtle)] hover:text-[var(--ink)]">
                  <X size={15} />
                </button>
              )}
            </div>
          )}
          {showRail && (
            <div className="mt-3 lg:hidden">
              <CountrySelect />
              <div className="mt-3">
                <CategoryChips {...rail} />
              </div>
            </div>
          )}
        </header>

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-6">
          {lists.starting ? (
            <SkeletonRows />
          ) : lists.playlists.length === 0 ? (
            <Empty icon="add">M3U adresi, portal girişi veya dosyayla ilk listeni ekle.</Empty>
          ) : !hasAny ? (
            <Empty icon="none">{activeCountries.length > 0 ? 'Seçili ülkelerde canlı kanal yok.' : 'Bu listede canlı kanal bulunamadı.'}</Empty>
          ) : base.length === 0 ? (
            <Empty icon="manage">
              Tüm canlı TV kategorileri gizli.
              <div className="mt-4">
                <button type="button" onClick={() => openManage('live')} className="btn-primary">
                  Kategorileri yönet
                </button>
              </div>
            </Empty>
          ) : items.length === 0 ? (
            <Empty icon="none">{selected === FAVORITES && deferred.trim() === '' ? 'Bu bölümde henüz favorin yok. Kanalın yanındaki kalbe dokunarak favori ekleyebilirsin.' : 'Eşleşen kanal yok.'}</Empty>
          ) : (
            <ProgressiveGrid
              key={`${selected}|${deferred}`}
              items={items}
              className="flex flex-col gap-0.5"
              getKey={(c) => c.id}
              render={(c) => (
                <ChannelListItem
                  channel={c}
                  active={current?.id === c.id}
                  favorite={isFavorite(c)}
                  showLogo={prefs.showLogos}
                  onPlay={(ch: Channel) => openItem(ch, items)}
                  onFavorite={toggleFavorite}
                  epg={epg.nowNext(c)}
                />
              )}
            />
          )}
        </div>
      </section>

      {/* Column 4: the player and the program guide */}
      <InlinePlayerColumn />
    </div>
  )
}
