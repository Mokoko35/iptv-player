import { useDeferredValue, useMemo, useState } from 'react'
import { Clapperboard, Library, Search, Tv, X } from 'lucide-react'
import { Empty } from './EmptyState'
import { InlinePlayerColumn } from './InlinePlayerColumn'
import { ChannelListItem, TitleListItem } from './ListItems'
import { KIND_LABEL, type Kind } from './kinds'
import { ProgressiveGrid } from './ProgressiveGrid'
import { SkeletonRows } from './Skeletons'
import type { Channel } from './types'
import { useMedia } from './useMedia'

const KINDS: { kind: Kind; icon: typeof Tv }[] = [
  { kind: 'live', icon: Tv },
  { kind: 'movie', icon: Clapperboard },
  { kind: 'series', icon: Library },
]

/**
 * Favorites in the same four columns as Live TV: the type (Live TV, Movies, Series) in column 2,
 * the favorites of that type in column 3, and the player in column 4.
 */
export function FavoritesPage() {
  const { lists, visible, prefs, current, openItem, isFavorite, toggleFavorite, epg } = useMedia()
  const [picked, setPicked] = useState<Kind | null>(null)
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query)

  const favs = useMemo<Record<Kind, Channel[]>>(
    () => ({ live: visible.live.filter(isFavorite), movie: visible.movie.filter(isFavorite), series: visible.series.filter(isFavorite) }),
    [visible, isFavorite],
  )
  // Open on the first type that has favorites.
  const kind: Kind = picked ?? (favs.live.length > 0 ? 'live' : favs.movie.length > 0 ? 'movie' : favs.series.length > 0 ? 'series' : 'live')
  const total = favs.live.length + favs.movie.length + favs.series.length

  const items = useMemo(() => {
    const q = deferred.trim().toLocaleLowerCase('tr')
    return q ? favs[kind].filter((c) => c.name.toLocaleLowerCase('tr').includes(q)) : favs[kind]
  }, [favs, kind, deferred])

  const tabs = KINDS.map(({ kind: k, icon: Icon }) => ({ k, Icon, count: favs[k].length, on: k === kind }))

  return (
    <div className="lg:-mx-8 lg:-mb-16 lg:-mt-8 lg:flex lg:h-dvh">
      {/* Column 2: which type of favorites */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col self-start border-r border-white/10 bg-rail lg:flex" aria-label="Favori türleri">
        <div className="px-5 pb-2 pt-6">
          <h2 className="label">Favoriler</h2>
        </div>
        <ul className="space-y-0.5 px-2" role="tablist" aria-orientation="vertical">
          {tabs.map(({ k, Icon, count, on }) => (
            <li key={k}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPicked(k)}
                className={`relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${on ? 'bg-accent/15 font-semibold text-accent' : 'text-[var(--subtle)] hover:bg-white/5 hover:text-[var(--ink)]'}`}
              >
                {on && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent" />}
                <Icon size={18} aria-hidden="true" />
                <span className="flex-1">{KIND_LABEL[k]}</span>
                <span className="text-xs tabular-nums opacity-60">{count.toLocaleString('tr-TR')}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Column 3: the favorites */}
      <section aria-label="Favoriler" className="min-w-0 lg:flex lg:h-dvh lg:w-[22rem] lg:flex-none lg:flex-col lg:border-r lg:border-white/10 xl:w-[25rem]">
        <header className="shrink-0 pb-3 lg:px-4 lg:pt-5">
          <h1 className="display text-lg font-semibold">
            Favoriler <span className="text-[var(--subtle)]">›</span> <span className="text-accent">{KIND_LABEL[kind]}</span>
          </h1>
          <p className="mt-0.5 text-sm tabular-nums text-[var(--subtle)]">{items.length.toLocaleString('tr-TR')} öğe</p>

          {/* On a narrow window the types are chips instead of a column. */}
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden" role="tablist" aria-label="Favori türleri">
            {tabs.map(({ k, count, on }) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPicked(k)}
                className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm ${on ? 'border-accent bg-accent/15 text-accent' : 'border-white/10 text-[var(--subtle)]'}`}
              >
                {KIND_LABEL[k]} <span className="text-xs tabular-nums opacity-60">{count}</span>
              </button>
            ))}
          </div>

          {total > 0 && (
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtle)]" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Favorilerde ara" aria-label="Favorilerde ara" className="field !pl-9 !pr-9" />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Aramayı temizle" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-[var(--subtle)] hover:text-[var(--ink)]">
                  <X size={15} />
                </button>
              )}
            </div>
          )}
        </header>

        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-6">
          {lists.starting ? (
            <SkeletonRows />
          ) : lists.playlists.length === 0 ? (
            <Empty icon="add">Önce bir liste ekle. Sonra kanalların, filmlerin ve dizilerin yanındaki kalple favori ekleyebilirsin.</Empty>
          ) : favs[kind].length === 0 ? (
            <Empty icon="none">{total === 0 ? 'Henüz favorin yok. Kanal, film veya dizilerin yanındaki kalbe dokunarak favori ekleyebilirsin.' : `${KIND_LABEL[kind]} içinde favorin yok.`}</Empty>
          ) : items.length === 0 ? (
            <Empty icon="none">Eşleşen favori yok.</Empty>
          ) : (
            <ProgressiveGrid
              key={`${kind}|${deferred}`}
              items={items}
              className="flex flex-col gap-0.5"
              getKey={(c) => c.id}
              render={(c) => {
                const props = { channel: c, active: current?.id === c.id, favorite: isFavorite(c), showLogo: prefs.showLogos, onPlay: (ch: Channel) => openItem(ch, kind === 'live' ? items : undefined), onFavorite: toggleFavorite }
                return kind === 'live' ? <ChannelListItem {...props} epg={epg.nowNext(c)} /> : <TitleListItem {...props} />
              }}
            />
          )}
        </div>
      </section>

      {/* Column 4: the player */}
      <InlinePlayerColumn />
    </div>
  )
}
