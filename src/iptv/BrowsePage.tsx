import { Breadcrumb } from './Breadcrumb'
import { Empty } from './EmptyState'
import { useCategoryBrowse } from './useCategoryBrowse'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { CategoryChips, CategorySidebar } from './CategoryRail'
import { CountrySelect } from './CountrySelect'
import { flagOf } from './countries'
import type { Channel } from './types'
import { ChannelCard, PosterCard } from './Cards'
import { FAVORITES, KIND_LABEL, type Kind } from './kinds'
import type { CardSize } from './prefs'
import { ProgressiveGrid } from './ProgressiveGrid'
import { SkeletonGrid } from './Skeletons'
import { useMedia } from './useMedia'
import { Segmented } from './SettingsControls'

// Columns fill whatever width is left next to the category list, so the grid always uses the full space.
const LIVE_GRID: Record<CardSize, string> = {
  sm: 'grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3',
  md: 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4',
  lg: 'grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4',
}
const POSTER_GRID: Record<CardSize, string> = {
  sm: 'grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3',
  md: 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4',
  lg: 'grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5',
}

const EMPTY_HINT: Record<Kind, string> = {
  live: 'Bu listede canlı kanal bulunamadı.',
  movie: 'Bu listede film bulunamadı. Filmler çoğunlukla Xtream portal listelerinde bulunur.',
  series: 'Bu listede dizi bulunamadı. Diziler çoğunlukla Xtream portal listelerinde bulunur.',
}

export function BrowsePage({ kind }: { kind: Kind }) {
  const {updatePrefs, lists, parts, prefs, current, openItem, isFavorite, toggleFavorite, openManage, catalog, xtream, epg, activeCountries, setCountries } = useMedia()
  const { base, items, rail, selected, query, setQuery, deferred } = useCategoryBrowse(kind)

  const poster = kind !== 'live'
  const gridClass = poster ? POSTER_GRID[prefs.cardSize] : LIVE_GRID[prefs.cardSize]
  const hasAny = parts[kind].length > 0
  const showRail = !lists.starting && lists.playlists.length > 0 && hasAny && base.length > 0
  return (
    <div className="lg:-mx-8 lg:-mb-16 lg:-mt-8 lg:flex lg:min-h-dvh">
      {showRail && <CategorySidebar {...rail} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 -mx-4 bg-canvas/95 px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-8 lg:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Breadcrumb kind={kind} selected={selected} />
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-[var(--subtle)]">
                {items.length.toLocaleString('tr-TR')} öğe
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
            </div>
            {hasAny && (
              <>
                <div className="mr-3 hidden sm:block">
                  <Segmented<CardSize>
                    label="Kart boyutu"
                    value={prefs.cardSize}
                    onChange={(cardSize) => updatePrefs({ cardSize })}
                    options={[
                      { value: 'sm', label: 'Küçük' },
                      { value: 'md', label: 'Orta' },
                      { value: 'lg', label: 'Büyük' },
                    ]}
                  />
                </div>
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`${KIND_LABEL[kind]} içinde ara`} aria-label="Ara" className="field !pl-9 !pr-9" />
                  {query && (
                    <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--subtle)] hover:text-[var(--ink)]">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        <div className="pt-2 lg:px-8 lg:pb-16">
          {showRail && (
            <div className="mb-3 lg:hidden">
              <CountrySelect />
            </div>
          )}
          {showRail && <CategoryChips {...rail} />}

          {kind === 'series' && catalog.error && xtream && (
            <p className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-[var(--ink-2)]">
              Dizi listesi portaldan alınamadı. {catalog.error} Listedeki bölümler tek tek gösteriliyor.
            </p>
          )}

          {lists.starting ? (
            <SkeletonGrid poster={poster} className={gridClass} />
          ) : kind === 'series' && catalog.loading && !hasAny ? (
            <div>
              <p className="mb-4 text-sm text-[var(--subtle)]">Diziler portaldan yükleniyor...</p>
              <SkeletonGrid poster className={POSTER_GRID[prefs.cardSize]} />
            </div>
          ) : lists.playlists.length === 0 ? (
            <Empty icon="add">M3U adresi, portal girişi veya dosyayla ilk listeni ekle.</Empty>
          ) : !hasAny && activeCountries.length > 0 ? (
            <Empty icon="none">
              Seçili ülkelerde bu türde içerik yok.
              <div className="mt-4">
                <button type="button" onClick={() => setCountries([])} className="btn-primary">
                  Ülke filtresini temizle
                </button>
              </div>
            </Empty>
          ) : !hasAny ? (
            <Empty icon="none">{EMPTY_HINT[kind]}</Empty>
          ) : base.length === 0 ? (
            <Empty icon="manage">
              Bu türdeki tüm kategoriler gizli.
              <div className="mt-4">
                <button type="button" onClick={() => openManage(kind)} className="btn-primary">
                  <SlidersHorizontal size={16} aria-hidden="true" /> Kategorileri yönet
                </button>
              </div>
            </Empty>
          ) : items.length === 0 ? (
            <Empty icon="none">
              {selected === FAVORITES && deferred.trim() === '' ? 'Bu bölümde henüz favorin yok. Kartlardaki kalbe dokunarak favori ekleyebilirsin.' : 'Eşleşen sonuç yok.'}
            </Empty>
          ) : (
            <ProgressiveGrid
              key={`${selected}|${deferred}|${prefs.cardSize}`}
              items={items}
              className={gridClass}
              getKey={(c) => c.id}
              render={(c) => {
                const props = { channel: c, active: current?.id === c.id, favorite: isFavorite(c), showLogo: prefs.showLogos, onPlay: (ch: Channel) => openItem(ch, kind === 'live' ? items : undefined), onFavorite: toggleFavorite }
                return poster ? <PosterCard {...props} /> : <ChannelCard {...props} epg={epg.nowNext(c)} />
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
