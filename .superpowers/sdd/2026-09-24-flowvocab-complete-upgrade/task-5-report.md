# Task 5 report

## Result

Implemented performance splitting, PWA/offline delivery, truthful ECDICT attribution, and vocabulary cache migration while preserving the existing flowvocab-app database and all word IDs/levels.

## RED/GREEN

- RED baseline: the app used wildcard ECharts imports and eagerly imported Dashboard plus every module; there was no bundle-size script, PWA shell, or production service-worker registration. The existing word importer copied the unlicensed legacy content.
- GREEN: modular ECharts registration is limited to CanvasRenderer, RadarChart, HeatmapChart, LineChart, TooltipComponent, GridComponent, VisualMapComponent and RadarComponent. Dashboard and ModulePage are lazy routes behind Suspense. The entry chunk is checked from the Vite manifest.

## Vocabulary provenance

scripts/import_words.py reads the cached ECDICT CSV at data-src/ecdict-source/ecdict.csv, preserving every existing ID and level. The regenerated payload contains 13,159 words, 13,111 source phonetics and 48 honestly empty phonetics. Legacy definitions/phrases are not copied forward. THIRD_PARTY_NOTICES.md includes the exact upstream MIT text and the pinned commit bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b. wordBank cache version 2 forces a forward refresh without touching userWords.

## Verification

- npm.cmd test -- --run: 15 files, 81 tests passed.
- npx.cmd tsc --noEmit: passed.
- npm.cmd run build: passed; Pages root and dist were synchronized.
- npm.cmd run check:bundle: passed; entry assets/index-BCn0rv01.js is 98,915 bytes (limit 409,600).
- git diff --check: reports one pre-existing blank line at EOF in the Task 4 file src/components/onboarding/FirstRunGuide.tsx; no whitespace errors were introduced by Task 5 files.

Generated Pages-root hashed JS/CSS files were reconciled against the final dist/assets; only verified stale generated hashes were removed. The root now also contains the manifest, service worker and icon required by relative GitHub Pages URLs.
