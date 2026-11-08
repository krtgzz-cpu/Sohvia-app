# SOHVIA – Kalite Kontrol ve Eksik Listesi

Bu rapor 8 Kasım 2026 tarihli mavi tasarım paketinin kaynak kodu üzerinde yapılan statik kontroldür. Gerçek cihazda açılış, Supabase bağlantısı, iki hesapla eş zamanlı oyun veya EAS APK derlemesi yapılmış değildir.

## Kontrol edilenler
- `App.js`, `ChessOnline.js`, `RandomVideoChat.js` ve `games/pistiEngine.js` için Node.js sözdizimi kontrolü: başarılı.
- `games/pistiEngine.test.js`: başarılı (1 test dosyası).
- Expo uygulama adı, Android/iOS paket kimliği, simge dosyaları ve EAS proje kimliği mevcut.
- Uygulama renkleri koyu lacivert, canlı mavi ve açık mavi olarak tanımlı.

## Yayına çıkmadan önce çözülmesi gerekenler
1. **Satranç güvenliği:** İstemci SQL RPC'ye yeni FEN/hamle bilgisini gönderiyor. Veritabanı tarafı hamlenin gerçekten yasal olduğunu bağımsız doğrulamıyor. Canlı rekabetçi oyun öncesi hamle doğrulaması güvenilir sunucu tarafına taşınmalı.
2. **Satranç kurulumu:** Satranç migration'ı Supabase projesine uygulanmalı; iki farklı hesap/telefonla oda kurma, katılma, hamle sırası, terk ve bağlantı kopması test edilmeli.
3. **Rastgele görüntülü sohbet:** Bileşen kaynakta var ancak ana uygulama gezinmesine bağlanmamış. 18+ doğrulama, engelle/şikâyet akışı, TURN servisi ve güvenli geçici TURN kimlik bilgileri olmadan açılmamalı.
4. **101 Okey:** Oda ve ilk taş dağıtımı altyapısı var; taş çekme/atma, seri-per açma, 101 kontrolü, sıra senkronizasyonu ve puanlama eksik.
5. **Vampir Köylü:** Sunucu altyapısı var; oyun ekranı, faz zamanlayıcısı, oylama/rol eylemleri ve yeniden bağlanma testleri eksik.
6. **Diğer oyunlar:** Pişti motoru ilk sürüm; diğer listelenen oyunların tam çevrim içi oyun kuralları ve senkronizasyonu tamamlanmış değil.
7. **Üretim hazırlığı:** Supabase RLS/Storage politikaları, e-posta doğrulama, gizlilik ve moderasyon akışları, push bildirimleri ve mağaza gereklilikleri gerçek cihazlarda test edilmeli.
8. **Derleme:** Bu kontrolde EAS APK üretilmedi. GitHub yüklemesi sonrası yeni APK derlenip fiziksel cihazda denenmeli.

## Önerilen güvenli sıra
1. Supabase migration'larını kontrollü biçimde uygulama ve RLS testleri.
2. Satranç hamle doğrulamasını sunucu tarafına taşıma.
3. İki ayrı hesap/telefonla satranç testi.
4. 101 Okey oyun döngüsünü tamamlama.
5. Vampir Köylü ve Pişti oyun döngülerini tamamlama.
6. Görüntülü sohbeti yaş doğrulama ve moderasyonla güvenli hâle getirme.
7. EAS APK derlemesi ve son cihaz testleri.
