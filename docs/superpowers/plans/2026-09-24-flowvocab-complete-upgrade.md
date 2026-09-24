# FlowVocab Complete Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current expedition-themed prototype into a reliable, motivating, keyboard-accessible offline learning product, while fixing the verified progression bugs and reducing the initial JavaScript bundle below 400 kB.

**Architecture:** Keep React 18, Zustand and Dexie. Move deterministic progression rules into pure modules, persist answer-side changes through one Dexie transaction, expose a hash-based route store, and lazy-load training modules and chart code. Add a compact progression layer (level, achievements, daily quests, planet evolution) that derives from existing XP and study records instead of introducing a backend.

**Tech Stack:** React 18, TypeScript 5.6, Zustand 4, Dexie 4, ECharts 5 modular imports, Vite 5, Vitest, Testing Library, Web Speech API, service worker and web app manifest.

## Global Constraints

- Preserve all six training modules and the existing IndexedDB database name `flowvocab-app`; migrate data forward without clearing user records.
- Keep the application fully client-side and offline-first; do not add accounts, a backend, external AI calls or multiplayer.
- Preserve the approved cool-white/deep-ocean/teal visual language, expedition scenes and light/dark themes; consolidate CSS instead of appending a fifth theme override.
- Every interactive control must be keyboard reachable with a visible focus state; respect `prefers-reduced-motion`.
- New logic and behavior changes follow red-green-refactor. Tests assert observable behavior against real pure functions; IndexedDB is the only boundary allowed to use fake-indexeddb.
- The production build must keep the initial JavaScript chunk at or below 400 kB uncompressed, pass `npm test -- --run`, `npm run build` and `git diff --check`.
- Vocabulary attribution must name ECDICT and its MIT license. Do not claim KyleBing data is licensed when it is not.
- Generated Pages-root artifacts remain synchronized with `dist` by the existing build script.

---

### Task 1: Regression Tests and Correct Progression Rules

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/engine/streak.ts`
- Modify: `src/engine/difficulty.ts`
- Modify: `src/engine/forget.ts`
- Create: `src/engine/progression.ts`
- Create: `src/engine/streak.test.ts`
- Create: `src/engine/difficulty.test.ts`
- Create: `src/engine/forget.test.ts`
- Create: `src/engine/progression.test.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `updateStreak(lastStudyDate: string | null, streakDays: number, today: string): { streakDays: number; lastStudyDate: string }`.
- Changes: `DifficultyState.window` to `Array<{ correct: boolean; slow: boolean }>`; removes `slowCount`.
- Changes: `nextStatus(status, quality, successfulReviews)` requires three successful reviews before `mastered`.
- Produces: `levelFromXp(totalXp)`, `planetLevelFromEnergy(energy)`, `vocabMasteryScore(mastered, reviewed, target)` and `heatmapScale(values, dailyGoal)`.

- [ ] **Step 1: Install and configure the test runner**

