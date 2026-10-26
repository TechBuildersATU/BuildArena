> Bu dosya `BuildArena_Senaryo_Modu_Dokumantasyon.docx` belgesinden otomatik çıkarılmış metindir (görseller `gorseller/` klasöründe). Asıl belge .docx / .pdf dosyasıdır.

[IMAGE: ATÜ TechBuilders Student Club logosu]
ATÜ TECHBUILDERS  ·  4 KASIM 2026 STANT ETKİNLİĞİ
BuildArena  Senaryo Modu
Kriz Senaryoları, Skor Tablosu ve Sosyal Medya İlk 3 — Ürün, Tasarım ve Prototip Dokümanı
Proje 2 / 2  ·  Tek oyunculu karar oyunu  ·  Oynanabilir prototip dahil
[IMAGE: Karar adımı: durum, soru, dört seçenek ve 20 saniyelik süre halkası]
Görsel 1 — Karar adımı: durum, soru, dört seçenek ve 20 saniyelik süre halkası
| Sürüm | Tarih | Kaynak | Hazırlayan |
| 0.1 | 25 Ekim 2026 | BuildArena Proje Dokümanı v1.2 (Bölüm 7, 8, 11.2, 12) + v0.2 tasarım sistemi | ATÜ TechBuilders Yazılım Ekibi |

# 1. Bir Bakışta
Senaryo Modu, BuildArena'nın tek oyunculu kipidir. Oyuncu girişte bir takma ad yazar, kriz çarkı ona kampüsün beş sisteminden birinde bir kriz seçer (ör. "Yemekhane: Öğle Saati Krizi"). Ardından her biri 20 saniye süren 5 karar verir. Her seçimden sonra kısa bir kelebek etkisi kartı, kararın sonucunu gösterir. Sonunda karar zinciri görselleşir, yapay zekânın puanlama anahtarıyla 100 üzerinden puan hesaplanır, bir unvan verilir ve sonuç skor tablosuna işlenir. Günün sonunda paylaşım izni veren oyuncular arasından ilk 3, kulübün sosyal medya hesaplarında paylaşılmak üzere hazır görsel olarak dışa aktarılır.
| Başlık | Karar |
| Oyuncu | 1 kişi; girişte takma ad zorunlu (3–16 karakter) |
| Uzunluk ve adım | 5 adım × 20 sn ≈ 2,5 dakika · her adımda durum + soru + 4 ikonlu seçenek |
| Sıra | Adım 1–4 detay (özellik, veri, akış) · Adım 5 genel (fonksiyonel olmayan gereksinim / öncelik) |
| Senaryolar | Yemekhane · Kütüphane · Kafe · Hastane · Mağaza — beşi de tam yazıldı (Bölüm 5) |
| Puan | 5 × 20 = 100; süre dolan adım 0 puan; unvan 5 kademe |
| Skor tablosu | Takma ad · puan · unvan · senaryo · saat; podyum + liste + senaryo filtresi |
| Sosyal medya | İzin verenlerden ilk 3 → 1080×1350 gönderi + 1080×1920 hikâye PNG; ekip kontrol edip paylaşır |

## 1.1 İstekler ve karşılıkları
| Kulübün isteği | Nasıl karşılandı | Bölüm |
| Senaryo sonunda AI 100 üzerinden puanlasın, skor tablosuna işlensin | Hibrit puanlama: AI her seçeneğin puanını önceden belirler, toplam anında hesaplanır; AI analiz yazar. Sonuç kaydedilir ve sıra animasyonla gösterilir. | 3.6 · 6 |
| Skor tablosunda takma adlar yer alsın | Takma ad girişi zorunlu; tabloda yalnızca takma ad görünür. | 3.1 · 3.7 |
| Senaryoya girerken takma ad yazılsın | Uygulama içi Türkçe Q klavye, canlı kurallar, küfür filtresi, aynı ada otomatik ek (Korkut_2), zarla rastgele ad. | 3.1 · 7 |
| En yüksek puanlı ilk 3 sosyal medyada paylaşılsın | Görevli menüsünden "İlk 3'ü Dışa Aktar": izin verenlerden ilk 3 için hazır gönderi ve hikâye görseli. | 3.8 · 8 |
| Senaryo kısmında leaderboard olsun | Podyum (1–2–3) + 4. sıradan itibaren liste + senaryo filtresi + "SEN" vurgusu. | 3.7 |
| Sorular "bir kriz çıktı" tarzında olsun | Her senaryo bir krizle açılır (saat, yer, ölçek); 5 kararın her biri krizin bir anı. | 3.3 · 5 |
| Tasarım bizim v0.2 kodlamamıza göre | Tüm ekranlar v0.2 token'ları (logo kaynaklı palet, sakin grafit zemin, AI esintisi yok) ile yapıldı. | 11 |
| Animasyon ve efekt olabildiğince | Uçan kelebek, kriz alarmı, çark, 3-2-1, damga, konfeti, sayaçlar, podyum yükselişi ve sesler: 30+ hareket. | 10 |

# 2. Oyunun Özü
Senaryo Modu "Kelebek Etkisi" fikrinden ilham alır: her karar bir sonraki durumu etkiler, sonunda kararların zincirleme etkisi görselleşir. Genel kültür sorusu yerine detaylı gereksinim kararlarından genele ulaşılır: ilk dört adım somut bir özelliği sorar (hangi giriş yöntemi, hangi ekran, hangi veri, kriz anında ne yapılmalı), beşinci adım sistemin bütününe dair genel bir karardır (en kritik fonksiyonel olmayan gereksinim).
## 2.1 Kurallar
| Kural | Değer |
| Adım süresi | 20 saniye; son 5 saniyede süre halkası kırmızıya döner ve tik-tak sesi başlar |
| Seçim | Dokunulan seçenek kilitlenir; geri alınamaz |
| Süre dolarsa | O adım 0 puan; zincirde "süre doldu" düğümü; kart: "Karar verilmedi; kriz kendi kendine büyüdü." |
| Geri bildirim | Oyun sırasında doğru/yanlış söylenmez; yalnızca kararın kısa vadeli etkisi gösterilir |
| Kelebek etkisi kartı | Her seçimden sonra; 2,6 sn ekranda kalır, dokununca hemen geçer (bkz. 2.2) |
| Seçenek dağılımı | Her adımda 1 en iyi (20), 1 makul (10–14), 2 zayıf (0–8); en iyi seçenek hep aynı sırada değil |
| Tekrar oynama | Kriz çarkı aynı cihazda son oynanan senaryoyu seçmez; AI aynı sistem için farklı metin ve seçenek sırası üretebilir |

## 2.2 Kaynak dokümandan bilinçli bir sapma
| Kelebek etkisi kartı: 1,5 sn yerine 2,6 sn / Proje dokümanı v1.2 kartın 1,5 sn gösterilmesini öneriyor. Prototipte etki cümleleri 6–10 kelime; stant ortamında bu sürede okunamıyor. Kart 2,6 sn kalıyor ama dokununca hemen geçiyor; böylece hızlı oyuncu beklemiyor. / Toplam süreye etkisi: 5 × 1,1 sn ≈ 5,5 sn. 2 Kasım test turnuvasında iki süre karşılaştırılıp karar verilmeli. |

