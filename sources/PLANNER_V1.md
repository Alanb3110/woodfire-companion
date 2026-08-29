# Woodfire Companion — Planner V1 Source

## Scope
Planner V1 replaces direct fixed-offset placement as the primary scheduling mechanism. It is a pure/testable scheduling layer: recipe data defines durations, dependencies, serving anchors and resources; the engine produces timestamps around the desired serving time.

The active-cook UI is migrated separately so planner semantics can be validated without mixing them with visual changes.

## Primary anchor
The desired serving time is represented by a step with:

```json
"plan": { "anchor": "serve" }
```

Optional `anchorOffsetMin` may place an anchored step relative to service.

Planner V1 works backwards from anchored steps to place their prerequisites as late as practical while respecting durations and declared planning gaps.

## Dependencies
Supported relations remain:
- `after_finish` — successor starts after predecessor finishes;
- `after_start` — successor starts after predecessor starts.

`lagMin` is a hard relationship and remains active during real replanning.

Example:

```json
{
  "stepId": "smoke",
  "relation": "after_finish",
  "lagMin": 0
}
```

## Planning buffers
A dependency may additionally contain:

```json
"planningBufferMin": 20
```

A planning buffer is deliberately different from a hard lag:
- baseline scheduling reserves the buffer;
- a real delay may consume the buffer;
- downstream tasks move only after the buffer has been exhausted.

This is the mechanism for protecting uncertain checkpoints without blindly moving unrelated work.

## Migration from fixed offsets
`preferredStartOffsetMin` remains accepted during migration, but it is no longer the primary placement algorithm.

When a serve anchor exists:
1. dependencies/durations derive the backwards schedule;
2. a legacy preferred offset acts only as a soft `not later than` hint;
3. the hint may preserve an existing buffer or parallel placement while content data is migrated to explicit semantics.

New recipes should prefer anchors, dependencies, planning buffers and resource rules. A recipe with no serve anchor may still use complete legacy offsets for backwards compatibility, but that path is transitional.

## Earliest placement
A step may use:

```json
"plan": { "placement": "earliest" }
```

This is useful for parallel work that should begin as soon as its prerequisites allow rather than being packed against service time.

Default placement is effectively latest-feasible within the dependency graph.

## Woodfire resource
The Woodfire is an exclusive resource in V1.

If independent Woodfire reservations overlap in the baseline plan, the engine resolves the collision backwards: the earlier reservation and its prerequisite chain are moved earlier so the target serving time remains unchanged.

A planned resource conflict must not silently move the desired serving time.

## Runtime delays
Runtime adjustment is intentionally asymmetric with baseline planning.

Baseline:
- protect desired service time;
- schedule backwards;
- consume available flexibility upstream.

Real cook:
- completed timestamps are historical facts and are never rewritten;
- explicit delays move the affected task;
- hard dependencies propagate only when violated;
- planning buffers may absorb delay;
- Woodfire conflicts push unfinished work later when necessary;
- serving time may slip if required to preserve feasible execution/food quality.

This follows the project rule that food quality must not be sacrificed solely to preserve the planned clock time.

## Actual completion timestamps
`buildSchedule()` accepts `actualCompletionTimes` for completed steps.

For a completed step:
- its actual end time replaces its planned end for downstream constraint evaluation;
- subsequent unfinished steps are moved only if hard dependencies/resources require it;
- the original baseline remains available on schedule items as `baselineStart` / `baselineEnd`.

## Current UI compatibility
The existing active-cook UI still uses the older global shift behavior. Planner V1 retains `shiftDependentTasks()` temporarily for compatibility.

The next active-cook increment should:
- record a delay/observation against the affected next/current step;
- use `addStepDelay()` for that step only;
- call `buildSchedule()` with actual completion times;
- let the planner determine what downstream work truly moves;
- stop blindly adding the same shift to every unfinished task.

## Validation/tests
Planner V1 tests cover:
- current reference-meal baseline compatibility;
- recipes with no preferred offsets;
- schedules crossing midnight;
- dependency correctness;
- baseline Woodfire conflict resolution;
- planning-buffer absorption;
- service slippage once a buffer is exhausted;
- actual completion propagation;
- compatibility with existing downstream-shift utilities.

## Not yet in V1
Deferred to subsequent increments:
- observation buttons (`Encore ferme`, `Presque prêt`, `Très tendre`);
- automatic recheck generation;
- temperature-slope ETA;
- historical-session learning;
- multiple capacity-limited resources beyond the single exclusive Woodfire;
- advanced user-attention/workspace scheduling.
