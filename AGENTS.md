# BuildArena — rules for coding agents

BuildArena is a 2-minute booth game for ATÜ TechBuilders (4 November 2026): a landscape tablet PWA
with a 2-player **Duel** mode (drag requirement cards into your phone box) and a 1-player
**Scenario** mode (5 decision steps), a shared leaderboard and a PIN-protected staff menu.

**No API, no AI.** The club decided against an API: tasks, scenarios, scoring, jury comments,
funny titles and the nickname filter are all local and deterministic. Don't add network calls.

## Specs (read the relevant section before every task)

1. **`docs/tam_prototip/` — the full prototype (v0.3) is the primary reference.** The club built it
   as the almost-final app: `BuildArena_Tam_Prototip_Kilavuz.pdf` (+ a text extraction `.txt`),
   the playable prototype `uygulama/index.html` (`js/*.js`, `css/uygulama.css`), screens
   `gorseller/*.png`, data `veri/senaryolar.json`. Every screen of the app is a port of it.
2. **`docs/renk_paleti/` — the colour palette and component language (wins over the prototype's
   dark theme):** `BuildArena_Renk_Paleti.html` (open it in a browser), screenshots
   `bilesenler.png`, `ekranlar.png`. Mirrored in `src/styles/tokens.css`.
3. `docs/senaryo_modu/` — the scenario-mode document and prototype (nickname, wheel, crisis,
   steps, final, leaderboard, top-3 export).
4. `docs/BuildArena_Project_Document_EN.md` (Turkish edition `docs/BuildArena_Proje_Dokumani.md`
   wins if they disagree) — product rules, schemas, tests. Its AI/proxy chapters (§12.2–12.3,
   §12.6–12.8 API parts, WP-11/12) are **cancelled**, and its colour tables (§14) are replaced
   by the palette above.

Deliberate deviations from the prototype, decided with the club:

- **Scoring** (`src/game/scoring.ts`, unit-tested):
  - Scenario: each step's maximum comes from its difficulty (tempting runner-up option, "genel"
    step), shared out to exactly 100. Accuracy is convex (`(puan/20)^1.5`). 10 % of each step is
    speed (full in the first 2 s, then linear to 0 at the limit), multiplied by accuracy.
    A timed-out step scores 0, so an empty game scores 0.
  - Duel: coverage 55 (kritik 3 / önemli 2 / destek 1), precision–recall F1 20, combos 15,
    speed 10 × quality, −5 per trap, never below 0. An empty box scores 0; two empty boxes draw.
- **Nickname**: no on-screen keyboard and no ready-name panel; a text field (tablet keyboard)
  with a dice inside it. The dice rolls like a slot machine through the ~3,700 generated
  "Tech Animal" names plus the hand-picked ones (`rollNickname`), never a name taken today or
  shown recently. The Turkish/English filter (`src/game/nickname.ts`, `src/data/badwords.json`)
  normalises letters, digits, symbols, spaced letters and repeats; roots (`kok`) catch
  anything starting with them, with clean words listed in `kokIstisna` (Ocak, Boksör, Seksen …);
  keep its false-positive tests green when you extend the lists. The duel name dice rolls without
  limit too.
- **Content**: 16 scenarios (step 5 asks in plain words what the system must never give up while
  it grows; no "fonksiyonel olmayan" jargon), 15 duel tasks, 84 cards.
- **Social and leaving**: "Bizi takip et" (`SocialButton`) opens the club's Linktree QR on Home
  and both result screens; the house button (`LeaveGameButton`) inside a round asks first, then
  goes home without saving. The APK opens with `BootIntro` (tap to skip).
- **No rematch**: the duel result has only Ana Menü and Günün Liderleri, so a pair doesn't keep
  the booth busy; every duel starts with a new task and new names.
- **Audio**: Web Audio only (`src/audio/`): 35+ synthesised effects on their own bus (don't
  change them, the club likes them) and generative music on another, one piece per part:
  chill lo-fi on the menus, a calm and mysterious piece in the scenario mode, a driving
  competitive piece in the duel (muffled build-up on the task card, the beat drops when the round
  starts) — `moodFor(pathname)` in `useMood.ts`. Separate music and effect buttons in every
  header; the music button opens a panel with the music switch and the master volume slider
  (also in the staff settings, default 80 %); short
  vibrations (`haptics.ts`). Everything is remembered on the device.

## Stack (already installed — don't add libraries without a reason)

