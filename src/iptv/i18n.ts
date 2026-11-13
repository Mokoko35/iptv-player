/**
 * Interface language. The Turkish source text is the key: t('Ayarlar') returns it as is in Turkish and the
 * translation in the other languages (src/iptv/i18n/<code>.ts). A missing translation falls back to the Turkish text,
 * so the screen is never empty. {name} placeholders are filled from `params`; numbers are formatted for the language.
 * Use tr() to mark text in module-level constants (it returns the key unchanged) and call t() on it where it is shown.
 */
import { ar } from './i18n/ar'
import { de } from './i18n/de'
import { en } from './i18n/en'
import { es } from './i18n/es'
import { fr } from './i18n/fr'
import { ru } from './i18n/ru'

export type Lang = 'tr' | 'en' | 'de' | 'ru' | 'ar' | 'es' | 'fr'

export interface LangInfo {
  code: Lang
  /** The language's own name. */
  name: string
  /** Country whose flag is shown in the picker. */
  region: string
  /** BCP 47 tag for numbers and dates (Latin digits for Arabic). */
  locale: string
  /** Language tag the TMDB API understands. */
  tmdb: string
  dir: 'ltr' | 'rtl'
}

export const LANGUAGES: LangInfo[] = [
  { code: 'tr', name: 'Türkçe', region: 'TR', locale: 'tr-TR', tmdb: 'tr-TR', dir: 'ltr' },
  { code: 'en', name: 'English', region: 'GB', locale: 'en-GB', tmdb: 'en-US', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', region: 'DE', locale: 'de-DE', tmdb: 'de-DE', dir: 'ltr' },
  { code: 'ru', name: 'Русский', region: 'RU', locale: 'ru-RU', tmdb: 'ru-RU', dir: 'ltr' },
  { code: 'ar', name: 'العربية', region: 'SA', locale: 'ar-SA-u-nu-latn', tmdb: 'ar-SA', dir: 'rtl' },
  { code: 'es', name: 'Español', region: 'ES', locale: 'es-ES', tmdb: 'es-ES', dir: 'ltr' },
  { code: 'fr', name: 'Français', region: 'FR', locale: 'fr-FR', tmdb: 'fr-FR', dir: 'ltr' },
]

/** One translation: plain text, or one text per plural form (zero, one, two, few, many, other). */
export type Entry = string | Partial<Record<Intl.LDMLPluralRule, string>>
export type Dictionary = Record<string, Entry>

const DICTIONARIES: Record<Exclude<Lang, 'tr'>, Dictionary> = { en, de, ru, ar, es, fr }
const STORAGE_KEY = 'app-lang'

const infoOf = (code: Lang): LangInfo => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]!

function readStored(): Lang {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return LANGUAGES.some((l) => l.code === v) ? (v as Lang) : 'tr'
  } catch {
    return 'tr'
  }
}

let current: Lang = typeof window === 'undefined' ? 'tr' : readStored()

export const getLang = (): Lang => current
export const locale = (): string => infoOf(current).locale
export const tmdbLanguage = (): string => infoOf(current).tmdb

/** Sets lang and dir on <html>. Called at start and whenever the language changes. */
export function applyDocumentLang(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = current
  document.documentElement.dir = infoOf(current).dir
}

export function setLang(code: Lang): void {
  current = code
  try {
    window.localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // storage is off: the choice lasts until the app closes
  }
  applyDocumentLang()
}

const pluralRules = new Map<string, Intl.PluralRules>()
function pluralFor(n: number): Intl.LDMLPluralRule {
  const tag = locale()
  let rules = pluralRules.get(tag)
  if (!rules) pluralRules.set(tag, (rules = new Intl.PluralRules(tag)))
  return rules.select(n)
}

export type Params = Record<string, string | number>

export function t(key: string, params?: Params): string {
  const entry = current === 'tr' ? undefined : DICTIONARIES[current][key]
  let text = key
  if (typeof entry === 'string') text = entry
  else if (entry) {
    const count = params ? Object.values(params).find((v): v is number => typeof v === 'number') : undefined
    text = (count !== undefined ? entry[pluralFor(count)] : undefined) ?? entry.other ?? key
  }
  if (!text.includes('{')) return text
  return text.replace(/\{\{|\}\}|\{(\w+)\}/g, (m, name: string | undefined) => {
    if (m === '{{') return '{'
    if (m === '}}') return '}'
    const v = name ? params?.[name] : undefined
    if (v === undefined) return m
    return typeof v === 'number' ? v.toLocaleString(locale()) : v
  })
}

/** Marks text in a module-level constant for translation; the text itself is unchanged. */
export const tr = (key: string): string => key
