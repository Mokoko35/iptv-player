# Altyazı ayarları raporu

## 1. Bulunan hatalar

1. **Yanlış yerdeki blok.** `SettingsPage.tsx` içinde "Altyazı Ayarları" bölümü, sekme paneli (`role="tabpanel"`) kapandıktan **sonra**, bileşenin en altına konmuştu. Sekmeye bağlı olmadığı için Genel, EPG, Kategori Yönetimi, Temalar ve İndirilenler sekmelerinin hepsinde görünüyordu.
2. **Aynı kontroller bir de OSD menüsündeydi.** `LanguageMenu.tsx` içinde ("Ses ve altyazı" menüsünün altında) aynı iki kaydırıcı vardı.
3. **İkisi de hiçbir şey yapmıyordu.** İki yer de `{ cmd: 'subtitleSettings', size, delay }` mesajı gönderiyordu, ama C# tarafında (`MainWindow.xaml.cs`, `OnMessage`) `subtitleSettings` için bir `case` yok. Mesaj sessizce yok sayılıyordu. Ayrıca kaydırıcı değerleri sadece React durumunda duruyordu: menü her açılışta 1.0x ve 0 sn'ye dönüyordu, filme bağlı değildi.
4. **Renk** için hiçbir kontrol yoktu.

## 2. Anlık değişebilir mi?

| Özellik | LibVLC 3 (LibVLCSharp 3.x) ile oynatırken anlık olur mu? | Not |
|---|---|---|
| **Senkron / gecikme (ms)** | **Evet.** | `MediaPlayer.SetSpuDelay(long mikrosaniye)` oynatma sürerken çalışır. Film değişince LibVLC kendisi sıfırlar. |
| **Boyut** | **Hayır.** | Altyazı yazı tipi boyutu (`freetype-rel-fontsize`, `sub-text-scale`) yazı tipi çizicisi başlarken okunan seçeneklerdir. LibVLC örneği oluşturulurken (`new LibVLC("--freetype-rel-fontsize=...")`) ya da medya başlarken (`media.AddOption(...)`) verilir. Oynarken değiştirmek için bir API yok. |
| **Renk** (ve saydamlık, kenar çizgisi) | **Hayır.** | Aynı nedenle (`freetype-color`, `freetype-opacity`, `freetype-outline-thickness`). |

Boyut ve rengi değiştirmenin yolları:
- **Yeniden başlatarak:** seçeneği `media.AddOption(...)` ile ver, filmi kaldığı saniyeden yeniden aç. Anlık değil; her değişimde görüntü bir an kesilir.
- **Altyazıyı sayfada çizerek:** altyazı metnini HTML ile çizersen boyut, renk, arka plan, konum ve gecikme anlık olur. Ama sayfa metni ancak ayrı bir `.srt`/`.vtt` dosyasından (portalın verdiği ya da kullanıcının eklediği) okuyabilir. Filmin içine gömülü altyazı akışlarının metnini LibVLC uygulamaya vermiyor (altyazı kare olarak çiziliyor), bu yüzden gömülü altyazılarda bu yol yok.

## 3. Ne yapıldı

- `SettingsPage.tsx`: "Altyazı Ayarları" bölümü ve iki durum değişkeni **silindi**. Çalışmayan kontrolleri hangi sekmeye koyarsan koy yanıltıcı olurdu.
- `LanguageMenu.tsx`: boyut ve gecikme kaydırıcıları **silindi**.
- **Yerine yalnızca yapılabilen şey eklendi: Altyazı senkronu.** "Ses ve altyazı" menüsünün altyazı bölümünün altında: `−500`, `−50`, `Sıfırla`, `+50`, `+500` (ms) düğmeleri ve geçerli değer. Artı = altyazı daha geç, eksi = daha erken. En çok ±30 sn.
- **C# bunu desteklediğini söylemedikçe bu bölüm görünmez.** `hello` mesajında `subtitleDelay: true` yoksa menüde senkron kontrolü yoktur. Yani C# tarafı eklenmezse hiçbir ölü düğme çıkmaz.
- Değer filme bağlıdır: film değişince sıfırlanır (LibVLC de öyle yapar).
- Protokol: sayfa → C#: `{ cmd: 'subtitleDelay', ms }` (`ms` mutlak değer, ms cinsinden).

## 4. C# tarafında yapılacak (2 satır)

`MainWindow.xaml.cs` içinde:

```csharp
// "ready" cevabında (var olan satıra subtitleDelay = true ekle):
PostEvent(new { evt = "hello", version = 1, frontLayer = true, subtitleDelay = true });

// OnMessage içindeki switch'e:
case "subtitleDelay":
    try { _player.SetSpuDelay(m.GetProperty("ms").GetInt64() * 1000); } catch { }   // ms -> mikrosaniye
    break;
```

Denemek için: altyazılı bir film aç, "Ses ve altyazı" menüsünden bir altyazı seç, `+500`'e bas. Altyazı yarım saniye geç görünmeli.
