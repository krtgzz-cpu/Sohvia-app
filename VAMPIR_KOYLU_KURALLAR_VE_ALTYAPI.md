# SOHVIA Vampir Köylü — kurallar ve altyapı v1

## Oyun döngüsü
- 4–16 oyuncu, oda koduyla katılım; oda sahibi başlatır.
- Roller sunucuda rastgele dağıtılır: Vampir, Polis, Köylü; 6+ oyuncuda Kâhin, 7+ oyuncuda Doktor.
- Gece: Vampir saldırı hedefi seçer; Polis/Doktor korur; Kâhin araştırır.
- Sabah ve tartışma: 120 saniye. Sonra 45 saniye oylama. Beraberlikte kimse elenmez.
- Köy, tüm vampirleri eleyince; vampirler yaşayan sayısında köylülerle eşitlenince kazanır.
- Elenen oyuncu artık hamle yapamaz. Rol bilgisi yalnızca oyuncunun kendi RPC yanıtında gösterilir.

## SOHVIA harita ve arayüz yönü
- Harita adı: SOHVIA Köyü. Merkezde altın taçlı S amblemli çeşme; çevrede Han, Saat Kulesi, Şato, Orman Kapısı ve Mezarlık.
- Gündüz mor alacakaranlık; gece lacivert gökyüzü, mor ay, altın fenerler ve hafif sis.
- Oyuncu avatarları köy meydanında; canlı/elenmiş durumu, rolü açıklanmadan gösterilir.
- Gece rolüne özel eylem kartı; gündüz konuşma ve oylama paneli. Sesli sohbet sonraki WebRTC entegrasyon adımıdır.

## Teknik sınırlar
- Migration, oda/rol/gece eylemi/oylama için sunucu tarafı temelini ekler. İstemci ekranı, otomatik zamanlayıcı/cron faz ilerletmesi, sohbet moderasyonu, yeniden bağlanma akışı, çip ödül/harcama entegrasyonu ve tam testler henüz tamamlanmadı.
- Migration canlı Supabase projesine uygulanmadı. SQL Editor veya Supabase CLI ile önce test ortamında uygulanmalı.
- Oda sahibi faz ilerletme RPC'sini süre dolduktan sonra çağırır; üretimde bunu Edge Function/Cron ile otomatikleştirmek gerekir.
