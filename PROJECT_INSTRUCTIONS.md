# Woodfire Companion — Project Instructions

## 1. Mission
Woodfire Companion is a mobile-first cooking companion for the Ninja Woodfire. Its primary job is to help execute a meal reliably and on time, not merely display recipes.

The product should combine:
- recipe guidance;
- a dynamically scheduled cooking checklist built around the desired serving time;
- explicit Ninja Woodfire operating instructions (mode, temperature, smoke on/off, pellets, grill plate/basket/tray, covered/uncovered);
- very fast manual temperature logging;
- later, adaptive timing based on actual progress and temperature evolution.

The application is currently a static PWA hosted on GitHub Pages. Prefer simple client-side solutions unless a backend clearly creates enough value to justify the added complexity.

## 2. Product principles
1. **Execution first.** During cooking, the next action, its time, and the exact Woodfire setup must be more visible than explanatory prose.
2. **Few taps.** Common actions should take 1–3 taps. Temperature logging in particular must be extremely fast.
3. **Mobile first.** iPhone/PWA use is the reference UX; desktop is secondary.
4. **Offline capable.** Core recipe execution, checklist state, and temperature logging must continue without network access.
5. **One source of truth.** Recipes and cooking plans should live in structured data rather than being hard-coded into UI logic.
6. **Relative scheduling.** Plans should normally be defined relative to a target serving time, then recalculated automatically.
7. **Adaptive rather than brittle.** Durations are estimates. Where possible, use state/temperature/tenderness criteria and allow remaining steps to shift without rewriting completed history.
8. **Explicit hardware instructions.** Never write only “cook at 180 °C” when the Woodfire configuration matters. State mode, setpoint, smoke, pellets, support, covering, and placement.
9. **Food quality over exact clock time.** The schedule should contain buffers and distinguish hard deadlines from flexible windows.
10. **No unnecessary complexity.** Avoid frameworks, servers, accounts, databases, or APIs until they solve an identified problem.

## 3. Current V1 scope
The existing proof of concept contains:
- a serving-time-driven checklist;
- expandable task details;
- completion state with timestamps;
- +5/+10/+15 min shift of unfinished tasks;
- next-task countdown;
- manual temperature entry with automatic timestamp;
- temperature target and chart;
- CSV export;
- local persistence via `localStorage`;
- PWA/offline support through a service worker.

The initial demo meal is Pork Belly Burnt Ends + smashed grenaille potatoes + fresh sauce.

## 4. Near-term architecture direction
Refactor toward this conceptual separation:

- `recipes/`: structured recipe definitions and default plans;
- planning engine: converts relative steps and dependencies into actual times;
- cook session state: target serving time, completed tasks, shifts, temperatures, notes;
- UI: renders the plan and captures user actions;
- persistence: local-first storage, with import/export before any cloud sync.

Recipe content must not remain embedded in `app.js` long term.

A recipe step should be able to express, where relevant:
- stable `id`;
- title and short instruction;
- relative timing or dependency on another step;
- expected duration/window;
- blocking/non-blocking status;
- Woodfire mode and temperature;
- smoke/pellet state;
- required support/accessory;
- covered/uncovered state;
- ingredient quantities involved in that step;
- completion criterion (time, temperature, tenderness, appearance, etc.);
- optional buffer;
- whether downstream steps should move if it is delayed.

## 5. Planning behaviour
Default logic:
- user selects a desired serving time;
- the app computes all planned times backwards/forwards from that target;
- completed steps keep their actual completion timestamps;
- delaying the cook should normally move only unfinished dependent steps;
- parallel tasks (e.g. sauce preparation while meat cooks) must remain parallel when possible;
- the UI should highlight the critical path and the next useful action;
- if a cooking criterion is reached early/late, future timing should be recalculated rather than forcing the original schedule.

Future adaptive planning may use temperature slope and historical cook sessions, but predictions must clearly show uncertainty and must never imply false precision.

## 6. Recipe-writing rules
For every recipe intended for the app:
- use metric quantities by default;
- give ingredient quantities for the stated serving size;
- include approximate dimensional cues when useful (e.g. 40 mm cubes);
- distinguish preparation, cooking, resting, finishing and service;
- state internal-temperature targets only where they are meaningful;
- include sensory criteria when temperature alone is insufficient;
- specify whether meat/potatoes should be spaced, stacked, placed in a compact dish, covered with foil, etc.;
- explicitly state whether liquid should surround, partially cover, or merely wet the bottom of the food;
- state whether smoke is actually desired during each phase rather than assuming it;
- avoid contradictory instructions between recipe text, timeline, and UI cards.

House style/preferences currently known:
- generous sauces are preferred;
- sweet-savoury profiles are welcome;
- thyme is generally not a preferred flavour;
- avoid alcohol/flambé unless explicitly requested;
- practical Woodfire-specific guidance is more useful than generic oven instructions.

## 7. Data and evidence
Separate three kinds of information:
1. **User preference** — subjective and should be configurable where reasonable.
2. **Recipe choice** — a deliberate culinary decision that may have alternatives.
3. **Food-safety / equipment fact** — should be based on reliable guidance and not invented.

When uncertain about Ninja Woodfire behaviour or a safety-critical cooking claim, verify against current official documentation or authoritative food-safety guidance before encoding it as a fixed rule.

## 8. UX rules
During an active cook, prioritize:
1. next action and countdown;
2. current Woodfire state/configuration;
3. completion control;
4. temperature entry;
5. expanded details only on demand.

Avoid dense recipe pages during execution. Large touch targets, readable contrast, and one-handed use are preferred.

Do not reset or destroy an active session accidentally. Destructive actions such as “new cook” should require an explicit confirmation or an easy undo path.

## 9. Development rules
- Keep the app deployable on GitHub Pages.
- Prefer vanilla HTML/CSS/JS while the product remains small; introduce a framework only when complexity justifies it.
- Preserve PWA paths so deployment under `/woodfire-companion/` works.
- Avoid breaking existing local data without a migration path when storage schemas change.
- Keep recipe data separate from rendering code.
- Add small automated tests for planning/date calculations once the planning engine is extracted.
- Test on an actual iPhone/Safari/PWA flow for meaningful UX changes.
- Update documentation when data format or user-visible behaviour changes.

## 10. Current priorities
1. Define the product and recipe data model.
2. Move the demo recipe out of `app.js`.
3. Support multiple recipes/meals.
4. Improve planning from simple offsets toward dependencies and flexible durations.
5. Keep temperature logging extremely fast.
6. Add session import/export/backup before considering cloud accounts.

## 11. Out of scope unless explicitly promoted
- social/community features;
- public recipe marketplace;
- user accounts;
- cloud backend;
- paid APIs;
- direct smart-probe integration;
- ESP32/IoT hardware integration.

These can be revisited after the core cooking workflow is proven useful.