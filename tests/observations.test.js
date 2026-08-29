import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  applyObservation,
  clearPendingRecheck,
  getObservationOptions,
  pendingRecheckDate,
  resolveObservationDelayMin
} from '../js/observations.js';

const pork = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));
const turkey = JSON.parse(await readFile(new URL('../recipes/sweet-savory-turkey-zucchini-gratin.json', import.meta.url), 'utf8'));

const porkCheck = pork.steps.find(step => step.id === 'first-check');
const turkeyFinish = turkey.steps.find(step => step.id === 'finish-turkey');

test('tenderness recheck exposes cook-friendly observation labels', () => {
  const options = getObservationOptions(porkCheck, pork);
  assert.deepEqual(options.map(option => option.label), ['Encore ferme', 'Presque prêt', 'Très tendre']);
  assert.equal(resolveObservationDelayMin(porkCheck, options[0]), 20);
  assert.equal(resolveObservationDelayMin(porkCheck, options[1]), 10);
  assert.equal(options[2].outcome, 'complete');
});

test('temperature-driven recheck uses the recipe target', () => {
  const options = getObservationOptions(turkeyFinish, turkey);
  assert.deepEqual(options.map(option => option.label), ['Sous 74 °C', 'Presque 74 °C', '74 °C atteint']);
  assert.equal(resolveObservationDelayMin(turkeyFinish, options[0]), 10);
  assert.equal(resolveObservationDelayMin(turkeyFinish, options[1]), 5);
});

test('not-ready observation schedules a recheck without completing the step', () => {
  const options = getObservationOptions(porkCheck, pork);
  const now = new Date('2026-08-29T18:15:00.000Z');
  const result = applyObservation({ observations: [], rechecks: {}, completed: {} }, porkCheck, options[0], now);

  assert.equal(result.completed['first-check'], undefined);
  assert.equal(result.rechecks['first-check'], '2026-08-29T18:35:00.000Z');
  assert.equal(result.record.label, 'Encore ferme');
  assert.equal(result.record.outcome, 'recheck');
  assert.equal(result.observations.length, 1);
});

test('ready observation records actual completion and clears pending recheck', () => {
  const options = getObservationOptions(porkCheck, pork);
  const state = applyObservation({ observations: [], rechecks: {}, completed: {} }, porkCheck, options[0], new Date('2026-08-29T18:15:00.000Z'));
  const ready = applyObservation(state, porkCheck, options[2], new Date('2026-08-29T18:28:00.000Z'));

  assert.equal(ready.completed['first-check'], '2026-08-29T18:28:00.000Z');
  assert.equal(ready.rechecks['first-check'], undefined);
  assert.equal(ready.observations.length, 2);
  assert.equal(ready.record.outcome, 'complete');
});

test('pending recheck helpers tolerate stored ISO timestamps', () => {
  const rechecks = { 'first-check': '2026-08-29T18:35:00.000Z' };
  assert.equal(pendingRecheckDate(rechecks, 'first-check').toISOString(), '2026-08-29T18:35:00.000Z');
  assert.deepEqual(clearPendingRecheck(rechecks, 'first-check'), {});
  assert.deepEqual(rechecks, { 'first-check': '2026-08-29T18:35:00.000Z' });
});