# 3. Ekranlar
Görseller oynanabilir prototipten (prototip/index.html) alınmıştır; 1280 × 800 tablet ekranı içindir. Prototip her ekran boyutuna orantılı olarak sığar.
## 3.1 Takma ad girişi
[IMAGE: Takma ad girişi: canlı kurallar, paylaşım izni ve uygulama içi Türkçe klavye]
Görsel 2 — Takma ad girişi: canlı kurallar, paylaşım izni ve uygulama içi Türkçe klavye
- Uygulama içi Türkçe Q klavye: tabletin kendi klavyesi ekranın yarısını kapatmasın diye. Ğ, Ü, Ş, İ, Ö, Ç tuşları var; kelime başı otomatik büyük harf, ⇧ ile tek seferlik büyük harf. Tuşlar basılınca çöker ve dalga efekti verir.
- Canlı kurallar: 3–16 karakter · harf, rakam, boşluk, _ ve - · uygun dil. Her kural yazdıkça yeşil ✓ ya da kırmızı ✕ olur. Uygunsuz adda: "Bu ad kullanılamıyor, başka bir ad dene."
- Aynı ad: bugün aynı ad varsa sonuna sayı eklenir ve önceden gösterilir: "Bugün bu ad alınmış → Korkut_2 olarak kaydedilecek."
- Zar butonu: ilham vermek için teknoloji + hayvan karışımı rastgele bir ad yazar (ör. "Cache Kedisi", "Async Ahtapot").
- Önizleme: sağ üstte "skor tablosunda böyle görüneceksin" satırı.
- Paylaşım izni (varsayılan açık, değiştirilebilir): "Takma adımın ve puanımın ATÜ TechBuilders sosyal medya hesaplarında paylaşılmasına izin veriyorum." İzin vermeyen de oynar ve tabloda görünür.
- Ortam animasyonu: arka planda ara ara süzülen küçük bir kelebek (modun maskotu).
## 3.2 Kriz çarkı
[IMAGE: Kriz çarkı: vurgu karttan karta yavaşlayarak geçer ve bir krizde durur]
Görsel 3 — Kriz çarkı: vurgu karttan karta yavaşlayarak geçer ve bir krizde durur
- Beş senaryo kartı yan yana; vurgu çerçevesi her geçişte "tık" sesiyle bir sonrakine atlar, giderek yavaşlar (yaklaşık 3 tam tur).
- Durduğu kart büyür ve sallanır, diğerleri söner; "KRİZ SEÇİLDİ" damgası basılır. 1,5 sn sonra kriz girişine geçilir.
- Aynı cihazda son oynanan senaryo seçilmez; ardışık oyuncular farklı kriz görür.
## 3.3 Kriz girişi
[IMAGE: Kriz girişi: kayan uyarı şeridi, büyük saat, yer ve ölçek, kriz metni]
Görsel 4 — Kriz girişi: kayan uyarı şeridi, büyük saat, yer ve ölçek, kriz metni
- Kriz alarmı: üstte sarı-siyah, kayan uyarı şeridi ve "KRİZ ALARMI · YEMEKHANE BİLGİ SİSTEMİ" yazısı; arkada yavaş nabız atan kırmızı bir ışık. Ekran açılırken kısa bir siren sesi çalar.
- Büyük saat (iki nokta yanıp söner), yer ve ölçek çipleri (ör. "3.000 öğrenci"), etkilenen hedef kitle çipleri.
- Kriz metni daktilo efektiyle yazılır. "Krizi başlat" → tam ekran 3 · 2 · 1 · Başla! geri sayımı.
## 3.4 Karar adımı
[IMAGE: Karar adımı: karar zinciri, durum kartı ve 2×2 seçenekler]
Görsel 5 — Karar adımı: karar zinciri, durum kartı ve 2×2 seçenekler
| Bölge | İçerik |
| Üst bar | Logo · "SENARYO" + senaryo adı · Adım 2/5 · 20 sn süre halkası · takma ad çipi · ses düğmesi |
| Karar zinciri | 5 düğüm. Tamamlanan düğüm seçilen kararın ikonunu taşır (renksiz: doğru/yanlış belli olmaz); şu anki düğüm pembe halkayla nabız atar; gelecek adımların konusu gizlidir. |
| Durum kartı | "DURUM · ADIM 2 · DETAY" etiketi, durum metni (daktilo) ve kalın soru (kayarak gelir) |
| Seçenekler | 2×2 büyük kart: harf (A–D), ikon, en fazla 6 kelime. Kartlar sırayla aşağıdan kayarak gelir. |
| Alt ipucu | "Bir seçeneğe dokun · süre dolarsa bu adım 0 puan" |

