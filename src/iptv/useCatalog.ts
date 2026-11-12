import { useEffect, useMemo, useState } from 'react'
import { loadErrorText } from './load'
import { sanitizeChannel } from './sanitize'
import type { Channel, XtreamLogin } from './types'
import { type VodArt, getSeriesCatalog, getVodArt } from './xtreamApi'

export interface Catalog {
  /** Series from the portal's API. Null until loaded, or when the portal could not be reached. */
  series: Channel[] | null
  /** Posters and ratings by film id. */
  art: VodArt
  loading: boolean
  /** Why the series list could not be loaded, in Turkish. */
  error: string | null
}

interface Loaded {
  key: string
  series: Channel[] | null
  art: VodArt
  error: string | null
}

const NO_ART: VodArt = {}

/** Loads the series list and film posters from an Xtream portal once per list (cached for 12 hours). */
export function useCatalog(login: XtreamLogin | null, playlistId: string | null): Catalog {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const key = login && playlistId ? `${playlistId}|${login.server}|${login.username}` : null

  useEffect(() => {
    if (!login || !playlistId || !key) return
    let cancelled = false
    void (async () => {
      const [series, art] = await Promise.allSettled([getSeriesCatalog(login, playlistId), getVodArt(login, playlistId)])
      if (cancelled) return
      setLoaded({
        key,
        series: series.status === 'fulfilled' && series.value.length > 0 ? series.value.map(sanitizeChannel) : null,
        art: art.status === 'fulfilled' ? art.value : NO_ART,
        error: series.status === 'rejected' ? loadErrorText(series.reason) : null,
      })
    })()
    return () => {
      cancelled = true
    }
    // `login` is identified by `key`; its object identity changes on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return useMemo(() => {
    if (!key) return { series: null, art: NO_ART, loading: false, error: null }
    if (loaded?.key !== key) return { series: null, art: NO_ART, loading: true, error: null }
    return { series: loaded.series, art: loaded.art, loading: false, error: loaded.error }
  }, [key, loaded])
}
