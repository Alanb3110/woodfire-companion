import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { validateRecipe } from '../js/recipe.js';
import { validateRecipeIngredientUsage } from '../js/step-details.js';
import { getAdvancePrep } from '../js/shopping.js';

const specs = [
  { id: 'gochujang-honey-soy-chicken-rice', file: 'gochujang-honey-soy-chicken-rice.json', targetC: 74, cookStep: 'grill-chicken', range: [12, 18] },
  { id: 'bulgogi-bavette-udon', file: 'bulgogi-bavette-udon.json', targetC: 63, cookStep: 'grill-bulgogi', range: [8, 12], restStep: 'rest-beef' },
  { id: 'maple-mustard-soy-pork-tenderloin', file: 'maple-mustard-soy-pork-tenderloin.json', targetC: 63, cookStep: 'roast-pork', range: [18, 25], restStep: 'rest-pork' },
  { id: 'miso-honey-salmon-soba', file: 'miso-honey-salmon-soba.json', targetC: 63, cookStep: 'roast-salmon', range: [10, 16] }
];

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));
const targetServingAt = new Date(2026, 8, 1, 20, 0, 0, 0);

for (const spec of specs) {
  test(`${spec.id} is an executable untested overnight-prep meal`, async () => {
    const recipe = JSON.parse(await readFile(new URL(`../recipes/${spec.file}`, import.meta.url), 'utf8'));
    const entry = library.recipes.find(item => item.id === spec.id);

    assert.ok(entry, 'Recipe must be present in the library manifest.');
    assert.equal(entry.status, 'available');
    assert.equal(entry.qualification, 'untested');
    assert.deepEqual(entry.servings, recipe.servings);
    assert.equal(recipe.temperature.defaultTargetC, spec.targetC);

    const validation = validateRecipe(recipe);
    const usageValidation = validateRecipeIngredientUsage(recipe);
    assert.equal(validation.valid, true, validation.errors.join('\n'));
    assert.equal(usageValidation.valid, true, usageValidation.errors.join('\n'));

    const cookStep = recipe.steps.find(step => step.id === spec.cookStep);
    assert.deepEqual(cookStep.durationRangeMin, spec.range);
    assert.equal(cookStep.woodfire.smoke, false);
    assert.equal(cookStep.woodfire.pellets, false);
    assert.equal(cookStep.woodfire.covered, false);

    if (spec.restStep) {
      assert.equal(recipe.steps.find(step => step.id === spec.restStep)?.durationMin, 3);
    }

    for (const servings of new Set([recipe.servings.min, recipe.servings.reference, recipe.servings.max])) {
      const advancePrep = getAdvancePrep(recipe, servings);
      assert.ok(advancePrep.length >= 1);
      assert.match(advancePrep[0].timing, /La veille/);
      assert.doesNotMatch(advancePrep.map(item => item.details || '').join('\n'), /\{\{use:/);

      const schedule = buildMealSchedule(recipe, { servings, targetServingAt });
      assert.equal(schedule.length, recipe.steps.length);
      assert.deepEqual(findDependencyIssues(recipe, schedule), []);
      assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
    }
  });
}

test('quick overnight batch expands the executable library to 15 meals', () => {
  assert.equal(library.recipes.filter(item => item.status === 'available').length, 15);
});
