import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { validateRecipe } from '../js/recipe.js';
import { validateStepIngredientUsage } from '../js/step-details.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/sweet-savory-turkey-zucchini-gratin.json', import.meta.url), 'utf8'));
const referenceDate = new Date(2026, 7, 29, 12, 0, 0, 0);

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function byId(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

test('turkey and zucchini gratin recipe validates as executable content', () => {
  const validation = validateRecipe(recipe);
  const stepUsageValidation = validateStepIngredientUsage(recipe);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(stepUsageValidation.valid, true, stepUsageValidation.errors.join('\n'));
  assert.equal(recipe.temperature.defaultTargetC, 74);
  assert.equal(recipe.serviceStepId, 'serve');
});

test('20:30 turkey meal reproduces the established reference timeline', () => {
  const schedule = buildMealSchedule(recipe, {
    servings: 5,
    mealTime: '20:30',
    referenceDate
  });
  const map = byId(schedule);

  assert.equal(hm(map['prepare-marinade'].start), '16:45');
  assert.equal(hm(map['coat-inject-turkey'].start), '16:50');
  assert.equal(hm(map['take-out-turkey'].start), '18:35');
  assert.equal(hm(map['prep-gratin'].start), '18:40');
  assert.equal(hm(map['preheat-smoker'].start), '18:45');
  assert.equal(hm(map['smoke-turkey'].start), '19:00');
  assert.equal(hm(map['roast-turkey'].start), '19:25');
  assert.equal(hm(map['bake-gratin'].start), '19:25');
  assert.equal(hm(map['glaze-turkey'].start), '20:05');
  assert.equal(hm(map['rest-gratin'].start), '20:15');
  assert.equal(hm(map['rest-turkey'].start), '20:20');
  assert.equal(hm(map.serve.start), '20:30');

  assert.deepEqual(findDependencyIssues(recipe, schedule), []);
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
});

test('turkey meal keeps the same execution structure for 4 to 6 servings', () => {
  for (const servings of [4, 5, 6]) {
    const schedule = buildMealSchedule(recipe, { servings, mealTime: '20:30', referenceDate });
    const map = byId(schedule);
    assert.equal(hm(map['smoke-turkey'].start), '19:00');
    assert.equal(hm(map.serve.start), '20:30');
  }
});

test('gratin active-cook quantities follow the selected 4, 5 or 6 servings', () => {
  const expected = {
    4: ['960 g de courgettes', '240 mL de crème', '3 œuf(s)', '2 gousse(s) d’ail', '80 g de fromage', '4 g de sel', '2,4 g de sel'],
    5: ['1200 g de courgettes', '300 mL de crème', '3 œuf(s)', '2 gousse(s) d’ail', '100 g de fromage', '5 g de sel', '3 g de sel'],
    6: ['1440 g de courgettes', '360 mL de crème', '4 œuf(s)', '3 gousse(s) d’ail', '120 g de fromage', '6 g de sel', '3,6 g de sel']
  };

  for (const servings of [4, 5, 6]) {
    const schedule = buildMealSchedule(recipe, { servings, mealTime: '20:30', referenceDate });
    const details = byId(schedule)['prep-gratin'].step.details.join('\n');
    assert.doesNotMatch(details, /\{\{use:/);
    assert.doesNotMatch(details, /Pour 5 personnes/);
    for (const fragment of expected[servings]) assert.ok(details.includes(fragment), `${servings} servings should include ${fragment}`);
  }
});
