# arc-rapor

`v2-downloads` dalındaki arayüz (React) için tüm değişikliklerin sürekli güncellenen raporu. **En yeni kayıt en üstte.** Her değişiklikten sonra yeni bir kayıt eklenir.

Her kayıtta: ne değişti, hangi dosyalar, C# tarafında ne gerekir, nasıl denenir, bilinen sınırlar.

---

## 2026-11-13 · Çok dilli arayüz (7 dil) · `7a69bdf`

**Ne:** Türkçe, English, Deutsch, Русский, العربية (sağdan sola), Español, Français. Dil seçici gerçekten dili değiştiriyor ve yalnızca bu yedi dili gösteriyor; bayraklar projedeki yazı tipinden geliyor (internetsiz çalışır). Yaklaşık 420 metin çevrildi. Tarih, saat, sayı ve TMDB bilgileri (özet, oyuncular) seçili dilde gelir. Dil değişince oynayan yayın kesilmez.

**Dosyalar:**
- Yeni: `src/iptv/i18n.ts` (`t()`, `tr()`, `setLang`, `LANGUAGES`), `src/iptv/i18n/{en,de,ru,ar,es,fr}.ts`
- Yeniden yazıldı: `LanguageSelectorModal.tsx`
- Metinleri `t('...')` ile saran: yaklaşık 40 `.tsx` / `.ts` dosyası (`SettingsPage`, `Sidebar`, `PlayerChrome`, `DetailDialog`, `HomePage` vb.)
- `MediaProvider.tsx` / `context.ts`: `lang`, `setLanguage`. `main.tsx`: `applyDocumentLang()`. `tmdb.ts`: seçili dil TMDB'ye gider, önbellek anahtarına dil eklendi.
- Arapça için: `Sidebar.tsx`, `App.tsx`, `CountrySelect.tsx` mantıksal yönlere (`start`/`end`) çevrildi; `text-left`/`text-right` → `text-start`/`text-end`.

**C# tarafı:** Gerekmiyor.

**Dene:** Ayarlar > Genel > Arayüz dili (ya da Ana Sayfa > Dil Değiştir) → bir dil seç, menüler hemen değişir. Arapça'da sol menü sağa geçer.

**Sınırlar:** Çeviriler gözden geçirilmedi (özellikle Arapça, Rusça). Arapça yerleşim ilk aşamada. "Hazır Ücretsiz Listeler" adları, kanal/kategori adları ve bölüm başlıkları çevrilmez. Ayrıntı: `docs/DIL-RAPORU.md`.

---

## 2026-11-13 · Üç yeni tema · `e0d1f56`

**Ne:** Ayarlar > Temalar'a üç tema eklendi (toplam 7): **Noir Altın** (sıcak siyah, şampanya altını, serif başlıklar), **Gül Bordo** (koyu bordo, gül altını, serif başlıklar), **Ametist** (derin mor, lavanta). Köşelerde çok hafif ışıma (masaüstü uygulamasında şeffaf sayfa nedeniyle kapalı).

**Dosyalar:** `src/index.css` (tema blokları, `--display-font`, ışıma), `src/iptv/themes.ts`, `index.html` (Playfair Display yazı tipi).

**C# tarafı:** Gerekmiyor.

**Dene:** Ayarlar > Temalar. Metin kontrastı hepsinde WCAG AA'nın (4,5) üstünde (7,6 ile 9,7).

**Sınırlar:** Serif başlıklar Google Fonts'tan gelir; internet yoksa Georgia'ya düşer.

---

## 2026-11-12 · Oynatıcı penceresinde video sabit, bilgi paneli kayar · `8f1a8d5`

