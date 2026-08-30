# Woodfire Companion — Step Ingredient Usage V1

## Goal
Keep active-cook instructions consistent with the selected serving count without duplicating hard-coded reference quantities inside prose.

Top-level `ingredients` remain the source for the ingredient/shopping view. `step.ingredientUsage` describes how much of those ingredients a particular executable step uses.

## Data shape
A step may declare:

```json
"ingredientUsage": [
  {
    "id": "rub-salt",
    "ingredientId": "salt",
    "quantity": { "min": 18, "max": 22 },
    "unit": "g"
  }
]
```

The step text then references the local usage id:

```json
"details": [
  "Ajouter {{use:rub-salt}} de sel."
]
```

At 4 reference servings this becomes `Ajouter 18–22 g de sel.`. At 8 servings, with linear/range scaling, it becomes `Ajouter 36–44 g de sel.`.

## Inheritance
Each usage references one top-level ingredient through `ingredientId`.

Unless overridden, the usage inherits:
- `quantity`;
- `unit`;
- `scale`.

A usage override is interpreted at the recipe's `servings.reference` count before scaling.

Examples:
- potatoes can inherit their full top-level quantity for a boiling step;
- salt can override the total shopping quantity with the subset used in the rub;
- lemon count can inherit the ingredient's `step` scale;
- lemon juice can reference the same lemon ingredient but override quantity/unit and use `linear` scaling because millilitres of juice are not governed by the whole-fruit step breakpoint.

## Validation rules
`validateStepIngredientUsage()` enforces:
- `ingredientUsage` is an array when present;
- local usage ids are unique inside one step;
- each `ingredientId` exists in the top-level ingredient list;
- quantities are valid non-negative numbers/ranges/null;
- units are non-empty strings when supplied;
- changing a top-level unit requires an explicit converted quantity;
- `displayUnit` is boolean when supplied;
- scale types use the same vocabulary as top-level ingredients;
- usage-local `step` breakpoints are strictly increasing and cover `servings.max`;
- every `{{use:id}}` token resolves to a declared usage;
- every declared usage is referenced by the step summary/details.

Recipe loading fails before use if structured step usage is invalid.

## Rendering/materialization
`materializeRecipeForServings(recipe, servings)` creates a non-mutating recipe view whose step summaries/details contain formatted quantities for the requested serving count.

`buildMealSchedule()` performs this materialization before handing the recipe to the low-level planner. Active Cook therefore consumes the same selected serving count as the pre-cook ingredient view.

The low-level scheduling semantics are unchanged:
- no duration scaling;
- no automatic batching;
- no new resource reservations;
- no dependency changes.

If a larger serving count cannot realistically follow the same execution structure, the recipe's `servings.max` must stay below that point until capacity/batching semantics exist.

## Formatting
Current display formatting:
- decimal comma in French;
- up to two decimal places;
- ranges use an en dash;
- units map to existing app labels such as `g`, `kg`, `mL`, `c. à soupe`, `c. à café`;
- `displayUnit: false` suppresses the unit for prose such as `2 citron(s)`.

## Relationship to shopping totals
V1 does not sum `ingredientUsage` to generate the shopping list. Top-level ingredient quantities remain authoritative there.

This is deliberate because exact conservation is not universally meaningful:
- one physical ingredient can be represented twice, e.g. lemon count and extracted juice;
- some usages are optional;
- ranges may overlap differently;
- finishing/seasoning quantities can remain intentionally flexible.

Curated recipes should nevertheless keep top-level shopping quantities and step usage sensibly consistent.

## Pork Belly reference migration
Pork Belly content version 6 is the first curated recipe migrated to this mechanism.

Serving-aware active-cook quantities now cover:
- pork/rub;
- covered-phase BBQ sauce, honey, apple juice and optional butter;
- fresh sauce quantities;
- potato boiling quantity;
- potato oil/seasoning quantities.

Regression tests explicitly cover 2, 4, 6 and 8 servings and ensure no unresolved `{{use:...}}` token reaches the generated schedule.

## Future work
Potential later extensions, only if justified by real meals:
- usage-aware shopping aggregation;
- explicit ingredient partition/conservation semantics;
- capacity/batch rules tied to serving count;
- structured preparation actions beyond textual substitution.
