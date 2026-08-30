# Woodfire Companion

Mobile-first static PWA for planning and executing complete Ninja Woodfire meals.

Current product flow:

**recipe library → servings + desired serving time → ingredients/courses + prep → generated meal plan → active cook → local cook journal**

No server, runtime API or account is required. Active state, shopping checks, settings and journal entries are stored locally in the browser. The app is designed to work offline after its assets and available recipes have been cached.

## Current library

The library is driven by `recipes/index.json`.

Executable now:
- **Pork Belly Burnt Ends** + smashed grenaille potatoes + fresh lemon-yogurt sauce;
- **Roulé de dinde sucré-salé & gratin de courgettes**;
- **Tacos barbacoa de bœuf fumée** + salsa fumée + garnitures fraîches.

Recipe content lives in structured JSON under `recipes/` rather than being hard-coded into `app.js`.

## Current user flow

1. Open the recipe library.
2. Select an available recipe.
3. Choose servings and desired serving time.
4. Review scaled ingredients/courses, advance prep and equipment.
5. Start the cook.
6. Follow dependency-aware planning with explicit active/upcoming/done step states.
7. Use observations/rechecks when doneness matters more than a timer.
8. Log temperatures manually when useful.
9. Correct actual step/control timestamps if a tap was made late.
10. Finish the meal and keep the completed session in the local cook journal.

DEV builds also expose a **Cuisson test** tool to exercise the real active-cook UI around the current clock without waiting through a multi-hour meal. Test sessions do not pollute the real journal.

## Run locally

Do not open `index.html` directly with `file://` because recipe/library loading and the service worker require HTTP.

With the project's existing Node setup, the simplest option on Windows/PowerShell is:

```powershell
npx http-server . -p 8000 -c-1
```

Then open:

```text
http://localhost:8000
```

`-c-1` disables HTTP caching during development. If the local PWA still serves stale assets, unregister the localhost service worker from the browser dev tools and reload.

## Tests

The project uses Node's built-in test runner and has no npm runtime dependency.

```bash
npm test
```

GitHub Actions runs the suite on pull requests and supported branch pushes. Coverage includes recipe/schema validation, generic acceptance of every `available` recipe, scaling/shopping, serving-time planning, dependencies/resources, buffers/rechecks, session migrations/lifecycle, journal behavior, DEV test-cook contracts, version consistency and static DOM/module contracts.

## GitHub Pages

Deploy from the `main` branch and repository root.

Typical URL:

```text
https://<username>.github.io/woodfire-companion/
```

All app paths are relative so deployment from the repository subpath remains supported.

## Install on iPhone

In Safari:

1. Open the GitHub Pages URL.
2. Tap **Partager**.
3. Choose **Sur l’écran d’accueil**.
4. Tap **Ajouter**.

After the first successful online load, the service worker caches the application shell, library manifest and every recipe marked `available` for offline use.

## Current features

### Library / pre-cook
- manifest-driven multi-recipe library;
- local illustrated SVG covers for every executable recipe, reused in cards and recipe heroes;
- available vs coming-soon status;
- recipe metadata/components;
- serving-size selector;
- scaled ingredient/course checklist;
- recipe-version-scoped shopping progress;
- advance-prep and equipment lists;
- 24-hour serving-time selector;
- active-cook resume path;
- local cook journal.

### Planner / active cook
- desired serving-time anchor;
- dependency-aware backward planning;
- buffers and parallel work;
- Woodfire exclusive-resource conflict handling;
- exact structured Woodfire configuration for relevant steps;
- `upcoming / active / done` lifecycle with separate actual start/end timestamps;
- next action + countdown;
- current active step / Woodfire state;
- observation-driven rechecks such as `Encore ferme / Presque prêt / Très tendre`;
- +5/+10/+15 min explicit delay on the next unfinished action;
- dependency-aware replanning from actual starts, finishes and pending rechecks;
- editable real timestamps for late taps.

### Temperature tracking
- fast manual entry;
- automatic timestamps;
- adjustable target;
- chart;
- undo last sample;
- CSV export;
- persistent local state.

## Architecture

```text
woodfire-companion/
├── index.html
├── styles.css
├── prep.css
├── journal.css
├── observations.css
├── app.js                     # top-level UI/orchestration
├── service-worker.js
├── manifest.webmanifest
├── package.json
├── js/
│   ├── planner.js             # pure low-level scheduling solver
│   ├── meal-planner.js        # stable recipe-facing planner facade
│   ├── recipe.js              # validation/scaling/Woodfire formatting
│   ├── recipe-loader.js
│   ├── library.js
│   ├── session.js             # versioned active-session state/migrations
│   ├── observations.js
│   ├── shopping.js
│   ├── prep-ui.js
│   ├── journal.js
│   ├── journal-ui.js
│   ├── timestamp-editor.js
│   ├── dev-tools.js
│   ├── settings.js
│   └── start-hint.js
├── assets/
│   └── recipes/                 # local illustrated recipe covers
├── recipes/
│   ├── index.json
│   ├── pork-belly-burnt-ends.json
│   ├── sweet-savory-turkey-zucchini-gratin.json
│   └── smoked-beef-barbacoa.json
├── tests/
├── sources/                   # product/technical source of truth
└── icons/
```

## Planner status

Planner V1 derives executable schedules from:
- desired serving time;
- step durations;
- dependencies;
- planning buffers;
- resource requirements/conflicts;
- actual starts/completions;
- explicit delays;
- pending observation rechecks.

The Pork Belly reference no longer depends on legacy fixed start offsets. The Woodfire is the initial exclusive resource; other resources such as oven/stovetop/fridge/passive work may run in parallel but are not yet generally conflict-solved.

Serving count is carried through the planner context but Planner V1 does not yet synthesize extra batches or alter durations automatically from serving count. Recipe serving ranges therefore remain limited to quantities that can use the same declared execution structure.

See:
- `sources/PRODUCT_SPEC.md`
- `sources/RECIPE_MODEL.md`
- `sources/RECIPE_SCHEMA_V1.md`
- `sources/PLANNER_V1.md`
- `sources/ACTIVE_COOK_V1.md`
- `sources/MULTI_RECIPE_CONTRACT.md`
- `sources/SESSION_V3.md`
- `sources/TECHNICAL_CONTEXT.md`

## Persistence

Active cook state remains in the compatibility namespace `woodfire-companion-v1`, but the stored record now carries an explicit schema version and migrations. Session V3 separates actual starts/completions, stores a recipe snapshot so an in-progress cook is insulated from later recipe deployments, and marks DEV test sessions explicitly.

The cook journal and settings/shopping stores remain separate because their lifecycles differ from the active session.
