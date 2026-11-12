/**
 * Where the user left off, and which episodes they marked as watched.
 *
 * Stored per playlist and per stream address, so the same title in two lists keeps its own place. Episodes are keyed by
 * their address (and films too), which is the one thing that stays the same between a detail window and the player.
 */

export interface WatchEntry {
  /** Seconds watched so far. */
  position: number
  /** Length in seconds, when the player has reported one. */
  duration?: number
  /** The user ticked "İzledim": the title starts from the beginning and asks nothing. */
  watched?: boolean
  /** When the entry was last touched, in milliseconds. */
  updatedAt: number
}

export type WatchStore = Record<string, WatchEntry>

const KEY = 'iptv-player:watch:v1'

export const watchKey = (playlistId: string, url: string): string => `${playlistId}:${url}`

function validEntry(value: unknown): value is WatchEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const entry = value as Record<string, unknown>
  return typeof entry.position === 'number' && Number.isFinite(entry.position) && entry.position >= 0
}

export function loadWatch(): WatchStore {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    const out: WatchStore = {}
    for (const [key, value] of Object.entries(data)) {
      if (!validEntry(value)) continue
      out[key] = {
        position: value.position,
        duration: typeof value.duration === 'number' && value.duration > 0 ? value.duration : undefined,
        watched: value.watched === true,
        updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
      }
    }
    return out
  } catch {
    return {}
  }
}

export function saveWatch(store: WatchStore): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // Storage unavailable; the place just won't persist.
  }
}

/**
 * Offers to continue only when there is a real way to go: far enough in to be past the opening, and not so close to the
 * end that the credits are all that is left. A title marked "İzledim" never asks.
 */
export function isResumable(entry: WatchEntry | undefined): entry is WatchEntry {
  if (!entry || entry.watched) return false
  if (!entry.duration || !Number.isFinite(entry.duration) || entry.duration <= 0) return false
  if (!Number.isFinite(entry.position)) return false
  const left = entry.duration - entry.position
  return entry.position >= 15 && left > Math.min(30, entry.duration * 0.05)
}
