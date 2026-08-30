# Woodfire Companion — Cook Journal V2 Source

## Scope
Cook Journal V2 extends the local completed-cook history with lightweight feedback for the next cook while preserving all V1 timing/temperature/history data.

The storage namespace remains:

`woodfire-companion-journal-v1`

The stored object now uses `schemaVersion: 2`.

## Migration
Journal V1 data and legacy root arrays remain readable. Migration adds per entry:
- `rating: null` when no rating exists;
- `notes: ""` when no note exists;
- `feedbackUpdatedAt: null` when feedback has never been saved.

No existing timing, measurements, observations or schedule snapshots are discarded.

## Feedback fields
A completed cook may store:
- `rating`: integer 1–5 or `null`;
- `notes`: free text, maximum 2000 characters;
- `feedbackUpdatedAt`: timestamp of the last saved feedback.

The feedback is deliberately meal-level rather than step-level in V2. It is intended for useful next-cook observations such as:
- larger meat pieces;
- less uncovered/caramelisation time;
- more sauce;
- seasoning adjustment;
- side-dish texture or timing observations.

## UI
Each expanded journal card exposes:
- five tappable stars;
- `Notes pour la prochaine fois` textarea;
- explicit Save action and status.

When a rating is saved it is also visible in the collapsed journal summary.

## Resynchronisation rule
A served active session may be re-upserted into the journal after later state changes such as an added temperature measurement. Such automatic cook-data synchronisation must never erase feedback previously entered by the user when the new cook snapshot does not explicitly contain feedback fields.

## Test sessions
DEV/test sessions remain excluded from journal persistence and therefore cannot create or overwrite real feedback.

## Non-goals
Journal V2 does not yet add:
- photos;
- structured ingredient substitutions;
- per-step notes;
- search/filter;
- JSON backup/import;
- cloud sync;
- automatic learning or ETA adjustment from ratings/notes.

Feedback is stored now so later recipe refinement/history features can use explicit cook experience without changing the planner prematurely.
