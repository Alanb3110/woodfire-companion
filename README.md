# Woodfire Companion

Mobile-first static PWA for planning and executing complete Ninja Woodfire meals.

Current product flow:

**recipe library → recipe configuration → scaled ingredients → active cook**

Target flow remains:

**illustrated recipe library → servings + desired meal time → shopping list → generated meal plan → active cook → journal**

No server, runtime API or account is required. Active state is stored locally in the browser and the app is designed to work offline after its assets are cached.

## Current library

The library is driven by `recipes/index.json`.

Available now:
- Pork Belly Burnt Ends + smashed grenaille potatoes + fresh lemon-yogurt sauce.

Visible as future entries, but not executable until complete recipe JSON exists:
- Poulet coréen sucré-salé;
- Barbacoa de bœuf fumée.

The executable meal lives in `recipes/pork-belly-burnt-ends.json` rather than being hard-coded into `app.js`.

## Current user flow

1. Open the recipe library.
2. Select an available recipe.
3. Review metadata, meal components and scaled ingredients.
4. Choose number of servings.
5. Choose serving time using an explicit 24-hour selector.
6. Start the cook.
7. Follow the planning checklist and temperature tracker.
8. Return to the library without destroying the active cook; resume it from the library later.

## Run locally

Do not open `index.html` directly with `file://` because recipe/library loading and the service worker require HTTP.

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

Tests cover recipe validation/scaling, planning/date/dependency/resource behavior, library-manifest validation, version consistency and the static DOM contract between `app.js` and `index.html`.

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

After the first successful online load, the service worker caches the application shell, library manifest, modules and executable recipe JSON for offline use.

## Current features

### Library / recipe configuration
- recipe-library manifest;
- visual recipe cards;
- available vs coming-soon status;
- recipe metadata/components;
- serving-size selector;
- live scaled ingredient quantities;
- 24-hour serving-time selector;
- active-cook resume path.

### Planning
- desired serving time;
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
│   ├── library.js          # recipe-library manifest loader/validation
│   ├── planner.js          # pure planning functions
│   ├── recipe.js           # validation/scaling/formatting
│   └── recipe-loader.js    # recipe JSON loader + validation
├── recipes/
│   ├── index.json
│   └── pork-belly-burnt-ends.json
├── tests/
├── sources/                # product/technical source of truth
└── icons/
```

## Planner status

The schema records durations, dependencies, resources, completion criteria and structured Woodfire state.

The planner still keeps `plan.preferredStartOffsetMin` as a compatibility placement hint. The library/configuration increment intentionally does not change planner semantics at the same time as navigation/UI.

The next planner iteration should increasingly derive timing from dependencies, buffers and resource constraints rather than preferred offsets.

See:
- `sources/PRODUCT_SPEC.md`
- `sources/RECIPE_MODEL.md`
- `sources/RECIPE_SCHEMA_V1.md`
- `sources/TECHNICAL_CONTEXT.md`

## Persistence

The existing `woodfire-companion-v1` localStorage record is retained for compatibility. New view/serving/library fields are merged with old records rather than invalidating them.

A later cook-journal implementation may justify explicit storage schema migration and/or IndexedDB.