| Concern       | Choice                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| App           | React 19 + TypeScript 6 + Vite 8, path alias `@/` → `src/`                                  |
| Styling       | CSS Modules ported from the prototype (`src/styles/app/home/duel.module.css`) on the tokens |
|               | in `src/styles/tokens.css`; Tailwind 4 utilities are available                              |
| Routing       | react-router 7; every path in `src/app/routes.ts` (`ROUTES`)                                |
| Icons         | lucide-react through the allow-list registry `src/components/icons.ts`                      |
| Animation     | CSS keyframes + Web Animations; effects (confetti, butterfly) via `src/game/fx.ts`          |
| State         | zustand: `scenarioStore`, `duelStore`, `settingsStore`, `uiStore`                           |
| Validation    | zod 4 (`src/ai/schemas.ts` validates the scenario, card and task banks)                     |
| Local data    | dexie 4 (IndexedDB): scores, duels and their dated archives (`src/db/database.ts`)          |
| Share images  | canvas (`src/game/shareImage.ts`): top-3 and end-of-day post/story PNGs                     |
| Audio         | Web Audio (`src/audio/engine.ts`, `sfx.ts`, `music.ts`) + Vibration API (`haptics.ts`)      |
| PWA           | vite-plugin-pwa (offline launch, fullscreen, landscape)                                     |
| Android APK   | Capacitor 8 (`android/`): app, filesystem, share; `src/app/native.ts`, `--mode android`     |
| Fonts         | @fontsource Bricolage Grotesque + Plus Jakarta Sans + JetBrains Mono, bundled locally       |
| Tests         | Vitest + React Testing Library + jsdom + fake-indexeddb; Playwright (tablet profile) + axe  |
| Lint / format | oxlint (`.oxlintrc.json`, includes `react/no-danger`) + Prettier                            |
| Staff PIN     | @noble/hashes PBKDF2-SHA-256; public default 1234, real PIN set on the tablet (device only) |

## Commands

```bash
npm run dev          # http://localhost:5173/?skipTutorial=1  (&demo=1 loads a sample day)
npm test             # unit + component tests (Vitest)
npm run e2e          # Playwright: tablet 1280×800 touch + PWA offline project
npm run lint         # oxlint
npm run typecheck    # tsc -b
npm run build        # production build + service worker
npm run scan:bundle  # fails if the bundle contains an API key pattern
npm run check        # all of the above, in CI order — must be green before work is done
npm run apk          # Android test APK (Capacitor, android/) → dist-apk/
```

## How to work

- Every screen is built (tutorial, home + idle, duel task card / game / result, scenario
  nickname / wheel + crisis / steps / final, leaderboard with two tabs, staff menu with three
  tabs). New work is polish, content or changes the club asks for.
- Don't commit or push unless the user asks. One topic per branch (`feature/short-name`).
- Every screen sits on the fixed 1280×800 `Stage` (`src/components/Stage.tsx`), scaled to fit.
- Keep every screen's and button's `data-testid` when you change a screen.

## Testing is not optional

The user's standing requirement: **every button and every page is tested while developing.**

- Follow the `buildarena-button-tests` skill. Every control: visible, ≥56 px, correct action,
  pressed feedback, double-tap guard, disabled state, touch and mouse, player isolation in the
  Duel, works offline.
- Navigating buttons go in `e2e/buttons.spec.ts` (`MATRIX`); screens that need a played round
  have their own specs (`duel`, `scenario`, `staff`, `home-tutorial`). Multi-touch is tested with
  real CDP touch events (`e2e/duel.spec.ts`).
- After any UI change, run the dev server and click through the touched screens at 1280×800;
  compare with `docs/tam_prototip/gorseller/`.
- Never delete, skip or loosen a failing test to get green. Fix the code, or explain and ask.

## Code conventions

- UI text is **Turkish**; code, comments and identifiers are English. JSON data keys are Turkish
  (`baslik`, `kartlar`, `tur`, `agirlik` …).
- Every screen root and interactive element has a `data-testid` (kebab-case): screens `home`,
  `task-card`, `duel-game` …; buttons `btn-duel`, `tutorial-next`; per player `p1-finish`,
  `p2-card-<id>`.
- Tappable controls: ≥56 px, pressed feedback, `usePressGuard` (double-tap guard) for anything
  that navigates or saves, a real `disabled` state. Tutorial Back/Next are 64 px high.
