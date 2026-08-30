# Woodfire Companion — Multi-recipe acceptance contract

## Purpose
A recipe marked `available` in `recipes/index.json` is executable product content, not just a library card. It must work through the complete local flow without recipe-specific application code.

## CI contract for every `available` recipe
The automated suite must verify that:
- `recipeUrl` resolves to a committed JSON recipe;
- manifest id/title/serving range agree with the recipe;
- `validateRecipe()` accepts the recipe;
- every user-facing ingredient exposes an actionable baseline quantity/range rather than only `au goût`;
- ingredient scaling works at minimum, reference and maximum servings;
- shopping/pre-cook generation succeeds for those serving counts;
- `buildMealSchedule()` can generate a schedule at minimum, reference and maximum servings;
- declared dependencies are satisfied;
- the baseline has no unresolved Woodfire conflict;
- one unambiguous service milestone can be resolved for journal/session semantics.

Adding another recipe must not require changing a test that enumerates recipe ids.

## Meal planning context API
New recipe-facing planning integrations should use:

`buildMealSchedule(recipe, context)`

rather than adding more positional arguments to the low-level solver.

The context currently normalizes:
- `servings`;
- `mealTime` or absolute `targetServingAt`;
- `referenceDate` fallback;
- `taskShifts`;
- `actualStartTimes`;
- `actualCompletionTimes`;
- `expectedCompletionTimes` for pending observation rechecks;
- reserved future `selectedComponents`;
- reserved future `variants`.

When `targetServingAt` is supplied it is canonical and supplies both calendar date and local service time. This avoids day ambiguity for long/resumed cooks.

`buildSchedule()` remains the low-level solver API. Capacity/batching logic may later be inserted behind `buildMealSchedule()` without forcing another application-wide signature migration.

## Active-cook contract
Executable recipes must be usable with the same generic lifecycle:
- `upcoming` — no actual start recorded;
- `active` — actual start recorded, no completion yet;
- `done` — actual completion recorded.

Observation-enabled steps may create a pending recheck without completing the step. That pending recheck is a runtime planning constraint and may move downstream work when the recipe's planning buffer is exhausted.

Actual step/control timestamps may be corrected after the fact. Corrections are historical facts and must feed the same planner path as timestamps recorded live.

An active session stores a recipe snapshot so a later deployed recipe version cannot silently mutate a cook already in progress.

## Offline contract
`recipes/index.json` is the source of truth for executable recipe discovery.

The service worker must preload recipe JSON files by reading the manifest and selecting entries with:

`status === "available"`

Do not add individual recipe filenames to the static service-worker asset list.

A newly available recipe should therefore require only its recipe content plus its manifest entry for JSON offline availability.

## V1 serving-capacity rule
Ingredient quantities may scale within `servings.min..max`, and the meal-planning context carries the selected serving count, but Planner V1 does not yet create additional cooking batches or alter duration from servings.

Therefore, for V1, `servings.max` must only advertise a quantity that can follow the same declared step/resource structure on the supported Woodfire setup. If increasing servings requires another batch, another vessel cycle or materially different timings, restrict the supported range until batching/capacity semantics are implemented.

## Current deliberate limitations
The following are not blockers for the current multi-recipe release:
- components are grouping semantics, not yet independently swappable modules;
- duplicate ingredient aggregation across external reusable components is not yet implemented;
- only `woodfire` is automatically conflict-resolved as an exclusive resource;
- temperature tracking is still a session-level feature and should become optional before recipes that do not benefit from it are promoted to `available`;
- Planner V1 does not synthesize batches/capacity changes from serving count.

## Rule for future recipe additions
Prefer extending the schema only when a real recipe cannot be represented faithfully. Do not add recipe-specific branches to `app.js` or `planner.js` merely to make one recipe pass.
