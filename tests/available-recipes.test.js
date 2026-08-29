import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSchedule, findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { validateRecipe, scaleIngredients } from '../js/recipe.js';
import { buildShoppingGroups } from '../js/shopping.js';
import { resolveServiceStep } from '../js/journal.js';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));
const referenceDate = new Date(2026, 7, 29, 12, 0, 0, 0);

function recipeFileUrl(recipeUrl) {
  const relative = recipeUrl.replace(/^\.\//, '');
  return new URL(`../${relative}`, import.meta.url);
}

for (const entry of library.recipes.filter(item => item.status === 'available')) {
  test(`available recipe ${entry.id} satisfies the executable contract`, async () => {
    const recipe = JSON.parse(await readFile(recipeFileUrl(entry.recipeUrl), 'utf8'));
    const validation = validateRecipe(recipe);

    assert.equal(validation.valid, true, validation.errors.join('\n'));
    assert.equal(recipe.id, entry.id, 'Manifest and recipe ids must match.');
    assert.equal(recipe.title, entry.title, 'Manifest and recipe titles must match.');
    assert.deepEqual(recipe.servings, entry.servings, 'Manifest and recipe serving ranges must match.');

    const { min, reference, max } = recipe.servings;
    assert.ok(min > 0 && min <= reference && reference <= max, 'Serving bounds must contain the reference serving count.');

    for (const servings of new Set([min, reference, max])) {
      const scaled = scaleIngredients(recipe, servings);
      assert.equal(scaled.length, recipe.ingredients.length);
      const groups = buildShoppingGroups(recipe, servings);
      assert.ok(groups.flatMap(group => group.items).length >= recipe.ingredients.length);
    }

    const schedule = buildSchedule(recipe, '20:00', referenceDate);
    assert.equal(schedule.length, recipe.steps.length);
    assert.deepEqual(findDependencyIssues(recipe, schedule), []);
    assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);

    const serviceStep = resolveServiceStep(recipe);
    assert.ok(schedule.some(item => item.step.id === serviceStep.id));
  });
}
