import { locale } from './i18n'
export const clock = (ms: number): string => new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })

export const dateTime = (ms: number): string => new Date(ms).toLocaleString(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export const megabytes = (bytes: number): string => `${(bytes / 1_048_576).toLocaleString(locale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} MB`

/** Minutes as short text: "45 dk", "1 sa", "1 sa 25 dk". */
export const minutesText = (minutes: number): string => {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} dk`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h} sa` : `${h} sa ${rest} dk`
}
