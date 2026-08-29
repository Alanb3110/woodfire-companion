# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is a zero-backend static PWA intended for GitHub Pages and iPhone/Safari installation.

The application uses vanilla HTML/CSS/JavaScript with native ES modules. No runtime framework, backend or external API is required.

Current conceptual layers remain:
1. recipe/content data;
2. pure/testable planning engine;
3. session state + persistence/migrations;
4. UI.

Independent local settings, shopping and journal stores may remain separate when their lifecycles differ from the active session.

## Application flow
The UI has three top-level views:
1. `library` — recipes, active-cook resume card and local cook journal;
2. `recipe` — servings/service time plus ingredients/courses/preparation/equipment;
3. `cook` — active planning + temperature tracking.

State remains local-first/offline.

## Recipe/content layer
`recipes/index.json` is the library manifest. Only complete validated recipes may be marked `available`.

Executable meals now include:
- `recipes/pork-belly-burnt-ends.json`, content version 4;
- `recipes/sweet-savory-turkey-zucchini-gratin.json`, content version 2.

The Pork Belly meal remains the long-cook reference. The turkey + zucchini-gratin meal is the first genuinely different multi-recipe case: a temperature-driven poultry cook on the Woodfire runs in parallel with a conventional-oven side dish and both chains converge on one service milestone.

`js/recipe.js` owns recipe validation, ingredient scaling and Woodfire summary formatting. Validation protects serving bounds, component ownership, duration ranges, completion/recheck semantics, dependency connectivity, service milestones and Woodfire configuration consistency.

`js/recipe-loader.js` loads and validates executable JSON content before UI use.

Every `available` recipe is covered by the generic CI contract in `sources/MULTI_RECIPE_CONTRACT.md`.

Relevant source contracts:
- `sources/RECIPE_SCHEMA_V1.md`;
- `sources/SHOPPING_PREP.md`;
- `sources/PLANNER_V1.md`;
- `sources/ACTIVE_COOK_V1.md`;
- `sources/COOK_JOURNAL_V1.md`;
- `sources/MULTI_RECIPE_CONTRACT.md`;
- `sources/TURKEY_ZUCCHINI_MEAL.md`.

## Multi-recipe acceptance
Tests must not enumerate executable recipe ids in the generic acceptance contract.

For each manifest entry with `status: "available"`, CI verifies recipe loading/validation, manifest identity, serving metadata, scaling/shopping at min/reference/max, complete schedule generation, dependency validity, baseline Woodfire conflict freedom and an unambiguous service milestone.

Individual recipes may also have regression tests when an established reference timeline is useful. The turkey meal locks its known 20:30 reference sequence separately from the generic contract.

Planner V1 does not yet create additional batches from serving count. Until batching/capacity semantics exist, each recipe's `servings.max` must stay within a quantity that can use the same declared execution structure.

## Serving configuration and pre-cook
Changing servings updates the same scaled data used by the user-facing `Ingrédients & courses` checklist.

`js/shopping.js` is pure data logic. `js/prep-ui.js` owns pre-cook rendering and shopping checkbox persistence.

Shopping state uses `woodfire-companion-shopping-v1` and is independent from cook history, active progress and visual settings.

Components currently provide grouping inside one meal JSON; they are not yet independently swappable modules and shopping does not yet aggregate external component files.

## Cook-session state
Active cook state remains under `woodfire-companion-v1`.

Logical fields include `view`, `mealTime`, `servings`, `completed`, `taskShifts`, `temperatureTarget`, `measurements`, `cookStartedAt`, `sessionId`, `sessionStartedAt`, `sessionServedAt`, `targetServingAt`, `activeTab`, `recipeId`, `recipeVersion` and `activeRecipeUrl`.

`sessionId` remains stable for one meal. `targetServingAt` stores an absolute date/time so a resumed cook does not silently move to another calendar day.

Older active records without newer fields remain readable; compatible metadata is created from existing progress where possible.

`completed[stepId]` stores actual completion timestamps. `taskShifts[stepId]` stores explicit manual delay attached to a step.

## Cook Journal V1
Completed meal sessions are stored separately under `woodfire-companion-journal-v1` with an explicit journal schema version.

`js/journal.js` owns journal serialization/store and service-milestone resolution. A recipe may define an explicit `serviceStepId`; otherwise exactly one zero-offset `serve` anchor can act as the real service milestone. Tasks merely positioned relative to `serve` are not treated as the meal-service event.

