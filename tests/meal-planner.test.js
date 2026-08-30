import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule, normalizeMealPlanContext } from '../js/meal-planner.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));

function byId(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

test('meal planner accepts serving and target-serving context without changing current baseline', () => {
  const target = new Date(2026, 7, 29, 20, 0, 0, 0);
  const schedule = buildMealSchedule(recipe, { servings: 4, targetServingAt: target });
  const map = byId(schedule);

  assert.equal(map.eat.start.getTime(), target.getTime());
  assert.equal(map['take-out-pork'].start.getHours(), 14);
  assert.equal(map['take-out-pork'].start.getMinutes(), 45);
});

test('absolute targetServingAt is canonical over a conflicting mealTime string', () => {
  const target = new Date(2026, 7, 29, 19, 15, 0, 0);
  const normalized = normalizeMealPlanContext(recipe, {
    servings: 4,
    mealTime: '22:00',
    targetServingAt: target
  });

  assert.equal(normalized.mealTime, '19:15');
  assert.equal(normalized.referenceDate.getTime(), target.getTime());
});

test('meal planner rejects serving counts outside the declared recipe capacity', () => {
  assert.throws(
    () => buildMealSchedule(recipe, { servings: recipe.servings.max + 1, mealTime: '20:00' }),
    /exceed recipe maximum/
  );
});

test('future component and variant selections are normalized without affecting V1 scheduling', () => {
  const context = normalizeMealPlanContext(recipe, {
    servings: 4,
    mealTime: '20:00',
    selectedComponents: ['pork', 'potatoes'],
    variants: { sauce: 'fresh' }
  });

  assert.deepEqual(context.selectedComponents, ['pork', 'potatoes']);
  assert.deepEqual(context.variants, { sauce: 'fresh' });
});
