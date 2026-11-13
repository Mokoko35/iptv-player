import { AlertTriangle, Check, Download, X } from 'lucide-react'
import { cancelDownload, useDownloads } from './downloads'
import { hrefFor } from './router'
import { t } from './i18n'

/** The small notices in the corner: every running download with its bar, and "İndirildi" / "İndirilemedi" for a few seconds. */
export function DownloadTray() {
  const { tray } = useDownloads()
  if (tray.length === 0) return null
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-20 z-[45] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-4 sm:w-80 lg:bottom-auto lg:top-4">
      {tray.map((item) => (
        <div key={item.title} className="pointer-events-auto rounded-2xl border border-white/15 bg-elev/95 p-3 shadow-xl" role={item.status === 'error' ? 'alert' : 'status'}>
          {item.status === 'active' && (
            <>
              <div className="flex items-center gap-2">
                <Download size={16} className="shrink-0 text-accent" aria-hidden="true" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{t('İndiriliyor:')}{' '}{item.title}</p>
                <span className="shrink-0 text-xs tabular-nums text-[var(--ink-2)]">%{Math.round(item.progress)}</span>
                <button type="button" onClick={() => cancelDownload(item.title)} aria-label={t('{title} indirmesini iptal et', { title: item.title })} title={t('İptal')} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-danger">
                  <X size={15} />
                </button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress)} aria-label={t('{title} indirme durumu', { title: item.title })}>
                <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${item.progress}%` }} />
              </div>
            </>
          )}
          {item.status === 'done' && (
            <div className="flex items-center gap-2">
              <Check size={18} className="shrink-0 text-emerald-400" aria-hidden="true" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{t('İndirildi ✓')}{' '}{item.title}</p>
              <a href={hrefFor('settings', 'downloads')} className="shrink-0 text-xs text-accent hover:underline">{t('Göster')}</a>
            </div>
          )}
          {item.status === 'error' && (
            <div className="flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              <p className="min-w-0 flex-1 text-pretty text-sm">
                <span className="font-medium">{t('İndirilemedi:')}</span> {item.error}
                <span className="block truncate text-xs text-[var(--subtle)]">{item.title}</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
