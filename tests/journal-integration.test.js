import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('cook session state carries stable journal and absolute serving metadata', () => {
  assert.match(appJs, /sessionId:\s*null/);
  assert.match(appJs, /sessionStartedAt:\s*null/);
  assert.match(appJs, /sessionServedAt:\s*null/);
  assert.match(appJs, /targetServingAt:\s*null/);
  assert.match(appJs, /state\.sessionId = createSessionId\(now\)/);
  assert.match(appJs, /state\.targetServingAt = mealAnchorDate\(configMealTime, now\)\.toISOString\(\)/);
});

test('replanning preserves the stored serving date across reloads', () => {
  assert.match(appJs, /const referenceDate = state\.targetServingAt \? new Date\(state\.targetServingAt\) : new Date\(\);/);
  assert.match(appJs, /buildSchedule\(recipe, state\.mealTime, referenceDate, state\.taskShifts/);
});

test('served cooks are synchronized into journal snapshots', () => {
  assert.match(appJs, /const entry = buildJournalEntry\(\{ state, recipe, schedule \}\);/);
  assert.match(appJs, /upsertJournalEntry\(entry\);/);
  assert.match(appJs, /removeJournalEntry\(state\.sessionId\);/);
  assert.match(appJs, /recomputeSchedule\(\);\s*syncJournal\(\);\s*renderTasks\(\);/);
});
