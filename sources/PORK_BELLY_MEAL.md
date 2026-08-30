# Pork Belly Burnt Ends — Meal Source

## Status
This file records the tested reference meal and the refinements applied to `recipes/pork-belly-burnt-ends.json`.

Current recipe content version: **6**.

## Meal
Reference meal:
- Pork Belly Burnt Ends;
- smashed grenaille potatoes;
- generous fresh lemon-yogurt/crème-fraîche sauce.

The Pork Belly remains tenderness-driven during the covered phase. A core temperature around 93 °C is supporting information, not the sole endpoint; several cubes should probe very tender before the uncovered finish begins.

## Real-cook feedback behind V5
The first real cook established that the meat was already tender after the covered phase, but smaller fragments became disproportionately dry and strongly caramelised during the uncovered finish.

V5 therefore changed the next-cook default without altering the overall meal architecture:
- target pork cubes increase from about 40 mm to **45–50 mm**;
- uncovered finish changes from **20–30 min** to **10–20 min**;
- planning uses **15 min** for that finish;
- start checking at **10 min**, then about every 5 min;
- mix gently to avoid creating additional fragments;
- small detached pieces may be removed earlier when already dark and tacky;
- the visual/tactile finish criterion is authoritative: stop when the glaze is sticky and lightly caramelised rather than extending the phase only to satisfy a timer.

This is a next-cook refinement from one household cook, not a universal cooking standard. Keep observing subsequent sessions before tightening the range further.

## V6 — serving-aware active-cook quantities
V6 does not change the cooking process or timeline. It migrates scaling-sensitive quantities out of hard-coded 4-person prose and into structured `step.ingredientUsage` data.

The selected serving count now propagates into active-cook instructions for:
- pork amount and rub;
- covered-phase BBQ sauce, honey, apple juice and optional butter;
- fresh sauce quantities;
- grenaille quantity shown in the boiling-step summary/details;
- potato oil and seasonings.

The same top-level ingredient list continues to drive the shopping/pre-cook view. Step usage is an instructional partition/representation and does not independently generate shopping totals.

Examples from the generated active-cook text:
- pork: 1.2–1.5 kg at 4 servings → 1.8–2.25 kg at 6 → 2.4–3 kg at 8;
- grenailles: 700–800 g at 4 → 1050–1200 g at 6 → 1400–1600 g at 8;
- lemon count retains step scaling: 1 through 4 servings, 2 for 6–8 servings;
- lemon juice remains linear: 20–30 mL at 4 → 30–45 mL at 6 → 40–60 mL at 8.

Planner V1 still uses the same durations and execution structure at 2–8 servings. This does not claim that time/capacity always scale neutrally; the declared `servings.max` remains the curator's assertion that the same execution structure is acceptable for this recipe.

See `sources/STEP_INGREDIENT_USAGE_V1.md`.

## Woodfire reference
### Smoke
- mode: `SMOKER`;
- setpoint: 125 °C;
- smoke: on;
- pellets: yes;
- support: grill surface;
- uncovered;
- cubes spaced directly on the grill surface.

### Covered tenderising phase
- mode: `BAKE_ROAST`;
- setpoint: 160 °C, acceptable recipe range 155–160 °C;
- smoke: off;
- pellets: no;
- compact external dish;
- 1–2 layers;
- tightly covered;
- shallow sauce/liquid only, not immersed.

### Uncovered finish — V5/V6
- mode: `BAKE_ROAST`;
- setpoint: 180 °C, acceptable recipe range 175–180 °C;
- smoke: off;
- pellets: no;
- same compact dish;
- uncovered;
- 10–20 min estimated, check from 10 min;
- finish by glaze/tenderness state, not clock alone.

## Planning effect
For the current 20:00 reference service, the shorter nominal V5 finish shifts the pork chain later while the potato/Air Fry/service chain remains unchanged. V6 does not alter these times. Expected reference anchors are:
- pork out: 14:45;
- smoke: 15:15;
- covered phase: 17:30;
- Air Fry potatoes: 19:25;
- service: 20:00.

The existing 35 min planning buffer before finishing remains available for tenderness uncertainty and rechecks.

## Future feedback loop
Cook Journal V2 can already retain a rating and free-text notes for the next attempt. For now, promoting a journal observation into curated recipe content remains an explicit repo change. A later product iteration may surface prior-cook notes alongside the recipe or propose adjustments, but it must not silently rewrite curated recipe content.
