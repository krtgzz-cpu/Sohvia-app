# SOHVIA Pişti — oyun motoru v1

Bu klasör `games/pistiEngine.js` dosyasını içerir. Kart dağıtımı, sıra kontrolü, kart atma, eşleşme/J ile toplama, Pişti tespiti ve skor hesaplama kuralları saf JavaScript olarak ayrılmıştır.

## Önemli kapsam
- Bu sürüm 2 oyunculu Pişti kurallarının oyun motorudur.
- React Native ekranına ve Supabase RPC/Realtime akışına henüz bağlanmış değildir.
- Oyun odası açma ve oyuncu eşleştirme mevcut SOHVIA oda altyapısında bulunur; bu dosya o altyapının yerine geçmez.
- Online hile önleme için sonraki adımda kart destesi ve hamlelerin Supabase Edge Function/RPC tarafında sunucu otoritesiyle yürütülmesi gerekir. Kart destesi veya rakibin eli istemciye gönderilmemelidir.

## Puanlama (yaygın Pişti puanlaması)
- Her As: 1
- Her Vale: 1
- Sinek 2: 2
- Karo 10: 3
- En çok kartı toplayan: 3
- Normal Pişti: 10
- Vale ile Pişti: Bu v1'de özel puan yok; kurala göre farklı varyantlar bulunduğu için ayrı seçenek olarak eklenmeli.

## Kullanım
```js
import { createPistiGame, playPistiCard } from "./games/pistiEngine";

const game = createPistiGame([userA, userB]);
const updated = playPistiCard(game, userA, game.hands[userA][0].id);
```