**Ne:** Orta boy oynatıcı penceresinde tekerlekle kaydırınca video da yukarı kayıyordu (C# videosu bir kaydırma alanına kırpılamaz). Pencere artık iki parça: üstte sabit video, altta kendi içinde kayan bilgi paneli. Kısa pencerede video biraz daha erken küçülür (`100dvh − 460px`).

**Dosyalar:** `src/iptv/PlayerOverlay.tsx`.

**C# tarafı:** Gerekmiyor.

---

## 2026-11-12 · Altyazı ayarları kaldırıldı, altyazı senkronu eklendi · `8a66bbd`

**Ne:**
- `SettingsPage.tsx`'te sekmelerin dışına konmuş "Altyazı Ayarları" bloğu (her sekmede görünüyordu) ve OSD menüsündeki boyut/gecikme kaydırıcıları silindi. İkisi de `{ cmd: 'subtitleSettings' }` gönderiyordu, C#'ta bu komutun işleyicisi yoktu.
- Boyut ve renk LibVLC 3'te oynarken değiştirilemez; senkron (ms) `SetSpuDelay` ile değiştirilebilir. "Ses ve altyazı" menüsüne **Altyazı senkronu** eklendi (−500, −50, Sıfırla, +50, +500 ms; en çok ±30 sn). Film değişince sıfırlanır.
- Kontrol, C# `hello` mesajında `subtitleDelay: true` göndermedikçe **görünmez**.

**Dosyalar:** `LanguageMenu.tsx`, `SettingsPage.tsx`, `HostPlayer.tsx`, `host.ts`. Rapor: `docs/ALTYAZI-RAPORU.md`.

**C# tarafı (2 satır):**
```csharp
PostEvent(new { evt = "hello", version = 1, frontLayer = true, subtitleDelay = true });
// OnMessage switch:
case "subtitleDelay": try { _player.SetSpuDelay(m.GetProperty("ms").GetInt64() * 1000); } catch { } break;
```

**Dene:** Altyazılı bir film aç, bir altyazı seç, `+500`'e bas; altyazı yarım saniye geç görünmeli.

**Sınır:** Boyut ve renk için tek yol filmi `media.AddOption` ile yeniden açmak ya da altyazıyı sayfada HTML ile çizmek (yalnızca ayrı `.srt`/`.vtt` dosyasında).

---

## 2026-11-12 · İndirilenler sayfası (Filmler | Diziler) · `d9e78eb`

**Ne:** Sol menüde Favoriler ile Ayarlar arasında "İndirilenler". İçinde **Filmler | Diziler** sekmeleri; her birinin sayısı görünür. Kartlar posterli; tıklayınca dosya tam ekranda oynar. Diziler dizi adına göre gruplanır, bölümler sezon/bölüm sırasıyla dizilir; sıradaki/önceki bölüm düğmeleri indirilmiş bölümler arasında çalışır. Kartta "Klasörü Aç", listeden kaldır, devam eden indirmede yüzde ve İptal, hatalıda "Tekrar dene". Telefon alt menüsü 7 öğe oldu. `file:///` adresleri her zaman film sayılır.

**Dosyalar:** yeni `DownloadsPage.tsx`; `Sidebar.tsx`, `router.ts`, `App.tsx`, `downloads.ts` (poster `logo` kaydı), `kinds.ts`.

**C# tarafı:** Önceki kayıttaki indirme işleyicisi (aşağıda). Oynatma için `play`, `file:///` adresini kabul etmeli: yerel dosyada `new Media(_libVlc, uri.LocalPath, FromType.FromPath)` kullan.

---

## 2026-11-12 · İndir özelliği · `4783fed`

**Ne:** Film ayrıntı sayfasında, dizi bölümü satırında ve oynatıcının altındaki panelde **İndir** düğmesi. Basınca `{ cmd: 'download', url, title }` gider. Köşe bildirimi: "İndiriliyor: ad" + yüzde çubuğu + iptal; bitince "İndirildi ✓", hatada "İndirilemedi: mesaj". Aynı anda birden çok indirme. Ayarlar > İndirilenler sekmesi (başlık, boyut, Oynat, Klasörü Aç, listeden kaldır). Tarayıcıda düğme kapalıdır ("Bu özellik sadece uygulamada çalışır"). Bölüm satırına, senin "İzledim" kutunun yanına eklendi.

**Dosyalar:** yeni `downloads.ts`, `DownloadButton.tsx`, `DownloadTray.tsx`, `DownloadsTab.tsx`; `host.ts` (üç komut, mesaj dinleyici), `DetailDialog.tsx`, `NowPlayingInfo.tsx`, `SettingsPage.tsx`, `router.ts`, `App.tsx`, `src/webview.d.ts` (`window.chrome` tipi, `tsc` hatası giderildi).

**Protokol:**
| Yön | Mesaj |
|---|---|
| React → C# | `{ cmd:'download', url, title }`, `{ cmd:'cancelDownload', title }`, `{ cmd:'openFolder', path }` |
| C# → React | `{ evt:'downloadProgress', title, progress, received?, total? }`, `{ evt:'downloadComplete', title, path, size? }`, `{ evt:'downloadError', title, error }` |

**C# tarafı:** `csharp/MainWindow.Downloads.cs` + `MainWindow.xaml.cs`'te 3 küçük ekleme (`README-V2-DOWNLOADS.md`).

---

## Birikmiş C# gereksinimleri (v2 hattı)

| Konu | Gereken |
|---|---|
| İndirme | `download`, `cancelDownload`, `openFolder` işleyicileri; `downloadProgress/Complete/Error` olayları |
| Altyazı senkronu | `hello`'da `subtitleDelay: true`; `subtitleDelay { ms }` komutu (`SetSpuDelay(ms*1000)`) |
| Yerel dosya oynatma | `play` içinde `file:///` adresi: `FromType.FromPath` ile aç |
| Önceden var | `frontLayer`, `layout`, `aspect`, `tracks`, `fullscreen` (bkz. `docs`) |

## Bilinen açık işler
- Çeviriler gözden geçirilmedi; Arapça yerleşim tek tek elden geçirilmedi.
- `ManageCategoriesModal.tsx` ve `pip.ts` içinde eski lint uyarıları (bana ait değil, dokunulmadı).
- Boyut/renk gibi altyazı görünümü LibVLC 3 ile oynarken değiştirilemiyor.
