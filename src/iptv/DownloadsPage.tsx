import { useMemo, useState } from 'react'
import { AlertTriangle, Clapperboard, FolderOpen, Library, Loader2, Play, RotateCcw, Trash2, X } from 'lucide-react'
import { PosterArt } from './Cards'
import { type DownloadItem, cancelDownload, fileUrl, formatBytes, openDownloadFolder, removeDownload, requestDownload, useDownloads } from './downloads'
import { dateTime } from './epgFormat'
import { IS_HOST } from './host'
import type { Channel } from './types'
import { useMedia } from './useMedia'

type Tab = 'movie' | 'series'

/** "Dizi adı · S1B2" is how an episode's download is named. */
function episodeOf(title: string): { series: string; season: number; episode: number } | null {
  const m = /^(.*) · S(\d+)B(\d+)$/.exec(title)
  return m ? { series: m[1] ?? title, season: Number(m[2]), episode: Number(m[3]) } : null
}

/** A downloaded file as something the player can play. */
function playable(item: DownloadItem): Channel {
  const ep = episodeOf(item.title)
  return {
    id: `download:${item.title}`,
    name: item.title,
    url: fileUrl(item.path ?? ''),
    logo: item.logo,
    group: 'İndirilenler',
    subtitle: ep ? `Sezon ${ep.season} · Bölüm ${ep.episode}` : undefined,
  }
}

function Card({ item, onPlay }: { item: DownloadItem; onPlay: () => void }) {
  const ep = episodeOf(item.title)
  const label = ep ? `Sezon ${ep.season} · Bölüm ${ep.episode}` : item.title
  const done = item.status === 'done' && !!item.path
  return (
    <article className="group relative hover:z-10">
      <button
        type="button"
        onClick={onPlay}
        disabled={!done}
        aria-label={done ? `${item.title} oynat` : item.title}
        className="block w-full text-left disabled:cursor-default"
      >
        <span className={`relative block aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 transition-[transform,box-shadow,border-color] duration-200 group-hover:border-white/25 group-hover:shadow-xl ${done ? 'group-hover:scale-[1.03]' : ''}`}>
          <PosterArt key={item.logo ?? item.title} name={ep ? ep.series : item.title} src={item.logo} className="h-full w-full" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
          {done && (
            <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-[var(--accent-ink)]">
                <Play size={22} fill="currentColor" aria-hidden="true" />
              </span>
            </span>
          )}
          {item.status === 'active' && (
            <span className="absolute inset-x-0 bottom-0 bg-black/75 p-2.5">
              <span className="flex items-center justify-between gap-2 text-xs tabular-nums text-white/90">
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" aria-hidden="true" /> İndiriliyor
                </span>
                %{Math.round(item.progress)}
              </span>
              <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress)} aria-label={`${item.title} indirme durumu`}>
                <span className="block h-full rounded-full bg-accent" style={{ width: `${item.progress}%` }} />
              </span>
            </span>
          )}
          {item.status === 'error' && (
            <span className="absolute inset-0 grid place-items-center bg-black/70 p-3 text-center">
              <span>
                <AlertTriangle size={22} className="mx-auto text-danger" aria-hidden="true" />
                <span className="mt-1.5 block text-pretty text-xs text-white/90">İndirilemedi: {item.error}</span>
              </span>
            </span>
          )}
        </span>
        <span className="mt-2 block truncate text-sm font-medium" title={item.title}>
          {label}
        </span>
        <span className="block truncate text-xs text-[var(--subtle)]">
          {item.status === 'done' ? `${formatBytes(item.size)}${item.finishedAt ? ` · ${dateTime(item.finishedAt)}` : ''}` : item.status === 'active' ? 'İndiriliyor...' : 'Hata'}
        </span>
      </button>

      {/* Not inside the button above: a button cannot hold buttons. */}
      <div className="mt-1.5 flex items-center gap-1">
        {item.status === 'done' && item.path && (
          <button type="button" onClick={() => openDownloadFolder(item.path ?? '')} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <FolderOpen size={14} aria-hidden="true" /> Klasörü Aç
          </button>
        )}
        {item.status === 'active' && (
          <button type="button" onClick={() => cancelDownload(item.title)} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs text-[var(--subtle)] hover:bg-white/10 hover:text-danger">
            <X size={14} aria-hidden="true" /> İptal
          </button>
        )}
        {item.status === 'error' && (
          <button
            type="button"
            onClick={() => requestDownload({ id: item.title, name: item.title, url: item.url, logo: item.logo })}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]"
          >
            <RotateCcw size={14} aria-hidden="true" /> Tekrar dene
          </button>
        )}
        {item.status !== 'active' && (
          <button
            type="button"
            onClick={() => removeDownload(item.title)}
            aria-label={`${item.title} listeden kaldır`}
            title="Listeden kaldır (dosya silinmez)"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--subtle)] hover:bg-white/10 hover:text-danger"
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  )
}

