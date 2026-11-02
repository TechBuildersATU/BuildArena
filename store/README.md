# App icons (stores)

Source: the club's new logo package, recoloured for the palette (`logo_oyun_paket.zip`), kept
untouched in `logo/`: paper background, dark background and transparent versions of both
(1600×1600). The drawing and colours of the logo were not changed; the transparent version was only
scaled and placed on the palette's paper (`#FFF4E6`) inside each platform's safe area. This folder is
not part of the build.

| File                                            | Where it is used                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `logo/logo_oyun_*.png`                          | The master logo files; make any new icon from these.                                                                     |
| `app-store/AppStoreIcon_1024.png`               | App Store Connect → app icon. 1024×1024, paper background, **no alpha channel** (Apple rejects icons with transparency). |
| `ios/AppIcon.appiconset/`                       | Drag into Xcode → `Assets.xcassets` (iPhone/iPad home-screen sizes + 1024). All opaque.                                  |
| `play-store/PlayStoreIcon_512.png`              | Google Play Console → Store listing → App icon. 512×512, 32-bit PNG, opaque paper background.                            |
| `android/res/mipmap-*/ic_launcher.png`          | Into `app/src/main/res/` of an Android project (legacy and round launcher icons).                                        |
| `android/res/mipmap-anydpi-v26/ic_launcher.xml` | Adaptive icon: paper background + foreground. The logo sits inside the 66/108 safe zone, so no launcher mask crops it.   |

The icons shown when the game is installed as a PWA on a tablet or phone are in `public/icons/`:
`icon-192.png` and `icon-512.png` (round, transparent corners), `icon-maskable-512.png` (Android
adaptive icon, the logo inside the 80 % safe circle), `icon-180.png` (iPhone/iPad home screen,
opaque) and `favicon-48.png` (browser tab). The APK's launcher icons come from the same source, in
`android/app/src/main/res/mipmap-*`.
