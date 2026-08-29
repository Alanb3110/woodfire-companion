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
- `sources/OBSERVATIONS_V1.md`;
- `sources/SESSION_V2.md`;
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

## Cook-session state V2
The active-cook localStorage namespace remains `woodfire-companion-v1` for compatibility, but the stored object now has explicit `schemaVersion: 2`.

`js/session.js` owns default state, schema migration, lifecycle transitions and recipe snapshot helpers.

Key fields include `started`, `completed`, `taskShifts`, `observations`, `rechecks`, `temperatureTarget`, `measurements`, `sessionId`, `sessionStartedAt`, `sessionServedAt`, `targetServingAt`, recipe identity and `recipeSnapshot`.

Runtime step states are:
- upcoming — no actual start/completion;
- active — `started[stepId]` exists without `completed[stepId]`;
- done — `completed[stepId]` exists.

Legacy records without a schema version are migrated as v1 → v2. Existing completion timestamps are preserved and no historical starts are fabricated. `started` is initialised empty for legacy sessions.

`sessionId` remains stable for one meal. `targetServingAt` stores an absolute date/time so a resumed cook does not silently move to another calendar day.

A new cook stores a detached validated `recipeSnapshot`. Resume uses the snapshot first, so a repository recipe update cannot silently change a cook already in progress. Legacy sessions without a snapshot adopt the currently valid recipe once and then persist it.

See `sources/SESSION_V2.md`.

## Active observations / rechecks
`js/observations.js` is pure observation-state logic. It derives active-cook choices from existing Recipe Schema V1 completion/recheck semantics.

Current derived controls:
- tenderness: `Encore ferme / Presque prêt / Très tendre`;
- target-temperature/combined completion: `Sous X °C / Presque X °C / X °C atteint`;
- generic fallback: `Pas prêt / Presque prêt / Prêt`.

A not-ready observation records the observed state and a future `recheckDueAt`. If the step had not been started explicitly, the observation becomes its actual start. A ready observation records the actual completion timestamp.

The pending recheck timestamp is also passed to the planner as an expected completion time. Planner buffers may absorb it before downstream work moves.

## Cook Journal V1
Completed meal sessions are stored separately under `woodfire-companion-journal-v1` with an explicit journal schema version.

`js/journal.js` owns journal serialization/store and service-milestone resolution. A recipe may define an explicit `serviceStepId`; otherwise exactly one zero-offset `serve` anchor can act as the real service milestone. Tasks merely positioned relative to `serve` are not treated as the meal-service event.

A journal entry includes recipe identity/version/title, servings, target/actual service timestamps, temperature samples, structured observations, actual step starts/completions, explicit delays, and baseline/final schedule timestamps.

`started` is an additive Journal V1 field; old entries without it remain valid.

`js/journal-ui.js` renders compact history cards in the library. A served session is no longer presented as `CUISSON EN COURS`.

## UI preferences
Visual preferences remain separate under `woodfire-companion-settings-v1`.

`js/settings.js` owns accent presets, native color picker, HEX/RGB input and reset to Woodfire orange.

## Planner V1
`js/planner.js` is the low-level pure scheduling solver with no DOM access.

`js/meal-planner.js` is the stable recipe-facing facade. `buildMealSchedule(recipe, context)` accepts servings, service time or absolute target timestamp, runtime delays, actual start/completion timestamps and expected completion timestamps, while reserving configuration space for future selected components and variants.

The solver's primary model remains desired serving time + durations + dependencies + optional planning buffers + resources + runtime facts/expectations + explicit delays.

Baseline planning works backwards from service. The Woodfire is one exclusive resource. Planned Woodfire conflicts are resolved upstream; runtime conflicts move only work that remains movable. Started/completed timestamps are historical facts and are not shifted to make the plan tidy.

Other resources such as `oven`, `stovetop`, `fridge` and `passive` can be declared and run concurrently, but are not yet automatically conflict-resolved.

Planner V1 supports dependency-only recipes with no fixed offsets, midnight crossing, buffer absorption, actual-start/completion propagation, expected recheck completion and service slippage when reality can no longer meet the target.

Serving count is carried through the meal-plan context but does not yet modify durations or synthesize batches.

## Active-cook lifecycle
Timed steps now use two user actions: first tap starts the phase, second tap completes it. The checkbox uses its indeterminate visual state while active. Zero-duration milestones may complete in one tap.

The planning header exposes a distinct `EN COURS` card. If a Woodfire phase is active it is prioritised and shows its exact structured appliance state plus actual start and indicative end. Parallel work may remain active simultaneously.

The normal `PROCHAINE ÉTAPE` selector excludes already-started timed work; a pending observation recheck remains actionable and can still become the next action.

The +5/+10/+15 controls continue to apply only to the next actionable upcoming task, or to a pending recheck when that is the next action.

## Temperature tracking
Manual logging remains fast and independent. A measurement records timestamp, °C value and source.

Both current executable recipes benefit from temperature logging, although the role differs: Pork Belly uses temperature as supporting information for a tenderness-driven cook, while the turkey meal uses a 74 °C core target as the decisive endpoint.

Observation controls do not automatically infer readiness from a measurement; the cook explicitly confirms completion state.

No ETA is currently inferred from temperature slope.

## PWA/offline
The service worker uses a network-first cache with offline fallback.

Current dev version: `0.3.0-dev.6`.

Static shell/modules are listed in `APP_ASSETS`, including `js/session.js`, the meal-planner facade and observation modules. Executable recipe JSON is discovered from `recipes/index.json` and preloaded automatically for every `available` entry.

`recipes/index.json` remains the source of truth for recipe discovery and recipe-JSON offline preloading.

Assets must remain compatible with the `/woodfire-companion/` GitHub Pages subpath and installed iPhone/Safari PWA behavior.

## Testing and CI
Run:

```bash
npm test
```

GitHub Actions runs the suite on `main`, feature pushes and pull requests.

Coverage includes hardened recipe contracts, generic available-recipe acceptance, recipe-specific timelines, shopping/pre-cook, offline caching, version consistency, DOM contracts, dependency/resource planning, buffers/service slippage, actual start/completion propagation, session v1→v2 migration, step lifecycle transitions, frozen recipe snapshots, observation/recheck behavior, journal serialization and active-cook wiring.

## Current technical debt / next work
1. Derive the recipe-page recommended start time from `buildMealSchedule()` rather than `timing.elapsedRangeMin`.
2. Split additional session/active-cook/temperature orchestration out of the growing `app.js` without introducing a framework.
3. Strengthen generic recipe acceptance so an `available` recipe cannot expose only `au goût` quantities.
4. Key shopping checkbox persistence by recipe content version when useful.
5. Make temperature tracking explicitly optional before adding recipes that do not benefit from core-temperature logging.
6. Reduce scaling-sensitive quantities duplicated inside step prose by referencing structured ingredient usage where useful.
7. Add a flexible planning-window concept only when a real recipe demonstrates the need.
8. Extend conflict handling beyond Woodfire only when real meals demonstrate a shared-resource collision.
9. Add journal notes/rating and JSON backup/import when useful.
10. Add predictive ETA later from temperature/history with uncertainty, never false precision.
