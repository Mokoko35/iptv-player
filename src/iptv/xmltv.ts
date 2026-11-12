import { LoadError } from './load'
import type { Channel, XtreamLogin } from './types'
import { normalizeServer } from './xtream'

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Programme {
  start: number
  stop: number
  title: string
  desc?: string
}

/** Only programmes around "now" are kept, so even a very large guide stays small. */
export interface EpgData {
  fetchedAt: number
  /** Programmes per EPG channel id, sorted by start. */
  programmes: Record<string, Programme[]>
  /** Normalized channel name -> EPG channel id, for lists without tvg-id. */
  names: Record<string, string>
}

export interface NowNext {
  now?: Programme
  next?: Programme
  /** The programmes after `next`. */
  later: Programme[]
  /** How far into `now` we are, 0 to 1. */
  progress: number
}

export const xmltvUrl = (login: XtreamLogin): string =>
  `${normalizeServer(login.server)}/xmltv.php?${new URLSearchParams({ username: login.username.trim(), password: login.password.trim() }).toString()}`

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

/** "TRT 1 HD", "trt-1" and "TRT 1" all become "trt1". */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\b(hd|fhd|uhd|sd|4k|hevc)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
}

/** XMLTV time: 20260103180000 +0100 */
export function parseXmltvTime(value: string | undefined): number | undefined {
  const m = value ? /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-])?(\d{2})?(\d{2})?/.exec(value.trim()) : null
  if (!m) return undefined
  const [, y, mo, d, h, mi, s, sign, oh, om] = m
  const utc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0))
  const offset = sign && oh ? (Number(oh) * 60 + Number(om ?? 0)) * 60_000 * (sign === '-' ? -1 : 1) : 0
  return utc - offset
}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }

function text(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const out = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ent: string) => {
      if (ent.startsWith('#x')) return String.fromCodePoint(parseInt(ent.slice(2), 16))
      if (ent.startsWith('#')) return String.fromCodePoint(parseInt(ent.slice(1), 10))
      return ENTITIES[ent.toLowerCase()] ?? match
    })
    .replace(/\s+/g, ' ')
    .trim()
  return out || undefined
}

const attr = (head: string, name: string): string | undefined => new RegExp(`\\b${name}="([^"]*)"`).exec(head)?.[1]
const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/
const DESC = /<desc[^>]*>([\s\S]*?)<\/desc>/
const DISPLAY_NAME = /<display-name[^>]*>([\s\S]*?)<\/display-name>/g

const MAX_PER_CHANNEL = 12

/** Reads an XMLTV guide piece by piece, so a very large file never has to fit in memory. */
export class XmltvScanner {
  private buf = ''
  private readonly programmes: Record<string, Programme[]> = {}
  private readonly names: Record<string, string> = {}
  private readonly from: number
  private readonly until: number

  constructor(private readonly now: number) {
    this.from = now - 5 * 60_000
    this.until = now + 36 * 3_600_000
  }

  push(chunk: string): void {
    this.buf += chunk
    let pos = 0
    for (;;) {
      const p = this.buf.indexOf('<programme', pos)
      const c = this.buf.indexOf('<channel', pos)
      if (p < 0 && c < 0) {
        pos = Math.max(pos, this.buf.length - 12) // an opening tag may be split across chunks
        break
      }
      const isProgramme = c < 0 || (p >= 0 && p < c)
      const open = isProgramme ? p : c
      const endTag = isProgramme ? '</programme>' : '</channel>'
      const end = this.buf.indexOf(endTag, open)
      if (end < 0) {
        pos = open
        break
      }
      const block = this.buf.slice(open, end + endTag.length)
      if (isProgramme) this.programme(block)
      else this.channel(block)
      pos = end + endTag.length
    }
    this.buf = this.buf.slice(pos)
  }

  private programme(block: string): void {
    const head = block.slice(0, block.indexOf('>') + 1)
    const channel = attr(head, 'channel')
    const start = parseXmltvTime(attr(head, 'start'))
    const stop = parseXmltvTime(attr(head, 'stop'))
    if (!channel || start === undefined || stop === undefined || stop < this.from || start > this.until) return
    const title = text(TITLE.exec(block)?.[1])
    if (!title) return
    const desc = text(DESC.exec(block)?.[1])?.slice(0, 400)
    ;(this.programmes[channel] ??= []).push({ start, stop, title, desc })
  }

