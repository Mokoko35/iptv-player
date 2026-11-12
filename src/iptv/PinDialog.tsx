import { type FormEvent, useEffect, useState } from 'react'
import { Loader2, Lock, X } from 'lucide-react'
import { isValidPin, setPin as savePin, verifyPin } from './pin'

interface Props {
  mode: 'create' | 'verify'
  title: string
  description: string
  onSuccess: () => void
  onCancel: () => void
}

// Wrong guesses in this session. Five misses lock the dialog for 30 seconds.
let misses = 0
let lockedUntil = 0

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 4)

export function PinDialog({ mode, title, description, onSuccess, onCancel }: Props) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!isValidPin(pin)) return setError('PIN 4 haneli bir sayı olmalı.')

    if (mode === 'create') {
      if (pin !== confirm) return setError('İki PIN aynı değil.')
      setBusy(true)
      try {
        await savePin(pin)
        onSuccess()
      } catch {
        setError('PIN kaydedilemedi. Tarayıcı depolaması kapalı olabilir.')
        setBusy(false)
      }
      return
    }

    const wait = Math.ceil((lockedUntil - Date.now()) / 1000)
    if (wait > 0) return setError(`Çok fazla yanlış deneme. ${wait} saniye bekle.`)
    setBusy(true)
    const ok = await verifyPin(pin)
    if (ok) {
      misses = 0
      onSuccess()
      return
    }
    misses++
    if (misses >= 5) {
      misses = 0
      lockedUntil = Date.now() + 30_000
      setError('Çok fazla yanlış deneme. 30 saniye bekle.')
    } else {
      setError('PIN yanlış.')
    }
    setPin('')
    setBusy(false)
  }

  const field = 'field mono text-center !text-2xl tracking-[0.7em]'

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-black/75 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onCancel} role="presentation">
      <form
        onSubmit={(e) => void submit(e)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pin-title"
        className="w-full max-w-sm rounded-t-3xl border border-white/15 bg-elev p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Lock size={20} aria-hidden="true" />
          </div>
          <button type="button" onClick={onCancel} aria-label="Kapat" className="grid h-10 w-10 place-items-center rounded-full text-[var(--subtle)] hover:bg-white/10 hover:text-[var(--ink)]">
            <X size={18} />
          </button>
        </div>
        <h2 id="pin-title" className="display mt-3 text-xl font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-pretty text-sm text-[var(--subtle)]">{description}</p>

        <div className="mt-5 space-y-3">
          <div>
            <label htmlFor="pin-input" className="label mb-1.5 block">
              {mode === 'create' ? 'Yeni PIN' : 'PIN'}
            </label>
            <input
              id="pin-input"
              autoFocus
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(digits(e.target.value))}
              aria-invalid={error !== null}
              className={field}
              placeholder="••••"
            />
          </div>
          {mode === 'create' && (
            <div>
              <label htmlFor="pin-confirm" className="label mb-1.5 block">
                PIN'i tekrar gir
              </label>
              <input id="pin-confirm" type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(e) => setConfirm(digits(e.target.value))} className={field} placeholder="••••" />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full">
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {mode === 'create' ? 'PIN\'i kaydet' : 'Onayla'}
        </button>
      </form>
    </div>
  )
}
