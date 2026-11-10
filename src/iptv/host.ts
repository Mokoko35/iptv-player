import { useSyncExternalStore } from 'react'

/**
 * The bridge to the C# (WPF) app that hosts this page in a WebView2 control.
 *
 * C# plays the video with LibVLC in a native view BEHIND this page, and this page is transparent so the video shows
 * through. The page keeps all the buttons and menus; it tells C# what to do with `window.chrome.webview.postMessage`
 * and hears back through `window.chrome.webview.addEventListener('message', ...)`. In a normal browser there is no
 * `window.chrome.webview`, and the page plays with its own HTML5 player instead.
 *
 * The messages are listed in docs/HOST-BRIDGE.md.
 */

export const PROTOCOL_VERSION = 1

interface WebViewApi {
  postMessage: (message: unknown) => void
  addEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
  removeEventListener: (type: 'message', listener: (event: { data: unknown }) => void) => void
}
const webview = (): WebViewApi | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { chrome?: { webview?: WebViewApi } }).chrome?.webview)

/** True inside the C# app. Decided once, when the page loads. */
export const IS_HOST: boolean = webview() !== undefined

/* ------------------------------------------------------------------ */
/* Page to C#                                                          */
/* ------------------------------------------------------------------ */

export interface HostSubtitleSource {
  url: string
  label?: string
  lang?: string
}

export type HostCommand =
  /** The page has loaded and is listening. C# answers with `hello`. */
  | { cmd: 'ready'; version: number }
  /** Start (or replace) what is playing. */
  | { cmd: 'play'; url: string; title: string; kind: 'live' | 'movie' | 'series'; autoplay: boolean; volume: number; muted: boolean; subtitles: HostSubtitleSource[] }
  | { cmd: 'stop' }
  /** Please send a `tracks` event now. The page asks a few times after `play`, because LibVLC finds the tracks a moment after it starts playing. */
  | { cmd: 'tracks' }
  | { cmd: 'pause' }
  | { cmd: 'resume' }
  /** Jump to a position, in seconds. */
  | { cmd: 'seek'; seconds: number }
  | { cmd: 'volume'; value: number }
  | { cmd: 'mute'; on: boolean }
  /** Pick an audio track by the id C# gave in `tracks`. */
  | { cmd: 'audioTrack'; id: number | string }
  /** Pick a subtitle track by id, or -1 to turn subtitles off. */
  | { cmd: 'subtitleTrack'; id: number | string }
  /** A subtitle file the user chose (.srt or .vtt), as text. */
  | { cmd: 'addSubtitle'; name: string; text: string }
  /** Where the video should be drawn, in CSS pixels of the page. `visible: false` hides the video. */
  | { cmd: 'layout'; x: number; y: number; width: number; height: number; dpr: number; visible: boolean; radius: number; layer: 'back' | 'front' }
  /** Make the window full screen (the video area then fills the page). */
  | { cmd: 'fullscreen'; on: boolean }

export function send(command: HostCommand): void {
  webview()?.postMessage(command)
}

/* ------------------------------------------------------------------ */
/* C# to page                                                          */
/* ------------------------------------------------------------------ */

export interface HostTrack {
  id: number | string
  label: string
  lang?: string
  selected: boolean
}

export interface HostState {
  /** C# has answered with `hello`. */
  connected: boolean
  /** `hello` said C# can draw the video above the page (layout `layer: 'front'`), which lets the small player float freely. */
  frontLayer: boolean
  paused: boolean
  buffering: boolean
  /** Seconds. */
  time: number
  /** Seconds; 0 while unknown or for a live channel. */
  duration: number
  volume: number
  muted: boolean
  fullscreen: boolean
  audio: HostTrack[]
  subtitles: HostTrack[]
  ended: boolean
  error: string | null
  /** Counts `activity` events: C# saw the mouse move over the video. Changes whenever it does. */
  activity: number
}

export const INITIAL_HOST_STATE: HostState = {
  connected: false,
  frontLayer: false,
  paused: true,
  buffering: false,
  time: 0,
  duration: 0,
  volume: 1,
  muted: false,
  fullscreen: false,
  audio: [],
  subtitles: [],
  ended: false,
  error: null,
  activity: 0,
}

type Rec = Record<string, unknown>
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)

function readTracks(v: unknown): HostTrack[] {
  if (!Array.isArray(v)) return []
  const out: HostTrack[] = []
  for (const item of v as unknown[]) {
    if (!isRec(item)) continue
    const id = typeof item.id === 'number' || typeof item.id === 'string' ? item.id : undefined
    if (id === undefined) continue
    out.push({
      id,
      label: typeof item.label === 'string' && item.label ? item.label : `İz ${out.length + 1}`,
      lang: typeof item.lang === 'string' ? item.lang : undefined,
      selected: item.selected === true,
    })
  }
  return out
}

