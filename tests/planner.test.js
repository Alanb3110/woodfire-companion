import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildSchedule,
  findDependencyIssues,
  findResourceConflicts,
  getDependentStepIds,
  shiftDependentTasks
} from '../js/planner.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));
const ref = new Date(2026, 7, 29, 12, 0, 0, 0);

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

test('baseline schedule reproduces current POC anchor times', () => {
  const schedule = buildSchedule(recipe, '20:00', ref);
  const byId = Object.fromEntries(schedule.map(item => [item.step.id, item]));
  assert.equal(hm(byId['take-out-pork'].start), '14:30');
  assert.equal(hm(byId.smoke.start), '15:00');
  assert.equal(hm(byId.covered.start), '17:15');
  assert.equal(hm(byId['airfry-potatoes'].start), '19:25');
  assert.equal(hm(byId.eat.start), '20:00');
});

test('schedule correctly crosses midnight', () => {
  const tiny = { steps: [{ id: 'prep', plan: { preferredStartOffsetMin: -60 }, durationMin: 10 }] };
  const reference = new Date(2026, 7, 29, 12, 0, 0, 0);
  const [item] = buildSchedule(tiny, '00:30', reference);
  assert.equal(item.start.getDate(), 28);
  assert.equal(hm(item.start), '23:30');
});

test('baseline recipe has no Woodfire resource conflict', () => {
  const schedule = buildSchedule(recipe, '20:00', ref);
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
});

test('baseline recipe respects declared dependencies', () => {
  const schedule = buildSchedule(recipe, '20:00', ref);
  assert.deepEqual(findDependencyIssues(recipe, schedule), []);
});

test('dependent shifting moves only unfinished downstream tasks', () => {
  const ids = getDependentStepIds(recipe, 'first-check');
  assert(ids.includes('finish-pork'));
  assert(ids.includes('airfry-potatoes'));
  assert(ids.includes('eat'));
  assert(!ids.includes('sauce'));

  const shifted = shiftDependentTasks(recipe, {}, { 'finish-pork': '2026-08-29T18:50:00+02:00' }, 'first-check', 15);
  assert.equal(shifted['first-check'], 15);
  assert.equal(shifted['finish-pork'], undefined);
  assert.equal(shifted['airfry-potatoes'], 15);
  assert.equal(shifted.sauce, undefined);
});
