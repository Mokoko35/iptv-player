import type { Channel } from './types'

/** Channels whose name has no country prefix. */
export const NO_COUNTRY = '--'

// Two-letter country codes, the same ones used for internet domains (.tr, .de ...), that list makers use as prefixes ("TR: TRT 1", "[DE] ZDF", "US | CNN").
const CODES = new Set(
  (
    'AD AE AF AL AM AO AR AT AU AZ BA BD BE BF BG BH BI BJ BN BO BR BS BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ ' +
    'DE DJ DK DO DZ EC EE EG ER ES ET FI FJ FR GA GB GE GH GM GN GQ GR GT GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP ' +
    'KE KG KH KR KW KZ LA LB LI LK LR LS LT LU LV LY MA MC MD ME MG MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO ' +
    'NP NZ OM PA PE PG PH PK PL PR PS PT PY QA RO RS RU RW SA SC SD SE SG SI SK SL SM SN SO SR SS SV SY SZ TD TG TH TJ TM TN ' +
    'TR TT TW TZ UA UG US UY UZ VA VE VN XK YE ZA ZM ZW ' +
    // Other internet country-code domains (.eu, .gl, .fo ...) that list makers also use as prefixes.
    'EU AG AI AW AX BB BM BT DM FO GD GI GL GU KM KN KP KY LC MH MQ GP GF MS NC NR PF PW SB TL VC VG VI VU YT'
  ).split(' '),
)

const ALIASES: Record<string, string> = { UK: 'GB' }

export interface CountryCount {
  code: string
  count: number
}

// A category or channel name starts with its country: "TR |", "TR:", "[TR]", "(TR)", "TR -", "TR ▸", "┃TR┃", "🇹🇷".
// Rather than list every separator, anything that is punctuation or a symbol counts (letters, digits and a few look-alikes do not).
const isJunk = (ch: string) => /^[\s\p{P}\p{S}]$/u.test(ch)
const isSeparator = (ch: string) => ':|/\\'.includes(ch) || /^[\p{Pd}\p{Pc}\p{Pe}\p{Pf}\p{So}]$/u.test(ch) || (/^\p{Sm}$/u.test(ch) && !'+=<'.includes(ch))
const FLAG = /^[\s\p{P}]*([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/u

/** Fullwidth letters become normal ones, invisible characters go away. */
const clean = (text: string) => text.normalize('NFKC').replace(/\p{Cf}/gu, '').replace(/[\p{Cc}\s]+/gu, ' ').trim()

/** Splits "TR ▸ Ulusal" into the code ("TR") and the rest ("Ulusal"). Null when the text does not start with a two-letter code. */
function parsePrefix(text: string): { code: string; rest: string } | null {
  const t = clean(text)
  const flag = FLAG.exec(t)
  if (flag) {
    const code = String.fromCharCode(...[flag[1], flag[2]].map((c) => (c ?? '').codePointAt(0)! - 0x1f1e6 + 65))
    return { code, rest: t.slice(flag[0].length).replace(/^[\s\p{P}\p{S}]+/u, '') }
  }
  const chars = [...t]
  let i = 0
  while (i < chars.length && isJunk(chars[i] ?? '')) i++
  const a = chars[i] ?? ''
  const b = chars[i + 1] ?? ''
  if (!/^[A-Za-z]$/.test(a) || !/^[A-Za-z]$/.test(b)) return null
  const code = a + b
  let k = i + 2
  if (k >= chars.length) return { code, rest: '' }
  if (/^[\p{L}\p{N}]$/u.test(chars[k] ?? '')) return null // "TRT", "DE1"
  while (chars[k] === ' ') k++
  if (k >= chars.length) return { code, rest: '' }
  if (!isSeparator(chars[k] ?? '')) return null // "IT Support": a plain space is not a separator
  return { code, rest: chars.slice(k + 1).join('').replace(/^[\s\p{P}\p{S}]+/u, '') }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const validCode = (raw: string | undefined): string | null => {
  if (!raw) return null
  const upper = raw.toUpperCase()
  const code = ALIASES[upper] ?? upper
  return CODES.has(code) ? code : null
}

// Names people write in category titles ("CR ▸ Croatia", "BH ▸ Bosnia"), as [normalized name, code].
const EXTRA_NAMES: [string, string][] = [
  ['turkey', 'TR'], ['usa', 'US'], ['america', 'US'], ['united states', 'US'], ['uae', 'AE'], ['england', 'GB'], ['britain', 'GB'],
  ['uk', 'GB'], ['macedonia', 'MK'], ['holland', 'NL'], ['czech', 'CZ'], ['bosnia', 'BA'], ['korea', 'KR'], ['russia', 'RU'], ['iran', 'IR'],
]
let nameIndex: [string, string][] | null = null

function names_(): [string, string][] {
  if (nameIndex) return nameIndex
  const out: [string, string][] = [...EXTRA_NAMES]
  if (typeof Intl !== 'undefined' && 'DisplayNames' in Intl) {
    for (const lang of ['en', 'tr']) {
      const dn = new Intl.DisplayNames([lang], { type: 'region' })
      for (const code of CODES) {
        try {
          const n = dn.of(code)
          if (n && n !== code) out.push([norm(n), code])
        } catch {
          /* unknown region */
        }
      }
    }
  }
  nameIndex = out
  return out
}

/** "croatia", "canada local" or "bosnia" to a country code. Null when the text is not a country name. */
function codeFromName(text: string): string | null {
  const t = norm(text)
  if (t.length < 3) return null
  const index = names_()
  for (const [name, code] of index) if (t === name || t.startsWith(`${name} `)) return code
  if (t.length >= 5) for (const [name, code] of index) if (name.startsWith(t)) return code
  return null
}

function fromName(name: string | undefined): string | null {
  const parsed = name ? parsePrefix(name) : null
  return parsed ? validCode(parsed.code) : null
}

const groupCache = new Map<string, string | null>()

/** "TR ▸ Ulusal" is Turkey. The country name after the code wins over the code, because list makers invent codes ("CR ▸ Croatia"). */
function fromGroup(group: string | undefined): string | null {
  if (!group) return null
  const hit = groupCache.get(group)
  if (hit !== undefined) return hit
  const parsed = parsePrefix(group)
  let result: string | null = null
  // "AR" in front of "Arabic" is the language, not Argentina.
  if (parsed && parsed.code.toUpperCase() === 'AR' && /^arab/i.test(parsed.rest)) result = null
  else if (parsed) result = codeFromName(parsed.rest) ?? validCode(parsed.code)
  else if (group.length <= 30) result = codeFromName(group)
  groupCache.set(group, result)
  return result
}

/** The country a category is named after ("TR | Haber", "[DE] Sport"). Null when its name has none. */
export const countryOfGroup = (group: string | undefined): string | null => fromGroup(group)

/** The country a channel belongs to: its category first (list makers group by country), then its name. Null when unknown. */
export const countryOf = (channel: Channel): string | null => fromGroup(channel.group) ?? fromName(channel.name)

/** 🇹🇷 for "TR". Built from the code, so no table is needed. */
export function flagOf(code: string): string {
  if (code === NO_COUNTRY || code.length !== 2) return '\u{1F310}'
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}

const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['tr'], { type: 'region' }) : null

export function countryName(code: string): string {
  if (code === NO_COUNTRY) return 'Diğer'
  try {
    return names?.of(code) ?? code
  } catch {
    return code
  }
}
