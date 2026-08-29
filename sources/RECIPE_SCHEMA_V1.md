# Woodfire Companion — Recipe Schema V1

## Status
Schema V1 is the executable recipe format used by the application. The canonical reference is `recipes/pork-belly-burnt-ends.json`.

The reference recipe is dependency-driven and contains no `preferredStartOffsetMin` placement fields.

## Top-level structure
A recipe/meal contains:
- `schemaVersion`;
- stable `id` and positive integer content `version`;
- `title`, description/visual metadata;
- `servings` with `min`, `reference`, `max`;
- optional `timing` and temperature metadata;
- optional `advancePrep`;
- `components`;
- `ingredients`;
- `equipment`;
- executable `steps`;
- optional explicit `serviceStepId`.

Serving bounds must satisfy:

`0 < min <= reference <= max`

Until Planner V1 supports batch synthesis, `max` must remain within a quantity that can follow the same declared execution/resource structure.

## Ingredients and scaling
Each ingredient has a stable `id`, display name, quantity/unit, scaling rule, shopping category and optional preparation note.

Quantity may be a number, `{ min, max }`, or `null` when numeric guidance would be misleading.

Supported scale types:
- `linear`;
- `fixed`;
- `step`;
- `range`;
- `to_taste`.

`step` breakpoints must use strictly increasing positive `maxServings` values and cover `servings.max`; otherwise scaling above the last declared breakpoint is rejected by validation.

## Components
Components group ingredients and steps into meal parts such as main, side and sauce.

Component ids must be unique. A component has a type/title and may list `ingredientIds` and `stepIds`.

Step ownership is checked bidirectionally:
- a non-reserved `step.component` must exist;
- a step listed by a component must declare that component;
- a component-owned step must appear in that component's `stepIds`.

`meal` is a reserved step-level component identifier for whole-meal actions such as plating/service that do not belong to one reusable component.

Components remain embedded in one meal JSON until real reuse justifies external component files.

## Equipment and consumables
Reusable equipment/accessories use stable `id` + `name` and may be optional.

Recipe-specific non-food consumables may use `consumable: true` plus a display quantity. Consumables enter the shopping checklist and are excluded from reusable equipment.

## Advance preparation
`advancePrep` records are informational V1 guidance before the active timeline. If advance work needs dependencies/resources/replanning, represent it as a real planner step.

## Steps
A step may contain:
- stable `id` and optional owning `component`;
- title, collapsed summary and expanded details;
- `durationMin`, or `durationRangeMin` + `durationPlanMin`;
- dependencies;
- resources;
- structured `woodfire` configuration;
- required `completion` criterion;
- optional `recheck`;
- optional `plan` semantics.

When both `durationRangeMin` and `durationPlanMin` are supplied, the planning duration must lie inside the declared range.

### Completion
Every executable step requires a completion object with a supported type and human-readable description.

Supported V1 contract types are:
- `manual`;
- `time`;
- `appearance`;
- `temperature`;
- `tenderness`;
- `checkpoint`;
- `combined`;
- `observation`.

The planned duration supports scheduling; the completion criterion remains authoritative during real cooking.

### Recheck
When a step declares `recheck.notReadyMin`, it must be a positive duration or positive `[min, max]` range.

The active observation/recheck UI is still future work; validation protects the data contract now.

## Dependencies
Supported relations:
- `after_finish`;
- `after_start`.

`lagMin` is a hard relationship. `planningBufferMin` is non-negative baseline margin that may be consumed by real delay before downstream work moves.

Dependency references must exist, self-dependencies are rejected and the graph must be acyclic.

For anchored recipes, every executable step must be in the prerequisite closure of at least one planning anchor. Disconnected orphan steps are invalid.

## Serving anchors and service milestone
The desired meal time is represented using:

```json
"plan": { "anchor": "serve" }
```

`anchorOffsetMin` may position other work relative to that target. Therefore `anchor: "serve"` means a temporal relationship, not necessarily that the step itself represents the meal being served.

The real journal/service milestone can be declared explicitly:

```json
"serviceStepId": "eat"
```

When provided, `serviceStepId` must reference a zero-offset `serve` anchor. Without it, the recipe must have exactly one zero-offset `serve` anchor so service remains unambiguous.

## Placement and legacy compatibility
Optional `plan.placement: "earliest"` pulls a dependency-connected step to its earliest feasible position. Default behavior is latest-feasible/backwards placement.

`preferredStartOffsetMin` remains accepted only for older recipe compatibility. New curated recipes should use anchors, dependencies, buffers and resources.

## Resources
Current vocabulary includes `woodfire`, `stovetop`, `fridge` and `passive`.

The validator accepts resource identifiers as data, while Planner V1 currently conflict-resolves `woodfire` as the exclusive resource. Other resources may run concurrently unless future semantics say otherwise.

## Woodfire configuration
Every Woodfire step must reserve `woodfire` and explicitly define:
- mode;
- numeric `temperatureC`;
- optional valid `temperatureRangeC` containing the setpoint;
- smoke on/off;
- pellets yes/no;
- support/accessory;
- covered/uncovered;
- optional placement guidance.

Critical appliance state must not live only in prose.

## Validation summary
`validateRecipe()` now rejects at least:
- invalid serving bounds/timing ranges;
- duplicate ingredient/component/equipment/advance-prep/step ids;
- malformed scaling or incomplete step breakpoints;
- component/step ownership mismatches;
- malformed resources and durations;
- missing/invalid completion criteria;
- invalid recheck intervals;
- dependency reference/cycle/connectivity errors;
- invalid service milestone semantics;
- invalid Woodfire state/ranges;
- missing component ingredient/step references.

## Testing
The repository contains both reference-recipe tests and synthetic contract fixtures. In addition, the multi-recipe acceptance suite applies the executable contract automatically to every library entry marked `available`.

See `sources/MULTI_RECIPE_CONTRACT.md`.

## Next schema work
1. Pass serving/configuration context into the planner for capacity/batch-dependent timing.
2. Add structured ingredient usage by step to eliminate scaling-sensitive quantities duplicated in prose.
3. Make temperature tracking explicitly optional per recipe.
4. Add a flexible planning-window concept when a real recipe requires it.
5. Promote observation/recheck outcomes into active-cook controls.
6. Add richer resources such as user attention only when real meal plans demonstrate the need.
