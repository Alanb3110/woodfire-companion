# Woodfire Companion — Shopping & Pre-cook Source

## Scope
This source defines the reusable shopping-list and pre-cook preparation behavior. It complements `PRODUCT_SPEC.md`, `RECIPE_MODEL.md` and `RECIPE_SCHEMA_V1.md` without changing planner semantics.

## Ingredients & shopping behavior
The recipe page uses one combined `Ingrédients & courses` checklist rather than displaying a read-only ingredient list and a second duplicate shopping list.

The checklist is generated from the selected recipe and serving count.

Requirements:
- use the same scaled ingredient quantities as the recipe content layer;
- preserve optional markers;
- group items into practical categories;
- put a checkbox directly on each ingredient row;
- include recipe-specific consumables such as Woodfire pellets when declared;
- provide checkboxes suitable for one-handed mobile use;
- persist checked items locally across reloads;
- keep shopping state separate from cook-session completion state;
- expose checked/total progress;
- allow the checklist to be reset explicitly.

Current category vocabulary:
- viande;
- fruits & légumes;
- produits frais;
- épicerie;
- boissons & épicerie;
- consommables.

The current recipe model already uses one canonical top-level ingredient entry per ingredient id, so duplicate use across components is consolidated before display. Future component composition may require aggregation across selected component files; that logic belongs in the shopping/content layer, not UI code.

A separate read-only ingredient section should not be shown while it would merely duplicate the same rows. If a future feature needs a distinct culinary ingredient view (for example quantities split explicitly by component), it can be introduced for that specific purpose rather than duplicating the shopping checklist by default.

## Consumables
Non-food consumables may be declared in recipe `equipment` with:
- stable `id`;
- `name`;
- `consumable: true`;
- optional `displayQuantity`;
- optional flag where relevant.

Consumables are appended to the combined ingredients/shopping checklist under their own category and excluded from the reusable equipment checklist.

## Equipment checklist
Before cooking, show required equipment/accessories separately from ingredients and consumables.

For the current Pork Belly reference this includes the Woodfire, cooking surface, compact oven-safe dish, foil, Air Fry basket and stovetop pot. Optional equipment such as a probe/thermometer remains visibly optional.

## Advance preparation
Recipes may declare an `advancePrep` array for work that should be visible before the active timeline begins.

Each entry may contain:
- stable `id`;
- short `title`;
- `timing` display guidance;
- `details`;
- optional `ingredientUsage` for quantities that must follow the selected serving count;
- optional flag.

Serving-aware advance-prep text uses the same `{{use:<id>}}` token contract as executable steps. `getAdvancePrep(recipe, servings)` materializes those tokens before the pre-cook UI renders the cards, so a serving change cannot leave a reference-serving marinade or preparation quantity in the reminder.

This was introduced for Barbacoa V2, where the shopping list for 6 people correctly scaled the beef below the 8-person reference but the marinade reminder previously still said `2,6 kg` and displayed all reference-8 seasoning quantities.

Advance preparation remains informative in the planner model. Serving-aware text does **not** automatically turn an advance-prep record into a planner node. If an item later needs formal scheduling/dependencies/resources, migrate it into planner semantics rather than duplicating schedule logic in the UI.

Top-level ingredient quantities remain authoritative for shopping totals. `advancePrep.ingredientUsage` only controls instructional text and does not independently aggregate or reserve ingredients.

See `sources/STEP_INGREDIENT_USAGE_V1.md`.

## Persistence
Shopping check state uses its own local-storage namespace rather than the active cook state. A shopping reset must not clear cooking progress, temperature history or visual settings.

The persistence namespace remains:

`woodfire-companion-shopping-v1`

Within that store, checklist state is scoped by:

`recipeId@recipeVersion`

and then shopping-item id.

This prevents a newly deployed recipe version from silently inheriting checked rows from older content whose ingredients/consumables may have changed. Legacy id-only state is migrated once when that recipe is next rendered.

Serving changes within the same recipe version update quantities but retain checked identities because ingredient ids remain stable.

## Recommended start
The user-facing `Début conseillé` value is operational timing and must come from the same generated meal plan used by active cooking. Broad metadata such as `timing.elapsedRangeMin` may describe a recipe card but must not act as a second scheduling source of truth.

## UX
On the recipe/configuration page, the user should be able to answer before pressing Start:
- what ingredients/consumables do I need?;
- which of them do I already have?;
- what equipment/accessories do I need?;
- is anything better prepared in advance, with quantities matching my selected servings?;
- when should I begin according to the generated plan?;
- what exactly is in the meal?

Keep this pre-cook view compact and scannable on iPhone. Avoid duplicated ingredient/course information. The active-cook interface remains focused on next/current actions and is not expanded with shopping controls.
