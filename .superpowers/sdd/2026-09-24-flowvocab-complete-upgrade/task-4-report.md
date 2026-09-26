# Task 4 Report — Better Module Interactions, Wrong-Word Forest and Deep Links

## Outcome

- Added exact hash routes for `#/home`, `#/dashboard`, and `#/module/<key>` without React Router. The store parses the initial hash, follows `hashchange`, and makes `go()` the navigation writer. Unknown routes render a branded lost-signal state with a home action.
- Added sentence native drag/drop plus click-to-pick/click-to-place, writing drag reorder plus arrow controls, labeled reset actions, focus states, and polite live announcements.
- Added spatial grammar paths with explicit prerequisite labels and a reading chapter map with an in-chapter progress trail.
- Added a real `UserWord` forest grouped as fragile, due, learning, and mastered. Fragile/due tree selection carries that exact word into the vocabulary mission, including words outside the current difficulty pool.
- Added a first-run guide for route choice, the 30-stop daily mission, keys 1–4 / Enter, a local completion flag, Escape/backdrop close, initial focus, and a top-bar reopen action.

## TDD Evidence

### RED — routing

Command:

`npm.cmd test -- --run src/store/gameStore.test.ts`

Result before implementation: exit 1; 4/4 tests failed because direct module hashes stayed on `home`, hash changes were ignored, invalid modules were not marked `not-found`, and `go('dashboard')` did not update the URL.

### GREEN — routing

Command:

`npm.cmd test -- --run src/store/gameStore.test.ts`

Result after implementation: exit 0; 4/4 passed. A fifth red/green test was then added for selected-word vocabulary review; the final file passes 5/5.

### RED — reorder helpers

Command:

`npm.cmd test -- --run src/components/modules/moduleInteractions.test.ts`

Result before implementation: exit 1; 4/4 tests failed because `placeSentenceSegment` and `moveWritingSegment` did not exist.

### GREEN — reorder helpers

Command:

`npm.cmd test -- --run src/components/modules/moduleInteractions.test.ts`

Result after implementation: exit 0; 4/4 passed.

### RED — forest health and selected review

Command:

`npm.cmd test -- --run src/store/gameStore.test.ts src/components/dashboard/WordForest.test.ts`

Result before implementation: exit 1; the forest module was missing and `reviewWord` was not defined.

### GREEN — focused Task 4 behavior

Command:

`npm.cmd test -- --run src/store/gameStore.test.ts src/components/modules`

Result: exit 0; 3 files, 15 tests passed, including the existing 30-stop vocabulary mission tests.

## Final Verification

- `npm.cmd test -- --run` — exit 0; 14 files, 79 tests passed.
- `npx.cmd tsc --noEmit` — exit 0; no TypeScript errors.
- `git diff --cached --check` — exit 0 for the Task 4 staged patch; unrelated inherited `index.html` output retains its pre-existing CRLF whitespace noise outside the commit.
- Deliberately did not run the production build because it synchronizes root generated assets, which the task explicitly reserves for the final build.

## Changed Files

- `src/store/gameStore.ts`
- `src/store/gameStore.test.ts`
- `src/App.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/onboarding/FirstRunGuide.tsx`
- `src/components/dashboard/WordForest.tsx`
- `src/components/dashboard/WordForest.test.ts`
- `src/pages/Dashboard.tsx`
- `src/components/modules/vocab/VocabGame.tsx`
- `src/components/modules/sentence/SentenceGame.tsx`
- `src/components/modules/writing/WritingGame.tsx`
- `src/components/modules/grammar/GrammarGame.tsx`
- `src/components/modules/reading/ReadingGame.tsx`
- `src/components/modules/moduleInteractions.test.ts`
- `src/styles/global.css`

## Self-Review

- Confirmed all six modules remain routed and the vocabulary mission retains its save-before-advance, synchronous duplicate lock, 30 stops, three modes, speech fallback, and summary behavior through the existing integration tests.
- Confirmed the selected forest word is searched across the complete loaded offline word bank rather than only the active difficulty pool.
- Corrected the grammar map traversal during review so third-level descendants appear and retain their real parent prerequisite.
- Kept Task 4 styles component-focused; no additional global theme layer or PWA/bundle work was added.
- Excluded inherited root `assets/*`, `index.html`, and the controller-owned plan edit from the commit.

## Concerns

- Forest labels use `UserWord.wordId`, which is the stable persisted key and matches current word-bank IDs; a later data-layer enhancement could expose a separate display label for word banks whose IDs differ from spelling.
- No production build was run by design, so root generated output remains intentionally unsynchronized until the controller's final build.
