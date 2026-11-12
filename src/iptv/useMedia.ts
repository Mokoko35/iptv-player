import { useContext } from 'react'
import { MediaContext, type Media } from './context'

export function useMedia(): Media {
  const ctx = useContext(MediaContext)
  if (!ctx) throw new Error('useMedia must be used inside <MediaProvider>')
  return ctx
}
