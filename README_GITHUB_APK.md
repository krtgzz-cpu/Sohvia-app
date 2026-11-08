# SOHVIA — GitHub'a yüklenecek güncel Android/iOS kaynak paketi

## Paket içeriği
- Güncel Expo / React Native uygulama kodu (`App.js`)
- Supabase bağlantısı (yalnızca publishable key)
- Oyun kataloğu, oda açma ve oda koduyla katılma ekranları
- Oyun odalarında Realtime değişiklik dinleme
- 101 Okey için sunucudan ilk taş dağıtımı ve oyuncunun kendi taşlarını görmesi
- Yönetici/moderasyon ekranları
- Güncellenmiş SOHVIA uygulama simgesi
- Oyun odası ve 101 Okey ilk dağıtım SQL migration dosyaları

## GitHub'a yükleme
1. ZIP'i iPhone Dosyalar uygulamasında aç.
2. İçindeki `sohvia_android_starter` klasörüne gir.
3. Bu klasörün İÇİNDEKİ tüm dosya ve klasörleri GitHub deposunun köküne yükle. Klasörün kendisini bir alt klasör olarak yükleme.
4. `App.js`, `app.json`, `eas.json`, `package.json`, `assets` ve `supabase` kök seviyede görünmeli.

## Veritabanı
Oyun altyapısı SQL dosyaları `supabase/migrations/` içindedir. Bu iki migration SOHVIA Supabase projesinde daha önce uygulanmıştır. Aynı canlı veritabanına yeniden yüklerken SQL'leri tekrar çalıştırma; migration geçmişiyle eşleştir.

Yönetici/moderasyon tabloları ve fonksiyonları önceki kurulumda canlı Supabase projesine uygulanmıştır. Bu paket onları yeniden kuran tam bir başlangıç veritabanı değildir.

## EAS
- Expo SDK 54
- Android package: `com.sohvia.app`
- EAS project ID: `7ffb0906-6eea-4278-b0e6-4464bee0fd42`
- `eas.json` preview profili APK çıktısı içindir.

## Önemli tamamlanmamış işler
Bu paket tam bitmiş bir oyun olarak sunulmaz. 101 Okey'de şu an oda oluşturma/katılma, dört oyuncu kontrolü ve ilk taş dağıtımı vardır. Taş çekme-atma, gösterge/okey belirleme, seri/per açma, 101 puan kontrolü, bitiş/ceza ve tam hamle doğrulaması henüz geliştirilmelidir. Diğer oyunların oyun motorları da tamamlanmamıştır. Sesli/görüntülü görüşme için gerçek medya sunucusu entegrasyonu yoktur.

Yeni APK oluşturulmuş veya iki cihazda test edilmiş değildir.

## Vampir Köylü
`supabase/migrations/202611082000_sohvia_vampir_koylu_engine_v1.sql` migration dosyası ve `VAMPIR_KOYLU_KURALLAR_VE_ALTYAPI.md` tasarım notları eklendi. Bu SQL henüz canlı Supabase projesine uygulanmadı.
