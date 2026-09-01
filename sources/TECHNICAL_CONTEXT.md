# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is a zero-backend static PWA for GitHub Pages and installed iPhone/Safari use.

The application uses vanilla HTML/CSS/JavaScript with native ES modules. No runtime framework, backend, account system or external API is required.

Conceptual layers:
1. recipe/content data;
2. pure/testable planning engine;
3. session state + persistence/orchestration;
4. UI rendering/interactions.

Independent settings, shopping and journal stores remain separate when their lifecycles differ from the active cook.

## Application flow
Three top-level views remain:
1. `library` — illustrated recipes, active-cook resume, DEV test-cook tool and Cook Journal;
2. `recipe` — qualification, servings/service time, scaled ingredients, shopping/prep/equipment and planner-derived recommended start;
3. `cook` — active plan plus optional temperature tracking.

State is local-first and designed to remain usable offline once required assets are cached.

## Library and recipe qualification
`recipes/index.json` is the discovery manifest and currently contains 11 `available` executable meals.

Availability and culinary maturity are separate:
- `status: available` means the generic app pipeline can execute the recipe;
- `qualification` records real-cook maturity as `untested`, `test_cooked` or `validated`.

Current baseline:
- Pork Belly Burnt Ends — `validated` after a documented real-cook refinement loop;
- turkey + zucchini gratin — `test_cooked` from a real cooked/discussed baseline;
- smoked beef barbacoa — `test_cooked` from a real meal baseline;
- the eight recipes added during the 2026-08-31 expansion waves — `untested` until representative real cooks are recorded.

The library shows `À tester`, `Testée` or `Validée`; the recipe detail repeats the qualification. Qualification does not alter planner/session behavior.

See `sources/RECIPE_QUALIFICATION_V1.md`.

## Recipe/content layer
Executable content lives under `recipes/*.json`; recipe-specific timing/quantity rules must not be embedded in `app.js`.

`js/recipe.js` owns core recipe validation, ingredient scaling and Woodfire summary formatting.

`js/step-details.js` owns structured `step.ingredientUsage` validation and serving-aware materialization of `{{use:...}}` tokens. Top-level ingredients remain authoritative for shopping/pre-cook totals; per-step usage is instructional metadata.

`js/recipe-loader.js` loads and validates executable recipe content before UI use.

Every `available` recipe is covered by the generic CI contract in `sources/MULTI_RECIPE_CONTRACT.md`. Generic acceptance must not enumerate recipe ids.

## Current executable recipe set
The manifest currently exposes:
- Pork Belly Burnt Ends;
- roulé de dinde sucré-salé + gratin de courgettes;
- tacos barbacoa de bœuf fumée;
- saumon laqué soja-miel + asperges + riz citronné;
- poulet shawarma fumé + pommes de terre + sauce yaourt;
- bœuf reverse-sear + grenailles + sauce poivre;
- wings miel-soja fumées + potatoes + coleslaw;
- magret laqué miel-soja-orange + patate douce + sauce agrumes;
- ribs BBQ fumées + mac & cheese + coleslaw;
- halloumi grillé + légumes méditerranéens + couscous;
- brochettes de poulet teriyaki + légumes grillés + riz.

The expansion recipes deliberately exercise different planner patterns: fast temperature-driven cooking, advance preparation, intermediate thermal checkpoints, independent Woodfire branches, long tenderness rechecks and no-temperature meals.

## Serving configuration and pre-cook
Changing servings updates the scaled ingredient data shown in `Ingrédients & courses`.

`js/shopping.js` is pure shopping/prep data logic. `js/prep-ui.js` renders shopping, advance-prep and equipment UI.

Shopping state uses `woodfire-companion-shopping-v1` and is keyed by recipe id + recipe content version so a new recipe version cannot silently inherit stale checks.

`recommendedStartFromPlan()` in `js/meal-planner.js` derives the displayed start guidance from the same generated plan used by active cooking. `timing.elapsedRangeMin` remains descriptive metadata, not the operational scheduling source.

