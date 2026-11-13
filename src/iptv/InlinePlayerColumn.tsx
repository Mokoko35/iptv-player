import { Tv } from 'lucide-react'
import { IS_HOST } from './host'
import { NowPlayingInfo } from './NowPlayingInfo'
import { useMedia } from './useMedia'
import { t } from './i18n'

/**
 * The fourth column: a fixed box for the player, and the title and program guide under it.
 * The player itself is drawn over the box by PlayerOverlay, so it keeps playing when you move to another page.
 */
export function InlinePlayerColumn() {
  const { current, setInlineSlot } = useMedia()
  return (
    <section aria-label={t('Oynatıcı')} className="hidden min-w-0 flex-1 flex-col lg:flex lg:h-dvh">
      <div className="shrink-0 p-5 pb-0">
        {/* In the C# app the video shows through this box, so it must be empty and see-through while something plays. */}
        <div ref={setInlineSlot} className={`grid aspect-video w-full place-items-center rounded-2xl border border-dashed p-6 text-center ${IS_HOST && current ? 'border-transparent' : 'border-white/15 bg-black/40'}`}>
          {!(IS_HOST && current) && (
            <div>
              <Tv className="mx-auto text-[var(--subtle)]" size={34} aria-hidden="true" />
              <p className="mt-3 text-sm text-[var(--subtle)]">{t('İzlemek için soldaki listeden bir kanal seç.')}</p>
            </div>
          )}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{current && <NowPlayingInfo channel={current} windowed={false} />}</div>
    </section>
  )
}
