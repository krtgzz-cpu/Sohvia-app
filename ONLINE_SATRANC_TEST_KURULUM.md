# SOHVIA çevrim içi satranç — test sürümü v1

## Ne eklendi?
- Uygulama Oyunlar sekmesine “Çevrim içi Satranç oyna” girişi.
- Oda oluşturma ve 6 karakterli kodla katılma.
- Beyaz/siyah oyuncu ataması.
- chess.js ile istemcide yasal hamle kontrolü.
- Supabase RPC ile sıra kontrolü ve beklenen FEN üzerinden eşzamanlı hamle çakışmasını önleme.
- Realtime güncellemeleriyle rakibin hamlesini görme.
- Oyunu bırakma.

## Kurulum
1. GitHub deposuna bu ZIP içindeki `sohvia_android_starter` klasörünün içeriğini yükle.
2. Supabase Dashboard > SQL Editor içinde `supabase/migrations/202611082200_sohvia_online_chess_v1.sql` dosyasını çalıştır.
3. GitHub'daki projede `npm install` ve ardından EAS Android APK build çalıştır.
4. İki ayrı kullanıcıyla iki telefonda test et: biri oda kursun, oda kodunu diğerine göndersin, ikinci kullanıcı katılsın.

## Sürüm sınırları — gerçek test öncesi bilin
Bu, iki cihaz arasında canlı hamle aktarımını denemek için MVP'dir; üretim seviyesinde hileye dayanıklı satranç sunucusu değildir. Şu an istemci FEN ve hamle SAN/UCI bilgisini gönderir; SQL tarafı FEN'i ve satranç kurallarını yeniden hesaplamaz. Kötü niyetli istemci sahte konum gönderebilir. Yayına almadan önce hamleyi sunucuda chess.js kullanan Edge Function ile yeniden doğrulamak gerekir.
- Saatli maç, beraberlik teklifi, üç tekrar/50 hamle iddiası ve yeniden bağlanma UX'i yok.
- Oda oluşturma/katılma ve hamle akışı Supabase bağlantısına bağlıdır.
- Bu paket SQL'i canlı Supabase'e kendiliğinden uygulamaz ve APK üretmez.
