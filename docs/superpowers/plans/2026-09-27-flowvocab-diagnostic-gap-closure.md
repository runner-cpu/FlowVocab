# FlowVocab Diagnostic Gap Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining release-critical gaps from the 2026-09-27 diagnostic: make review scheduling and analytics truthful, make learning tracks change the curriculum, give users control of local data, reduce visual payload, and ship a valid offline GitHub Pages application from one clean build path.

**Architecture:** Keep React, Zustand and Dexie, but move queueing, curriculum selection, backup validation and PWA asset generation into small testable modules. Replace the duplicated vocabulary payload with ECDICT-derived level shards and lazy level imports, retain legacy IDs only as migration aliases, and keep all user state in the existing `flowvocab-app` database. Use the existing Pages workflow as the only deployment authority; source files live under `src/` and `public/`, while `dist/` remains generated and ignored.

**Tech Stack:** React 18, TypeScript 5.6, Zustand 4, Dexie 4, Vite 5, Vitest, Testing Library, ECharts 5 modular imports, Python 3 + Pillow for deterministic image optimization, a generated service worker, and GitHub Pages.

## Global Constraints

- Preserve all six training modules, the IndexedDB name `flowvocab-app`, and existing profile/progress/session records; migrations may merge duplicate legacy vocabulary records but must not clear user data.
- Keep the application client-side and offline-first. Accounts, a sync backend, payments, telemetry upload, multiplayer, copyrighted exam papers and unlicensed example-sentence corpora remain outside this plan.
- Continuous combo is authoritative: combo never resets at each five-hit rage threshold; rage triggers at 5, 10, 15, 20 and later multiples, so the 20-combo achievement remains reachable.
- Vocabulary inventory, tags, definitions and phonetics must be derived from the pinned MIT-licensed ECDICT snapshot. Legacy `cet4-*`/`cet6-*` IDs may appear only as migration aliases and are not evidence of the current data source.
- Do not invent missing examples, provenance or legal permissions. Empty examples stay hidden; documentation must state what is known and what is not.
- Preserve the approved cool-white/deep-ocean/teal visual language and both themes. Consolidate the existing stylesheet instead of adding another override generation.
- Every interactive control remains keyboard reachable with a visible focus state; page changes move focus to main content; reduced-motion preferences remain respected.
- New behavior follows red-green-refactor. Each test must name an observable regression it catches and exercise real code; do not assert source text or mocked UI.
- Production verification must pass `npm.cmd test -- --run`, `npx.cmd tsc --noEmit`, `npm.cmd run lint`, `npm.cmd run build`, `npm.cmd run check:bundle` and `git diff --check`. The initial JavaScript entry must remain at or below 409,600 bytes uncompressed.
- GitHub Pages production URLs are `https://runner-cpu.github.io/FlowVocab/`; the manifest, service worker, canonical URL and Open Graph metadata must resolve under that path.
- No new raster artwork is generated. Existing project images may be resized and encoded deterministically; generated variants live only in `public/assets/`.

## Scope Accounting

The earlier v3 upgrade already resolved streak reset, the 10-sample difficulty window, three-success mastery, continuous combo/rage, levels, achievements, daily rewards, three vocabulary modes, Boss/results flow, keyboard answers, speech, drag interactions, hash routing, onboarding, the wrong-word forest, atomic answer persistence, ECharts modular imports and the initial bundle gate. This plan does not reimplement those items.

The following report items require a separately authorized product or content project and are recorded rather than faked: cloud accounts/sync (L2/Q8), payments (Q5), push notification infrastructure (Q2), licensed exam-paper coverage (Q3), thousands of reviewed examples and large non-vocabulary banks (C1/C4/Q7), analytics upload (R1), and full i18n (R3).

---

### Task 1: Truthful Review Scheduling, Timing, Startup and Analytics

