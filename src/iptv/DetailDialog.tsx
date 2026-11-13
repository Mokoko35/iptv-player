import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Clapperboard, ExternalLink, Heart, Loader2, Play, Star, X } from 'lucide-react'
import { PosterArt } from './Cards'
import { DownloadButton } from './DownloadButton'
import { groupOf } from './kinds'
import { loadErrorText } from './load'
import type { Channel, XtreamLogin } from './types'
import { useMedia } from './useMedia'
import { findTmdb, mergeDetails } from './tmdb'
import { type Details, type Episode, type SeriesDetails, episodeChannel, getSeriesInfo, getVodInfo, vodIdOf } from './xtreamApi'
import { t } from './i18n'

type Status = 'loading' | 'ready' | 'error'

/* ------------------------------------------------------------------ */
/* Shared layout                                                       */
/* ------------------------------------------------------------------ */

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 text-sm">
      <dt className="text-[var(--subtle)]">{label}</dt>
      <dd className="text-pretty text-[var(--ink-2)]">{value}</dd>
    </div>
  )
}

interface HeaderProps {
  channel: Channel
  details?: Details
  status: Status
  /** Short fallback shown while the portal's text is not available. */
  fallbackText: string
  actions: ReactNode
  extraChips?: string[]
}

function Header({ channel, details, status, fallbackText, actions, extraChips = [] }: HeaderProps) {
  const poster = details?.poster ?? channel.logo
  const rating = details?.rating ?? channel.rating
  const chips = [details?.year, details?.duration, ...extraChips, ...(details?.genre ? details.genre.split(/[,/]/).map((g) => g.trim()).slice(0, 3) : [])].filter((c): c is string => Boolean(c))
  const plot = details?.plot ?? channel.description

  return (
    <div className="relative">
      {details?.backdrop && (
        <>
          <img src={details.backdrop} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-30" />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-elev via-elev/80 to-elev/30" />
        </>
      )}
      <div className="relative flex flex-col gap-5 p-5 pt-14 sm:flex-row sm:gap-7 sm:p-8 sm:pt-10">
        <PosterArt key={poster ?? 'none'} name={channel.name} src={poster} className="mx-auto aspect-[2/3] w-40 shrink-0 rounded-2xl border border-white/10 shadow-2xl sm:mx-0 sm:w-52" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[var(--subtle)]">{groupOf(channel)}</p>
          <h2 id="detail-title" className="display mt-1 text-balance text-3xl font-semibold sm:text-4xl">
            {channel.name}
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {rating !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-400/15 px-2 py-1 text-sm font-semibold tabular-nums text-amber-300">
                <Star size={13} fill="currentColor" aria-hidden="true" /> {rating.toFixed(1)}
              </span>
            )}
            {chips.map((c) => (
              <span key={c} className="rounded-md border border-white/15 px-2 py-1 text-xs text-[var(--muted)]">
                {c}
              </span>
            ))}
          </div>

          <p className="mt-4 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--ink-2)]">
            {plot ??
              (status === 'loading' ? (
                <span className="inline-flex items-center gap-2 text-[var(--subtle)]">
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />{' '}{t('Ayrıntılar yükleniyor...')}</span>
              ) : (
                <span className="text-[var(--subtle)]">{fallbackText}</span>
              ))}
          </p>

          <dl className="mt-4 max-w-2xl space-y-1.5">
            <Fact label={t('Oyuncular')} value={details?.cast} />
            <Fact label={t('Yönetmen')} value={details?.director} />
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
        </div>
      </div>
    </div>
  )
}

function FavoriteAction({ channel }: { channel: Channel }) {
  const { isFavorite, toggleFavorite } = useMedia()
  const fav = isFavorite(channel)
  return (
    <button type="button" onClick={() => toggleFavorite(channel)} aria-pressed={fav} className={`btn-ghost ${fav ? '!border-accent !text-accent' : ''}`}>
      <Heart size={16} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
      {fav ? t('Favorilerde') : t('Favorilere ekle')}
    </button>
  )
}

