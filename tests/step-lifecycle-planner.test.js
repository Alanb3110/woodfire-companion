import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedule, getNextScheduledTask } from '../js/planner.js';

const ref = new Date(2026, 7, 29, 12, 0, 0, 0);

function byId(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

test('actual step start becomes historical start and moves expected end', () => {
  const recipe = {
    steps: [
      { id: 'cook', durationMin: 60, resources: ['woodfire'] },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'cook', relation: 'after_finish', lagMin: 0 }] }
    ]
  };
  const actualStart = new Date(2026, 7, 29, 19, 20).toISOString();
  const map = byId(buildSchedule(recipe, '20:00', ref, {}, { actualStartTimes: { cook: actualStart } }));
  assert.equal(map.cook.start.toISOString(), new Date(2026, 7, 29, 19, 20).toISOString());
  assert.equal(map.cook.end.toISOString(), new Date(2026, 7, 29, 20, 20).toISOString());
  assert.equal(map.serve.start.toISOString(), new Date(2026, 7, 29, 20, 20).toISOString());
});

test('completed step preserves separate actual start and end timestamps', () => {
  const recipe = {
    steps: [
      { id: 'cook', durationMin: 60 },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'cook', relation: 'after_finish', lagMin: 0 }] }
    ]
  };
  const start = new Date(2026, 7, 29, 18, 55).toISOString();
  const end = new Date(2026, 7, 29, 20, 7).toISOString();
  const map = byId(buildSchedule(recipe, '20:00', ref, {}, {
    actualStartTimes: { cook: start },
    actualCompletionTimes: { cook: end }
  }));
  assert.equal(map.cook.start.toISOString(), start);
  assert.equal(map.cook.end.toISOString(), end);
  assert.equal(map.serve.start.toISOString(), end);
});

test('active timed step is not returned as the next upcoming action', () => {
  const recipe = {
    steps: [
      { id: 'cook', durationMin: 60 },
      { id: 'side', durationMin: 10, plan: { anchor: 'serve', anchorOffsetMin: -30 } },
      { id: 'serve', durationMin: 0, plan: { anchor: 'serve' }, dependencies: [{ stepId: 'cook', relation: 'after_finish', lagMin: 0 }] }
    ]
  };
  const schedule = buildSchedule(recipe, '20:00', ref);
  const next = getNextScheduledTask(schedule, {}, {}, { cook: new Date(2026, 7, 29, 19, 0).toISOString() });
  assert.equal(next.step.id, 'side');
});
