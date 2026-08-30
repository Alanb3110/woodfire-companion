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
8. **Adaptive rather than brittle.** Cooking durations are estimates. User observations, temperature and actual start/completion times may change the remaining plan.
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

Steps use an explicit lifecycle: `upcoming → active → done`, with separate actual start and completion timestamps. Instant/manual actions may complete in one interaction; long phases should remain visibly active until actually finished.

Some cooking phases end by observation rather than timer alone. Example responses may include `Encore ferme`, `Presque prêt`, `Très tendre`; the planner schedules the next check and recomputes downstream timing when needed.

Actual step/control timestamps must remain editable so a late tap can be corrected without turning a historical fact into an arbitrary delay.

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
### V1 — implemented foundation
- dependencies;
- durations/windows;
- Woodfire resource conflicts;
- buffers;
- serving-time back-planning;
- dependency-aware delay propagation;
- actual start/completion timestamps;
- manual temperature logging;
- local persistence with migrations.

### V1.5 — current product work
- observation-driven checkpoints and adaptive rechecks;
- explicit current-step/Woodfire state;
- stronger journal/history UX;
- reusable meal components where proven useful;
- richer test/dev tooling for active-cook scenarios;
- continued removal of duplicate timing/content sources of truth.

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
- no contradiction between overview, ingredient quantities, task timeline and active-cook cards;
- user-facing ingredient lists must include actionable baseline quantities/ranges instead of only `au goût`.

Known house preferences should be treated as defaults, not universal recipe facts: generous sauces, sweet-savoury profiles welcome, thyme generally avoided, alcohol/flambé avoided unless explicitly wanted.

## Development rules
- Keep deployment compatible with GitHub Pages and the `/woodfire-companion/` subpath.
- Prefer vanilla HTML/CSS/JS while complexity remains manageable.
- Separate recipe data, planner, session state/persistence and UI.
- Planner logic should be pure/testable without DOM access.
- Version storage schemas and migrate existing local data where practical.
- Freeze an active cook on a recipe snapshot so later recipe deployments cannot alter a session in progress.
- Preserve offline support.
- Test meaningful UX changes on iPhone/Safari/PWA.
- Use focused branches/PRs for non-trivial changes.
- Update sources when product semantics or data models change.

## Current priorities
1. Keep recipe configuration and active-cook timing derived from the same planner source of truth.
2. Continue extracting session/active-cook/temperature responsibilities from the growing `app.js` orchestrator without introducing a framework.
3. Improve journal usefulness with notes/rating and previous-cook feedback where it reduces future cooking uncertainty.
4. Make temperature tracking explicitly optional before promoting recipes where probe logging is not useful.
5. Add another structurally different executable recipe (barbacoa is a good long-cook/recheck candidate) to keep exercising the generic contract.
6. Introduce reusable components/batching/resource extensions only when real recipes demonstrate the need.
7. Keep DEV test-cook scenarios representative enough to exercise midnight, rechecks, parallel tasks, timestamp correction and replanning quickly.
8. Defer predictive ETA until enough clean historical cook data exists to express uncertainty honestly.

## Out of scope for the initial product
- accounts/cloud backend;
- social/community recipe marketplace;
- AI calls required at runtime;
- paid APIs;
- direct smart-probe/ESP32 integration;
- broad support for every cooking appliance.

The architecture may generalize to ovens, cooktops or other grills later, but the product remains Woodfire-focused until its core workflow is proven.