Add scripts `"test": "vitest"` and `"test:run": "vitest run"`; add `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom` and `fake-indexeddb` as development dependencies. Configure Vitest in `vite.config.ts` with the jsdom environment and a setup file importing `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Write failing streak tests**

Cover the literal cases: first study on `2026-09-24` gives 1; another answer on the same day stays 1; `2026-09-23` followed by `2026-09-24` increments; `2026-09-14` followed by `2026-09-24` resets to 1.

- [ ] **Step 3: Run the streak tests and verify the missing module fails**

Run: `npm test -- --run src/engine/streak.test.ts`  
Expected: FAIL because `src/engine/streak.ts` does not exist.

- [ ] **Step 4: Implement the streak date transition**

Compare local calendar keys, treat only an exact previous calendar day as consecutive, and make repeated same-day calls idempotent.

- [ ] **Step 5: Write and fail the sliding-window tests**

Feed ten slow answers then ten fast correct answers and assert the final window has zero slow entries and can level up. Also assert ten answers retain exactly ten samples.

- [ ] **Step 6: Implement a real difficulty sample window**

Append `{ correct, slow: timeMs > medianMs * 1.4 }`, slice to the last ten, and calculate both accuracy and slow ratio from that array.

- [ ] **Step 7: Write and fail mastery tests**

Assert a new word is `learning` after success one and two, becomes `mastered` after success three, and a failed review returns it to `learning` while resetting the success counter.

- [ ] **Step 8: Implement three-success mastery and deterministic display scores**

Add `successfulReviews` to `UserWord`. Make vocabulary display progress use a 600-word active target plus reviewed-word partial credit so early progress is visible; cap at 100. Make the planet use ten 250-energy levels. Make the heatmap scale use the 80th percentile of non-zero values with the daily goal as a floor.

- [ ] **Step 9: Run all engine tests and commit**

Run: `npm test -- --run src/engine`  
Expected: all engine tests pass.  
Commit: `fix: make learning progression accurate and testable`.

---

### Task 2: Atomic Persistence, Profile Levels, Daily Quests and Achievements

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/store/db.ts`
- Modify: `src/store/progressStore.ts`
- Create: `src/store/progressModel.ts`
- Create: `src/store/progressModel.test.ts`
- Create: `src/components/dashboard/ProgressionPanel.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- Produces: `deriveProfileProgress(profile, daily, planet, userWords): ProfileProgress` with level, current XP, next XP, three daily quests, unlocked achievement IDs and chest state.
- Changes: `UserProfile` gains `lastStudyDate`, `claimedQuestDates` and `unlockedAchievements`; Dexie version 3 upgrades existing rows with defaults.
- Changes: `answer(...)` returns `Promise<void>` and persists profile, planet, daily stats, word progress and radar in one `db.transaction('rw', ...)`.

- [ ] **Step 1: Write failing derivation tests**

Test level boundaries at 0/499/500/1499 XP, daily quest completion at 10 answers/80 XP/5 combo, chest availability only when all three are complete, and achievements for first answer, 7-day streak, 100 mastered words and 20 combo.

- [ ] **Step 2: Run the model test and verify it fails because the model is missing**

Run: `npm test -- --run src/store/progressModel.test.ts`.

- [ ] **Step 3: Implement the pure progression model**

Use organic level thresholds `[0, 500, 1500, 3200, 5600, 8500, 12000, 16200, 21000, 26400]`; quest rewards are 20, 25 and 30 XP and the all-clear chest awards 50 energy once per local day.

- [ ] **Step 4: Add the Dexie v3 forward migration**

Upgrade only missing fields. Preserve totals, progress, settings, word reviews and sessions.

- [ ] **Step 5: Convert answer persistence to one transaction**

Calculate the full next state before `set`; write all affected tables inside one Dexie transaction; update Zustand after a successful transaction; expose an inline recoverable error state if the transaction rejects.

- [ ] **Step 6: Add progression surfaces**

Home receives a compact level bar, three quest rows and one chest button. Dashboard receives an achievement wall and ten-stage planet copy. Locked achievements remain readable and explain their criterion.

- [ ] **Step 7: Run model and store tests, then commit**

Run: `npm test -- --run src/store src/engine`.  
Commit: `feat: add daily progression and achievement loop`.

---

### Task 3: Vocabulary Mission Experience

**Files:**
- Create: `src/components/game/FlowGuide.tsx`
- Create: `src/components/game/RoundSummary.tsx`
- Create: `src/components/game/AnswerHint.tsx`
- Create: `src/engine/vocabRound.ts`
- Create: `src/engine/vocabRound.test.ts`
- Modify: `src/components/modules/vocab/VocabGame.tsx`
- Modify: `src/components/game/GameHud.tsx`
- Modify: `src/store/wordBank.ts`
- Modify: `src/types/index.ts`

**Interfaces:**
- Produces: `createVocabQuestion(word, pool, mode)` for `meaning`, `listening` and `spelling` modes.
- Produces: `speakWord(word, rate)` using SpeechSynthesis with a silent unsupported-browser result.
- Changes: `ensureWordBank(onProgress?)` reports `{ phase: 'download' | 'import' | 'ready'; loaded: number; total: number }`.

- [ ] **Step 1: Write failing question-mode tests**

Assert meaning mode has exactly four distinct options and one answer; listening mode never prints the target before answer; spelling mode normalizes case and surrounding whitespace; every tenth question is marked as a boss question.

- [ ] **Step 2: Run the vocab round test and verify it fails**

Run: `npm test -- --run src/engine/vocabRound.test.ts`.

- [ ] **Step 3: Implement deterministic question builders**

Accept an injected random function in tests. Rotate modes meaning → listening → spelling for eligible entries and fall back to meaning when pronunciation support is absent.

- [ ] **Step 4: Redesign the live round**

Add a 30-stop route line, keyboard keys 1–4, Enter to continue, a pronunciation button, one-use root/phrase hint, a CSS/SVG guide character with idle/hit/miss/level-up states, a five-hit flame meter, boss treatment on questions 10/20/30 and a result page showing accuracy, max combo, XP, stars and newly unlocked rewards.

- [ ] **Step 5: Add visible word-bank import progress**

Stream the fetch response when content length is available, otherwise report batch import progress. Display percent, imported count and a specific fallback message rather than an indefinite loading card.

- [ ] **Step 6: Verify keyboard and speech behavior with component tests**

Render the real vocabulary component with an in-memory word pool; assert digit keys select exactly once, disabled answers do not double-submit, pronunciation has an accessible name and the summary appears after the configured round size.

- [ ] **Step 7: Commit the vocabulary mission**

Commit: `feat: turn vocabulary practice into a multi-mode mission`.

---

### Task 4: Better Module Interactions, Wrong-Word Forest and Deep Links

**Files:**
- Create: `src/components/dashboard/WordForest.tsx`
- Create: `src/components/onboarding/FirstRunGuide.tsx`
- Modify: `src/components/modules/sentence/SentenceGame.tsx`
- Modify: `src/components/modules/writing/WritingGame.tsx`
- Modify: `src/components/modules/grammar/GrammarGame.tsx`
- Modify: `src/components/modules/reading/ReadingGame.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/store/gameStore.ts`
- Modify: `src/App.tsx`
- Create: `src/store/gameStore.test.ts`

**Interfaces:**
- Produces hash routes `#/home`, `#/dashboard`, and `#/module/<key>`; invalid routes resolve to a branded not-found state with a home action.
- Produces: `WordForest` from real `UserWord` records, grouping fragile, due, learning and mastered states.

