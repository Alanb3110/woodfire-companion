# Woodfire Companion — Instruction Ingredient Usage V1

## Goal
Keep user-facing cooking/preparation instructions consistent with the selected serving count without duplicating hard-coded reference quantities inside prose.

Top-level `ingredients` remain the source for the ingredient/shopping view. Structured `ingredientUsage` may be attached to:
- executable `steps` for Active Cook summaries/details;
- `advancePrep` records for serving-aware preparation reminders shown before cooking.

The same quantity-token semantics are used in both places.

## Data shape
An executable step may declare:

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

An advance-prep record uses the same shape, with tokens inside its string `details` field:

```json
{
  "id": "marinate-ahead",
  "ingredientUsage": [
    { "id": "marinade-meat", "ingredientId": "meat" }
  ],
  "details": "Mariner {{use:marinade-meat}} de viande."
}
```

## Inheritance
Each usage references one top-level ingredient through `ingredientId`.

Unless overridden, the usage inherits:
- `quantity`;
- `unit`;
- `scale`.

A usage override is interpreted at the recipe's `servings.reference` count before scaling.

Examples:
- potatoes can inherit their full top-level quantity for a boiling step;
- salt can override the total shopping quantity with the subset used in one action;
- lemon count can inherit the ingredient's `step` scale;
- lemon juice can reference the same lemon ingredient but override quantity/unit and use `linear` scaling because millilitres of juice are not governed by the whole-fruit step breakpoint;
- a marinade reminder can express the meat in kilograms while the shopping ingredient remains stored in grams, provided the usage supplies an explicit converted reference quantity.

## Validation rules
`validateStepIngredientUsage()` validates executable steps.

`validateAdvancePrepIngredientUsage()` validates preparation reminders.

`validateRecipeIngredientUsage()` combines both and is the validation used by recipe loading.

For each supported instruction item the validator enforces:
- `ingredientUsage` is an array when present;
- local usage ids are unique inside the item;
- each `ingredientId` exists in the top-level ingredient list;
- quantities are valid non-negative numbers/ranges/null;
- units are non-empty strings when supplied;
- changing a top-level unit requires an explicit converted quantity;
- `displayUnit` is boolean when supplied;
- scale types use the same vocabulary as top-level ingredients;
- usage-local `step` breakpoints are strictly increasing and cover `servings.max`;
- every `{{use:id}}` token resolves to a declared usage;
- every declared usage is referenced by the item's supported text.

For steps, supported token locations are `summary` and `details[]`. For advance prep V1, tokens are supported in `details` only.

Recipe loading fails before use if structured instruction usage is invalid.

## Rendering/materialization
`materializeRecipeForServings(recipe, servings)` creates a non-mutating recipe view whose step summaries/details and advance-prep details contain formatted quantities for the requested serving count.

`buildMealSchedule()` performs recipe materialization before handing the recipe to the low-level planner. Active Cook therefore consumes the same selected serving count as the pre-cook ingredient view.

`getAdvancePrep(recipe, servings)` materializes advance-prep reminders for the current pre-cook serving selection before `prep-ui` renders them.

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

Curated recipes should nevertheless keep top-level shopping quantities and instruction usage sensibly consistent.

## Reference migrations
### Pork Belly V6
Pork Belly content version 6 was the first curated recipe migrated to structured step usage.

Serving-aware Active Cook quantities cover pork/rub, covered-phase sauce, fresh sauce and potatoes. Regression tests explicitly cover 2, 4, 6 and 8 servings.

### Turkey + zucchini gratin V3
Turkey meal content version 3 keeps the approximately 1 kg turkey chain fixed while scaling the zucchini-gratin preparation quantities for 4/5/6 servings.

### Barbacoa tacos V2
Barbacoa content version 2 is the first recipe to require serving-aware `advancePrep` as well as Active Cook quantities. The marinade reminder, smoked salsa, covered-braise additions, taco toppings and shell count now follow the selected 6–8 serving context.

This real recipe is the reason advance-prep materialization was added; it was not introduced speculatively.

## Future work
Potential later extensions, only if justified by real meals:
- usage-aware shopping aggregation;
- explicit ingredient partition/conservation semantics;
- capacity/batch rules tied to serving count;
- structured preparation actions beyond textual substitution.