## 3.5 Kelebek etkisi
[IMAGE: Seçimden sonra: kelebek karttan zincire uçar, etki kartı alttan kayar]
Görsel 6 — Seçimden sonra: kelebek karttan zincire uçar, etki kartı alttan kayar
- Seçilen kart büyür, ikonu açık karoya döner ve ✓ rozeti alır; diğerleri söner.
- Uçan kelebek: seçilen kartın ikonundan çıkan logo renklerinde bir kelebek, kanat çırparak eğri bir yolla zincirdeki düğüme uçar; arkasında renkli iz bırakır. Düğüme konunca halka dalgası yayılır ve düğüm, seçilen ikonla dolar.
- Etki kartı: krem renkli kart alttan yaylı bir hareketle kayar: "KELEBEK ETKİSİ · Kayıtlar tutarlı; artık hız önemli hale geldi." Alttaki çubuk kalan süreyi gösterir; "Devam" ya da karta dokunmak hemen geçirir.
## 3.6 Final: karar zinciri, puan ve unvan
[IMAGE: Final ekranı: 5 kararın zinciri, puan halkası, unvan damgası, jüri analizi ve skor tablosu sırası]
Görsel 7 — Final ekranı: 5 kararın zinciri, puan halkası, unvan damgası, jüri analizi ve skor tablosu sırası
- Karar zinciri: çizgi soldan sağa çizilir, beş düğüm sırayla "pop" ederek belirir. Her düğüm seçilen kararın ikonunu, durumunu (İyi yeşil ✓ · Orta sarı – · Zayıf kırmızı ✕) ve tek satırlık etkiyi gösterir. Durum hiçbir zaman yalnızca renkle verilmez.
- Puan halkası: 0'dan dolar, sayı sayarak artar (ör. 88/100).
- Unvan damgası: "Senior Analist" ekrana damga gibi basılır (alçak "pat" sesi).
- Adım puanları: her adımın 20 üzerinden puanı ince çubuklarla; değerler çubuğun yanında yazılı.
- Jüri analizi: daktilo efektiyle yazılır. Ör.: "Turnike geçişi, atomik işlem ve yoğun saat performansı kararların çok sağlam. Menü bilgisi tarafında küçük bir eksik var: 'Menü + kalori + alerjen' daha iyi işlerdi."
- Sıra animasyonu: "Skor tablosuna eklendi" kartında sıra numarası en alttan gerçek sıraya tıkırdayarak sayar (#11 → #3). 75+ puanda konfeti, 90+ puanda büyük konfeti ve fanfar.
## 3.7 Skor tablosu
[IMAGE: Günün skor tablosu: podyum, liste, senaryo filtresi ve KVKK notu]
Görsel 8 — Günün skor tablosu: podyum, liste, senaryo filtresi ve KVKK notu
- Podyum: 2 · 1 · 3 sütunları alttan yükselir; avatarlar ve puanlar sırayla belirir, 1. sıranın tacı yukarıdan düşer. Altın, gümüş, bronz renkler; sıra numarası her zaman yazılı.
- Liste: 4. sıradan itibaren; sıra, baş harf, takma ad, senaryo, unvan, saat, puan. Satırlar sağdan kayarak gelir.
- "SEN" vurgusu: az önce oynayan oyuncunun satırı pembe şeritle vurgulanır; ilk 3'teyse podyumdaki avatarı halkalanır. 13. sıradan aşağıdaysa listenin sonuna "• • •" ile eklenir.
- Megafon ikonu: paylaşım izni veren oyuncuyu gösterir.
- Senaryo filtresi: Tümü + 5 senaryo ikonu; filtre değişince tablo yeniden canlanır.
- KVKK notu ve sol altta kesikli Görevli düğmesi (PIN ister).
## 3.8 Görevli menüsü: İlk 3'ü dışa aktar
[IMAGE: Görevli menüsü: izin verenlerden ilk 3, atlananlar ve görsel önizlemeleri]
Görsel 9 — Görevli menüsü: izin verenlerden ilk 3, atlananlar ve görsel önizlemeleri
- Giriş: skor tablosundaki "Görevli" düğmesi ya da logoya 3 sn basılı tutmak → 4 haneli PIN (yanlış PIN'de noktalar sallanır).
- Liste: paylaşım izni veren oyuncular arasından en yüksek puanlı 3 kişi. İzin vermediği için atlanan oyuncular adıyla belirtilir (ör. "Turbo Kaplumbağa paylaşım izni vermediği için listeye alınmadı").
- Dışa aktar: "Gönderi PNG · 1080×1350" ve "Hikâye PNG · 1080×1920" düğmeleri görseli doğrudan indirir. Önizlemeler sağda canlı çizilir.
- Günü arşivle ve sıfırla: onay ister; kayıtlar silinmez, tarihli bir arşive taşınır.
- Otomatik paylaşım yapılmaz; kulübün sosyal medya ekibi görseli kontrol edip paylaşır.
## 3.9 Paylaşım görselleri
| Instagram gönderisi · 1080 × 1350 | Hikâye · 1080 × 1920 |

Görsel 10 — Uygulamanın ürettiği paylaşım görselleri (örnek veriyle)
- Kulüp logosu, çevresinde dönen yazının durağan hali ("ATÜ • TECHBUILDERS"), "4 KASIM STANT · SENARYO MODU" ve "BuildArena Şampiyonları" başlığı.
- Podyum: altın, gümüş, bronz sütunlar; her oyuncu için baş harf, takma ad, puan ve unvan. 1. sıraya taç.
- Kenarlarda logo renklerinde konfeti, altta devre çizgisi süsü; alt bilgi: "ATÜ TechBuilders · Yazılım üretir, kampüse değer katarız." ve #BuildArena.
- Görseller tamamen cihazda (canvas) çizilir; internet gerekmez.
# 4. Akış ve Zamanlama
[IMAGE: Senaryo modunun uçtan uca akışı]
Görsel 11 — Senaryo modunun uçtan uca akışı
- Ana ekranda Senaryo'ya dokunulur.
- Takma ad yazılır, paylaşım izni seçilir → "Krize gir".
- Kriz çarkı bir senaryo seçer (yapay zekâ üretir; yoksa bankadan gelir).
- Kriz girişi okunur → "Krizi başlat" → 3 · 2 · 1.
- 5 karar: her adımda durum → seçim (20 sn) → kelebek etkisi.
- Final: zincir, puan, unvan, jüri analizi; kayıt skor tablosuna yazılır.
- Skor tablosu → "Yeni oyuncu" ile başa dönülür.
- Gün sonunda görevli, PIN ile İlk 3'ü dışa aktarır; ekip kontrol edip paylaşır.
| Aşama | Süre (yaklaşık) |
| Takma ad | 15–25 sn |
| Kriz çarkı | 3 sn + 1,5 sn |
| Kriz girişi + 3-2-1 | 5–8 sn |
| 5 karar (okuma + seçim + etki) | 5 × (8–20 sn + 2,6 sn) ≈ 55 sn – 1 dk 55 sn |
| Final animasyonları | ≈ 6 sn |
| Toplam | ≈ 1,5 – 2,5 dakika |

# 5. Senaryo Bankası (5 Kriz)
Beş senaryonun tamamı yazıldı ve veri/senaryolar.json dosyasına kondu. Bu dosya hem prototipte hem de uygulamada çevrimdışı banka olarak kullanılır (src/data/scenarios.json). Her seçeneğin kelebek etkisi metni ve finalde görünen kısa özeti JSON'dadır; aşağıdaki tablolar okunabilirlik için en iyi seçeneğin etkisini gösterir.
| Bankanın doğrulaması (otomatik kontrol edildi) / Her senaryoda tam 5 adım; adım 1–4 detay, adım 5 genel · her adımda 4 seçenek ve tam bir 20 puanlık seçenek · seçenek metinleri en fazla 6 kelime · 88 ikonun tamamı Lucide v0.460'da mevcut · her senaryonun en yüksek puanı 100. / Yemekhane senaryosunun puanları kulüp dokümanından (v1.2, Bölüm 7.4) birebir alındı; iki adımında "makul" (10–14) seçenek yok. Diğer dört senaryo kuralı tam izler. |

## 5.1 Yemekhane: Öğle Saati Krizi
Sistem: Yemekhane Bilgi Sistemi · Saat: 11:58 · Yer: Merkez Yemekhane · Ölçek: 3.000 öğrenci · Etkilenenler: Öğrenci, Personel, Yönetici
"Saat 11:58. Merkez yemekhanenin kapısında 3.000 öğrenci var. Turnikeler, bakiye sistemi ve menü ekranı senin kararlarına bağlı."
| Adım | Durum ve soru | Seçenekler (puan) | En iyi seçeneğin etkisi |
| 1 · Detay | Kapıda kuyruk büyüyor. Geçiş yöntemi öğle saatinin kaderini belirleyecek. / Öğrenciler turnikeden nasıl geçsin? | A · NFC kart / telefon (20) / B · QR kod (14) / C · Kimlik no ile görevli girişi (4) / D · Yüz tanıma (6) | Kuyruk akıyor; geçiş 1 saniye sürüyor. |
| 2 · Detay | Öğrenci turnikeden geçti ama bakiye düşümü 2 saniye gecikti. / Bakiye ve geçiş izni nasıl işlensin? | A · Önce kapı açılsın, bakiye sonra (6) / B · Bakiye ve geçiş tek işlemde (20) / C · Gün sonunda toplu düşülsün (3) / D · Bakiye kontrolü kaldırılsın (0) | Kayıtlar tutarlı; artık hız önemli hale geldi. |
| 3 · Detay | Saat 12:00: 3.000 öğrenci aynı anda geldi ve sistem yavaşladı. / Yükü nasıl karşılarsın? | A · Daha güçlü tek sunucu (10) / B · Turnikeleri serbest bırak (2) / C · Önbellek + turnikede yerel yetki (20) / D · Öğle arasını uzat (5) | Gecikme 200 ms'nin altına indi. |
| 4 · Detay | Öğrenciler menü ekranının önünde duraksıyor; kuyruk yine yavaşladı. / Menü ekranında öğrenciye ne gösterilsin? | A · Sadece yemek adları (8) / B · Yemek fotoğrafları (12) / C · Sadece fiyat (4) / D · Menü + kalori + alerjen (20) | Glütene hassas öğrenci doğru seçimi yaptı. |
| 5 · Genel | Gün bitti. Rektörlük sistemi tüm kampüse yaymak istiyor. / Bu sistemin en kritik fonksiyonel olmayan gereksinimi nedir? | A · Düşük gecikme + atomik işlem (20) / B · Çoklu dil desteği (8) / C · Renkli ve modern arayüz (4) / D · Sosyal medya entegrasyonu (0) | Yarın da 3.000 kişi sorunsuz geçecek. |

## 5.2 Kütüphane: Final Haftası
Sistem: Kütüphane Otomasyon Sistemi · Saat: 09:00 · Yer: Merkez Kütüphane · Ölçek: 1.200 öğrenci · Etkilenenler: Öğrenci, Akademisyen, Kütüphaneci
"Final haftası başladı. Kütüphanenin önünde uzun bir kuyruk var ve herkes aynı üç kaynak kitabı istiyor."
| Adım | Durum ve soru | Seçenekler (puan) | En iyi seçeneğin etkisi |
| 1 · Detay | Bir öğrenci "Veri Yapıları" kitabını arıyor; aynı adda 40 sonuç çıkıyor. / Katalog araması nasıl çalışsın? | A · Sadece kitap adıyla (10) / B · ISBN, yazar, kategori filtreli (20) / C · Kütüphaneciye sorsun (4) / D · Rafları gezip bulsun (0) | Doğru baskı 5 saniyede bulundu. |
| 2 · Detay | Son kopya için iki öğrenci aynı saniyede "Ayırt" tuşuna bastı. / Aynı kitaba iki rezervasyon gelirse ne olsun? | A · İkisine de onay verilsin (0) / B · Kütüphaneci elle seçsin (6) / C · Kilitle: ilk gelen alır (20) / D · Kilitsiz bekleme listesi (12) | Biri kitabı aldı, diğerine "sıradasın: 1" bildirimi gitti. |
| 3 · Detay | Final bitti ama 120 kitap hâlâ iade edilmedi. / Geciken kitaplar nasıl takip edilsin? | A · Otomatik ceza + hatırlatma (20) / B · Sadece günlük ceza (12) / C · Dönem sonunda toplu uyarı (5) / D · Takip edilmesin (0) | İadelerin %80'i 3 günde tamamlandı. |
| 4 · Detay | Sistem 3 kopya gösteriyor ama rafta tek kitap var. / Kopya ve stok nasıl takip edilsin? | A · Dönemde bir sayım (10) / B · Tabloda toplu sayı (6) / C · Sadece kitap adı kaydı (2) / D · Her kopyaya barkod + durum (20) | Kayıp kopya 2 dakikada bulundu: yanlış raftaymış. |
| 5 · Genel | Rektörlük sistemi 5 kampüse açmak istiyor; aynı anda 2.000 kişi bağlanacak. / Bu sistemin en kritik gereksinimi nedir? | A · Kişisel kitap önerileri (10) / B · Eşzamanlılık kontrolü (20) / C · Karanlık mod (4) / D · Sosyal medya paylaşımı (0) | 5 kampüs, 2.000 kişi, sıfır çift rezervasyon. |

## 5.3 Kafe: Sabah 9 Dersi Öncesi
Sistem: Kafe Otomasyon ve Sipariş Sistemi · Saat: 08:47 · Yer: Kampüs Kafesi · Ölçek: 200 öğrenci, 2 barista · Etkilenenler: Müşteri, Barista, Kasa
"Sabah 9 dersine 13 dakika var. Kafede 200 öğrenci ve yalnızca 2 barista var; kuyruk kapıya dayandı."
| Adım | Durum ve soru | Seçenekler (puan) | En iyi seçeneğin etkisi |
| 1 · Detay | Kasanın önündeki kuyruk kapıya dayandı; herkes derse yetişmeye çalışıyor. / Sipariş nasıl alınsın? | A · Tek kasa, sırayla (6) / B · İkinci kasa açılsın (12) / C · Barista ezberlesin (0) / D · Masadan QR menü (20) | Kuyruk dağıldı; siparişler masadan akıyor. |
| 2 · Detay | Siparişler geliyor ama barista kâğıt fişleri karıştırıyor. / Sipariş baristaya nasıl ulaşsın? | A · Gerçek zamanlı mutfak ekranı (20) / B · Yazıcıdan fiş (12) / C · Garson seslensin (4) / D · Mesaj grubuna düşsün (2) | Siparişler sırayla ekranda; hazır olan tek dokunuşla kapanıyor. |
| 3 · Detay | Bugün 140 latte satıldı; öğlen süt bitti. / Stok nasıl takip edilsin? | A · Gün sonu elle sayım (10) / B · Barista göz kararı (3) / C · Reçeteye göre otomatik düşüm (20) / D · Stok tutulmasın (0) | Süt %20'ye inince tedarikçiye uyarı gitti. |
| 4 · Detay | Saat 08:55: kafenin interneti kesildi. / Sistem internetsiz ne yapsın? | A · Hata ekranı göstersin (2) / B · Yerelde çalış, sonra eşitle (20) / C · Nakit al, kâğıda yaz (10) / D · Kafe kapansın (0) | Kimse fark etmedi; bağlantı gelince her şey eşitlendi. |
| 5 · Genel | Kafe zinciri bu sistemi kampüsteki 6 şubeye kurmak istiyor. / En kritik fonksiyonel olmayan gereksinim hangisi? | A · Sadakat puanı sistemi (6) / B · Hızlı yanıt süresi (14) / C · Animasyonlu menü (2) / D · Çevrimdışı çalışabilme (20) | İnternet gitse de 6 şubede kahve akmaya devam ediyor. |

## 5.4 Hastane: Acil Serviste Bir Gün
Sistem: Hastane Bilgi Yönetim Sistemi · Saat: 02:14 · Yer: Acil Servis · Ölçek: 40 hasta, 6 doktor · Etkilenenler: Hasta, Doktor, Hemşire
"Gece 02:14. Acil serviste yoğun bir nöbet var: 40 hasta, 6 doktor ve yeni kurulan hastane sistemi."
| Adım | Durum ve soru | Seçenekler (puan) | En iyi seçeneğin etkisi |
| 1 · Detay | Sabah polikliniğinde 30 randevu iptal edildi ama boşalan saatler kimsenin ekranında görünmüyor. / İptal edilen randevular ne olsun? | A · Gün sonunda elle açılsın (10) / B · Telefonla tek tek aransın (6) / C · Bekleme listesine otomatik açılsın (20) / D · Boş kalsın (2) | Boş saatler 10 dakikada doldu; bekleyenler SMS aldı. |
| 2 · Detay | Bilinci kapalı bir hasta getirildi; penisilin alerjisi var ama kimse bilmiyor. / Hastanın alerji bilgisi nerede durmalı? | A · Elektronik kayıtta, uyarılı (20) / B · Cüzdandaki sağlık kartında (10) / C · Kâğıt dosyada (4) / D · Doktorun hafızasında (0) | İlaç yazılırken kırmızı uyarı çıktı; tehlike önlendi. |
| 3 · Detay | Kan tahlili 03:00'te çıktı; potasyum değeri kritik. / Sonuç doktora nasıl ulaşsın? | A · Laboratuvar ekranında beklesin (8) / B · Hemşire telefonla bildirsin (12) / C · Sabah raporuyla gitsin (2) / D · Kritik değere anlık bildirim (20) | Doktor 2 dakikada müdahale etti. |
| 4 · Detay | Aynı kayda stajyer, hemşire, doktor ve vezne görevlisi bakmak istiyor. / Kim hangi veriyi görsün? | A · Herkes her şeyi görsün (0) / B · Rol bazlı erişim (RBAC) (20) / C · Doktor tam, diğerleri özet (12) / D · Tek ortak şifre (3) | Vezne faturayı, doktor tüm geçmişi görüyor. |
| 5 · Genel | Bakanlık denetimi kapıda; sistem tüm hastanelere yayılacak. / En kritik fonksiyonel olmayan gereksinim nedir? | A · Hızlı açılan ekranlar (12) / B · Mobil uygulama teması (4) / C · Sosyal medya paylaşımı (0) / D · Şifreleme + KVKK + denetim izi (20) | Denetimden tam not: her erişim kayıtlı, veriler şifreli. |

## 5.5 Mağaza: Black Friday Gecesi
Sistem: Mağaza / E-Ticaret Uygulaması · Saat: 23:59 · Yer: Online Mağaza · Ölçek: 50.000 ziyaretçi · Etkilenenler: Müşteri, Yönetici, Kargo
"Saat 23:59. Black Friday başlamak üzere; sitede 50.000 kişi indirimin açılmasını bekliyor."
| Adım | Durum ve soru | Seçenekler (puan) | En iyi seçeneğin etkisi |
| 1 · Detay | 12.000 ürün var; müşteri "siyah, M beden, 500 TL altı mont" arıyor. / Ürünler nasıl bulunsun? | A · Çoklu filtre: beden, renk, fiyat (20) / B · Sadece kategori menüsü (10) / C · Ana sayfada uzun liste (2) / D · Müşteri hizmetlerine sorsun (4) | Aradığı mont 3 dokunuşta sepette. |
| 2 · Detay | Müşteri "BF50" kodunu girdi; indirim ve kargo ücreti çakışıyor. / Sepette ne gösterilsin? | A · Kod yalnızca ilk siparişte (6) / B · Kargo ücreti sonra e-postayla (3) / C · İndirim sepette, kargo ödemede (12) / D · Kod + kargo anında hesaplansın (20) | Toplam tutar baştan net; sepeti terk eden yok. |
| 3 · Detay | Sipariş verildi; müşteri "kargom nerede?" diye 3. kez yazıyor. / Sipariş durumu nasıl gösterilsin? | A · Sadece "kargoda" e-postası (10) / B · Adım adım canlı takip (20) / C · Müşteri arayıp sorsun (2) / D · Teslimat sürpriz olsun (0) | Hazırlanıyor → kargoda → dağıtımda; sorular yarıya indi. |
| 4 · Detay | Mont küçük geldi; müşteri iade etmek istiyor. / İade nasıl yapılsın? | A · E-postayla talep, 7 gün bekle (4) / B · Mağazaya gelip iade etsin (10) / C · Uygulamadan iade kodu + kargo (20) / D · İade kabul edilmesin (0) | 2 dakikada iade kodu; müşteri yeniden alışveriş yaptı. |
| 5 · Genel | Gece 00:00'da trafik 50 kat arttı; geçen yıl site 12 dakika çökmüştü. / En kritik fonksiyonel olmayan gereksinim nedir? | A · Gece bakım modu (4) / B · Animasyonlu ana sayfa (2) / C · Daha güçlü tek sunucu (10) / D · Yatay ölçek + önbellek (20) | 50.000 kişi aynı anda; site saniyesinde açılıyor. |

# 6. Puanlama ve Unvanlar
## 6.1 Puan
- 5 adım × 20 puan = 100. Her seçeneğin 0–20 arası puanı, senaryo üretilirken yapay zekânın oluşturduğu puanlama anahtarındadır; oyuncuya oyun sırasında gösterilmez.
- Süre dolan adım 0 puan alır.
- Sıralama: puan (yüksekten düşüğe) → eşitlikte toplam karar süresi (kısa olan önde) → eşitlikte erken oynayan önde.
## 6.2 Unvanlar
| Puan | Unvan |
| 90–100 | Baş Analist |
| 75–89 | Senior Analist |
| 55–74 | Mid Analist |
| 35–54 | Junior Analist |
| 0–34 | Stajyer (ama umut var!) |

## 6.3 Finaldeki durum etiketleri
| Adım puanı | Durum | Gösterim |
| 16–20 | İyi | Yeşil halka + ✓ rozet + "İyi" etiketi |
| 8–15 | Orta | Sarı halka + – rozet + "Orta" etiketi |
| 0–7 | Zayıf | Kırmızı halka + ✕ rozet + "Zayıf" etiketi |

## 6.4 Örnek hesap
| Adım | Seçim | Puan |
| 1 · Turnike geçişi | NFC kart / telefon | 20 |
| 2 · Atomik işlem | Bakiye ve geçiş tek işlemde | 20 |
| 3 · Yoğun saat | Önbellek + turnikede yerel yetki | 20 |
| 4 · Menü bilgisi | Sadece yemek adları | 8 |
| 5 · Kritik gereksinim | Düşük gecikme + atomik işlem | 20 |
| Toplam | 88 / 100 → Senior Analist | 88 |

## 6.5 "Puanı yapay zekâ verir": hibrit yöntem
| Önerilen: hibrit (proje dokümanı v1.2 ile aynı) / Yapay zekâ senaryoyu üretirken her seçeneğin puanını da belirler. Oyun bitince toplam tablette anında hesaplanır; yapay zekâ jüri analizini paralel yazar. / Neden? Sonuç beklemeden gelir · aynı seçimler hep aynı puanı alır (adil, itiraz edilemez) · internet kesilse de çalışır. / Tam AI puanlaması ayarlardan açılabilir: seçimler modele gönderilir, puanı model verir. Bu modda bile modelin puanı yerel hesapla karşılaştırılır; fark 15 puandan büyükse yerel puan gösterilir (tutarlılık bekçisi). |

# 7. Takma Ad Kuralları ve KVKK
| Kural | Ayrıntı |
| Uzunluk | 3–16 karakter (baştaki ve sondaki boşluk sayılmaz) |
| Karakterler | Harf (Türkçe karakterler dahil), rakam, boşluk, _ ve - |
| Uygun dil | Yerel kelime listesi (Türkçe + İngilizce; "s1k" gibi rakamla yazılışlar da yakalanır) + yapay zekâ denetimi. Uygunsuz adda: "Bu ad kullanılamıyor, başka bir ad dene." |
| Aynı ad | Bugün aynı ad varsa sonuna sayı eklenir (Korkut → Korkut_2); oyuncuya önceden gösterilir |
| Paylaşım izni | Ad alanının altında anahtar: "Takma adımın ve puanımın ATÜ TechBuilders sosyal medya hesaplarında paylaşılmasına izin veriyorum." İzin yoksa skor tablosunda görünür, paylaşıma dahil edilmez. |
| İstenmeyenler | Gerçek ad, numara, e-posta, telefon, fotoğraf istenmez ve saklanmaz |
| Görevli müdahalesi | Uygunsuz bir kayıt tablodan gizlenebilir (görevli menüsü) |

| Stantta görünür bilgilendirme notu / "Skor tablosunda yalnızca takma adın görünür. İzin verirsen ilk 3'e girdiğinde takma adın kulübümüzün hesaplarında paylaşılır. Gerçek ad, telefon ya da e-posta almıyoruz." / Ödül verilecekse kazananlar stantta takma adlarıyla kendilerini tanıtır; iletişim bilgisi uygulamada tutulmaz. |

Not: Prototipteki kelime listesi kısa bir örnektir. Uygulamada badwords.json genişletilmeli ve yapay zekâ denetimi (Bölüm 9) eklenmelidir.
# 8. Skor Tablosu ve İlk 3 Paylaşımı
| Alan | Açıklama |
| Kapsam | Senaryo modunun her oyunu kaydedilir. (Düello sonuçları isteğe bağlı ayrı "Günün Düelloları" listesinde.) |
| Sütunlar | Sıra · Takma ad · Senaryo · Unvan · Saat · Puan (+ paylaşım izni ikonu) |
| Sıralama | Puan ↓ → eşitlikte toplam süre ↑ → eşitlikte erken oynayan önde |
| Görünüm | Podyum (ilk 3) + liste (4–13) + "SEN" satırı; senaryo filtresi; ana ekrandaki kupa ikonu; bekleme modunda dönen "Günün İlk 3'ü" |
| Saklama | Uygulamada IndexedDB (Dexie): tablet kapansa da kalır. Prototipte tarayıcının localStorage'ı kullanılır. |
| Sıfırlama | Görevli menüsünden (PIN) günlük sıfırlama; eski kayıtlar silinmez, tarihli arşive taşınır |

## 8.1 Günün ilk 3'ü
- Etkinlik sonunda görevli, PIN ile İlk 3'ü Dışa Aktar ekranını açar.
- Uygulama, paylaşım izni veren oyuncular arasından en yüksek puanlı 3 kişiyi seçer; izin vermediği için atlananları adıyla gösterir.
- Kulüp logosu ve renkleriyle 1080×1350 Instagram gönderisi ve 1080×1920 hikâye görseli (PNG) üretilir.
- Kulübün sosyal medya ekibi görseli kontrol edip paylaşır. Otomatik paylaşım yapılmaz.
# 9. Yapay Zekâ (NVIDIA API Kataloğu)
Proje dokümanı v1.2'deki karar korunur: OpenAI uyumlu NVIDIA uç noktası, anahtar yalnızca proxy sunucuda, 4 sn zaman aşımı ve çevrimdışı yedek. Model henüz seçilmedi.
| Görev | Ne zaman | Uç nokta | Çıktı |
| Senaryo üretimi | Senaryo başlangıcı | /api/scenario | 5 adımlı senaryo JSON'u + puanlama anahtarı + etki metinleri |
| Jüri analizi | Final | /api/comment | En fazla 3 cümle: güçlü kararlar + en zayıf adım + kapanış |
| Takma ad denetimi | Takma ad girişi | /api/nickname | { "uygun": true/false } |

## 9.1 Senaryo JSON şeması
| { /   "id": "yemekhane", "baslik": "Yemekhane: Öğle Saati Krizi", "sistem": "Yemekhane Bilgi Sistemi", /   "ikon": "utensils-crossed", "saat": "11:58", "yer": "Merkez Yemekhane", "olcek": "3.000 öğrenci", /   "giris": "Saat 11:58. Merkez yemekhanenin kapısında 3.000 öğrenci var. ...", /   "hedefKitle": [ { "ad": "Öğrenci", "ikon": "graduation-cap" }, ... ], /   "adimlar": [ /     { "no": 1, "seviye": "detay", "konu": "turnike geçişi", /       "durum": "Kapıda kuyruk büyüyor. ...", "soru": "Öğrenciler turnikeden nasıl geçsin?", /       "secenekler": [ /         { "id": "a", "metin": "NFC kart / telefon", "ikon": "nfc", "puan": 20, /           "etki": "Kuyruk akıyor; geçiş 1 saniye sürüyor.", "ozet": "Kuyruk akıyor" }, /         ... /       ] } /   ] / } |

Proje dokümanındaki şemaya üç alan eklendi: konu (analiz ve zincir etiketi), ozet (finalde düğüm altındaki kısa etki) ve kriz girişi için saat / yer / olcek / giris.
Doğrulama kuralları: tam 5 adım · adım 1–4 detay, adım 5 genel · her adımda 4 seçenek · her adımda tam bir seçenek 20 puan · bir seçenek 10–14 · iki seçenek 0–8 · seçenek metni ≤ 6 kelime · ikon izin listesinde. Doğrulamadan geçmeyen yanıt atılır, bankadan senaryo gelir.
## 9.2 Promptlar (taslak)
### Senaryo üretimi
| Sen bir yazılım gereksinim analizi senaryo oyununun tasarımcısısın. Türkçe yaz. / Sistem: {sistem}. Kaynak gereksinimler: {gereksinim_ozeti}. / Bir kriz anıyla açılan, 5 adımlı, tek oyunculu bir karar senaryosu üret: saat, yer, ölçek ve / 2 cümlelik bir giriş metni yaz. Adım 1-4 somut ve detaylı gereksinim kararları sorsun / (hangi giriş yöntemi, hangi veri gösterilmeli, bir hata/yoğunluk anında ne yapılmalı). / Adım 5 sistemin bütününe dair genel bir karar sorsun (en kritik fonksiyonel olmayan gereksinim). / Her adımda 4 seçenek: 1 en iyi (20), 1 makul (10-14), 2 zayıf (0-8). En iyi seçenek hep aynı sırada olmasın. / Her seçenek için tek cümlelik "etki" (sonucu anlatsın, doğru/yanlış demesin) ve 2-3 kelimelik "ozet" yaz. / Seçenek metni en fazla 6 kelime. İkonları yalnızca verilen Lucide listesinden seç. / YALNIZCA verilen JSON şemasına uygun JSON döndür. |

### Jüri analizi (final)
| Sen bir senaryo oyununun samimi ve esprili jürisisin. Türkçe yaz. / Girdi: senaryo başlığı, 5 adımın konusu, oyuncunun seçimleri ve her adımın puanı (0-20), toplam puan. / En fazla 3 cümle yaz: (1) 20 puan alan kararları adıyla öv, (2) en düşük puanlı adımda / hangi seçeneğin daha iyi olacağını nazikçe söyle, (3) puana uygun kısa bir kapanış cümlesi. / Kişiyi değil kararları değerlendir; küfür, aşağılama, dış görünüş, din, siyaset yok. / Yalnızca JSON döndür: {"analiz": "..."} |

### Takma ad denetimi
| Bir üniversite stant oyununda takma ad denetliyorsun. Ad: "{ad}". / Küfür, hakaret, cinsel içerik, nefret söylemi, gerçek kişi adı veya marka içeriyorsa uygun değildir. / Harf değiştirerek (s1k, @ gibi) yazılmış halleri de say. Yalnızca JSON döndür: {"uygun": true} |

## 9.3 Yedek plan
- Stanttan önce 15–20 senaryo üretilip kulüp tarafından okunur; bu dokümandaki 5 senaryo bankanın çekirdeğidir.
- Yanıt 4 sn'yi geçerse ya da doğrulamadan geçmezse senaryo bankadan gelir; oyuncu farkı hissetmez.
- Jüri analizi gelmezse yerel şablon kullanılır (prototipte bu şablon çalışıyor): güçlü kararlar + en zayıf adımın doğru hamlesi + puana göre kapanış.
- Takma ad denetimi yanıt vermezse yalnızca yerel kelime listesi uygulanır.
# 10. Animasyon ve Efekt Kataloğu
Animasyonlar v0.2 kurallarını izler: parlama (glow) ve neon yok; hareket, ölçek, yay (spring) ve renkli parçacıklar var. Konfeti ve kelebek renkleri logodan gelir. Sesler dosya gerektirmez; Web Audio ile üretilir ve tek düğmeyle kapatılır.
| Ekran | Animasyon | Süre | Ses |
| Takma ad | Tuş çökmesi + dalga · kural rozetleri yaylı ✓ · hatalı girişte alan sallanır · zar döner ve ad harf harf yazılır · paylaşım anahtarı yaylı kayar · arka planda süzülen kelebek | 0,1–0,6 sn · kelebek 9 sn | tuş tıkı |
| Kriz çarkı | Vurgu karttan karta atlar, kübik yavaşlar · kazanan kart büyür + sallanır, diğerleri söner · "KRİZ SEÇİLDİ" damgası | ≈ 3 sn + 0,55 sn | tık · damga |
| Kriz girişi | Kayan sarı-siyah uyarı şeridi · kayan yazı · nabız atan kırmızı ışık · yanıp sönen saat · daktilo metin · 3-2-1 büyükten küçülerek | sürekli · 3-2-1 ≈ 3 sn | siren · tik |
| Karar adımı | Durum daktilo · soru kayarak gelir · seçenekler sırayla aşağıdan · şu anki düğüm nabız · süre halkası azalır, son 5 sn kırmızı + nabız | 0,4 sn + 80 ms aralık | son 5 sn tik-tak |
| Seçim | Seçilen kart büyür, ikon döner, ✓ rozet yaylı · diğerleri söner | 0,4 sn | iki tonlu "ding" |
| Kelebek etkisi | Kelebek eğri yolda kanat çırparak uçar + renkli iz · düğümde halka dalgası · düğüm pop · zincir çizgisi dolar · krem kart alttan yaylı kayar + ilerleme çubuğu | 1 sn + 0,55 sn · kart 2,6 sn | kanat pırpırı |
| Final | Zincir çizgisi soldan sağa çizilir · 5 düğüm sırayla pop · adım çubukları dolar · puan halkası + sayaç · unvan damgası · analiz daktilo · sıra sayacı aşağıdan yukarı | ≈ 6 sn | yükselen notalar · "pat" · fanfar (75+) |
| Final konfetisi | 75+ puanda 60 parça, 90+ puanda 120 parça logo renklerinde | 2,2–3,6 sn | fanfar |
| Skor tablosu | Podyum sütunları alttan yükselir · avatarlar pop · taç düşer + seker · liste satırları sağdan kayar · filtrede yeniden canlanır | 0,7 sn + aralıklar | ding |
| Görevli | PIN noktaları dolar · yanlış PIN'de sallanır · bildirim kartı alttan yaylı gelir | 0,35–0,45 sn | tık · uyarı |
| Geçişler | Ekranlar arası yumuşak kayma + solma | 0,45 sn | — |

Erişilebilirlik: cihazda "hareketi azalt" açıksa animasyonlar anında son kareye geçer, kelebek uçmaz. Ses düğmesi her ekranın sağ üstünde.
# 11. Tasarım: Senaryo Bileşenleri
[IMAGE: Senaryo modunun yeni bileşenleri ve durumları (v0.2 token&apos;larıyla)]
Görsel 12 — Senaryo modunun yeni bileşenleri ve durumları (v0.2 token'larıyla)
- Aynı tasarım sistemi: Proje 1'deki v0.2 token'ları (base.css) aynen kullanıldı: sakin grafit zemin, logo pembesi marka, krem "kağıt" kartlar, Plus Jakarta Sans + JetBrains Mono, Lucide ikonları.
- Durum renkleri doğrulandı: dataviz skill'inin palet doğrulayıcısıyla (#3FC79A · #F5C451 · #F2616B, koyu yüzey #1E1D25) kontrast ≥ 3:1 geçti; renk körlüğünde en zayıf çift ΔE 10,3 (hedef ≥ 8), normal görüşte ΔE 20,4. Yine de durum her zaman ikon + etiketle birlikte gösterilir.
- Puan halkası: dolgu marka pembesi, boş iz aynı rengin açık tonu; büyük puan, ekranın geri kalanıyla aynı yazı tipinde (Plus Jakarta Sans), tek "kahraman" sayı.
- Podyum renkleri (altın #F5C451, gümüş #C9C6D3, bronz #D9895A) yalnızca sıralamada kullanılır; sıra numarası her zaman yazılıdır.
- Kelebek senaryo modunun maskotudur: logo pembesi üst kanat, mor alt kanat, mavi benekler.
# 12. Oynanabilir Prototip
prototip/index.html dosyası çift tıklanınca tarayıcıda açılır ve baştan sona oynanır. Kurulum gerekmez; internet yalnızca yazı tipleri için kullanılır (yoksa sistem yazı tipine düşer).
| Özellik | Nasıl |
| Oyna | Takma ad → Krize gir → çark → Krizi başlat → 5 karar → final → skor tablosu |
| Klavye kısayolları | Seçenekler: A–D ya da 1–4 · etki kartını geç: Enter / boşluk · takma ad: fiziksel klavye de çalışır |
| Görevli | Skor tablosu → "Görevli" ya da logoya 3 sn basılı tut · prototip PIN'i: 1234 |
| Tanıtım modu | index.html?oto — oyun kendi kendine oynar (stantta bekleme ekranı olarak kullanılabilir); bu moddaki oyunlar skor tablosuna kaydedilmez |
| Kısa süre | index.html?sure=8 — adım süresini değiştirir (test için) |
| Ekran görüntüsü modu | index.html?ekran=nick | wheel | intro | step | effect | final | board | admin | post | story |
| Veri | Skorlar tarayıcıda saklanır; ilk açılışta örnek 10 kayıt yüklenir. Görevli menüsünden "Günü arşivle ve sıfırla" ile temizlenir. |

## 12.1 Test sonucu
Prototip, puppeteer ile gerçek tıklamalarla uçtan uca oynatıldı: ekran klavyesinden ad yazma, 5 adımın hepsi, final, skor tablosu, senaryo filtresi, yanlış ve doğru PIN, görevli ekranı; ayrıca süre dolma yolu, küfür filtresi ve aynı ad eki ayrı ayrı denendi. Konsol hatası yok; puan, unvan, sıra ve kayıt doğru.
## 12.2 Prototipin sınırları
- Yapay zekâ çağrısı yok: senaryolar bankadan, jüri analizi yerel şablondan gelir (uygulamadaki yedek yol ile aynı).
- Küfür listesi kısa bir örnektir.
- Skorlar localStorage'da; uygulamada IndexedDB (Dexie) ve isteğe bağlı bulut senkronu kullanılmalı.
- Prototip tek dosya, vanilla JS'tir; React'e aktarırken mantık ve stiller doğrudan bileşenlere bölünebilir (Bölüm 13).
# 13. Geliştirme Notları
| Prototip bölümü | React bileşeni (proje dokümanı 13.3) | İş paketi |
| Takma ad + klavye | ScenarioNickname + OnScreenKeyboard | İP-10 |
| Kriz çarkı + kriz girişi | ScenarioIntro (CrisisWheel, Countdown) | İP-10 · İP-16 |
| Karar adımı + kelebek | ScenarioGame (ChainView, OptionCard, EffectSheet, Butterfly) | İP-10 · İP-16 |
| Final | ScenarioResult (ScoreRing, StepBars, TitleStamp) | İP-10 |
| Skor tablosu | Leaderboard (Podium, LeaderRow) | İP-13 |
| Görevli + paylaşım | Admin (PinPad, ShareImage → canvas veya html-to-image) | İP-13 · İP-15 |
| Puan ve analiz | game/scoring.ts (senaryo: 5 × 20) + ai/ (yedek analiz şablonu) | İP-08 · İP-12 |
| Senaryo bankası | veri/senaryolar.json → src/data/scenarios.json + Zod şeması | İP-03 |

## 13.1 Claude Code başlangıç promptu (Senaryo modu)
| BuildArena projesine Senaryo modunu ekle. Önce BuildArena_Proje_Dokumani.md (Bölüm 7, 8, 11.2, 12.5) / ve 02_BuildArena_Senaryo_Modu dokümanını oku. Referans: prototip/index.html (davranış, animasyon, / zamanlamalar) ve tasarim_kaynak/base.css (v0.2 token'ları). Neon, glow ve "AI" süsleri kullanma. / Ekranlar: ScenarioNickname (uygulama içi TR-Q klavye, canlı kurallar, aynı ad eki, paylaşım izni), / ScenarioIntro (kriz çarkı + kriz girişi + 3-2-1), ScenarioGame (zincir, 20 sn süre, 2x2 seçenek, / uçan kelebek, etki kartı), ScenarioResult (zincir, puan halkası, unvan damgası, analiz, sıra), / Leaderboard (podyum + liste + filtre), Admin (PIN, İlk 3 dışa aktar: 1080x1350 ve 1080x1920 PNG). / Senaryolar src/data/scenarios.json; Zod ile doğrula. Puan game/scoring.ts içinde saf fonksiyon, / Vitest ile test: Bölüm 6.4 örneği 88 puan ve "Senior Analist" vermeli. Skorlar Dexie (IndexedDB). / Framer Motion ile animasyonlar; prefers-reduced-motion desteği. Tüm metinler Türkçe. |

# 14. Açık Sorular
| Soru | Önerimiz |
| Kelebek etkisi kartı kaç saniye? | 2,6 sn + dokununca geç (Bölüm 2.2); 2 Kasım testinde 1,5 sn ile karşılaştırılsın |
| Paylaşım izni varsayılan açık mı olsun? | Prototipte açık. KVKK açısından daha temkinli seçenek kapalı başlatmak; kulüp karar vermeli |
| Aynı kişi birden çok kez oynayabilir mi? | Evet, her oyun ayrı kayıt; tabloda kişinin en iyi skoru mu yoksa her oyunu mu görünsün, kulüp karar vermeli (öneri: her oyun) |
| Birden fazla tablet olacak mı? | Olursa ortak skor tablosu için Supabase ücretsiz katmanı (proje dokümanı 13.2) |
| Senaryo sayısı yeter mi? | 5 çekirdek + yapay zekâyla 15–20 varyasyon; stanttan önce kulüp okusun |
| Paylaşım görselinde unvan ve senaryo da olsun mu? | Unvan var; senaryo adı eklenebilir (alan yeterli) |
| Ödül? | Günün ilk 3'üne küçük hediye; kazananlar takma adlarıyla kendini tanıtır |

## 14.1 Klasördeki dosyalar
- BuildArena_Senaryo_Modu_Dokumantasyon.docx / .pdf — bu doküman
- prototip/ — oynanabilir prototip (index.html + senaryolar.js + logo-data.js + lucide.min.js)
- veri/senaryolar.json — 5 senaryonun tamamı (uygulamanın çevrimdışı bankası)
- gorseller/ — dokümandaki 12 görselin yüksek çözünürlüklü PNG halleri (paylaşım görselleri gerçek boyutta)
- tasarim_kaynak/ — akış ve bileşen sayfalarının HTML kaynakları + base.css