  private channel(block: string): void {
    const id = attr(block.slice(0, block.indexOf('>') + 1), 'id')
    if (!id) return
    for (const m of block.matchAll(DISPLAY_NAME)) {
      const key = normalizeName(text(m[1]) ?? '')
      if (key && !(key in this.names)) this.names[key] = id
    }
  }

  finish(): EpgData {
    for (const [id, list] of Object.entries(this.programmes)) {
      list.sort((a, b) => a.start - b.start)
      this.programmes[id] = list.filter((p, i) => i === 0 || p.start !== list[i - 1]?.start).slice(0, MAX_PER_CHANNEL)
    }
    return { fetchedAt: this.now, programmes: this.programmes, names: this.names }
  }
}

/* ------------------------------------------------------------------ */
/* Download                                                            */
/* ------------------------------------------------------------------ */

export function epgErrorText(error: unknown): string {
  if (error instanceof LoadError) {
    if (error.code === 'blocked') return 'Program rehberi indirilemedi. Tarayıcı bu sunucuya erişemiyor (CORS). Windows masaüstü uygulamasında çalışır.'
    if (error.code === 'http') return `Program rehberi sunucusu hata döndürdü (${error.status ?? '?'}). Adresi ve giriş bilgilerini kontrol et.`
    if (error.code === 'timeout') return 'Program rehberi zamanında gelmedi. Biraz sonra tekrar dene.'
    if (error.code === 'empty') return 'Rehberde şu an için program bulunamadı.'
  }
  return 'Program rehberi okunamadı.'
}

/** Downloads and reads a guide. Handles .xml and .xml.gz. Gives up after 45 seconds without data. */
export async function fetchEpg(url: string, onBytes?: (bytes: number) => void, stallMs = 45_000): Promise<EpgData> {
  const ctl = new AbortController()
  let timer = setTimeout(() => ctl.abort(), stallMs)
  const rearm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => ctl.abort(), stallMs)
  }
  try {
    let res: Response
    try {
      res = await fetch(url, { signal: ctl.signal })
    } catch {
      throw new LoadError(ctl.signal.aborted ? 'timeout' : 'blocked')
    }
    if (!res.ok) throw new LoadError('http', res.status)
    if (!res.body) throw new LoadError('empty')

    // A .gz file served as-is (not as Content-Encoding) has to be unpacked here.
    const rawGzip = (/\.gz(\?|$)/i.test(url) || (res.headers.get('content-type') ?? '').includes('gzip')) && !res.headers.get('content-encoding')
    const stream = rawGzip && typeof DecompressionStream !== 'undefined' ? res.body.pipeThrough(new DecompressionStream('gzip')) : res.body

    const scanner = new XmltvScanner(Date.now())
    const decoder = new TextDecoder()
    const reader = stream.getReader()
    let bytes = 0
    let lastReport = 0
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        rearm()
        bytes += value.byteLength
        scanner.push(decoder.decode(value, { stream: true }))
        const t = Date.now()
        if (t - lastReport > 250) {
          lastReport = t
          onBytes?.(bytes)
        }
      }
    } catch {
      throw new LoadError(ctl.signal.aborted ? 'timeout' : 'blocked')
    }
    scanner.push(decoder.decode())
    onBytes?.(bytes)

    const data = scanner.finish()
    if (Object.keys(data.programmes).length === 0) throw new LoadError('empty')
    return data
  } finally {
    clearTimeout(timer)
  }
}

/* ------------------------------------------------------------------ */
/* Lookup                                                              */
/* ------------------------------------------------------------------ */

/** The programmes of a channel: by tvg-id first, then by matching names. */
export function programmesFor(data: EpgData, channel: Channel): Programme[] | undefined {
  if (channel.tvgId) {
    const byId = data.programmes[channel.tvgId]
    if (byId) return byId
  }
  const id = data.names[normalizeName(channel.name)]
  return id ? data.programmes[id] : undefined
}

export function nowNextOf(list: Programme[] | undefined, now: number): NowNext | null {
  if (!list || list.length === 0) return null
  const i = list.findIndex((p) => p.start <= now && now < p.stop)
  if (i >= 0) {
    const current = list[i]
    if (!current) return null
    return {
      now: current,
      next: list[i + 1],
      later: list.slice(i + 2, i + 5),
      progress: Math.min(1, Math.max(0, (now - current.start) / Math.max(1, current.stop - current.start))),
    }
  }
  const upcoming = list.filter((p) => p.start > now)
  return upcoming.length > 0 ? { next: upcoming[0], later: upcoming.slice(1, 4), progress: 0 } : null
}
