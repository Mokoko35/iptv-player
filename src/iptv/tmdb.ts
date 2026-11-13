import { type Details, cached } from './xtreamApi'
import { t } from './i18n'
import { tmdbLanguage } from './i18n'

/**
 * TheMovieDB lookup by title. List makers write titles like "Hillel | 2026 | TR-ENG" or "Heat (1995) [TR]",
 * which TMDB cannot find, so the title and year are pulled out first.
 */

const IMG = 'https://image.tmdb.org/t/p'
const DAY = 86_400_000

export interface ParsedTitle {
  title: string
  year?: string
  /** Language and quality tags that were in the name ("TR-ENG", "4K"). */
  tags: string[]
}

const YEAR = /^\(?((?:19|20)\d{2})\)?$/
const TAG = /^(?:[A-Z]{2,3}(?:[-/ +&][A-Z]{2,3})*|dual|dublaj(?:lı)?|altyaz[ıi]l?[ıi]?|t[üu]rk[çc]e|multi|4k|fhd|uhd|hdr|hd|sd|hevc|x26[45]|(?:480|720|1080|2160)p|web-?dl|web-?rip|blu-?ray|brrip|dvdrip)$/i

export function parseTitle(raw: string): ParsedTitle {
  const tags: string[] = []
  let year: string | undefined
  const text = raw.replace(/\[([^\]]*)\]/g, (_m, inner: string) => {
    tags.push(inner.trim())
    return ' '
  })
  let segments = text.split('|').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)

  // "TR | Hillel | 2026": a leading country tag is not part of the title.
  const first = segments[0]
  const second = segments[1]
  if (first && second && /^[A-Z]{2,3}$/.test(first) && !YEAR.test(second) && !TAG.test(second)) {
    tags.push(first)
    segments = segments.slice(1)
  }
  const kept: string[] = []
  for (const seg of segments) {
    const y = YEAR.exec(seg)
    if (y) year = year ?? y[1]
    else if (kept.length > 0 && TAG.test(seg)) tags.push(seg)
    else kept.push(seg)
  }
  let title = kept[0] ?? segments[0] ?? raw

  // "Heat (1995)", "Heat - 1995", "Show S01E02", "TR: Heat"
  title = title
    .replace(/^[A-Za-z]{2,3}\s*[:\-–]\s+(?=\S)/, (m) => (/^[A-Z]{2,3}\s*[:\-–]\s+$/.test(m) ? '' : m))
    .replace(/\bS\d{1,2}\s*E\d{1,3}\b.*$/i, '')
    .replace(/\s*[(\[]((?:19|20)\d{2})[)\]]\s*$/, (_m, y: string) => {
      year = year ?? y
      return ''
    })
    .replace(/\s+[-–]\s+((?:19|20)\d{2})\s*$/, (_m, y: string) => {
      year = year ?? y
      return ''
    })
    .replace(/\s+/g, ' ')
    .trim()
  return { title: title || raw.trim(), year, tags }
}

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rec) : null)
const list = (v: unknown): unknown[] => (Array.isArray(v) ? (v as unknown[]) : [])
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

async function call(key: string, path: string, params: Record<string, string>): Promise<Rec> {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const headers: Record<string, string> = {}
  // A long key that starts with "eyJ" is the v4 read token; the short one is the v3 key.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  else url.searchParams.set('api_key', key)
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
  if (res.status === 401) throw new Error(t('TMDB anahtarı geçersiz.'))
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return rec(await res.json()) ?? {}
}

/** True when TMDB accepts the key. */
export async function testTmdbKey(key: string): Promise<boolean> {
  try {
    await call(key, '/configuration', {})
    return true
  } catch {
    return false
  }
}

export type TmdbKind = 'movie' | 'tv'

const yearOfDate = (v: unknown): string | undefined => text(v)?.slice(0, 4)

