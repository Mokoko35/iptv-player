import { Check, ListPlus, RefreshCw, Trash2 } from 'lucide-react'
import { Section } from './SettingsControls'
import type { PlaylistMeta } from './types'
import { useMedia } from './useMedia'

const KIND_TEXT: Record<PlaylistMeta['kind'], string> = { url: 'M3U adresi', xtream: 'Portal', file: 'Dosya', text: 'Yapıştırılan' }

export function PlaylistManager() {
  const { lists, openAdd } = useMedia()

  return (
    <Section title="Listeler" description="Eklediğin listeler yalnızca bu cihazda saklanır.">
      {lists.playlists.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[var(--subtle)]">Henüz liste eklemedin.</p>
          <button type="button" onClick={openAdd} className="btn-primary mt-4">
            <ListPlus size={16} aria-hidden="true" /> Liste ekle
          </button>
        </div>
      ) : (
        <>
          {lists.playlists.map((p) => {
            const isActive = lists.active?.id === p.id
            return (
              <div key={p.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-[var(--ink-2)]">
                      <span className="truncate">{p.name}</span>
                      {isActive && <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">Aktif</span>}
                    </p>
                    <p className="text-xs tabular-nums text-[var(--subtle)]">
                      {KIND_TEXT[p.kind]} · {p.channelCount.toLocaleString('tr-TR')} öğe · {new Date(p.updatedAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!isActive && (
                      <button type="button" onClick={() => lists.select(p.id)} className="btn-ghost !min-h-10">
                        <Check size={15} aria-hidden="true" /> Aktif yap
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void lists.refresh(p.id)}
                      disabled={lists.busy || !p.sourceUrl}
                      aria-label={`${p.name} listesini güncelle`}
                      title={p.sourceUrl ? 'Güncelle' : 'Dosyadan eklenen listeler güncellenemez'}
                      className="btn-ghost !min-h-10 !px-3"
                    >
                      <RefreshCw size={15} className={lists.busy ? 'animate-spin' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm(`"${p.name}" listesi silinsin mi?`) && void lists.remove(p.id)}
                      aria-label={`${p.name} listesini sil`}
                      className="btn-ghost !min-h-10 !px-3 hover:!text-danger"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {lists.error && <p role="alert" className="px-5 py-3 text-sm text-danger">{lists.error}</p>}
          <div className="px-5 py-4">
            <button type="button" onClick={openAdd} className="btn-ghost">
              <ListPlus size={16} aria-hidden="true" /> Liste ekle
            </button>
          </div>
        </>
      )}
    </Section>
  )
}
