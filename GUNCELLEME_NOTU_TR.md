# SOHVIA – Birleşik Güncel Kaynak Paketi

Bu paket, SOHVIA uygulamasının mevcut kaynak kodunu tek GitHub yüklemesi için bir araya getirir.

## Pakette bulunanlar
- SOHVIA adı, koyu mor/siyah ve altın renkli marka görünümü.
- Uygulama simgesi ve Android adaptive icon (`assets/icon.png`, `assets/adaptive-icon.png`).
- Mevcut sosyal uygulama ekranları ve yönetim/moderasyon kaynakları.
- Oyunlar geliştirme paketi: 101 Okey oda/dağıtım altyapısı, Pişti oyun motoru, Vampir Köylü altyapısı, satranç ekranı ve çevrim içi satranç deneme ekranı.
- Rastgele görüntülü sohbet için WebRTC bileşeni ve kurulum notları.
- Expo/EAS yapılandırması ve kurulum belgeleri.

## GitHub'a yükleme
ZIP'i açın. İçindeki `sohvia_android_starter` klasörüne girip **klasörün içindeki tüm dosya ve klasörleri** GitHub deposunun ana dizinine yükleyin. Üst klasörü ayrıca iç içe koymayın.

## Önemli durum notu
Bu, birleştirilmiş kaynak kod paketidir; tamamlanmış ve canlıda test edilmiş bir uygulama/APK değildir. Çevrim içi satranç ve Vampir Köylü için ilgili Supabase SQL geçişleri canlı projeye uygulanmalıdır. Rastgele görüntülü sohbet için TURN sunucusu, güvenlik/şikâyet akışları ve cihaz testleri gerekir. 101 Okey, Pişti ve diğer oyunların tüm çevrim içi oyun kuralları/akışları tamamlanmış değildir. GitHub'a yüklemek tek başına oyunları çalışır hâle getirmez; sonrasında EAS APK derlemesi ve gerçek iki cihaz testi yapılmalıdır.
