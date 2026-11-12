import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cacheGet, cachePut } from './db'
import type { Prefs } from './prefs'
import type { Channel, XtreamLogin } from './types'
import { type EpgData, type NowNext, epgErrorText, fetchEpg, nowNextOf, programmesFor, xmltvUrl } from './xmltv'

export type EpgStatus = 'none' | 'loading' | 'ready' | 'error'

export interface Epg {
  status: EpgStatus
  error: string | null
  /** The address being used: the one from Settings, or the portal's xmltv.php. */
  url: string
  fetchedAt: number | null
  /** How many guide channels have programmes. */
  channelCount: number
  /** Bytes read so far while the guide downloads. */
  bytes: number
  refresh: () => void
  /** What is on now and next for a channel; null when the guide has nothing for it. */
  nowNext: (channel: Channel) => NowNext | null
}

interface Result {
  key: string
  data: EpgData | null
  error: string | null
}

const HOUR = 3_600_000

/**
 * Program guide for the active list. Uses the cached guide straight away, and downloads a fresh one in the
 * background when the cache is older than the refresh interval in Settings.
 */
export function useEpg(login: XtreamLogin | null, playlistId: string | null, prefs: Pick<Prefs, 'epgUrl' | 'epgRefresh'>): Epg {
  const url = prefs.epgUrl.trim() || (login ? xmltvUrl(login) : '')
  const key = playlistId && url ? `${playlistId}|${url}` : null
  const [result, setResult] = useState<Result | null>(null)
  const [fetching, setFetching] = useState<{ key: string; bytes: number } | null>(null)
  const [forced, setForced] = useState(0)
  const handled = useRef(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!key || !playlistId) return
    let cancelled = false
    const manual = forced !== handled.current // "Update now" was pressed since the last run
    handled.current = forced
    void (async () => {
      const cacheKey = `${playlistId}:epg`
      let cached: { savedAt: number; data: EpgData } | null = null
      try {
        const hit = await cacheGet<{ url: string; data: EpgData }>(cacheKey)
        if (hit && hit.value.url === url) cached = { savedAt: hit.savedAt, data: hit.value.data }
      } catch {
        // No cache; download instead.
      }
      if (cancelled) return
      if (cached) setResult({ key, data: cached.data, error: null })

      const hours = prefs.epgRefresh === 'off' ? Infinity : Number(prefs.epgRefresh)
      const stale = manual || (cached ? Date.now() - cached.savedAt > hours * HOUR : prefs.epgRefresh !== 'off')
      if (!stale) {
        if (!cached) setResult({ key, data: null, error: null })
        return
      }

      setFetching({ key, bytes: 0 })
      try {
        const data = await fetchEpg(url, (bytes) => !cancelled && setFetching({ key, bytes }))
        void cachePut(cacheKey, { url, data }).catch(() => undefined)
        if (!cancelled) setResult({ key, data, error: null })
      } catch (e) {
        if (!cancelled) setResult({ key, data: cached?.data ?? null, error: epgErrorText(e) })
      } finally {
        if (!cancelled) setFetching(null)
      }
    })()
    return () => {
      cancelled = true
    }
    // `url` is part of `key`; prefs.epgRefresh only matters when the guide is (re)checked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, forced])

  const mine = result?.key === key ? result : null
  const data = mine?.data ?? null
  const loading = fetching?.key === key || (key !== null && mine === null)

  const nowNext = useCallback(
    (channel: Channel): NowNext | null => (data ? nowNextOf(programmesFor(data, channel), now) : null),
    [data, now],
  )

  const status: EpgStatus = !key ? 'none' : loading ? 'loading' : data ? 'ready' : mine?.error ? 'error' : 'none'

  return useMemo(
    () => ({
      status,
      error: mine?.error ?? null,
      url,
      fetchedAt: data?.fetchedAt ?? null,
      channelCount: data ? Object.keys(data.programmes).length : 0,
      bytes: fetching?.key === key ? fetching.bytes : 0,
      refresh: () => setForced((n) => n + 1),
      nowNext,
    }),
    [status, mine?.error, url, data, fetching, key, nowNext],
  )
}
