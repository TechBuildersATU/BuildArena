# Uygulama simgeleri (mağazalar)

Kaynak: kulübün `TechBuilders_App_Icons.zip` ve `TechBuilders_HomeScreen_Icons.zip` paketleri.
Logonun çizimi ve renkleri değiştirilmedi; yalnızca platformların kurallarına göre zemine
oturtuldu ya da güvenli alana küçültüldü. Bu klasör derlemeye girmez.

| Dosya                                          | Nerede kullanılır                                                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app-store/AppStoreIcon_1024.png`              | App Store Connect → uygulama simgesi. 1024×1024, beyaz zemin, **alfa kanalı yok** (Apple şeffaflık içeren simgeyi reddeder).                         |
| `ios/AppIcon.appiconset/`                      | Xcode → `Assets.xcassets` içine sürükle (iPhone/iPad ana ekran boyutları + 1024). Hepsi opak.                                                        |
| `play-store/PlayStoreIcon_512.png`             | Google Play Console → Mağaza girişi → Uygulama simgesi. 512×512, 32-bit PNG, opak beyaz zemin.                                                       |
| `android/res/mipmap-*/ic_launcher.png`         | Android projesinde `app/src/main/res/` altına (eski tip başlatıcı simgeleri).                                                                        |
| `android/res/mipmap-anydpi-v26/ic_launcher.xml` | Uyarlanabilir simge: beyaz arka plan + ön plan. Ön planda logo 66/108 güvenli alanın içinde, böylece hiçbir başlatıcı maskesi logoyu kırpmaz. |

Tablet ve telefona PWA olarak kurulduğunda görünen simgeler `public/icons/` içindedir:
`icon-192.png` ve `icon-512.png` (paketteki Android simgeleri), `icon-maskable-512.png`
(Android uyarlanabilir simge, logo %80 güvenli dairede), `icon-180.png` (iPhone/iPad ana ekranı,
opak) ve `favicon-48.png` (tarayıcı sekmesi).