- [ ] **Step 1: Write failing route tests**

Assert direct load of `#/module/listening`, back/forward hash changes, an invalid module route and `go('dashboard')` updating both state and URL.

- [ ] **Step 2: Implement hash routing without adding React Router**

Parse once on store creation, listen to `hashchange`, and keep navigation buttons as the single writer through `go`.

- [ ] **Step 3: Replace fragment button grids with pointer and keyboard reorder interactions**

Sentence buckets accept native drag/drop plus click-to-pick/click-to-place. Writing sort items accept drag reorder plus ArrowUp/ArrowDown controls. Retain a clearly labeled reset action and announce order changes through an aria-live region.

- [ ] **Step 4: Make grammar and reading progress spatial**

Connect grammar nodes with SVG paths and explicit locked prerequisites. Add a compact chapter map and progress trail to reading while retaining original story content and quizzes.

- [ ] **Step 5: Add the wrong-word forest and first-run guide**

Map error ratio, review due date and mastery status to tree health. Clicking a fragile tree opens vocabulary review. The first-run guide explains route choice, the daily mission and keys 1–4, persists one local completion flag and can be reopened from the top bar.

- [ ] **Step 6: Test routing and reorder helpers, then commit**

Run: `npm test -- --run src/store/gameStore.test.ts src/components/modules`.  
Commit: `feat: improve module interaction and navigation`.

---

### Task 5: Performance, PWA and Vocabulary Attribution

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/dashboard/RadarChart.tsx`
- Modify: `src/components/dashboard/Heatmap.tsx`
- Modify: `src/components/dashboard/DifficultyFlow.tsx`
- Create: `src/charts/echarts.ts`
- Modify: `src/main.tsx`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `public/icons/flowvocab-icon.svg`
- Modify: `index.src.html`
- Modify: `vite.config.ts`
- Modify: `README.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Chart components import only CanvasRenderer, RadarChart, HeatmapChart, LineChart, TooltipComponent, GridComponent, VisualMapComponent and RadarComponent.
- App lazy-loads Dashboard and six module components with Suspense skeletons.
- Service worker caches the hashed app shell and vocabulary JSON, uses cache-first for immutable assets and stale-while-revalidate for the vocabulary payload.

- [ ] **Step 1: Add a build-size verification script**

Create `scripts/check-bundle-size.mjs` that reads the Vite manifest, locates the entry chunk, prints its byte count and exits non-zero above 409600 bytes. Add `npm run check:bundle`.

