const FAV_KEY = 'iptv-player:favorites:v1'

export type Favorites = Record<string, true>

export function loadFavorites(): Favorites {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(FAV_KEY) ?? '{}')
    return typeof data === 'object' && data !== null && !Array.isArray(data) ? (data as Favorites) : {}
  } catch {
    return {}
  }
}

export function saveFavorites(fav: Favorites): void {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(fav))
  } catch {
    // Storage unavailable; favorites just won't persist.
  }
}

export const favKey = (playlistId: string, channelId: string): string => `${playlistId}:${channelId}`

const ACTIVE_KEY = 'iptv-player:active-playlist:v1'

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function saveActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {
    // ignore
  }
}
