import type { XtreamLogin } from './types'

/** Normalizes "host:port", "http://host:port/" or a full player_api URL to a base address. */
export function normalizeServer(input: string): string {
  let s = input.trim()
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`
  try {
    const u = new URL(s)
    return `${u.protocol}//${u.host}`
  } catch {
    return s.replace(/\/+$/, '')
  }
}

/** The M3U address an Xtream-style portal serves for a username and password. */
export function xtreamPlaylistUrl({ server, username, password }: XtreamLogin): string {
  const q = new URLSearchParams({ username: username.trim(), password: password.trim(), type: 'm3u_plus', output: 'm3u8' })
  return `${normalizeServer(server)}/get.php?${q.toString()}`
}
