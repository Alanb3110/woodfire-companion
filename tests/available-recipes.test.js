import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { validateRecipe, scaleIngredients } from '../js/recipe.js';
import { validateStepIngredientUsage } from '../js/step-details.js';
import { buildShoppingGroups } from '../js/shopping.js';
import { resolveServiceStep } from '../js/journal.js';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));
const targetServingAt = new Date(2026, 7, 29, 20, 0, 0, 0);

function recipeFileUrl(recipeUrl) {
  const relative = recipeUrl.replace(/^\.\//, '');
  return new URL(`../${relative}`, import.meta.url);
}

function scheduleText(schedule) {
  return schedule.flatMap(item => [item.step.summary || '', ...(item.step.details || [])]).join('\n');
}

for (const entry of library.recipes.filter(item => item.status === 'available')) {
  test(`available recipe ${entry.id} satisfies the executable contract`, async () => {
    const recipe = JSON.parse(await readFile(recipeFileUrl(entry.recipeUrl), 'utf8'));
    const validation = validateRecipe(recipe);
    const stepUsageValidation = validateStepIngredientUsage(recipe);

    assert.equal(validation.valid, true, validation.errors.join('\n'));
    assert.equal(stepUsageValidation.valid, true, stepUsageValidation.errors.join('\n'));
    assert.equal(recipe.id, entry.id, 'Manifest and recipe ids must match.');
    assert.equal(recipe.title, entry.title, 'Manifest and recipe titles must match.');
    assert.deepEqual(recipe.servings, entry.servings, 'Manifest and recipe serving ranges must match.');

    for (const ingredient of recipe.ingredients) {
      assert.notEqual(
        ingredient.quantity,
        null,
        `${recipe.id}:${ingredient.id} must expose an actionable baseline quantity or range instead of only “au goût”.`
      );
    }

    const { min, reference, max } = recipe.servings;
    assert.ok(min > 0 && min <= reference && reference <= max, 'Serving bounds must contain the reference serving count.');

    for (const servings of new Set([min, reference, max])) {
      const scaled = scaleIngredients(recipe, servings);
      assert.equal(scaled.length, recipe.ingredients.length);
      const groups = buildShoppingGroups(recipe, servings);
      assert.ok(groups.flatMap(group => group.items).length >= recipe.ingredients.length);

      const schedule = buildMealSchedule(recipe, { servings, targetServingAt });
      assert.equal(schedule.length, recipe.steps.length);
      assert.doesNotMatch(scheduleText(schedule), /\{\{use:/, `Unresolved step quantity token at ${servings} servings.`);
      assert.deepEqual(findDependencyIssues(recipe, schedule), []);
      assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
    }

    const referenceSchedule = buildMealSchedule(recipe, { servings: reference, targetServingAt });
    const serviceStep = resolveServiceStep(recipe);
    assert.ok(referenceSchedule.some(item => item.step.id === serviceStep.id));
  });
}
