# FlowVocab Adventure Learning Surface

## Goal

Turn the existing six-module English learning app into a repeatable daily adventure. The first screen should answer three questions immediately: what should I do next, why is it interesting, and how is my progress changing?

## Visual system

- Deep navy night-sky background with teal growth and amber challenge accents.
- Quiet left rail on desktop; compact bottom navigation on mobile.
- One primary mission surface, one horizontal daily journey, then three focused learning scene cards.
- Rounded surfaces use a restrained 16-20px radius, thin blue borders, and layered shadows. No dense nested card grid.
- Typography remains system-native for fast loading, with oversized mission heading and compact utility labels.

## Interaction model

- The primary mission starts the vocabulary flow.
- Daily Journey checkpoints link to vocabulary, listening, and sentence modules.
- The recommendation strip chooses a review action and reflects current XP/streak state.
- Module cards remain keyboard accessible and show mastery progress.
- Dashboard keeps existing radar, heatmap, difficulty flow, and planet visualizations.

## Data and behavior

- Reuse existing Zustand/Dexie progress state, combo engine, forgetting curve, and module routes.
- Derive daily mission copy from XP progress and the weakest radar skill.
- Show real XP, streak, mastery, session counts, and daily module completion; no invented learning metrics.
- Preserve all existing module game logic and persistence.

## Verification

- `npm run build` must pass.
- Browser validation covers desktop and mobile first viewport, mission CTA, a journey checkpoint, module back navigation, and console health.
- Compare the rendered page with `output/imagegen/flowvocab-dashboard-concept.png` for palette, hierarchy, spacing, card anatomy, and responsive rhythm.
