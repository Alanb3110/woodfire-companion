import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, indexHtml, serviceWorker] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../service-worker.js', import.meta.url), 'utf8')
]);

test('active cook persists observation and pending-recheck state', () => {
  assert.match(appJs, /observations:\s*\[\]/);
  assert.match(appJs, /rechecks:\s*\{\}/);
  assert.match(appJs, /applyObservation\(/);
  assert.match(appJs, /pendingRecheckDate\(state\.rechecks, step\.id\)/);
  assert.match(appJs, /state\.observations = result\.observations/);
  assert.match(appJs, /state\.rechecks = result\.rechecks/);
});

test('pending recheck becomes the next-action clock instead of shifting historical start', () => {
  assert.match(appJs, /const target = pending \|\| next\.start/);
  assert.match(appJs, /Recontrôler ·/);
  assert.match(appJs, /Recontrôle dans/);
  assert.doesNotMatch(appJs, /addStepDelay\(state\.taskShifts, nextTask\.step\.id, minutes\);\s*state\.rechecks/);
});

test('service milestone uses the same resolver as the journal', () => {
  assert.match(appJs, /resolveServiceStep\(recipe\)/);
});

test('observation controls are part of the offline shell', () => {
  assert.match(indexHtml, /observations\.css/);
  assert.match(serviceWorker, /\.\/observations\.css/);
  assert.match(serviceWorker, /\.\/js\/observations\.js/);
});
