# Woodfire Companion — Recipe / Meal Data Model Source

## Status
This is the proposed semantic model for the next refactor. It defines what the data must express; exact JSON field names may still change during implementation.

## Core concepts
### Recipe / meal
The user-facing item shown in the library. It may be a complete meal or a main recipe with default components.

Should contain:
- stable `id` and schema/content version;
- title and short description;
- hero illustration/image reference;
- tags;
- difficulty;
- reference servings and supported serving range;
- active-prep estimate;
- elapsed-time estimate/range;
- default components;
- ingredients;
- required equipment/accessories;
- planning steps;
- optional variants/notes.

### Component
A reusable logical part of a meal, e.g.:
- main: Pork Belly Burnt Ends;
- side: smashed grenaille potatoes;
- sauce: lemon-yogurt sauce.

Components may be embedded initially and extracted/reused only when useful. Do not require full modularity for every recipe.

### Ingredient
An ingredient entry should distinguish identity from the quantity used in one recipe.

Useful semantics:
- stable ingredient id/name;
- quantity + unit;
- reference servings;
- scaling rule;
- shopping category;
- optional flag;
- pantry/staple hint later;
- preparation note where needed.

Scaling rule examples:
- `linear`: 400 g for 4 people → 600 g for 6;
- `fixed`: one small amount independent of servings;
- `step`: one lemon up to 4 servings, two above 4;
- `range/to_taste`: display guidance rather than false arithmetic.

### Step
A step is an executable planning unit, not merely a paragraph of recipe prose.

A step may contain:
- stable `id`;
- owning component;
- title;
- concise summary;
- expanded instructions;
- expected duration or duration range;
- prerequisite dependencies;
- resources;
- Woodfire configuration;
- ingredient usage relevant to this step;
- completion criterion;
- buffer/flexibility;
- delay/recheck behavior;
- whether active user attention is required.

## Scheduling semantics
The planner should derive actual timestamps from constraints rather than storing a full hard-coded timeline.

Useful concepts:
- `dependsOn`: must follow another step;
- `durationMin` or `durationRangeMin`;
- `anchor`: special relation to serving time where needed (serve, rest before serve, etc.);
- `resource`: exclusive or capacity-limited equipment;
- `flexibility`: task can move within a window without affecting meal quality;
- `bufferMin`: deliberate margin;
- `completion`: time/temperature/tenderness/appearance/manual confirmation;
- `recheck`: if criterion not met, schedule another observation.

The target serving time is a plan anchor, not a requirement that every preceding task use a fixed negative offset.

## Resource semantics
Initial resource vocabulary can remain small:
- `woodfire` — exclusive;
- `stovetop` — initially assume available unless recipe explicitly models contention;
- `fridge` — non-exclusive in normal cases;
- `user_attention` — useful for preventing unrealistic simultaneous hands-on tasks;
- `passive` — no exclusive hardware.

Woodfire state for a step should be structured rather than encoded as prose:
- mode;
- temperatureC;
- smoke;
- pellets;
- accessory/support;
- covered;
- placement note.

## Completion criteria
Examples:

### Time-based
`Cook for 20 min` where duration is sufficiently deterministic.

### Temperature-based
`Core reaches 63 °C` or other recipe/safety target where meaningful.

### Sensory/manual
`Probe enters with little resistance`, `surface deeply caramelised`, etc.

### Combined
A step may have an expected duration plus a real completion criterion. The duration supports planning; the criterion decides when cooking is actually complete.

## Observation/recheck model
Later planner versions should allow outcomes such as:
- not ready → recheck in 15 min;
- nearly ready → recheck in 5–10 min;
- ready → complete and release resource.

This should modify only downstream/dependent planning as appropriate.

## Illustrative JSON shape
Not yet frozen:

```json
{
  "id": "pork-belly-burnt-ends-meal",
  "version": 1,
  "title": "Pork Belly Burnt Ends",
  "image": "assets/recipes/pork-belly-burnt-ends.webp",
  "servings": { "reference": 4, "min": 2, "max": 8 },
  "components": ["pork", "grenaille", "fresh-sauce"],
  "ingredients": [
    {
      "id": "pork-belly",
      "name": "Poitrine de porc",
      "quantity": 1400,
      "unit": "g",
      "scale": "linear",
      "category": "meat"
    }
  ],
  "steps": [
    {
      "id": "smoke-pork",
      "component": "pork",
      "title": "Fumer le porc",
      "summary": "Smoker 125 °C · 2 h à 2 h 30",
      "durationRangeMin": [120, 150],
      "resources": ["woodfire"],
      "woodfire": {
        "mode": "SMOKER",
        "temperatureC": 125,
        "smoke": true,
        "pellets": true,
        "support": "grill_plate",
        "covered": false
      },
      "completion": {
        "type": "appearance",
        "description": "Croûte brun-rouge, surface sèche"
      }
    }
  ]
}
```

## Shopping-list generation
Generate the list after component selection and serving scaling.

Pipeline:
1. collect ingredients from selected components;
2. apply each scaling rule;
3. merge compatible duplicate ingredients;
4. normalize/display practical units;
5. group by shopping category;
6. retain optional flags and recipe-specific notes.

Do not merge ingredients when doing so would lose important form/preparation information (e.g. fresh garlic vs garlic powder).

## Versioning
Cook sessions must retain the recipe/content version used for that cook so future recipe edits do not rewrite history.

Breaking schema changes require an explicit schema version and migration/validation strategy.

## Validation goals
Before a recipe enters the curated library, validate at least:
- unique ids;
- valid dependencies (no missing references/cycles);
- ingredient quantities/units;
- valid Woodfire settings;
- no impossible resource overlap after planning;
- serving-scaling behavior;
- presence of meaningful completion criteria for uncertain long-cook steps;
- consistency between ingredient overview and step instructions.