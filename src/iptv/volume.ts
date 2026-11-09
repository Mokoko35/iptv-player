const KEY = 'iptv-player:volume:v1'

/** The volume the user left, so every film and channel starts at it. */
export function loadVolume(): { volume: number; muted: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { volume?: unknown; muted?: unknown } | null
    const volume = typeof raw?.volume === 'number' && raw.volume >= 0 && raw.volume <= 1 ? raw.volume : 1
    return { volume, muted: raw?.muted === true }
  } catch {
    return { volume: 1, muted: false }
  }
}

export function saveVolume(volume: number, muted: boolean): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ volume, muted }))
  } catch {
    // ignore
  }
}
