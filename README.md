# IPTV Player

A media-center style IPTV player interface. It runs inside a C# (WPF) app with WebView2, where LibVLC plays the video behind the transparent page, and it also runs in a normal browser with its own HTML5 player. Add your own playlists from an M3U address, an Xtream-style portal login, a file or pasted text, then browse live TV, movies and series in a clean dark interface. The app provides no channels or content; it only plays lists you add.

Built with [Arc Studio](https://studio.arc.io)

## Features

- **Add lists several ways:** M3U address, portal login (server, username, password), `.m3u` / `.m3u8` file, or pasted text. Keep several lists and switch between them.
- **Live TV, Movies and Series** in separate sections: full-width card grids with their own full-height category panel beside them (All, Favorites, then each category), a title that shows where you are (for example `Movies > Action`), search and favorites. The category panel works the same whether the main menu is open or collapsed.
- **Player window:** clicking a channel, movie or episode opens a large player window. Closing it stops the stream; there is no small floating player. On Live TV and Favorites the video plays in the page itself, and leaving those pages stops it. A button in the player's control bar (and Settings, Playback) sets the picture shape: the film's own shape (default), filled and cropped, stretched, or forced to 16:9 or 4:3.
- **Real movie and series details** from Xtream portals: poster, synopsis, cast, director, rating, trailer link, and seasons with episodes.
- **Category manager:** show or hide categories per section.
- **Category order:** in the category manager, move any category to the top, up one, down one or to the bottom, and tick which ones to show. The category list follows the saved order and visibility.
- **Live TV layout:** four columns on a wide window: the main menu, the categories, the channels of the picked category (logo, name and what is on now), and a fixed player with the program guide under it. Clicking a channel plays it right there, no window opens. On a narrow window it falls back to the player window.
- **Favorites:** a menu item with the same four columns: pick Live TV, Movies or Series in the second column, and your favorites of that type are listed in the third.
- **Live TV player:** previous and next channel buttons (also the left and right arrow keys, walking through the list you picked the channel from), the channel logo and name over the video, a program timeline under it (now with a progress bar, plus the next three), and sleek controls that hide after 3 seconds without activity. Space pauses, M mutes, F toggles full screen.
- **Clean titles and categories:** titles that carry list attributes (`Title" tvg-logo="..." group-title="TR ▸ Vizyon",...`) are repaired, the category is taken from `group-title`, and arrows such as `▸` and `▹` are treated as one, so films and series are no longer left under "Kategorisiz". Lists saved earlier are repaired when they open.
- **TMDB details (optional):** add a free TMDB key in Settings and film and series pages show the right poster, summary, cast and rating, looked up with the cleaned title and year.
- **Audio and subtitles:** films and episodes have a language button next to the full screen button. Its menu lists the audio languages and the subtitles, and lets you add a subtitle file (.srt or .vtt). In the C# app the tracks come from LibVLC; in a browser, from the HLS playlist, the video file when the engine exposes them, and subtitle files the portal lists.
- **Full screen for films and episodes:** pressing Play on a film or an episode opens it full screen. In full screen, the X button and a right-click both mean "back": they leave full screen and close the film.
- **Adult content filter:** categories and channels tagged XXX, Adult, +18 and similar are hidden by default. Turning the filter off or on, and changing the PIN, asks for a 4-digit PIN that you set (stored on the device as a salted hash).
- **Country filter:** a dropdown at the top of the category list (and above the category chips on a phone). Pick a country to show its categories in Live TV, Movies and Series. Categories whose country is not recognized are listed under "Diğer" and stay visible. The category list follows the picked country (only its categories and "Diğer"); choosing all countries brings everything back. Category management always shows every category, so hiding and the country filter never interfere with each other. The country is read from the start of the category name (`TR |`, `TR:`, `[TR]`, `(TR)`, `TR -`, `TR ▸`) or from names such as `TR: TRT 1`.
- **Themes:** four color presets (Default Dark, Neon, Navy, Forest) that change the accent color, background shades and scrollbar color. Your choice is saved.
- **Program guide (EPG):** the Live TV cards and the player window show what is on now and next, with a progress bar. It reads the portal's `xmltv.php` guide, or any XMLTV address you set in Settings (`.xml` and `.xml.gz`). Watching a live channel in full screen also shows a thin band with the controls: the program's name, the time left of its length, and a bar for how far it has got. It stays for as long as you set in Settings, Program guide (3 to 10 seconds, 5 by default), and fades with the controls.
- **Clear loading feedback:** adding a list shows a live progress screen with the number of channels, movies and series found as it downloads; background loading shows a status pill, and grids show placeholders while they fill.
- **Collapsible menu:** a hamburger button shrinks the left menu to icons so the grids get more room.
- **Launch screen:** a short animated splash with the logo when the app opens.
- **Dark, thin scrollbars** that match the theme.
- **Settings:** list management, card size, logos, autoplay and program guide options.
- **Playback** of HLS (`.m3u8`) and MPEG-TS (`.ts`) streams, plus common video files.
- **Private by design:** lists, favorites and settings stay on your device.

## Inside the C# app (WebView2 + LibVLC)

The UI is built to be hosted by a C# WPF app. The page talks to C# with `window.chrome.webview.postMessage` (for example `{ cmd: 'play', url: '...' }` when a channel is chosen) and listens for the answers (time, tracks, errors). The page background is transparent so the video behind it shows through, and full screen is done by the C# window.

- `iptv-ui-build.zip` is a ready build of the UI. Unzip it and map the folder to a host name with WebView2.
- `docs/HOST-BRIDGE.md` lists every message in both directions and has a reference sketch of the C# side.
- Without `window.chrome.webview` (a normal browser), the page uses its own HTML5 player, so you can work on the UI with `npm run dev`.

## Development

Prerequisites: [Node.js](https://nodejs.org) 20 or newer, or [Bun](https://bun.sh).

```
npm install
npm run dev
```

Open the address Vite prints. Other scripts:

- `npm run build`: production build into `dist/`
- `npm run check`: lint and type check
- `iptv-ui-build.zip` is made from `dist/` after a build

With Bun, use `bun install` and `bun run ...` instead.

### Environment variables

None.

## Notes

- Flag emoji do not draw on Windows by themselves, so the UI bundles a small flags-only font (Twemoji Country Flags, a subset of Twemoji by Twitter, CC-BY 4.0, packaged by country-flag-emoji-polyfill, MIT).

- The program guide is matched to channels by the list's `tvg-id`, or by channel name when there is none. Lists added before this feature have no `tvg-id` saved, so update them once. Large guides can take a few minutes to download; only the programmes around the current time are kept on the device.
- Movie and series details need a list added as a portal login or as a `get.php` address. Plain M3U lists play straight from the grid.
- Portal responses are cached on your device for up to 12 hours (details for up to 7 days).
- Lists and posters are stored in the browser's IndexedDB and local storage.
