# Woodfire Companion — Multi-recipe acceptance contract

## Purpose
A recipe marked `available` in `recipes/index.json` is executable product content, not just a library card. It must work through the complete local flow without recipe-specific application code.

## CI contract for every `available` recipe
The automated suite must verify that:
- `recipeUrl` resolves to a committed JSON recipe;
- manifest id/title/serving range agree with the recipe;
- `validateRecipe()` accepts the recipe;
- ingredient scaling works at minimum, reference and maximum servings;
- shopping/pre-cook generation succeeds for those serving counts;
- the planner can generate a schedule from a normal service-time anchor;
- declared dependencies are satisfied;
- the baseline has no unresolved Woodfire conflict;
- one unambiguous service milestone can be resolved for journal/session semantics.

Adding a second recipe must not require changing a test that enumerates recipe ids.

## Offline contract
`recipes/index.json` is the source of truth for executable recipe discovery.

The service worker must preload recipe JSON files by reading the manifest and selecting entries with:

`status === "available"`

Do not add individual recipe filenames to the static service-worker asset list.

A newly available recipe should therefore require only its recipe content plus its manifest entry for JSON offline availability.

## V1 serving-capacity rule
Ingredient quantities may scale within `servings.min..max`, but Planner V1 does not yet create additional cooking batches from serving count.

Therefore, for V1, `servings.max` must only advertise a quantity that can follow the same declared step/resource structure on the supported Woodfire setup. If increasing servings requires another batch, another vessel cycle or materially different timings, restrict the supported range until batching/capacity semantics are implemented.

## Current deliberate limitations
The following are not blockers for the first multi-recipe release:
- components are grouping semantics, not yet independently swappable modules;
- duplicate ingredient aggregation across external reusable components is not yet implemented;
- only `woodfire` is automatically conflict-resolved as an exclusive resource;
- observation-driven rechecks are not active controls yet;
- temperature tracking is still a session-level feature and should become optional before recipes that do not benefit from it are promoted to `available`.

## Rule for future recipe additions
Prefer extending the schema only when a real recipe cannot be represented faithfully. Do not add recipe-specific branches to `app.js` or `planner.js` merely to make one recipe pass.
