# SOHVIA Rastgele Görüntülü Sohbet — entegre sürüm

## Bu pakette tamamlanan kod işleri
- `RandomVideoChat.js` ana uygulamaya bağlandı; alt menüde **Video** ve ana sayfada görüntülü sohbet kartı var.
- Ön kamera, mikrofon, kamera kapatma, mikrofon kapatma, görüşmeyi bitirme ve sonraki kişi akışı eklendi.
- Şikâyet nedenleri ve kullanıcı engelleme ekranı bağlandı.
- Eşleşme sunucu tarafında 18+ doğrulaması olmadan reddedilir.
- Engellenen hesaplar karşılıklı olarak yeniden eşleştirilmez.
- Bekleme kuyruğundan çıkış için RPC eklendi.
- Görüşme sinyalleri Supabase Realtime ile iletilir; uygulama kayıt yapmaz.
- Mavi SOHVIA tema renkleri kullanılır.

## Kurulum — zorunlu adımlar
1. Supabase SQL Editor'da `supabase/migrations/202611082100_sohvia_random_video_chat_v1.sql` dosyasını çalıştır.
2. `private.sohvia_adult_verifications` tablosuna yalnızca gerçek yaş kontrolü yapan güvenilir sunucu/yetkili süreç `verified_18_plus=true` yazmalıdır. İstemciden yaş onayı almak yeterli değildir. Bu projede kimlik/yaş doğrulama sağlayıcısı henüz entegre değildir; doğrulanmamış tüm hesaplar eşleşemez.
3. Üretim kalitesi için TURN sunucusu gerekir. Şu an kodda yalnızca Google STUN adresi bulunur; bazı mobil operatör/Wi-Fi ağlarında iki tarafı bağlamaz. TURN sağlayıcısından kısa ömürlü kimlik bilgisi üreten güvenli bir Edge Function eklenmeden canlı yayına çıkmayın. TURN kullanıcı adı/parolasını uygulamaya sabit yazmayın.
4. GitHub'a bu paketin `sohvia_android_starter` içindeki tüm dosyalarını yükleyin.
5. `npm install` ardından EAS üzerinden yeni Android APK / iOS development build alın. `react-native-webrtc` Expo Go içinde çalışmaz.
6. İki ayrı, 18+ doğrulanmış hesapla ve iki fiziksel telefonda test edin.

## Önemli güvenlik notları
- Uygulamadaki `isAdult` parametresi yalnızca ekran davranışıdır; güvenlik kararı SQL RPC'de yapılır.
- Gerçek yaş doğrulama akışı henüz bağlanmadığından şu an hiçbir kullanıcı otomatik olarak 18+ doğrulanmış sayılmaz.
- TURN hizmeti kurulmadan bağlantı her ağda garanti edilemez.
- Şikâyet kayıtları `private.sohvia_video_reports` içinde saklanır. Yönetici inceleme ekranına bağlanması ayrıca gerekir.
- Video/ses kaydı yapılmaz. Kamera/mikrofon izinleri yalnızca görüşme başlatılırken istenir.
- Bu dosya canlı Supabase projesine kendiliğinden uygulanmadı; APK da henüz derlenmedi veya cihazlarda test edilmedi.
