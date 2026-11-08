# SOHVIA Satranç - ilk oynanabilir ekran

## Kurulum
`npm install` komutu chess.js paketini yükler.

## App.js bağlantısı
1. En üste ekle: `import ChessGameScreen from './ChessGameScreen';`
2. App bileşeninde satranç ekranını gösterecek bir state/route oluştur.
3. Satranç seçildiğinde `ChessGameScreen` render et ve `onExit` ile oyun listesine dön.

Örnek:
```jsx
{activeScreen === 'chess' && <ChessGameScreen onExit={() => setActiveScreen('games')} />}
```

Bu ekran aynı cihazda iki kişinin sırayla oynayabildiği, yasal hamleleri ve standart satranç kurallarını denetleyen ilk sürümdür. Henüz Supabase çevrim içi oda/hamle senkronizasyonu, saatli maç, terk/bağlantı kopması yönetimi veya çip ödül sistemi bağlanmış değildir. Bunlar tamamlanmadan çevrim içi hazır olarak duyurulmamalıdır.
