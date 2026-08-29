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
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── package.json
├── .github/workflows/tests.yml
├── js/
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
1. `library` — browse recipe cards and resume an existing cook;
2. `recipe` — configure servings/service time and review ingredients/courses/preparation/equipment;
3. `cook` — active planning + temperature tracking.

State is local-first and an active cook can be resumed after navigation or reload.

## Recipe/content layer
`recipes/index.json` is the library manifest. Only complete validated recipes may be executable.

Canonical executable recipe:

`recipes/pork-belly-burnt-ends.json`

The current content version is `4`.

Version 4 is the first reference content version fully scheduled from explicit planner semantics. It contains no `preferredStartOffsetMin` fields. The established 20:00 baseline is reproduced from:
- `eat` serving anchor;
- durations and hard dependencies;
- a 35 min uncertainty buffer after the first pork tenderness check;
- a 25 min readiness buffer between potato prep and Woodfire Air Fry;
- one independent sauce-prep anchor before service.

`js/recipe.js` provides validation, serving scaling and Woodfire summary formatting. It validates serving anchors, planning buffers, dependencies and optional legacy timing fallback for older recipes.

See:
- `sources/RECIPE_SCHEMA_V1.md`;
- `sources/SHOPPING_PREP.md`;
- `sources/PLANNER_V1.md`;
- `sources/ACTIVE_COOK_V1.md`.

## Serving configuration and pre-cook
Changing servings updates the same scaled ingredient data used by the user-facing `Ingrédients & courses` checklist.

`js/shopping.js` is a pure helper for categorized ingredients, consumables, reusable equipment, advance-prep records and item counts.

`js/prep-ui.js` owns shopping/pre-cook rendering and checkbox persistence.

Shopping state uses:

`woodfire-companion-shopping-v1`

It is independent from cook completion, temperatures and visual settings.

## Cook-session state
Active cook state remains under:

`woodfire-companion-v1`

Logical fields include `view`, `mealTime`, `servings`, `completed`, `taskShifts`, `temperatureTarget`, `measurements`, `cookStartedAt`, `activeTab`, `recipeId`, `recipeVersion` and `activeRecipeUrl`.

`completed[stepId]` stores the actual completion timestamp. `taskShifts[stepId]` stores an explicit manual delay attached to that step.

Older records remain readable because defaults are merged during load. Future state-schema changes should use explicit migration rather than silently dropping local cook history.

## UI preferences
Visual preferences use the separate key:

`woodfire-companion-settings-v1`

`js/settings.js` owns accent color presets, native color picker, HEX/RGB input and reset to Woodfire orange.

## Planner V1
`js/planner.js` is a pure module with no DOM access.

The primary planning model is:
- desired serving time as a `serve` anchor;
- step durations;
- dependency graph;
- optional planning buffers;
- resource constraints;
- real completion timestamps and explicit runtime delays.

The engine works backwards for the baseline plan. The Woodfire is treated as one exclusive resource; planned conflicts are resolved upstream so the requested serving time remains the baseline target.

`preferredStartOffsetMin` remains supported only for older recipe compatibility. New curated recipe content should use anchors/dependencies/buffers/resources instead.

Planner V1 can:
- derive a schedule without fixed offsets;
- cross midnight correctly;
- place prerequisites from dependency relations;
- reserve absorbable `planningBufferMin` margin;
- resolve baseline Woodfire conflicts backwards;
- apply actual completion timestamps;
- move unfinished downstream work only when hard constraints require it;
- allow service time to slip when the real cook can no longer meet the target feasibly.

## Active-cook replanning
The active checklist is connected to Planner V1.

When a task is checked complete:
1. the current timestamp is stored in `state.completed`;
2. state is saved;
3. `buildSchedule()` is called with `actualCompletionTimes: state.completed`;
4. the remaining cards/countdown are rerendered from the feasible schedule.

Completed timestamps are historical facts and are not shifted to make the plan look cleaner.

The +5/+10/+15 controls add a delay only to the current next unfinished step using `addStepDelay()`. Planner V1 then determines which downstream tasks actually need to move.

This means unrelated parallel work can remain unchanged, while a dependency or Woodfire conflict propagates delay when necessary.

Unchecking a completed task removes its actual completion timestamp and recomputes from the remaining facts.

## Active-cook UI
The current layout provides checklist cards, expandable detail, structured Woodfire configuration, actual completion timestamps, next-action countdown, next-step delay controls, manual temperature logging, target temperature, graph/history and CSV export.

Structured observation controls and automatic rechecks are later work.

## Temperature tracking
Manual logging remains independent and fast. A measurement records timestamp, temperature and source.

No ETA is currently inferred from temperature slope and no recipe step is automatically completed from a temperature sample.

## PWA/offline
The service worker uses a versioned cache and network-first reads while online, with cached fallback offline.

Current dev version: `0.3.0-dev.3`.

Assets must remain compatible with the `/woodfire-companion/` GitHub Pages subpath and installed iOS/Safari PWA behavior.

## Testing and CI
The repository uses Node's built-in test runner with no runtime package dependency:

```bash
npm test
```

GitHub Actions runs the suite on `main`, feature pushes and pull requests.

Tests cover recipe validation/scaling, library resolution, shopping/pre-cook generation, PWA version consistency, UI contracts, dependency-only planning, midnight crossing, Woodfire resource conflicts, planning-buffer absorption/service slippage, actual completion propagation, active-cook wiring and next-step-only manual delays.

Reference-recipe tests additionally enforce:
- zero `preferredStartOffsetMin` fields;
- explicit 35 min pork uncertainty buffer;
- explicit 25 min potato readiness buffer;
- preservation of the established baseline schedule.

## Target architecture
Keep four primary layers separate:
1. recipe/content data;
2. pure/testable planning engine;
3. session state + persistence/migrations;
4. UI.

Independent local UI/shopping settings may remain outside cook-session state when they have different lifecycles.

## Current technical debt / next work
1. Add at least one second complete executable recipe to validate planner/schema generality.
2. Add a true flexible planning-window concept when a real recipe demonstrates the need; the independent sauce task currently uses an explicit pre-service anchor.
3. Reduce scaling-sensitive quantities duplicated inside step prose by referencing structured ingredient usage where useful.
4. Add structured observation/recheck controls for uncertain cooks.
5. Add cook-session journal/history with explicit storage schema/versioning.
6. Replace temporary CSS/emoji covers with local illustrated assets when the visual direction is finalized.
7. Add richer resources such as user attention only when real meal plans demonstrate the need.
8. Add predictive ETA later from temperature/history with uncertainty, never false precision.