const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4'

/** İndirilenler: what was downloaded for offline viewing, as Filmler and Diziler. Picking one plays the file. */
export function DownloadsPage() {
  const { play } = useMedia()
  const { items } = useDownloads()
  const [picked, setPicked] = useState<Tab | null>(null)

  const movies = useMemo(() => items.filter((i) => i.kind === 'movie'), [items])
  const series = useMemo(() => items.filter((i) => i.kind === 'series'), [items])
  // Opens on the tab that has something in it.
  const tab: Tab = picked ?? (movies.length === 0 && series.length > 0 ? 'series' : 'movie')

  // Episodes grouped by series (newest series first), each in season and episode order.
  const groups = useMemo(() => {
    const map = new Map<string, DownloadItem[]>()
    for (const item of series) {
      const name = episodeOf(item.title)?.series ?? item.title
      map.set(name, [...(map.get(name) ?? []), item])
    }
    const order = (i: DownloadItem) => {
      const ep = episodeOf(i.title)
      return ep ? ep.season * 10_000 + ep.episode : 0
    }
    return [...map.entries()].map(([name, list]) => [name, [...list].sort((a, b) => order(a) - order(b))] as const)
  }, [series])

  const playMovie = (item: DownloadItem) => {
    if (item.status === 'done' && item.path) play(playable(item), { fullscreen: true })
  }
  // The finished episodes of the series go with the first one played, so previous / next walk through them.
  const playEpisode = (item: DownloadItem, list: DownloadItem[]) => {
    if (item.status !== 'done' || !item.path) return
    const ready = list.filter((i) => i.status === 'done' && i.path).map(playable)
    play(playable(item), { fullscreen: true, episodes: ready })
  }

  const tabs: { id: Tab; label: string; count: number; icon: typeof Clapperboard }[] = [
    { id: 'movie', label: 'Filmler', count: movies.length, icon: Clapperboard },
    { id: 'series', label: 'Diziler', count: series.length, icon: Library },
  ]

  return (
    <div>
      <h1 className="display text-3xl font-semibold">İndirilenler</h1>
      <p className="mt-1 text-sm text-[var(--subtle)]">Cihazına indirdiğin film ve dizi bölümleri. Birine tıklayınca oynar; internet gerekmez.</p>
      {!IS_HOST && <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--subtle)]">İndirme yalnızca masaüstü uygulamasında çalışır. Burası uygulamada indirdiklerini listeler.</p>}

      <div role="tablist" aria-label="İndirilenler" className="mt-5 flex gap-1 border-b border-white/10">
        {tabs.map((t) => {
          const on = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`downloads-tab-${t.id}`}
              aria-selected={on}
              aria-controls="downloads-panel"
              onClick={() => setPicked(t.id)}
              className={`-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-medium transition ${on ? 'border-accent text-accent' : 'border-transparent text-[var(--subtle)] hover:text-[var(--ink)]'}`}
            >
              <t.icon size={16} aria-hidden="true" /> {t.label}
              <span className="text-xs tabular-nums opacity-70">{t.count}</span>
            </button>
          )
        })}
      </div>

      <div id="downloads-panel" role="tabpanel" aria-labelledby={`downloads-tab-${tab}`} className="mt-6">
        {tab === 'movie' && (
          movies.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--subtle)]">Henüz indirilmiş film yok. Bir filmin sayfasındaki "İndir" düğmesini kullan.</p>
          ) : (
            <div className={GRID}>
              {movies.map((item) => (
                <Card key={item.title} item={item} onPlay={() => playMovie(item)} />
              ))}
            </div>
          )
        )}
        {tab === 'series' && (
          groups.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--subtle)]">Henüz indirilmiş dizi bölümü yok. Bir dizinin sayfasında bölümün yanındaki indirme düğmesini kullan.</p>
          ) : (
            <div className="space-y-8">
              {groups.map(([name, list]) => (
                <section key={name} aria-label={name}>
                  <h2 className="display mb-3 flex items-baseline gap-2 text-lg font-semibold">
                    {name}
                    <span className="text-xs font-normal tabular-nums text-[var(--subtle)]">{list.length} bölüm</span>
                  </h2>
                  <div className={GRID}>
                    {list.map((item) => (
                      <Card key={item.title} item={item} onPlay={() => playEpisode(item, list)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
