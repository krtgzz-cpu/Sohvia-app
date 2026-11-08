# SOHVIA — Yönetici ve güvenlik güncellemesi

## Bu pakette
- Supabase oturumu açıldığında sunucu tarafında yönetici kontrolü.
- Sadece yönetici hesabında görünen Yönetici sekmesi.
- Son 100 kullanıcıyı e-posta/kullanıcı adına göre arama.
- Kullanıcıyı engelleme / engeli kaldırma.
- Kullanıcının jeton bakiyesini yönetici RPC'si ile belirleme.
- PLUS / PRO / MAX üyeliği ve mavi tik tanımlama/kaldırma.
- Görüntülü sohbet raporlarını inceleme, çözme veya kapatma.
- Yönetici işlemlerinin denetim kaydı.
- Profil ekranında en az 12 karakterli şifre değiştirme.
- E-posta doğrulaması kapalı kayıt için eski uyarı metninin düzeltilmesi.

## Güvenlik
- Yönetici rolü kullanıcı metadata'sından okunmaz; `private.admin_accounts` tablosunda tutulur.
- Yönetici işlemleri SECURITY DEFINER RPC'lerinde tekrar yetki kontrolünden geçer.
- Jeton/üyelik/mavi tik güncellemeleri istemciden doğrudan tabloya yazılmaz.
- Ban kontrolü uygulama açılışında sunucu RPC'si ile yapılır. Üretim öncesi tüm veri erişim politikalarında ban kontrolü ayrıca zorunlu hale getirilmelidir.

## Henüz tamamlanmayan büyük modüller
- 101 Okey kataloğu mevcut; gerçek 4 kişilik çevrim içi oyun motoru, taş dağıtımı, 101 açma/seri-per kuralları, tur senkronizasyonu ve oyun bitirme henüz yok.
- Canlı yayın ve rastgele görüntülü sohbet tabloları/akış kuyruğu mevcut; gerçek WebRTC medya bağlantısı yok. Bunun için LiveKit/benzeri sağlayıcı hesabı, proje anahtarı, sunucu taraflı token üretimi ve iOS/Android kamera-mikrofon izinleri ile native build gerekir.
- Sesli/görüntülü arama, push bildirimleri, reklam ağı ve mağaza dağıtımı henüz tamamlanmadı.
- Ödeme sistemi bu kapsamda özellikle eklenmedi.

## Derleme
`node --check App.js` kontrolü başarılı. Gerçek iOS/Android cihaz testi ve yeni APK derlemesi henüz yapılmadı. Android APK için EAS `preview` profiliyle yeniden build alınmalıdır.
