# SOHVIA — Tasarımı uygulanmış kaynak kod paketi

Bu paket, onaylanan SOHVIA tasarım dilini gerçek React Native ekran stillerine uygular:
- Koyu siyah/lacivert arka plan
- Neon mor ve lila vurgular
- Taçlı S marka alanı
- Giriş/kayıt, ana sayfa, oyunlar, sohbet, profil ve yönetici ekranlarında ortak görsel tema

`TASARIM_ONIZLEME.png` onaylanan tasarım referansıdır.

## GitHub'a yükleme
Bu ZIP'in içindeki dosyaları (App.js, app.json, package.json, assets, supabase vb.)
GitHub deposunun `main` dalındaki kök dizine yükleyin. ZIP'in içindeki `src/` gibi
ek bir klasöre taşımanız gerekmiyor; dosyalar doğrudan kök dizinde yer alır.

## APK
Bu kaynak paketi APK değildir. GitHub'a yükledikten sonra Expo EAS üzerinden
Android preview derlemesi başlatılmalıdır:
`eas build -p android --profile preview`

## Önemli
- Tasarım renkleri ve ortak ekran görünümü kaynak koda işlendi; bu, onaylanan tek
  görselin her pikselinin birebir kopyalandığı anlamına gelmez.
- Gerçek cihaz testi ve APK derlemesi henüz yapılmadı.
- Satranç çevrim içi güvenliği, görüntülü sohbet TURN sunucusu/yaş doğrulama
  ve bazı oyun motorları hâlâ ayrıca tamamlanmalıdır.
- Supabase `service_role` veya gizli anahtarları istemciye eklemeyin.
