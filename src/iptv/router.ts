import { useCallback, useEffect, useState } from 'react'

/** Hash routing, so it also works when the app is opened from a file (or from any WebView2 host name). */
export type Page = 'home' | 'live' | 'movies' | 'series' | 'favorites' | 'settings'
export type SettingsTab = 'general' | 'playback' | 'epg' | 'categories' | 'themes'

export const PAGES: Page[] = ['home', 'live', 'movies', 'series', 'favorites', 'settings']
export const SETTINGS_TABS: SettingsTab[] = ['general', 'playback', 'epg', 'categories', 'themes']

export interface Route {
  page: Page
  tab: SettingsTab
}

export function parseHash(hash: string): Route {
  const [, first, second] = hash.replace(/^#/, '').split('/')
  const page = PAGES.find((p) => p === first) ?? 'home'
  const tab = SETTINGS_TABS.find((t) => t === second) ?? 'general'
  return { page, tab }
}

export const hrefFor = (page: Page, tab?: SettingsTab): string =>
  page === 'settings' && tab && tab !== 'general' ? `#/settings/${tab}` : `#/${page}`

export function useRoute(): Route & { go: (page: Page, tab?: SettingsTab) => void } {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const go = useCallback((page: Page, tab?: SettingsTab) => {
    window.location.hash = hrefFor(page, tab)
  }, [])

  return { ...route, go }
}
