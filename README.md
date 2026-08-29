# Woodfire Companion

Mobile-first static PWA for planning and executing complete Ninja Woodfire meals.

The current UI is still the original Pork Belly proof of concept, but recipe content and planning logic are now separated so the app can evolve toward:

**illustrated recipe library → servings + desired meal time → shopping list → generated meal plan → active cook → journal**

No server, runtime API or account is required. Active state is stored locally in the browser and the app is designed to work offline after its assets are cached.

## Current reference meal

- Pork Belly Burnt Ends
- smashed grenaille potatoes
- fresh lemon-yogurt sauce

The meal now lives in `recipes/pork-belly-burnt-ends.json` rather than being hard-coded into `app.js`.

## Run locally

Do not open `index.html` directly with `file://` because recipe loading and the service worker require HTTP.

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Tests

The project uses Node's built-in test runner and has no npm runtime dependency.

```bash
npm test
```

Tests currently cover recipe validation/scaling plus core planning/date/dependency/resource behavior.

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

After the first successful online load, the service worker caches the application shell, recipe modules and current recipe JSON for offline use.

## Current features

### Planning
- desired serving time, default 20:00;
- interactive checklist;
- expandable step detail;
- exact structured Woodfire configuration for relevant steps;
- +5/+10/+15 min compatibility shift for unfinished tasks;
- next-task countdown;
- actual completion timestamps.

### Temperature tracking
- very fast manual entry;
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
├── app.js                  # UI/session orchestration
├── service-worker.js
├── manifest.webmanifest
├── package.json
├── js/
│   ├── planner.js          # pure planning functions
│   ├── recipe.js           # validation/scaling/formatting
│   └── recipe-loader.js    # JSON loader + validation
├── recipes/
│   └── pork-belly-burnt-ends.json
├── tests/
│   ├── planner.test.js
│   └── recipe.test.js
├── sources/                # product/technical source of truth
└── icons/
```

## Planner status

The schema already records durations, dependencies, resources, completion criteria and structured Woodfire state.

The first refactor intentionally keeps `plan.preferredStartOffsetMin` as a compatibility placement hint so the existing POC timeline remains unchanged while architecture is separated and tested.

The next planner iteration should increasingly derive timing from dependencies, buffers and resource constraints rather than preferred offsets.

See:
- `sources/PRODUCT_SPEC.md`
- `sources/RECIPE_MODEL.md`
- `sources/RECIPE_SCHEMA_V1.md`
- `sources/TECHNICAL_CONTEXT.md`

## Persistence

The existing `woodfire-companion-v1` localStorage record is retained for compatibility. The recipe id/version are added without invalidating old records.

A later cook-journal implementation may justify schema migration and/or IndexedDB, but that is intentionally not part of this architecture refactor.
