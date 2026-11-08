# SOHVIA çevrim içi oyun altyapısı

## Tamamlanan ilk parçalar
- Supabase üzerinde oda oluşturma ve 6 karakterli oda koduyla katılma RPC'leri.
- Oda ve oyuncu listelerinin Realtime üzerinden güncellenmesi.
- 101 Okey için sunucu tarafında 106 taşlık deste oluşturma ve 4 oyuncuya 22/21/21/21 taş dağıtma.
- Her oyuncunun yalnızca kendi taşlarını görebildiği RLS politikası.
- Oda sahibi 4 oyuncu tamamlandığında 101 Okey'i başlatabilir.
- Oyun durumu, sıra başlangıcı ve kalan taş sayısı sunucuda tutulur.

## Henüz tamamlanmayanlar
- Taş çekme/atma, sıra kontrolü, gösterge/okey belirleme, per/seri kontrolü, 101 açma, çift açma, ceza ve puanlama.
- Oyun sonu, yeniden bağlanma ve hile önleme testleri.
- Diğer oyunların motorları. Oda altyapısı ortak kullanılabilir ama her oyunun kural motoru ayrıdır.
- Dört ayrı gerçek hesap/cihazla uçtan uca test ve yeni APK derlemesi.

Bu nedenle bu sürüm oynanabilir tam 101 Okey olarak tanıtılmamalıdır; yalnızca sunucu taraflı ilk taş dağıtımı aşamasıdır.
