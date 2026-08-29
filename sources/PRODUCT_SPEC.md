# Woodfire Companion — Product Source

## Purpose
This file records the product decisions that should be treated as the current source of truth when modifying the application.

## Problem to solve
Cooking a multi-step meal on a Ninja Woodfire is not primarily a recipe-reading problem. The difficult part is coordinating:
- preparation;
- smoking/cooking phases;
- accessory changes;
- covered/uncovered phases;
- temperature/tenderness checks;
- side dishes and sauces;
- resting;
- a desired serving time.

Woodfire Companion should turn a recipe into an executable cooking plan.

## Reference user flow
1. Select a recipe/meal.
2. Set number of servings where supported.
3. Set desired serving time.
4. Review the generated timeline.
5. Start the cook.
6. During execution, the app shows the next action and Woodfire state.
7. User checks off tasks and enters temperature measurements with minimal interaction.
8. If a step is late or early, the remaining plan is adjusted.
9. At the end, the session remains available for review/export.

## Reference platform
- Primary: iPhone, installed as PWA from Safari.
- Deployment: GitHub Pages.
- Core app: static/client-side.
- Network: optional during normal cooking.
- Persistence: local-first.

## Current POC behaviour
The current implementation stores one recipe directly in `app.js` and provides:
- serving time (default 20:00);
- relative task offsets;
- completion timestamps;
- task details;
- global delay controls (+5/+10/+15 min on unfinished tasks);
- next-task countdown;
- manual temperature history;
- adjustable target temperature;
- SVG/DOM chart;
- CSV export;
- service-worker caching;
- `localStorage` persistence.

## Desired V1 product boundary
V1 should become a useful reusable cooking tool rather than a single-recipe demo.

Required:
- multiple structured recipes;
- recipe selection;
- target serving time;
- dynamic checklist;
- expandable detailed instructions;
- explicit Woodfire settings per relevant step;
- multiple parallel workstreams in one meal;
- manual temperature tracking;
- persistent active cook;
- basic session history or export;
- offline/PWA operation.

Strongly desired:
- serving-size scaling where quantities scale cleanly;
- configurable buffers;
- dependency-aware delay propagation;
- optional notes per cook;
- reusable ingredient/prep overview before starting.

Not required for V1:
- login;
- cloud database;
- social recipes;
- AI calls during cooking;
- smart probe connection;
- push notifications requiring a backend.

## Interaction model
### Home / recipe selection
Should answer:
- What am I cooking?
- For how many people?
- When do I want to eat?

### Pre-cook overview
Should answer:
- What ingredients and quantities do I need?
- What must be prepared in advance?
- What accessories/supports will I need?
- At what time must I start?

### Active cook
Should answer at a glance:
- What do I do now?
- What happens next?
- What mode/temperature/accessory should the Woodfire currently use?
- Am I ahead, on time, or late?

### Temperature logging
Target interaction:
- focus temperature field;
- type value;
- tap Add/Enter;
- timestamp recorded automatically.

No mandatory form for every measurement.

## Planning model
Simple fixed offsets are acceptable for the POC but are insufficient for a reusable planner.

The intended model should support:
- anchor: target serving time;
- step durations;
- dependencies (`after`, `before`, `parallel_with` conceptually);
- optional earliest/latest windows;
- flexible tasks that can move without affecting service;
- blocking tasks on the critical path;
- completion criteria independent of duration;
- buffers/rest periods;
- actual completion timestamps.

Example:
- Pork smoke phase must finish before covered phase.
- Sauce can be prepared during the covered pork phase.
- Potatoes can be parboiled while pork finishes.
- Air-fry potatoes cannot start until the Woodfire is released by the pork if only one appliance is available.

Thus the planner must eventually understand shared-resource conflicts, especially the single Woodfire appliance.

## Resource model
At minimum, steps may use:
- Woodfire appliance;
- stovetop/pot;
- fridge;
- passive/resting time;
- user attention.

The Woodfire itself can have mutually exclusive configurations:
- cooking mode;
- setpoint;
- smoke on/off;
- pellets required/not required;
- grill plate / basket / tray / external dish;
- covered/uncovered.

## Delay behaviour
Delay propagation should be dependency based, not blindly global.

Examples:
- If sauce preparation is 10 min late but is still finished before service, meat timings should not move.
- If the covered meat phase takes 20 min longer, finishing/resting and any Woodfire-dependent potato phase should move.
- Completed tasks must remain historically accurate.

## Session data
A cook session should eventually contain:
- session id;
- recipe id/version;
- target serving time;
- servings;
- planned task schedule;
- actual completion times;
- per-task shifts/status;
- temperatures with timestamps and optional labels/probe location;
- notes;
- start/end timestamps.

## Success criteria
The app is successful if, during a real cook:
- the user rarely needs to reopen the original recipe;
- the next action is obvious;
- appliance settings are unambiguous;
- delays are easy to absorb;
- temperature logging is faster than using Notes or a spreadsheet;
- the meal can be coordinated close to the requested serving time without excessive mental bookkeeping.
