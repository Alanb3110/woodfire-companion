# Woodfire Companion — Cook Journal V1 Source

## Scope
Cook Journal V1 stores completed meal sessions locally and exposes them from the recipe library. It is local-first/offline and does not introduce accounts, cloud storage or a backend.

A journal entry is created automatically when the recipe's `serve` anchor step is completed.

## Storage
Journal data uses a dedicated versioned namespace:

`woodfire-companion-journal-v1`

Stored shape:

```json
{
  "schemaVersion": 1,
  "entries": []
}
```

The active-cook state remains under `woodfire-companion-v1`; shopping and UI preferences keep their existing independent keys.

Clearing the journal must not clear the active cook, shopping checks or UI preferences.

## Session identity
Every new cook gets:
- stable `sessionId`;
- `sessionStartedAt`;
- absolute `targetServingAt`;
- optional `sessionServedAt` once service is completed.

Older active sessions remain readable. When legacy progress has no journal/session metadata, the app creates compatible metadata from the existing progress timestamps and current target meal time.

`targetServingAt` prevents a resumed cook from being silently rebound to a different calendar day.

## Archive trigger
The recipe's `serve` anchor is the completion trigger.

When it is checked:
1. actual completion is recorded as usual;
2. Planner V1 recalculates the final feasible schedule;
3. the current session is upserted into the journal under `sessionId`.

The operation is idempotent: later temperature samples or edits update the same entry instead of creating duplicates.

If the serve completion is removed while editing the same session, the corresponding journal entry is removed until the meal is marked served again.

## Entry snapshot
A V1 entry stores:
- journal schema version;
- session id;
- recipe id/version/title;
- servings;
- target meal time + absolute target serving timestamp;
- session start and actual served timestamp;
- temperature target;
- all manual temperature samples;
- actual completed-step timestamps;
- explicit step delays;
- total recipe step count;
- schedule snapshot for every step.

Each schedule record retains:
- step id/title/component;
- baseline start/end;
- final replanned start/end.

This preserves enough history for later analysis without depending on the current recipe file remaining unchanged.

## Library UI
The library shows a `Cuissons passées` section below recipe cards.

Each journal card is collapsed by default and shows:
- service date;
- recipe title;
- actual service time;
- target service time;
- service delta when available.

Expanding a card shows:
- servings;
- completed/total steps;
- temperature sample count;
- planned/replanned step times and actual completion times;
- recent temperature measurements.

The raw journal retains all measurements even when the compact UI displays only the most recent subset.

## Active vs completed cook
Once a session has been served, it should no longer appear as `CUISSON EN COURS` in the library.

Starting a new cook creates a new `sessionId`; the prior served entry stays in the journal.

## Clear behavior
The library exposes an explicit journal-clear action with confirmation.

V1 does not yet provide selective entry deletion/export/import. Those can be added when needed.

## Limitations / future work
Journal V1 does not yet provide:
- notes or rating after a cook;
- photos;
- per-cook ingredient substitutions;
- journal search/filter;
- JSON export/import/backup;
- cross-device sync;
- statistical comparison across repeated cooks;
- automatic ETA learning.

The stored structure is intentionally rich enough to support later comparison/learning while keeping the current UI simple.
