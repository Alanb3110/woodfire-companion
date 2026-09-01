import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, controllerJs, sessionJs] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/active-cook-controller.js', import.meta.url), 'utf8'),
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

test('startup does not overwrite an unreadable or future-version session with defaults', () => {
  assert.match(appJs, /let state = repairLoadedSession\(loadSessionState\(\)\);/);
  assert.doesNotMatch(
    appJs,
    /let state = repairLoadedSession\(loadSessionState\(\)\);\s*saveSessionState\(state\);/
  );
});

test('replanning preserves the absolute serving date through the active-cook controller', () => {
  assert.match(controllerJs, /schedule = buildMealSchedule\(recipe, \{/);
  assert.match(controllerJs, /targetServingAt:\s*state\.targetServingAt/);
  assert.match(controllerJs, /actualStartTimes:\s*state\.started/);
  assert.match(controllerJs, /actualCompletionTimes:\s*state\.completed/);
  assert.match(controllerJs, /expectedCompletionTimes:\s*state\.rechecks/);
  assert.match(appJs, /activeCookController\.refresh\(\)/);
});

test('served cooks are synchronized into journal snapshots by the active-cook controller', () => {
  assert.match(controllerJs, /journalOps\.buildJournalEntry\(\{ state, recipe, schedule \}\)/);
  assert.match(controllerJs, /journalOps\.upsertJournalEntry\(/);
  assert.match(controllerJs, /journalOps\.removeJournalEntry\(state\.sessionId\)/);
  assert.match(controllerJs, /function refresh\(\) \{\s*recomputeSchedule\(\);\s*syncJournal\(\);/);
  assert.match(appJs, /activeCookController\.syncJournal\(\)/);
});
