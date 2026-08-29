import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSION_SCHEMA_VERSION,
  completeStep,
  createDefaultSessionState,
  hasSessionProgress,
  migrateSessionState,
  resetStep,
  snapshotRecipe,
  startStep,
  stepLifecycle
} from '../js/session.js';

test('legacy session migrates to schema v2 without inventing step starts', () => {
  const migrated = migrateSessionState({
    recipeId: 'legacy-recipe',
    completed: { cook: '2026-08-29T18:00:00.000Z' },
    measurements: [],
    observations: [],
    rechecks: {}
  });
  assert.equal(migrated.schemaVersion, SESSION_SCHEMA_VERSION);
  assert.deepEqual(migrated.started, {});
  assert.equal(migrated.completed.cook, '2026-08-29T18:00:00.000Z');
  assert.equal(migrated.view, 'cook');
});

test('timed step lifecycle distinguishes upcoming, active and done', () => {
  let state = createDefaultSessionState();
  assert.equal(stepLifecycle(state, 'smoke'), 'upcoming');

  state = startStep(state, 'smoke', new Date('2026-08-29T18:00:00.000Z'));
  assert.equal(stepLifecycle(state, 'smoke'), 'active');
  assert.equal(state.started.smoke, '2026-08-29T18:00:00.000Z');

  state = completeStep(state, 'smoke', new Date('2026-08-29T20:12:00.000Z'));
  assert.equal(stepLifecycle(state, 'smoke'), 'done');
  assert.equal(state.completed.smoke, '2026-08-29T20:12:00.000Z');

  state = resetStep(state, 'smoke');
  assert.equal(stepLifecycle(state, 'smoke'), 'upcoming');
  assert.equal(state.started.smoke, undefined);
  assert.equal(state.completed.smoke, undefined);
});

test('starting a step counts as session progress', () => {
  const state = startStep(createDefaultSessionState(), 'smoke', new Date('2026-08-29T18:00:00.000Z'));
  assert.equal(hasSessionProgress(state), true);
});

test('recipe snapshot is a detached copy', () => {
  const recipe = { id: 'meal', version: 4, steps: [{ id: 'cook' }] };
  const snapshot = snapshotRecipe(recipe);
  recipe.version = 5;
  recipe.steps[0].id = 'changed';
  assert.equal(snapshot.version, 4);
  assert.equal(snapshot.steps[0].id, 'cook');
});
