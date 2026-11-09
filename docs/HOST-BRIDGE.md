# Host bridge: this UI inside a C# (WPF) app

The UI is the React app in this repository. In the C# app it runs in a **WebView2** control, and the video is played by
**LibVLC** in a native view *behind* the page. The page is transparent, so the video shows through the empty video
area, and the page draws all the buttons and menus on top.

```
 WPF window
 ├─ LibVLC video view      (bottom layer, plays the film)
 └─ WebView2 (transparent) (top layer, this UI)
```

The page and C# talk with JSON messages only:

| Direction | Page side | C# side |
|---|---|---|
| page → C# | `window.chrome.webview.postMessage({ cmd: 'play', url: '...' })` | `CoreWebView2.WebMessageReceived`, read `e.WebMessageAsJson` |
| C# → page | `window.chrome.webview.addEventListener('message', e => e.data)` | `CoreWebView2.PostWebMessageAsJson(json)` |

Outside the C# app (`window.chrome.webview` does not exist) the page plays with its own HTML5 player, so it still runs in
a normal browser with `npm run dev`.

## Page → C# (commands)

Every message is an object with a `cmd` field.

| `cmd` | Fields | What C# does |
|---|---|---|
| `ready` | `version` | The page has loaded. Answer with `{ evt: 'hello' }`. |
| `play` | `url`, `title`, `kind` (`live`/`movie`/`series`), `autoplay`, `volume` (0..1), `muted`, `subtitles` (`[{ url, label?, lang? }]`) | Start playing `url` (replaces what plays). Add each subtitle URL as a subtitle slave. |
| `stop` | | Stop and release the media. |
| `tracks` | | Send a `tracks` event now. The page sends this at 0.8, 2, 4, 8 and 15 seconds after `play` until it has received some tracks, because LibVLC finds the tracks a moment after it starts playing. |
| `pause` / `resume` | | |
| `seek` | `seconds` | Jump to that position. |
| `volume` | `value` (0..1) | |
| `mute` | `on` | |
| `audioTrack` | `id` | Select the audio track with that id (from your `tracks` event). |
| `subtitleTrack` | `id` | Select a subtitle track; `-1` turns subtitles off. |
| `addSubtitle` | `name`, `text` | A subtitle file the user picked, as text (.srt/.vtt). Save to a temp file and add it as a subtitle slave. |
| `layout` | `x`, `y`, `width`, `height` (CSS px of the page), `dpr`, `visible` | Put the video view exactly there (multiply by `dpr` for device pixels), or hide it when `visible` is false. |
| `fullscreen` | `on` | Make the window full screen (or leave it). The video area then covers the whole page, and `layout` follows. |

`layout` is sent whenever the video area moves or changes size: inline in Live TV and Favorites, in the player window, in
the corner mini player, and in full screen.

## C# → page (events)

Send objects with an `evt` field.

| `evt` | Fields |
|---|---|
| `hello` | `version` |
| `state` | any of `paused`, `buffering`, `time` (seconds), `duration` (seconds, 0 for live), `volume` (0..1), `muted`. Send it about 4 times a second while playing, and on every change. Fields you leave out stay as they were. |
| `tracks` | `audio`: `[{ id, label, lang?, selected }]`, `subtitles`: `[{ id, label, lang?, selected }]`. Send when the media's tracks are known and after any change. Entries with `id: -1` ("Disable") are ignored by the page. |
| `ended` | |
| `error` | `message` (shown over the video) |
| `fullscreen` | `on` — tell the page when the window enters or leaves full screen by other means. |
| `activity` | (none) — optional. Send it when the mouse moves over the video view. If the page does not get mouse events there (the native video view sits above the page), this still brings the controls back. |

Any other message is ignored.

## Audio and subtitle tracks

- LibVLC does not know the tracks when `Playing` fires; they appear a moment later. Send `tracks` on `ESAdded` / `ESSelected`
  / `ESDeleted` (a short debounce, 200 ms, is enough), and also answer the page's `tracks` command.
- `PostWebMessageAsJson` must be called on the **UI thread**. LibVLC raises its events on its own thread, so wrap every
  `Post(...)` in `Dispatcher.BeginInvoke`. A call from the wrong thread throws, and if the exception is swallowed the
  message simply never arrives (this looks exactly like "tracks never come").
- Do not call back into LibVLC (`Stop`, `Play`, ...) from inside an event handler; read the track lists only.
- The language button is always there for films and episodes. For a live channel it appears once LibVLC reports more than
  one audio track or any subtitle track.

## The controls do not show over the video

The controls (play, progress, full screen, language) are drawn by the page, not by LibVLC. They show for 3 seconds when
a video starts and whenever the mouse moves over the video area. If they never show, check, in this order:

1. **Is the page drawn above the video?** In the WebView2 dev tools (F12) run
   `document.querySelector('.player-surface').style.background = 'rgba(255,0,0,.5)'`. If the video area does not turn red
   over the picture, the video view is above the page (airspace, see below) and nothing the page draws can be seen there.
2. **Does the page get the mouse?** Run `localStorage.setItem('iptv-player:debug-osd', '1')`, then move the mouse over
   the video. The console prints the position, the video rectangle, whether the mouse is inside it, and which element is
   under the mouse (`hit`). `hit` should be the player's own element, not a menu or another window.
3. **Is C# in the way?** If the console prints nothing while the mouse moves over the video, the native video view is
   taking the mouse. Send `{ evt: 'activity' }` from C# when the video view sees mouse movement.

## Setting up WebView2

