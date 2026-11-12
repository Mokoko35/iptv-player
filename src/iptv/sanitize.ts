import type { Channel } from './types'

/**
 * Cleans what list makers put in M3U lines. Real lists contain titles with commas inside attributes,
 * attributes that leak into the title (`Title" tvg-logo="..." group-title="...",Title`), arrows of every shape in
 * category names, and stray spaces. Everything here is safe to run again on data it already cleaned.
 */

const ATTR = /([A-Za-z0-9_-]+)="([^"]*)"/g

export function parseAttributes(text: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of text.matchAll(ATTR)) {
    const key = m[1]
    if (key) attrs[key.toLowerCase()] = (m[2] ?? '').trim()
  }
  return attrs
}

/** Splits `#EXTINF:-1 attr="a,b" attr2="c",Title` at the first comma that is outside quotes. */
export function splitExtinf(line: string): { head: string; title: string } {
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) return { head: line.slice(0, i), title: line.slice(i + 1) }
  }
  // Quotes that never close: the title is whatever follows the last comma.
  const last = line.lastIndexOf(',')
  return last >= 0 ? { head: line.slice(0, last), title: line.slice(last + 1) } : { head: line, title: '' }
}

const collapse = (s: string) => s.replace(/[\p{Cf}\p{Cc}]/gu, ' ').replace(/[\s\u00a0]+/g, ' ').trim()

// Every little arrow that list makers use between "TR" and "Vizyon". They all become one, so one category is not split in two.
const ARROWS = /\s*[▸▹►▻▶▷‣➤➜➔→⇒›»]\s*/g
export const CATEGORY_ARROW = '▸'

/** "TR▹Vizyon", "TR  ►  Vizyon" and "TR ▸ Vizyon" are the same category. */
export function normalizeCategory(name: string | undefined): string | undefined {
  if (name === undefined) return undefined
  const cleaned = collapse(name.replace(/^["'\s]+|["'\s]+$/g, '')).replace(ARROWS, ` ${CATEGORY_ARROW} `)
  const result = collapse(cleaned)
  return result === '' ? undefined : result
}

/** True when attribute debris is mixed into a title. */
const hasDebris = (s: string) => /(?:^|[\s"])(?:tvg-[a-z-]+|group-title|catchup[a-z-]*|channel-id|radio)\s*=/i.test(s) || /"\s*[A-Za-z0-9_-]+\s*=\s*"/.test(s)

/** The real title: no attributes, no stray quotes. Plain titles come back unchanged (apart from spacing). */
export function cleanTitle(raw: string): string {
  const t = raw.replace(/^#EXTINF:\S*\s*/i, '')
  if (!hasDebris(t)) return collapse(t)
  const stripped = t
    .replace(ATTR, ' ') // drop complete key="value" pairs
    .replace(/\b(?:tvg-[a-z-]+|group-title|catchup[a-z-]*)=\S*/gi, ' ') // and unquoted ones
    .replace(/"/g, ' ')
  // What is left is "title , title": the title is after the last comma.
  const parts = stripped.split(',').map(collapse).filter(Boolean)
  return collapse((parts[parts.length - 1] ?? '').replace(/^["'\s,]+|["'\s,]+$/g, ''))
}

/** A channel as it comes out of storage or an M3U line, with the title, category and logo repaired. */
export function sanitizeChannel(c: Channel): Channel {
  const debris = hasDebris(c.name) || (c.logo !== undefined && c.logo.includes('"')) || (c.group !== undefined && /=\s*"/.test(c.group))
  let { name, logo, group } = c
  if (debris) {
    const found = parseAttributes([c.name, c.group ?? '', c.logo ?? ''].join(' '))
    name = cleanTitle(c.name) || cleanTitle(found['tvg-name'] ?? '') || c.name
    if (!logo || logo.includes('"')) logo = found['tvg-logo'] || logo?.split('"')[0] || undefined
    if (!group || group === 'Kategorisiz' || /=\s*"/.test(group)) group = found['group-title'] || group
  } else {
    name = collapse(name) || name
  }
  group = normalizeCategory(group)
  return name === c.name && logo === c.logo && group === c.group ? c : { ...c, name, logo, group }
}
