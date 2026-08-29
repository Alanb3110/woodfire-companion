# Woodfire Companion — Cooking Context Source

## Scope
This file captures culinary and Ninja Woodfire-specific context already established for the project. It is not a universal cooking standard; it is a project knowledge source that combines user preferences and validated workflow patterns from prior recipe development.

## Appliance
Primary appliance: Ninja Woodfire outdoor electric grill/smoker.

The app should distinguish, when relevant:
- `SMOKER`;
- `GRILL`;
- `AIR FRY`;
- `BAKE/ROAST` or equivalent Woodfire modes;
- smoke function enabled/disabled;
- pellets required/not required;
- grill plate vs Air Fry basket vs external oven-safe dish;
- covered vs uncovered cooking.

Do not assume these settings are interchangeable. Recipe cards should explicitly state them.

## Household cooking preferences
Current preferences to use as defaults rather than immutable rules:
- generous quantity of sauce;
- sweet-savoury profiles are appreciated;
- smoked paprika, soy-based and similar profiles are welcome;
- thyme is generally not preferred;
- avoid alcohol/flambé unless specifically requested;
- practical, explicit instructions are preferred over vague culinary shorthand.

## Recipe execution conventions
### Quantities
Use metric units by default:
- mass: g, kg;
- liquid volume: mL, L;
- temperature: °C;
- dimensions: mm or cm where useful.

Spoon measures may be shown for convenience, but important quantities should preferably also have metric equivalents when precision matters.

### Meat
Where applicable, distinguish:
- seasoning/marinade quantities;
- optional injection;
- smoking phase;
- covered/tenderising phase;
- finishing/caramelisation phase;
- resting;
- internal-temperature guidance;
- tenderness/sensory criterion.

Temperature is not always the sole completion criterion for collagen-rich cuts. Tenderness must be represented when relevant.

### Covered cooking
When a recipe transitions to a covered phase, state:
- recommended dish size/geometry;
- whether pieces may touch;
- approximate layer count;
- liquid amount;
- whether food should be immersed, partially immersed, or merely sit above a shallow liquid layer;
- foil/lid sealing requirement.

### Smoking
State:
- whether smoke is actually enabled;
- whether pellets are loaded;
- whether food is directly on a grate/plate or inside a dish;
- target smoking duration or exit criterion.

Do not put a covered liquid-filled dish into a “smoking” phase by accident unless the recipe intentionally calls for it.

### Side dishes
The scheduler should exploit passive meat phases to prepare sides in parallel.

For crispy potatoes, avoid applying wet sauce before serving if it would destroy the desired crispness. Sauce can be served separately.

## Reference demo meal
The current POC is based on:
- Pork Belly Burnt Ends;
- smashed grenaille potatoes;
- generous fresh yogurt/crème fraîche lemon-herb sauce.

The current hard-coded implementation uses approximately:
- pork belly: 1.2–1.5 kg, ~40 mm cubes;
- smoking: `SMOKER`, 125 °C, smoke on, pellets, directly on grill surface;
- covered phase: compact dish, 1–2 layers, 155–160 °C, smoke off, tightly covered;
- finishing: 175–180 °C uncovered;
- potatoes: 700–800 g, parboiled then `AIR FRY` 205–210 °C in Air Fry basket;
- fresh sauce: about 250 g Greek yogurt + 60–80 g crème fraîche + lemon + herbs/seasoning.

This demo recipe is a starting dataset, not the intended final schema.

## Temperature logging use case
The user may manually probe meat during a cook. Logging should therefore not interrupt execution.

Minimum record:
- timestamp;
- temperature in °C.

Future optional fields:
- food/component;
- probe location;
- note;
- ambient/chamber temperature;
- predicted time to target.

Do not require optional fields for a basic measurement.

## Future adaptive cooking
Possible future signals:
- temperature vs time;
- temperature slope (°C/min);
- elapsed time in phase;
- user-reported tenderness;
- recipe historical sessions;
- current delay vs planned schedule.

Any prediction should expose uncertainty. A temperature curve alone may be misleading during stalls, phase changes, wrapping/covering, probe repositioning, or changes in appliance mode.

## Safety rule
Food-safety guidance must not be inferred from preference or historical recipe notes. When encoding a minimum safe internal temperature, holding time, storage rule, or similar safety-critical statement, verify it against an authoritative current source before treating it as a fixed application rule.