async function search(key: string, kind: TmdbKind, title: string, year?: string): Promise<string | null> {
  const run = async (withYear: boolean) => {
    const params: Record<string, string> = { query: title, language: tmdbLanguage(), include_adult: 'false' }
    if (withYear && year) params[kind === 'movie' ? 'year' : 'first_air_date_year'] = year
    return list((await call(key, `/search/${kind}`, params)).results).map(rec).filter((r): r is Rec => r !== null)
  }
  let results = await run(true)
  if (results.length === 0 && year) results = await run(false)
  const exact = year ? results.find((r) => yearOfDate(r.release_date ?? r.first_air_date) === year) : undefined
  const hit = exact ?? results[0]
  return hit && num(hit.id) !== undefined ? String(num(hit.id)) : null
}

function toDetails(kind: TmdbKind, d: Rec): Details {
  const credits = rec(d.credits)
  const cast = list(credits?.cast).map(rec).map((c) => text(c?.name)).filter((n): n is string => Boolean(n)).slice(0, 8)
  const crew = list(credits?.crew).map(rec)
  const directors = crew.filter((c) => c?.job === 'Director').map((c) => text(c?.name)).filter((n): n is string => Boolean(n))
  const creators = list(d.created_by).map(rec).map((c) => text(c?.name)).filter((n): n is string => Boolean(n))
  const genres = list(d.genres).map(rec).map((g) => text(g?.name)).filter((n): n is string => Boolean(n))
  const video = list(rec(d.videos)?.results).map(rec).find((v) => v?.site === 'YouTube' && v?.type === 'Trailer' && text(v?.key))
  const runtime = kind === 'movie' ? num(d.runtime) : num(list(d.episode_run_time)[0])
  const votes = num(d.vote_count) ?? 0
  const average = num(d.vote_average)
  const poster = text(d.poster_path)
  const backdrop = text(d.backdrop_path)
  const trailerKey = text(video?.key)
  return {
    poster: poster ? `${IMG}/w500${poster}` : undefined,
    backdrop: backdrop ? `${IMG}/w1280${backdrop}` : undefined,
    plot: text(d.overview),
    cast: cast.length > 0 ? cast.join(', ') : undefined,
    director: (kind === 'movie' ? directors : creators).join(', ') || undefined,
    genre: genres.length > 0 ? genres.join(', ') : undefined,
    year: yearOfDate(d.release_date ?? d.first_air_date),
    duration: runtime ? `${runtime} dk` : undefined,
    rating: average !== undefined && votes > 0 ? Math.round(average * 10) / 10 : undefined,
    trailer: trailerKey ? `https://www.youtube.com/watch?v=${encodeURIComponent(trailerKey)}` : undefined,
    tmdbId: String(num(d.id) ?? ''),
  }
}

/**
 * The film's or series' details from TMDB. Uses the TMDB id when the portal gave one (exact), otherwise searches by
 * the cleaned title and year. Null when nothing matches.
 */
export function findTmdb(key: string, kind: TmdbKind, rawTitle: string, tmdbId?: string): Promise<Details | null> {
  const { title, year } = parseTitle(rawTitle)
  const cacheKey = `tmdb:${tmdbLanguage()}:${kind}:${tmdbId ?? `${title.toLowerCase()}|${year ?? ''}`}`
  return cached(cacheKey, 14 * DAY, async () => {
    const id = tmdbId ?? (await search(key, kind, title, year))
    if (!id) return null
    const detail = { append_to_response: 'credits,videos', language: tmdbLanguage() }
    const d = await call(key, `/${kind}/${id}`, detail)
    const out = toDetails(kind, d)
    // No Turkish summary: take the English one rather than none.
    if (!out.plot) {
      const en = await call(key, `/${kind}/${id}`, { language: 'en-US' }).catch(() => null)
      out.plot = text(en?.overview)
    }
    return out
  })
}

/** Fills the gaps of `base` with `extra`; where both have a value, TMDB's wins because it was matched on the clean title. */
export function mergeDetails<T extends Details>(base: T | undefined, extra: Details | null | undefined): T {
  const merged: Record<string, unknown> = { ...(base ?? {}) }
  for (const [k, v] of Object.entries(extra ?? {})) if (v !== undefined && v !== '') merged[k] = v
  return merged as T
}
