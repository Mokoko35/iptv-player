import { createContext } from 'react'
import type { Category, Kind, Partition } from './kinds'
import type { Prefs } from './prefs'
import type { useRoute } from './router'
import type { Favorites } from './storage'
import type { Channel } from './types'
import type { PlaylistsState } from './usePlaylists'
import type { Catalog } from './useCatalog'
import type { Epg } from './useEpg'
import type { XtreamLogin } from './types'
import type { CountryCount } from './countries'

export interface ChannelNav {
  /** 1-based position of the playing channel in the list it was picked from. */
  position: number
  total: number
  step: (delta: -1 | 1) => void
}

export type PlayerMode = 'closed' | 'modal' | 'inline'

export interface Media {
  lists: PlaylistsState
  /** Portal login for the active list, when it is an Xtream-style portal. Used for film and series details. */
  xtream: XtreamLogin | null
  catalog: Catalog
  epg: Epg
  /** Film or series whose detail window is open. */
  detail: Channel | null
  /** Opens the detail window for films and portal series, and plays everything else straight away. */
  openItem: (channel: Channel, queue?: Channel[]) => void
  /** Previous/next channel while a live channel plays. Null for films, episodes, or a list of one. */
  channelNav: ChannelNav | null
  closeDetail: () => void
  /** All channels of the active list, split into live, movies and series. */
  parts: Partition
  /** Every channel, whatever the country filter says. Category management works on this, so the two never interfere. */
  allParts: Partition
  /** The same as `parts`, without channels in categories the user hid. */
  visible: Partition
  /** All categories of a kind, for category management. Not affected by the country filter. */
  categories: (kind: Kind) => Category[]
  /** The order the user arranged the categories in (names). Empty means A to Z. */
  orderFor: (kind: Kind) => string[]
  setOrderFor: (kind: Kind, names: string[]) => void
  hiddenFor: (kind: Kind) => Set<string>
  setHiddenFor: (kind: Kind, names: string[]) => void
  favorites: Favorites
  isFavorite: (channel: Channel) => boolean
  toggleFavorite: (channel: Channel) => void
  current: Channel | null
  /** Starts a channel, film or episode in the large player window. */
  play: (channel: Channel, options?: { fullscreen?: boolean }) => void
  /** A film or episode asked to start in full screen. The player takes it once and clears it. */
  fullscreenPending: boolean
  fullscreenHandled: () => void
  playerMode: PlayerMode
  /** True on Live TV and Favorites when the window is wide enough: the player sits in the page instead of a window. */
  inlineHost: boolean
  /** The empty box in the page that the inline player is drawn over. */
  inlineSlot: HTMLElement | null
  setInlineSlot: (el: HTMLElement | null) => void
  /** Stops playback and removes the player. */
  stopPlayer: () => void
  /** Countries found in the list, with their channel counts. Empty when no channel has a country. */
  countryOptions: CountryCount[]
  /** Channels with no recognized country ("Diğer"). They stay visible whatever country is picked. */
  otherCount: number
  /** Countries ticked in the country filter. Empty means every country is shown. */
  activeCountries: string[]
  setCountries: (codes: string[]) => void
  prefs: Prefs
  updatePrefs: (patch: Partial<Prefs>) => void
  route: ReturnType<typeof useRoute>
  adding: boolean
  openAdd: () => void
  closeAdd: () => void
  managing: Kind | null
  openManage: (kind: Kind) => void
  closeManage: () => void
}

export const MediaContext = createContext<Media | null>(null)
