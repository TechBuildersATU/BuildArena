---
name: buildarena-work-package
description: >-
  Use when implementing, continuing or finishing a BuildArena work package (WP-01 … WP-17,
  Turkish "İP-01 … İP-17"), e.g. "build WP-06", "İP-05'i yap", "start the home screen".
  Covers which spec sections to read, branching, implementation order, tests and the definition
  of done.
---

# Building a BuildArena work package

## 1. Read before writing code

0. **All screens are built** from the club's full prototype `docs/tam_prototip/` (guide PDF +
   `.txt`, playable `uygulama/`, screens `gorseller/`); it is the primary reference for any
   change. The club dropped the API: WP-11 and WP-12 are cancelled (no proxy, no AI calls).
1. `docs/BuildArena_Project_Document_EN.md` §16.3 — the package's scope and **Done when**.
2. The feature sections listed for it below, plus its rows in the §16.5 button matrix. For
   anything in scenario mode, `docs/senaryo_modu/` (doc + playable prototype) is the spec.
3. The matching reference image in `docs/assets/ekranlar/`.
4. §16.2 dependencies: if a package it depends on isn't done, say so before starting.

| WP    | Read                                                              | Main files                                                                      |
| ----- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| WP-02 | §13.2, §13.3, §14                                                 | Skeleton — already in place                                                     |
| WP-03 | §6.4, §7.4–7.5, §9, §10, §12.4–12.5                               | `src/data/*.json`, `src/ai/schemas.ts` (Zod), validation tests — scenarios done |
| WP-04 | §6.2, §14, `06_tasarim_sistemi.png`                               | `src/components/*`, a component test page                                       |
| WP-05 | §5, §14.4, `01_ana_ekran.png`                                     | `src/screens/Home.tsx`                                                          |
| WP-06 | §6.2, §13.5, `05_dokunma_bolgeleri.png`                           | `src/game/drag.ts`, `src/game/touchIsolation.ts`                                |
| WP-07 | §6.1–6.3, §6.5, §13.4, `02_gorev_karti.png`, `03_duello_oyun.png` | `DuelIntro.tsx`, `DuelGame.tsx`, `src/stores/*`                                 |
| WP-08 | §11                                                               | `src/game/scoring.ts` + unit tests (81 / 62 example)                            |
| WP-09 | §6.5, `04_sonuc.png`                                              | `DuelResult.tsx`                                                                |
| WP-10 | §7, §11.2                                                         | `Scenario*.tsx`, `src/stores/scenarioStore.ts`                                  |
| WP-11 | cancelled (no API)                                                | —                                                                               |
| WP-12 | §12.1 (bank only)                                                 | `src/data/` banks, `src/ai/juryAnalysis.ts`, `src/ai/duelJury.ts`               |
| WP-13 | §8                                                                | `Leaderboard.tsx`, `src/db/`                                                    |
| WP-14 | §4, `09_tutorial.png`, `09_tutorial.html`                         | `Onboarding.tsx`, `src/data/tutorial.json`                                      |
| WP-15 | §13.5, §12.8 (7), §16.3 WP-15                                     | `Admin.tsx`                                                                     |
| WP-16 | §14.4                                                             | animations, `public/sounds/`                                                    |
| WP-17 | §16.5, §17.1                                                      | `docs/test-report.md`                                                           |

Already built (from the full prototype v0.3): WP-02 … WP-10 and WP-13 … WP-15 — data, design
system, home + idle, duel (multi-touch, isolation, scoring, results), scenario mode, leaderboard
(scenario + duel tabs), tutorial, staff menu (top 3, end-of-day, settings), sound/music/vibration.
Open: WP-16 polish on the real tablet and WP-17 (the test report). Keep the existing tests green.

## 2. Branch

```bash
git switch main && git switch -c wp-XX-short-name
```

## 3. Plan, then build in small steps

- List the files you will create or change and the matrix rows / critical behaviours you will
  test. Share the plan with the user before large changes.
- Keep the existing `data-testid`s of the screen you change.
- Use `ROUTES`, `usePressGuard`, the CSS-module/token styles and the conventions in `AGENTS.md`.

## 4. Test while building

Follow the `buildarena-button-tests` skill: component tests per control, `MATRIX` rows in
`e2e/buttons.spec.ts`, unit tests for pure logic, fake timers for anything timed.

## 5. Verify

```bash
npm run check                 # lint → typecheck → unit → build → secret scan → e2e
```

Then `npm run dev`, open `http://localhost:5173/?skipTutorial=1` at 1280×800, click every button
on the touched screens and compare with `docs/tam_prototip/gorseller/`.

## 6. Report

What was built, test counts (unit / component / e2e), anything deferred, and the manual checks
still needed on the real booth tablet. Do not commit unless the user asks.
