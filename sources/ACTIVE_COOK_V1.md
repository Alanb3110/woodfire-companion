# Woodfire Companion — Active Cook V1 Source

## Scope
The active-cooking checklist is connected to Planner V1 and now also exposes structured observation/recheck controls for uncertain cooking checkpoints.

The objective remains behavioral: real progress becomes planner input, delay/recheck controls change only what reality requires, and completed timestamps remain historical facts.

## Completion timestamps
Checking a task complete records the current timestamp in the cook-session state.

That timestamp is historical fact. On every completion change the application:
1. saves the session;
2. rebuilds the schedule with `actualCompletionTimes`;
3. rerenders unfinished tasks from the new feasible plan.

Completed timestamps must not be rewritten merely to make the remaining plan look tidy.

Unchecking a step removes its recorded completion, clears any pending recheck for that step and recalculates the plan from the remaining known facts.

## Absolute serving date
An active cook stores `targetServingAt` as an absolute date/time, not only a clock string such as `05:30`.

The session start is also absolute. A service occurrence is never allowed to predate `sessionStartedAt`. This matters around midnight: a cook started at 23:50 for a 05:30 meal must target 05:30 the following day, not the already-passed 05:30 of the current day.

Older persisted sessions are repaired when loaded/resumed. If their stored service occurrence predates the session start, the application selects the next matching occurrence of the configured meal time. Legitimate lateness is preserved when the target is after session start but has subsequently passed.

Editing the meal clock keeps the calendar-day occurrence closest to the previous target, subject to the same session-start lower bound.

## Structured observations
A step declaring `recheck.notReadyMin` receives observation controls in its expanded detail.

The UI derives labels from the existing completion semantics:
- tenderness: `Encore ferme / Presque prêt / Très tendre`;
- target-temperature/combined completion: `Sous X °C / Presque X °C / X °C atteint`;
- generic fallback: `Pas prêt / Presque prêt / Prêt`.

Choosing a not-ready state stores the observation and a future recheck timestamp. The step remains incomplete and its historical start is unchanged.

The pending recheck timestamp is also passed to Planner V1 as an `expectedCompletionTime` for that step. This represents a temporary runtime expectation, not a historical fact. Existing planning buffer may absorb it; if the recheck extends beyond the remaining buffer, dependent work moves accordingly.

Choosing a ready state stores the observation and completes the step at the current timestamp. The pending expected completion disappears and the real completion becomes the planner input.

See `sources/OBSERVATIONS_V1.md`.

## Delay controls
The +5 / +10 / +15 minute controls remain for fast one-handed recovery during a cook.

Normal meaning:

**The next unfinished step is delayed by this amount.**

The UI records the delay only against that step using `addStepDelay()`. Planner V1 then decides what else must move.

If the next actionable item is an observation recheck, the same buttons move only that pending recheck deadline. Planner V1 then reevaluates whether the additional wait still fits inside available buffer.

## Propagation rules
After a completion, recheck expectation or explicit step delay:
- hard dependencies remain satisfied;
- a planning buffer may absorb some or all of a delay;
- unrelated parallel work remains where it was when feasible;
- an exclusive Woodfire conflict moves unfinished competing work as required;
- completed steps retain their actual timestamps;
- service time may move if the remaining meal can no longer be completed feasibly by the original target.

Do not move unrelated tasks solely because another component is late.

## User-facing interpretation
The active cook should answer:
- what is the next action?;
- when should I do it now?;
- is the next action a normal task or a recheck?;
- am I early/on-time/late?;
- what Woodfire state is required?;
- what completion criterion am I looking for?;

The next-action selector compares the effective actionable times: a pending recheck uses its recheck deadline; other unfinished steps use their replanned start. This prevents a stale checkpoint start from incorrectly staying at the top of the list.

## Current UI
The checklist and expandable detail cards remain the primary interaction.

Expanded details now show:
- explicit Woodfire state when applicable;
- the completion criterion;
- observation buttons when the recipe step declares a recheck;
- pending recheck time;
- recent observation history;
- actual completion timestamp.

The delay row remains:

`Retard sur la prochaine étape : +5 / +10 / +15 min`

## Temperature logging
Temperature logging remains independent and low-friction.

The turkey completion observation can use the recipe’s 74 °C target in its button labels, but a logged temperature sample does not automatically complete the step. The cook explicitly confirms readiness.

No ETA is currently inferred from temperature slope.

## Current limitations / next work
- No background/push notification fires when a recheck becomes due; the active screen updates while open.
- No temperature sample automatically chooses an observation outcome.
- Observation labels are derived rather than curated per recipe; extend the schema only if a real recipe demonstrates the need.
- Predictive ETA remains later work and must expose uncertainty.