**Files:**
- Create: `src/engine/reviewQueue.ts`
- Create: `src/engine/reviewQueue.test.ts`
- Create: `src/engine/sessionTiming.ts`
- Create: `src/engine/sessionTiming.test.ts`
- Create: `src/components/system/AppErrorBoundary.tsx`
- Create: `src/components/system/AppErrorBoundary.test.tsx`
- Modify: `src/engine/forget.ts`
- Modify: `src/engine/forget.test.ts`
- Modify: `src/engine/progression.ts`
- Modify: `src/engine/progression.test.ts`
- Modify: `src/store/progressStore.ts`
- Modify: `src/store/progressStore.test.ts`
- Modify: `src/components/modules/vocab/VocabGame.tsx`
- Modify: `src/components/modules/vocab/VocabGame.test.tsx`
- Modify: `src/components/modules/grammar/GrammarGame.tsx`
- Modify: `src/components/modules/sentence/SentenceGame.tsx`
- Modify: `src/components/modules/listening/ListeningGame.tsx`
- Modify: `src/components/modules/writing/WritingGame.tsx`
- Modify: `src/components/modules/reading/ReadingGame.tsx`
- Modify: `src/components/modules/moduleInteractions.test.ts`
- Modify: `src/components/dashboard/Heatmap.tsx`
- Modify: `src/components/dashboard/RadarChart.tsx`
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces `ACTIVE_VOCAB_TARGET = 600`. `computeRadar(progress, userWords)` uses that active target instead of the physical bank size.
- Produces `orderReviewCandidates(words, reviews, now, random, requestedWordId?)`, ordered requested card → overdue/due cards by `nextReview` → unseen cards → future cards; each word appears once.
- Produces `elapsedSince(startedAt, now): number`, clamped to at least 1 ms, so every game records real prompt elapsed time.
- Changes `nextInterval(previous, quality, successfulReviews)` so the first successful exposure returns in one day, later successful reviews graduate through short intervals, failures return to one day, and all intervals remain in `[1, 30]`.
- Adds `initError: string | null` and `retryInit()` to `useProgress`; a failed initialization renders a retry surface instead of an endless loader.
- Produces `buildHeatmapData(stats, days, dailyGoal, today)` with raw XP values and a `heatmapScale`-derived maximum.

- [ ] **Step 1: Write the queue and first-review interval tests**

Use hand-built words `requested`, `overdue-old`, `overdue-new`, `unseen`, and `future`. At `now = 2_000`, assert IDs are ordered `[requested, overdue-old, overdue-new, unseen, future]`, no ID occurs twice, and an absent requested ID does not disturb the due order. In `forget.test.ts`, assert the first q1 and q2 successes both schedule one day; a second fast success graduates beyond one day; a miss always returns to one day.

- [ ] **Step 2: Run the focused tests and confirm the expected RED failures**

Run: `npm.cmd test -- --run src/engine/reviewQueue.test.ts src/engine/forget.test.ts`
Expected: the queue module is missing and the current first q1/q2 intervals are 3/7 instead of 1.

- [ ] **Step 3: Implement queue ordering and short acquisition intervals**

Index reviews by `wordId`, remove the explicit target before categorizing, sort due/future cards by numeric `nextReview`, shuffle only the unseen group with injected Fisher–Yates randomness, and concatenate categories. Pass `successfulReviews` to `nextInterval`; do not reset or special-case combo state.

- [ ] **Step 4: Write real-time and one-answer-per-puzzle component tests**

Use fake timers/performance values. Assert grammar, listening, writing, reading and sentence call `answer()` with the measured delta and without `medianMs`. For a sentence puzzle, perform one wrong placement and then complete all buckets; assert `answer()` is called exactly once for the whole puzzle and reports `correct: false`. Add a pure test that `elapsedSince(500, 1_725)` is `1_225`.

- [ ] **Step 5: Run the module tests and confirm fixed values and fragment counting fail**

Run: `npm.cmd test -- --run src/engine/sessionTiming.test.ts src/components/modules/moduleInteractions.test.ts`
Expected: the timing module is missing, hard-coded times/medians do not equal the fake elapsed values, and the sentence mistake creates more than one answer.

- [ ] **Step 6: Wire one prompt timer into every module**

Reset a `performance.now()` ref whenever the active prompt/item/node changes. On final submission call `elapsedSince(ref.current, performance.now())`; let `progressStore.answer()` use its rolling median. Sentence mistakes stay local until completion, when one answer records whether the puzzle was clean. Vocabulary uses the ordered queue, re-inserts a missed word two to five positions later at most once, and removes the fixed `4500` median.

- [ ] **Step 7: Write analytics and zero-state tests**

Assert 12 mastered plus 24 learning words produce visible vocabulary progress against 600, regardless of a supplied 13,159 bank size. Assert heatmap input `[0, 20, 80, 140]` stays raw and uses at least the 100-XP daily goal as its visual maximum. Render Dashboard with all radar axes zero and assert it says `完成第一轮练习后，这里会显示你的能力变化` and does not render `去补强`.

