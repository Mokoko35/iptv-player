import { cacheGet, cachePut } from './db'
import { LoadError } from './load'
import { hashId } from './m3u'
import { normalizeCategory } from './sanitize'
import { readSubtitleSources } from './tracks'
import type { Channel, SubtitleSource, XtreamLogin } from './types'
import { normalizeServer } from './xtream'
import { t } from './i18n'

/* ------------------------------------------------------------------ */
/* Finding the portal login for a list                                 */
/* ------------------------------------------------------------------ */

/** Login from a get.php address, for lists added as a plain M3U address. */
export function loginFromPlaylistUrl(url: string | undefined): XtreamLogin | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const username = u.searchParams.get('username')
    const password = u.searchParams.get('password')
    return /\/get\.php$/i.test(u.pathname) && username && password ? { server: u.origin, username, password } : null
  } catch {
    return null
  }
}

/** Login from a film or series stream address: http://host/movie/USER/PASS/123.mkv */
export function loginFromStreamUrl(url: string | undefined): XtreamLogin | null {
  const m = url ? /^(https?:\/\/[^/]+)\/(?:movie|series)\/([^/]+)\/([^/]+)\/\d+/i.exec(url) : null
  if (!m?.[1] || !m[2] || !m[3]) return null
  try {
    return { server: m[1], username: decodeURIComponent(m[2]), password: decodeURIComponent(m[3]) }
  } catch {
    return null
  }
}

export const vodIdOf = (url: string): string | undefined => /\/movie\/[^/]+\/[^/]+\/(\d+)/i.exec(url)?.[1]

/* ------------------------------------------------------------------ */
/* Requests and cache                                                  */
/* ------------------------------------------------------------------ */

const TIMEOUT_MS = 45_000

async function api(login: XtreamLogin, action: string, params: Record<string, string> = {}): Promise<unknown> {
  const q = new URLSearchParams({ username: login.username.trim(), password: login.password.trim(), action, ...params })
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    let res: Response
    try {
      res = await fetch(`${normalizeServer(login.server)}/player_api.php?${q.toString()}`, { signal: ctl.signal })
    } catch {
      throw new LoadError(ctl.signal.aborted ? 'timeout' : 'blocked')
    }
    if (!res.ok) throw new LoadError('http', res.status)
    const body: unknown = await res.json().catch(() => null)
    if (body === null) throw new LoadError('notM3u')
    return body
  } finally {
    clearTimeout(timer)
  }
}

const memory = new Map<string, unknown>()

/** Looks in memory, then IndexedDB (until `ttlMs` is over), and only then asks the portal. */
export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  if (memory.has(key)) return memory.get(key) as T
  try {
    const hit = await cacheGet<T>(key)
    if (hit && Date.now() - hit.savedAt < ttlMs) {
      memory.set(key, hit.value)
      return hit.value
    }
  } catch {
    // The cache is only an optimization.
  }
  const value = await load()
  memory.set(key, value)
  void cachePut(key, value).catch(() => undefined)
  return value
}

const HOUR = 3_600_000
const DAY = 24 * HOUR

/* ------------------------------------------------------------------ */
/* Loose readers: portals return numbers as strings, [] for "nothing"  */
/* ------------------------------------------------------------------ */

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : null)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? (v as unknown[]) : [])
const str = (v: unknown): string | undefined => {
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}
const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  return Number.isFinite(n) ? n : undefined
}
const image = (v: unknown): string | undefined => {
  const first = Array.isArray(v) ? (v as unknown[]).find((x) => typeof x === 'string' && x.trim()) : v
  const s = str(first)
  return s && /^https?:\/\//i.test(s) ? s : undefined
}
const text = (v: unknown): string | undefined => str(v)?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || undefined

function ratingOf(info: Rec): number | undefined {
  const r = num(info.rating)
  if (r !== undefined && r > 0) return Math.min(10, Math.round(r * 10) / 10)
  const five = num(info.rating_5based)
  return five !== undefined && five > 0 ? Math.round(five * 20) / 10 : undefined
}

function durationOf(info: Rec): string | undefined {
  const secs = num(info.duration_secs)
  if (secs && secs > 0) return `${Math.round(secs / 60)} dk`
  const d = str(info.duration)
  const m = d ? /^(\d+):(\d+)(?::\d+)?$/.exec(d) : null
  if (m?.[1] && m[2]) return `${Number(m[1]) * 60 + Number(m[2])} dk`
  return d && d !== '00:00:00' ? d : undefined
}