```csharp
// WebView2CompositionControl lets the page be transparent and overlap other WPF content (the plain WebView2 control
// is a separate window and cannot).
var env = await CoreWebView2Environment.CreateAsync(null, null, new CoreWebView2EnvironmentOptions(
    // IPTV servers do not send CORS headers and many only speak http. The UI is local and loads no third-party
    // scripts, so it is fine to let it read their lists, guides and artwork directly.
    "--disable-web-security --allow-running-insecure-content"));
await webView.EnsureCoreWebView2Async(env);

webView.DefaultBackgroundColor = System.Drawing.Color.Transparent;      // before the first navigation
webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;      // right-click is "back" in full screen
webView.CoreWebView2.SetVirtualHostNameToFolderMapping("app.local", uiFolder, CoreWebView2HostResourceAccessKind.Allow);
webView.CoreWebView2.WebMessageReceived += OnMessage;
webView.Source = new Uri("https://app.local/index.html");               // uiFolder = the unzipped dist/ folder
```

The page keeps its lists in IndexedDB and its settings in localStorage, both under `https://app.local`; keep the same
host name (and the same WebView2 user data folder) between runs.

## Reference sketch for the C# side (not compiled or run)

```csharp
void OnMessage(object? _, CoreWebView2WebMessageReceivedEventArgs e)
{
    using var doc = JsonDocument.Parse(e.WebMessageAsJson);
    var m = doc.RootElement;
    switch (m.GetProperty("cmd").GetString())
    {
        case "ready": Post(new { evt = "hello", version = 1 }); break;

        case "play":
        {
            var media = new Media(_libVlc, new Uri(m.GetProperty("url").GetString()!));
            foreach (var s in m.GetProperty("subtitles").EnumerateArray())
                media.AddSlave(MediaSlaveType.Subtitle, 4, s.GetProperty("url").GetString()!);
            _player.Volume = (int)(m.GetProperty("volume").GetDouble() * 100);
            _player.Mute = m.GetProperty("muted").GetBoolean();
            _player.Play(media);
            break;
        }
        case "stop":          _player.Stop(); break;
        case "pause":         _player.SetPause(true); break;
        case "resume":        _player.SetPause(false); break;
        case "seek":          _player.Time = (long)(m.GetProperty("seconds").GetDouble() * 1000); break;
        case "volume":        _player.Volume = (int)(m.GetProperty("value").GetDouble() * 100); break;
        case "mute":          _player.Mute = m.GetProperty("on").GetBoolean(); break;
        case "audioTrack":    _player.SetAudioTrack(m.GetProperty("id").GetInt32()); break;
        case "subtitleTrack": _player.SetSpu(m.GetProperty("id").GetInt32()); break;
        case "addSubtitle":
        {
            var path = Path.Combine(Path.GetTempPath(), "iptv-sub-" + Guid.NewGuid() + Path.GetExtension(m.GetProperty("name").GetString()));
            File.WriteAllText(path, m.GetProperty("text").GetString()!);
            _player.AddSlave(MediaSlaveType.Subtitle, new Uri(path).AbsoluteUri, true);
            break;
        }
        case "layout":
        {
            var dpr = m.GetProperty("dpr").GetDouble();   // CSS px -> WPF DIPs is 1:1 when the WebView fills the window
            VideoHost.Visibility = m.GetProperty("visible").GetBoolean() ? Visibility.Visible : Visibility.Collapsed;
            VideoHost.Margin = new Thickness(m.GetProperty("x").GetDouble(), m.GetProperty("y").GetDouble(), 0, 0);
            VideoHost.Width = m.GetProperty("width").GetDouble();
            VideoHost.Height = m.GetProperty("height").GetDouble();
            break;
        }
        case "fullscreen": SetWindowFullScreen(m.GetProperty("on").GetBoolean()); break;
    }
}

void Post(object o) => webView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(o));

// LibVLC events -> the page
_player.TimeChanged += (_, a) => Post(new { evt = "state", time = a.Time / 1000.0 });
_player.LengthChanged += (_, a) => Post(new { evt = "state", duration = a.Length / 1000.0 });
_player.Playing += (_, _) => { Post(new { evt = "state", paused = false, buffering = false }); SendTracks(); };
_player.Paused += (_, _) => Post(new { evt = "state", paused = true });
_player.Buffering += (_, a) => Post(new { evt = "state", buffering = a.Cache < 100 });
_player.EndReached += (_, _) => Post(new { evt = "ended" });
_player.EncounteredError += (_, _) => Post(new { evt = "error", message = "Oynatılamadı." });

void SendTracks() => Post(new
{
    evt = "tracks",
    audio = _player.AudioTrackDescription.Select(t => new { id = t.Id, label = t.Name, selected = t.Id == _player.AudioTrack }),
    subtitles = _player.SpuDescription.Select(t => new { id = t.Id, label = t.Name, selected = t.Id == _player.Spu }),
});
```

## Things to check in your C# project

- **Airspace.** The classic WPF `WebView2` control and LibVLC's `VideoView` are both native windows, and a native window
  cannot show another one through its transparent parts. If the video does not show through, use
  `WebView2CompositionControl` for the page and give LibVLC a WPF-drawn surface (video callbacks into a
  `WriteableBitmap`/D3D image), or put the transparent WebView in a layered overlay window above the video window.
  This repository does not decide that for you.
- **Full screen.** While it is on (the page asked for it, or C# sent `{ evt: 'fullscreen', on: true }`), the page sets `data-fullscreen` on `<html>` and hides the menu, header and every other panel; only the player and its controls stay, and the video area covers the whole page. The page asks for it with `{ cmd: 'fullscreen' }`; it does not use the browser's Fullscreen API in the
  C# app (that API would paint an opaque black backdrop).
- **Right-click in full screen** means "back" for films, so keep `AreDefaultContextMenusEnabled = false`.
- **Autoplay.** LibVLC plays without a user gesture, so nothing to configure.