- [ ] **Step 8: Run analytics tests and confirm the old denominator, clamp and praise copy fail**

Run: `npm.cmd test -- --run src/engine/progression.test.ts src/components/dashboard`
Expected: vocabulary is calculated from the bank total, heatmap clamps values to 12, or the zero state still praises a 0% dimension.

- [ ] **Step 9: Implement honest dashboard models and a stable radar instance**

Use `ACTIVE_VOCAB_TARGET`, raw XP and `heatmapScale`. Memoize Dashboard navigation, create/dispose ECharts once, update options/events separately, and add a dashed 70% target series. Render the explicit first-study state when all six values are zero. Remove `any` from chart callbacks using ECharts event types.

- [ ] **Step 10: Write initialization failure and error-boundary tests**

Reject the first database read and assert the startup screen shows `无法读取本地学习数据` plus a `重试` button; make the next attempt resolve and assert Home appears. Render a child that throws and assert the boundary provides a `重新载入` action rather than a blank tree.

- [ ] **Step 11: Implement startup recovery and run the task suite**

Wrap initialization in `try/catch/finally`, clear stale errors on retry, and keep `ready` false only while a real attempt is in progress. Install `AppErrorBoundary` above App in `main.tsx`. Run: `npm.cmd test -- --run src/engine src/store/progressStore.test.ts src/components/modules src/components/dashboard src/components/system`.

- [ ] **Step 12: Commit Task 1**

Commit: `fix: make review timing and learning analytics truthful`.

---

### Task 2: ECDICT-Only Sharded Vocabulary and Real Track Curricula

**Files:**
- Create: `src/data/curriculum.ts`
- Create: `src/data/curriculum.test.ts`
- Create: `src/data/contentValidation.ts`
- Create: `src/data/contentValidation.test.ts`
- Create: `scripts/import_words_test.py`
- Create: `scripts/validate-content.mjs`
- Modify: `scripts/import_words.py`
- Modify: `src/types/index.ts`
- Modify: `src/data/listening.ts`
- Modify: `src/data/learningScenes.ts`
- Modify: `src/engine/vocabRound.ts`
- Modify: `src/engine/vocabRound.test.ts`
- Modify: `src/store/wordBank.ts`
- Modify: `src/store/wordBank.test.ts`
- Modify: `src/components/modules/vocab/VocabGame.tsx`
- Modify: `src/components/modules/grammar/GrammarGame.tsx`
- Modify: `src/components/modules/sentence/SentenceGame.tsx`
- Modify: `src/components/modules/listening/ListeningGame.tsx`
- Modify: `src/components/modules/writing/WritingGame.tsx`
- Modify: `src/components/modules/reading/ReadingGame.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/ModulePage.tsx`
- Delete: `public/data/words.json`
- Create: `public/data/words/manifest.json`
- Create: `public/data/words/level-0.json`
- Create: `public/data/words/level-1.json`
- Create: `public/data/words/level-2.json`
- Create: `public/data/words/level-3.json`
- Create: `public/data/words/level-4.json`

**Interfaces:**
- `Word.source` becomes `'ecdict'`; `Word` gains `tags: string[]` and optional `legacyIds: string[]`. `primaryPos(word)` returns the first normalized lexical class.
- `TRACK_CURRICULUM` defines actual vocabulary levels, content IDs and module availability for `primary`, `middle-high`, `advanced` and `cet`. `isModuleAvailable(track, module)` and `itemsForTrack(track, module, items)` are the only selection entry points.
- `ensureWordLevels(levels, onProgress?)` imports only missing level shards, records `loadedLevels`, and atomically merges legacy user-word rows into the stable ECDICT word ID. `getWordPool(level)` returns only cached/imported records for that level.
- The word manifest records version, total, per-level counts and URLs relative to its own directory.

- [ ] **Step 1: Write track-selection and content-validation tests**

Assert `primary` exposes vocab/grammar/listening/reading but locks sentence/writing; `cet` exposes all modules; each track returns a different vocabulary-level set; filtered listening IDs differ between `primary` and `cet`. Assert every listening blank has unique options and exactly one answer match. Assert POS inference maps `adv. 突然地`, `vt. 吸收`, `n. 滥用\nvt. 滥用`, and an unknown prefix to `adv`, `verb`, `noun`, and `other`.

