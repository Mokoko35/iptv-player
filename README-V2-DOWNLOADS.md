# IptvTest-Player-v2: İndir özelliği

Bu dal, `Mokoko35/IptvTest-Player-v2` deposundaki `src/` kaynağının (commit `a821f5e`, "ikinci commit") üstüne **İndir** özelliğini ekler.

| Yol | Ne |
|---|---|
| `web/` | `src/` + İndir özelliğinden derlenmiş arayüz. Depondaki `web/` klasörünün yerine kopyala (aynı yapı: `index.html` + `assets/`). |
| `src/` | Senin `src/` klasörün + İndir özelliği (tam kaynak). |
| `downloads-on-your-src.patch` | Senin `src/` klasörüne yapılan tüm değişiklikler. Deponun kökünde `git apply downloads-on-your-src.patch` ile uygulanır (yolları `src/...` ile başlar). |
| `csharp/MainWindow.Downloads.cs` | C# tarafı: `download`, `cancelDownload`, `openFolder`. `MainWindow.xaml.cs`'in yanına koy. |
| `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.oxlintrc.json`, `bun.lock` | Derlemede kullanılan yapılandırma (depoda yoktu). `bun install && bun run build` ya da `npm install && npx vite build` ile yeniden derlenir. |

## C# tarafında 4 ekleme (`MainWindow.xaml.cs`)

1. `OnMessage` içindeki `switch`'e, `case "fullscreen"` satırından önce:
```csharp
case "download": StartDownload(m.GetProperty("url").GetString() ?? "", m.GetProperty("title").GetString() ?? ""); break;
case "cancelDownload": CancelDownload(m.GetProperty("title").GetString() ?? ""); break;
case "openFolder": OpenFolder(m.GetProperty("path").GetString() ?? ""); break;
```
2. `OnClosing` içinde `_disposed = true;` satırından sonra: `CancelAllDownloads();`
3. `OnMainWindowLoaded` başında: `CleanupPartialDownloads();`
4. `play` komutunda yerel dosya için (boşluk / Türkçe karakter sorunu olmasın):
```csharp
var target = new Uri(url);
var media = target.IsFile ? new Media(_libVlc, target.LocalPath, FromType.FromPath) : new Media(_libVlc, target);
```

## Notlar
- `web/` içindeki eski derleme `src/` ile birebir aynı değildi: `src/` daha yeniydi (dil seçici, altyazı ayarları, ücretsiz listeler, "devam et / baştan başlat"). Yeni `web/` doğrudan `src/`'den derlendi.
- `src/webview.d.ts`: `window.chrome?.webview?.postMessage` için tür tanımı. `LanguageMenu.tsx` ve `SettingsPage.tsx` bunu kullanıyordu ve `tsc` hata veriyordu.
- Senin kaynağındaki birkaç eski lint uyarısına (ör. `ManageCategoriesModal.tsx`, `pip.ts` içinde effect'te `setState`) dokunmadım.
