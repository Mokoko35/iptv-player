/** Color presets. The actual values live in src/index.css under html[data-theme='...']. */
export type ThemeId = 'default' | 'neon' | 'navy' | 'forest'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  /** Colors for the preview card: [page, menu, accent]. Keep in step with index.css. */
  preview: { bg: string; nav: string; elev: string; accent: string }
}

export const THEMES: Theme[] = [
  { id: 'default', name: 'Varsayılan Koyu', description: 'Siyaha yakın zemin, turuncu vurgu', preview: { bg: '#0b0c10', nav: '#08090c', elev: '#14151a', accent: '#ff7a1a' } },
  { id: 'neon', name: 'Neon', description: 'Koyu mor zemin, parlak pembe vurgu', preview: { bg: '#090516', nav: '#06030f', elev: '#160e30', accent: '#ff2bd6' } },
  { id: 'navy', name: 'Lacivert', description: 'Derin lacivert zemin, mavi vurgu', preview: { bg: '#0a1226', nav: '#070d1c', elev: '#131f3e', accent: '#4da3ff' } },
  { id: 'forest', name: 'Orman', description: 'Koyu yeşil zemin, zümrüt vurgu', preview: { bg: '#09100d', nav: '#060c0a', elev: '#121e18', accent: '#34d399' } },
]

export const DEFAULT_THEME: ThemeId = 'default'

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id
}