/** Applies one message from C# to the state. Unknown or malformed messages change nothing. */
export function reduceHost(state: HostState, data: unknown): HostState {
  let msg: unknown = data
  if (typeof msg === 'string') {
    try {
      msg = JSON.parse(msg)
    } catch {
      return state
    }
  }
  if (!isRec(msg)) return state
  switch (msg.evt) {
    case 'hello':
      return { ...state, connected: true, frontLayer: bool(msg.frontLayer) ?? false }
    case 'state':
      return {
        ...state,
        paused: bool(msg.paused) ?? state.paused,
        buffering: bool(msg.buffering) ?? state.buffering,
        time: num(msg.time) ?? state.time,
        duration: num(msg.duration) ?? state.duration,
        volume: num(msg.volume) !== undefined ? Math.min(1, Math.max(0, num(msg.volume) ?? 1)) : state.volume,
        muted: bool(msg.muted) ?? state.muted,
        // Anything playing clears an old "ended" or error.
        ended: msg.paused === false ? false : state.ended,
        error: msg.paused === false || msg.buffering === false ? null : state.error,
      }
    case 'tracks':
      return { ...state, audio: readTracks(msg.audio), subtitles: readTracks(msg.subtitles) }
    case 'ended':
      return { ...state, ended: true, paused: true }
    case 'error':
      return { ...state, error: typeof msg.message === 'string' && msg.message ? msg.message : 'Oynatılamadı.', buffering: false }
    case 'fullscreen':
      return { ...state, fullscreen: bool(msg.on) ?? state.fullscreen }
    case 'activity':
      return { ...state, activity: state.activity + 1 }
    default:
      return state
  }
}

/* ------------------------------------------------------------------ */
/* A small store so every component sees the same state                */
/* ------------------------------------------------------------------ */

let current: HostState = INITIAL_HOST_STATE
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function set(next: HostState): void {
  if (next !== current) {
    const wasFull = current.fullscreen
    current = next
    // Full screen hides the rest of the page (see index.css), so mark the document while it lasts.
    if (IS_HOST && wasFull !== next.fullscreen) {
      if (next.fullscreen) document.documentElement.dataset.fullscreen = 'true'
      else delete document.documentElement.dataset.fullscreen
    }
    emit()
  }
}

/** Changes the page's own view of the state at once (volume, full screen), before C# confirms it. */
export function setLocal(patch: Partial<HostState>): void {
  set({ ...current, ...patch })
}

/** A new film or channel starts: forget the old tracks, position and error. */
export function resetPlayback(): void {
  set({ ...current, paused: false, buffering: true, time: 0, duration: 0, audio: [], subtitles: [], ended: false, error: null })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The state right now, for code that is not a component (cleanup functions). */
export const hostSnapshot = (): HostState => current

export const useHostState = (): HostState => useSyncExternalStore(subscribe, () => current, () => INITIAL_HOST_STATE)

let started = false
/** Call once when the page starts. Does nothing outside the C# app. */
export function startHost(): void {
  const wv = webview()
  if (!wv || started) return
  started = true
  document.documentElement.dataset.host = 'webview' // switches the page background to transparent (see index.css)
  wv.addEventListener('message', (event) => set(reduceHost(current, event.data)))
  send({ cmd: 'ready', version: PROTOCOL_VERSION })
}

/* ------------------------------------------------------------------ */
/* Full screen                                                         */
/* ------------------------------------------------------------------ */

/** In the C# app the window goes full screen (C# does it); in a browser the page uses the Fullscreen API. */
export function setHostFullscreen(on: boolean): void {
  setLocal({ fullscreen: on })
  send({ cmd: 'fullscreen', on })
}

/* ------------------------------------------------------------------ */
/* Where the video is                                                  */
/* ------------------------------------------------------------------ */

export interface VideoRect {
  x: number
  y: number
  width: number
  height: number
  /** 'front': draw the video above the page (the free small player). Default 'back': behind the page. */
  layer?: 'back' | 'front'
}

let rect: VideoRect | null = null
const rectListeners = new Set<() => void>()
/** The soft corner of the frame around the video, in CSS pixels. C# may round the video's corners by this much. */
const VIDEO_RADIUS = 6

/** Remembers the video area and tells C# where to draw the picture. Pass null when there is no video. */
export function setVideoRect(next: VideoRect | null): void {
  const same = rect === next || (rect && next && rect.x === next.x && rect.y === next.y && rect.width === next.width && rect.height === next.height && rect.layer === next.layer)
  if (same) return
  rect = next
  rectListeners.forEach((l) => l())
  if (next) send({ cmd: 'layout', x: next.x, y: next.y, width: next.width, height: next.height, dpr: window.devicePixelRatio || 1, visible: true, radius: VIDEO_RADIUS, layer: next.layer ?? 'back' })
  else send({ cmd: 'layout', x: 0, y: 0, width: 0, height: 0, dpr: window.devicePixelRatio || 1, visible: false, radius: 0, layer: 'back' })
}

const subscribeRect = (l: () => void) => {
  rectListeners.add(l)
  return () => rectListeners.delete(l)
}
export const useVideoRect = (): VideoRect | null => useSyncExternalStore(subscribeRect, () => rect, () => null)