A journal entry includes recipe identity/version/title, servings, target/actual service timestamps, temperature samples, actual step completions, explicit delays, and baseline/final schedule timestamps.

`js/journal-ui.js` renders compact history cards in the library. A served session is no longer presented as `CUISSON EN COURS`.

## UI preferences
Visual preferences remain separate under `woodfire-companion-settings-v1`.

`js/settings.js` owns accent presets, native color picker, HEX/RGB input and reset to Woodfire orange.

## Planner V1
`js/planner.js` is the low-level pure scheduling solver with no DOM access.

`js/meal-planner.js` is the stable recipe-facing facade. `buildMealSchedule(recipe, context)` accepts servings, service time or absolute target timestamp, runtime delays and actual completions, while reserving configuration space for future selected components and variants.

The solver's primary model remains desired serving time + durations + dependencies + optional planning buffers + resources + actual completion timestamps + explicit runtime delays.

The engine works backwards for baseline planning. The Woodfire is one exclusive resource. Planned Woodfire conflicts are resolved upstream; runtime conflicts move unfinished work when necessary. Other resources such as `oven`, `stovetop`, `fridge` and `passive` can be declared and run concurrently, but are not yet automatically conflict-resolved.

Planner V1 supports dependency-only recipes with no fixed offsets, midnight crossing, buffer absorption, actual-completion propagation and service slippage when reality can no longer meet the target.

Serving count is carried through the meal-plan context but does not yet modify durations or synthesize batches.

## Active-cook replanning
Checking a task complete stores its actual timestamp, saves state, rebuilds the schedule using `actualCompletionTimes`, and rerenders remaining actions.

The +5/+10/+15 controls delay only the next unfinished step using `addStepDelay()`. Planner V1 decides what downstream work truly moves. Completed timestamps remain historical facts.

## Temperature tracking
Manual logging remains fast and independent. A measurement records timestamp, °C value and source.

Both current executable recipes benefit from temperature logging, although the role differs: Pork Belly uses temperature as supporting information for a tenderness-driven cook, while the turkey meal uses a 74 °C core target as the decisive endpoint.

No ETA is currently inferred from temperature slope and no step is automatically completed from a sample.

## PWA/offline
The service worker uses a network-first cache with offline fallback.

Current dev version: `0.3.0-dev.4`.

Static shell/modules are listed in `APP_ASSETS`, including the meal-planner facade. Executable recipe JSON is discovered from `recipes/index.json` and preloaded automatically for every `available` entry.

`recipes/index.json` is therefore the source of truth for recipe discovery and recipe-JSON offline preloading. A service-worker file change accompanied the second executable recipe so existing installations ran the install/preload path again.

Assets must remain compatible with the `/woodfire-companion/` GitHub Pages subpath and installed iPhone/Safari PWA behavior.

## Testing and CI
Run:

```bash
npm test
```

GitHub Actions runs the suite on `main`, feature pushes and pull requests.

Coverage includes hardened recipe-contract fixtures, generic available-recipe acceptance, recipe-specific reference timelines where useful, library resolution, shopping/pre-cook, manifest-driven offline caching, version consistency, DOM contracts, dependency planner behavior, resource conflicts, buffer/service slippage, actual completion propagation, active-cook wiring, journal serialization/upsert/removal, service-milestone resolution and session/journal integration.

## Current technical debt / next work
1. Derive the recipe-page recommended start time from `buildMealSchedule()` rather than `timing.elapsedRangeMin`.
2. Add structured observation/recheck controls for uncertain cooks so completion state can drive replanning directly.
3. Reduce scaling-sensitive quantities duplicated inside step prose by referencing structured ingredient usage where useful.
4. Make temperature tracking explicitly optional before adding recipes that do not benefit from core-temperature logging.
5. Add a flexible planning-window concept when a real recipe demonstrates the need.
6. Extend resource conflict handling beyond Woodfire only when real meals demonstrate a shared-resource collision.
7. Add journal notes/rating and JSON backup/import when useful.
8. Replace temporary CSS/emoji covers with local illustrated assets when visual direction is finalized.
9. Add richer resources such as user attention only when real meal plans demonstrate the need.
10. Add predictive ETA later from temperature/history with uncertainty, never false precision.
