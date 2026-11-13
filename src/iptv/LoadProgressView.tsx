import { Check, Loader2 } from 'lucide-react'
import type { LoadProgress, LoadStage } from './load'
import { t, tr, locale } from './i18n'

const STAGE_TEXT: Record<LoadStage, string> = {
  connecting: tr('Sunucuya bağlanılıyor...'),
  downloading: tr('Liste indiriliyor...'),
  reading: 'Kanallar, filmler ve diziler okunuyor...',
  saving: tr('Cihaza kaydediliyor...'),
  done: tr('Liste eklendi'),
}

const mb = (bytes: number) => (bytes / 1_048_576).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function Counts({ progress }: { progress: LoadProgress }) {
  const items = [
    { label: t('Canlı TV'), value: progress.live },
    { label: t('Filmler'), value: progress.movie },
    { label: t('Dizi bölümleri'), value: progress.series },
  ]
  return (
    <dl className="grid grid-cols-3 gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
          <dd className="display text-2xl font-semibold tabular-nums">{i.value.toLocaleString(locale())}</dd>
          <dt className="mt-0.5 text-[11px] text-[var(--subtle)]">{i.label}</dt>
        </div>
      ))}
    </dl>
  )
}

export function LoadProgressView({ progress, onBackground }: { progress: LoadProgress; onBackground: () => void }) {
  const done = progress.stage === 'done'
  const pct = progress.total && progress.stage === 'downloading' ? Math.min(100, Math.round((progress.bytes / progress.total) * 100)) : null

  return (
    <div className="py-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <div className={`grid h-14 w-14 place-items-center rounded-2xl ${done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-accent/15 text-accent'}`}>
          {done ? <Check size={28} aria-hidden="true" /> : <Loader2 size={28} className="animate-spin" aria-hidden="true" />}
        </div>
        <p className="display mt-4 text-xl font-semibold">{t(STAGE_TEXT[progress.stage])}</p>
        <p className="mt-1 text-xs tabular-nums text-[var(--subtle)]">
          {progress.bytes > 0 ? t('{v0} MB{v1}{v2}', { v0: mb(progress.bytes), v1: progress.total ? t(' / {v0} MB', { v0: mb(progress.total) }) : '', v2: pct !== null ? ` · %${pct}` : '' }) : t('Başlatılıyor')}
        </p>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
        {done ? (
          <div className="h-full w-full rounded-full bg-emerald-400" />
        ) : pct !== null ? (
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        ) : (
          <div className="splash-bar h-full w-2/5 rounded-full bg-accent" />
        )}
      </div>

      <div className="mt-5">
        <Counts progress={progress} />
      </div>

      {!done && (
        <div className="mt-5 text-center">
          <button type="button" onClick={onBackground} className="btn-ghost">{t('Arka planda devam et')}</button>
          <p className="mt-2 text-xs text-[var(--subtle)]">{t('Pencereyi kapatsan da yükleme sürer.')}</p>
        </div>
      )}
    </div>
  )
}
