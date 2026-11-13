import { DownloadButton } from './DownloadButton'
import { Heart, Minimize2, Power, SkipBack, SkipForward } from 'lucide-react'
import { EpgTimeline } from './EpgTimeline'
import { KIND_BADGE, groupOf, kindOf } from './kinds'
import type { Channel } from './types'
import { useMedia } from './useMedia'
import { t, tr } from './i18n'

const DESCRIPTION = {
  movie: tr('Film ayrıntıları için kartına tıklayıp özet, oyuncu ve puan bilgisine bakabilirsin.'),
  series: tr('Dizi ayrıntıları için kartına tıklayıp sezon ve bölümleri görebilirsin.'),
} as const

/** Title, actions and the program guide for whatever is playing. Used under the player window and in the Live TV page. */
export function NowPlayingInfo({ channel, windowed }: { channel: Channel; windowed: boolean }) {
  const { isFavorite, toggleFavorite, lists, epg, channelNav, minimizePlayer, stopPlayer } = useMedia()
  const kind = kindOf(channel)
  const fav = isFavorite(channel)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{KIND_BADGE[kind]}</span>
        <span className="truncate text-xs text-[var(--subtle)]">
          {groupOf(channel)}
          {lists.active ? ` · ${lists.active.name}` : ''}
        </span>
      </div>
      <h2 className="display mt-2 text-balance text-2xl font-semibold sm:text-3xl">{channel.name}</h2>
      {channel.subtitle && <p className="mt-1 text-sm font-medium text-accent">{channel.subtitle}</p>}
      {kind === 'live' ? (
        <EpgTimeline channel={channel} epg={epg} />
      ) : (
        <p className="mt-1.5 line-clamp-3 max-w-3xl text-pretty text-sm text-[var(--subtle)]">{channel.description ?? t(DESCRIPTION[kind])}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {channelNav && (
          <>
            <button type="button" onClick={() => channelNav.step(-1)} className="btn-ghost">
              <SkipBack size={16} aria-hidden="true" />{' '}{t('Önceki kanal')}</button>
            <button type="button" onClick={() => channelNav.step(1)} className="btn-ghost">{t('Sonraki kanal')}{' '}<SkipForward size={16} aria-hidden="true" />
            </button>
          </>
        )}
        {kind !== 'live' && <DownloadButton channel={channel} />}
        <button type="button" onClick={() => toggleFavorite(channel)} aria-pressed={fav} className={`btn-ghost ${fav ? '!border-accent !text-accent' : ''}`}>
          <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
          {fav ? t('Favorilerde') : t('Favorilere ekle')}
        </button>
        {windowed && (
          <button type="button" onClick={minimizePlayer} className="btn-ghost">
            <Minimize2 size={16} aria-hidden="true" />{' '}{t('Küçült')}</button>
        )}
        <button type="button" onClick={stopPlayer} className="btn-ghost hover:!text-danger">
          <Power size={16} aria-hidden="true" />{' '}{t('Yayını kapat')}</button>
      </div>
    </div>
  )
}
