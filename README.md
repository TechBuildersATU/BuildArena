# BuildArena

[![CI](https://github.com/TechBuildersATU/BuildArena/actions/workflows/ci.yml/badge.svg)](https://github.com/TechBuildersATU/BuildArena/actions/workflows/ci.yml)

**Gereksinim Düellosu ve Senaryo Oyunu** — ATÜ TechBuilders · 4 Kasım 2026 Stant Etkinliği

Tablette yatay, tam ekran ve çevrimdışı çalışan bir PWA. İki kişilik **Düello** (gereksinim
kartlarını kendi telefon kutuna sürükle) ve tek kişilik **Senaryo** (5 adımlık karar zinciri)
modları, ortak skor tablosu ve PIN'li görevli menüsü. **API / yapay zekâ kullanılmaz**: görevler,
senaryolar, puanlama, jüri yorumları, lakaplar ve takma ad filtresi tamamen yereldir.

Referans: kulübün **Tam Prototip v0.3**'ü ([`docs/tam_prototip/`](docs/tam_prototip/) — kılavuz PDF,
oynanabilir prototip, ekran görselleri) ve **Renk Paleti** ([`docs/renk_paleti/`](docs/renk_paleti/)).
Ürün kuralları: [`docs/BuildArena_Proje_Dokumani.md`](docs/BuildArena_Proje_Dokumani.md).

## Görünüm

Koyu ekran yerine bir masa oyunu: krem kâğıt zemin, mürekkep çizgiler ve logodan alınmış dört
baskı rengi (Open Color). Butonlarda 2 px mürekkep çerçeve ve 3 px sert gölge var; basınca gölge
kaybolur ve buton içeri gömülür. Ahududu yalnızca oyuna sokan butonda (ekranda bir tane), mavi
Oyuncu 1, turuncu Oyuncu 2, deniz yeşili Senaryo, altın ödül. Başlıklar Bricolage Grotesque,
metin Plus Jakarta Sans, sayaç ve etiketler JetBrains Mono. Token'lar `src/styles/tokens.css`.

**Koyu tema:** her başlığın sağ üstündeki ay düğmesi aynı paletin gece hâlini açar (güneş düğmesi
geri döner, seçim cihazda hatırlanır). Kâğıt ile mürekkep yer değiştirir: koyu bir oyun masası,
krem yazı ve çizgiler, siyah sert gölgeler. Dört baskı renginin dolguları aynı kalır; koyu zeminde
yazı ve çerçeve olarak aynı ailenin açık tonu (Open Color 4) kullanılır.

## Kurulum

Node.js 22+ gerekir.

```bash
npm install
npx playwright install chromium   # uçtan uca testler için (bir kez)
```

## Komutlar

| Komut                 | Ne yapar                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| `npm run dev`         | Geliştirme sunucusu: http://localhost:5173/?skipTutorial=1             |
| `npm test`            | Birim + bileşen testleri (Vitest)                                      |
| `npm run e2e`         | Uçtan uca testler: 1280×800 dokunmatik tablet profili + çevrimdışı PWA |
| `npm run e2e:ui`      | Playwright arayüzüyle testleri izleyerek çalıştır                      |
| `npm run lint`        | oxlint                                                                 |
| `npm run typecheck`   | TypeScript kontrolü                                                    |
| `npm run build`       | Üretim derlemesi + service worker                                      |
| `npm run scan:bundle` | Derlemede API anahtarı kalıbı arar (güvenlik ağı)                      |
| `npm run check`       | Hepsi, CI sırasıyla — iş bitmeden yeşil olmalı                         |
| `npm run apk`         | Android test APK'sı → `dist-apk/BuildArena-<sürüm>-debug.apk`          |

Test bayrakları (yalnızca geliştirmede): `?skipTutorial=1`, `?seed=N` (çark N % 16. krizde durur;
düelloda görev ve adlar sabitlenir), `?fastTimers=1` (animasyon beklemeleri kısalır),
`?demo=1` (boş veritabanına örnek bir gün: 36 senaryo, 16 düello), `?intro=1` (APK'nın açılış
animasyonunu tarayıcıda oynatır).

## Android APK (tablette deneme)

Uygulama Capacitor ile bir Android uygulamasına sarılır (`android/`, `capacitor.config.ts`).
`npm run apk` web uygulamasını derler, Android projesine kopyalar ve Gradle ile hata ayıklama
imzalı bir APK üretir. Android Studio'nun SDK'sı ve JDK 17–21 kendiliğinden bulunur (ya da
`ANDROID_HOME` / `JAVA_HOME`). APK içinde: yatay ve tam ekran (kenardan kaydırınca sistem
çubukları kısa süre görünür), ekran kararmaz, titreşim izni var, geri tuşu uygulamayı kapatmaz,
kulübün ikonları ve bir açılış animasyonu (logo halkasıyla yaylanarak gelir, kıvılcımlar saçılır,
"BuildArena" harf harf yükselir, dört renk çubuğu dolar, sonra perde gibi kalkar; dokununca
atlanır — `src/components/BootIntro.tsx`); ekran klavyesi oyunu küçültmez, üstüne açılır (yazılan
alan klavyenin altında kalacaksa ekran yalnızca o kadar yukarı kayar); görevli menüsündeki PNG'ler Android'in paylaş menüsüyle
kaydedilir. İnternet gerekmez.

Kurulum: APK'yı tablete kopyala (USB, Drive, WhatsApp…), dosyaya dokun, "bilinmeyen kaynaklardan
yükleme"ye izin ver. USB hata ayıklama açıksa: `adb install -r dist-apk/BuildArena-0.1.0-debug.apk`.
Stantta tam kiosk için Android'in **uygulama sabitleme** (Ekran sabitleme) özelliğini aç.

## Puanlama

**Senaryo (100 puan):** Her adımın değeri zorluğuna göre belirlenir (en iyi seçeneğe yakın,
yanıltıcı bir ikinci seçenek varsa ve "genel" karar adımıysa daha değerli); beş adım toplam
100'e tam bölünür. Karar ekranında adımın değeri görünür (ör. «Zor karar · 21 puan»).
Doğruluk eğrisi `(puan/20)^1,5`: en iyi karar tam puan, "makul" karar (14/20) yaklaşık %59,
zayıf karar (8/20) %25 alır. Her adımın %10'u hız payıdır: ilk 2 sn tam, süre bitimine doğru
sıfıra iner ve doğrulukla çarpılır (hızlı ama yanlış karar ek puan almaz). Süresi dolan adım 0
puandır; **boş bir oyun 0 puan alır.** Hepsi en iyi ve hızlı = 100, hepsi en iyi ama son saniyede
= 90.

**Düello (100 puan):** Doğru seçim 55 (kritik 3, önemli 2, destek 1 ağırlıklı), İsabet 20
(kesinlik–duyarlılık F1), Birleşimler 15, Hız bonusu 10 (kalan süre × tasarım kalitesi);
her tuzak kartı −5, toplam 0'ın altına inmez. **Boş kutu 0 puan.** Eşitlikte daha az tuzak, sonra
(puan alınmışsa) daha çok kalan süre kazanır; iki boş kutu berabere biter.

## Ses, müzik ve titreşim

Tüm sesler Web Audio ile üretilir (dosya yok, çevrimdışı çalışır): 35+ yumuşak efekt (çan,
marimba, tahta, hava sesi) ve her bölüme ayrı, üretken bir müzik:

- **Ana menü** (ve tutorial, skor tablosu, sonuçlar): sakin lo-fi, 74 BPM, elektrikli piyano ve
  fırça davul.
- **Senaryo modu**: rahatlatıcı ve gizemli, 64 BPM D dorian; nefes alan pad, cam çanlar, uzun
  yankı, hafif bir kalp atışı.
- **Düello**: ritmik ve rekabetçi, 124 BPM; görev kartında boğuk bir hazırlık, oyun başlayınca
  davullar girer.

Her ekranın üst köşesinde müzik ve efektlerin **ayrı düğmeleri** var: müzik düğmesine basınca
müzik anahtarı ve **ses seviyesi çubuğu** (varsayılan %80) açılır; aynı çubuk görevli ayarlarında da
var. Destekleyen tabletlerde kısa titreşimler eşlik eder. Hepsi cihazda hatırlanır.

## Uygulama simgesi

Kulübün ikon paketinden: tablet/telefona kurulunca `public/icons/` (Android 192/512, maskelenebilir
512, iPhone/iPad 180, sekme 48); App Store ve Google Play simgeleri ile iOS/Android proje setleri
`store/` klasöründe (bkz. `store/README.md`).

## Takma ad

Ekran klavyesi ve hazır ad paneli yok: tabletin kendi klavyesiyle yazılan bir alan ve içinde bir
**zar**. Zara her basışta alan slot makinesi gibi birkaç adı çevirip birinde durur; yaklaşık 3.700
Teknoloji + Hayvan kombinasyonu ve elle seçilmiş adlar arasından, bugün alınmamış ve son
gösterilenlerden farklı bir ad gelir. Düelloda da her oyuncunun zarı sınırsız döner.
Uygunsuz ad filtresi Türkçe harfleri sadeleştirir, rakam/simge yazılışlarını (S1kt1r, 4mk, @),
aralıklı harfleri (s.i.k) ve uzatmaları (orrrospu) yakalar; kök listesiyle "oç…", "bok…",
"seks…" ile başlayan her şeyi, cinsellikle ilgili Türkçe/İngilizce kelimeleri ve tek başına "31"i
reddeder. Ocak, Boksör, Seksen, Gotik, Saksofon, Malatyalı, Amasya, Sıkı Takipçi gibi masum adları
engellemez (`kokIstisna` listesi, `tests/unit/nicknameStrict.test.ts`).

## İçerik

- **Senaryo:** 16 kriz (8 yeni: E-Ticaret Kampanya Günü, Ring Otobüsü, Kampüs Otostop, Online
  Sınav, Mobil Bankacılık, Deprem Tatbikatı, Bahar Şenliği bileti, Kampüs Wi-Fi). 5. adım artık
  "Sistem büyürken asla vazgeçilmemesi gereken özellik hangisi?" diye sorar ("olmazsa olmaz").
- **Düello:** 15 görev (10 yeni: Ring, Etkinlik, Otopark, Sınav, Kayıp Eşya, Spor Salonu,
  Çamaşırhane, Derslik, Kan Bağışı, Kariyer), 84 kart.

## Sosyal medya ve oyundan çıkış

Ana ekranda ve iki oyun sonunda **Bizi takip et** düğmesi kulübün Linktree QR kodunu açar
(`public/social/linktree-qr.png`, koyu temada da beyaz zemin). Oyunların içinde (çark, kriz
girişi, adımlar, düello görev kartı ve oyun) **ev** düğmesi önce sorar, sonra turu kaydetmeden
ana sayfaya döner.

## Görevli menüsü

Skor tablosundaki **Görevli** düğmesi, ana ekrandaki ayar düğmesi ya da logoya 3 sn basılı
tutmak → PIN (varsayılan **1234**, etkinlikten önce değiştirin). 5 hatalı denemede tuş takımı
5 dakika kilitlenir. Sekmeler: **İlk 3** (paylaşım izni verenler; 1080×1350 gönderi ve
1080×1920 hikâye PNG), **Gün sonu** (kişisel veri içermeyen özet + iki PNG), **Ayarlar**
(düello 45/60/90 sn, adım 15/20/25 sn, ses seviyesi, ses, müzik, titreşim, bekleme modunda
tutorial, tutorial'ı sıfırla, günü arşivle ve sıfırla, örnek verileri yükle).

Düello sonucunda **Rövanş yok**: stant meşgul kalmasın, sıradaki ikili oynasın diye yalnızca Ana
Menü ve Günün Liderleri var.

## Klasör yapısı

```
docs/          Proje dokümanı, senaryo modu, tam prototip v0.3, renk paleti (referans)
public/        Logo, PWA ikonları
src/app/       Yönlendirme, ilk açılış, test bayrakları, localStorage, PIN
src/audio/     Ses motoru, efektler, üretken müzik, titreşim
src/screens/   Tüm ekranlar
src/components/ Ortak bileşenler (Stage, PIN, onay, zamanlayıcı, ses düğmeleri …)
src/game/      Puanlama, telefon kutusu, dokunma izolasyonu, takma ad, efektler, paylaşım görselleri
src/stores/    Zustand store'ları (senaryo, düello, ayarlar, arayüz)
src/ai/        Zod şemaları ve yerel jüri şablonları (API yok)
src/data/      Kart kataloğu, 15 görev, 16 kriz, tutorial, takma adlar, filtre listeleri
src/db/        Dexie (skorlar, düellolar, arşiv), örnek gün
src/styles/    Tasarım token'ları ve prototipten taşınan stiller
tests/         Birim ve bileşen testleri
e2e/           Playwright testleri (buton matrisi, düello çoklu dokunma, senaryo, görevli, tutorial …)
.agents/       Antigravity skill'leri (frontend-design, iş paketi, buton testleri)
AGENTS.md      Kodlama ajanları için proje kuralları (Antigravity + Claude Code)
```

## Antigravity ile geliştirme

Klasörü Antigravity IDE'de açın; `AGENTS.md` kuralları ve `.agents/skills/` altındaki skill'ler
otomatik yüklenir. Önerilen eklentiler `.vscode/extensions.json` içindedir. Her buton ve her ekran
geliştirilirken test edilir (`buildarena-button-tests` skill'i).

## Lisans

Kod [MIT lisansı](LICENSE) ile açıktır. ATÜ TechBuilders adı ve logosu, ondan üretilen uygulama
ikonları ve `docs/` içindeki kulüp dokümanları lisansa dahil değildir; tüm hakları ATÜ
TechBuilders'a aittir.
