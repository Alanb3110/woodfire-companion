import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recommendedStartFromPlan } from '../js/meal-planner.js';

const pork = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));
const turkey = JSON.parse(await readFile(new URL('../recipes/sweet-savory-turkey-zucchini-gratin.json', import.meta.url), 'utf8'));

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

test('recommended Pork Belly start comes from the generated plan', () => {
  const start = recommendedStartFromPlan(pork, {
    servings: 4,
    targetServingAt: '2030-01-02T20:00:00'
  });
  assert.equal(hm(start), '14:45');
});

test('recommended turkey meal start comes from the generated plan', () => {
  const start = recommendedStartFromPlan(turkey, {
    servings: 5,
    targetServingAt: '2030-01-02T20:30:00'
  });
  assert.equal(hm(start), '16:45');
});
