# Woodfire Companion — Product Source

## Purpose
This file is the current product source of truth for Woodfire Companion.

## Product definition
Woodfire Companion is an illustrated recipe library plus a meal-execution engine for Ninja Woodfire users.

The user chooses what to cook; the application converts that choice into a scaled shopping list, a resource-aware schedule and a low-friction active-cooking interface.

The key product idea is:

**Do not merely explain the recipe. Operationalize the entire meal.**

## Canonical user flow
1. Browse an illustrated recipe/meal library.
2. Open a recipe card and review general information, ingredients, preparation time, cooking time, difficulty and expected result.
3. Choose number of servings.
4. Choose desired serving time.
5. Optionally choose supported meal components/variants.
6. Generate:
   - scaled ingredients;
   - consolidated shopping list;
   - advance-prep reminders;
   - equipment/accessory requirements;
   - full cooking plan.
7. Start cooking.
8. Follow time-stamped cards with short summaries and expandable detail.
9. Record observations and temperatures with minimal interaction.
10. Let actual progress adjust the unfinished plan when required.
11. Finish the meal and retain a cook journal/session record.

## Library experience
Recipe cards should be visual and easy to scan.

Useful metadata:
- hero illustration/image;
- title;
- short description;
- reference servings;
- active preparation time;
- approximate elapsed time;
- difficulty;
- major Woodfire modes;
- tags such as beef, poultry, fish, long cook, quick, smoked, entertaining.

The first version only needs a small high-quality library. Quality and executable planning matter more than recipe count.

## Meal composition
A meal can eventually contain reusable components:
- main;
- side;
- sauce;
- garnish/finishing component.

Example:
- Pork Belly Burnt Ends;
- crispy smashed grenaille potatoes;
- fresh lemon-yogurt sauce.

Components may be replaceable while the planner still treats the selected combination as one meal.

This modularity is desirable but should not block the first multi-recipe release.

## Scaling and configuration
Inputs:
- servings;
- desired serving time;
- optional variants/components where defined by recipe data.

Ingredient scaling should use explicit quantity rules. Not everything scales linearly: cooking vessels, pellet quantity, minimum sauce quantities, seasoning-to-taste items and batch capacity may require caps, steps or notes.

## Shopping list
The app should produce one consolidated list for the selected meal and serving count.

Requirements:
- aggregate duplicate ingredients across components;
- preserve useful units;
- group by practical category where possible (meat, produce, dairy, pantry, etc.);
- provide checkboxes;
- distinguish optional ingredients;
- include pellets or other consumables when recipe-specific.

Future enhancement: pantry/staple memory so common ingredients can default to `already have`. Not required for MVP.

## Pre-cook overview
Before starting, user should see:
- scaled ingredients;
- shopping-list status;
- advance preparation (marinade, thawing, chilling, overnight seasoning, etc.);
- required Woodfire accessories and other equipment;
- calculated recommended start time;
- high-level plan and expected uncertainty/buffers.

## Planning engine
Fixed task offsets are only a POC mechanism.

Target model: recipe/meal steps form a dependency graph with resource requirements and flexible durations.

The planner works primarily backwards from desired serving time while respecting prerequisite chains and shared-resource conflicts.

A step may define:
- stable id;
- component id;
- short title;
- collapsed summary;
- detailed instructions;
- duration or duration range;
- dependencies;
- earliest/latest constraints where useful;
- resources;
- whether user attention is required;
- optional buffer;
- completion criterion;
- delay/recheck behavior.

### Resource examples
- `woodfire` — exclusive cooking resource in the initial product;
- `stovetop` / pot;
- fridge;
- prep workspace/user attention;
- passive resting.

Woodfire configuration may include:
- mode;
- temperature setpoint;
- smoke on/off;
- pellets yes/no/type later if useful;
- grill plate/basket/tray/external dish;
- covered/uncovered;
- placement/spacing guidance.

