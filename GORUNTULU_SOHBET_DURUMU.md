# Görüntülü sohbet durum raporu

**Uygulama entegrasyonu:** tamamlandı (kod düzeyinde)

**Eklenenler:** uygulama navigasyonu, görüntülü görüşme ekranı, WebRTC sinyalleşme, kamera/mikrofon kontrolleri, sonraki kişi, çağrıyı bitirme, şikâyet ve engelleme RPC'leri, karşılıklı engel filtresi, sunucu tarafı 18+ kapısı.

**Canlıya çıkmadan önce zorunlu:**
- Supabase migration uygulanmalı.
- Güvenilir yaş doğrulama sağlayıcısı ve sunucu iş akışı kurulmalı.
- TURN sunucusu ve kısa ömürlü TURN credential Edge Function kurulmalı.
- Şikâyetler yönetici moderasyon ekranına bağlanmalı.
- İki gerçek cihazda Android ve iOS bağlantı testleri yapılmalı.

**Gerçek durum:** Kod paketi hazırlandı; canlı servis, yaş doğrulaması, TURN ve cihaz testi henüz tamamlanmadı. Bu nedenle görüntülü sohbetin şu anda kullanıcılar arasında çalıştığı iddia edilmez.
