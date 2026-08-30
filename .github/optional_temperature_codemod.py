from pathlib import Path

schema = Path('sources/RECIPE_SCHEMA_V1.md')
text = schema.read_text()
old = "Until Planner V1 supports batch synthesis, `max` must remain within a quantity that can follow the same declared execution/resource structure.\n\n## Ingredients and scaling"
new = """Until Planner V1 supports batch synthesis, `max` must remain within a quantity that can follow the same declared execution/resource structure.

## Optional temperature tracking
Temperature logging is a recipe capability, not a universal application assumption.

Supported top-level semantics:

```json
"temperature": {
  "enabled": true,
  "defaultTargetC": 74
}
```

Rules:
- no `temperature` object means temperature tracking is disabled;
- `temperature.enabled: false` explicitly disables tracking and must not also declare `defaultTargetC`;
- `temperature.enabled: true` requires `defaultTargetC` between 30 and 120 °C;
- for backward compatibility, an existing recipe with numeric `defaultTargetC` and no `enabled` flag is treated as enabled;
- a step using `completion.type: "temperature"` requires enabled recipe temperature tracking with a valid target.

When tracking is disabled, Active Cook hides the temperature tab, stores no fabricated 93 °C target for a new session and redirects any stale `temperature` tab state back to Planning.

## Ingredients and scaling"""
if old not in text:
    raise SystemExit('recipe schema temperature insertion marker not found')
text = text.replace(old, new, 1)

old = "- invalid serving bounds/timing ranges;\n- duplicate ingredient/component/equipment/advance-prep/step ids;"
new = "- invalid serving bounds/timing ranges;\n- invalid/contradictory temperature tracking metadata or temperature completion without a target;\n- duplicate ingredient/component/equipment/advance-prep/step ids;"
if old not in text:
    raise SystemExit('recipe schema validation summary marker not found')
text = text.replace(old, new, 1)

old = """## Next schema work
1. Pass serving/configuration context into the planner for capacity/batch-dependent timing.
2. Add structured ingredient usage by step to eliminate scaling-sensitive quantities duplicated in prose.
3. Make temperature tracking explicitly optional per recipe.
4. Add a flexible planning-window concept when a real recipe requires it.
5. Add curated observation labels only if a real recipe cannot be represented clearly by V1-derived controls.
6. Add richer resources such as user attention only when real meal plans demonstrate the need.
"""
new = """## Next schema work
1. Pass serving/configuration context into the planner for capacity/batch-dependent timing.
2. Add structured ingredient usage by step to eliminate scaling-sensitive quantities duplicated in prose.
3. Add a flexible planning-window concept when a real recipe requires it.
4. Add curated observation labels only if a real recipe cannot be represented clearly by V1-derived controls.
5. Add richer resources such as user attention only when real meal plans demonstrate the need.
"""
if old not in text:
    raise SystemExit('recipe schema next-work marker not found')
text = text.replace(old, new, 1)
schema.write_text(text)

