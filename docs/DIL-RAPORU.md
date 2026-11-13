# Arayüz dili (çok dilli arayüz)

Yedi dil: **Türkçe** (kaynak), **English**, **Deutsch**, **Русский**, **العربية** (sağdan sola), **Español**, **Français**.

## Nasıl çalışıyor
- Anahtar, Türkçe metnin kendisi. `t('Ayarlar')` Türkçede aynen döner, diğer dillerde `src/iptv/i18n/<dil>.ts` içindeki karşılığı döner. Çevirisi olmayan metin Türkçe görünür, ekran boş kalmaz.
- Değişken: `t('{name} listesini sil', { name })`. Sayılar seçili dile göre biçimlenir (Arapçada Latin rakamları).
- Modül düzeyindeki sabitlerde (menü etiketleri, sekmeler) metin `tr('...')` ile işaretlenir; gösterildiği yerde `t(...)` çağrılır.
- Dil seçimi: Ana Sayfa > "Dil Değiştir" ya da Ayarlar > Genel > Arayüz dili. Seçim `app-lang` anahtarıyla saklanır; `<html lang dir>` güncellenir. Dil değişince arayüz, oynayan yayını kesmeden yenilenir.
- Sayılar, tarihler, saatler ve TMDB bilgileri (özet, oyuncular) seçili dilde gelir.

## Yeni dil eklemek
1. `src/iptv/i18n/<kod>.ts` dosyasını diğerleri gibi oluştur (anahtar: Türkçe metin, değer: çeviri; `{ad}` yer tutucularını aynen koru).
2. `src/iptv/i18n.ts` içinde `Lang` türüne, `LANGUAGES` listesine ve `DICTIONARIES` nesnesine ekle.
3. Çoğul gerektiren bir metin için değeri `{ one: '...', other: '...' }` nesnesi yap (ilk sayı değişkeni kullanılır).

## Sınır
- Çeviriler benim yazdığım, gözden geçirilmemiş çevirilerdir. Ana dili konuşan biri bakarsa daha iyi olur (özellikle Arapça ve Rusça).
- Arapça için yön ve yerleşim ilk aşamada: menü kenarı, kenar boşlukları ve kaydırma çubuğu yönü aynalanır; her ekran tek tek elden geçirilmedi.
- Ücretsiz liste adları (`HomePage`) ve bölüm adları gibi veri çevrilmez.
