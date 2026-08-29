# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is a zero-backend static PWA intended for GitHub Pages and iPhone/Safari installation.

The application uses vanilla HTML/CSS/JavaScript with native ES modules. No runtime framework, backend or external API is required.

Current structure after the recipe-library/configuration and UI-settings increments:

```text
woodfire-companion/
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── service-worker.js
├── package.json
├── js/
│   ├── library.js
│   ├── planner.js
│   ├── recipe.js
│   ├── recipe-loader.js
│   └── settings.js
├── recipes/
│   ├── index.json
│   └── pork-belly-burnt-ends.json
├── tests/
│   ├── library.test.js
│   ├── planner.test.js
│   ├── recipe.test.js
│   ├── ui-contract.test.js
│   └── version.test.js
├── sources/
└── icons/
```

## Application flow
The UI has three top-level views:

1. `library` — browse recipe cards and resume an existing cook;
2. `recipe` — review recipe metadata/components/ingredients, select servings and 24-hour serving time;
3. `cook` — active planning + temperature tracking interface.

The existing cook state remains local-first and can be resumed after navigating back to the library or reloading the PWA.

## Recipe library
`recipes/index.json` is the library manifest.

Each entry currently provides:
- stable id;
- availability status;
- recipe URL when executable;
- title/description;
- tags and basic metadata;
- lightweight offline visual theme information.

`js/library.js` validates and loads this manifest and resolves entries by id.

The first library intentionally exposes only the Pork Belly meal as executable. Additional familiar meals may appear as `coming_soon` cards, but they should not become executable until a complete validated recipe JSON exists. Do not invent incomplete recipe data merely to populate the library.

## Current recipe/content layer
Canonical executable recipe:

`recipes/pork-belly-burnt-ends.json`

The current content version is `2`. Version 2 keeps the same schema/planning structure while replacing user-facing `to taste` quantities in the reference ingredient overview with practical indicative quantities/ranges and explicit split guidance in preparation notes.

The JSON expresses:
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

Exact recipe semantics are documented in `sources/RECIPE_SCHEMA_V1.md`.

`js/recipe.js` provides:
- recipe validation;
- serving scaling;
- Woodfire summary formatting.

`js/recipe-loader.js` fetches and validates recipe JSON before the UI consumes it.

## Serving configuration
Ingredient scaling is user-visible on the recipe page.

The selected serving count:
- is constrained to the recipe-supported min/max range;
- updates displayed ingredient quantities immediately;
- is saved into the active cook session when cooking starts.

The serving-time selector is implemented with explicit hour/minute controls so the UI remains unambiguously 24-hour regardless of browser locale. Its option contrast is explicitly styled for dark-mode browsers that otherwise render a white native menu with inherited light text.

Starting a configured cook resets checklist/temperature state only after confirmation when an existing cook has progress. Navigating away from an active cook does not destroy it.

## Current cook-session state model
The app still uses the existing `localStorage` key:

`woodfire-companion-v1`

This remains intentional so architecture/UI iterations do not discard the existing POC state.

Logical fields now include:
- `view`;
- `mealTime`;
- `servings`;
- `completed`;
- `taskShifts`;
- `temperatureTarget`;
- `measurements`;
- `cookStartedAt`;
- `activeTab`;
- `recipeId`;
- `recipeVersion`;
- `activeRecipeUrl`.

Old records without the newer fields remain readable because defaults are merged during load. Legacy records containing actual cook progress default to the cook view on first load so a refresh does not strand an active cook in the library.

When this schema evolves further, preserve existing user data where practical through migration rather than silently discarding it.

## UI preferences
Visual preferences are deliberately stored separately from cook-session state under:

`woodfire-companion-settings-v1`

`js/settings.js` currently owns the accent-color preference. The settings dialog supports:
- curated preset swatches;
- native manual color picker;
- HEX input;
- RGB input;
- reset to the default Woodfire orange.

