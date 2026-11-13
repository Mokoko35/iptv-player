# IptvTest-Player-v2: İndir özelliği

Bu dal, `Mokoko35/IptvTest-Player-v2` deposundaki `src/` kaynağının (commit `a821f5e`, "ikinci commit") üstüne **İndir** özelliğini ekler.

| Yol | Ne |
|---|---|
| `iptv-ui-build.zip` | `web/` klasörünün zip hâli (içinde `index.html` ve `assets/`). Aç ve deponun `web/` klasörünün yerine koy. |
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

## İndirilenler sayfası (sol menü)

- Sol menüde (ve telefondaki alt menüde) **İndirilenler** öğesi var; yanında biten indirmelerin sayısı yazar. Adres `#/downloads`.
- Sayfada **Filmler | Diziler** sekmeleri var. Filmler sekmesinde yalnızca filmler, Diziler sekmesinde yalnızca diziler görünür. İlk açılışta içinde bir şey olan sekme seçili gelir.
- Diziler dizi adına göre gruplanır, bölümler sezon ve bölüm sırasına dizilir.
- Bir karta tıklayınca dosya tam ekranda oynar. Dizide, indirilmiş bölümler önceki/sonraki bölüm düğmelerine girer.
- Her kartta: poster, boyut ve tarih; `Klasörü Aç` ve listeden kaldır (dosya silinmez). Devam eden indirmede yüzde çubuğu ve `İptal`, hatalı olanda `Tekrar dene` var.
- Poster, indirme başlarken içeriğin posterinden kaydedilir (`logo`). Eski kayıtlarda poster yoksa baş harfli yer tutucu çıkar.
- Ayarlar > İndirilenler sekmesi de duruyor.
- Yerel `file:///` adresleri artık her zaman film sayılır (arama çubuğu, süre), uzantısı ne olursa olsun.

## Altyazı ayarları (düzeltme)

Ayrıntılı rapor: [`docs/ALTYAZI-RAPORU.md`](docs/ALTYAZI-RAPORU.md).

- Ayarlar sayfasının en altındaki, tüm sekmelerde görünen "Altyazı Ayarları" bölümü silindi. OSD menüsündeki boyut ve gecikme kaydırıcıları da silindi: C# tarafında `subtitleSettings` için işleyici yoktu, hiçbiri çalışmıyordu. Boyut ve renk LibVLC 3'te oynarken değiştirilemez.
- Yerine, yalnızca C# destekliyorsa görünen **Altyazı senkronu** (±50 ms, ±500 ms, sıfırla) eklendi. C# tarafı için 2 satır: rapordaki 4. bölüm.

## Orta boy oynatıcı (pencere) kaydırması

Oynatıcı penceresi ekrandan uzun olunca (küçük pencere) bütün pencere kayıyordu. Videoyu C# çizdiği için ve C# bir kaydırma alanına kırpılamadığı için video, metinle birlikte yukarı kayıp pencerenin dışına çıkıyordu. Artık video sabit; yalnızca altındaki bilgi paneli (program rehberi, düğmeler) kendi içinde kayıyor. Video genişliği, bilgi paneline yer kalsın diye yüksekliğe göre biraz daha erken küçülüyor.


## Temalar (güncelleme)

Ayarlar > Temalar'a üç yeni tema eklendi (toplam 7):

- **Noir Altın:** sıcak siyah zemin, şampanya altını vurgu, serif (Playfair Display) başlıklar.
- **Gül Bordo:** koyu bordo zemin, gül altını vurgu, serif başlıklar.
- **Ametist:** derin mor zemin, lavanta vurgu.

Üçünde de köşelerde çok hafif bir ışıma var (masaüstü uygulamasında sayfa şeffaf olduğu için ışıma kapalıdır, video etkilenmez). Değişen dosyalar: `src/index.css`, `src/iptv/themes.ts`, `index.html` (Playfair Display yazı tipi). Seçim önceki gibi kaydediliyor.
