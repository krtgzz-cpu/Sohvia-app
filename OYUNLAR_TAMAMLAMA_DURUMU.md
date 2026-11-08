# SOHVIA — birleştirilmiş oyun geliştirme paketi

Bu paket önceki SOHVIA kaynak çalışmalarını tek klasörde birleştirir:
- Mevcut Expo uygulaması ve Supabase oda altyapısı
- 101 Okey ilk dağıtım/oda altyapısı
- Vampir Köylü sunucu tarafı ilk altyapı
- Pişti saf JavaScript oyun motoru v1
- Satranç yerel oynanabilir ekranı (chess.js)

## Önemli: Bu paket tüm oyunların tamamlandığı anlamına gelmez
Aşağıdaki özellikler hâlâ geliştirme ve test gerektirir:
- Pişti motorunun sunucu otoriteli RPC/Edge Function bağlantısı, ekran entegrasyonu ve iki hesapla çevrim içi test
- Satranç ekranının ana uygulama navigasyonuna bağlanması, çevrim içi oda/hamle RPC'leri, saat, terk/beraberlik ve yeniden bağlanma testleri
- 101 Okey: taş çekme/atma, per açma, gösterge/okey, bitiş, ceza ve puanlama
- Okey: tam kurallar ve oyun motoru
- Tavla: zar üretimi, yasal hamle, kapı kırma, toplama, mars ve çevrim içi senkronizasyon
- Batak/King/İskambil: varyant seçimi, ihale/koz/el alma ve puanlama
- Kelime Oyunu/Bilgi Yarışması: sunucu doğrulamalı sözlük/soru havuzu, zamanlayıcı ve skor
- Vampir Köylü: otomatik faz zamanlayıcısı, sohbet/moderasyon, yeniden bağlanma ve ödüller
- Tek cüzdan: tüm oyunların aynı sunucu tarafı cüzdan defterini kullanması; atomik bahis/ödül işlemleri, işlem kimliği ve tekrar-işlem koruması

## Güvenlik notları
- İstemciye gizli kartlar, rakip eli veya gizli roller gönderilmemelidir.
- Rastgelelik, kart/zar dağıtımı, hamle doğrulama, puanlama ve çip hareketleri sunucu tarafında yapılmalıdır.
- Çip transferleri ve ödüller RLS korumalı, atomik RPC/Edge Function ile yürütülmelidir.
- Gerçek para, nakde çevrilebilir ödül veya bahis özelliği bu pakete dahil değildir.

## iPhone üzerinden devam
1. ZIP'i iPhone Dosyalar uygulamasında aç.
2. `sohvia_android_starter` klasörünün içeriğini GitHub deposunun köküne yükle.
3. Supabase migration dosyalarını önce test projesinde uygula.
4. APK almadan önce Expo bağımlılık kurulumu ve EAS build çalıştırılmalı.
