# Woodfire Companion — Recipe expansion 2026-08-31

## Goal
Expand the curated library with meals chosen primarily to exercise distinct planning behaviours rather than to maximise recipe count.

The four candidates are executable Recipe Schema V1 datasets. They are intentionally listed as `coming_soon` in `recipes/index.json` until each has a truthful local WebP cover; the existing illustrated-library contract must not be weakened or satisfied with unrelated placeholder imagery.

## 1. Saumon laqué soja-miel, asperges & riz citronné

**Product pattern:** short, temperature-driven meal with meaningful parallel work.

- short total horizon compared with the current long-cook recipes;
- fish completion driven by core temperature rather than a long fixed duration;
- stovetop rice can run in parallel with Woodfire work;
- the Woodfire changes from `SMOKER` to `GRILL` for the asparagus;
- a short recheck interval exercises active-cook observation/replan behaviour on a fast meal.

## 2. Poulet shawarma fumé, pommes de terre épicées & sauce yaourt

**Product pattern:** advance preparation plus multi-mode same-evening execution.

- marinade is represented as `advancePrep`, ideally 4–12 h in advance;
- the active cook begins with already-marinated chicken rather than stretching the live timeline across the whole day;
- chicken moves from `SMOKER` to `GRILL` and is temperature-driven;
- potatoes use `AIR_FRY` after the chicken releases the Woodfire;
- yogurt sauce and fresh garnishes run in parallel using fridge/no exclusive resource.

This recipe is a useful check that pre-cook guidance is visible and actionable enough before it is promoted to `available`.

## 3. Bœuf reverse-sear, grenailles croustillantes & sauce poivre

**Product pattern:** intermediate thermal checkpoint, resource hand-off and final temperature criterion.

- low-temperature `SMOKER` phase reaches an intermediate 52–55 °C checkpoint only;
- that intermediate checkpoint is explicitly **not** the final serving criterion;
- Woodfire is released for `AIR_FRY` potatoes, then reconfigured to very hot `GRILL` for the final sear;
- the final step is temperature-driven at 63 °C and is followed by a 5 min rest;
- alcohol-free pepper sauce runs on the stovetop in parallel.

This meal is intentionally structured to exercise the manual temperature log and a mode/accessory sequence without adding temperature-slope ETA logic.

## 4. Wings miel-soja fumées, potatoes croustillantes & coleslaw

**Product pattern:** genuine exclusive-resource conflict.

`cook-wings` and `cook-potatoes` are independent dependency branches and both reserve `woodfire`. The recipe deliberately does not add a fake dependency between them. Planner V1 must choose a non-overlapping baseline schedule using the existing exclusive-Woodfire conflict solver.

The wings then return to the Woodfire for a short `GRILL` caramelisation after glazing, while coleslaw can be prepared in parallel and held cold.

This is the most important regression recipe for detecting whether the current resource solver works beyond the original curated meals.

## Food-safety references

Fixed safety-critical temperatures in these candidates were checked against current authoritative guidance before being encoded:

- poultry: 74 °C, corresponding to USDA FSIS guidance of 165 °F;
- intact beef steak/roast final criterion: 63 °C, corresponding to USDA FSIS guidance of 145 °F followed by at least 3 min rest; this recipe uses 5 min rest;
- fish: 63 °C, corresponding to FDA Food Code guidance of 145 °F.

References:
- USDA FSIS — chicken cooking temperature: https://ask.fsis.usda.gov/article/What-are-cooking-times-for-chicken
- USDA FSIS — beef cooking temperature and rest: https://ask.fsis.usda.gov/article/To-what-temperature-should-I-cook-beef
- FDA Food Code 2022: https://www.fda.gov/media/184685/download?attachment=

## Promotion checklist

Before changing any candidate from `coming_soon` to `available`:

1. add a truthful local WebP cover that satisfies the illustrated-library contract;
2. run the complete available-recipe acceptance suite at min/reference/max servings;
3. inspect the generated schedule manually for sensible cooking order and appliance changes;
4. verify ingredient quantities/instructions once more as a cooking recipe, not only as valid schema data;
5. run at least one representative candidate on iPhone/PWA before treating the expanded library as beta-quality.

No Planner V1 algorithm change is required merely to add these candidates. A planner change should be justified only if one of these real meal patterns exposes an actual failure or poor schedule.
