/**
 * The 4-digit PIN for the adult content setting. It lives in local storage on this device, stored as a
 * salted SHA-256 hash rather than as the digits themselves. This keeps casual snooping out; it is not
 * strong protection (anyone with access to the device's browser data can reset it).
 */
const KEY = 'iptv-player:pin:v1'

export const isValidPin = (value: string): boolean => /^\d{4}$/.test(value)

interface Stored {
  salt: string
  hash: string
}

async function digest(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`)
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Very old environments without Web Crypto: a simple checksum is still better than plain digits.
  let h = 5381
  for (const byte of data) h = ((h << 5) + h + byte) | 0
  return `x${(h >>> 0).toString(16)}`
}

function read(): Stored | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (typeof raw === 'object' && raw !== null) {
      const r = raw as Record<string, unknown>
      if (typeof r.salt === 'string' && typeof r.hash === 'string') return { salt: r.salt, hash: r.hash }
    }
  } catch {
    // treated as "no PIN"
  }
  return null
}

export const hasPin = (): boolean => read() !== null

export async function setPin(pin: string): Promise<void> {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')
  localStorage.setItem(KEY, JSON.stringify({ salt, hash: await digest(pin, salt) } satisfies Stored))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = read()
  return stored !== null && (await digest(pin, stored.salt)) === stored.hash
}