### Parallelism
The planner should exploit useful parallel work.

Examples:
- sauce preparation can occur while pork cooks;
- potatoes can parboil while the Woodfire remains occupied;
- Air Fry potatoes must wait until the pork releases the single Woodfire.

### Delay propagation
Move dependent unfinished tasks, not unrelated work.

Examples:
- a late sauce that still completes before service should not shift the pork;
- an unexpectedly long covered meat phase should move finishing/rest and competing Woodfire tasks;
- completed steps keep actual historical timestamps.

## Active-cooking UI
Each card has two information levels.

Collapsed card should communicate at a glance:
- planned time/window;
- action;
- expected duration;
- critical Woodfire settings if applicable;
- status.

Expanded card may include:
- quantities used in this step;
- exact method;
- accessory/support;
- spacing/covering/liquid instructions;
- target temperature;
- appearance/tenderness cues;
- what to do if the criterion is not met.

During a cook the UI priority is:
1. next action and countdown;
2. current action;
3. current Woodfire configuration;
4. complete/observe control;
5. temperature logging;
6. expanded details;
7. subsequent steps.

## Observation-driven cooking
Some phases must not be represented as fixed-duration timers only.

A checkpoint can ask for a practical state such as:
- `Encore ferme`;
- `Presque prêt`;
- `Très tendre`.

The answer may:
- complete the step;
- schedule another check after a defined interval;
- change the expected remaining duration;
- recompute dependent tasks.

V1 can implement the dependency framework first; observation-driven rechecks are V1.5 if needed to keep implementation focused.

## Temperature tracking
Manual logging remains a core feature.

Target interaction:
1. enter temperature;
2. tap Add or press Enter;
3. timestamp automatically.

Support:
- target temperature;
- simple graph;
- undo last sample;
- samples linked to session;
- CSV/export if useful.

Future ETA estimation can use temperature slope and historical sessions, but predictions must display realistic uncertainty.

## Cook journal/history
A completed session should eventually store:
- session id;
- recipe and recipe version;
- selected components/variant;
- servings;
- target serving time;
- generated schedule;
- actual completion/check timestamps;
- temperature samples;
- final serving time;
- notes;
- optional rating/adjustment notes.

Future sessions may surface previous observations such as `reduce honey 20%` or an observed cook duration. This stays local-first initially.

## Recipe acquisition strategy
Hybrid model:
- curated base recipes committed to the repo;
- new recipes added progressively through normal repo changes;
- compatible structured JSON can also be authored/generated externally and validated before import/commit.

Runtime AI is not required and should not be a dependency of the cooking workflow.

## Reference platform and constraints
- Primary device: iPhone.
- Distribution: installable PWA through Safari/GitHub Pages.
- Core application: static/client-side.
- Offline operation required for saved recipes and active cooks.
- Local-first persistence.

## Product maturity roadmap
### MVP / reusable V1
- illustrated multi-recipe library;
- servings and serving-time configuration;
- ingredient scaling;
- shopping list;
- structured recipe data;
- dependency/resource-aware plan;
- expandable timed cards;
- active-cook next-action UX;
- manual temperature logging;
- persistent active session;
- offline PWA.

### V1.5
- adaptive observation checkpoints/rechecks;
- modular component swapping where valuable;
- local cook history/journal;
- stronger import/export.

### V2+
- temperature/history-based ETA with uncertainty;
- previous-cook recommendations;
- pantry intelligence;
- optional probe/hardware integration;
- broader appliance resource model only after Woodfire workflow is mature.

## Success criteria
During a real meal:
- user should rarely reopen an external recipe;
- required shopping/prep should be obvious before cooking;
- next action should be obvious during cooking;
- Woodfire configuration should never be ambiguous;
- side dishes and sauces should arrive at the right time without mental scheduling;
- delays should be absorbed rationally;
- temperature logging should be faster than using Notes;
- the final meal should be close to the selected serving time without compromising doneness.