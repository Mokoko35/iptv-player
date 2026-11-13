import { DownloadsTab } from './DownloadsTab'
import { RefreshCw, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { dateTime, megabytes } from './epgFormat'
import { PlaylistManager } from './PlaylistManager'
import { KIND_LABEL, KINDS, categoriesOf } from './kinds'
import { EPG_SECONDS_MAX, EPG_SECONDS_MIN, type AspectMode, type CardSize, type EpgRefresh } from './prefs'
import { hrefFor, type SettingsTab } from './router'
import { PinDialog } from './PinDialog'
import { hasPin } from './pin'
import { Row, Section, Segmented, Toggle } from './SettingsControls'
import { ThemePicker } from './ThemePicker'
import { testTmdbKey } from './tmdb'
import { useMedia } from './useMedia'
import { LANGUAGES, locale, t, tr } from './i18n'
import { flagOf } from './countries'
import { LanguageSelectorModal } from './LanguageSelectorModal'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: tr('Genel') },
  { id: 'playback', label: tr('Oynatma') },
  { id: 'epg', label: tr('EPG') },
  { id: 'categories', label: tr('Kategori Yönetimi') },
  { id: 'themes', label: tr('Temalar') },
  { id: 'downloads', label: tr('İndirilenler') },
]

/** TMDB key: posters, summaries and cast looked up by the cleaned title. Off until a key is entered. */
function TmdbSettings() {
  const { prefs, updatePrefs } = useMedia()
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'bad'>('idle')

  const test = async () => {
    setState('testing')
    setState((await testTmdbKey(prefs.tmdbKey)) ? 'ok' : 'bad')
  }

  return (
    <Section title={t('Film ve dizi bilgileri (TMDB)')} description={t('Listedeki başlık temizlenir ve TMDB\'de aranır. Doğru afiş, özet, oyuncular ve puan film ve dizi sayfalarında görünür.')}>
      <Row label={t('TMDB anahtarı')} hint={t('themoviedb.org\'da ücretsiz hesap açıp Ayarlar > API bölümünden anahtarı (API Key veya Read Access Token) al. Yalnızca bu cihazda saklanır. Boş bırakırsan yalnızca portalın kendi bilgileri kullanılır.')}>
        <div className="flex w-full flex-col gap-2 sm:w-72">
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={prefs.tmdbKey}
            onChange={(e) => {
              updatePrefs({ tmdbKey: e.target.value.trim() })
              setState('idle')
            }}
            placeholder={t('TMDB anahtarı')}
            aria-label={t('TMDB anahtarı')}
            className="field"
          />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void test()} disabled={!prefs.tmdbKey || state === 'testing'} className="btn-ghost !min-h-9 text-xs">
              {state === 'testing' ? t('Deneniyor...') : t('Anahtarı dene')}
            </button>
            {state === 'ok' && <span role="status" className="text-sm text-[var(--success)]">{t('Anahtar çalışıyor.')}</span>}
            {state === 'bad' && (
              <span role="alert" className="text-sm text-danger">{t('Anahtar kabul edilmedi.')}</span>
            )}
          </div>
        </div>
      </Row>
    </Section>
  )
}

