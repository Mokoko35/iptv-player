import type { Channel } from './types'

export type Kind = 'live' | 'movie' | 'series'

export const KINDS: Kind[] = ['live', 'movie', 'series']

export const KIND_LABEL: Record<Kind, string> = { live: 'Canlı TV', movie: 'Filmler', series: 'Diziler' }
export const KIND_BADGE: Record<Kind, string> = { live: 'CANLI', movie: 'FİLM', series: 'DİZİ' }

export const UNCATEGORIZED = 'Kategorisiz'

/** Xtream portals put films under /movie/ and series under /series/. Plain M3U lists fall back to the file type. */
export function kindOfUrl(rawUrl: string): Kind {
  const url = rawUrl.toLowerCase()
  if (url.startsWith('file:')) return 'movie' // a downloaded file: it has a length and can be sought, whatever its extension
  if (url.includes('/movie/')) return 'movie'
  if (url.includes('/series/')) return 'series'
  if (/\.(mp4|mkv|avi)(\?|$)/.test(url)) return 'movie'
  return 'live'
}

export function kindOf(channel: Channel): Kind {
  return channel.seriesId ? 'series' : kindOfUrl(channel.url)
}

export const groupOf = (channel: Channel): string => channel.group || UNCATEGORIZED

export type Partition = Record<Kind, Channel[]>

export function partition(channels: Channel[]): Partition {
  const out: Partition = { live: [], movie: [], series: [] }
  for (const c of channels) out[kindOf(c)].push(c)
  return out
}

export interface Category {
  name: string
  count: number
}

export function categoriesOf(channels: Channel[]): Category[] {
  const counts = new Map<string, number>()
  for (const c of channels) counts.set(groupOf(c), (counts.get(groupOf(c)) ?? 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

/** Puts categories in the order the user arranged. Categories that are not in `order` (new ones) follow, A to Z. */
export function sortByOrder(categories: Category[], order: string[]): Category[] {
  if (order.length === 0) return categories
  const rank = new Map(order.map((name, i) => [name, i]))
  return [...categories].sort((a, b) => {
    const ra = rank.get(a.name)
    const rb = rank.get(b.name)
    if (ra !== undefined && rb !== undefined) return ra - rb
    if (ra !== undefined) return -1
    if (rb !== undefined) return 1
    return a.name.localeCompare(b.name, 'tr')
  })
}

/** Special category key for "only my favorites". Cannot clash with a real category name. */
export const FAVORITES = '\u0000favorites'

/** "TR | Disney+" -> ["TR", "Disney+"], so the title can show a path. */
export function categoryCrumbs(name: string): string[] {
  const parts = name
    .split(/\s*[|>»▸]\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [name]
}
