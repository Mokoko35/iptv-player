/** Placeholder cards with a shimmer, shown while lists and catalogs load. */
export function SkeletonGrid({ poster, count = 18, className }: { poster: boolean; count?: number; className: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          <div className={`skeleton rounded-2xl border border-white/5 ${poster ? 'aspect-[2/3]' : 'aspect-video'}`} />
          <div className="skeleton mt-2 h-3 w-3/4 rounded" />
          <div className="skeleton mt-1.5 h-2.5 w-1/2 rounded" />
        </div>
      ))}
    </div>
  )
}

/** Placeholder rows for the channel column while the list loads. */
export function SkeletonRows({ count = 12 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2.5 py-2">
          <div className="skeleton h-12 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton mt-2 h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
