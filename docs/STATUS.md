# Status

Sources: `docs/full-prototype/` (the club's full prototype v0.3; every screen comes from it) and
`docs/palette/` (the colour palette and button language; it replaces the prototype's dark theme).
`npm run check` is green.

## Deliberate differences from the prototype (agreed with the club)

- No API and no AI; everything is local (the old `proxy/` draft was deleted).
- Look: the "Renk Paleti" — cream paper, ink lines, hard-shadow buttons that sink when pressed;
  blue / orange for the duel, teal for the scenario, one raspberry "play" button per screen. The
  animations stayed as they were.
- Logo: the club's new logo package, recoloured for the palette (`store/logo/`); paper version in
  the light theme, light version in the dark theme (`public/logo/`). Every icon is made from it, on
  the paper.
- Scoring redesigned (difficulty weights, accuracy curve, 10 % speed share; F1 and a trap penalty in
  the duel). An empty game / empty box scores 0. Details: `README.md` → Scoring,
  `src/game/scoring.ts`.
- No on-screen keyboard and no ready-name panel on the nickname screen: a text field and a dice that
  spins like a slot machine (~3,700 names).
- Much stricter nickname filter (2026-11-03): strict roots (am…, sik…, göt…, oç…, piç…) with clean
  Turkish words as the only exceptions, every disguise (digits, symbols, stretched or split letters,
  CamelCase, glued words), sexual words and "31" / "69". See `README.md` → Nickname filter.
- No rematch on the duel result (the next pair plays).
- The "Başlamak için bir moda dokun · 4 Kasım Stant Etkinliği" line under the home screen is gone.
- Music: calm lo-fi on the menus, mysterious and relaxing in the scenario, rhythmic in the duel; the
  sound effects are unchanged. Separate music and effect buttons; the volume slider is in the music
  button's panel (default 80 %).
- Dark theme: the same palette at night, a moon button in every header.
- Duel lengths 45 / 60 / 90 s (120 s removed).
- App icons from the new logo (`public/icons/`, the APK's launcher icons, `store/` for the stores).
- Social media: "Bizi takip et" on the home screen and both results → the club's Linktree QR code.
- A house button inside the rounds (asks first, goes home, the round is not saved).
- Content: 16 scenarios (campus: ring bus, ride sharing, online exam, Wi-Fi, spring festival,
  earthquake drill …), 15 duel tasks; step 5 asks in plain words ("olmazsa olmaz").
- The "SEN · bu oyun" legend is gone from the leaderboard; the duel name dice rolls without limit.
- APK opening animation (`BootIntro`): logo, sparks, the name letter by letter, colour bars, a
  curtain. Before it, the Android launch screen shows a turning four-colour ring and fades out when
  the game is ready; the empty cream/black wait seen on the phone is gone.
- The situation text on scenario steps is as large as the question (the question stays bold).
- On the scenario result "Bizi takip et" sits in the header and no longer overlaps the step scores.
- The tutorial slides in the direction of Back / Next.
- Android APK (`npm run apk`): the on-screen keyboard opens over the game instead of shrinking it;
  the stage lifts only as far as needed when the field would be covered (`src/app/keyboard.ts`,
  `MainActivity.java`).
- English code base (2026-11-03): identifiers, data keys and ids, CSS classes, test ids and docs are
  English; UI texts and game content stay Turkish. Records and settings saved by older builds are
  upgraded on first start (`src/db/legacy.ts`, IndexedDB version 3), so a tablet keeps its day.

## Still to check by hand on the real tablet

1. Two people dragging at the same time (verified automatically with CDP multi-touch).
2. Music and volume by ear at booth noise; vibration (Android tablet; iPads don't vibrate).
3. Glare of the light theme under booth lights (the palette suggests 60–70 % brightness) or the
   readability of the dark theme — pick whichever works at the booth.
4. PWA install, full screen / kiosk lock, landscape; the new-logo icon.
5. Changing the PIN on every tablet: Görevli → Ayarlar → PIN'i değiştir (the new PIN lives only on
   the tablet, never in the code or on GitHub; write it down).
6. Scanning the Linktree QR code with a phone camera at the booth (brightness, distance).
7. Smoothness of the APK opening animation on the real tablet (the emulator is too slow to judge).
8. After installing the new APK over the old one: the leaderboard of the day is still there (the
   database upgrade is tested automatically).
