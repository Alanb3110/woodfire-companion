import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, controllerJs, indexHtml] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/active-cook-controller.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);

test('active cook feeds actual starts, completions and rechecks back into the planner', () => {
  assert.match(controllerJs, /actualStartTimes:\s*state\.started/);
  assert.match(controllerJs, /actualCompletionTimes:\s*state\.completed/);
  assert.match(controllerJs, /expectedCompletionTimes:\s*state\.rechecks/);
  assert.match(controllerJs, /state = startStep\(state, step\.id, at\)/);
  assert.match(controllerJs, /state = completeStep\(state, step\.id, at\)/);
  assert.match(appJs, /createActiveCookController\(/);
});

test('active cook exposes a distinct current-action card', () => {
  assert.match(indexHtml, /id="currentTaskCard"/);
  assert.match(indexHtml, /id="currentTaskName"/);
  assert.match(appJs, /function renderCurrentTask\(\)/);
  assert.match(appJs, /formatWoodfireSummary\(primary\.step\)/);
});

test('delay chips delegate one next-action delay to the controller', () => {
  assert.match(controllerJs, /getNextScheduledTask\(schedule, state\.completed, state\.rechecks, state\.started\)/);
  assert.match(controllerJs, /addStepDelay\(state\.taskShifts, nextTask\.step\.id, minutes\)/);
  assert.match(appJs, /activeCookController\.delayNext\(minutes\)/);
  assert.match(indexHtml, /Retard sur la prochaine étape :/);
  assert.doesNotMatch(appJs, /for \(const step of recipe\.steps\) \{\s*if \(!state\.completed\[step\.id\]\) state\.taskShifts/);
});

test('active cook resumes from a frozen recipe snapshot when available', () => {
  assert.match(appJs, /state\.recipeSnapshot\?\.id === state\.recipeId/);
  assert.match(appJs, /loaded = snapshotRecipe\(state\.recipeSnapshot\)/);
  assert.match(appJs, /if \(resetSession \|\| !state\.recipeSnapshot\) state\.recipeSnapshot = snapshotRecipe\(recipe\)/);
});
