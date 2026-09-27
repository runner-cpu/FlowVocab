# Task 3 report — local backup, restore, reset and settings

## RED evidence

- `npm.cmd test -- --run src/store/backup.test.ts` failed as expected before implementation: `Failed to resolve import "./backup"`.
- `npm.cmd test -- --run src/components/settings/SettingsPanel.test.tsx src/engine/audio.test.ts src/store/progressStore.test.ts` failed as expected before implementation: the settings module was absent and `SoundBank.setVolume is not a function`.
- `npm.cmd test -- --run src/components/layout/TopBar.test.tsx` failed as expected before implementation because no accessible `设置` button existed.

## GREEN evidence

- `npm.cmd test -- --run src/store/backup.test.ts src/components/settings/SettingsPanel.test.tsx src/engine/audio.test.ts src/store/progressStore.test.ts src/components/layout/TopBar.test.tsx`
  - Passed: 5 files, 26 tests.
- `npx.cmd tsc -b --pretty false`
  - Passed with no output.
- `git diff --check`
  - Passed (no whitespace errors).

## Changed files

- Added `src/store/backup.ts` and `src/store/backup.test.ts`: validated v1 local backup export/import and transactional reset, explicitly excluding lexical tables.
- Added `src/components/settings/SettingsPanel.tsx` and its test: accessible ranges, zen mode, persistence status, local JSON export/restore, and two-step reset.
- Added audio and TopBar tests; TopBar now opens the settings dialog.
- Updated `progressStore.ts` and its test with persisted, bounded settings updates; updated `audio.ts` with volume scaling and mute support; added settings dialog styles.

## Concerns

- None. The browser's persistent-storage permission remains best-effort by platform design; the UI reports whether it was granted.
