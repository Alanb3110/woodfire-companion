# Woodfire Companion

Mobile-first static PWA for planning and executing complete Ninja Woodfire meals.

Current product flow:

**illustrated recipe library → servings + desired serving time → scaled ingredients/shopping + prep → generated meal plan → active cook → local cook journal**

No server, runtime API or account is required. Active state, shopping checks, settings and journal entries are stored locally in the browser. The application is designed for GitHub Pages and installed iPhone/Safari PWA use, including offline operation after the relevant assets have been cached.

## Current maturity

Woodfire Companion has moved beyond the original single-meal POC.

Implemented today:
- manifest-driven illustrated multi-recipe library;
- serving configuration and planner-derived recommended start time;
- scaled ingredients and categorized shopping/prep checklist;
- dependency-aware serving-time planner;
- Woodfire exclusive-resource conflict resolution;
- buffers, actual timestamps, explicit delays and observation-driven rechecks;
- active-cook `upcoming / active / done` lifecycle;
- fast optional temperature logging;
- versioned active-session migration and frozen recipe snapshots;
- local Cook Journal with rating/notes and JSON backup/restore;
- conservative service-worker update lifecycle for long cooks;
- automated CI acceptance for every executable recipe.

The main remaining product risk is **real-cook qualification**, not basic planner construction.

## Recipe library

`recipes/index.json` is the library manifest and currently exposes 11 executable meals.

### Validated after a documented real-cook refinement loop
- **Pork Belly Burnt Ends** + smashed grenaille potatoes + fresh lemon-yogurt sauce.

### Real-cooked baseline, not yet fully validated
- **Roulé de dinde sucré-salé & gratin de courgettes**;
- **Tacos barbacoa de bœuf fumée** + salsa fumée + garnitures fraîches.

### Technically executable, real-cook qualification still required
- **Saumon laqué soja-miel, asperges & riz citronné**;
- **Poulet shawarma fumé, pommes de terre épicées & sauce yaourt**;
- **Bœuf reverse-sear, grenailles croustillantes & sauce poivre**;
- **Wings miel-soja fumées, potatoes croustillantes & coleslaw**;
- **Magret de canard laqué miel-soja-orange, patate douce & sauce agrumes**;
- **Ribs BBQ fumées, mac & cheese crémeux & coleslaw**;
- **Halloumi grillé, légumes méditerranéens & couscous citronné**;
- **Brochettes de poulet teriyaki, légumes grillés & riz**.

Availability and culinary maturity are intentionally separate. `status: available` means the recipe is executable through the generic application pipeline; `qualification` is `untested`, `test_cooked` or `validated`. See `sources/RECIPE_QUALIFICATION_V1.md`.

## User flow

1. Open the illustrated recipe library.
2. Select an executable meal.
3. Review its real-cook qualification.
4. Choose servings and desired serving time.
5. Review scaled ingredients, shopping/prep and equipment.
6. Start the cook.
7. Follow the generated dependency/resource-aware schedule.
8. Start/complete phases, record observations/rechecks and log temperatures where useful.
9. Correct actual timestamps if a tap was late.
10. Serve the meal and retain the completed session in the local Cook Journal.

DEV builds expose a **Cuisson test** tool that exercises the real active-cook UI around the current clock without waiting through a multi-hour meal. Test sessions do not pollute the real journal.

## Run locally

Do not open `index.html` through `file://`; recipe/library loading and service-worker behavior require HTTP.

```powershell
npx http-server . -p 8000 -c-1
```

Then open `http://localhost:8000`.

`-c-1` disables HTTP caching during development. If localhost still serves stale PWA assets, unregister the localhost service worker in browser developer tools and reload.

## Tests

The project uses Node's built-in test runner and has no npm runtime dependency.

```bash
npm test
```

GitHub Actions runs the suite on pull requests and supported branch pushes. The generic `available`-recipe contract verifies schema/content validation, qualification metadata, min/reference/max scaling, shopping/prep generation, schedule generation, structured active-step quantities, dependencies, service milestone resolution, Woodfire conflict freedom and local illustrated covers.

Additional regression tests cover planner/replanning behavior, midnight handling, buffers/rechecks, session migrations, recipe snapshots, timestamp correction, journal backup/merge, optional temperature capability, PWA/offline contracts and static UI/module wiring.

