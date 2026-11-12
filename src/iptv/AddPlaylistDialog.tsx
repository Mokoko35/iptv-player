import { type FormEvent, useEffect, useRef, useState } from 'react'
import { FileUp, Link2, Loader2, Server, X, ClipboardPaste } from 'lucide-react'
import { LoadProgressView } from './LoadProgressView'
import type { LoadProgress } from './load'
import type { AddInput } from './usePlaylists'

type Tab = 'url' | 'xtream' | 'file' | 'text'

const TABS: { id: Tab; label: string; icon: typeof Link2 }[] = [
  { id: 'url', label: 'M3U adresi', icon: Link2 },
  { id: 'xtream', label: 'Portal girişi', icon: Server },
  { id: 'file', label: 'Dosya', icon: FileUp },
  { id: 'text', label: 'Yapıştır', icon: ClipboardPaste },
]

interface Props {
  busy: boolean
  progress: LoadProgress | null
  error: string | null
  onClose: () => void
  onAdd: (input: AddInput) => Promise<boolean>
}

export function AddPlaylistDialog({ busy, progress, error, onClose, onAdd }: Props) {
  const [tab, setTab] = useState<Tab>('url')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [submitted, setSubmitted] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  const readFile = async (file: File) => {
    setFileName(file.name)
    setText(await file.text())
    if (!name) setName(file.name.replace(/\.(m3u8?|txt)$/i, ''))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    let input: AddInput | null = null
    if (tab === 'url') {
      if (!/^https?:\/\//i.test(url.trim())) return setFormError('Adres http:// veya https:// ile başlamalı.')
      input = { kind: 'url', name: name || 'M3U listesi', url }
    } else if (tab === 'xtream') {
      if (!server.trim() || !username.trim() || !password.trim()) return setFormError('Sunucu, kullanıcı adı ve şifre gerekli.')
      input = { kind: 'xtream', name: name || 'Portal listesi', login: { server, username, password } }
    } else {
      if (!text.trim()) return setFormError(tab === 'file' ? 'Önce bir .m3u veya .m3u8 dosyası seç.' : 'M3U içeriğini yapıştır.')
      input = { kind: tab, name: name || (tab === 'file' ? fileName : 'Yapıştırılan liste'), text }
    }
    setSubmitted(true)
    if (await onAdd(input)) {
      // Leave the finished counts on screen for a moment before closing.
      closeTimer.current = setTimeout(onClose, 1400)
    } else {
      setSubmitted(false)
    }
  }

  const shownError = formError ?? error

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose} role="presentation">
      <form
        onSubmit={(e) => void submit(e)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Liste ekle"
        className="max-h-dvh w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-elev p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl font-semibold">Liste ekle</h2>
          <button type="button" onClick={onClose} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>

        {submitted && progress ? (
          <LoadProgressView progress={progress} onBackground={onClose} />
        ) : (
          <>
        <div role="tablist" aria-label="Ekleme yöntemi" className="mt-4 grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id)
                setFormError(null)
              }}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium transition sm:text-xs ${tab === id ? 'bg-accent text-[var(--accent-ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`}
            >
              <Icon size={15} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="pl-name" className="label mb-1.5 block">Liste adı</label>
            <input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Evdeki liste" className="field" />
          </div>

          {tab === 'url' && (
            <div>
              <label htmlFor="pl-url" className="label mb-1.5 block">M3U adresi</label>
              <input id="pl-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://sunucu.com/liste.m3u" inputMode="url" autoComplete="off" className="field" />
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setUrl(text.trim());
                    } catch (err) {
                      // Pano izni yoksa sessizce geç
                    }
                  }}
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20 hover:text-white transition flex items-center gap-1.5"
                >
                  <ClipboardPaste size={14} />
                  Panodan Yapıştır
                </button>
                <span className="text-xs text-[var(--subtle)]">veya Ctrl+V</span>
              </div>
            </div>
          )}

          {tab === 'xtream' && (
            <>
              <p className="text-xs text-[var(--subtle)]">Xtream Codes tabanlı portallar için. Sağlayıcının verdiği bilgileri gir.</p>
              <div>
                <label htmlFor="pl-server" className="label mb-1.5 block">Sunucu</label>
                <input id="pl-server" value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://sunucu.com:8080" inputMode="url" autoComplete="off" className="field" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="pl-user" className="label mb-1.5 block">Kullanıcı adı</label>
                  <input id="pl-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" className="field" />
                </div>
                <div>
                  <label htmlFor="pl-pass" className="label mb-1.5 block">Şifre</label>
                  <input id="pl-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" className="field" />
                </div>
              </div>
            </>
          )}

          {tab === 'file' && (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".m3u,.m3u8,.txt,audio/x-mpegurl,application/vnd.apple.mpegurl"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void readFile(f)
                }}
              />
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost w-full !min-h-20 flex-col !gap-1 border-dashed">
                <FileUp size={20} aria-hidden="true" />
                {fileName || '.m3u veya .m3u8 dosyası seç'}
              </button>
            </div>
          )}

          {tab === 'text' && (
            <div>
              <label htmlFor="pl-text" className="label mb-1.5 block">M3U içeriği</label>
              <textarea id="pl-text" value={text} onChange={(e) => setText(e.target.value)} rows={7} spellCheck={false} placeholder={'#EXTM3U\n#EXTINF:-1 group-title="Haber",Kanal\nhttp://...'} className="field mono !text-xs" />
            </div>
          )}
        </div>

        {shownError && (
          <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[var(--ink-2)]">
            {shownError}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {busy ? 'Liste yükleniyor...' : 'Listeyi ekle'}
        </button>
        <p className="mt-3 text-center text-xs text-[var(--subtle)]">Listeler yalnızca bu cihazda saklanır. Uygulama içerik sağlamaz.</p>
          </>
        )}
      </form>
    </div>
  )
}
