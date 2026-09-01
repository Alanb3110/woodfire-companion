import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { validateRecipe } from '../js/recipe.js';
import { validateRecipeIngredientUsage } from '../js/step-details.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { getAdvancePrep } from '../js/shopping.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/smoked-beef-barbacoa.json', import.meta.url), 'utf8'));
const referenceDate = new Date(2026, 7, 29, 6, 0, 0, 0);

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function byId(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

function prepById(servings, id) {
  return getAdvancePrep(recipe, servings).find(item => item.id === id);
}

test('barbacoa tacos validate as a complete executable meal', () => {
  const validation = validateRecipe(recipe);
  const usageValidation = validateRecipeIngredientUsage(recipe);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(usageValidation.valid, true, usageValidation.errors.join('\n'));
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

test('barbacoa advance marinade scales from 6 to 8 servings', () => {
  const six = prepById(6, 'marinate-ahead').details;
  const eight = prepById(8, 'marinate-ahead').details;

  assert.doesNotMatch(six, /\{\{use:/);
  assert.ok(six.includes('1,95 kg de jarret'));
  assert.ok(six.includes('1,5 citron(s) vert(s)'));
  assert.ok(six.includes('5 gousse(s) d’ail'));
  assert.ok(six.includes('1,5 c. à soupe de concentré'));
  assert.ok(six.includes('18,75–22,5 g de sel'));

  assert.ok(eight.includes('2,6 kg de jarret'));
  assert.ok(eight.includes('2 citron(s) vert(s)'));
  assert.ok(eight.includes('6 gousse(s) d’ail'));
  assert.ok(eight.includes('2 c. à soupe de concentré'));
  assert.ok(eight.includes('25–30 g de sel'));
});

test('barbacoa salsa, braise, toppings and shells use selected serving quantities', () => {
  const six = byId(buildMealSchedule(recipe, { servings: 6, mealTime: '19:00', referenceDate }));
  const eight = byId(buildMealSchedule(recipe, { servings: 8, mealTime: '19:00', referenceDate }));

  const sixSalsa = six['smoke-salsa'].step.details.join('\n');
  assert.ok(sixSalsa.includes('450 g de tomates'));
  assert.ok(sixSalsa.includes('1 jalapeño(s)'));
  assert.ok(six['blend-salsa'].step.details[0].includes('11,25 g de coriandre'));
  assert.ok(six['blend-salsa'].step.details[0].includes('3 g de sel'));
  assert.ok(six['covered-braise'].step.details[0].includes('1,5 oignon(s)'));
  assert.ok(six['covered-braise'].step.details[0].includes('300–375 mL de bouillon'));
  assert.ok(six['prepare-toppings'].step.details[0].includes('225 g de cheddar'));
  assert.ok(six['prepare-toppings'].step.details[0].includes('187,5 g de laitue'));
  assert.ok(six['prepare-toppings'].step.details[1].includes('2 avocat(s)'));
  assert.ok(six['prepare-toppings'].step.details[2].includes('300 g de crème'));
  assert.ok(six['warm-shells'].step.details[0].includes('18 coques'));

  const eightSalsa = eight['smoke-salsa'].step.details.join('\n');
  assert.ok(eightSalsa.includes('600 g de tomates'));
  assert.ok(eightSalsa.includes('2 jalapeño(s)'));
  assert.ok(eight['covered-braise'].step.details[0].includes('400–500 mL de bouillon'));
  assert.ok(eight['prepare-toppings'].step.details[0].includes('300 g de cheddar'));
  assert.ok(eight['prepare-toppings'].step.details[1].includes('3 avocat(s)'));
  assert.ok(eight['warm-shells'].step.details[0].includes('24 coques'));
});
