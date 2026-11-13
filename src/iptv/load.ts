import { kindOfUrl } from './kinds'
import { looksLikeM3U, parseM3U } from './m3u'
import type { Channel } from './types'
import { t } from './i18n'

export type LoadErrorCode = 'blocked' | 'http' | 'timeout' | 'notM3u' | 'empty'

export class LoadError extends Error {
  readonly code: LoadErrorCode
  readonly status?: number
  constructor(code: LoadErrorCode, status?: number) {
    super(`Load error: ${code}`)
    this.code = code
    this.status = status
  }
}

export function loadErrorText(error: unknown): string {
  if (error instanceof LoadError) {
    switch (error.code) {
      case 'blocked':
        return t('Tarayıcı bu adrese erişemedi. Sunucu çoğu zaman tarayıcılara izin vermez (CORS) veya adres http:// ile başlıyor. Windows masaüstü uygulamasında bu sorun olmaz; tarayıcıda ise listeyi indirip "Dosya" sekmesinden yükleyebilirsin.')
      case 'http':
        return t('Sunucu hata döndürdü ({v0}). Adresi, kullanıcı adını ve şifreyi kontrol et.', { v0: error.status ?? '?' })
      case 'timeout':
        return t('Sunucu zamanında yanıt vermedi. Biraz sonra tekrar dene.')
      case 'notM3u':
        return t('Yanıt bir M3U listesi gibi görünmüyor. Adres veya giriş bilgileri yanlış olabilir.')
      case 'empty':
        return t('Listede oynatılabilir kanal bulunamadı.')
    }
  }
  return t('Liste yüklenemedi.')
}

export function channelsFromText(text: string): Channel[] {
  if (!looksLikeM3U(text)) throw new LoadError('notM3u')
  const channels = parseM3U(text)
  if (channels.length === 0) throw new LoadError('empty')
  return channels
}

export type LoadStage = 'connecting' | 'downloading' | 'reading' | 'saving' | 'done'

/** What the Add list window shows while a list loads. Counts grow as the file downloads. */
export interface LoadProgress {
  stage: LoadStage
  bytes: number
  /** Total size, when the server says so. */
  total?: number
  live: number
  movie: number
  series: number
}

export const EMPTY_PROGRESS: LoadProgress = { stage: 'connecting', bytes: 0, live: 0, movie: 0, series: 0 }

type Report = (p: LoadProgress) => void

/** Counts stream addresses by type while text arrives, without keeping the text. */
class StreamCounter {
  live = 0
  movie = 0
  series = 0
  private tail = ''

  push(chunk: string) {
    const text = this.tail + chunk
    const lastBreak = text.lastIndexOf('\n')
    if (lastBreak < 0) {
      this.tail = text
      return
    }
    this.tail = text.slice(lastBreak + 1)
    for (const line of text.slice(0, lastBreak).split('\n')) this.count(line)
  }

  /** Counts the last line, which has no line break after it. */
  flush() {
    this.count(this.tail)
    this.tail = ''
  }

  private count(line: string) {
    const url = line.trim()
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) this[kindOfUrl(url)]++
  }
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/** Downloads a list, reporting progress, and parses it. A stalled connection gives up after 30 seconds without data. */
export async function channelsFromUrl(url: string, report?: Report, stallMs = 30_000): Promise<Channel[]> {
  const ctl = new AbortController()
  let timer = setTimeout(() => ctl.abort(), stallMs)
  const rearm = () => {
    clearTimeout(timer)
    timer = setTimeout(() => ctl.abort(), stallMs)
  }
  const counter = new StreamCounter()
  let bytes = 0
  let total: number | undefined
  let lastReport = 0
  const emit = (stage: LoadStage, force = false) => {
    const now = Date.now()
    if (!force && now - lastReport < 120) return
    lastReport = now
    report?.({ stage, bytes, total, live: counter.live, movie: counter.movie, series: counter.series })
  }

  try {
    emit('connecting', true)
    let res: Response
    try {
      res = await fetch(url, { signal: ctl.signal })
    } catch {
      throw new LoadError(ctl.signal.aborted ? 'timeout' : 'blocked')
    }
    if (!res.ok) throw new LoadError('http', res.status)
    const length = Number(res.headers.get('content-length'))
    total = Number.isFinite(length) && length > 0 ? length : undefined

    let text = ''
    if (res.body) {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const parts: string[] = []
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          rearm()
          bytes += value.byteLength
          const chunk = decoder.decode(value, { stream: true })
          parts.push(chunk)
          counter.push(chunk)
          emit('downloading')
        }
      } catch {
        throw new LoadError(ctl.signal.aborted ? 'timeout' : 'blocked')
      }
      const rest = decoder.decode()
      parts.push(rest)
      counter.push(rest)
      counter.flush()
      text = parts.join('')
    } else {
      text = await res.text()
      bytes = text.length
    }

    emit('reading', true)
    await tick() // let the screen show "reading" before the heavy parse
    return channelsFromText(text)
  } finally {
    clearTimeout(timer)
  }
}
