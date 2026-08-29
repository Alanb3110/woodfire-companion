# Woodfire Companion — ChatGPT Project Instructions

Use this file as the compact instruction set for ChatGPT work on this project. Detailed product/technical/cooking context lives in `sources/` and should be treated as the source of truth.

## Goal
Build Woodfire Companion as a mobile-first Ninja Woodfire cooking copilot, not just a recipe viewer.

Canonical flow:
**illustrated recipe library → servings + desired meal time → scaled ingredients/shopping list → generated full-meal plan → active cooking assistant → cook journal**.

The core differentiator is the planner: transform recipe data into an executable schedule for the entire meal, including meat, sides, sauces, stovetop work, resting, chilling, plating and advance preparation.

## Product rules
- Primary device: iPhone/PWA; desktop is secondary.
- Preserve offline operation and GitHub Pages compatibility.
- Favor 1–3 tap interactions during cooking.
- Each timed task must have a clear collapsed summary and expandable detail.
- For Woodfire steps explicitly state mode, °C setpoint, smoke on/off, pellets, support/accessory, covered/uncovered and placement when relevant.
- Plan around the desired serving time.
- Treat durations as estimates where cooking state matters; prefer temperature/tenderness/appearance completion criteria when appropriate.
- Completed steps retain actual timestamps; delays should propagate through dependencies, not blindly shift unrelated tasks.
- Support parallel tasks and shared-resource conflicts. Initially the Woodfire is one exclusive resource; stovetop, fridge and passive resting may run concurrently when feasible.
- Never sacrifice food quality solely to preserve the planned clock time.

## Recipe strategy
Hybrid model:
- curated recipes live in the repo;
- new recipes can be added progressively;
- compatible structured JSON may be generated externally/with ChatGPT then validated and committed/imported.

Recipes should support reusable meal components where valuable (main, side, sauce), but do not over-engineer modularity before it is needed.

Use metric units. Scale ingredients from a defined reference serving size, but do not assume every quantity scales linearly.

Known household defaults: generous sauces; sweet-savoury flavors welcome; thyme generally avoided; avoid alcohol/flambé unless explicitly requested.

## Architecture
Keep separate layers:
1. recipe/content data;
2. pure/testable planning engine;
3. cook-session state + persistence/migrations;
4. UI.

Do not keep recipe content embedded in `app.js` long term.

Prefer vanilla HTML/CSS/JS while manageable. Do not introduce a backend, accounts, paid APIs, runtime AI, frameworks or hardware integration without a demonstrated product need.

## Planning target
V1 planner should understand:
- serving-time anchor;
- step duration/window;
- dependencies;
- buffers;
- resource requirements/conflicts;
- parallelism;
- actual completion times;
- dependency-aware replanning.

V1.5 may add observation checkpoints such as `Encore ferme / Presque prêt / Très tendre` and automatic rechecks.

V2+ may estimate ETA from temperature slope and previous cook sessions, always with uncertainty rather than false precision.

## Active-cook UX priority
1. next action + countdown;
2. current action;
3. current Woodfire configuration;
4. completion/observation control;
5. rapid temperature entry;
6. detailed instructions on demand;
7. upcoming steps.

Manual temperature logging must remain extremely fast: enter value → Add/Enter → automatic timestamp.

## Shopping/preparation
For a selected meal and serving count generate:
- consolidated ingredients;
- practical categorized shopping list;
- optional-item markers;
- advance-prep reminders;
- required equipment/accessories;
- recommended start time.

Pantry memory is a later enhancement, not MVP-critical.

## Development workflow
- Read relevant `sources/*.md` plus current GitHub state before significant changes.
- Use focused branches/PRs for meaningful work.
- Do not mix major planner refactors and visual redesigns unnecessarily.
- Add automated tests when extracting planner/date/resource logic.
- Preserve existing local data through schema migration where practical.
- Test meaningful UX changes on iPhone/Safari/PWA.
- Update source docs whenever product semantics, recipe schema, planner behavior or storage model changes.

## Current implementation
The POC already provides one hard-coded meal, serving-time offsets, expandable checklist steps, completion timestamps, +5/+10/+15 shifts, next-task countdown, manual temperature graph/logging, CSV export, localStorage and service-worker offline support.

Treat this as a useful prototype, not the target architecture.

## Current build order
1. finalize recipe/meal/component schema;
2. extract demo recipe from `app.js`;
3. illustrated multi-recipe library;
4. servings + desired serving time;
5. scaled ingredients + shopping list;
6. dependency/resource-aware planner;
7. active-cook UI on top of planner;
8. local cook journal/history;
9. adaptive observations/ETA later.

When a choice is ambiguous, optimize for a real cook in progress: minimal cognitive load, explicit appliance state, robust timing, and easy recovery from delays.