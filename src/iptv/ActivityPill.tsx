import { Loader2 } from 'lucide-react'
import { megabytes } from './epgFormat'
import { useMedia } from './useMedia'

/** A small pill at the top of the screen while something loads in the background. */
export function ActivityPill() {
  const { lists, adding, catalog, epg } = useMedia()
  const p = lists.progress

  let message: string | null = null
  if (lists.busy && !adding) {
    message = p ? `Liste yükleniyor · ${p.live.toLocaleString('tr-TR')} canlı, ${p.movie.toLocaleString('tr-TR')} film, ${p.series.toLocaleString('tr-TR')} dizi bölümü` : 'Liste yükleniyor...'
  } else if (catalog.loading) {
    message = 'Diziler ve posterler portaldan yükleniyor...'
  } else if (epg.status === 'loading') {
    message = epg.bytes > 0 ? `Program rehberi indiriliyor · ${megabytes(epg.bytes)}` : 'Program rehberi yükleniyor...'
  }

  if (!message) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-40 flex justify-center px-4" role="status" aria-live="polite">
      <div className="flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-elev/95 px-4 py-2 text-xs text-[var(--ink-2)] shadow-xl backdrop-blur">
        <Loader2 size={14} className="shrink-0 animate-spin text-accent" aria-hidden="true" />
        <span className="truncate tabular-nums">{message}</span>
      </div>
    </div>
  )
}
