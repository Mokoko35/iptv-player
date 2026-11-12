import { type ReactNode, useEffect, useRef, useState } from 'react'

interface Props<T> {
  items: T[]
  className: string
  render: (item: T) => ReactNode
  getKey: (item: T) => string
  step?: number
}

/** Renders a long list in batches as you scroll, so thousands of cards stay fast. Change the parent's `key` to start over. */
export function ProgressiveGrid<T>({ items, className, render, getKey, step = 48 }: Props<T>) {
  const [count, setCount] = useState(step)
  const sentinel = useRef<HTMLDivElement>(null)
  const more = count < items.length

  useEffect(() => {
    const node = sentinel.current
    if (!node || !more) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setCount((c) => c + step)
      },
      { rootMargin: '600px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [more, count, step])

  return (
    <>
      <div className={className}>
        {items.slice(0, count).map((item) => (
          <div key={getKey(item)}>{render(item)}</div>
        ))}
      </div>
      {more && <div ref={sentinel} className="h-10" aria-hidden="true" />}
    </>
  )
}
