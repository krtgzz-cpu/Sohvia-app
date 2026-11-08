# SOHVIA — TÜM GÜNCEL KAYNAK PAKETİ

Bu paket; mavi tasarımlı uygulama, oyun altyapıları, çevrim içi satranç, Pişti motoru, Vampir Köylü altyapısı, 101 Okey oda/dağıtım altyapısı ve rastgele görüntülü sohbet entegrasyonunu bir araya getirir.

## iPhone ile GitHub yükleme
1. ZIP dosyasını iPhone Dosyalar uygulamasında açın.
2. `sohvia_android_starter` klasörüne girin.
3. Klasörün içindeki dosya ve klasörleri GitHub deposunun kök dizinine yükleyin (üst klasörün kendisini yüklemeyin).
4. Aynı isimli dosyaları yeni sürümle değiştirin; `Commit changes` ile kaydedin.

## APK
`eas.json` içindeki preview profili APK üretmek üzere ayarlanmıştır. GitHub'a yüklemek tek başına APK üretmez; Expo EAS build başlatılmalıdır.

## Önemli test ve yayın notları
- Görüntülü sohbetin veritabanı tarafı kuruldu; fakat TURN sunucusu ve gerçek 18+ kimlik/yaş doğrulama sağlayıcısı henüz bağlı değildir.
- İki farklı telefonda WebRTC arama testi yapılmadı.
- Satranç SQL tarafındaki hamle doğrulaması üretim güvenliği için sunucuda yeniden uygulanmalıdır.
- 101 Okey, Vampir Köylü ve diğer oyunların bazı mekanikleri henüz tamamlanmamıştır; oyun durum raporlarını okuyun.
- Paket oluşturulması ve statik kontroller, uygulamanın mağazaya hazır olduğu veya tüm özelliklerin çalıştığı anlamına gelmez.
- Supabase service-role/secret anahtarlarını mobil uygulamaya koymayın.
