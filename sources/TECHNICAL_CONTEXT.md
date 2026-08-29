# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is a zero-backend static PWA intended for GitHub Pages and iPhone/Safari installation.

The application uses vanilla HTML/CSS/JavaScript with native ES modules. No runtime framework, backend or external API is required.

Current structure after the recipe-schema V1 refactor:

```text
woodfire-companion/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── package.json
├── js/
│   ├── planner.js
│   ├── recipe.js
│   └── recipe-loader.js
├── recipes/
│   └── pork-belly-burnt-ends.json
├── tests/
│   ├── planner.test.js
│   └── recipe.test.js
├── sources/
└── icons/
```

## Current state model
The POC still uses the existing `localStorage` key:

`woodfire-companion-v1`

This is intentional so the first architecture refactor does not destroy existing local cook/temperature state.

Logical fields include:
- `mealTime`;
- `completed`;
- `taskShifts`;
- `temperatureTarget`;
- `measurements`;
- `cookStartedAt`;
- `activeTab`;
- `recipeId`;
- `recipeVersion`.

Old records without the two recipe fields remain readable because defaults are merged during load.

When this schema evolves further, preserve existing user data where practical through migration rather than silently discarding it.

## Recipe/content layer
The demo meal is no longer embedded in `app.js`.

Canonical reference recipe:

`recipes/pork-belly-burnt-ends.json`

The JSON currently expresses:
- recipe/content version;
- metadata and servings;
- meal components;
- ingredients and scaling rules;
- equipment;
- executable steps;
- nominal durations/ranges;
- dependency relationships;
- resource reservations;
- structured Woodfire configuration;
- completion/recheck semantics;
- temporary V1 preferred-start planning hints.

Exact V1 semantics are documented in `sources/RECIPE_SCHEMA_V1.md`.

`js/recipe.js` provides:
- recipe validation;
- serving scaling;
- Woodfire summary formatting.

`js/recipe-loader.js` fetches and validates recipe JSON before the UI consumes it.

## Planning engine
`js/planner.js` is a pure module with no DOM access.

It currently provides:
- target serving-time conversion;
- schedule generation from V1 preferred-start hints;
- duration handling;
- dependency-order validation;
- Woodfire resource-conflict detection;
- downstream dependency traversal;
- dependency-aware shift primitives;
- next-task selection.

### Important V1 limitation
The first refactor deliberately reproduces the POC timeline before changing planning behavior.

Actual placement still starts from:

`plan.preferredStartOffsetMin`

These offsets are now recipe data rather than UI logic, and the same steps also carry dependencies/resources/durations. The next planner iteration should derive more of the schedule from those constraints instead of treating preferred offsets as the primary placement mechanism.

This migration strategy gives a stable behavioral baseline while separating architecture.

## UI layer
`app.js` now:
- loads the external recipe;
- requests a schedule from the planner;
- renders the existing checklist UI;
- displays structured Woodfire configuration;
- maintains current checklist state;
- retains fast temperature logging/chart/export behavior.

The recipe is no longer a JavaScript object defined inside `app.js`.

The first refactor intentionally avoids a broad visual redesign so architecture and behavior changes can be reviewed separately.

## PWA/offline behavior
`service-worker.js` caches:
- shell HTML/CSS/JS;
- planner/recipe modules;
- current recipe JSON;
- manifest/icons.

The cache version was advanced when modules/recipe assets were introduced.

Constraints:
- assets must work from the `/woodfire-companion/` GitHub Pages subpath;
- offline fallback must not depend on server route rewrites;
- iOS/Safari installed-PWA behavior remains a target use case.

## Testing
The repository now uses Node's built-in test runner with no package dependency.

Run:

```bash
npm test
```

Initial tests cover:
- reference recipe validation;
- representative serving scaling;
- baseline 20:00 POC schedule reproduction;
- planning across midnight;
- declared dependency order;
- absence of overlapping Woodfire reservations in the reference plan;
- downstream dependency traversal/shift behavior.

Future tests should add:
- generated placement from dependencies/resources rather than hints;
- flexible windows/buffers;
- completed-task replanning behavior;
- multiple recipes;
- storage migrations;
- shopping-list aggregation.

## Target architecture
Continue maintaining four conceptual layers:

### 1. Recipe/content data
Static structured recipes/components.

### 2. Planning engine
Pure/testable scheduling, dependencies, resource conflicts and replanning.

### 3. Session/state layer
Active recipe/version, servings, target time, actual completion, temperatures, notes and persistence/migrations.

### 4. UI layer
Rendering and user interactions only; no recipe-specific scheduling rules.

## Storage direction
Near term:
- keep active state local;
- introduce explicit storage schema versioning when multi-recipe/session history requires it;
- add export/import JSON before cloud sync;
- retain CSV temperature export where useful.

IndexedDB may later be preferable for a cook journal/history, but only when actual data complexity justifies migration from `localStorage`.

## Git workflow
Use small focused branches/PRs for meaningful changes.

Do not mix major planner refactors and broad visual redesigns unnecessarily.

Documentation should make clear whether a change affects:
- recipe data/schema;
- planner semantics;
- storage/session model;
- UI only.

## Current technical debt / next work
1. V1 planner still uses preferred-start offsets as its primary placement baseline.
2. UI delay buttons still perform the legacy global unfinished-task shift even though dependency-aware primitives now exist.
3. Only one recipe is in the structured library, so schema generality still needs validation with additional meals.
4. Serving scaling exists in code but is not exposed in the UI yet.
5. Shopping-list aggregation/display is not implemented yet.
6. `localStorage` still models one active POC-style session rather than a multi-session journal.
7. Observation-driven rechecks are represented in recipe data but not active-cook UI behavior yet.

These are the intended next increments, not reasons to re-couple recipe/planner logic into `app.js`.
