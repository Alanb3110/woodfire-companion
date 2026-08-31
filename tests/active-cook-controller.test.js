import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createActiveCookController } from '../js/active-cook-controller.js';
import { getObservationOptions } from '../js/observations.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));

function createHarness() {
  let state = {
    servings: 4,
    targetServingAt: '2030-01-02T20:00:00.000Z',
    taskShifts: {},
    started: {},
    completed: {},
    rechecks: {},
    observations: [],
    cookStartedAt: null,
    sessionId: null,
    sessionServedAt: null
  };
  let saves = 0;
  const controller = createActiveCookController({
    getRecipe: () => recipe,
    getState: () => state,
    setState: next => { state = next; },
    saveState: () => { saves += 1; }
  });
  return { controller, getState: () => state, getSaves: () => saves };
}

test('controller owns schedule recomputation from runtime facts', () => {
  const { controller } = createHarness();
  const schedule = controller.refresh();
  assert.equal(schedule.length, recipe.steps.length);
  assert.equal(controller.getSchedule(), schedule);
});

test('controller owns timed step lifecycle transitions', () => {
  const { controller, getState } = createHarness();
  const schedule = controller.refresh();
  const step = recipe.steps.find(candidate => candidate.id === 'take-out-pork');
  const plannedStart = schedule.find(item => item.step.id === step.id).start;

  assert.equal(controller.toggleStep(step, plannedStart), 'active');
  assert.equal(getState().started[step.id], plannedStart.toISOString());

  const completedAt = new Date(plannedStart.getTime() + 30 * 60000);
  assert.equal(controller.toggleStep(step, completedAt), 'done');
  assert.equal(getState().completed[step.id], completedAt.toISOString());
});

test('controller records observations and pending rechecks', () => {
  const { controller, getState } = createHarness();
  const schedule = controller.refresh();
  const step = recipe.steps.find(candidate => candidate.recheck?.notReadyMin);
  const option = getObservationOptions(step, recipe).find(candidate => candidate.outcome === 'recheck');
  const observedAt = schedule.find(item => item.step.id === step.id).start;

  const record = controller.applyStepObservation(step, option, observedAt);
  assert.equal(record.stepId, step.id);
  assert.equal(getState().started[step.id], observedAt.toISOString());
  assert.ok(getState().rechecks[step.id]);
  assert.equal(getState().observations.at(-1).observationId, option.id);
});

test('controller delays only the next actionable task', () => {
  const { controller, getState } = createHarness();
  controller.refresh();
  assert.equal(controller.delayNext(10), true);
  assert.equal(Object.values(getState().taskShifts).reduce((sum, value) => sum + value, 0), 10);
});