technical = Path('sources/TECHNICAL_CONTEXT.md')
text = technical.read_text()
old = """## Temperature tracking
Temperature tracking is now split out of `app.js` without changing the user workflow.

`js/temperature.js` owns pure/testable temperature data operations:
- manual-value validation (0–150 °C);
- target clamping (30–120 °C);
- immutable measurement append/remove helpers;
- CSV serialization.

`js/temperature-ui.js` owns the DOM controller for fast entry, target editing, latest-measurement display, recent-measurement list, SVG chart, undo/new-series actions and CSV download. It receives the current session through callbacks, so the temperature layer does not own session persistence or journal semantics.

Manual logging remains value → Add/Enter → automatic timestamp. The existing session fields `temperatureTarget`, `measurements` and `cookStartedAt` are unchanged, preserving stored data compatibility.

Both current executable recipes benefit from temperature logging, although the role differs: Pork Belly uses temperature as supporting information for a tenderness-driven cook, while the turkey meal uses a 74 °C core target as the decisive endpoint.

Observation controls do not automatically infer readiness from a measurement; the cook explicitly confirms completion state.

No ETA is currently inferred from temperature slope.
"""
new = """## Temperature tracking
Temperature tracking is split out of `app.js` and is now an optional recipe capability.

`js/temperature.js` owns pure/testable temperature data operations and feature semantics:
- recipe tracking enabled/disabled resolution;
- default target resolution;
- manual-value validation (0–150 °C);
- target clamping (30–120 °C);
- immutable measurement append/remove helpers;
- CSV serialization.

`js/temperature-ui.js` owns the DOM controller for fast entry, target editing, latest-measurement display, recent-measurement list, SVG chart, undo/new-series actions and CSV download. It receives the current session through callbacks, so the temperature layer does not own session persistence or journal semantics.

A recipe without `temperature` metadata has no temperature tab. `enabled: false` is an explicit opt-out. Existing recipes that only declare numeric `defaultTargetC` remain enabled for backward compatibility; `enabled: true` requires a 30–120 °C target. A new no-temperature session stores `temperatureTarget: null` rather than fabricating the historic 93 °C default.

Manual logging remains value → Add/Enter → automatic timestamp for enabled recipes. Existing stored sessions remain compatible.

Both current executable recipes benefit from temperature logging, although the role differs: Pork Belly uses temperature as supporting information for a tenderness-driven cook, while the turkey meal uses a 74 °C core target as the decisive endpoint.

Observation controls do not automatically infer readiness from a measurement; the cook explicitly confirms completion state.

No ETA is currently inferred from temperature slope.
"""
if old not in text:
    raise SystemExit('technical temperature section marker not found')
text = text.replace(old, new, 1)

old = "Coverage includes hardened recipe contracts, generic available-recipe acceptance, actionable ingredient quantities, recipe-specific timelines, shopping/pre-cook, offline caching, version consistency, DOM contracts, dependency/resource planning, buffers/service slippage, actual start/completion propagation, session v1→v2→v3 migration, step lifecycle transitions, frozen recipe snapshots, timestamp correction, observation/recheck behavior, journal v1→v2 migration, feedback persistence/resync protection, test-session exclusion, active-cook wiring and extracted temperature validation/measurement/CSV behavior."
new = "Coverage includes hardened recipe contracts, generic available-recipe acceptance, actionable ingredient quantities, recipe-specific timelines, shopping/pre-cook, offline caching, version consistency, DOM contracts, dependency/resource planning, buffers/service slippage, actual start/completion propagation, session v1→v2→v3 migration, step lifecycle transitions, frozen recipe snapshots, timestamp correction, observation/recheck behavior, journal v1→v2 migration, feedback persistence/resync protection, test-session exclusion, active-cook wiring, optional temperature capability semantics and extracted temperature validation/measurement/CSV behavior."
if old not in text:
    raise SystemExit('technical coverage marker not found')
text = text.replace(old, new, 1)

old = """## Current technical debt / next work
1. Continue splitting active-cook/session orchestration out of the growing `app.js` without introducing a framework; temperature orchestration is now extracted.
2. Make temperature tracking explicitly optional before adding recipes that do not benefit from core-temperature logging.
3. Reduce scaling-sensitive quantities duplicated inside step prose by referencing structured ingredient usage where useful.
4. Add journal JSON backup/import when useful.
5. Add a flexible planning-window concept only when a real recipe demonstrates the need.
6. Extend conflict handling beyond Woodfire only when real meals demonstrate a shared-resource collision.
7. Introduce reusable external components/batching only when real recipes prove the need.
8. Add predictive ETA later from temperature/history with uncertainty, never false precision.
"""
new = """## Current technical debt / next work
1. Continue splitting active-cook/session orchestration out of the growing `app.js` without introducing a framework; temperature orchestration is now extracted.
2. Reduce scaling-sensitive quantities duplicated inside step prose by referencing structured ingredient usage where useful.
3. Add journal JSON backup/import when useful.
4. Add a flexible planning-window concept only when a real recipe demonstrates the need.
5. Extend conflict handling beyond Woodfire only when real meals demonstrate a shared-resource collision.
6. Introduce reusable external components/batching only when real recipes prove the need.
7. Add predictive ETA later from temperature/history with uncertainty, never false precision.
"""
if old not in text:
    raise SystemExit('technical debt marker not found')
text = text.replace(old, new, 1)
technical.write_text(text)