const yearOf = (info: Rec): string | undefined => {
  const raw = str(info.releasedate) ?? str(info.releaseDate) ?? str(info.release_date) ?? str(info.year)
  return raw ? /\d{4}/.exec(raw)?.[0] : undefined
}

/* ------------------------------------------------------------------ */
/* Film details: get_vod_info                                          */
/* ------------------------------------------------------------------ */

export interface Details {
  poster?: string
  backdrop?: string
  plot?: string
  cast?: string
  director?: string
  genre?: string
  year?: string
  duration?: string
  rating?: number
  trailer?: string
  /** TheMovieDB id, when the portal knows it. It makes the TMDB match exact. */
  tmdbId?: string
  /** Subtitle files the portal lists. */
  subtitles?: SubtitleSource[]
}

function readDetails(info: Rec): Details {
  const trailer = str(info.youtube_trailer)
  return {
    poster: image(info.movie_image) ?? image(info.cover_big) ?? image(info.cover),
    backdrop: image(info.backdrop_path) ?? image(info.backdrop),
    plot: text(info.plot) ?? text(info.description),
    cast: str(info.cast) ?? str(info.actors),
    director: str(info.director),
    genre: str(info.genre),
    year: yearOf(info),
    duration: durationOf(info),
    rating: ratingOf(info),
    tmdbId: /^\d+$/.test(str(info.tmdb_id) ?? str(info.tmdb) ?? '') ? (str(info.tmdb_id) ?? str(info.tmdb)) : undefined,
    subtitles: readSubtitleSources(info.subtitles ?? info.subtitle).length > 0 ? readSubtitleSources(info.subtitles ?? info.subtitle) : undefined,
    trailer: trailer ? (trailer.startsWith('http') ? trailer : `https://www.youtube.com/watch?v=${encodeURIComponent(trailer)}`) : undefined,
  }
}

export function getVodInfo(login: XtreamLogin, playlistId: string, vodId: string): Promise<Details> {
  return cached(`${playlistId}:vod:${vodId}`, 7 * DAY, async () => {
    const body = rec(await api(login, 'get_vod_info', { vod_id: vodId }))
    return readDetails(rec(body?.info) ?? {})
  })
}

/* ------------------------------------------------------------------ */
/* Series: get_series, get_series_info                                 */
/* ------------------------------------------------------------------ */

export interface Episode {
  id: string
  season: number
  number: number
  title: string
  plot?: string
  duration?: string
  image?: string
  rating?: number
  url: string
  subtitles?: SubtitleSource[]
}

export interface SeriesDetails extends Details {
  seasons: { number: number; name: string }[]
  episodes: Record<number, Episode[]>
}

// Some portals already hand out the episode id with its extension ("123.mkv"). Adding the container extension on top
// would give "123.mkv.mp4", an address the portal does not know, and the episode would not play.
const HAS_EXTENSION = /\.(?:mkv|mp4|m4v|avi|mov|wmv|flv|webm|mpe?g|ts|m2ts|3gp|ogv)$/i

export function episodeUrl(login: XtreamLogin, id: string, ext: string): string {
  const cleanId = id.trim()
  const cleanExt = ext.trim().replace(/^\.+/, '') || 'mp4'
  const file = HAS_EXTENSION.test(cleanId) ? cleanId : `${cleanId}.${cleanExt}`
  return `${normalizeServer(login.server)}/series/${encodeURIComponent(login.username.trim())}/${encodeURIComponent(login.password.trim())}/${encodeURIComponent(file)}`
}