Serving count also materializes structured active-step quantities before planning. Planner V1 does not yet synthesize extra batches or change duration automatically from serving count, so `servings.max` must remain within one credible execution structure.

## Planner V1
`js/planner.js` is the low-level pure scheduling solver with no DOM access.

`js/meal-planner.js` is the stable recipe-facing facade. `buildMealSchedule(recipe, context)` accepts:
- servings;
- `mealTime` or absolute `targetServingAt`;
- explicit task delays;
- actual start timestamps;
- actual completion timestamps;
- expected completion timestamps from pending rechecks;
- reserved component/variant context for future use.

The solver works from desired service + durations + dependencies + planning buffers + resource reservations + runtime facts.

Baseline planning works backwards from service. The Woodfire is the only automatically conflict-resolved exclusive resource today. Started/completed timestamps are historical facts and are never shifted merely to make a plan tidy.

Other declared resources such as `oven`, `stovetop`, `fridge` and `passive` may run concurrently but are not generally conflict-solved yet.

The planner supports dependency-only recipes without preferred-start offsets, midnight crossing, buffer absorption, actual-start/completion propagation, expected recheck completion and service slippage when reality can no longer meet the original target.

The Pork Belly reference is fully migrated away from legacy fixed start offsets.

## Active-cook orchestration
`js/active-cook-controller.js` is the DOM-free orchestration boundary for active cooking.

It owns:
- schedule recomputation from runtime facts;
- step start/finish/reset lifecycle mutations;
- observation application and pending rechecks;
- +5/+10/+15 next-action delay semantics;
- planning reset;
- served-cook journal synchronization.

`app.js` remains the top-level view/render wiring layer rather than the owner of those state transitions.

Runtime step states are:
- `upcoming` — no actual start/completion;
- `active` — actual start exists, completion absent;
- `done` — actual completion exists.

Timed steps normally use one tap to start and one tap to finish. Zero-duration milestones can complete in one interaction.

The active-cook header exposes a distinct current-action card; active Woodfire work is prioritized and shows its exact appliance state plus actual start and indicative end. Parallel active work may coexist.

Pending observation rechecks remain actionable next steps and feed their expected completion time back into the planner.

## Session state V3
The compatibility localStorage key remains `woodfire-companion-v1`; the stored record carries explicit schema migration.

`js/session.js` owns default state, migration, lifecycle transitions, timestamp correction and recipe snapshots.

Important fields include:
- `started`, `completed`;
- `taskShifts`;
- `observations`, `rechecks`;
- `temperatureTarget`, `measurements`;
- `sessionId`, `sessionStartedAt`, `sessionServedAt`, `targetServingAt`;
- recipe identity and detached `recipeSnapshot`;
- `isTest`.

Existing completion timestamps survive migration; missing historical starts are not fabricated.

A new cook snapshots validated recipe content. Resume prefers that snapshot so a later deployment cannot silently alter a cook already in progress.

Actual step start/end timestamps and latest observation/control timestamps can be corrected after the fact. Those corrected historical facts feed the normal planner path.

DEV test sessions use the same planner/session path, temporarily back up any real active session and are excluded from Cook Journal persistence.

## Observations and rechecks
`js/observations.js` owns pure observation-state logic.

Current controls are derived from completion semantics, including:
- tenderness: `Encore ferme / Presque prêt / Très tendre`;
- target-temperature: `Sous X °C / Presque X °C / X °C atteint`;
- generic fallback: `Pas prêt / Presque prêt / Prêt`.

A not-ready observation records the state and schedules a future recheck. A ready observation records actual completion. Pending recheck time is passed into planning as an expected completion constraint so buffers can absorb limited delay before downstream work/service moves.

## Temperature tracking
Temperature tracking is optional per recipe.

`js/temperature.js` owns pure value validation, target semantics, immutable measurement operations and CSV serialization.

`js/temperature-ui.js` owns fast entry, target editing, latest/recent samples, SVG chart, undo/new-series and CSV download.

