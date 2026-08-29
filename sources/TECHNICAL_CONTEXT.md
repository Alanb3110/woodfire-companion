# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is a zero-backend static PWA intended for GitHub Pages and iPhone/Safari installation.

The application uses vanilla HTML/CSS/JavaScript with native ES modules. No runtime framework, backend or external API is required.

Current structure:

```text
woodfire-companion/
├── index.html
├── styles.css
├── prep.css
├── journal.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── package.json
├── .github/workflows/tests.yml
├── js/
│   ├── journal.js
│   ├── journal-ui.js
│   ├── library.js
│   ├── planner.js
│   ├── prep-ui.js
│   ├── recipe.js
│   ├── recipe-loader.js
│   ├── settings.js
│   └── shopping.js
├── recipes/
│   ├── index.json
│   └── pork-belly-burnt-ends.json
├── tests/
│   ├── active-cook-replan.test.js
│   ├── journal-integration.test.js
│   ├── journal.test.js
│   ├── library.test.js
│   ├── planner.test.js
│   ├── recipe.test.js
│   ├── shopping.test.js
│   ├── ui-contract.test.js
│   └── version.test.js
├── sources/
└── icons/
```

## Application flow
The UI has three top-level views:
1. `library` — recipes, active-cook resume card and local cook journal;
2. `recipe` — servings/service time plus ingredients/courses/preparation/equipment;
3. `cook` — active planning + temperature tracking.

State remains local-first/offline.

## Recipe/content layer
`recipes/index.json` is the library manifest. Only complete validated recipes may be executable.

Canonical executable recipe: `recipes/pork-belly-burnt-ends.json`, content version `4`.

Version 4 contains no `preferredStartOffsetMin`. Its baseline is derived from service anchor, dependencies, durations and explicit planning buffers.

`js/recipe.js` provides validation, serving scaling and Woodfire summary formatting.

See:
- `sources/RECIPE_SCHEMA_V1.md`;
- `sources/SHOPPING_PREP.md`;
- `sources/PLANNER_V1.md`;
- `sources/ACTIVE_COOK_V1.md`;
- `sources/COOK_JOURNAL_V1.md`.

## Serving configuration and pre-cook
Changing servings updates the same scaled data used by the user-facing `Ingrédients & courses` checklist.

`js/shopping.js` is pure data logic. `js/prep-ui.js` owns pre-cook rendering and shopping checkbox persistence.

Shopping state uses `woodfire-companion-shopping-v1` and is independent from cook history, active progress and visual settings.

## Cook-session state
Active cook state remains under:

`woodfire-companion-v1`

Logical fields now include:
- `view`;
- `mealTime`;
- `servings`;
- `completed`;
- `taskShifts`;
- `temperatureTarget`;
- `measurements`;
- `cookStartedAt`;
- `sessionId`;
- `sessionStartedAt`;
- `sessionServedAt`;
- `targetServingAt`;
- `activeTab`;
- `recipeId`;
- `recipeVersion`;
- `activeRecipeUrl`.

`sessionId` remains stable for one meal. `targetServingAt` stores an absolute date/time so a resumed cook does not silently move to another calendar day.

Older active records without these fields remain readable; compatible metadata is created from existing progress where possible.

`completed[stepId]` stores actual completion timestamps. `taskShifts[stepId]` stores explicit manual delay attached to a step.

## Cook Journal V1
Completed meal sessions are stored separately under:

`woodfire-companion-journal-v1`

The stored object has `schemaVersion: 1` and an `entries` array.

`js/journal.js` owns the versioned journal model/store and can:
- generate session ids;
- build immutable-ish cook snapshots from current recipe/state/schedule;
- load/save the versioned journal;
- upsert by session id;
- remove one session;
- clear the journal without touching other local storage keys.

A journal entry includes recipe identity/version/title, servings, target/actual service timestamps, temperature samples, actual step completions, explicit delays, and baseline/final schedule timestamps.

The recipe `serve` anchor is the archive trigger. Repeated edits after service update the same entry rather than creating duplicates.

`js/journal-ui.js` renders compact `<details>` cards in the library. Cards expose target vs actual service, servings, completed steps, measurements, step timing history and recent temperature samples.

A served session is no longer presented as `CUISSON EN COURS` in the library.

## UI preferences
Visual preferences remain separate under `woodfire-companion-settings-v1`.

`js/settings.js` owns accent presets, native color picker, HEX/RGB input and reset to Woodfire orange.

## Planner V1
`js/planner.js` is a pure module with no DOM access.

The primary model is desired serving time + durations + dependencies + optional planning buffers + resources + actual completion timestamps + explicit runtime delays.

The engine works backwards for baseline planning. The Woodfire is one exclusive resource. Planned conflicts are resolved upstream; runtime conflicts move unfinished work when necessary.

Planner V1 supports dependency-only recipes with no fixed offsets, midnight crossing, buffer absorption, actual-completion propagation and service slippage when reality can no longer meet the target.

## Active-cook replanning
Checking a task complete stores its actual timestamp, saves state, rebuilds the schedule using `actualCompletionTimes`, and rerenders remaining actions.

The +5/+10/+15 controls delay only the next unfinished step using `addStepDelay()`. Planner V1 decides what downstream work truly moves.

Completed timestamps remain historical facts.

## Temperature tracking
Manual logging remains fast and independent. A measurement records timestamp, °C value and source.

No ETA is currently inferred from temperature slope and no step is automatically completed from a sample.

## PWA/offline
The service worker uses a versioned network-first cache with offline fallback.

Current dev version: `0.3.0-dev.4`.

Cached assets include the shell, recipe/planner/settings/shopping/journal modules, CSS, library manifest, current recipe JSON, manifest and icons.

Assets must remain compatible with the `/woodfire-companion/` GitHub Pages subpath and installed iPhone/Safari PWA behavior.

## Testing and CI
Run:

```bash
npm test
```

GitHub Actions runs the suite on `main`, feature pushes and pull requests.

Coverage includes recipe validation/scaling, library resolution, shopping/pre-cook, version consistency, DOM contracts, dependency planner behavior, resource conflicts, buffer/service slippage, actual completion propagation, active-cook wiring, journal serialization/upsert/removal and session/journal integration.

## Target architecture
Keep four primary layers separate:
1. recipe/content data;
2. pure/testable planning engine;
3. session state + persistence/migrations;
4. UI.

Independent local settings/shopping/journal stores may remain separate when their lifecycles differ from the active session.

## Current technical debt / next work
1. Add at least one second complete executable recipe to validate planner/schema generality.
2. Add structured observation/recheck controls for uncertain cooks.
3. Add a flexible planning-window concept when a real recipe demonstrates the need; sauce prep currently uses a pre-service anchor.
4. Reduce scaling-sensitive quantities duplicated inside step prose by referencing structured ingredient usage where useful.
5. Add journal notes/rating and JSON backup/import when useful.
6. Replace temporary CSS/emoji covers with local illustrated assets when visual direction is finalized.
7. Add richer resources such as user attention only when real meal plans demonstrate the need.
8. Add predictive ETA later from temperature/history with uncertainty, never false precision.
