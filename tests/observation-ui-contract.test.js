import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, controllerJs, sessionJs, indexHtml, serviceWorker] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/active-cook-controller.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/session.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../service-worker.js', import.meta.url), 'utf8')
]);

test('active cook persists observation and pending-recheck state', () => {
  assert.match(sessionJs, /observations:\s*\[\]/);
  assert.match(sessionJs, /rechecks:\s*\{\}/);
  assert.match(controllerJs, /const result = applyObservation\(\{/);
  assert.match(controllerJs, /observations:\s*result\.observations/);
  assert.match(controllerJs, /rechecks:\s*result\.rechecks/);
  assert.match(appJs, /activeCookController\.applyStepObservation\(step, option\)/);
  assert.match(appJs, /pendingRecheckDate\(state\.rechecks, step\.id\)/);
});

test('pending recheck becomes the next-action clock instead of shifting historical start', () => {
  assert.match(appJs, /const target = pending \|\| next\.start/);
  assert.match(appJs, /Recontrôler ·/);
  assert.match(appJs, /Recontrôle dans/);
  assert.doesNotMatch(appJs, /addStepDelay\(state\.taskShifts, nextTask\.step\.id, minutes\);\s*state\.rechecks/);
});

test('service milestone uses the same resolver as the journal', () => {
  assert.match(controllerJs, /journalOps\.resolveServiceStep\(recipe\)/);
});

test('observation controls are part of the offline shell', () => {
  assert.match(indexHtml, /observations\.css/);
  assert.match(serviceWorker, /\.\/observations\.css/);
  assert.match(serviceWorker, /\.\/js\/observations\.js/);
});