/** Hide adult content. Switching it either way, and changing the PIN, asks for the 4-digit PIN. */
function AdultFilter() {
  const { prefs, updatePrefs } = useMedia()
  const [pinSet, setPinSet] = useState(hasPin)
  const [notice, setNotice] = useState<string | null>(null)
  // What the PIN dialog is for, and what happens once it succeeds.
  const [flow, setFlow] = useState<{ step: 'verify' | 'create'; after: 'toggle' | 'change'; next?: boolean } | null>(null)

  const start = (after: 'toggle' | 'change', next?: boolean) => {
    setNotice(null)
    setFlow({ step: pinSet ? 'verify' : 'create', after, next })
  }

  const done = () => {
    if (!flow) return
    if (flow.step === 'verify' && flow.after === 'change') {
      setFlow({ step: 'create', after: 'change' })
      return
    }
    if (flow.step === 'create') setPinSet(true)
    if (flow.after === 'toggle' && flow.next !== undefined) {
      updatePrefs({ adultFilter: flow.next })
      setNotice(flow.next ? t('Yetişkin içerik gizlendi.') : t('Yetişkin içerik gösteriliyor.'))
    } else if (flow.after === 'change') {
      setNotice(t('PIN değiştirildi.'))
    }
    setFlow(null)
  }

  const dialog = (() => {
    if (!flow) return null
    if (flow.step === 'create') {
      return flow.after === 'change'
        ? { title: t('Yeni PIN'), description: t('Yeni 4 haneli PIN\'ini gir.') }
        : { title: t('PIN belirle'), description: t('Yetişkin içerik ayarını değiştirmek için 4 haneli bir PIN belirle. Unutma: PIN bu cihazda saklanır.') }
    }
    return flow.after === 'change'
      ? { title: t('Mevcut PIN'), description: t('PIN\'ini değiştirmek için önce mevcut PIN\'ini gir.') }
      : { title: flow.next ? t('Yetişkin içeriği gizle') : t('Yetişkin içeriği göster'), description: t('Devam etmek için 4 haneli PIN\'ini gir.') }
  })()

  return (
    <Section title={t('Yetişkin içeriği')} description={t('XXX, Adult, +18 gibi etiketler taşıyan kategoriler ve kanallar listelerden çıkarılır.')}>
      <Row label={t('Yetişkin içeriğini gizle')} hint={t('Açıkken bu içerik her yerde gizlenir. Ayarı değiştirmek için PIN gerekir.')}>
        <Toggle label={t('Yetişkin içeriğini gizle')} checked={prefs.adultFilter} onChange={(next) => start('toggle', next)} />
      </Row>
      <Row label={t('PIN')} hint={t('4 haneli PIN bu cihazın yerel depolamasında, karıştırılmış (hash) olarak saklanır. Unutursan tarayıcı verilerini temizleyerek sıfırlayabilirsin.')}>
        <button type="button" onClick={() => start('change')} className="btn-ghost">
          <ShieldCheck size={16} aria-hidden="true" /> {pinSet ? t('PIN\'i değiştir') : t('PIN belirle')}
        </button>
      </Row>
      {notice && (
        <p role="status" className="px-5 py-3 text-sm text-[var(--success)]">
          {notice}
        </p>
      )}
      {flow && dialog && <PinDialog key={`${flow.step}-${flow.after}`} mode={flow.step} title={dialog.title} description={dialog.description} onSuccess={done} onCancel={() => setFlow(null)} />}
    </Section>
  )
}

function General() {
  const { prefs, updatePrefs, lang } = useMedia()
  const [langOpen, setLangOpen] = useState(false)
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0]!
  return (
    <div className="space-y-5">
      <PlaylistManager />
      <AdultFilter />
      <TmdbSettings />
      <Section title={t('Görünüm')}>
        <Row label={t('Arayüz dili')} hint={t('Menüler, düğmeler ve mesajlar bu dilde görünür.')}>
          <button type="button" onClick={() => setLangOpen(true)} className="btn-ghost inline-flex items-center gap-2" aria-haspopup="dialog">
            <span className="flag text-lg" aria-hidden="true">
              {flagOf(current.region)}
            </span>
            {current.name}
          </button>
        </Row>
        <Row label={t('Kart boyutu')} hint={t('Kanal ve poster ızgaralarının yoğunluğu.')}>
          <Segmented<CardSize>
            label={t('Kart boyutu')}
            value={prefs.cardSize}
            onChange={(cardSize) => updatePrefs({ cardSize })}
            options={[
              { value: 'sm', label: t('Küçük') },
              { value: 'md', label: t('Orta') },
              { value: 'lg', label: t('Büyük') },
            ]}
          />
        </Row>
        <Row label={t('Logoları ve posterleri göster')} hint={t('Kapatırsan kartlarda yalnızca baş harfler görünür.')}>
          <Toggle label={t('Logoları ve posterleri göster')} checked={prefs.showLogos} onChange={(showLogos) => updatePrefs({ showLogos })} />
        </Row>
      </Section>
      {langOpen && <LanguageSelectorModal onClose={() => setLangOpen(false)} />}
    </div>
  )
}

