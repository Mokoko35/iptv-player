# IPTV Player

> Built with Arc Studio

Project memory for future agents and humans.

## What this app does

An IPTV player UI that is hosted by a C# WPF app (WebView2 for this UI, LibVLC for the video behind it) and also runs in a browser. Users add M3U / Xtream lists and browse Live TV, Movies and Series with a sidebar, card grids, a category manager, settings and, for Xtream portals, real movie and series details. It provides no content.

## Tech stack

- React 18, Vite, TypeScript, Tailwind CSS 3
- hls.js and mpegts.js for playback; lucide-react for icons
- IndexedDB (lists, channels, API cache) and localStorage (favorites, settings, hidden categories)
- No Electron. The C# host talks to the page through `window.chrome.webview` (`src/iptv/host.ts`, `docs/HOST-BRIDGE.md`)
- No wallet, blockchain or backend code

## Key files

- `src/main.tsx` - entry; keep the `installShareSync()` call
- `src/App.tsx` - shell: sidebar, pages, dialogs
- `src/iptv/` - the app: routing (`router.ts`, hash based), state (`MediaProvider.tsx`, `context.ts`, `useMedia.ts`), pages, cards, dialogs
- `src/iptv/PlayerOverlay.tsx` - the one player element; it is a large modal or a docked mini player (`playerMode`), so minimizing never restarts the stream. Pages must not render their own player.
- `src/iptv/m3u.ts`, `xtream.ts`, `xtreamApi.ts` - playlist parsing and Xtream `player_api.php` calls (cached)
- `src/iptv/CategoryRail.tsx` - category panel (`CategorySidebar`, full height, independent of the main menu) and `CategoryChips` for small screens; `BrowsePage.tsx` shows the sticky breadcrumb title
- `src/iptv/themes.ts` + `html[data-theme]` blocks in `src/index.css` - themes are sets of color channels (`--bg-rgb`, `--accent-rgb` ...); Tailwind colors `accent`, `danger`, `canvas`, `nav`, `rail`, `elev` read them. Use these, never hard-coded hex colors, and never `bg-[var(--x)]/NN` (Tailwind drops the opacity)
- `src/iptv/adult.ts`, `pin.ts`, `PinDialog.tsx` - adult filter (applied in `MediaProvider` so every view agrees) and the hashed 4-digit PIN
- `src/iptv/countries.ts`, `CountrySelect.tsx` - country detection (category first, then name) and the native dropdown at the top of the category sidebar. The filter is applied in `MediaProvider` and never removes channels with an unknown country. Category management reads `allParts` (not country-filtered) so saving its hidden list cannot lose categories hidden under another country. Country prefixes are parsed generically (any punctuation/symbol separator, flags, invisible characters) in `parsePrefix` ("Diğer")
- `src/iptv/LivePage.tsx`, `FavoritesPage.tsx`, `InlinePlayerColumn.tsx` - the 4-column pages (menu | categories | list | player). The player is not inside the page: `PlayerOverlay` draws the single player element over the empty box `InlinePlayerColumn` registers (`inlineSlot`), so the stream never restarts when the player moves between page, window and corner. Movies and Series keep the card grid (`BrowsePage`)
- `src/iptv/Player.tsx` - the HTML5 player (browser) and its own controls (auto-hide after 3 s, keyboard, full screen); `PlayerOverlay.tsx` places it as a window or the corner mini player; `EpgTimeline.tsx` is the guide under it. The player must also never be left in full screen while its controls are gone: shrinking to the corner (`compact`) leaves full screen, and "back" (X or right-click on a film/episode) is `goBack` in `PlayerOverlay`. The player must never be remounted per channel (no `key={channel.id}`): remounting drops full screen. Previous/next channel walks `channelNav` from `MediaProvider` (the list the channel was picked from)
- `src/iptv/sanitize.ts` - the one place that repairs M3U titles, groups and arrows (`▸ ▹ ►` -> `▸`). It runs when a list is parsed AND when it is read back from storage, so older saved lists get fixed too. `tmdb.ts` - title parsing (`Title | 2026 | TR-ENG` -> title + year) and the TMDB lookup
- `src/iptv/tracks.ts`, `LanguageMenu.tsx` - the one audio+subtitle menu for films and episodes (always visible there). In the C# app the tracks come from LibVLC through `host.ts`; in a browser from the HLS API, the video element, portal subtitle files and files the user adds
- `src/iptv/host.ts`, `HostPlayer.tsx`, `PlayerChrome.tsx` - the C# bridge. `IS_HOST` (is `window.chrome.webview` there?) picks `HostPlayer` instead of the HTML5 `PlayerCore`: no `<video>`, the page reports the video area (`layout`) and sends `play`/`pause`/`seek`/`audioTrack`... and C# answers with `state`/`tracks`/`error` events (`reduceHost` is pure and tested). In the host the page is transparent (`html[data-host]` in `index.css`); anything over the video area must stay see-through, which is why `PlayerOverlay` drops container backgrounds and uses `HoleBackdrop`. Full screen is a host command, not the DOM Fullscreen API. Keep the protocol in `docs/HOST-BRIDGE.md` in step with `host.ts`
- `src/iptv/xmltv.ts`, `useEpg.ts`, `EpgPanel.tsx` - program guide: streaming XMLTV reader (keeps only programmes around now), cached per list in IndexedDB, Now/Next lookup
- `src/iptv/load.ts`, `LoadProgressView.tsx`, `ActivityPill.tsx`, `Skeletons.tsx` - streamed list download with live counts, and loading UI
- `src/iptv/Splash.tsx` - launch splash
- `src/iptv/db.ts`, `storage.ts`, `prefs.ts` - persistence
- `src/index.css` - tokens and the `.theme-media` orange-on-dark theme
- `src/tracing.ts`, `src/console-capture.ts`, `src/lib/share.ts` - Arc Studio platform helpers; leave as they are

## Notes

- Routing uses `#/...`, so any static host or a WebView2 virtual host name works.
- Browsers block most IPTV servers (CORS) and `http://` lists on `https://` pages; the C# host starts WebView2 with `--disable-web-security --allow-running-insecure-content` to remove those limits (see docs/HOST-BRIDGE.md).
- Movie and series details use the Xtream API, so they need a portal login (or a `get.php` address).

## To run

```bash
bun install
bun run dev      # http://localhost:5173
bun run check    # lint and typecheck
bun run build
```
- Full screen on a live channel: `PlayerChrome` draws `GuideBand` (program name, time left / length, progress bar) under the controls, fed by `epg.nowNext` through `PlayerOverlay` (`guide`). The controls' hide delay is `prefs.epgSeconds` (3-10 s, default 5) there and 3 s everywhere else (`hideAfterMs`). Not shown for films and episodes.