A recipe without temperature metadata has no temperature tab. Manual logging remains value → Add/Enter → automatic timestamp.

Measurements do not automatically complete a recipe step; the cook still confirms the completion/observation state.

No ETA is currently inferred from temperature slope.

## Cook Journal V2
Cook history remains separate under `woodfire-companion-journal-v1`.

`js/journal.js` owns serialization, migration, service-milestone resolution, rating/notes feedback and versioned JSON backup/import.

A journal entry includes recipe identity/version, servings, target/actual service, temperature samples, structured observations, actual starts/completions, explicit delays and baseline/final schedule timestamps.

`js/journal-ui.js` renders compact history cards plus rating and `Notes pour la prochaine fois`.

JSON backup/import validates the payload before writing, rejects unsupported future formats, ignores test entries and merges by stable session id while keeping the freshest duplicate. Active-session, shopping and settings stores remain intentionally outside that backup.

Raw real-cook feedback should normally be captured in the journal first. Durable findings are then promoted into recipe/source revisions and may justify a qualification change.

## PWA/offline
The service worker uses network-first fetch with offline fallback.

Current dev version remains `0.3.0-dev.10`.

Static shell/modules are listed in `APP_ASSETS`. Executable recipe JSON and each available recipe cover are discovered from `recipes/index.json` and preloaded automatically; individual recipe filenames must not be hard-coded into the service worker.

Service-worker updates use the normal waiting lifecycle rather than `skipWaiting()`. A new generation prepares its separate cache but does not replace the worker controlling an already-open long cook. It activates after existing controlled clients close, then the next launch receives the new generation.

This lifecycle is covered by automated tests but installed-iPhone qualification across offline/online transitions and a deployed update remains an important manual check.

## Testing and CI
Run:

```bash
npm test
```

GitHub Actions runs the suite on `main`, supported feature/fix/chore pushes and pull requests.

Coverage includes:
- generic acceptance of every `available` recipe;
- library qualification metadata;
- recipe/schema/structured-step validation;
- serving scaling and shopping/prep;
- planner dependencies/resources/buffers/rechecks/midnight handling;
- recipe-specific reference timelines/patterns;
- session v1→v2→v3 migration and recipe snapshots;
- active-cook controller behavior;
- timestamp correction;
- journal migration/feedback/backup merge safety;
- optional temperature capability;
- illustrated-library and offline service-worker contracts;
- static DOM/module/version consistency.

## Current technical debt / next work
Priority order as of 2026-09-01:
1. Keep README/source contracts synchronized with the actual merged product.
2. Qualify the current executable library through representative installed-iPhone real cooks instead of expanding recipe count by default.
3. Use those cooks to decide whether flexible planning windows, non-Woodfire shared-resource conflicts, batching or component reuse are genuinely needed.
4. Continue small `app.js` extractions only where ownership becomes materially unclear; do not introduce a framework for its own sake.
5. Complete repository hygiene: safely delete stale/noop branches only after confirming no unique work, and protect `main` with CI if repository settings allow it.
6. Periodically validate the conservative PWA update lifecycle on installed iPhone/Safari.
7. Add predictive ETA later from clean temperature/history data with explicit uncertainty, never false precision.

## Relevant source contracts
- `sources/PRODUCT_SPEC.md`;
- `sources/RECIPE_MODEL.md`;
- `sources/RECIPE_SCHEMA_V1.md`;
- `sources/RECIPE_QUALIFICATION_V1.md`;
- `sources/STEP_INGREDIENT_USAGE_V1.md`;
- `sources/SHOPPING_PREP.md`;
- `sources/MULTI_RECIPE_CONTRACT.md`;
- `sources/PLANNER_V1.md`;
- `sources/ACTIVE_COOK_V1.md`;
- `sources/OBSERVATIONS_V1.md`;
- `sources/SESSION_V3.md`;
- `sources/COOK_JOURNAL_V2.md`;
- `sources/JOURNAL_BACKUP_V1.md`;
- `sources/ILLUSTRATED_LIBRARY_V1.md`.
