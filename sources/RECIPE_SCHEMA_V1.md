# Woodfire Companion — Recipe Schema V1

## Status
Schema V1 is the executable recipe format used by the application. The canonical reference is `recipes/pork-belly-burnt-ends.json`.

The reference recipe is now fully dependency-driven: it no longer uses `preferredStartOffsetMin` for step placement.

## Top-level structure
A recipe/meal contains:
- `schemaVersion`: schema contract version;
- `id`: stable recipe identifier;
- `version`: content version retained by cook sessions;
- `title`, `description`, `heroImage`, `tags`, `difficulty`;
- `servings`: reference/min/max servings;
- `timing`: active and elapsed estimates;
- `temperature`: default logging target where useful;
- optional `advancePrep`;
- `components`;
- `ingredients`;
- `equipment`;
- `steps`.

## Ingredients
Each ingredient has a stable `id`, display name, quantity/unit, scaling rule, shopping category and optional preparation note.

Quantity may be a number, `{ min, max }`, or `null` when numeric guidance would be misleading.

Supported scaling types:
- `linear`;
- `fixed`;
- `step` with serving breakpoints;
- `range`;
- `to_taste`.

`js/recipe.js` contains scaling and validation.

## Components
Components group ingredients and steps into meal parts such as main, side and sauce. They remain embedded in one meal JSON until real reuse justifies external component files.

## Equipment and consumables
Reusable equipment/accessories use stable `id` + `name` and may be optional.

Recipe-specific non-food consumables may set:

```json
{
  "id": "pellets",
  "name": "Pellets Woodfire",
  "consumable": true,
  "displayQuantity": "1 dose"
}
```

Consumables enter the shopping checklist and are excluded from reusable equipment.

## Advance preparation
`advancePrep` records describe useful work before the active cooking timeline. They are informational in V1 and do not create planner nodes.

If advance work needs dependencies/resources/replanning, represent it as a real step instead of duplicating scheduler logic.

## Steps
A step may contain:
- stable `id` and owning `component`;
- `title`, collapsed `summary`, expanded `details`;
- `durationMin`, or `durationRangeMin` + `durationPlanMin`;
- `dependencies`;
- `resources`;
- structured `woodfire` configuration;
- `completion` criterion;
- optional `recheck`;
- optional `plan` semantics.

The nominal duration supports planning; the completion criterion remains authoritative during real cooking.

## Dependencies
Example:

```json
{
  "stepId": "first-check",
  "relation": "after_finish",
  "lagMin": 0,
  "planningBufferMin": 35
}
```

Supported relations:
- `after_finish`;
- `after_start`.

`lagMin` is a hard timing constraint. `planningBufferMin` is reserved margin used only for baseline planning and may be consumed by a real delay before downstream work moves.

This distinction is important for uncertain cooking phases.

## Serving anchor
The desired meal time is represented by a step such as:

```json
"plan": { "anchor": "serve" }
```

Optional `anchorOffsetMin` can anchor another task relative to service when a useful flexible-window model is not yet available.

The reference recipe uses the `eat` step as the primary service anchor. Its independent sauce preparation is currently anchored earlier relative to service.

## Placement
Optional:

```json
"plan": { "placement": "earliest" }
```

This asks the planner to pull a dependency-connected step to the earliest feasible point. Default behavior is latest-feasible/backwards placement around the service anchor.

## Legacy offset compatibility
`preferredStartOffsetMin` is still accepted only for older recipe compatibility.

When a serve anchor exists it is treated as a soft migration hint, not the primary scheduling rule. New curated recipes should not introduce it.

The reference Pork Belly recipe contains zero preferred offsets; tests enforce this to prevent regression.

## Resources
Current vocabulary includes:
- `woodfire`;
- `stovetop`;
- `fridge`;
- `passive`.

The Woodfire is the exclusive resource in Planner V1. Baseline conflicts are resolved backwards to preserve desired service time. Runtime conflicts propagate unfinished work later when necessary.

## Woodfire configuration
Every Woodfire step explicitly stores:
- `mode`;
- `temperatureC` and optional `temperatureRangeC`;
- `smoke`;
- `pellets`;
- `support`;
- `covered`;
- optional placement guidance.

Do not encode critical appliance state only in prose.

## Reference planning semantics
For the current Pork Belly meal:
- `eat` anchors service;
- plate/potato/Woodfire/meat chains are derived backwards through dependencies;
- a 35 min planning buffer after `first-check` represents the allowance for extra covered-cook/rechecks before finishing the pork;
- a 25 min planning buffer between potato preparation and Air Fry allows the potatoes to be ready before the Woodfire becomes available;
- sauce is independently anchored before service and is also required before `eat`.

These semantics reproduce the established 20:00 baseline without fixed start offsets.

## Validation
`validateRecipe()` checks at least:
- schema/content basics;
- unique ingredient/equipment/advance-prep/step ids;
- quantity/scaling structures;
- valid durations;
- dependency references and cycles;
- valid `lagMin` and non-negative `planningBufferMin`;
- valid `serve` anchor / anchor offset / placement values;
- presence of a serve anchor or complete legacy timing fallback;
- explicit Woodfire state + Woodfire resource reservation;
- component references.

## Tests
Tests verify:
- reference-recipe validation and scaling;
- zero legacy preferred offsets in the reference recipe;
- explicit pork/potato planning buffers;
- dependency-only scheduling;
- baseline reference times;
- midnight crossing;
- Woodfire conflict resolution;
- buffer absorption/service slippage;
- actual completion propagation;
- shopping/pre-cook semantics.

## Next schema work
1. Add a second complete executable recipe to validate generality.
2. Introduce a real flexible-window concept when a recipe demonstrates the need, replacing independent fixed anchor offsets such as sauce-prep convenience timing.
3. Add richer ingredient usage references to reduce scaling-sensitive quantities duplicated in step prose.
4. Promote observation/recheck outcomes into structured active-cook semantics.
5. Add additional resources such as user attention only when real meal plans require them.
