import { tr } from './i18n'
/** Color presets. The actual values live in src/index.css under html[data-theme='...']. */
export type ThemeId = 'default' | 'neon' | 'navy' | 'forest' | 'gold' | 'rose' | 'amethyst'

export interface Theme {
  id: ThemeId
  name: string
  description: string
  /** Colors for the preview card: [page, menu, accent]. Keep in step with index.css. */
  preview: { bg: string; nav: string; elev: string; accent: string }
}

export const THEMES: Theme[] = [
  { id: 'default', name: tr('Varsayılan Koyu'), description: tr('Siyaha yakın zemin, turuncu vurgu'), preview: { bg: '#0b0c10', nav: '#08090c', elev: '#14151a', accent: '#ff7a1a' } },
  { id: 'neon', name: tr('Neon'), description: tr('Koyu mor zemin, parlak pembe vurgu'), preview: { bg: '#090516', nav: '#06030f', elev: '#160e30', accent: '#ff2bd6' } },
  { id: 'navy', name: tr('Lacivert'), description: tr('Derin lacivert zemin, mavi vurgu'), preview: { bg: '#0a1226', nav: '#070d1c', elev: '#131f3e', accent: '#4da3ff' } },
  { id: 'forest', name: tr('Orman'), description: tr('Koyu yeşil zemin, zümrüt vurgu'), preview: { bg: '#09100d', nav: '#060c0a', elev: '#121e18', accent: '#34d399' } },
  { id: 'gold', name: tr('Noir Altın'), description: tr('Sıcak siyah zemin, şampanya altını vurgu, serif başlıklar'), preview: { bg: '#0c0b09', nav: '#080706', elev: '#1b1813', accent: '#d6b25e' } },
  { id: 'rose', name: tr('Gül Bordo'), description: tr('Koyu bordo zemin, gül altını vurgu, serif başlıklar'), preview: { bg: '#140b0f', nav: '#0e070a', elev: '#28141d', accent: '#ec9a8f' } },
  { id: 'amethyst', name: tr('Ametist'), description: tr('Derin mor zemin, lavanta vurgu'), preview: { bg: '#0e0b1a', nav: '#0a0813', elev: '#201a3a', accent: '#b094ff' } },
]

export const DEFAULT_THEME: ThemeId = 'default'

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id
}
