import { useCallback, useEffect, useState } from 'react'
import { deletePlaylist, getChannels, listPlaylists, savePlaylist } from './db'
import { EMPTY_PROGRESS, type LoadProgress, channelsFromText, channelsFromUrl, loadErrorText } from './load'
import { kindOf } from './kinds'
import { hashId } from './m3u'
import { loadActiveId, saveActiveId } from './storage'
import type { Channel, PlaylistMeta, XtreamLogin } from './types'
import { xtreamPlaylistUrl } from './xtream'
import { t } from './i18n'

export type AddInput =
  | { kind: 'url'; name: string; url: string }
  | { kind: 'xtream'; name: string; login: XtreamLogin }
  | { kind: 'file' | 'text'; name: string; text: string }

export interface PlaylistsState {
  playlists: PlaylistMeta[]
  active: PlaylistMeta | null
  channels: Channel[]
  /** True while a list is being downloaded or read. */
  busy: boolean
  /** Live numbers for the list being loaded; null when nothing is loading. */
  progress: LoadProgress | null
  /** True until the saved lists have been read from the browser. */
  starting: boolean
  error: string | null
  select: (id: string) => void
  add: (input: AddInput) => Promise<boolean>
  refresh: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  clearError: () => void
}

function countKinds(list: Channel[]): Pick<LoadProgress, 'live' | 'movie' | 'series'> {
  const counts = { live: 0, movie: 0, series: 0 }
  for (const c of list) counts[kindOf(c)]++
  return counts
}

export function usePlaylists(): PlaylistsState {
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<LoadProgress | null>(null)
  const [starting, setStarting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const activate = useCallback(async (id: string) => {
    setActiveId(id)
    saveActiveId(id)
    setChannels(await getChannels(id))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await listPlaylists()
        if (cancelled) return
        setPlaylists(list)
        const saved = loadActiveId()
        const first = list.find((p) => p.id === saved) ?? list[0]
        if (first) {
          const ch = await getChannels(first.id)
          if (cancelled) return
          setActiveId(first.id)
          setChannels(ch)
        }
      } catch {
        if (!cancelled) setError(t('Kayıtlı listeler okunamadı. Tarayıcı depolaması kapalı olabilir.'))
      } finally {
        if (!cancelled) setStarting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const add = useCallback(
    async (input: AddInput): Promise<boolean> => {
      setBusy(true)
      setError(null)
      setProgress(EMPTY_PROGRESS)
      try {
        let list: Channel[]
        let sourceUrl: string | undefined
        let xtream: XtreamLogin | undefined
        if (input.kind === 'url') {
          sourceUrl = input.url.trim()
          list = await channelsFromUrl(sourceUrl, setProgress)
        } else if (input.kind === 'xtream') {
          xtream = input.login
          sourceUrl = xtreamPlaylistUrl(input.login)
          list = await channelsFromUrl(sourceUrl, setProgress)
        } else {
          setProgress({ ...EMPTY_PROGRESS, stage: 'reading', bytes: input.text.length })
          await new Promise<void>((resolve) => setTimeout(resolve, 0))
          list = channelsFromText(input.text)
        }
        const counts = countKinds(list)
        setProgress((p) => ({ ...EMPTY_PROGRESS, bytes: p?.bytes ?? 0, total: p?.total, ...counts, stage: 'saving' }))
        const meta: PlaylistMeta = {
          id: `${hashId(`${input.name}${Date.now()}`)}${Math.random().toString(36).slice(2, 6)}`,
          name: input.name.trim() || t('Yeni liste'),
          kind: input.kind,
          sourceUrl,
          xtream,
          channelCount: list.length,
          updatedAt: Date.now(),
        }
        await savePlaylist(meta, list)
        setPlaylists(await listPlaylists())
        await activate(meta.id)
        setProgress((p) => (p ? { ...p, stage: 'done' } : p))
        return true
      } catch (e) {
        setError(loadErrorText(e))
        setProgress(null)
        return false
      } finally {
        setBusy(false)
      }
    },
    [activate],
  )

  const refresh = useCallback(
    async (id: string) => {
      const meta = playlists.find((p) => p.id === id)
      if (!meta?.sourceUrl) {
        setError(t('Bu liste bir dosyadan eklendi. Güncellemek için dosyayı yeniden ekle.'))
        return
      }
      setBusy(true)
      setError(null)
      setProgress(EMPTY_PROGRESS)
      try {
        const list = await channelsFromUrl(meta.sourceUrl, setProgress)
        setProgress((p) => ({ ...EMPTY_PROGRESS, bytes: p?.bytes ?? 0, ...countKinds(list), stage: 'saving' }))
        await savePlaylist({ ...meta, channelCount: list.length, updatedAt: Date.now() }, list)
        setPlaylists(await listPlaylists())
        if (id === activeId) setChannels(list)
      } catch (e) {
        setError(loadErrorText(e))
      } finally {
        setProgress(null)
        setBusy(false)
      }
    },
    [playlists, activeId],
  )

  const remove = useCallback(
    async (id: string) => {
      await deletePlaylist(id)
      const list = await listPlaylists()
      setPlaylists(list)
      if (id === activeId) {
        const next = list[0]
        if (next) await activate(next.id)
        else {
          setActiveId(null)
          setChannels([])
        }
      }
    },
    [activeId, activate],
  )

  return {
    playlists,
    active: playlists.find((p) => p.id === activeId) ?? null,
    channels,
    busy,
    progress,
    starting,
    error,
    select: (id) => void activate(id),
    add,
    refresh,
    remove,
    clearError: () => setError(null),
  }
}
