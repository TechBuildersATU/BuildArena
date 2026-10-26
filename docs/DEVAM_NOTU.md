# Durum notu — son düzeltmeler (YAPILACAKLAR listesi) yapıldı

Kaynaklar: `docs/tam_prototip/` (kulübün Tam Prototip v0.3'ü, tüm ekranlar buradan) ve
`docs/renk_paleti/` (renk paleti ve buton dili, prototipin koyu temasının yerine geçer).
`npm run check` yeşil.

## Prototipten bilerek farklı olanlar (kulüple konuşuldu)

- API / yapay zekâ yok; her şey yerel (eski `proxy/` taslağı silindi).
- Görünüm: Renk Paleti — krem kâğıt, mürekkep çizgi, sert gölgeli ve basınca gömülen butonlar;
  mavi/turuncu düello, deniz yeşili senaryo, ahududu tek "oyna" çağrısı. Animasyonlar aynı kaldı.
- Logo: kulübün yeni "Community" logosu (`public/logo/`), PWA ikonları ondan üretildi.
- Puanlama yeniden tasarlandı (zorluk ağırlığı, doğruluk eğrisi, %10 hız payı; düelloda F1 ve
  tuzak cezası). Boş oyun / boş kutu 0 puan. Ayrıntı: `README.md` → Puanlama, `src/game/scoring.ts`.
- Takma ad ekranında ekran klavyesi ve hazır ad paneli yok; yazı alanı + slot makinesi gibi
  dönen zar (~3.700 ad). Genişletilmiş Türkçe uygunsuz ad filtresi.
- Düello sonucunda Rövanş yok (stantta sıradaki ikili oynasın).
- Ana ekranın altındaki "Başlamak için bir moda dokun · 4 Kasım Stant Etkinliği" yazısı kaldırıldı.
- Müzik: menüde sakin lo-fi, senaryoda gizemli/rahatlatıcı, düelloda ritmik parça; ses efektleri
  değişmedi. Ayrı müzik ve efekt düğmeleri; ses seviyesi müzik düğmesinin panelinde (varsayılan %80).
- Koyu tema: aynı paletin gece hâli, her başlıkta ay düğmesi.
- Düello süreleri 45 / 60 / 90 sn (120 sn kaldırıldı).
- Uygulama simgeleri kulübün ikon paketinden (`public/icons/`, mağazalar için `store/`).
- Sosyal medya: ana ekranda ve oyun sonlarında "Bizi takip et" → kulübün Linktree QR kodu.
- Oyun içinde ev düğmesi (sorup ana sayfaya döner, tur kaydedilmez).
- İçerik: 16 senaryo (kampüs: ring, otostop, sınav, Wi-Fi, şenlik, deprem tatbikatı …), 15 düello
  görevi; 5. adım soru dili sadeleşti ("olmazsa olmaz").
- Küfür filtresi güçlendirildi (oç…, bok…, seks…, cinsel kelimeler, "31").
- Skor tablosundan "SEN · bu oyun" açıklaması kaldırıldı; düello zarı sınırsız döner.
- APK açılış animasyonu (`BootIntro`): logo, kıvılcımlar, harf harf ad, renk çubukları, perde.
- Android APK (`npm run apk`): ekran klavyesi oyunu küçültmez, üstüne açılır; yazılan alan klavyenin
  altında kalacaksa ekran yalnızca o kadar yukarı kayar (`src/app/keyboard.ts`, `MainActivity.java`).

## Gerçek tablette elle denenmesi gerekenler

1. İki kişi aynı anda sürükleme (otomatik testte CDP çoklu dokunma ile doğrulandı).
2. Müziklerin ve ses seviyesinin stant gürültüsünde kulakla kontrolü; titreşim (Android tablet;
   iPad'de titreşim yok).
3. Açık temanın stant ışığında parlaması (paletteki öneri: tablet parlaklığı %60–70) ya da koyu
   temanın ışıkta okunurluğu — stantta hangisi iyi duruyorsa o seçilir.
4. PWA kurulumu, tam ekran / kiosk kilidi, yatay yön; yeni logolu ikon.
5. Varsayılan PIN 1234'ün değiştirilmesi (`src/app/staffPin.ts`).
6. Linktree QR kodunun stantta telefon kamerasıyla okunması (ekran parlaklığı, mesafe).
7. APK açılış animasyonunun gerçek tablette akıcılığı (emülatör yavaş olduğu için orada ölçülemedi).
