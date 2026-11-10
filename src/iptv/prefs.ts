import type { Kind } from './kinds'
import { DEFAULT_THEME, THEMES, type ThemeId } from './themes'

export type CardSize = 'sm' | 'md' | 'lg'
export type EpgRefresh = 'off' | '6' | '12' | '24'
/** The shape of the picture: the film's own ('fit'), filled and cropped, stretched, or forced to 16:9 / 4:3. */
export type AspectMode = 'fit' | 'fill' | 'stretch' | '16:9' | '4:3'
export const ASPECT_MODES: AspectMode[] = ['fit', 'fill', 'stretch', '16:9', '4:3']
export const ASPECT_LABELS: Record<AspectMode, string> = { fit: 'Orijinal oran', fill: 'Doldur (kırp)', stretch: 'Uzat', '16:9': '16:9', '4:3': '4:3' }

export interface Prefs {
  theme: ThemeId
  /** Hide adult categories and channels. On by default; changing it needs the PIN. */
  adultFilter: boolean
  /** Country codes ticked in the Live TV country filter. "--" means channels without a country. */
  countries: string[]
  /** Left menu shows only icons. */
  sidebarCollapsed: boolean
  showLogos: boolean
  cardSize: CardSize
  autoplay: boolean
  bufferSeconds: 10 | 30 | 60
  hardwareDecoding: boolean
  epgUrl: string
  /** TheMovieDB key, to look up posters and summaries by title. Empty means off. */
  tmdbKey: string
  epgRefresh: EpgRefresh
  /** Full screen on a live channel: how many seconds the controls and the program band stay on screen after the last movement. */
  epgSeconds: number
  /** How the picture fills the player. Applies to every film and channel. */
  aspect: AspectMode
}

export const EPG_SECONDS_MIN = 3
export const EPG_SECONDS_MAX = 10

export const DEFAULT_PREFS: Prefs = {
  theme: DEFAULT_THEME,
  adultFilter: true,
  countries: [],
  sidebarCollapsed: false,
  showLogos: true,
  cardSize: 'md',
  autoplay: true,
  bufferSeconds: 30,
  hardwareDecoding: true,
  epgUrl: '',
  tmdbKey: '',
  epgRefresh: '24',
  epgSeconds: 5,
  aspect: 'fit',
}

const PREFS_KEY = 'iptv-player:prefs:v1'
const HIDDEN_KEY = 'iptv-player:hidden-categories:v1'
const ORDER_KEY = 'iptv-player:category-order:v1'

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function loadPrefs(): Prefs {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(PREFS_KEY) ?? 'null')
    if (!isRecord(raw)) return DEFAULT_PREFS
    const d = DEFAULT_PREFS
    return {
      theme: THEMES.find((t) => t.id === raw.theme)?.id ?? d.theme,
      adultFilter: typeof raw.adultFilter === 'boolean' ? raw.adultFilter : d.adultFilter,
      countries: Array.isArray(raw.countries) ? (raw.countries as unknown[]).filter((c): c is string => typeof c === 'string' && c.length <= 3).slice(0, 80) : d.countries,
      sidebarCollapsed: typeof raw.sidebarCollapsed === 'boolean' ? raw.sidebarCollapsed : d.sidebarCollapsed,
      showLogos: typeof raw.showLogos === 'boolean' ? raw.showLogos : d.showLogos,
      cardSize: raw.cardSize === 'sm' || raw.cardSize === 'md' || raw.cardSize === 'lg' ? raw.cardSize : d.cardSize,
      autoplay: typeof raw.autoplay === 'boolean' ? raw.autoplay : d.autoplay,
      bufferSeconds: raw.bufferSeconds === 10 || raw.bufferSeconds === 30 || raw.bufferSeconds === 60 ? raw.bufferSeconds : d.bufferSeconds,
      hardwareDecoding: typeof raw.hardwareDecoding === 'boolean' ? raw.hardwareDecoding : d.hardwareDecoding,
      tmdbKey: typeof raw.tmdbKey === 'string' ? raw.tmdbKey.trim().slice(0, 600) : d.tmdbKey,
      epgUrl: typeof raw.epgUrl === 'string' ? raw.epgUrl.slice(0, 500) : d.epgUrl,
      epgSeconds: typeof raw.epgSeconds === 'number' && Number.isFinite(raw.epgSeconds) ? Math.min(EPG_SECONDS_MAX, Math.max(EPG_SECONDS_MIN, Math.round(raw.epgSeconds))) : d.epgSeconds,
      aspect: ASPECT_MODES.find((m) => m === raw.aspect) ?? d.aspect,
      epgRefresh: raw.epgRefresh === 'off' || raw.epgRefresh === '6' || raw.epgRefresh === '12' || raw.epgRefresh === '24' ? raw.epgRefresh : d.epgRefresh,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // Storage unavailable; settings just won't persist.
  }
}

/** Hidden category names, per playlist and content type. */
export type HiddenMap = Record<string, string[]>

export const hiddenKey = (playlistId: string, kind: Kind): string => `${playlistId}:${kind}`

export function loadHidden(): HiddenMap {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? 'null')
    if (!isRecord(raw)) return {}
    const out: HiddenMap = {}
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) out[k] = (v as unknown[]).filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    return {}
  }
}

export function saveHidden(map: HiddenMap): void {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}

/** The order the user arranged categories in, per playlist and content type. Names not listed go after, A to Z. */
export type OrderMap = Record<string, string[]>

export function loadOrder(): OrderMap {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(ORDER_KEY) ?? 'null')
    if (!isRecord(raw)) return {}
    const out: OrderMap = {}
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) out[k] = (v as unknown[]).filter((x): x is string => typeof x === 'string')
    }
    return out
  } catch {
    return {}
  }
}

export function saveOrder(map: OrderMap): void {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(map))
  } catch {
    // ignore
  }
}
