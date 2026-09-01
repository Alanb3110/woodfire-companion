import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRecipe } from '../js/recipe.js';
import { validateRecipeIngredientUsage, materializeRecipeForServings } from '../js/step-details.js';
import { buildMealSchedule } from '../js/meal-planner.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { buildShoppingGroups } from '../js/shopping.js';

const pork = JSON.parse(await readFile(new URL('../recipes/korean-pulled-pork-woodfire.json', import.meta.url), 'utf8'));
const rice = JSON.parse(await readFile(new URL('../recipes/egg-fried-rice.json', import.meta.url), 'utf8'));
const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));
const targetServingAt = new Date(2026, 8, 1, 20, 0, 0, 0);

function assertExecutable(recipe) {
  const validation = validateRecipe(recipe);
  const usageValidation = validateRecipeIngredientUsage(recipe);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(usageValidation.valid, true, usageValidation.errors.join('\n'));

  for (const servings of new Set([recipe.servings.min, recipe.servings.reference, recipe.servings.max])) {
    const materialized = materializeRecipeForServings(recipe, servings);
    assert.doesNotMatch(JSON.stringify(materialized.steps), /\{\{use:/);
    const schedule = buildMealSchedule(recipe, { servings, targetServingAt });
    assert.equal(schedule.length, recipe.steps.length);
    assert.deepEqual(findDependencyIssues(recipe, schedule), []);
    assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
  }
}

test('Korean pulled pork is an executable long Woodfire recipe', () => {
  assertExecutable(pork);
  assert.equal(pork.temperature.defaultTargetC, 95);
  assert.equal(pork.advancePrep[0].timing, 'La veille · 12 à 24 h au réfrigérateur');

  const smoke = pork.steps.find(step => step.id === 'smoke-pork');
  assert.equal(smoke.woodfire.mode, 'SMOKER');
  assert.equal(smoke.woodfire.smoke, true);
  assert.equal(smoke.woodfire.pellets, true);

  const slow = pork.steps.find(step => step.id === 'slow-cook-pork');
  assert.equal(slow.woodfire.mode, 'BAKE_ROAST');
  assert.equal(slow.woodfire.temperatureC, 130);
  assert.equal(slow.woodfire.covered, true);

  const check = pork.steps.find(step => step.id === 'check-pork');
  assert.equal(check.recheck.notReadyMin, 20);
  assert.match(check.completion.description, /94–95 °C/);
});

test('Egg Fried Rice keeps gochujang and Korean pork optional', () => {
  assertExecutable(rice);
  assert.equal(rice.temperature, undefined);

  const gochujang = rice.ingredients.find(item => item.id === 'gochujang');
  const porkOption = rice.ingredients.find(item => item.id === 'korean-pulled-pork');
  assert.equal(gochujang.optional, true);
  assert.equal(porkOption.optional, true);

  const sauce = rice.steps.find(step => step.id === 'prep-sauce');
  assert.match(sauce.details.join('\n'), /Version classique/);
  assert.match(sauce.details.join('\n'), /Version gochujang/);

  const season = rice.steps.find(step => step.id === 'season-rice');
  assert.match(season.details.join('\n'), /Si tu utilises le porc coréen/);

  const groups = buildShoppingGroups(rice, 2);
  const allItems = groups.flatMap(group => group.items);
  assert.equal(allItems.find(item => item.sourceId === 'gochujang').optional, true);
  assert.equal(allItems.find(item => item.sourceId === 'korean-pulled-pork').optional, true);
});

test('library exposes 17 executable meals including the two new recipes', () => {
  const available = library.recipes.filter(entry => entry.status === 'available');
  assert.equal(available.length, 17);
  for (const id of ['korean-pulled-pork-woodfire', 'egg-fried-rice']) {
    const entry = available.find(item => item.id === id);
    assert.ok(entry);
    assert.equal(entry.qualification, 'untested');
    assert.match(entry.visual.imageUrl, /^\.\/assets\/recipes\/.*\.webp$/);
  }
});
