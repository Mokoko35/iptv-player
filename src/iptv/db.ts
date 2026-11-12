import { sanitizeChannel } from './sanitize'
import type { Channel, PlaylistMeta } from './types'

/** Playlists can hold tens of thousands of channels, which is too big for localStorage, so they live in IndexedDB. */
const DB_NAME = 'iptv-player'
const META = 'playlists'
const CHANNELS = 'channels'
const CACHE = 'cache'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(CHANNELS)) db.createObjectStore(CHANNELS)
      if (!db.objectStoreNames.contains(CACHE)) db.createObjectStore(CACHE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB açılamadı'))
  })
}

function run<T>(stores: string[], mode: IDBTransactionMode, work: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T | undefined> {
  return open().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(stores, mode)
        const req = work(tx)
        tx.oncomplete = () => {
          db.close()
          resolve(req ? req.result : undefined)
        }
        tx.onerror = () => {
          db.close()
          reject(tx.error ?? new Error('IndexedDB hatası'))
        }
        tx.onabort = tx.onerror
      }),
  )
}

export async function listPlaylists(): Promise<PlaylistMeta[]> {
  const all = (await run<PlaylistMeta[]>([META], 'readonly', (tx) => tx.objectStore(META).getAll())) ?? []
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function getChannels(playlistId: string): Promise<Channel[]> {
  const stored = (await run<Channel[]>([CHANNELS], 'readonly', (tx) => tx.objectStore(CHANNELS).get(playlistId))) ?? []
  // Lists saved by an older version may hold attributes in titles or a split category; repair them on the way out.
  return stored.map(sanitizeChannel)
}

export async function savePlaylist(meta: PlaylistMeta, channels: Channel[]): Promise<void> {
  await run([META, CHANNELS], 'readwrite', (tx) => {
    tx.objectStore(META).put(meta)
    tx.objectStore(CHANNELS).put(channels, meta.id)
  })
}

export interface CacheEntry<T> {
  savedAt: number
  value: T
}

export async function cacheGet<T>(key: string): Promise<CacheEntry<T> | undefined> {
  return run<CacheEntry<T>>([CACHE], 'readonly', (tx) => tx.objectStore(CACHE).get(key))
}

export async function cachePut<T>(key: string, value: T): Promise<void> {
  await run([CACHE], 'readwrite', (tx) => {
    tx.objectStore(CACHE).put({ savedAt: Date.now(), value } satisfies CacheEntry<T>, key)
  })
}

export async function cacheDeletePrefix(prefix: string): Promise<void> {
  await run([CACHE], 'readwrite', (tx) => {
    const store = tx.objectStore(CACHE)
    const req = store.openKeyCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`))
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor) {
        store.delete(cursor.primaryKey)
        cursor.continue()
      }
    }
  })
}

export async function deletePlaylist(id: string): Promise<void> {
  await run([META, CHANNELS], 'readwrite', (tx) => {
    tx.objectStore(META).delete(id)
    tx.objectStore(CHANNELS).delete(id)
  })
  await cacheDeletePrefix(`${id}:`).catch(() => undefined)
}
