import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, indexHtml] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8')
]);

test('active cook feeds actual and expected completion timestamps back into the planner', () => {
  assert.match(appJs, /actualCompletionTimes:\s*state\.completed/);
  assert.match(appJs, /expectedCompletionTimes:\s*state\.rechecks/);
  assert.match(appJs, /if \(check\.checked\) state\.completed\[step\.id\] = new Date\(\)\.toISOString\(\);/);
  assert.match(appJs, /saveState\(\);\s*recomputeSchedule\(\);\s*renderTasks\(\);/);
});

test('delay chips affect only the next actionable item before planner propagation', () => {
  assert.match(appJs, /getNextScheduledTask\(schedule, state\.completed, state\.rechecks\)/);
  assert.match(appJs, /addStepDelay\(state\.taskShifts, nextTask\.step\.id, minutes\)/);
  assert.match(indexHtml, /Retard sur la prochaine étape :/);
  assert.doesNotMatch(appJs, /for \(const step of recipe\.steps\) \{\s*if \(!state\.completed\[step\.id\]\) state\.taskShifts/);
});
