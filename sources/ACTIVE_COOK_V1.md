# Woodfire Companion — Active Cook V1 Source

## Scope
This increment connects the active-cooking checklist to Planner V1 without redesigning the interface.

The objective is behavioral: real progress becomes planner input, and delay controls stop shifting every unfinished task indiscriminately.

## Completion timestamps
Checking a task complete records the current timestamp in the cook-session state.

That timestamp is historical fact. On every completion change the application:
1. saves the session;
2. rebuilds the schedule with `actualCompletionTimes`;
3. rerenders unfinished tasks from the new feasible plan.

Completed timestamps must not be rewritten merely to make the remaining plan look tidy.

Unchecking a step removes its recorded completion and recalculates the plan from the remaining known facts.

## Delay controls
The existing +5 / +10 / +15 minute controls remain for fast one-handed recovery during a cook, but their meaning changes.

They now mean:

**The next unfinished step is delayed by this amount.**

The UI records the delay only against that step using `addStepDelay()`. Planner V1 then decides what else must move.

This replaces the POC behavior that added the same delay to every unfinished task.

## Propagation rules
After a completion or delay:
- hard dependencies remain satisfied;
- a planning buffer may absorb some or all of a delay;
- unrelated parallel work remains where it was when feasible;
- an exclusive Woodfire conflict moves unfinished competing work as required;
- completed steps retain their actual timestamps;
- service time may move if the remaining meal can no longer be completed feasibly by the original target.

Do not move unrelated tasks solely because another component is late.

## User-facing interpretation
The active cook should continue answering:
- what is the next action?;
- when should I do it now?;
- am I early/on-time/late?;
- what Woodfire state is required?;

The next-action countdown is calculated from the replanned schedule, not the original static timeline.

## Current UI
No major layout change is introduced in this increment.

The existing delay row is relabeled to clarify its semantics:

`Retard sur la prochaine étape : +5 / +10 / +15 min`

The existing checklist and expandable detail cards remain.

## Temperature logging
Temperature logging remains independent and low-friction. This increment does not infer ETA from temperature data and does not automatically complete cooking steps from temperature samples.

Temperature/observation-driven replanning is later work.

## Known limitations / next increment
V1 still relies on manual completion/delay input. It does not yet expose structured observations such as:
- `Encore ferme`;
- `Presque prêt`;
- `Très tendre`.

A later observation-driven increment can map those outcomes to rechecks, changed expected duration and planner updates without changing the fundamental completion/delay model defined here.
