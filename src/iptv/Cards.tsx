import { useState } from 'react'
import { Heart, Play, Star } from 'lucide-react'
import { hashId } from './m3u'
import { groupOf } from './kinds'
import type { Channel } from './types'
import { clock } from './epgFormat'
import type { NowNext } from './xmltv'
import { t } from './i18n'

interface CardProps {
  channel: Channel
  active: boolean
  favorite: boolean
  showLogo: boolean
  onPlay: (channel: Channel) => void
  onFavorite: (channel: Channel) => void
  /** Fixed width, for horizontal rows. */
  className?: string
  /** What is on now and next, for live channels. */
  epg?: NowNext | null
}

const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('tr'))
    .join('') || '?'

/** A stable color per title, so placeholder posters differ from each other. */
function hueOf(name: string): number {
  return parseInt(hashId(name).slice(0, 4), 36) % 360
}

function FavoriteButton({ favorite, name, onClick, row = false }: { favorite: boolean; name: string; onClick: () => void; row?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorite}
      aria-label={favorite ? t('{name} favorilerden çıkar', { name }) : t('{name} favorilere ekle', { name })}
      className={`absolute grid h-9 w-9 place-items-center rounded-full bg-black/70 ${row ? 'right-3 top-3 sm:top-1/2 sm:-translate-y-1/2' : 'right-2 top-2'} ${
        favorite ? 'text-accent' : `text-white/80 hover:text-white ${row ? '' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100'}`
      }`}
    >
      <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
    </button>
  )
}

export function Artwork({ channel, showLogo, fit }: { channel: Channel; showLogo: boolean; fit: 'contain' | 'cover' }) {
  const [failed, setFailed] = useState(false)
  const hue = hueOf(channel.name)
  const src = showLogo && !failed ? channel.logo : undefined
  return (
    <div className="absolute inset-0 grid place-items-center" style={{ background: `linear-gradient(145deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 40% 10%))` }}>
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className={fit === 'cover' ? 'h-full w-full object-cover' : 'h-3/5 w-3/5 object-contain drop-shadow-lg'}
        />
      ) : (
        <span className="display text-4xl font-semibold text-white/70">{initials(channel.name)}</span>
      )}
    </div>
  )
}

/** Live TV card: wide tile with the channel logo. */
export function ChannelCard({ channel, active, favorite, showLogo, onPlay, onFavorite, className = '', epg }: CardProps) {
  return (
    <article className={`group relative hover:z-10 ${className}`}>
      <button
        type="button"
        onClick={() => onPlay(channel)}
        aria-label={t('{name} kanalını oynat', { name: channel.name })}
        aria-current={active || undefined}
        className={`relative block w-full overflow-hidden rounded-2xl border bg-white/[0.04] text-start transition-[transform,box-shadow,border-color] duration-200 hover:z-10 hover:scale-[1.03] hover:border-white/25 hover:shadow-xl ${
          active ? 'border-accent ring-2 ring-accent/40' : 'border-white/10'
        }`}
      >
        <span className="relative block aspect-video overflow-hidden">
          <Artwork channel={channel} showLogo={showLogo} fit="contain" />
          <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-[var(--accent-ink)]">
              <Play size={20} fill="currentColor" aria-hidden="true" />
            </span>
          </span>
          {active && <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{t('İZLENİYOR')}</span>}
        </span>
        <span className="block p-3">
          <span className="block truncate text-sm font-medium text-[var(--ink-2)]">{channel.name}</span>
          {epg?.now || epg?.next ? (
            <>
              {epg.now && (
                <>
                  <span className="mt-1 block truncate text-xs text-[var(--ink-2)]">
                    <span className="font-semibold text-accent">{t('Şimdi')}</span> {clock(epg.now.start)} {epg.now.title}
                  </span>
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(epg.progress * 100)}%` }} />
                  </span>
                </>
              )}
              {epg.next && (
                <span className="mt-1 block truncate text-[11px] text-[var(--subtle)]">
                  <span className="font-semibold">{t('Sonra')}</span> {clock(epg.next.start)} {epg.next.title}
                </span>
              )}
            </>
          ) : (
            <span className="block truncate text-xs text-[var(--subtle)]">{groupOf(channel)}</span>
          )}
        </span>
      </button>
      <FavoriteButton favorite={favorite} name={channel.name} onClick={() => onFavorite(channel)} />
    </article>
  )
}

/** Movie and series card: tall poster. Uses the list's logo as the poster when there is one, otherwise a placeholder. */
export function PosterCard({ channel, active, favorite, showLogo, onPlay, onFavorite, className = '' }: CardProps) {
  return (
    <article className={`group relative hover:z-10 ${className}`}>
      <button
        type="button"
        onClick={() => onPlay(channel)}
        aria-label={t('{name} ayrıntılarını aç', { name: channel.name })}
        aria-current={active || undefined}
        className="block w-full text-start"
      >
        <span
          className={`relative block aspect-[2/3] overflow-hidden rounded-2xl border transition-[transform,box-shadow,border-color] duration-200 group-hover:scale-[1.04] group-hover:border-white/25 group-hover:shadow-xl ${
            active ? 'border-accent ring-2 ring-accent/40' : 'border-white/10'
          }`}
        >
          <Artwork channel={channel} showLogo={showLogo} fit="cover" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
          <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-[var(--accent-ink)]">
              <Play size={22} fill="currentColor" aria-hidden="true" />
            </span>
          </span>
          {active && <span className="absolute bottom-2 left-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{t('İZLENİYOR')}</span>}
          {channel.rating !== undefined && !active && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-300">
              <Star size={11} fill="currentColor" aria-hidden="true" /> {channel.rating.toFixed(1)}
            </span>
          )}
        </span>
        <span className="mt-2 block truncate text-sm font-medium text-[var(--ink-2)]">{channel.name}</span>
        <span className="block truncate text-xs text-[var(--subtle)]">{groupOf(channel)}</span>
      </button>
      <FavoriteButton favorite={favorite} name={channel.name} onClick={() => onFavorite(channel)} />
    </article>
  )
}

/** Poster image with the same colored placeholder the cards use. Pass `key={src}` so a new image gets a fresh try. */
export function PosterArt({ name, src, className = '' }: { name: string; src?: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const hue = hueOf(name)
  return (
    <div className={`relative grid place-items-center overflow-hidden ${className}`} style={{ background: `linear-gradient(145deg, hsl(${hue} 45% 22%), hsl(${(hue + 40) % 360} 40% 10%))` }}>
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="display text-4xl font-semibold text-white/70">{initials(name)}</span>
      )}
    </div>
  )
}
