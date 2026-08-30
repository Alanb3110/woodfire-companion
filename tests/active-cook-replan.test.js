import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, indexHtml] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);

test('active cook feeds actual starts, completions and rechecks back into the planner', () => {
  assert.match(appJs, /actualStartTimes:\s*state\.started/);
  assert.match(appJs, /actualCompletionTimes:\s*state\.completed/);
  assert.match(appJs, /expectedCompletionTimes:\s*state\.rechecks/);
  assert.match(appJs, /state = startStep\(state, step\.id, now\)/);
  assert.match(appJs, /state = completeStep\(state, step\.id, now\)/);
});

test('active cook exposes a distinct current-action card', () => {
  assert.match(indexHtml, /id="currentTaskCard"/);
  assert.match(indexHtml, /id="currentTaskName"/);
  assert.match(appJs, /function renderCurrentTask\(\)/);
  assert.match(appJs, /formatWoodfireSummary\(primary\.step\)/);
});

test('delay chips affect only the next actionable upcoming item before planner propagation', () => {
  assert.match(appJs, /getNextScheduledTask\(schedule, state\.completed, state\.rechecks, state\.started\)/);
  assert.match(appJs, /addStepDelay\(state\.taskShifts, nextTask\.step\.id, minutes\)/);
  assert.match(indexHtml, /Retard sur la prochaine étape :/);
  assert.doesNotMatch(appJs, /for \(const step of recipe\.steps\) \{\s*if \(!state\.completed\[step\.id\]\) state\.taskShifts/);
});

test('active cook resumes from a frozen recipe snapshot when available', () => {
  assert.match(appJs, /state\.recipeSnapshot\?\.id === state\.recipeId/);
  assert.match(appJs, /loaded = snapshotRecipe\(state\.recipeSnapshot\)/);
  assert.match(appJs, /if \(resetSession \|\| !state\.recipeSnapshot\) state\.recipeSnapshot = snapshotRecipe\(recipe\)/);
});
