import { FolderOpen, Play, Trash2, Loader2 } from 'lucide-react'
import { cancelDownload, fileUrl, formatBytes, openDownloadFolder, removeDownload, useDownloads } from './downloads'
import { IS_HOST } from './host'
import { Section } from './SettingsControls'
import { useMedia } from './useMedia'

/** Settings > İndirilenler: what has been downloaded for offline viewing, with a button for each file's folder. */
export function DownloadsTab() {
  const { play } = useMedia()
  const { items } = useDownloads()

  return (
    <Section title="İndirilenler" description="Cihazına indirdiğin film ve dizi bölümleri. İnternet olmadan buradan izleyebilirsin.">
      {!IS_HOST && <p className="px-5 py-4 text-sm text-[var(--subtle)]">İndirme yalnızca masaüstü uygulamasında çalışır. Burası uygulamada indirdiklerini listeler.</p>}
      {IS_HOST && items.length === 0 && <p className="px-5 py-8 text-center text-sm text-[var(--subtle)]">Henüz indirilen bir şey yok. Bir film ya da dizi bölümünün sayfasındaki "İndir" düğmesini kullan.</p>}
      <ul className="divide-y divide-white/10">
        {items.map((item) => (
          <li key={item.title} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.title}</p>
              {item.status === 'active' && (
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress)} aria-label={`${item.title} indirme durumu`}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${item.progress}%` }} />
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs tabular-nums text-[var(--ink-2)]">
                    <Loader2 size={13} className="animate-spin" aria-hidden="true" /> %{Math.round(item.progress)}
                    {item.total ? ` · ${formatBytes(item.received)} / ${formatBytes(item.total)}` : ''}
                  </span>
                </div>
              )}
              {item.status === 'done' && (
                <p className="mt-0.5 truncate text-xs text-[var(--subtle)]">
                  {item.kind === 'series' ? 'Dizi bölümü' : 'Film'} · {formatBytes(item.size)}
                  {item.path ? ` · ${item.path}` : ''}
                </p>
              )}
              {item.status === 'error' && <p className="mt-0.5 text-xs text-danger">İndirilemedi: {item.error}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {item.status === 'active' && (
                <button type="button" onClick={() => cancelDownload(item.title)} className="btn-ghost">
                  İptal
                </button>
              )}
              {item.status === 'done' && item.path && (
                <>
                  <button
                    type="button"
                    onClick={() => play({ id: `download:${item.title}`, name: item.title, url: fileUrl(item.path ?? ''), group: 'İndirilenler' }, { fullscreen: true })}
                    className="btn-primary"
                  >
                    <Play size={15} fill="currentColor" aria-hidden="true" /> Oynat
                  </button>
                  <button type="button" onClick={() => openDownloadFolder(item.path ?? '')} className="btn-ghost">
                    <FolderOpen size={15} aria-hidden="true" /> Klasörü Aç
                  </button>
                </>
              )}
              {item.status !== 'active' && (
                <button type="button" onClick={() => removeDownload(item.title)} aria-label={`${item.title} listeden kaldır`} title="Listeden kaldır (dosya silinmez)" className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-danger">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  )
}