- Navigate with `ROUTES` constants only.
- localStorage only through `src/app/storage.ts` (try/catch, safe defaults).
- Test-only URL flags only through `getTestFlags()`: `?skipTutorial=1`, `?seed=N` (wheel crisis
  N % 16, duel task N % 15 and names), `?fastTimers=1` (shortens animation waits via `dur()`,
  never the decision/duel timers or the effect card's reading time), `?demo=1` (sample day into
  an empty DB), `?intro=1` (plays the APK's opening animation).
- Game rules and scoring are pure functions with unit tests.
- Folder structure: `app/ audio/ screens/ components/ game/ stores/ ai/ data/ db/ styles/`
  (`ai/` now holds the zod schemas and the local jury templates).

## Design — the club's palette wins (`docs/renk_paleti/`)

- "Paper, ink and four printed colours": a board game, not a dark screen. Paper `--paper`
  background, white `--card`s, ink `--ink` text and 2 px lines (`--border`), hard ink shadows
  (`--shadow` 3 px, `--shadow-lg` 4 px), measured corners (`--radius` 10 px). Open Color shades
  only (0–1 and 9), no purple, no neon, no glow, no ✨ "AI" labels.
- Buttons: 2 px ink border + 3 px hard shadow; when pressed they lose the shadow and sink in
  (`transform: translate(3px, 3px)`). Secondary buttons are white, `.btnInk` is ink, and the one
  raspberry `--brand` button per screen is the call to play (Oyna, Başla, Yeni oyuncu, İleri).
- Blue `--p1` = Player 1 (half tinted `--p1-tint`), orange `--p2` = Player 2 (`--p2-tint`), teal
  `--scn` = Scenario mode (chosen option on `--scn-tint`, the effect card on `--note` paper),
  gold = crown / winner / top 3 / last 20 s. Red `--bad` and the ✓ / ✗ / ! marks only on results
  and in the last 10 s. A player's colour always appears with their number (1/2).
- Contrast: white text on `--p2` and `--p2`/`--scn` text on their tints only at 19 px+ bold;
  small text there is ink. `--ok` and `--warn` are for icons, never for text.
- Tags look like stamps: JetBrains Mono, uppercase, 1.5 px border, 6 px corners (`.chip`).
- Bricolage Grotesque for headings and buttons, Plus Jakarta Sans for UI text, JetBrains Mono
  for timers, scores and tags.
- Colours only through `var(--token)`s / token utilities; canvas and Web Animations take hex
  from `src/game/palette.ts`. The share PNGs (`shareImage.ts`) use the same paper-and-ink look.
- Keep the animations as they are (the club likes them); restyle colours, borders and shadows.
- **Dark theme** = the same palette at night (`:root[data-theme='dark']` in `tokens.css`, toggled
  by the moon `btn-theme` in every header, stored in the settings, applied by `src/app/theme.ts`).
  Never hard-code a colour: use the role tokens — `--ink` text, `--rule` lines, `--shade` hard
  shadows, `--on` text on a coloured fill, `--on-gold` text on gold/medals, `--bezel` always-dark
  surfaces; `--brand` / `--p1` / `--p2` / `--scn` (`--pc` in a duel half) are fills, their
  `-ink` twins (`--pci`) are for text and outlines. Both themes are scanned with axe.
- The logo comes from the club's logo package (masters in `store/logo/`, recoloured by the club
  for the palette): `public/logo/techbuilders_logo_light.png` on the paper and `_dark.png` at
  night, picked by `useLogoSrc()` (the share PNGs always take the light one). The app copies are
  the masters with only their empty transparent margin trimmed, scaled to 1024 px. The artwork
  is never recolored, redrawn, rotated or edited; it sits on the paper without a shadow.
- App icons are made from the same masters, on the paper: `public/icons/` (PWA), the APK's
  launcher icons (`android/app/src/main/res/mipmap-*`) and `store/` (App Store, Play, iOS).
- APK start: the launch screen (paper + the four-colour ring, `res/drawable/splash_ring.xml`)
  stays until `BootIntro` sets `<html data-boot="ready">` (fonts and logo loaded; at most 8 s),
  then fades onto the opening animation (`MainActivity.java`).
- Landscape tablet 1280×800, kiosk: no scrolling, zoom or text selection. Respect
  `prefers-reduced-motion`. Sounds stay soft; nothing loud or sudden.

## Security and privacy

- No secrets anywhere in the app; `npm run scan:bundle` guards the build.
- Player text (nicknames) is rendered as React text nodes; `dangerouslySetInnerHTML` is banned.
- Only nicknames, scores, titles, scenario/task ids, choices, times and the consent flag are
  stored; no real names, phone numbers or e-mail addresses.

## Definition of done

1. The behaviour matches the prototype (or the agreed deviation above).
2. Tests exist for its buttons and critical behaviours; `npm run check` is green.
3. The touched screens were clicked through in the browser.
4. The report lists what was tested automatically and what still needs a manual check on the
   real tablet (e.g. two people dragging at once, sound level, vibration).
