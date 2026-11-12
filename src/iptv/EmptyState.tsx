import type { ReactNode } from 'react'
import { ListPlus } from 'lucide-react'
import { useMedia } from './useMedia'

export function Empty({ icon, children }: { icon: 'add' | 'manage' | 'none'; children: ReactNode }) {
  const { openAdd } = useMedia()
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
      <div className="max-w-sm text-sm text-[var(--subtle)]">
        {children}
        {icon === 'add' && (
          <div className="mt-4">
            <button type="button" onClick={openAdd} className="btn-primary">
              <ListPlus size={16} aria-hidden="true" /> Liste ekle
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
