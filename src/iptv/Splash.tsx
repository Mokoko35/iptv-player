import { useEffect, useState } from 'react'
import { Tv } from 'lucide-react'
import { t } from './i18n'

const SHOW_MS = 1600
const FADE_MS = 450

/** Shown once when the app opens: logo, glow and a loading bar. Fades out by itself. */
export function Splash() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show')

  useEffect(() => {
    const fade = setTimeout(() => setPhase('fade'), SHOW_MS)
    const gone = setTimeout(() => setPhase('gone'), SHOW_MS + FADE_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(gone)
    }
  }, [])

  if (phase === 'gone') return null

  return (
    <div
      role="status"
      aria-label={t('IPTV Oynatıcı yükleniyor')}
      className="fixed inset-0 z-[100] grid place-items-center bg-canvas transition-opacity"
      style={{ opacity: phase === 'fade' ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
      <div className="relative flex flex-col items-center">
        <div className="splash-logo grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-[var(--accent-hover)] to-accent text-[var(--accent-ink)]">
          <Tv size={46} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <h1 className="display splash-rise mt-6 text-4xl font-semibold tracking-tight" style={{ animationDelay: '0.15s' }}>{t('IPTV')}</h1>
        <p className="splash-rise mt-1 text-xs uppercase tracking-[0.3em] text-[var(--subtle)]" style={{ animationDelay: '0.3s' }}>{t('Canlı TV · Filmler · Diziler')}</p>
        <div className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="splash-bar h-full w-2/5 rounded-full bg-accent" />
        </div>
      </div>
    </div>
  )
}