- [ ] **Step 2: Run tests and verify duplicate listening options and missing curriculum fail**

Run: `npm.cmd test -- --run src/data/curriculum.test.ts src/data/contentValidation.test.ts`
Expected: the curriculum/validation modules are missing and `l2`/`l4` contain duplicate answers.

- [ ] **Step 3: Add the typed curriculum registry and repair listening data**

Make route availability, per-track vocabulary levels and per-module ID subsets explicit. Home must render locked scenes as disabled non-buttons with `aria-disabled="true"`; direct hashes render a track-specific locked explanation and a route-switch action. Module games consume the filtered arrays instead of global full arrays. Copy for CET content says `考纲词汇与题型模拟`, never `真题`, because no licensed exam paper is bundled.

- [ ] **Step 4: Write failing ECDICT generation and shard-loader tests**

In a temporary fixture CSV, include duplicate CET tags, blank POS columns and meanings beginning with `n.`, `vt.` and `a.`. Run the importer and assert: normalized spellings are unique; stable IDs begin `ecdict-`; aliases retain supplied legacy IDs; five shard files plus a manifest are produced; counts sum exactly; POS is inferred. In TypeScript, mock five same-origin shard responses, request levels `[0, 2]`, and assert levels 1/3/4 are not fetched or held in the in-memory cache.

- [ ] **Step 5: Run importer/loader tests and confirm the monolithic loader fails**

Run: `python -m unittest scripts/import_words_test.py` and `npm.cmd test -- --run src/store/wordBank.test.ts`
Expected: the importer has no shard API and the runtime requests `/data/words.json`.

- [ ] **Step 6: Rebuild the vocabulary from ECDICT tags only**

Select the normalized union of ECDICT rows tagged `cet4` or `cet6`; order difficulty by school/exam tags then ECDICT frequency rank; divide the ordered list into five deterministic near-equal levels. Derive stable IDs from the normalized spelling, derive POS from licensed definition prefixes, include only ECDICT fields, and carry matching old IDs as migration aliases. Validate at least 5,800 unique records, 99% POS coverage, non-empty meanings, unique IDs and exact manifest counts before replacing output files.

- [ ] **Step 7: Implement lazy shard import and legacy progress merge**

Increment the bank version. Fetch the manifest, import requested shards in bounded batches, and update `wordBankMeta.loadedLevels`. Within the same Dexie transaction, merge aliases by summing attempts/correct counts, taking the strongest status and latest review data, then delete superseded alias rows. A failed shard keeps the built-in fallback and exposes an honest message.

- [ ] **Step 8: Write and fail same-POS distractor tests**

Build a noun target with three noun and three verb candidates. With deterministic randomness, assert meaning-mode distractors are the noun candidates, remain unique, and contain one correct option; assert a sparse pool falls back safely without duplicates.

- [ ] **Step 9: Implement plausible distractors and track-aware word loading**

Prefer candidates sharing `primaryPos`, then the same level, then the remaining loaded pool. Sample only the three required indices rather than shuffling the full bank. VocabGame loads only levels allowed by the selected track plus the current adaptive level; an explicit forest review can query/import its recorded level.

- [ ] **Step 10: Validate production content and commit Task 2**

Run: `python scripts/import_words.py`, `python -m unittest scripts/import_words_test.py`, `node scripts/validate-content.mjs`, and `npm.cmd test -- --run src/data src/engine/vocabRound.test.ts src/store/wordBank.test.ts src/components/modules`. Confirm the manifest count equals the sum of five shards, every normalized spelling is unique, POS coverage is at least 99%, and no listening answer is duplicated.

Commit: `feat: make curricula track-aware and vocabulary fully ECDICT-derived`.

---

### Task 3: Local Backup, Restore, Reset and Learning Settings

