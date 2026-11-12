/** A subtitle file the portal offers (WebVTT or SRT). */
export interface SubtitleSource {
  url: string
  label?: string
  lang?: string
}

export interface Channel {
  /** Stable id derived from the stream URL. */
  id: string
  name: string
  url: string
  logo?: string
  group?: string
  /** EPG channel id from the list (tvg-id), used to find the program guide for a channel. */
  tvgId?: string
  /** Set for series from an Xtream portal: the series id used by get_series_info. */
  seriesId?: string
  /** Synopsis, shown under the player. Filled in from the portal's metadata. */
  description?: string
  /** Short line under the title, for example "Sezon 1 · Bölüm 2". */
  subtitle?: string
  /** Score out of 10, when the portal provides one. */
  rating?: number
  /** Subtitle files the portal lists for this film or episode. */
  subtitleTracks?: SubtitleSource[]
}

export type SourceKind = 'url' | 'xtream' | 'file' | 'text'

export interface XtreamLogin {
  server: string
  username: string
  password: string
}

export interface PlaylistMeta {
  id: string
  name: string
  kind: SourceKind
  /** M3U address, for kind "url" and "xtream" (so the list can be refreshed). */
  sourceUrl?: string
  xtream?: XtreamLogin
  channelCount: number
  updatedAt: number
}
