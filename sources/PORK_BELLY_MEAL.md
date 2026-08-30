# Pork Belly Burnt Ends — Meal Source

## Status
This file records the tested reference meal and the first post-cook refinement applied to `recipes/pork-belly-burnt-ends.json`.

Current recipe content version: **5**.

## Meal
Reference meal:
- Pork Belly Burnt Ends;
- smashed grenaille potatoes;
- generous fresh lemon-yogurt/crème-fraîche sauce.

The Pork Belly remains tenderness-driven during the covered phase. A core temperature around 93 °C is supporting information, not the sole endpoint; several cubes should probe very tender before the uncovered finish begins.

## Real-cook feedback behind V5
The first real cook established that the meat was already tender after the covered phase, but smaller fragments became disproportionately dry and strongly caramelised during the uncovered finish.

V5 therefore changes the next-cook default without altering the overall meal architecture:
- target pork cubes increase from about 40 mm to **45–50 mm**;
- uncovered finish changes from **20–30 min** to **10–20 min**;
- planning uses **15 min** for that finish;
- start checking at **10 min**, then about every 5 min;
- mix gently to avoid creating additional fragments;
- small detached pieces may be removed earlier when already dark and tacky;
- the visual/tactile finish criterion is authoritative: stop when the glaze is sticky and lightly caramelised rather than extending the phase only to satisfy a timer.

This is a next-cook refinement from one household cook, not a universal cooking standard. Keep observing subsequent sessions before tightening the range further.

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

### Uncovered finish — V5
- mode: `BAKE_ROAST`;
- setpoint: 180 °C, acceptable recipe range 175–180 °C;
- smoke: off;
- pellets: no;
- same compact dish;
- uncovered;
- 10–20 min estimated, check from 10 min;
- finish by glaze/tenderness state, not clock alone.

## Planning effect
For the current 20:00 reference service, the shorter nominal finish shifts the pork chain later while the potato/Air Fry/service chain remains unchanged. Expected reference anchors are:
- pork out: 14:45;
- smoke: 15:15;
- covered phase: 17:30;
- Air Fry potatoes: 19:25;
- service: 20:00.

The existing 35 min planning buffer before finishing remains available for tenderness uncertainty and rechecks.

## Future feedback loop
Cook Journal V2 can already retain a rating and free-text notes for the next attempt. For now, promoting a journal observation into curated recipe content remains an explicit repo change. A later product iteration may surface prior-cook notes alongside the recipe or propose adjustments, but it must not silently rewrite curated recipe content.
