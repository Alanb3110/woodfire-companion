# Woodfire Companion — Recipe Schema V1

## Status
Schema V1 is the first concrete, executable recipe format used by the application. The reference implementation is `recipes/pork-belly-burnt-ends.json`.

This schema intentionally separates recipe semantics from UI code while preserving the current POC schedule during the first refactor.

## Top-level structure
A recipe/meal contains:
- `schemaVersion`: schema contract version;
- `id`: stable recipe identifier;
- `version`: content version retained by cook sessions;
- `title`, `description`, `heroImage`, `tags`, `difficulty`;
- `servings`: reference/min/max servings;
- `timing`: active and elapsed estimates;
- `temperature`: default logging target where useful;
- optional `advancePrep`: pre-cook guidance that may be done before the active timeline;
- `components`: main/side/sauce grouping;
- `ingredients`: scalable ingredient definitions;
- `equipment`: appliance/accessory/recipe-consumable requirements;
- `steps`: executable planning units.

## Ingredients
Each ingredient has a stable `id`, a display name, shopping category and optional preparation note.

Quantity may be:
- a number;
- `{ min, max }` for a range;
- `null` when a false numeric quantity would be less useful than guidance such as `to taste`.

Supported scaling types in V1:
- `linear`;
- `fixed`;
- `step` with serving breakpoints;
- `range`;
- `to_taste`.

`js/recipe.js` contains the scaling implementation and recipe validator.

## Components
Components group ingredients and steps into coherent meal parts such as:
- main;
- side;
- sauce.

V1 keeps components embedded in one meal JSON. Reusable component files may be extracted later when multiple recipes actually share them.

## Equipment and consumables
Reusable equipment/accessories are declared in `equipment` with at least:
- stable `id`;
- `name`;
- optional flag where relevant.

A recipe-specific non-food consumable can use:

```json
{
  "id": "pellets",
  "name": "Pellets Woodfire",
  "consumable": true,
  "displayQuantity": "1 dose"
}
```

Consumables are included in the shopping list and excluded from the reusable equipment checklist. `displayQuantity` is display guidance rather than serving-scaled ingredient arithmetic.

## Advance preparation
Optional `advancePrep` records describe useful work that may happen before the active cooking timeline.

Example:

```json
{
  "id": "rub-ahead",
  "title": "Assaisonner le porc en avance",
  "timing": "Idéalement la veille · sinon ≥ 30 min avant",
  "details": "Appliquer le rub puis conserver au frais."
}
```

Current semantics are informational only. `advancePrep` does not yet create schedule nodes. If an item needs formal dependencies/resources/timing, migrate it into planner step semantics rather than duplicating scheduling logic.

## Steps
A step contains, where applicable:
- `id`;
- owning `component`;
- `title` and collapsed `summary`;
- `details` for expanded instructions;
- planned duration or duration range;
- `dependencies`;
- `resources`;
- structured `woodfire` configuration;
- `completion` criterion;
- optional `recheck` behavior;
- V1 planning hint under `plan`.

### Duration
Use one of:
- `durationMin` for a deterministic/planning duration;
- `durationRangeMin` plus `durationPlanMin` when real duration varies but planning needs one nominal value.

The nominal duration is for scheduling. The completion criterion remains authoritative during real cooking.

### Dependencies
V1 dependency records use:

```json
{
  "stepId": "smoke",
  "relation": "after_finish",
  "lagMin": 0
}
```

Supported relations:
- `after_finish`;
- `after_start`.

The validator checks missing references and cycles. Planner utilities can identify violations and compute downstream dependent steps.

### Resources
Current vocabulary includes:
- `woodfire`;
- `stovetop`;
- `fridge`;
- `passive`.

The Woodfire is treated as the main exclusive resource. `findResourceConflicts()` detects overlapping Woodfire reservations.

### Woodfire configuration
Every Woodfire step explicitly stores:
- `mode`;
- `temperatureC` and optional `temperatureRangeC`;
- `smoke`;
- `pellets`;
- `support`;
- `covered`;
- optional placement guidance.

The UI converts this structure into the collapsed/expanded hardware instruction line; the setting is no longer encoded only as prose.

## Compatibility planning hint
Schema V1 currently includes:

```json
"plan": {
  "preferredStartOffsetMin": -165
}
```

This is a deliberate migration field, not the final planning architecture.

Purpose:
- reproduce the existing POC timeline exactly while recipe content is extracted from `app.js`;
- make the first refactor behavior-preserving;
- let tests establish a known baseline before changing planning semantics.

At the same time, V1 already records durations, dependencies and resources. The next planner iteration should progressively derive actual placement from those constraints and serving time, reducing/removing `preferredStartOffsetMin` where it is no longer necessary.

Do not add new recipe logic to UI code merely to preserve an offset. If a recipe needs a real timing relationship, express it as a dependency/window/resource rule in the schema/planner.

## Validation
`validateRecipe()` currently checks:
- schema/content version basics;
- unique ingredient and step IDs;
- quantity/scaling structures;
- equipment ids/names and optional consumable/display-quantity structures;
- `advancePrep` ids/titles and optional text fields;
- dependency references and cycles;
- valid duration fields;
- explicit Woodfire state and Woodfire resource reservation;
- component references.

Planning and content tests additionally verify:
- baseline times for the reference recipe;
- schedules crossing midnight;
- declared dependency order;
- absence of Woodfire resource conflicts;
- dependency-aware downstream shift primitives;
- representative serving scaling;
- shopping grouping/consumables;
- advance-prep exposure.

## Current reference recipe
`recipes/pork-belly-burnt-ends.json` is the canonical V1 fixture and includes:
- Pork Belly Burnt Ends main;
- smashed grenaille potato side;
- fresh lemon-yogurt sauce;
- all current POC steps and details;
- explicit Woodfire modes/accessories/smoke/cover state;
- ingredient scaling semantics;
- shopping consumable declaration;
- advance-prep guidance;
- completion and recheck semantics.

## Next schema/planner work
1. Use dependencies/resource constraints to generate placement rather than only validate preferred offsets.
2. Add at least one additional complete executable recipe to validate schema generality.
3. Add richer planning windows/buffers only where a real recipe requires them.
4. Introduce cross-component duplicate aggregation when components become externally reusable.
5. Promote only genuinely schedulable advance-prep work into planner steps when required.
