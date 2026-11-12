import { useSyncExternalStore } from 'react'
import { IS_HOST, onHostMessage, send } from './host'
import { kindOf } from './kinds'
import type { Channel } from './types'

/**
 * Downloads for offline viewing. The C# app does the downloading; this page asks for it (`download`), shows the progress it
 * reports and keeps the list of finished files. Downloads are matched by title, because that is what the messages carry.
 */
export interface DownloadItem {
  title: string
  url: string
  /** The poster, so the list of downloads can show it. */
  logo?: string
  kind: 'movie' | 'series'
  status: 'active' | 'done' | 'error'
  /** 0 to 100. */
  progress: number
  /** Bytes, when C# says so. */
  received?: number
  total?: number
  path?: string
  size?: number
  error?: string
  startedAt: number
  finishedAt?: number
  /** A finished or failed download stays in the corner notice until this time. */
  noticeUntil?: number
}

interface Snapshot {
  /** Newest first. */
  items: DownloadItem[]
  /** What the corner notice shows right now: every running download, and finished or failed ones for a few seconds. */
  tray: DownloadItem[]
}

const KEY = 'iptv-player:downloads:v1'
export const DONE_NOTICE_MS = 4000
export const ERROR_NOTICE_MS = 9000

const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined)
const text = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined)

/** Only finished downloads are kept between runs; a download in progress ends with the app. */
function load(): DownloadItem[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    const out: DownloadItem[] = []
    for (const r of raw as unknown[]) {
      if (!isRec(r)) continue
      const title = text(r.title)
      const path = text(r.path)
      if (!title || !path) continue
      out.push({
        title,
        url: text(r.url) ?? '',
        logo: text(r.logo),
        kind: r.kind === 'series' ? 'series' : 'movie',
        status: 'done',
        progress: 100,
        path,
        size: num(r.size),
        startedAt: num(r.startedAt) ?? 0,
        finishedAt: num(r.finishedAt),
      })
    }
    return out.slice(0, 500)
  } catch {
    return []
  }
}

let items: DownloadItem[] = load()
let snapshot: Snapshot = { items, tray: [] }
const listeners = new Set<() => void>()

function save(): void {
  try {
    const done = items.filter((i) => i.status === 'done').map(({ title, url, logo, kind, path, size, startedAt, finishedAt }) => ({ title, url, logo, kind, path, size, startedAt, finishedAt }))
    localStorage.setItem(KEY, JSON.stringify(done))
  } catch {
    // Storage unavailable; the list just won't be kept.
  }
}

function commit(next: DownloadItem[], persist: boolean): void {
  items = next
  const now = Date.now()
  snapshot = { items, tray: items.filter((i) => i.status === 'active' || (i.noticeUntil !== undefined && i.noticeUntil > now)) }
  if (persist) save()
  listeners.forEach((l) => l())
}

/** Changes one download by title (adds it if it is not there). */
function upsert(title: string, change: (prev: DownloadItem | undefined) => DownloadItem, persist = false): void {
  const prev = items.find((i) => i.title === title)
  const next = change(prev)
  commit(prev ? items.map((i) => (i.title === title ? next : i)) : [next, ...items], persist)
}

/** The corner notice for a finished or failed download goes away by itself. */
function expireNoticeLater(ms: number): void {
  window.setTimeout(() => commit(items, false), ms + 50)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
/** The current downloads without React (for the rest of the app and for tests). */
export const getDownloads = (): Snapshot => snapshot
export const useDownloads = (): Snapshot => useSyncExternalStore(subscribe, () => snapshot, () => snapshot)

/** One film or episode's download, or undefined when there is none. */
export function useDownload(title: string): DownloadItem | undefined {
  return useDownloads().items.find((i) => i.title === title)
}

/** Asks C# to download a film or an episode. Does nothing outside the C# app. */
export function requestDownload(channel: Channel): void {
  if (!IS_HOST) return
  const title = channel.name
  const running = items.find((i) => i.title === title && i.status === 'active')
  if (running) return
  upsert(title, () => ({ title, url: channel.url, logo: channel.logo, kind: kindOf(channel) === 'series' ? 'series' : 'movie', status: 'active', progress: 0, startedAt: Date.now() }))
  send({ cmd: 'download', url: channel.url, title })
}

export function cancelDownload(title: string): void {
  send({ cmd: 'cancelDownload', title })
  commit(items.filter((i) => !(i.title === title && i.status === 'active')), false)
}

/** Takes a download off the list. The file stays on the disk. */
export function removeDownload(title: string): void {
  commit(items.filter((i) => i.title !== title), true)
}

export function openDownloadFolder(path: string): void {
  send({ cmd: 'openFolder', path })
}

/** Applies one message from C#. Returns false for messages that are not about downloads. */
export function handleDownloadMessage(msg: Record<string, unknown>): boolean {
  const title = text(msg.title)
  if (!title) return false
  switch (msg.evt) {
    case 'downloadProgress': {
      const progress = Math.min(100, Math.max(0, num(msg.progress) ?? 0))
      upsert(title, (prev) => ({
        title,
        url: prev?.url ?? '',
        logo: prev?.logo,
        kind: prev?.kind ?? 'movie',
        startedAt: prev?.startedAt ?? Date.now(),
        status: 'active',
        progress,
        received: num(msg.received) ?? prev?.received,
        total: num(msg.total) ?? prev?.total,
      }))
      return true
    }
    case 'downloadComplete': {
      const path = text(msg.path)
      upsert(
        title,
        (prev) => ({
          title,
          url: prev?.url ?? '',
          logo: prev?.logo,
          kind: prev?.kind ?? 'movie',
          startedAt: prev?.startedAt ?? Date.now(),
          status: 'done',
          progress: 100,
          path,
          size: num(msg.size) ?? prev?.total,
          finishedAt: Date.now(),
          noticeUntil: Date.now() + DONE_NOTICE_MS,
        }),
        true,
      )
      expireNoticeLater(DONE_NOTICE_MS)
      return true
    }
    case 'downloadError': {
      upsert(title, (prev) => ({
        title,
        url: prev?.url ?? '',
        logo: prev?.logo,
        kind: prev?.kind ?? 'movie',
        startedAt: prev?.startedAt ?? Date.now(),
        status: 'error',
        progress: prev?.progress ?? 0,
        error: text(msg.error) ?? 'Bilinmeyen hata',
        finishedAt: Date.now(),
        noticeUntil: Date.now() + ERROR_NOTICE_MS,
      }))
      expireNoticeLater(ERROR_NOTICE_MS)
      return true
    }
    default:
      return false
  }
}

if (IS_HOST) onHostMessage((msg) => void handleDownloadMessage(msg))

/** "file:///C:/Users/Ad%20Soyad/Videos/x.mkv" from a Windows path, for playing a downloaded file. */
export function fileUrl(path: string): string {
  try {
    return new URL(`file:///${path.replace(/\\/g, '/').replace(/^\/+/, '')}`).href
  } catch {
    return path
  }
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '—'
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`
  return `${(bytes / 1_048_576).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} MB`
}
