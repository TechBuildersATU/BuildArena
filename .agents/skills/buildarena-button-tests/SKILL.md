---
name: buildarena-button-tests
description: >-
  Use whenever a BuildArena screen, button or other interactive control is added or changed, or
  when asked to test buttons, pages or flows. Explains how to write and run the per-button tests
  required by document §16.5: component tests (Vitest + React Testing Library), end-to-end tests
  on the 1280×800 touch tablet profile (Playwright), fake timers, multi-touch, offline and
  accessibility checks, plus the manual click-through in the browser.
---

# Button and screen tests (document §16.5)

## The checks every button gets

| #   | Check                                                      | How                                                                                   |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Visible, touch area ≥ 56×56 px (64 for tutorial Back/Next) | E2E `boundingBox()` — the `MATRIX` loop does it                                       |
| 2   | Does the right thing                                       | E2E: target screen's test id visible + URL; component: callback / store state         |
| 3   | Pressed feedback within 100 ms                             | `Button` has `active:` styles; custom controls: assert pressed state on `pointerdown` |
| 4   | Double-tap guard                                           | Component: `userEvent.dblClick` → called once; E2E: `dblclick()` → one history entry  |
| 5   | Disabled when it should be                                 | Component: `toBeDisabled()` and callback not called                                   |
| 6   | Works with touch and mouse                                 | E2E: both `tap()` and `click()` — the `MATRIX` loop does it                           |
| 7   | Duel: can't be triggered from the other half               | E2E: touch at the other half's coordinates / CDP multi-touch (below)                  |
| 8   | Works offline                                              | `e2e/*.pwa.spec.ts` pattern with `context.setOffline(true)`                           |

## Where tests go

- `tests/unit/*.test.ts` — pure logic (scoring, schemas, filters, timer math, stores).
- `tests/component/*.test.tsx` — RTL + `userEvent`. Render routed screens with
  `createMemoryRouter(appRoutes, { initialEntries: [ROUTES.x] })` (see `tests/component/navigation.test.tsx`).
- `e2e/buttons.spec.ts` — `MATRIX`: one row per (screen, button → expected screen + URL). Add a row
  for every navigating button; update rows when a placeholder becomes a real screen.
- `e2e/<screen>.spec.ts` — buttons that change state instead of navigating (Undo, Clear, Ready,
  options, PIN keypad…), timers, drag and drop.
- `e2e/*.pwa.spec.ts` — run against the production build with the service worker. Test-only URL
  flags are off there: set localStorage via `context.addInitScript`.

## Conventions

- Screen roots: `home`, `onboarding`, `task-card`, `duel-game`, `duel-result`,
  `scenario-nickname`, `scenario-game`, `scenario-result`, `leaderboard`, `admin`.
- Buttons: `btn-*`; tutorial `tutorial-*`; per player `p1-*` / `p2-*` (e.g. `p1-card-randevu`, `p2-finish`).
- Open pages with `?skipTutorial=1`; `?seed=N` for a deterministic card shuffle; `?fastTimers=1`
  for short timers.
- Prefer `getByRole('button', { name: 'Düello' })` (Turkish accessible names); fall back to test ids.

## Shared E2E helpers (`e2e/helpers.ts`)

- `expectTouchTarget(locator, min?)` — waits for entrance animations, then checks ≥56×56.
  Don't call it after `page.clock.install()`: CSS animations never finish on the fake clock.
- `scanA11y(page, exclude?)` — axe scan, returns violations (must be `[]`).
- `SCENARIO_URL` (`?skipTutorial=1&fastTimers=1&seed=0&demo=1`: Yemekhane crisis, the
  36-game sample day), `typeNickname` (fills `nick-input`), `startScenario`,
  `waitForStep(page, n)` (waits for `data-ready="true"`), `playSteps(page, ['a','b','c','d','a'])`.
- `presetSettings(page, { stepSec: 15, duelSec: 60, haptics: false … })` before `goto`.
- `recordVibrations(page)` + `vibrations(page)` (mocked `navigator.vibrate`), `soundStats(page)`
  (sound-effect counter of the test build), `centre(locator)`, `mouseDrag(page, from, to)`.
- Scores depend on decision time: answer right after `waitForStep` (inside the 2 s reading
  grace) to get the full step points; use `page.clock` for timeouts. The fake clock still flows
  in real time, so read what the timer shows (`aria-label`) instead of assuming it.
- Staff menu: PIN `1234` via `pin-key-1`…; `e2e/staff.spec.ts` shows downloads (PNG size from
  the IHDR chunk), the confirm dialog and the lockout with `page.clock`.

## Patterns

Timers (Playwright):

```ts
await page.clock.install()
await page.goto('/duel?skipTutorial=1&seed=3&fastTimers=1')
// …both ready, 3-2-1…
await page.clock.runFor(81_000) // last 10 s of a 90 s round
await expect(page.getByTestId('duel-timer')).toHaveAttribute('data-low', 'true')
```

Long fake-clock runs (a full round, five timed-out steps) need `test.setTimeout(120_000)`.

Timers (Vitest): `vi.useFakeTimers()` … `vi.advanceTimersByTime(600)` … `vi.useRealTimers()`.

Hold-to-confirm (Finish, 0.6 s; a short tap must do nothing) — see `hold()` in
`e2e/duel.spec.ts`: mouse down on `p1-finish`, wait 900 ms, mouse up → `p1-lock` visible.

Two simultaneous touches (isolation, from §16.5) — `multiTouch(cdp, fingers)` in
`e2e/duel.spec.ts` sends real CDP touch events; every finger moves at the same time:

```ts
const cdp = await page.context().newCDPSession(page)
await multiTouch(cdp, [
  { id: 1, from: await centre(p1Card), to: await centre(page.getByTestId('p1-box')) },
  { id: 2, from: await centre(p2Card), to: await centre(page.getByTestId('p2-box')) },
])
// palm: { …, radius: 45 } (contact > 60 px is ignored); dead zone: start at x = 640
```

There is no network/AI any more: nothing to mock.

Accessibility (`e2e/a11y.spec.ts`): every screen root is scanned with axe → no violations. The
only disabled rule is `meta-viewport` (the kiosk disables zoom, §13.5); add new screens to `SCREENS`.

## Run

```bash
npm test                                         # unit + component
npm run e2e                                      # everything
npx playwright test e2e/buttons.spec.ts -g Home  # one screen
npm run e2e:ui                                   # debug visually
npm run check                                    # before calling a WP done
```

## Manual click-through (every UI change)

`npm run dev`, open `http://localhost:5173/?skipTutorial=1` in the browser at 1280×800, tap every
button on the screens you touched, and compare with `docs/tam_prototip/gorseller/*.png`. Anything that
needs the real tablet or two people (simultaneous drags, booth lighting, kiosk lock) goes into the
report as a manual check.

## Never

- Delete, skip or loosen a failing test to get green.
- Read test-only flags anywhere except `getTestFlags()`.