function Playback() {
  const { prefs, updatePrefs } = useMedia()
  return (
    <Section title={t('Oynatma')}>
      <Row label={t('Otomatik oynat')} hint={t('Bir kanala veya içeriğe tıklayınca yayın hemen başlasın.')}>
        <Toggle label={t('Otomatik oynat')} checked={prefs.autoplay} onChange={(autoplay) => updatePrefs({ autoplay })} />
      </Row>
      <Row label={t('Görüntü oranı')} hint={t('Film ekrana nasıl otursun. Orijinal oran, filmin kendi şeklini korur; Uzat görüntüyü bozar. Oynatıcıdaki düğmeden de değiştirebilirsin.')}>
        <Segmented<AspectMode>
          label={t('Görüntü oranı')}
          value={prefs.aspect}
          onChange={(aspect) => updatePrefs({ aspect })}
          options={[
            { value: 'fit', label: t('Orijinal') },
            { value: 'fill', label: t('Doldur') },
            { value: 'stretch', label: t('Uzat') },
            { value: '16:9', label: '16:9' },
            { value: '4:3', label: '4:3' },
          ]}
        />
      </Row>
      <Row label={t('Tampon süresi')} hint={t('Yavaş bağlantılarda daha uzun tampon kesintileri azaltır.')} soon>
        <Segmented<10 | 30 | 60>
          label={t('Tampon süresi')}
          disabled
          value={prefs.bufferSeconds}
          onChange={(bufferSeconds) => updatePrefs({ bufferSeconds })}
          options={[
            { value: 10, label: t('10 sn') },
            { value: 30, label: t('30 sn') },
            { value: 60, label: t('60 sn') },
          ]}
        />
      </Row>
      <Row label={t('Donanım hızlandırma')} hint={t('Windows masaüstü uygulamasında video çözmeyi ekran kartına bırakır.')} soon>
        <Toggle label={t('Donanım hızlandırma')} disabled checked={prefs.hardwareDecoding} onChange={(hardwareDecoding) => updatePrefs({ hardwareDecoding })} />
      </Row>
    </Section>
  )
}