**Files:**
- Create: `src/store/backup.ts`
- Create: `src/store/backup.test.ts`
- Create: `src/components/settings/SettingsPanel.tsx`
- Create: `src/components/settings/SettingsPanel.test.tsx`
- Modify: `src/store/progressStore.ts`
- Modify: `src/store/progressStore.test.ts`
- Modify: `src/engine/audio.ts`
- Modify: `src/engine/audio.test.ts`
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- `FlowVocabBackupV1` contains `format: 'flowvocab-backup'`, `version: 1`, ISO `exportedAt`, and all user-owned tables: profile, userWords, dailyStats, sessions, progress and planet. It never contains `wordBank` or `wordBankMeta`.
- `exportProgressBackup()` returns validated JSON data; `importProgressBackup(value)` validates first and replaces all user-owned tables in one Dexie transaction; `resetProgress()` restores fresh defaults while retaining the word bank.
- `updateSettings(patch: Partial<UserProfile['settings']>)` persists volume in `[0,1]`, voice rate in `[0.6,1.4]`, and zen mode.
- `SoundBank.setVolume(value)` scales every effect; zen mode still suppresses effects entirely.

- [ ] **Step 1: Write backup validation and transaction tests**

Populate every user-owned table plus the word bank. Assert export has the exact format/version and omits lexical tables. Import a different valid snapshot and assert all six user tables change while the word bank remains. Reject malformed version/type data before any table changes. Force a mid-transaction failure and assert the old state survives intact.

- [ ] **Step 2: Run backup tests and verify the API is missing**

