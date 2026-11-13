import { Heart } from 'lucide-react'
import { Artwork } from './Cards'
import { clock } from './epgFormat'
import { groupOf } from './kinds'
import type { Channel } from './types'
import type { NowNext } from './xmltv'
import { t } from './i18n'

interface ItemProps {
  channel: Channel
  active: boolean
  favorite: boolean
  showLogo: boolean
  onPlay: (channel: Channel) => void
  onFavorite: (channel: Channel) => void
}

function Heart_({ favorite, name, onClick }: { favorite: boolean; name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorite}
      aria-label={favorite ? t('{name} favorilerden çıkar', { name }) : t('{name} favorilere ekle', { name })}
      className={`absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full transition hover:bg-white/10 ${favorite ? 'text-accent' : 'text-[var(--subtle)] hover:text-[var(--ink)]'}`}
    >
      <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  )
}

/** One live channel in the channel column: logo, name, and the program on now. */
export function ChannelListItem({ channel, active, favorite, showLogo, onPlay, onFavorite, epg }: ItemProps & { epg?: NowNext | null }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onPlay(channel)}
        aria-current={active || undefined}
        aria-label={t('{name} kanalını oynat', { name: channel.name })}
        className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 pr-12 text-start transition ${active ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-white/5'}`}
      >
        <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg">
          <Artwork channel={channel} showLogo={showLogo} fit="contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${active ? 'text-accent' : 'text-[var(--ink)]'}`}>{channel.name}</span>
          {epg?.now ? (
            <>
              <span className="mt-0.5 block truncate text-xs text-[var(--subtle)]">
                <span className="tabular-nums text-[var(--ink-2)]">{clock(epg.now.start)}</span> {epg.now.title}
              </span>
              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(epg.progress * 100)}%` }} />
              </span>
            </>
          ) : (
            <span className="mt-0.5 block truncate text-xs text-[var(--subtle)]">{groupOf(channel)}</span>
          )}
        </span>
      </button>
      <Heart_ favorite={favorite} name={channel.name} onClick={() => onFavorite(channel)} />
    </div>
  )
}

/** A film or series in the favorites list: small poster, title and where it comes from. */
export function TitleListItem({ channel, active, favorite, showLogo, onPlay, onFavorite }: ItemProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onPlay(channel)}
        aria-current={active || undefined}
        aria-label={t('{name} ayrıntılarını aç', { name: channel.name })}
        className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 pr-12 text-start transition ${active ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-white/5'}`}
      >
        <span className="relative block h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-lg">
          <Artwork channel={channel} showLogo={showLogo} fit="cover" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm font-medium ${active ? 'text-accent' : 'text-[var(--ink)]'}`}>{channel.name}</span>
          <span className="mt-0.5 block truncate text-xs text-[var(--subtle)]">
            {channel.rating !== undefined && <span className="me-2 font-semibold text-accent">★ {channel.rating.toFixed(1)}</span>}
            {groupOf(channel)}
          </span>
        </span>
      </button>
      <Heart_ favorite={favorite} name={channel.name} onClick={() => onFavorite(channel)} />
    </div>
  )
}
