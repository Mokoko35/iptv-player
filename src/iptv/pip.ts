import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

/**
 * The small player as a free window: it can be dragged anywhere, resized, and it remembers where it was.
 *
 * Its height follows its width (16:9 picture plus the title bar, the frame and the resize strip), so a box is only
 * x, y and width.
 */
export interface PipBox {
  x: number
  y: number
  w: number
}

const KEY = 'iptv-player:pip'
const MIN_W = 240
const MAX_W = 760
const EDGE = 8
/** Title bar (36) + resize strip (14) + the frame on both sides (10). */
const CHROME_H = 60
const STEP = 16

const heightOf = (w: number) => Math.round(((w - 10) * 9) / 16) + CHROME_H

export function clampBox(b: PipBox, vw: number, vh: number): PipBox {
  const w = Math.round(Math.min(Math.max(b.w, MIN_W), Math.max(MIN_W, Math.min(MAX_W, vw - EDGE * 2))))
  const h = heightOf(w)
  return {
    w,
    x: Math.round(Math.min(Math.max(b.x, EDGE), Math.max(EDGE, vw - w - EDGE))),
    y: Math.round(Math.min(Math.max(b.y, EDGE), Math.max(EDGE, vh - h - EDGE))),
  }
}

/** Bottom right corner, like the old docked player. */
export function defaultBox(vw: number, vh: number): PipBox {
  const w = vw >= 900 ? 360 : 280
  return clampBox({ w, x: vw - w - 24, y: vh - heightOf(w) - 24 }, vw, vh)
}

function load(): PipBox | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (typeof raw !== 'object' || raw === null) return null
    const { x, y, w } = raw as Record<string, unknown>
    return typeof x === 'number' && typeof y === 'number' && typeof w === 'number' && [x, y, w].every(Number.isFinite) ? { x, y, w } : null
  } catch {
    return null
  }
}

function save(b: PipBox): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b))
  } catch {
    // Not saving the place is not worth an error.
  }
}

type Drag = { kind: 'move' | 'size'; startX: number; startY: number; from: PipBox }

export interface PipHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
}

/**
 * State and handlers for the free small player.
 * `move` goes on the title bar, `size` on the resize strip. Both work with mouse, pen and touch. The title bar also takes the
 * arrow keys (move by 16 px; with Shift they resize), and a double click puts the window back in the corner.
 */
export function usePipBox(enabled: boolean) {
  const [box, setBox] = useState<PipBox>(() => clampBox(load() ?? defaultBox(window.innerWidth, window.innerHeight), window.innerWidth, window.innerHeight))
  const latest = useRef(box)
  const drag = useRef<Drag | null>(null)

  const update = useCallback((next: PipBox) => {
    latest.current = next
    setBox(next)
  }, [])

  // Keep it inside the window when the window changes size.
  useEffect(() => {
    if (!enabled) return
    const onResize = () => update(clampBox(latest.current, window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [enabled, update])

  const begin = (kind: Drag['kind']) => (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { kind, startX: e.clientX, startY: e.clientY, from: latest.current }
  }
  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const next = d.kind === 'move' ? { ...d.from, x: d.from.x + dx, y: d.from.y + dy } : { ...d.from, w: d.from.w + dx }
    update(clampBox(next, window.innerWidth, window.innerHeight))
  }
  const end = (e: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    save(latest.current)
  }
  const handlers = (kind: Drag['kind']): PipHandlers => ({ onPointerDown: begin(kind), onPointerMove: move, onPointerUp: end, onPointerCancel: end })

  const reset = () => {
    const next = defaultBox(window.innerWidth, window.innerHeight)
    update(next)
    save(next)
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!dir || e.target !== e.currentTarget) return
    e.preventDefault()
    const b = latest.current
    const next = e.shiftKey ? { ...b, w: b.w + dir[0] * STEP } : { ...b, x: b.x + dir[0] * STEP, y: b.y + dir[1] * STEP }
    const clamped = clampBox(next, window.innerWidth, window.innerHeight)
    update(clamped)
    save(clamped)
  }

  return { box, move: handlers('move'), size: handlers('size'), reset, onKeyDown, key: `${box.x},${box.y},${box.w}` }
}