## Architecture

```text
woodfire-companion/
├── index.html
├── styles.css
├── prep.css
├── journal.css
├── observations.css
├── app.js                       # top-level view/render wiring
├── service-worker.js
├── manifest.webmanifest
├── package.json
├── js/
│   ├── planner.js               # pure low-level scheduling solver
│   ├── meal-planner.js          # stable recipe-facing planning facade
│   ├── active-cook-controller.js# DOM-free active-cook orchestration
│   ├── recipe.js                # recipe validation/scaling
│   ├── step-details.js          # serving-aware step quantity materialization
│   ├── recipe-loader.js
│   ├── library.js               # manifest + qualification semantics
│   ├── shopping.js
│   ├── prep-ui.js
│   ├── session.js               # versioned session state/migrations
│   ├── observations.js
│   ├── temperature.js
│   ├── temperature-ui.js
│   ├── journal.js
│   ├── journal-ui.js
│   ├── timestamp-editor.js
│   ├── dev-tools.js
│   └── settings.js
├── assets/recipes/              # local WebP recipe covers
├── recipes/
│   ├── index.json
│   └── *.json                   # structured executable meals
├── tests/
├── sources/                     # product/technical source of truth
└── icons/
```

Conceptual layers remain:
1. recipe/content data;
2. pure/testable planning engine;
3. session/persistence/orchestration state;
4. UI rendering/interactions.

Do not re-couple recipe-specific timing or quantities into `app.js`.

## Planner status

Planner V1 builds schedules primarily from:
- desired serving timestamp;
- step durations/ranges;
- dependencies;
- planning buffers;
- Woodfire resource reservations/conflicts;
- actual starts and completions;
- expected completion from pending observation rechecks;
- explicit user delays.

The Pork Belly reference is fully migrated away from legacy preferred-start offsets. The Woodfire is currently the only automatically conflict-resolved exclusive resource. Other declared resources can run in parallel but are not generally conflict-solved yet.

Serving count scales ingredients and structured active-cook quantities, but Planner V1 does not synthesize extra batches or automatically alter duration from serving count. Recipe serving ranges must therefore stay within one credible declared execution structure.

## Persistence

Active cook state remains under the compatibility key `woodfire-companion-v1`, with explicit schema migration. Current sessions store separate actual starts/completions and a detached recipe snapshot so a deployed recipe update cannot silently mutate a cook already in progress.

Shopping, settings and Cook Journal use separate stores because their lifecycles differ. The journal supports local JSON backup/restore; active session/settings/shopping remain outside that backup by design.

## PWA / update contract

The service worker uses a separate cache generation and the normal waiting lifecycle. A newly deployed worker must not force activation over an already-open multi-hour cook. It activates after controlled clients close, then the next launch uses the new generation.

This behavior is covered by automated contracts but still requires periodic installed-iPhone qualification, especially across offline/online transitions and deployed updates.

## Current priorities

1. Keep source documentation synchronized with `main`.
2. Qualify the executable library through representative real cooks; record feedback in the Cook Journal and promote durable findings into recipe/source revisions.
3. Prioritize test cooks that exercise distinct planner patterns: fast temperature-driven/parallel work, genuine Woodfire conflict, and long tenderness/recheck behavior.
4. Continue small `app.js` extractions only when UI/orchestration responsibility becomes materially hard to reason about; do not introduce a framework for its own sake.
5. Complete repository hygiene: inventory stale branches and protect `main` with CI when repository settings allow it.
6. Extend planning windows, non-Woodfire conflict handling, reusable components or batching only when a real meal demonstrates the need.
7. Defer predictive ETA until enough clean real-cook history exists to express uncertainty honestly.

## Key sources

- `sources/PRODUCT_SPEC.md`
- `sources/RECIPE_MODEL.md`
- `sources/RECIPE_SCHEMA_V1.md`
- `sources/RECIPE_QUALIFICATION_V1.md`
- `sources/MULTI_RECIPE_CONTRACT.md`
- `sources/PLANNER_V1.md`
- `sources/ACTIVE_COOK_V1.md`
- `sources/SESSION_V3.md`
- `sources/COOK_JOURNAL_V2.md`
- `sources/TECHNICAL_CONTEXT.md`