export function getSeriesInfo(login: XtreamLogin, playlistId: string, seriesId: string): Promise<SeriesDetails> {
  return cached(`${playlistId}:series:${seriesId}`, DAY, async () => {
    const body = rec(await api(login, 'get_series_info', { series_id: seriesId }))
    const info = rec(body?.info) ?? {}
    const details = readDetails({ ...info, movie_image: info.cover ?? info.movie_image })

    // Episodes come as { "1": [...], "2": [...] } or as one flat list.
    const flat: { season: number; raw: Rec }[] = []
    const eps = body?.episodes
    if (Array.isArray(eps)) {
      for (const group of eps as unknown[]) {
        for (const e of Array.isArray(group) ? (group as unknown[]) : [group]) {
          const r = rec(e)
          if (r) flat.push({ season: num(r.season) ?? 1, raw: r })
        }
      }
    } else if (rec(eps)) {
      for (const [key, group] of Object.entries(rec(eps) ?? {})) {
        for (const e of list(group)) {
          const r = rec(e)
          if (r) flat.push({ season: num(r.season) ?? num(key) ?? 1, raw: r })
        }
      }
    }

    const episodes: Record<number, Episode[]> = {}
    for (const { season, raw } of flat) {
      const id = str(raw.id)
      if (!id) continue
      const epInfo = rec(raw.info) ?? {}
      const number = num(raw.episode_num) ?? (episodes[season]?.length ?? 0) + 1
      const ep: Episode = {
        id,
        season,
        number,
        title: str(raw.title) ?? `Bölüm ${number}`,
        plot: text(epInfo.plot),
        duration: durationOf(epInfo),
        image: image(epInfo.movie_image),
        rating: ratingOf(epInfo),
        url: episodeUrl(login, id, str(raw.container_extension) ?? 'mp4'),
        subtitles: readSubtitleSources(epInfo.subtitles ?? epInfo.subtitle),
      }
      ;(episodes[season] ??= []).push(ep)
    }
    for (const group of Object.values(episodes)) group.sort((a, b) => a.number - b.number)

    const named = new Map<number, string>()
    for (const s of list(body?.seasons)) {
      const r = rec(s)
      const n = r ? num(r.season_number) : undefined
      if (r && n !== undefined) named.set(n, str(r.name) ?? `Sezon ${n}`)
    }
    const seasons = Object.keys(episodes)
      .map(Number)
      .sort((a, b) => a - b)
      .map((n) => ({ number: n, name: named.get(n) ?? `Sezon ${n}` }))

    return { ...details, seasons, episodes }
  })
}

/** A playable item for the player, built from an episode. */
export function episodeChannel(series: Channel, ep: Episode, poster: string | undefined): Channel {
  return {
    id: hashId(ep.url),
    name: `${series.name} · S${ep.season}B${ep.number}`,
    url: ep.url,
    logo: ep.image ?? poster ?? series.logo,
    group: series.group,
    description: ep.plot ?? series.description,
    subtitle: t('Sezon {season} · Bölüm {number} · {title}', { season: ep.season, number: ep.number, title: ep.title }),
    subtitleTracks: ep.subtitles && ep.subtitles.length > 0 ? ep.subtitles : undefined,
  }
}

/* ------------------------------------------------------------------ */
/* Catalogs for the grids                                              */
/* ------------------------------------------------------------------ */

export type VodArt = Record<string, { icon?: string; rating?: number }>

async function categoryNames(login: XtreamLogin, playlistId: string, action: string): Promise<Map<string, string>> {
  const rows = await cached(`${playlistId}:${action}`, 12 * HOUR, async () => list(await api(login, action)).map((r) => rec(r)).filter((r): r is Rec => r !== null).map((r) => [str(r.category_id) ?? '', str(r.category_name) ?? ''] as [string, string]))
  return new Map(rows.filter(([id, name]) => id && name))
}

/** All series of the portal as grid items. Cached for 12 hours. */
export function getSeriesCatalog(login: XtreamLogin, playlistId: string): Promise<Channel[]> {
  return cached(`${playlistId}:series-catalog`, 12 * HOUR, async () => {
    const [names, rows] = await Promise.all([categoryNames(login, playlistId, 'get_series_categories'), api(login, 'get_series')])
    const out: Channel[] = []
    for (const r of list(rows)) {
      const s = rec(r)
      const id = s && str(s.series_id)
      const name = s && str(s.name)
      if (!s || !id || !name) continue
      out.push({
        id: `s${id}`,
        name,
        url: `xtream-series:${id}`,
        logo: image(s.cover) ?? image(s.backdrop_path),
        group: normalizeCategory(names.get(str(s.category_id) ?? '')),
        seriesId: id,
        description: text(s.plot),
        rating: ratingOf(s),
      })
    }
    return out
  })
}

/** Posters and ratings for every film, from one request. Used to fill in films whose list entry has no logo. */
export function getVodArt(login: XtreamLogin, playlistId: string): Promise<VodArt> {
  return cached(`${playlistId}:vod-art`, 12 * HOUR, async () => {
    const art: VodArt = {}
    for (const r of list(await api(login, 'get_vod_streams'))) {
      const v = rec(r)
      const id = v && str(v.stream_id)
      if (!v || !id) continue
      art[id] = { icon: image(v.stream_icon), rating: ratingOf(v) }
    }
    return art
  })
}
