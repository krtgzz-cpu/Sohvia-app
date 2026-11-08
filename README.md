# SOHVIA — Android kaynak paketi

Bu paket, SOHVIA mobil uygulamasının geliştirme adayıdır. APK değildir ve mağazaya yüklenmeye hazır olduğu iddia edilmez.

## İçerik
- E-posta ile kayıt/giriş (Supabase Auth)
- Profil oluşturma ve profil fotoğrafı yükleme
- Kullanıcı keşfetme, arkadaşlık isteği gönderme
- Bire bir metin mesajları
- Gönderi akışı, beğeni ve yorum
- 24 saatlik hikâye ekleme ve hikâye görüntüleme (video harici oynatıcıda açılır)
- Oyun kataloğunu listeleme (oyun motorları henüz dahil değil)

## Kurulum
1. Bilgisayar veya Expo destekleyen bir bulut geliştirme ortamında bu klasörü aç.
2. `npm install` çalıştır.
3. `npx expo start` ile geliştirme sunucusunu başlat.
4. Expo Go ile QR kodu tara. Native modül veya sürüm uyuşmazlığı çıkarsa Expo SDK 54 uyumlu bağımlılıkları `npx expo install` ile eşitle.

## Android APK (EAS)
1. `npm install -g eas-cli`
2. `eas login`
3. `eas build:configure` (gerekirse)
4. `eas build --platform android --profile preview`

Bu işlem Expo hesabı ve EAS derleme hizmeti gerektirir. Bu paketle APK henüz üretilmedi.

## Backend
Uygulama, SOHVIA Supabase projesinin URL ve publishable key değerini kullanır. Publishable key istemci için tasarlanmıştır; service-role/secret anahtarı uygulamaya eklenmemelidir. RLS kuralları Supabase tarafında zorunludur.

## Henüz tamamlanmayanlar
- Uçtan uca cihaz testi ve üretim hata düzeltmeleri
- Video görüşmesi ve canlı yayın sağlayıcısı/token sunucusu
- 101 Okey gerçek zamanlı oyun motoru ve oda sunucusu
- Push bildirimleri
- Mağaza abonelik/ödeme entegrasyonları ve doğrulama
- Yaş doğrulama, moderasyon paneli, rapor/engelleme akışlarının tam arayüzü
- Müzik lisansı/servis bağlantısı
- Google Play ve Apple mağaza varlıkları, gizlilik ve güvenlik incelemesi

## Önemli
Supabase Auth e-posta doğrulaması, Storage bucket politikaları ve proje RLS ayarları gerçek cihazda test edilmelidir. Bu paket bir geliştirme adayıdır; canlıya alınmadan önce güvenlik, gizlilik, yaş güvenliği ve mağaza politikaları incelemesi gereklidir.