- [ ] **Step 2: Verify the current bundle check fails**

Run: `npm run build && npm run check:bundle`.  
Expected before optimization: FAIL because the current entry bundle is about 1.38 MB.

- [ ] **Step 3: Switch ECharts to modular registration and lazy routes**

Centralize chart registration, replace wildcard imports, lazy-load Dashboard and the module page payload, and configure stable manual chunks for React, Dexie/Zustand and charts.

- [ ] **Step 4: Add the offline shell**

Register the service worker only in production. Add manifest metadata, SVG install icon, theme colors, skip-to-content link and a useful offline fallback. Ensure relative paths work under GitHub Pages.

- [ ] **Step 5: Document data provenance truthfully**

Describe the current KyleBing-derived list as unlicensed development data and provide the replacement procedure. Add ECDICT MIT attribution for any enriched phonetic subset. Do not publish a false license statement for the existing list.

- [ ] **Step 6: Harden CI**

Run tests, TypeScript/build, bundle-size check and `git diff --check` before the Pages upload step.

- [ ] **Step 7: Verify the bundle target and commit**

Run: `npm run build && npm run check:bundle`.  
Expected: entry chunk at or below 409600 bytes.  
Commit: `perf: split the app and add offline delivery`.

---

### Task 6: Visual-System Consolidation and Product Polish

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/components/dashboard/Heatmap.tsx`
- Modify: `src/components/dashboard/RadarChart.tsx`
- Modify: `src/components/dashboard/DifficultyFlow.tsx`
- Modify: `src/components/dashboard/PlanetView.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Dashboard.tsx`

**Interfaces:**
- One token block controls both themes; component rules consume semantic tokens only.
- Radar renders learner values plus a 70% target line. Difficulty flow renders a 2–3 level flow-zone band. Heatmap uses the data-derived maximum from Task 1.

- [ ] **Step 1: Inventory selectors before consolidation**

Use `rg 'className=' src` and map every live class to one rule group. Delete superseded 2026 override blocks only after its live styles have moved into the canonical component section.

- [ ] **Step 2: Consolidate tokens and motion**

Keep one light token block and one dark override. Use one focus ring, one pressed state, three radius tiers, a four-step shadow scale and shared durations/easing. Remove inline visual styles from modified components.

- [ ] **Step 3: Finish the progress visualizations**

Add the radar target, difficulty band, honest heatmap legend, 10-stage planet evolution, level-up overlay, empty states and responsive labels.

- [ ] **Step 4: Verify desktop, mobile, keyboard and reduced motion**

At 1440×900 and 390×844 verify Home, vocabulary mission and Dashboard; tab through navigation and answers; enable reduced motion and verify transforms/repeating animations stop; confirm no horizontal overflow.

- [ ] **Step 5: Run the complete local gate and commit**

Run: `npm test -- --run && npm run build && npm run check:bundle && git diff --check`.  
Commit: `feat: complete the FlowVocab product polish`.

---

### Task 7: Browser Acceptance, GitHub Push and Pages Deployment

**Files:**
- Modify only files required by acceptance findings.
- Generated: `dist/**`, Pages-root `index.html` and `assets/**` through `npm run build`.

**Interfaces:**
- GitHub Actions workflow `Deploy FlowVocab to GitHub Pages` is the deployment authority.

- [ ] **Step 1: Serve the production build**

Run `npm run preview -- --host 127.0.0.1` and record the local URL.

- [ ] **Step 2: Complete browser acceptance**

Verify Home → vocabulary → answer → summary → Dashboard, direct hash load, refresh persistence, first-run guide, light/dark, offline reload, 1440×900 and 390×844. Capture screenshots for Home, vocabulary boss state, round summary and Dashboard.

- [ ] **Step 3: Re-run the full gate after any browser fixes**

Run: `npm test -- --run && npm run build && npm run check:bundle && git diff --check`.

- [ ] **Step 4: Push and deploy**

Push `feat/flowvocab-complete-upgrade`, merge it to `main` after final review, push `main`, then watch the Pages workflow until the deployment job succeeds.

- [ ] **Step 5: Validate the public Pages URL**

Open the deployment URL, verify the app shell and one lazy route load without console errors, and report the commit SHA, workflow run and URL.
