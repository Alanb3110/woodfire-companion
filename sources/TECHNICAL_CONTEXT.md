# Woodfire Companion — Technical Context Source

## Current implementation
Woodfire Companion is currently a zero-backend static PWA deployed from a GitHub repository and intended for GitHub Pages.

Current top-level files:
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `README.md`
- `icons/`

The application is written in vanilla HTML/CSS/JavaScript.

## Current state model
The POC uses a single `localStorage` record with the key:

`woodfire-companion-v1`

Current logical fields include:
- `mealTime`;
- `completed`;
- `taskShifts`;
- `temperatureTarget`;
- `measurements`;
- `cookStartedAt`;
- `activeTab`.

When this schema evolves, preserve existing user data where practical through migration rather than silently discarding it.

## Current recipe model
The demo recipe is directly embedded as a JavaScript object in `app.js`.

Each task currently contains some subset of:
- `id`;
- `offset` in minutes relative to meal time;
- `title`;
- `subtitle`;
- `mode`;
- `details`.

This model is intentionally considered transitional.

## Architectural target
Move toward four layers:

### 1. Recipe/content data
Static structured files describing recipes and meal plans. JSON or JS modules are both acceptable for the near term; choose the format that keeps GitHub Pages and offline support simple.

### 2. Planning engine
Pure functions responsible for:
- target serving time conversion;
- dependency resolution;
- resource conflicts;
- delay propagation;
- critical-path/next-task calculation;
- schedule recomputation.

This code should be testable without DOM access.

### 3. Session/state layer
Responsible for:
- active recipe/version;
- target time;
- servings;
- task completion;
- actual timestamps;
- temperature samples;
- notes;
- persistence and schema migration.

### 4. UI layer
Responsible for rendering and user interactions only. Avoid duplicating scheduling logic in event handlers or rendering functions.

## Candidate recipe schema
The exact schema is not frozen, but a task may eventually resemble:

```json
{
  "id": "covered-pork",
  "title": "Cuisson couverte",
  "durationMin": 60,
  "dependsOn": ["smoke-pork"],
  "resource": "woodfire",
  "woodfire": {
    "mode": "BAKE_ROAST",
    "temperatureC": 160,
    "smoke": false,
    "support": "compact_dish",
    "covered": true
  },
  "completion": {
    "type": "tenderness",
    "description": "La sonde entre facilement dans plusieurs cubes"
  }
}
```

Do not adopt this literally without validating the planner requirements first.

## PWA constraints
- Assets must work when the site is served from the repository subpath on GitHub Pages.
- Service-worker cache names should be versioned when assets change materially.
- Offline fallback must not depend on a server route rewrite.
- Installation on iOS/Safari remains a target use case.

## Storage direction
Near term:
- keep active state local;
- introduce explicit schema versioning;
- add export/import JSON for backup and portability;
- optionally retain CSV for temperature data.

Later, IndexedDB may be preferable to `localStorage` for multiple sessions/history, but migration should be driven by actual data complexity rather than done pre-emptively.

## Testing priorities
Once planning is extracted from the UI, add tests for at least:
- converting target meal time + offsets to timestamps;
- tasks crossing midnight;
- dependencies and parallel tasks;
- propagation of delays through dependent tasks only;
- completed tasks remaining fixed;
- shared Woodfire resource conflicts;
- target serving time changes;
- storage migrations.

## Git workflow
Use small focused branches/PRs for meaningful changes. Do not mix large UI redesigns with planning-engine refactors when avoidable.

Documentation should make clear whether a change affects:
- recipe data;
- planner semantics;
- storage schema;
- UI only.

## Current technical debt
1. Single recipe embedded in `app.js`.
2. Scheduling based only on fixed offsets.
3. Global unfinished-task shifting rather than dependency-aware propagation.
4. UI, state, recipe data and scheduling logic coupled in one JavaScript file.
5. `localStorage` model not designed for multi-session history.
6. No automated planner tests yet.

These are acceptable for a POC but should guide the next refactor.