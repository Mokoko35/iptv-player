import type { ReactNode } from 'react'

export function SoonBadge() {
  return <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--subtle)]">Yakında</span>
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="display text-lg font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-[var(--subtle)]">{description}</p>}
      </div>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  )
}

export function Row({ label, hint, soon, children, htmlFor }: { label: string; hint?: string; soon?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:max-w-md">
        <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-medium text-[var(--ink-2)]">
          {label}
          {soon && <SoonBadge />}
        </label>
        {hint && <p className="mt-0.5 text-pretty text-xs text-[var(--subtle)]">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-accent' : 'bg-white/15'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-white/10 bg-black/30 p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-lg px-3 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
            value === o.value ? 'bg-accent font-semibold text-[var(--accent-ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
