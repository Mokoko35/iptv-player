import { cleanTitle, normalizeCategory, parseAttributes, splitExtinf } from './sanitize'
import type { Channel } from './types'

/** Small stable hash so a channel keeps the same id across refreshes. */
export function hashId(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export function looksLikeM3U(text: string): boolean {
  return /^\s*#EXTM3U/i.test(text.replace(/^\uFEFF/, ''))
}

/** Parses an extended M3U / M3U8 playlist into channels. Unknown tags are ignored. */
export function parseM3U(raw: string): Channel[] {
  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  const channels: Channel[] = []
  const seen = new Map<string, number>()
  let pending: { name: string; logo?: string; group?: string; tvgId?: string } | null = null
  let extGroup: string | undefined

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('#EXTINF')) {
      // The comma that ends the attributes is the first one outside quotes: a name or a logo address can hold commas.
      const { head, title } = splitExtinf(line)
      const attrs = parseAttributes(head)
      // Some lists leak attributes into the title; take the group and logo from there when the line itself lacks them.
      const leaked = parseAttributes(title)
      pending = {
        name: cleanTitle(title) || cleanTitle(attrs['tvg-name'] ?? '') || 'Adsız kanal',
        logo: attrs['tvg-logo'] || leaked['tvg-logo'] || undefined,
        group: normalizeCategory(attrs['group-title'] || leaked['group-title'] || extGroup),
        tvgId: attrs['tvg-id'] || leaked['tvg-id'] || undefined,
      }
    } else if (line.startsWith('#EXTGRP:')) {
      extGroup = normalizeCategory(line.slice(8)) 
    } else if (line.startsWith('#')) {
      continue
    } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) {
      const info = pending ?? { name: line.split('/').pop() ?? line }
      const base = hashId(line)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      channels.push({
        id: count === 0 ? base : `${base}-${count}`,
        name: info.name,
        url: line,
        logo: 'logo' in info ? info.logo : undefined,
        group: 'group' in info ? info.group : undefined,
        tvgId: 'tvgId' in info ? info.tvgId : undefined,
      })
      pending = null
    }
  }
  return channels
}
