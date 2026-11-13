import { clock } from './epgFormat'
import type { Epg } from './useEpg'
import type { Channel } from './types'
import { t } from './i18n'

/** What is on now, with a progress bar, and the next three programs as a small timeline. Shown under the live player. */
export function EpgTimeline({ channel, epg }: { channel: Channel; epg: Epg }) {
  const guide = epg.nowNext(channel)

  if (!guide) {
    const text =
      epg.status === 'loading'
        ? t('Program rehberi yükleniyor...')
        : epg.status === 'error'
          ? epg.error
          : epg.url
            ? t('Bu kanal için program bilgisi bulunamadı.')
            : t('Program rehberi için Ayarlar > EPG bölümüne bir adres ekleyebilirsin.')
    return <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-[var(--subtle)]">{text}</p>
  }

  const upcoming = [guide.next, ...guide.later].filter((p) => p !== undefined).slice(0, 3)
  const now = guide.now
  const minutesLeft = now ? Math.max(1, Math.round(((1 - guide.progress) * (now.stop - now.start)) / 60000)) : 0
  const pct = Math.round(guide.progress * 100)

  return (
    <section aria-label={t('Program rehberi')} className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      {now ? (
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold tracking-wider text-[var(--accent-ink)]">{t('ŞİMDİ')}</span>
            <span className="text-sm tabular-nums text-[var(--subtle)]">
              {clock(now.start)} - {clock(now.stop)}
            </span>
            <span className="ms-auto text-sm tabular-nums text-[var(--ink-2)]">{minutesLeft}{' '}{t('dk kaldı')}</span>
          </div>
          <p className="mt-2 text-balance text-lg font-semibold text-[var(--ink)]">{now.title}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t('Programın ilerlemesi')}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          {now.desc && <p className="mt-3 line-clamp-2 text-pretty text-sm text-[var(--ink-2)]">{now.desc}</p>}
        </div>
      ) : (
        <p className="text-sm text-[var(--subtle)]">{t('Şu an için program bilgisi yok.')}</p>
      )}

      {upcoming.length > 0 && (
        <div className={now ? 'mt-5' : 'mt-3'}>
          <p className="label">{t('Sıradaki programlar')}</p>
          <ol className="relative mt-3 space-y-3 border-l border-white/15 pl-5">
            {upcoming.map((p) => (
              <li key={p.start} className="relative">
                <span aria-hidden="true" className="absolute -left-[1.7rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-accent bg-elev" />
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-sm tabular-nums text-[var(--subtle)]">{clock(p.start)}</span>
                  <span className="min-w-0 flex-1 truncate text-base text-[var(--ink-2)]">{p.title}</span>
                  <span className="text-xs tabular-nums text-[var(--subtle)]">{Math.max(1, Math.round((p.stop - p.start) / 60000))}{' '}{t('dk')}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  )
}
