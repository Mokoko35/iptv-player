import { type ReactNode, useMemo } from 'react'
import { ChevronRight, ListPlus, Play, Tv, ChevronDown } from 'lucide-react'
import { ChannelCard, PosterCard } from './Cards'
import { SkeletonGrid } from './Skeletons'
import { groupOf, kindOf } from './kinds'
import { hrefFor, type Page } from './router'
import type { Channel } from './types'
import { useMedia } from './useMedia'
import { LanguageSelectorModal } from './LanguageSelectorModal'
import { useState } from 'react'
import { Globe } from 'lucide-react'
import { t } from './i18n'

function Row({ title, items, href }: { title: string; items: Channel[]; href?: Page }) {
  const { current, openItem, isFavorite, toggleFavorite, prefs, epg } = useMedia()
  if (items.length === 0) return null
  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="display text-xl font-semibold">{title}</h2>
        {href && (
          <a href={hrefFor(href)} className="inline-flex min-h-10 items-center gap-1 text-sm text-[var(--subtle)] hover:text-accent">{t('Tümünü gör')}{' '}<ChevronRight size={15} aria-hidden="true" />
          </a>
        )}
      </div>
      <ul className="no-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0">
        {items.map((c) => {
          const poster = kindOf(c) !== 'live'
          const props = { channel: c, active: current?.id === c.id, favorite: isFavorite(c), showLogo: prefs.showLogos, onPlay: openItem, onFavorite: toggleFavorite }
          return (
            <li key={c.id} className={`shrink-0 snap-start ${poster ? 'w-36 sm:w-40' : 'w-56 sm:w-64'}`}>
              {poster ? <PosterCard {...props} /> : <ChannelCard {...props} epg={epg.nowNext(c)} />}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Hero({ channel }: { channel: Channel }) {
  const { openItem, route } = useMedia()
  const live = kindOf(channel) === 'live'
  return (
    <section aria-label={t('Öne çıkan')} className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-accent/25 via-elev to-canvas p-6 sm:p-10">
      {channel.logo && <img src={channel.logo} alt="" aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-80 w-80 object-contain opacity-15 blur-sm" />}
      <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-[-120px] h-64 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative max-w-xl">
        <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold tracking-wider text-[var(--accent-ink)]">{t('ÖNE ÇIKAN')}</span>
        <h1 className="display mt-4 text-balance text-3xl font-semibold sm:text-5xl">{channel.name}</h1>
        <p className="mt-2 text-sm text-[var(--subtle)]">{groupOf(channel)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => openItem(channel)} className="btn-primary">
            <Play size={16} fill="currentColor" aria-hidden="true" /> {live ? t('Oynat') : t('Ayrıntılar')}
          </button>
          <button type="button" onClick={() => route.go('live')} className="btn-ghost">
            <Tv size={16} aria-hidden="true" />{' '}{t('Canlı TV')}</button>
        </div>
      </div>
    </section>
  )
}

export function HomePage(): ReactNode {
  const { lists, parts, visible, favorites, isFavorite, openAdd } = useMedia()
  const [showLang, setShowLang] = useState(false)
  const [showFreeLists, setShowFreeLists] = useState(false)

  // `favorites` is read so the row refreshes when a favorite changes.
  const favs = useMemo(
    () => [...visible.live, ...visible.movie, ...visible.series].filter((c) => favorites && isFavorite(c)).slice(0, 30),
    [visible, favorites, isFavorite],
  )
  const featured = favs[0] ?? visible.live[0] ?? visible.movie[0] ?? visible.series[0]

  if (lists.starting) return <SkeletonGrid poster={false} count={12} className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4" />

  if (lists.playlists.length === 0) {
    return (
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center">
        <button 
          type="button" 
          onClick={() => setShowLang(true)}
          className="absolute right-4 top-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
        >
          <Globe size={18} />{t('Dil Değiştir')}</button>

        <section className="card mx-auto w-full max-w-xl p-8 text-center sm:p-12 bg-gradient-to-br from-[#1a1d24] to-[#0f1115] border border-white/5 shadow-2xl">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-accent/10">
            <Tv size={36} className="text-accent" aria-hidden="true" />
          </div>
          <h1 className="display mt-6 text-4xl font-bold text-white">{t('İlk listeni ekle')}</h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-white/50">{t('M3U adresi, portal (Xtream) girişi, dosya veya yapıştırılmış içerikle liste ekleyebilirsin. Uygulama içerik sağlamaz; yalnızca senin eklediğin listeleri oynatır.')}</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button type="button" onClick={openAdd} className="btn-primary !px-8 !py-3 text-base shadow-lg shadow-accent/20">
              <ListPlus size={20} aria-hidden="true" />{' '}{t('Liste ekle')}</button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFreeLists(!showFreeLists)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
              >
                <Tv size={16} />{' '}{t('Hazır Ücretsiz Listeler')}{' '}<ChevronDown size={14} className={`transition-transform ${showFreeLists ? 'rotate-180' : ''}`} />
              </button>
              
              {showFreeLists && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFreeLists(false)} />
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#1a1d24] shadow-2xl z-50 py-1">
                    {[
                      { name: '🇹🇷 Türkiye Kanalları', url: 'https://iptv-org.github.io/iptv/countries/tr.m3u' },
                      { name: '🌍 Dünya (Free-TV)', url: 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8' },
                      { name: '✅ Nexonic (Doğrulanmış)', url: 'https://shahrukhalid.github.io/nexonic-iptv/playlists/all.m3u' },
                      { name: '⚽ Spor Kanalları', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
                      { name: '📰 Haber Kanalları', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
                    ].map(item => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={async () => {
                          setShowFreeLists(false);
                          await lists.add({ kind: 'url', name: item.name, url: item.url });
                        }}
                        className="block w-full px-4 py-2.5 text-start text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {showLang && <LanguageSelectorModal onClose={() => setShowLang(false)} />}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {featured && <Hero channel={featured} />}
      <Row title={t('Favorilerin')} items={favs} />
      <Row title={t('Canlı TV')} items={visible.live.slice(0, 24)} href="live" />
      <Row title={t('Filmler')} items={visible.movie.slice(0, 24)} href="movies" />
      <Row title={t('Diziler')} items={visible.series.slice(0, 24)} href="series" />
      {parts.live.length + parts.movie.length + parts.series.length > 0 && visible.live.length + visible.movie.length + visible.series.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-[var(--subtle)]">{t('Tüm kategoriler gizli. Ayarlar sayfasındaki Kategori Yönetimi bölümünden göster.')}</p>
      )}
    </div>
  )
}