function Epg() {
  const { prefs, updatePrefs, epg } = useMedia()
  const shownUrl = epg.url.replace(/(password=)[^&]*/i, '$1***')
  const status =
    epg.status === 'loading'
      ? t('Rehber indiriliyor{v0}', { v0: epg.bytes > 0 ? ` · ${megabytes(epg.bytes)}` : '...' })
      : epg.status === 'ready'
        ? epg.fetchedAt
          ? t('{v0} kanal için program var · son güncelleme {v1}', { v0: epg.channelCount, v1: dateTime(epg.fetchedAt) })
          : t('{v0} kanal için program var', { v0: epg.channelCount })
        : epg.status === 'error'
          ? (epg.error ?? t('Rehber alınamadı.'))
          : epg.url
            ? t('Henüz indirilmedi.')
            : t('Bu liste bir portal değil. Rehber için bir XMLTV adresi gir.')

  return (
    <div className="space-y-5">
      <Section title={t('Program rehberi (EPG)')} description={t('Canlı TV kartlarında ve oynatıcı penceresinde Şimdi ve Sonra programlarını gösterir.')}>
        <Row label={t('Durum')} hint={epg.status === 'ready' && epg.error ? epg.error : undefined}>
          <p aria-live="polite" className={`max-w-xs text-end text-sm tabular-nums ${epg.status === 'error' ? 'text-danger' : 'text-[var(--ink-2)]'}`}>
            {status}
          </p>
        </Row>
        <Row label={t('XMLTV adresi')} hint={t('Boş bırakırsan portalın kendi adresi (xmltv.php) kullanılır. Genellikle .xml veya .xml.gz ile biten adres.')} htmlFor="epg-url">
          <input
            id="epg-url"
            value={prefs.epgUrl}
            onChange={(e) => updatePrefs({ epgUrl: e.target.value })}
            placeholder={shownUrl || t('http://sunucu.com/epg.xml')}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            className="field w-full sm:w-80"
          />
        </Row>
        <Row
          label={t('EPG görünme süresi')}
          hint={t('Canlı yayını tam ekranda izlerken, fareyi son oynattığından sonra kontroller ve programın ince bandı (adı, kalan süre, ilerleme çubuğu) kaç saniye ekranda kalsın.')}
          htmlFor="epg-seconds"
        >
          <div className="flex items-center gap-3">
            <input
              id="epg-seconds"
              type="range"
              min={EPG_SECONDS_MIN}
              max={EPG_SECONDS_MAX}
              step={1}
              value={prefs.epgSeconds}
              onChange={(e) => updatePrefs({ epgSeconds: Number(e.target.value) })}
              aria-valuetext={`${prefs.epgSeconds} saniye`}
              className="h-1.5 w-40 cursor-pointer accent-accent sm:w-56"
            />
            <span className="w-12 text-end text-sm tabular-nums text-[var(--ink-2)]">{prefs.epgSeconds}{' '}{t('sn')}</span>
          </div>
        </Row>
        <Row label={t('Otomatik güncelleme')} hint={t('Rehber ne sıklıkla yenilensin. Kapalıysa yalnızca elle güncellenir.')}>
          <Segmented<EpgRefresh>
            label={t('Otomatik güncelleme')}
            value={prefs.epgRefresh}
            onChange={(epgRefresh) => updatePrefs({ epgRefresh })}
            options={[
              { value: 'off', label: t('Kapalı') },
              { value: '6', label: t('6 sa') },
              { value: '12', label: t('12 sa') },
              { value: '24', label: t('24 sa') },
            ]}
          />
        </Row>
        <Row label={t('Şimdi güncelle')} hint={t('Büyük rehberler birkaç dakika sürebilir. İlerleme üstte görünür.')}>
          <button type="button" onClick={epg.refresh} disabled={!epg.url || epg.status === 'loading'} className="btn-primary">
            <RefreshCw size={16} className={epg.status === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />{' '}{t('Rehberi indir')}</button>
        </Row>
      </Section>
      <p className="text-xs text-[var(--subtle)]">{t('Kanalların rehberle eşleşmesi için listedeki tvg-id kullanılır; yoksa kanal adı eşleştirilir. Eski eklenen listelerde tvg-id yoksa listeyi güncelle.')}</p>
    </div>
  )
}

function Categories() {
  const { allParts, hiddenFor, setHiddenFor, openManage, lists } = useMedia()
  if (!lists.active) return <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-[var(--subtle)]">{t('Kategorileri yönetmek için önce bir liste ekle.')}</p>
  return (
    <Section title={t('Kategori Yönetimi')} description={t('Gizlediğin kategoriler listelerden ve ızgaralardan kalkar. Kanalların silinmez.')}>
      {KINDS.map((kind) => {
        const total = categoriesOf(allParts[kind]).length
        const hiddenCount = categoriesOf(allParts[kind]).filter((c) => hiddenFor(kind).has(c.name)).length
        return (
          <div key={kind} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--ink-2)]">{KIND_LABEL[kind]}</p>
              <p className="text-xs tabular-nums text-[var(--subtle)]">
                {total === 0 ? t('Kategori yok') : t('{total} kategori · {hiddenCount} gizli', { total, hiddenCount })}
              </p>
            </div>
            <div className="flex gap-2">
              {hiddenCount > 0 && (
                <button type="button" onClick={() => setHiddenFor(kind, [])} className="btn-ghost !min-h-10">{t('Hepsini göster')}</button>
              )}
              <button type="button" disabled={total === 0} onClick={() => openManage(kind)} className="btn-primary !min-h-10">
                <SlidersHorizontal size={15} aria-hidden="true" />{' '}{t('Kategorileri yönet')}</button>
            </div>
          </div>
        )
      })}
    </Section>
  )
}

export function SettingsPage() {
  const { route } = useMedia()
  return (
    <div>
      <h1 className="display text-3xl font-semibold">{t('Ayarlar')}</h1>
      <div role="tablist" aria-label={t('Ayar bölümleri')} className="no-scrollbar -mx-4 mt-5 flex gap-1 overflow-x-auto border-b border-white/10 px-4 lg:mx-0 lg:px-0">
        {TABS.map((tab) => {
          const on = route.tab === tab.id
          return (
            <a
              key={tab.id}
              href={hrefFor('settings', tab.id)}
              role="tab"
              aria-selected={on}
              className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-medium transition ${
                on ? 'border-accent text-accent' : 'border-transparent text-[var(--subtle)] hover:text-[var(--ink)]'
              }`}
            >
              {t(tab.label)}
            </a>
          )
        })}
      </div>
      <div className="mt-6 max-w-3xl" role="tabpanel">
        {route.tab === 'general' && <General />}
        {route.tab === 'playback' && <Playback />}
        {route.tab === 'epg' && <Epg />}
        {route.tab === 'categories' && <Categories />}
        {route.tab === 'themes' && <ThemePicker />}
        {route.tab === 'downloads' && <DownloadsTab />}
      </div>
    </div>
  )
}
