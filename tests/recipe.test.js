import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRecipe, scaleIngredients } from '../js/recipe.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));

test('reference recipe validates against schema v1 semantics', () => {
  const result = validateRecipe(recipe);
  assert.equal(result.valid, true, result.errors.join('\n'));
  assert.equal(result.warnings.includes('Recipe has no heroImage yet.'), false);
});

test('every supplied planner duration must be a non-negative finite number', () => {
  for (const invalidDuration of [-5, '20']) {
    const candidate = structuredClone(recipe);
    candidate.steps[0].durationMin = 10;
    candidate.steps[0].durationPlanMin = invalidDuration;
    delete candidate.steps[0].durationRangeMin;

    const result = validateRecipe(candidate);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('Invalid durationPlanMin')));
  }
});

test('an invalid duration range is reported instead of crashing validation', () => {
  const candidate = structuredClone(recipe);
  candidate.steps[0].durationRangeMin = {};
  candidate.steps[0].durationPlanMin = 10;

  assert.doesNotThrow(() => validateRecipe(candidate));
  const result = validateRecipe(candidate);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('Invalid durationRangeMin')));
});

test('reference recipe is fully migrated away from preferred start offsets', () => {
  const legacySteps = recipe.steps.filter(step => step.plan?.preferredStartOffsetMin !== undefined);
  assert.deepEqual(legacySteps.map(step => step.id), []);
  assert.ok(recipe.steps.some(step => step.plan?.anchor === 'serve'));
});

test('reference recipe exposes explicit planning buffers for uncertain pork and potato readiness', () => {
  const finish = recipe.steps.find(step => step.id === 'finish-pork');
  const airfry = recipe.steps.find(step => step.id === 'airfry-potatoes');
  assert.equal(finish.dependencies.find(dep => dep.stepId === 'first-check').planningBufferMin, 35);
  assert.equal(airfry.dependencies.find(dep => dep.stepId === 'potato-prep').planningBufferMin, 25);
});

test('linear ingredient ranges scale from 4 to 6 servings', () => {
  const scaled = scaleIngredients(recipe, 6);
  const pork = scaled.find(item => item.id === 'pork-belly');
  assert.deepEqual(pork.quantity, { min: 1800, max: 2250 });
});

test('step-scaled lemon rounds to two for 6 servings', () => {
  const scaled = scaleIngredients(recipe, 6);
  const lemon = scaled.find(item => item.id === 'lemon');
  assert.equal(lemon.quantity, 2);
});

test('reference recipe exposes indicative quantities for every displayed ingredient', () => {
  const missingGuidance = recipe.ingredients
    .filter(item => item.quantity === null)
    .map(item => item.id);
  assert.deepEqual(missingGuidance, []);
});