Run: `npm.cmd test -- --run src/store/backup.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement versioned transactional backup and reset**

Validate numeric IDs/counts, module keys, finite timestamps and required singleton IDs without trusting arbitrary imported objects. Normalize optional fields through the same migration defaults as startup. Reset only user-owned tables and immediately reinitialize the Zustand store.

- [ ] **Step 4: Write settings UI and audio-volume tests**

Render the panel and change volume to `0.35` and voice rate to `1.2`; assert persistence and displayed values. Click reset once and assert no deletion; click the visible second confirmation and assert reset. Upload invalid JSON and assert an inline alert without state changes. For audio, replace only the Web Audio boundary and assert `setVolume(0.5)` halves the gain requested by `hit()`.

- [ ] **Step 5: Run the tests and confirm controls/actions are absent**

Run: `npm.cmd test -- --run src/components/settings/SettingsPanel.test.tsx src/engine/audio.test.ts src/store/progressStore.test.ts`.

- [ ] **Step 6: Implement the accessible settings panel**

TopBar exposes one `设置` button. The panel contains labeled range controls, zen mode, persistence status, `导出学习数据`, a file picker for restore and two-step inline reset. Use `URL.createObjectURL` for download and revoke it afterward. Do not use `alert()` or a one-click destructive action. Request `navigator.storage.persist()` once after initialization where supported and display whether durable storage was granted.

- [ ] **Step 7: Run Task 3 tests and commit**

Run: `npm.cmd test -- --run src/store/backup.test.ts src/components/settings/SettingsPanel.test.tsx src/engine/audio.test.ts src/store/progressStore.test.ts`.

Commit: `feat: add local progress backup and learning settings`.

---

### Task 4: Visual System Consolidation, Responsive Media and Accessibility Polish

**Files:**
- Create: `scripts/optimize_images.py`
- Create: `scripts/optimize_images_test.py`
- Create: `src/components/ui/ResponsiveSceneImage.tsx`
- Create: `src/components/ui/ResponsiveSceneImage.test.tsx`
- Modify: `src/data/learningScenes.ts`
- Modify: `src/pages/Home.tsx`
- Modify: `src/components/dashboard/PlanetView.tsx`
- Modify: `src/components/dashboard/ProgressionPanel.tsx`
- Modify: `src/components/game/FeedbackFx.tsx`
- Modify: `src/components/game/GameHud.tsx`
- Modify: `src/components/modules/sentence/SentenceGame.tsx`
- Modify: `src/components/modules/writing/WritingGame.tsx`
- Modify: `src/components/layout/TopBar.tsx`
- Modify: `src/App.tsx`
- Rewrite: `src/styles/global.css`
- Delete: `public/assets/*.png` after verified WebP replacements exist
- Create: `public/assets/*-640.webp`
- Create: `public/assets/*-1024.webp`
- Create: `public/assets/neon-harbor-quest-1280.webp`

**Interfaces:**
- `ResponsiveSceneImage` accepts an asset stem, alt, `eager?`, class name and sizes; it emits 640/1024 WebP `srcSet`, explicit dimensions and `loading=lazy` unless eager.
- Planet markup exposes `data-level="0"` through `data-level="10"`; every level has a distinguishable semantic label and CSS treatment.
- Sentence and writing retain one previous state and expose an `撤销上一步` action that is disabled when no undo is available.

- [ ] **Step 1: Write responsive-image, planet and undo tests**

Assert the Home hero is eager and high-priority, every below-fold scene is lazy, and rendered URLs end in WebP with both widths in `srcSet`. Render levels 0, 6 and 10 and assert distinct accessible labels/data levels. Move one sentence/writing fragment, invoke undo and assert the previous order/bucket state returns.

- [ ] **Step 2: Run focused tests and confirm the current PNG/no-undo behavior fails**

Run: `npm.cmd test -- --run src/components/ui/ResponsiveSceneImage.test.tsx src/components/dashboard src/components/modules/moduleInteractions.test.ts`.

- [ ] **Step 3: Add deterministic image optimization**

Use Pillow with fixed WebP quality/method and no metadata. Preserve aspect ratio, never upscale, emit 640 and 1024 variants for scenes plus 768/1280 for the hero, and fail if total optimized bytes are not at least 80% smaller than the seven PNG inputs. The script reads only the verified project PNGs and writes only `public/assets/`.

- [ ] **Step 4: Switch all image rendering to responsive WebP**

Hero uses the 1280 variant eagerly; scene cards use lazy variants and explicit width/height to prevent layout shift. Remove PNG references only after a production build confirms every referenced WebP exists.

- [ ] **Step 5: Consolidate semantic tokens and planet stages**

Reduce four live `:root` generations to one light token block and one `[data-theme='dark']` override. Keep component selectors once, merge repeated 640/900 media rules, use semantic foreground/background/border/focus tokens, and add visually distinct p6–p10 atmospheres without changing the ten-level formula. Preserve `prefers-reduced-motion`.

- [ ] **Step 6: Finish accessibility and interaction polish**

Rename visible navigation to `首页 / 词汇 / 语法 / 学习数据`, retain the expedition names as secondary titles, hide decorative emoji from assistive technology, raise mobile reorder targets to at least 44×44 CSS pixels, add undo, and move focus to `#main-content` after hash page changes. Put miss feedback on a high-contrast semantic plate. Replace Unicode feedback particles with CSS/SVG shapes that do not add network assets.

- [ ] **Step 7: Run visual behavior tests, build and size checks**

Run: `python -m unittest scripts/optimize_images_test.py`, `python scripts/optimize_images.py`, `npm.cmd test -- --run src/components`, and `npm.cmd run build`. Verify the seven shipped responsive media families total under 2.5 MiB, no source references `.png`, the desktop and 390px layouts have no horizontal overflow, and reduced-motion disables nonessential animation.

- [ ] **Step 8: Commit Task 4**

Commit: `perf: consolidate visuals and ship responsive scene media`.

---

### Task 5: Valid PWA, One Build Path, Quality Gates and Provenance

**Files:**
- Create: `scripts/build-service-worker.mjs`
- Create: `scripts/pwa-assets.test.ts`
- Create: `eslint.config.js`
- Create: `.github/dependabot.yml`
- Create: `CHANGELOG.md`
- Create: `LICENSE`
- Create: `ASSET_PROVENANCE.md`
- Modify: `index.html`
- Modify: `public/manifest.webmanifest`
- Modify: `public/sw.js`
- Modify: `src/main.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`
- Move: `心流词境_项目计划方案.html` to `docs/心流词境_项目计划方案.html`
- Delete: `index.src.html`
- Delete: `scripts/prepare-source-index.mjs`
- Delete: `scripts/sync-pages-root.mjs`
- Delete: tracked generated root `assets/`, `data/`, `icons/`, `manifest.webmanifest` and `sw.js`
- Delete: tracked `output/imagegen/` concepts after approved WebP deliverables are verified in `public/assets/`

**Interfaces:**
- `buildPrecacheList(distDir)` returns sorted base-relative URLs for `index.html`, manifest, icon, CSS, JavaScript and shipped WebP assets. `renderServiceWorker(template, urls)` injects the exact list plus a deterministic cache version.
- The source manifest is referenced with `%BASE_URL%manifest.webmanifest`; its `start_url`, scope and icon resolve from `/FlowVocab/`, never `/FlowVocab/assets/`.
- `npm run build` performs TypeScript build, Vite build and service-worker injection only. It never writes tracked files outside `dist/`.

- [ ] **Step 1: Write PWA URL and precache behavior tests**

Build a temporary `dist` containing `index.html`, two hashed chunks, manifest, icon and WebP. Assert every generated precache URL resolves beneath `https://runner-cpu.github.io/FlowVocab/`; manifest start/scope resolve to `/FlowVocab/`; the icon resolves to `/FlowVocab/icons/flowvocab-icon.svg`; the service worker contains both lazy chunks and deletes caches whose version is not current.

- [ ] **Step 2: Run PWA tests and confirm current paths/precache fail**

Run: `npm.cmd test -- --run scripts/pwa-assets.test.ts`
Expected: the build module is missing, manifest resolution points under `assets/`, and lazy chunks are absent from the shell list.

- [ ] **Step 3: Implement build-time service-worker generation**

Treat `public/sw.js` as a template with one explicit JSON injection marker. After `vite build`, enumerate final artifacts and inject a version derived from their names/sizes. Install caches the complete shell, navigation falls back to cached `index.html`, vocabulary shards use stale-while-revalidate, and activation deletes prior FlowVocab cache versions before claiming clients. Register with `import.meta.env.BASE_URL + 'sw.js'`.

- [ ] **Step 4: Make `index.html` the only source document**

Use UTF-8 Chinese title/description, root manifest/icon paths, compatible CSP and referrer meta, canonical, Open Graph and Twitter metadata for the production Pages URL. Remove prepare/sync scripts and set `build` to `tsc -b && vite build && node scripts/build-service-worker.mjs`. Keep `dist/` ignored and let the existing Pages action upload it directly.

- [ ] **Step 5: Add lint and dependency-update gates**

Install ESLint 9 flat config with TypeScript and React Hooks support. Replace remaining production `any` at module route checks, Web Audio augmentation and chart callbacks. Add `npm run lint`; run lint before build in Pages CI. Add monthly npm and Actions Dependabot entries.

- [ ] **Step 6: Remove duplicate generated assets safely**

First compare every root artifact with its `dist` or `public` counterpart and verify the new build succeeds. Then remove only the tracked root build copies and `output/imagegen/`; retain optimized canonical media in `public/assets/`. Add root-only ignore rules preventing reintroduction. Move the standalone plan page under `docs/`. Report the removed paths and note they remain recoverable from Git history.

- [ ] **Step 7: Reconcile licensing and product claims**

README and source comments name ECDICT as the current vocabulary source, describe track filters accurately, and avoid claiming bundled true exam questions, image questions or populated examples. `THIRD_PARTY_NOTICES.md` retains the pinned ECDICT MIT text. `LICENSE` makes the repository's current all-rights-reserved status explicit; `ASSET_PROVENANCE.md` identifies project-generated imagery, records that original provider logs are unavailable, and does not grant rights the repository owner cannot prove. Add a v3.1.0 entry to CHANGELOG covering migrations and backup guidance.

- [ ] **Step 8: Run the complete release gate**

Run in this order:

```powershell
npm.cmd test -- --run
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
npm.cmd run check:bundle
node scripts/validate-content.mjs
git diff --check
```

Then serve `dist` at `/FlowVocab/` and verify: fresh install metadata; direct `#/vocab`, `#/dashboard` and not-found routes; one online load followed by an offline reload; desktop and 390px layouts; keyboard-only answer/settings/backup flows; zero console errors; and no requests to `/FlowVocab/assets/manifest*` or missing `/assets/icons/`.

- [ ] **Step 9: Commit Task 5**

Commit: `chore: harden Pages delivery and clean generated artifacts`.

---

## Final Integration and Delivery

- [ ] Generate one whole-branch review package from merge base `origin/main` to `HEAD`; dispatch an independent final reviewer and resolve every Critical/Important finding through one reviewed fix wave.
- [ ] Re-run the complete release gate on the reviewed branch and record exact test counts and bundle bytes.
- [ ] Fast-forward local `main` only after the reviewed feature branch is green, push `main` to `origin`, and wait for the `Deploy FlowVocab to GitHub Pages` workflow to complete successfully.
- [ ] Verify the public repository commit and `https://runner-cpu.github.io/FlowVocab/` with a cache-busting request, including manifest, service worker, core hashed assets, vocabulary manifest and one shard.
- [ ] Deliver a concise matrix of resolved, partially resolved and explicitly deferred diagnostic items, plus GitHub/Pages URLs and recovery notes for the local-data migration.
