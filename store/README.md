# Uygulama simgeleri (mağazalar)

Kaynak: kulübün palete göre düzenlediği yeni logo paketi (`logo_oyun_paket.zip`), dokunulmamış
hâliyle `logo/` klasöründe: kâğıt zeminli, koyu zeminli ve ikisinin şeffaf sürümleri (1600×1600).
Logonun çizimi ve renkleri değiştirilmedi; şeffaf sürüm yalnızca ölçeklenip paletin kâğıt
zeminine (`#FFF4E6`) ve platformların güvenli alanlarına yerleştirildi. Bu klasör derlemeye girmez.

| Dosya                                           | Nerede kullanılır                                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `logo/logo_oyun_*.png`                          | Asıl logo dosyaları; yeni simge gerekirse buradan üretilir.                                                                   |
| `app-store/AppStoreIcon_1024.png`               | App Store Connect → uygulama simgesi. 1024×1024, kâğıt zemin, **alfa kanalı yok** (Apple şeffaflık içeren simgeyi reddeder). |
| `ios/AppIcon.appiconset/`                       | Xcode → `Assets.xcassets` içine sürükle (iPhone/iPad ana ekran boyutları + 1024). Hepsi opak.                                |
| `play-store/PlayStoreIcon_512.png`              | Google Play Console → Mağaza girişi → Uygulama simgesi. 512×512, 32-bit PNG, opak kâğıt zemin.                               |
| `android/res/mipmap-*/ic_launcher.png`          | Android projesinde `app/src/main/res/` altına (eski tip, yuvarlak başlatıcı simgeleri).                                      |
| `android/res/mipmap-anydpi-v26/ic_launcher.xml` | Uyarlanabilir simge: kâğıt arka plan + ön plan. Logo 66/108 güvenli alanın içinde, hiçbir başlatıcı maskesi kırpmaz.         |

Tablet ve telefona PWA olarak kurulduğunda görünen simgeler `public/icons/` içindedir:
`icon-192.png` ve `icon-512.png` (yuvarlak, köşeleri şeffaf), `icon-maskable-512.png` (Android
uyarlanabilir simge, logo %80 güvenli dairede), `icon-180.png` (iPhone/iPad ana ekranı, opak) ve
`favicon-48.png` (tarayıcı sekmesi). APK'nın başlatıcı simgeleri de aynı kaynaktan
`android/app/src/main/res/mipmap-*` altındadır.