All controls remain synchronized and the selected accent is applied through CSS custom properties. Derived strong/soft/border accent variants use CSS `color-mix()`, which keeps the application palette coherent without storing several redundant color values.

Resetting or starting a cook does not alter UI preferences.

## Planning engine
`js/planner.js` remains a pure module with no DOM access.

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
Actual placement still starts from:

`plan.preferredStartOffsetMin`

These offsets are recipe data rather than UI logic, and the same steps also carry dependencies/resources/durations. The next planner iteration should derive more of the schedule from those constraints instead of treating preferred offsets as the primary placement mechanism.

The library/configuration increment deliberately does not mix this planner semantic change into navigation/UI work.

## Active-cook UI
The cook view retains:
- planned checklist cards;
- expandable detail;
- structured Woodfire configuration;
- completion timestamps;
- next-action countdown;
- legacy +5/+10/+15 global unfinished-task shift;
- manual temperature logging;
- target temperature;
- graph/history;
- CSV export.

The selected serving count is currently informational once the cook starts; step prose is still authored against the reference recipe quantities. Future recipe rendering should progressively use ingredient references rather than embedding quantities in prose where that matters for scaling.

## Visual library approach
The first library uses local CSS/Unicode visual covers instead of network-hosted images. This is intentional for offline reliability while the UI flow is validated.

The schema already retains `heroImage` capability. Local illustrated image assets can replace the temporary visual themes later without changing recipe/planner semantics.

The global accent color is independent from per-recipe hero-cover themes: changing the accent should affect controls, active states and timing emphasis without recoloring recipe imagery.

## PWA/offline behavior
The service worker uses a versioned cache and network-first reads while online, with cached fallback offline.

It caches:
- shell HTML/CSS/JS;
- library/planner/recipe/settings modules;
- recipe-library manifest;
- current executable recipe JSON;
- manifest/icons.

Constraints:
- assets must work from the `/woodfire-companion/` GitHub Pages subpath;
- offline fallback must not depend on server route rewrites;
- iOS/Safari installed-PWA behavior remains a target use case.

## Testing
The repository uses Node's built-in test runner with no package dependency.

Run:

```bash
npm test
```

Existing tests cover recipe validation/scaling and planner behavior. UI/library tests additionally cover:
- library-manifest validation;
- resolution of the active recipe from the manifest;
- consistency of the development version marker;
- static DOM ids referenced by both `app.js` and `js/settings.js` existing in `index.html`;
- the reference recipe exposing an indicative quantity/range for every displayed ingredient.

Future tests should add:
- generated placement from dependencies/resources rather than hints;
- flexible windows/buffers;
- completed-task replanning behavior;
- multiple executable recipes;
- storage migrations;
- shopping-list aggregation.

## Target architecture
Continue maintaining four conceptual layers:

### 1. Recipe/content data
Static structured library + recipes/components.

### 2. Planning engine
Pure/testable scheduling, dependencies, resource conflicts and replanning.

### 3. Session/state layer
Active recipe/version, servings, target time, actual completion, temperatures, notes and persistence/migrations.

### 4. UI layer
Library/configuration/active-cook rendering and user interactions only; no recipe-specific scheduling rules.

UI preferences may remain a small separate local settings layer while they are independent from cook-session semantics.

## Current technical debt / next work
1. Implement consolidated shopping-list generation/display from scaled ingredients.
2. Replace preferred-start offsets progressively with dependency/resource-aware schedule generation.
3. Replace the legacy global delay buttons with dependency-aware replanning behavior.
4. Add at least one second complete executable recipe to validate schema generality.
5. Replace temporary CSS/emoji covers with local illustrated assets when the library visual direction is accepted.
6. Reduce duplicated/scaling-sensitive ingredient quantities embedded in step prose.
7. Evolve `localStorage` from one active POC-style session toward explicit schema versioning and cook journal/history.
8. Activate observation-driven rechecks represented in recipe data.

These are intended increments, not reasons to re-couple recipe, planner and UI logic.