function TrailerAction({ url }: { url?: string }) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost">
      <Clapperboard size={16} aria-hidden="true" />{' '}{t('Fragman')}{' '}<ExternalLink size={12} aria-hidden="true" />
    </a>
  )
}

/** Fetches once when mounted. The parent re-keys this component per title, so no reset logic is needed. */
function useFetched<T>(load: (() => Promise<T>) | null): { data?: T; status: Status; error?: string } {
  const [state, setState] = useState<{ data?: T; status: Status; error?: string }>({ status: 'loading' })
  useEffect(() => {
    if (!load) return
    let off = false
    load().then(
      (data) => !off && setState({ data, status: 'ready' }),
      (e: unknown) => !off && setState({ status: 'error', error: loadErrorText(e) }),
    )
    return () => {
      off = true
    }
    // The loader is rebuilt on every render; the parent's key identifies the title.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return load ? state : { status: 'error' }
}

/* ------------------------------------------------------------------ */
/* Film                                                                */
/* ------------------------------------------------------------------ */

function MovieDetail({ channel, login, playlistId }: { channel: Channel; login: XtreamLogin | null; playlistId: string | undefined }) {
  const { play, closeDetail, prefs } = useMedia()
  const vodId = vodIdOf(channel.url)
  const tmdbKey = prefs.tmdbKey
  const portal = login && playlistId && vodId ? { login, playlistId, vodId } : null

  // The portal's details, then TMDB on top of them when a key is set. TMDB is asked with the cleaned title (and the portal's TMDB id when it has one).
  const { data: details, status, error } = useFetched<Details>(
    portal || tmdbKey
      ? async () => {
          let failure: unknown
          const base = portal ? await getVodInfo(portal.login, portal.playlistId, portal.vodId).catch((e: unknown) => ((failure = e), undefined)) : undefined
          const extra = tmdbKey ? await findTmdb(tmdbKey, 'movie', channel.name, base?.tmdbId).catch(() => null) : null
          if (!base && !extra) throw failure instanceof Error ? failure : new Error(t('Bu film için ayrıntı bulunamadı.'))
          return mergeDetails(base, extra)
        }
      : null,
  )

  const start = () => {
    // Opening a film or episode takes the whole screen, like Live TV does.
    play(
      {
        ...channel,
        logo: details?.poster ?? channel.logo,
        rating: details?.rating ?? channel.rating,
        description: details?.plot ?? channel.description,
        subtitle: [details?.year, details?.duration, details?.genre].filter(Boolean).join(' · ') || undefined,
        subtitleTracks: details?.subtitles,
      },
      { fullscreen: true },
    )
    closeDetail()
  }

  return (
    <Header
      channel={channel}
      details={details}
      status={status}
      fallbackText={error ?? t('Bu film için özet bulunamadı.')}
      actions={
        <>
          <button type="button" onClick={start} className="btn-primary" autoFocus>
            <Play size={16} fill="currentColor" aria-hidden="true" />{' '}{t('Oynat')}</button>
          <FavoriteAction channel={channel} />
          <DownloadButton channel={channel} />
          <TrailerAction url={details?.trailer} />
        </>
      }
    />
  )
}

/* ------------------------------------------------------------------ */
/* Series                                                              */
/* ------------------------------------------------------------------ */

interface EpisodeRowProps {
  ep: Episode
  /** The same item the player gets when the episode is played; the download uses its name and address. */
  download: Channel
  poster?: string
  playing: boolean
  /** The user ticked "İzledim": the row is dimmed and the place is ignored. */
  watched: boolean
  /** Where the player stopped last time, when there is something to show. */
  progress?: { position: number; duration: number }
  onPlay: () => void
  onToggleWatched: () => void
}

function EpisodeRow({ ep, download, poster, playing, watched, progress, onPlay, onToggleWatched }: EpisodeRowProps) {
  const percent = progress && progress.duration > 0 ? Math.min(100, Math.max(0, (progress.position / progress.duration) * 100)) : 0
  return (
    <li className={`flex items-stretch gap-2 rounded-2xl border p-2 transition ${playing ? 'border-accent bg-accent/10' : 'border-white/10'}`}>
      <button
        type="button"
        onClick={onPlay}
        aria-label={t('Sezon {season} bölüm {number}: {title} oynat', { season: ep.season, number: ep.number, title: ep.title })}
        className={`group flex min-w-0 flex-1 items-center gap-4 rounded-xl p-1 text-start transition hover:bg-white/5 ${watched ? 'opacity-50' : ''}`}
      >
        <span className="relative hidden h-16 w-28 shrink-0 sm:block">
          <PosterArt key={ep.image ?? poster ?? ep.id} name={`${ep.number}`} src={ep.image ?? poster} className="h-full w-full rounded-xl" />
          <span className="absolute inset-0 grid place-items-center rounded-xl bg-black/45 opacity-0 transition group-hover:opacity-100">
            <Play size={20} fill="white" className="text-white" aria-hidden="true" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="display text-lg font-semibold tabular-nums text-accent">{ep.number}</span>
            <span className="truncate text-sm font-medium text-[var(--ink-2)]">{ep.title}</span>
            {watched && <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white/70">{t('İZLENDİ')}</span>}
            {playing && <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{t('İZLENİYOR')}</span>}
          </span>
          {ep.plot && <span className="mt-1 line-clamp-2 block text-pretty text-xs text-[var(--subtle)]">{ep.plot}</span>}
          {!watched && percent > 0.5 && (
            <span className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-white/45">
              <span className="h-1 w-24 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </span>
              %{Math.round(percent)}{' '}{t('izlendi')}</span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1 text-xs tabular-nums text-[var(--subtle)]">
          {ep.duration}
          {ep.rating !== undefined && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Star size={11} fill="currentColor" aria-hidden="true" /> {ep.rating.toFixed(1)}
            </span>
          )}
        </span>
      </button>
      <DownloadButton channel={download} compact className="self-center" />
      <label
        className="flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 self-stretch rounded-xl px-2 text-[11px] text-[var(--subtle)] transition hover:bg-white/5 hover:text-[var(--ink-2)]"
        title={watched ? t('İzledim işaretini kaldır') : t('İzledim olarak işaretle')}
      >
        <input
          type="checkbox"
          checked={watched}
          onChange={onToggleWatched}
          aria-label={t('Sezon {season} bölüm {number} izlendi', { season: ep.season, number: ep.number })}
          className="h-4 w-4 cursor-pointer accent-accent"
        />
        <span>{t('İzledim')}</span>
      </label>
    </li>
  )
}

function SeriesDetailView({ channel, login, playlistId, seriesId }: { channel: Channel; login: XtreamLogin; playlistId: string; seriesId: string }) {
  const { play, closeDetail, current, watchOf, toggleWatched } = useMedia()
  const { prefs } = useMedia()
  const { data: base, status, error } = useFetched<SeriesDetails>(() => getSeriesInfo(login, playlistId, seriesId))
  const { data: extra } = useFetched<Details | null>(prefs.tmdbKey ? () => findTmdb(prefs.tmdbKey, 'tv', channel.name).catch(() => null) : null)
  const data = useMemo(() => (base ? mergeDetails(base, extra) : undefined), [base, extra])
  const [picked, setPicked] = useState<number | null>(null)

  const season = picked ?? data?.seasons[0]?.number ?? null
  const episodes = useMemo(() => (data && season !== null ? (data.episodes[season] ?? []) : []), [data, season])
  const total = data ? Object.values(data.episodes).reduce((n, g) => n + g.length, 0) : 0

  // One flat list over every season: "Sonraki bölüm" at the end of a season opens the first episode of the next one.
  const allEpisodes = useMemo(() => {
    if (!data) return []
    return Object.keys(data.episodes)
      .map(Number)
      .sort((a, b) => a - b)
      .flatMap((n) => data.episodes[n] ?? [])
  }, [data])

  // Episode info has no player item of its own, so it is built once for the whole series and shared by every row.
  const episodeChannels = useMemo(() => {
    if (!data) return []
    const series: Channel = { ...channel, description: data.plot ?? channel.description }
    return allEpisodes.map((ep) => episodeChannel(series, ep, data.poster ?? channel.logo))
  }, [data, allEpisodes, channel])

  const channelFor = useMemo(() => new Map(episodeChannels.map((c) => [c.url, c])), [episodeChannels])

  const playEpisode = (ep: Episode) => {
    const target = channelFor.get(ep.url)
    if (!target) return
    play(target, { fullscreen: true, episodes: episodeChannels })
    closeDetail()
  }

  const first = episodes[0]
  const chips = data ? [`${data.seasons.length} sezon`, t('{total} bölüm', { total })] : []

  return (
    <>
      <Header
        channel={channel}
        details={data}
        status={status}
        extraChips={chips}
        fallbackText={error ?? t('Bu dizi için özet bulunamadı.')}
        actions={
          <>
            <button type="button" onClick={() => first && playEpisode(first)} disabled={!first} className="btn-primary" autoFocus>
              <Play size={16} fill="currentColor" aria-hidden="true" /> {first ? t('Sezon {season} Bölüm {number} oynat', { season: first.season, number: first.number }) : t('Oynat')}
            </button>
            <FavoriteAction channel={channel} />
            <TrailerAction url={data?.trailer} />
          </>
        }
      />

      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        {status === 'loading' && <p className="py-6 text-center text-sm text-[var(--subtle)]">{t('Bölümler yükleniyor...')}</p>}
        {status === 'error' && <p className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-[var(--subtle)]">{t('Bölüm listesi alınamadı.')}{' '}{error}</p>}
        {data && data.seasons.length === 0 && <p className="py-6 text-center text-sm text-[var(--subtle)]">{t('Bu dizi için bölüm bulunamadı.')}</p>}
        {data && data.seasons.length > 0 && (
          <>
            <div role="tablist" aria-label={t('Sezonlar')} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
              {data.seasons.map((s) => (
                <button
                  key={s.number}
                  type="button"
                  role="tab"
                  aria-selected={season === s.number}
                  onClick={() => setPicked(s.number)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm transition ${
                    season === s.number ? 'border-accent bg-accent/15 font-semibold text-accent' : 'border-white/10 text-[var(--subtle)] hover:text-[var(--ink)]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <ul className="space-y-2" aria-label={t('Bölümler')}>
              {episodes.map((ep) => {
                const entry = watchOf(ep.url)
                return (
                  <EpisodeRow
                    key={ep.id}
                    ep={ep}
                    download={channelFor.get(ep.url) ?? episodeChannel({ ...channel, description: data.plot ?? channel.description }, ep, data.poster ?? channel.logo)}
                    poster={data.poster ?? channel.logo}
                    playing={current?.url === ep.url}
                    watched={entry?.watched === true}
                    progress={entry && entry.duration ? { position: entry.position, duration: entry.duration } : undefined}
                    onPlay={() => playEpisode(ep)}
                    onToggleWatched={() => toggleWatched(ep.url)}
                  />
                )
              })}
            </ul>
          </>
        )}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Window                                                              */
/* ------------------------------------------------------------------ */

function Sheet({ channel }: { channel: Channel }) {
  const { closeDetail, xtream, lists } = useMedia()
  const playlistId = lists.active?.id

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDetail])

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 backdrop-blur-sm sm:place-items-center sm:p-6" onClick={closeDetail} role="presentation">
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className="relative max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-3xl border border-white/15 bg-elev shadow-2xl sm:rounded-3xl"
      >
        <button type="button" onClick={closeDetail} aria-label={t('Kapat')} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white/80 hover:text-white">
          <X size={18} />
        </button>
        {channel.seriesId ? (
          xtream && playlistId ? <SeriesDetailView channel={channel} login={xtream} playlistId={playlistId} seriesId={channel.seriesId} /> : null
        ) : (
          <MovieDetail channel={channel} login={xtream} playlistId={playlistId} />
        )}
      </div>
    </div>
  )
}

export function DetailDialog() {
  const { detail } = useMedia()
  // The key gives each title its own fresh data and season selection.
  return detail ? <Sheet key={detail.id} channel={detail} /> : null
}
