# Task 3 Report: Vocabulary Mission Experience

Date: 2026-09-26
Base: `cd1cf7253643b7366fa18a9903aae3bcf82a43b7`

## Implemented changes

- Added deterministic vocabulary round helpers for meaning, listening, and spelling modes. Question creation accepts an injected random source, produces four distinct meaning/listening options, hides the listening target, normalizes spelling answers, falls back when speech is unavailable, and marks questions 10/20/30 as bosses.
- Added guarded SpeechSynthesis playback with rate clamping and a silent `false` result for unsupported browsers.
- Rebuilt the vocabulary round as a 30-stop mission with a route indicator, three rotating modes, keyboard shortcuts, accessible pronunciation, one-use contextual hints, save-aware answer locking, Enter-to-continue behavior, boss styling, and a restartable result summary.
- Added the SVG/CSS `FlowGuide` with idle, hit, miss, and level-up states. Motion respects `prefers-reduced-motion`, and interactive controls retain visible keyboard focus.
- Added the five-hit charge meter to the vocabulary HUD while preserving the existing continuous-combo and three-answer double-XP behavior from the progression store. The 30-answer component test proves combo 20 and combo 30 remain reachable.
- Added a summary with accuracy, maximum combo, XP, stars, and newly unlocked achievement/quest/level rewards.
- Extended word-bank loading with shared progress listeners, byte-level streaming progress when `content-length` is present, batch import progress otherwise, ready-state reporting for cached callers, an abort timeout, saved/offline fallback selection, and explicit fallback messages. IndexedDB remains `flowvocab-app` / `data` through the unchanged database layer.
- Added focused engine, component, persistence-retry, and word-bank progress tests.

## RED / GREEN evidence

### Inherited evidence (reported by the prior Task 3 implementer)

- Before integration, the 12 pure-function tests were GREEN.
- Before `VocabGame` / `GameHud` integration, 4 component tests and 2 word-bank import-progress tests were RED.
- This evidence is inherited from the recovery handoff; its original raw terminal transcript was not available in the worktree. The integrated source and tests were already present when recovery began, so I did not manufacture a new pre-implementation failure by reverting completed work.

### Recovery evidence (run in this session)

- Initial command `npm test -- --run ...` was RED at the shell boundary because Windows blocked `npm.ps1` under the current PowerShell execution policy. This was an environment invocation issue, not a code/test failure. All verification was rerun with `npm.cmd`.
- Focused GREEN: `npm.cmd test -- --run src/engine/vocabRound.test.ts src/components/modules/vocab/VocabGame.test.tsx src/store/wordBank.test.ts`
  - 3 test files passed
  - 19 tests passed
  - Includes the 30-stop mission, continuous combo through 30, three bosses, spelling normalization, save retry, keyboard locking, speech fallback, and import progress.
- Full GREEN: `npm.cmd test -- --run`
  - 11 test files passed
  - 67 tests passed
- TypeScript GREEN: `npx.cmd tsc -b --pretty false`
  - Exit code 0, no diagnostics.
- Production build GREEN: `npm.cmd run build`
  - TypeScript and Vite completed successfully.
  - 2,199 modules transformed.
  - Output included `dist/assets/index-CZmvCYRQ.css` and `dist/assets/index-BLBaJ-tW.js`.

## Self-review

- Confirmed answer submission locks synchronously before the async save, preventing digit/click double-submission. Advancement remains disabled until the original queued operation is persisted; retry resumes that same answer rather than creating a replacement operation.
- Confirmed Enter does not hijack focused native buttons and digit shortcuts are ignored in the spelling input, during IME composition, on repeats, or with modifier keys.
- Confirmed listening prompts/options do not expose the target spelling or phonetic before answer reveal.
- Confirmed the mission can finish with a four-word in-memory pool by cycling only after unused candidates are exhausted.
- Confirmed result calculations include the final answer and restart closes the completed 30-answer session before starting a fresh vocabulary session.
- Confirmed source/test changes are isolated to Task 3 files plus the report. Generated root `assets/*` and `index.html` are intentionally excluded from the Task 3 commit.
- `git diff --check -- src .superpowers/sdd/2026-09-24-flowvocab-complete-upgrade/task-3-report.md` is clean.

## Concerns / follow-up

- Speech playback depends on the browser's installed SpeechSynthesis voices. Unsupported browsers receive the specified silent engine result and an explicit UI message; listening questions fall back to meaning mode.
- The production JavaScript bundle is approximately 1.40 MB before gzip (approximately 475 KB gzip). This task does not introduce a new bundle-splitting strategy.
- The build updates generated root publishing artifacts. They remain uncommitted by design, per the task instruction to commit source/tests only.

## Fix round 1: failed listening playback

Review finding: a browser could pass the initial SpeechSynthesis capability check but still throw when playback starts. The UI displayed “听音题已自动改为释义题” without changing the hidden-target listening question.

### TDD evidence

- The first test draft exposed an invalid fixture rather than the review bug: plain jsdom reports speech unsupported during question creation, so stop 2 was already a meaning question. Command: `npm.cmd test -- --run src/components/modules/vocab/VocabGame.test.tsx -t "converts an inaudible listening stop"`. Output: 1 failed / 5 skipped with `expected <h2 tabindex="-1"></h2> to be null`; the fixture was corrected before production code changed.
- Valid RED used a browser boundary where `hasPronunciation()` succeeds but `speechSynthesis.speak()` throws. Command: `npm.cmd test -- --run src/components/modules/vocab/VocabGame.test.tsx -t "converts an inaudible listening stop"`. Output: 1 failed / 5 skipped with `Unable to find role="heading" and name "discover"`; the screen remained in “听音寻踪” after the failed playback.
- GREEN after the minimal fix used the same command. Output: 1 passed / 5 skipped.

### Fix and verification

- Added a single pronunciation handler. Successful playback changes nothing. Failed playback keeps the same word and stop, shows the fallback message, and regenerates only a listening question as meaning mode with `number: index + 1`, preserving boss calculation and route position without submitting an answer.
- Covering engine/component command: `npm.cmd test -- --run src/engine/vocabRound.test.ts src/components/modules/vocab/VocabGame.test.tsx`
  - Output: 2 files passed, 18 tests passed.
- Full regression command: `npm.cmd test -- --run`
  - Output: 11 files passed, 68 tests passed.
- TypeScript command: `npx.cmd tsc -b --pretty false`
  - Output: exit code 0, no diagnostics.
