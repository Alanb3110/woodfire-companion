import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, sessionJs] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/session.js', import.meta.url), 'utf8')
]);

test('cook session state carries stable journal and absolute serving metadata', () => {
  assert.match(sessionJs, /sessionId:\s*null/);
  assert.match(sessionJs, /sessionStartedAt:\s*null/);
  assert.match(sessionJs, /sessionServedAt:\s*null/);
  assert.match(sessionJs, /targetServingAt:\s*null/);
  assert.match(sessionJs, /schemaVersion:\s*SESSION_SCHEMA_VERSION/);
  assert.match(appJs, /state\.sessionId = createSessionId\(now\)/);
  assert.match(appJs, /state\.targetServingAt = resolveSessionServingTarget\(\{/);
  assert.match(appJs, /sessionStartedAt:\s*state\.sessionStartedAt/);
});

test('replanning preserves the absolute serving date through the meal-planner facade', () => {
  assert.match(appJs, /schedule = buildMealSchedule\(recipe, \{/);
  assert.match(appJs, /targetServingAt:\s*state\.targetServingAt/);
  assert.match(appJs, /actualStartTimes:\s*state\.started/);
  assert.match(appJs, /actualCompletionTimes:\s*state\.completed/);
  assert.match(appJs, /expectedCompletionTimes:\s*state\.rechecks/);
});

test('served cooks are synchronized into journal snapshots', () => {
  assert.match(appJs, /const entry = buildJournalEntry\(\{ state, recipe, schedule \}\);/);
  assert.match(appJs, /upsertJournalEntry\(entry\);/);
  assert.match(appJs, /removeJournalEntry\(state\.sessionId\);/);
  assert.match(appJs, /recomputeSchedule\(\);\s*syncJournal\(\);\s*renderTasks\(\);/);
});
