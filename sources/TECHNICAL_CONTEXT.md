# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is a zero-backend static PWA intended for GitHub Pages and iPhone/Safari installation.

The application uses vanilla HTML/CSS/JavaScript with native ES modules. No runtime framework, backend or external API is required.

Current structure after the recipe-library/configuration, UI-settings and shopping/pre-cook increments:

```text
woodfire-companion/
├── index.html
├── styles.css
├── prep.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── package.json
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
2. `recipe` — review recipe metadata/components/ingredients, select servings and serving time, check shopping/preparation/equipment;
3. `cook` — active planning + temperature tracking interface.

The existing cook state remains local-first and can be resumed after navigating back to the library or reloading the PWA.

## Recipe library
`recipes/index.json` is the library manifest.

Each entry currently provides stable id, availability status, recipe URL when executable, title/description, tags/basic metadata and lightweight offline visual theme information.

`js/library.js` validates and loads this manifest and resolves entries by id.

Only the Pork Belly meal is currently executable. `coming_soon` cards must not become executable until a complete validated recipe JSON exists.

## Current recipe/content layer
Canonical executable recipe:

`recipes/pork-belly-burnt-ends.json`

The current content version is `3`.

Version 3 retains the same planning steps while adding pre-cook semantics:
- recipe-specific consumable declaration for Woodfire pellets;
- reusable equipment vs consumable distinction;
- `advancePrep` guidance for work that may be done before the active timeline.

The JSON also retains the version-2 indicative ingredient quantities/ranges used for scaling and shopping display.

`js/recipe.js` provides recipe validation, serving scaling and Woodfire summary formatting. Validation now also checks unique/valid equipment declarations and optional `advancePrep` records.

`js/recipe-loader.js` fetches and validates recipe JSON before the UI consumes it.

Exact V1 recipe semantics remain documented in `sources/RECIPE_SCHEMA_V1.md`; shopping/pre-cook semantics are documented in `sources/SHOPPING_PREP.md`.

## Serving configuration
Ingredient scaling is user-visible on the recipe page.

The selected serving count:
- is constrained to the recipe-supported min/max range;
- updates ingredient quantities immediately;
- updates the shopping list from the same scaled data;
- is saved into the active cook session when cooking starts.

The serving-time selector uses explicit hour/minute controls so the UI remains unambiguously 24-hour regardless of browser locale.

## Shopping/pre-cook layer
`js/shopping.js` is a pure data helper layered on recipe scaling.

It currently provides:
- shopping groups from scaled ingredients;
- practical category ordering/labels;
- recipe-specific consumables;
- required reusable equipment;
- advance-prep records;
- shopping-item counts.

`js/prep-ui.js` owns pre-cook rendering and shopping-list checkbox persistence. It does not alter planner placement.

Shopping state uses a separate localStorage namespace:

`woodfire-companion-shopping-v1`

It is keyed by recipe id and shopping-item id. Changing servings updates quantities while keeping checked identities when ids are unchanged. Resetting the shopping list does not touch cook progress, temperature samples or UI settings.

The recipe page now exposes:
- scaled ingredient overview;
- categorized shopping checklist;
- progress count + explicit reset;
- advance-preparation guidance;
- reusable equipment/accessory checklist;
- recommended start-time hint;
- final `Démarrer la cuisson` action after pre-cook information.

## Current cook-session state model
The active cook still uses:

`woodfire-companion-v1`

Logical fields include `view`, `mealTime`, `servings`, `completed`, `taskShifts`, `temperatureTarget`, `measurements`, `cookStartedAt`, `activeTab`, `recipeId`, `recipeVersion` and `activeRecipeUrl`.

Old records without newer fields remain readable because defaults are merged during load.

## UI preferences
Visual preferences remain separate from cook-session state under:

`woodfire-companion-settings-v1`

`js/settings.js` owns the accent-color preference. The settings dialog supports curated presets, native color picker, HEX, RGB and reset to Woodfire orange.

## Planning engine
`js/planner.js` remains a pure module with no DOM access.

It currently provides target serving-time conversion, schedule generation from V1 preferred-start hints, duration handling, dependency-order validation, Woodfire resource-conflict detection, downstream dependency traversal, dependency-aware shift primitives and next-task selection.

### Important V1 limitation
Actual placement still starts from:

`plan.preferredStartOffsetMin`

These offsets are recipe data rather than UI logic, but remain the primary placement baseline. The next planner iteration should derive placement from dependencies, durations, resource constraints, buffers and serving time.

Shopping/pre-cook work deliberately does not change planner semantics.

## Active-cook UI
The cook view retains planned checklist cards, expandable detail, structured Woodfire configuration, completion timestamps, next-action countdown, legacy +5/+10/+15 unfinished-task shift, manual temperature logging, target temperature, graph/history and CSV export.

The selected serving count is informational once cooking starts; some step prose still embeds reference quantities and should progressively move toward data references where scaling matters.

## PWA/offline behavior
The service worker uses a versioned cache and network-first reads while online, with cached fallback offline.

The current dev version is `0.3.0-dev.3`.

Cached assets now include:
- shell HTML/CSS/JS;
- `prep.css`;
- library/planner/recipe/settings/shopping/prep UI modules;
- recipe-library manifest;
- current executable recipe JSON;
- manifest/icons.

Assets must remain compatible with the `/woodfire-companion/` GitHub Pages subpath and installed iOS/Safari PWA behavior.

## Testing
The repository uses Node's built-in test runner with no package dependency.

Run:

```bash
npm test
```

Tests cover recipe validation/scaling, planner behavior, library manifest/resolution, development-version consistency, UI DOM contracts and reference ingredient quantities.

Shopping tests additionally cover:
- category grouping from scaled ingredients;
- scaled quantities in shopping output;
- inclusion of recipe-specific consumables;
- exclusion of consumables from reusable equipment;
- exposure of advance-prep records.

The UI contract includes DOM ids referenced by `app.js`, `js/settings.js` and `js/prep-ui.js`.

## Target architecture
Continue maintaining four conceptual layers:

### 1. Recipe/content data
Static structured library + recipes/components.

### 2. Planning engine
Pure/testable scheduling, dependencies, resource conflicts and replanning.

### 3. Session/state layer
Active recipe/version, servings, target time, actual completion, temperatures, notes and persistence/migrations.

### 4. UI layer
Library/configuration/pre-cook/active-cook rendering and user interactions only; no recipe-specific scheduling rules.

Small independent local settings such as UI accent and shopping checks may remain separate from cook-session state.

## Current technical debt / next work
1. Replace preferred-start offsets progressively with dependency/resource-aware schedule generation.
2. Replace the legacy global delay buttons with dependency-aware replanning behavior.
3. Add at least one second complete executable recipe to validate schema generality and shopping aggregation assumptions.
4. Replace temporary CSS/emoji covers with local illustrated assets when the library visual direction is accepted.
5. Reduce duplicated/scaling-sensitive ingredient quantities embedded in step prose.
6. Evolve `localStorage` from one active POC-style session toward explicit schema versioning and cook journal/history.
7. Activate observation-driven rechecks represented in recipe data.
8. Add true duplicate aggregation when reusable external components can contribute separate ingredient records.

These are intended increments, not reasons to re-couple recipe, planner and UI logic.
