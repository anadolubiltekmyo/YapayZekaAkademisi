# Fizikli Yapı

Matter.js + vanilla JS ile köprü/kule inşa oyunu. 10 seviye, her biri farklı uzunlukta boşluk ve farklı ağırlıkla.

## Çalıştırma

Statik dosyalar; herhangi bir basit HTTP sunucuyla açılır:

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

veya `index.html`'i doğrudan tarayıcıda açabilirsin (Matter.js CDN'den yüklenir).

## Nasıl Oynanır

- **Sol tık (boş alan):** nokta ekle
- **Sol tık + sürükle (noktadan):** çubuk çiz
- **Sağ tık (nokta/çubuk):** sil
- **Space** veya **Yapıyı Test Et:** fiziği başlat
- Gri kare noktalar **sabit mesnettir**, silinemez
- Turuncu daireler **serbest noktalardır**, silinebilir
- Ağırlık yukarıdan düşer; yapı **3 saniye dayanırsa** seviyeyi geçersin
- Çubuklar çok gerilirse **kopar**

## Seviyeler

| Seviye | Boşluk | Ağırlık |
|---|---|---|
| 1  | 280 px | 40 kg  |
| 2  | 340 px | 70 kg  |
| 3  | 400 px | 95 kg  |
| 4  | 460 px | 120 kg |
| 5  | 520 px | 150 kg |
| 6  | 580 px | 190 kg |
| 7  | 640 px | 230 kg |
| 8  | 700 px | 280 kg |
| 9  | 760 px | 340 kg |
| 10 | 840 px | 420 kg |

İlerleme `localStorage`'da tutulur.

## Dosyalar

- `index.html` — UI + stil
- `game.js` — oyun mantığı, çizim, fizik dönüşümü
