import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  addStepDelay,
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

function byId(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

test('baseline schedule reproduces current POC anchor times during migration', () => {
  const schedule = buildSchedule(recipe, '20:00', ref);
  const map = byId(schedule);
  assert.equal(hm(map['take-out-pork'].start), '14:30');
  assert.equal(hm(map.smoke.start), '15:00');
  assert.equal(hm(map.covered.start), '17:15');
  assert.equal(hm(map['airfry-potatoes'].start), '19:25');
  assert.equal(hm(map.eat.start), '20:00');
});

test('dependency planner works without preferred offsets', () => {
  const simple = {
    steps: [
      { id: 'prep', durationMin: 30 },
      { id: 'cook', durationMin: 60, dependencies: [{ stepId: 'prep', relation: 'after_finish', lagMin: 0 }] },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'cook', relation: 'after_finish', lagMin: 0 }] }
    ]
  };
  const map = byId(buildSchedule(simple, '20:00', ref));
  assert.equal(hm(map.prep.start), '18:30');
  assert.equal(hm(map.cook.start), '19:00');
  assert.equal(hm(map.serve.start), '20:00');
});

test('schedule correctly crosses midnight', () => {
  const tiny = {
    steps: [
      { id: 'prep', durationMin: 60 },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'prep', relation: 'after_finish', lagMin: 0 }] }
    ]
  };
  const map = byId(buildSchedule(tiny, '00:30', ref));
  assert.equal(map.prep.start.getDate(), 28);
  assert.equal(hm(map.prep.start), '23:30');
});

test('baseline recipe has no Woodfire resource conflict', () => {
  const schedule = buildSchedule(recipe, '20:00', ref);
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
});

test('baseline planner resolves unrelated Woodfire conflicts backwards from service', () => {
  const parallel = {
    steps: [
      { id: 'woodfire-a', durationMin: 30, resources: ['woodfire'] },
      { id: 'woodfire-b', durationMin: 30, resources: ['woodfire'] },
      {
        id: 'serve',
        durationMin: 0,
        plan: { anchor: 'serve' },
        dependencies: [
          { stepId: 'woodfire-a', relation: 'after_finish', lagMin: 0 },
          { stepId: 'woodfire-b', relation: 'after_finish', lagMin: 0 }
        ]
      }
    ]
  };
  const schedule = buildSchedule(parallel, '20:00', ref);
  const map = byId(schedule);
  assert.equal(hm(map['woodfire-a'].start), '19:00');
  assert.equal(hm(map['woodfire-b'].start), '19:30');
  assert.equal(hm(map.serve.start), '20:00');
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
});

test('baseline recipe respects declared dependencies', () => {
  const schedule = buildSchedule(recipe, '20:00', ref);
  assert.deepEqual(findDependencyIssues(recipe, schedule), []);
});

test('planning buffer absorbs a small real delay before service moves', () => {
  const buffered = {
    steps: [
      { id: 'check', durationMin: 0 },
      {
        id: 'finish',
        durationMin: 30,
        dependencies: [{ stepId: 'check', relation: 'after_finish', lagMin: 0, planningBufferMin: 20 }]
      },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'finish', relation: 'after_finish', lagMin: 0 }] }
    ]
  };

  const baseline = byId(buildSchedule(buffered, '20:00', ref));
  assert.equal(hm(baseline.check.start), '19:10');
  assert.equal(hm(baseline.finish.start), '19:30');

  const smallDelay = addStepDelay({}, 'check', 10);
  const absorbed = byId(buildSchedule(buffered, '20:00', ref, smallDelay));
  assert.equal(hm(absorbed.check.start), '19:20');
  assert.equal(hm(absorbed.finish.start), '19:30');
  assert.equal(hm(absorbed.serve.start), '20:00');

  const largeDelay = addStepDelay({}, 'check', 25);
  const propagated = byId(buildSchedule(buffered, '20:00', ref, largeDelay));
  assert.equal(hm(propagated.check.start), '19:35');
  assert.equal(hm(propagated.finish.start), '19:35');
  assert.equal(hm(propagated.serve.start), '20:05');
});

test('actual completion time is preserved and propagates only forward', () => {
  const simple = {
    steps: [
      { id: 'cook', durationMin: 30 },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'cook', relation: 'after_finish', lagMin: 0 }] }
    ]
  };
  const actual = new Date(2026, 7, 29, 20, 7, 0, 0).toISOString();
  const map = byId(buildSchedule(simple, '20:00', ref, {}, { actualCompletionTimes: { cook: actual } }));
  assert.equal(hm(map.cook.end), '20:07');
  assert.equal(hm(map.serve.start), '20:07');
});

test('dependent shifting compatibility helper still moves only unfinished downstream tasks', () => {
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
