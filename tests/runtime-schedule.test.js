import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveSessionServingTarget } from '../js/meal-planner.js';
import {
  buildSchedule,
  closestMealAnchorDate,
  getNextScheduledTask,
  nextMealAnchorDate,
  scheduleMap
} from '../js/planner.js';

const pork = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));
const referenceDate = new Date(2026, 7, 29, 12, 0, 0, 0);

function localDateParts(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()];
}

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

test('editing meal time across midnight keeps the nearest intended calendar day', () => {
  const previousTarget = new Date(2026, 7, 29, 20, 0, 0, 0);
  const moved = closestMealAnchorDate('05:00', previousTarget);
  assert.deepEqual(localDateParts(moved), [2026, 8, 30, 5, 0]);
});

test('starting a new cook after the selected clock time targets the next occurrence', () => {
  const now = new Date(2026, 7, 29, 23, 35, 0, 0);
  const target = nextMealAnchorDate('20:00', now);
  assert.deepEqual(localDateParts(target), [2026, 8, 30, 20, 0]);
});

test('an active session repairs a stale service occurrence from before session start', () => {
  const sessionStartedAt = new Date(2026, 7, 29, 23, 50, 0, 0);
  const staleTarget = new Date(2026, 7, 29, 5, 30, 0, 0);
  const repaired = resolveSessionServingTarget({
    mealTime: '05:30',
    targetServingAt: staleTarget,
    sessionStartedAt
  });

  assert.deepEqual(localDateParts(repaired), [2026, 8, 30, 5, 30]);
});

test('an intentionally late service remains on the same day when it is after session start', () => {
  const sessionStartedAt = new Date(2026, 7, 29, 18, 0, 0, 0);
  const target = new Date(2026, 7, 29, 20, 0, 0, 0);
  const resolved = resolveSessionServingTarget({
    mealTime: '20:00',
    targetServingAt: target,
    sessionStartedAt
  });

  assert.deepEqual(localDateParts(resolved), [2026, 8, 29, 20, 0]);
});

test('a recheck inside the Pork Belly planning buffer is absorbed', () => {
  const expectedCompletionTimes = {
    'first-check': new Date(2026, 7, 29, 18, 35, 0, 0).toISOString()
  };
  const schedule = buildSchedule(pork, '20:00', referenceDate, {}, { expectedCompletionTimes });
  const map = scheduleMap(schedule);

  assert.equal(hm(map['finish-pork'].start), '19:05');
  assert.equal(hm(map.eat.start), '20:00');
});

test('a recheck beyond the Pork Belly buffer propagates through dependent work and service', () => {
  const expectedCompletionTimes = {
    'first-check': new Date(2026, 7, 29, 19, 15, 0, 0).toISOString()
  };
  const schedule = buildSchedule(pork, '20:00', referenceDate, {}, { expectedCompletionTimes });
  const map = scheduleMap(schedule);

  assert.equal(hm(map['finish-pork'].start), '19:15');
  assert.equal(hm(map['rest-pork'].start), '19:30');
  assert.equal(hm(map['airfry-potatoes'].start), '19:35');
  assert.equal(hm(map.eat.start), '20:10');
});

test('next action selection uses pending recheck time instead of stale step start', () => {
  const schedule = [
    { step: { id: 'check' }, start: new Date(2026, 7, 29, 18, 15) },
    { step: { id: 'parallel' }, start: new Date(2026, 7, 29, 18, 20) }
  ];
  const rechecks = { check: new Date(2026, 7, 29, 18, 35).toISOString() };

  assert.equal(getNextScheduledTask(schedule, {}, rechecks).step.id, 'parallel');
});
