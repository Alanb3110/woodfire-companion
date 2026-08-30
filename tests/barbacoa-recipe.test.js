import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { validateRecipe } from '../js/recipe.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/smoked-beef-barbacoa.json', import.meta.url), 'utf8'));
const referenceDate = new Date(2026, 7, 29, 6, 0, 0, 0);

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function byId(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

test('barbacoa tacos validate as a complete executable meal', () => {
  const validation = validateRecipe(recipe);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(recipe.temperature.defaultTargetC, 93);
  assert.equal(recipe.serviceStepId, 'serve');
  assert.deepEqual(recipe.servings, { reference: 8, min: 6, max: 8 });
});

test('19:00 barbacoa reproduces the established long-cook reference timeline', () => {
  const schedule = buildMealSchedule(recipe, {
    servings: 8,
    mealTime: '19:00',
    referenceDate
  });
  const map = byId(schedule);

  assert.equal(hm(map['take-out-beef'].start), '07:45');
  assert.equal(hm(map['smoke-salsa'].start), '08:10');
  assert.equal(hm(map['smoke-beef'].start), '08:30');
  assert.equal(hm(map['blend-salsa'].start), '08:30');
  assert.equal(hm(map['covered-braise'].start), '10:00');
  assert.equal(hm(map['first-check'].start), '17:00');
  assert.equal(hm(map['rest-beef'].start), '17:00');
  assert.equal(hm(map['reduce-juices'].start), '17:00');
  assert.equal(hm(map['shred-beef'].start), '17:45');
  assert.equal(hm(map['prepare-toppings'].start), '18:00');
  assert.equal(hm(map['warm-shells'].start), '18:45');
  assert.equal(hm(map.serve.start), '19:00');

  assert.deepEqual(findDependencyIssues(recipe, schedule), []);
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
});

test('barbacoa keeps one execution structure from 6 to 8 servings', () => {
  for (const servings of [6, 7, 8]) {
    const schedule = buildMealSchedule(recipe, { servings, mealTime: '19:00', referenceDate });
    const map = byId(schedule);
    assert.equal(hm(map['smoke-beef'].start), '08:30');
    assert.equal(hm(map['first-check'].start), '17:00');
    assert.equal(hm(map.serve.start), '19:00');
  }
});
