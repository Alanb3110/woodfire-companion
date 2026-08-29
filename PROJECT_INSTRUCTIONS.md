# Woodfire Companion — Project Instructions

## Mission
Woodfire Companion is a mobile-first cooking copilot for the Ninja Woodfire. It must turn a chosen meal into an executable plan that gets the whole meal ready near the desired serving time.

The product is not primarily a recipe reader. Its differentiator is the orchestration layer between recipe content and real cooking.

Canonical flow:

**recipe library → meal configuration → shopping list → generated plan → active cook → cook journal**

## Product principles
1. **Execution first.** During cooking, show what to do now, what happens next, and the exact Woodfire configuration.
2. **Whole-meal planning.** Include meat, sides, sauces, stovetop work, chilling, resting, plating and advance preparation—not only appliance time.
3. **Few taps.** Frequent actions should take 1–3 taps. Temperature logging must remain extremely fast.
4. **Mobile first.** iPhone/PWA is the reference UX; desktop is secondary.
5. **Offline capable.** Recipe viewing, planning, active cooking and logging must work without network access once assets are cached.
6. **Structured content.** Recipes must live in reusable structured data, not UI code.
7. **Dependency-aware scheduling.** Plans are generated from durations, dependencies, resource constraints and serving time rather than a fixed list of offsets.
8. **Adaptive rather than brittle.** Cooking durations are estimates. User observations, temperature and actual completion times may change the remaining plan.
9. **Explicit hardware state.** For Woodfire steps specify mode, setpoint, smoke on/off, pellets, support/accessory, covered/uncovered and relevant placement.
10. **Food quality over false punctuality.** Use buffers and completion criteria; do not sacrifice doneness to preserve an arbitrary timestamp.
11. **Simple architecture first.** Keep the static GitHub Pages/PWA model until a backend solves a demonstrated need.

## Reference user journey
### 1. Library
Show illustrated recipe/meal cards with useful summary metadata such as total time, active preparation time, difficulty, serving range and major Woodfire modes.

Allow lightweight filtering later (quick, long cook, beef, poultry, fish, smoked, entertaining, etc.).

### 2. Meal configuration
User selects:
- number of servings;
- desired serving time;
- optional meal components when supported (side, sauce, garnish, etc.).

Recipes may be modular. A main dish, side and sauce can be reusable components while still being presented as one coherent meal.

### 3. Pre-cook output
Generate:
- scaled ingredients;
- consolidated shopping list;
- advance-preparation requirements;
- equipment/accessory list;
- calculated start time;
- full schedule.

A later pantry feature may mark staples as already available, but it is not required for the first reusable version.

### 4. Planning
Each planned step has:
- scheduled time or time window;
- concise collapsed summary;
- expandable detailed instructions;
- expected duration;
- dependencies;
- resource requirements;
- completion criterion;
- optional buffer/flexibility.

The planner must permit parallel work where resources allow it and resolve conflicts where they do not.

The Ninja Woodfire is initially a single exclusive cooking resource. Stovetop/pot work, fridge time, passive resting and user-attention constraints may coexist when feasible.

### 5. Active cook
Prioritize:
1. next action + countdown;
2. current active step;
3. exact Woodfire configuration;
4. completion/observation controls;
5. rapid temperature entry;
6. detailed instructions on demand;
7. upcoming steps.

Some cooking phases should end by observation rather than timer alone. Example responses may include `Encore ferme`, `Presque prêt`, `Très tendre`; the planner can schedule the next check or recompute downstream timing.

### 6. Journal
Retain completed cook sessions locally with recipe/version, servings, planned vs actual timing, temperature samples and freeform notes/rating where useful.

Future sessions may surface previous notes such as ingredient adjustments or observed cooking duration.

## Recipe/content strategy
Use a hybrid model:
- ship a curated base library in the repository;
- add recipes progressively as structured repo content;
- allow recipes to be authored externally (including with ChatGPT) and imported/committed in the same validated schema.

The application must not require AI/API access to execute a recipe.

## Planning maturity
### V1
- dependencies;
- durations/windows;
- resource conflicts;
- buffers;
- serving-time back-planning;
- dependency-aware delay propagation;
- manual temperature logging;
- local persistence.

### V1.5
- observation-driven checkpoints;
- adaptive rechecks;
- improved cook journal/history;
- reusable meal components.

### V2+
- ETA estimation from temperature evolution and historical sessions;
- uncertainty ranges rather than false precision;
- optional richer pantry/history intelligence;
- hardware/probe integration only if it creates clear value.

## Recipe-writing rules
For every recipe:
- metric units by default;
- defined reference serving size and scalable quantities;
- preparation, cooking, resting, finishing and service separated;
- Woodfire settings explicit for every relevant phase;
- internal-temperature targets only where meaningful;
- sensory/tenderness criteria where time or temperature alone is insufficient;
- placement/spacing/covering/liquid-level instructions when relevant;
- no contradiction between overview, ingredient quantities, task timeline and active-cook cards.

Known house preferences should be treated as defaults, not universal recipe facts: generous sauces, sweet-savoury profiles welcome, thyme generally avoided, alcohol/flambé avoided unless explicitly wanted.

## Development rules
- Keep deployment compatible with GitHub Pages and the `/woodfire-companion/` subpath.
- Prefer vanilla HTML/CSS/JS while complexity remains manageable.
- Separate recipe data, planner, session state/persistence and UI.
- Planner logic should be pure/testable without DOM access.
- Version storage schemas and migrate existing local data where practical.
- Preserve offline support.
- Test meaningful UX changes on iPhone/Safari/PWA.
- Use focused branches/PRs for non-trivial changes.
- Update sources when product semantics or data models change.

## Current priorities
1. Freeze a usable recipe/meal/component data model.
2. Extract the demo meal from `app.js`.
3. Build an illustrated multi-recipe library.
4. Add servings + serving-time configuration.
5. Generate consolidated ingredients/shopping list.
6. Replace fixed offsets with dependency/resource-aware planning.
7. Rebuild active-cook UX on top of the planner while preserving fast temperature logging.
8. Add local cook history/journal.

## Out of scope for the initial product
- accounts/cloud backend;
- social/community recipe marketplace;
- AI calls required at runtime;
- paid APIs;
- direct smart-probe/ESP32 integration;
- broad support for every cooking appliance.

The architecture may generalize to ovens, cooktops or other grills later, but the product remains Woodfire-focused until its core workflow is proven.