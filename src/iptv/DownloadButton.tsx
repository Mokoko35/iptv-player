import { Check, Download, Loader2, RotateCcw } from 'lucide-react'
import { cancelDownload, requestDownload, useDownload } from './downloads'
import { IS_HOST } from './host'
import type { Channel } from './types'
import { t } from './i18n'

/**
 * "İndir" for a film or an episode: starts the download, shows how far it is, cancels it, shows when it is done.
 * Downloading is done by the C# app, so in a browser the button is there but switched off, with the reason as its hint.
 */
export function DownloadButton({ channel, compact = false, className = '' }: { channel: Channel; compact?: boolean; className?: string }) {
  const item = useDownload(channel.name)
  const base = compact
    ? 'grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--subtle)] transition hover:bg-white/10 hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50'
    : 'btn-ghost disabled:cursor-not-allowed disabled:opacity-50'

  if (!IS_HOST) {
    const reason = t('Bu özellik sadece uygulamada çalışır')
    return (
      <button type="button" disabled title={reason} aria-label={t('İndir. {reason}', { reason })} className={`${base} ${className}`}>
        <Download size={compact ? 18 : 16} aria-hidden="true" />
        {!compact && t('İndir')}
      </button>
    )
  }

  if (item?.status === 'active') {
    const label = t('İndiriliyor %{v0}. İptal etmek için tıkla', { v0: Math.round(item.progress) })
    return (
      <button type="button" onClick={() => cancelDownload(item.title)} title={label} aria-label={label} className={`${base} ${className} !text-accent`}>
        <Loader2 size={compact ? 18 : 16} className="animate-spin" aria-hidden="true" />
        {!compact && <span className="tabular-nums">{t('İndiriliyor %')}{Math.round(item.progress)}{' '}{t('· İptal')}</span>}
      </button>
    )
  }
  if (item?.status === 'done') {
    return (
      <button type="button" disabled title={t('İndirildi')} aria-label={t('İndirildi')} className={`${base} ${className} !text-emerald-400`}>
        <Check size={compact ? 18 : 16} aria-hidden="true" />
        {!compact && t('İndirildi')}
      </button>
    )
  }
  if (item?.status === 'error') {
    const label = t('İndirilemedi: {v0}. Tekrar denemek için tıkla', { v0: item.error ?? '' })
    return (
      <button type="button" onClick={() => requestDownload(channel)} title={label} aria-label={label} className={`${base} ${className} !text-danger`}>
        <RotateCcw size={compact ? 18 : 16} aria-hidden="true" />
        {!compact && t('Tekrar dene')}
      </button>
    )
  }
  return (
    <button type="button" onClick={() => requestDownload(channel)} title={t('Cihaza indir')} aria-label={t('{name} indir', { name: channel.name })} className={`${base} ${className}`}>
      <Download size={compact ? 18 : 16} aria-hidden="true" />
      {!compact && t('İndir')}
    </button>
  )
}
