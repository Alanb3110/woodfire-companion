import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { validateRecipe, scaleIngredients } from '../js/recipe.js';
import { validateStepIngredientUsage } from '../js/step-details.js';

const targetServingAt = new Date(2026, 8, 1, 20, 0, 0, 0);
const recipeFiles = {
  duck: '../recipes/glazed-duck-sweet-potato-citrus.json',
  ribs: '../recipes/smoky-bbq-ribs-mac-slaw.json',
  halloumi: '../recipes/charred-halloumi-veg-couscous.json',
  skewers: '../recipes/glazed-chicken-skewers-rice.json'
};

async function loadJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

function byStepId(schedule, id) {
  const item = schedule.find(candidate => candidate.step.id === id);
  assert.ok(item, `Missing scheduled step ${id}.`);
  return item;
}

function scheduleText(schedule) {
  return schedule.flatMap(item => [item.step.summary || '', ...(item.step.details || [])]).join('\n');
}

for (const [name, path] of Object.entries(recipeFiles)) {
  test(`${name} wave-two recipe satisfies Recipe Schema V1 and Planner V1`, async () => {
    const recipe = await loadJson(path);
    const validation = validateRecipe(recipe);
    const usageValidation = validateStepIngredientUsage(recipe);

    assert.equal(validation.valid, true, validation.errors.join('\n'));
    assert.equal(usageValidation.valid, true, usageValidation.errors.join('\n'));

    for (const servings of new Set([recipe.servings.min, recipe.servings.reference, recipe.servings.max])) {
      assert.equal(scaleIngredients(recipe, servings).length, recipe.ingredients.length);
      const schedule = buildMealSchedule(recipe, { servings, targetServingAt });
      assert.equal(schedule.length, recipe.steps.length);
      assert.doesNotMatch(scheduleText(schedule), /\{\{use:/, `Unresolved step quantity token at ${servings} servings.`);
      assert.deepEqual(findDependencyIssues(recipe, schedule), []);
      assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
    }
  });
}

test('duck coordinates Air Fry side, stovetop fat rendering and temperature-driven Bake/Roast finish', async () => {
  const recipe = await loadJson(recipeFiles.duck);
  assert.equal(recipe.temperature.defaultTargetC, 74);
  assert.ok(recipe.steps.some(step => step.id === 'render-duck' && step.resources?.includes('stovetop')));
  assert.equal(recipe.steps.find(step => step.id === 'finish-duck').completion.type, 'temperature');

  const schedule = buildMealSchedule(recipe, { servings: 4, targetServingAt });
  const sweetPotato = byStepId(schedule, 'cook-sweet-potato');
  const preheat = byStepId(schedule, 'preheat-duck');
  const finish = byStepId(schedule, 'finish-duck');
  assert.ok(sweetPotato.end <= preheat.start);
  assert.ok(preheat.end <= finish.start);
});

test('ribs use observation-led tenderness before parallel finishing work', async () => {
  const recipe = await loadJson(recipeFiles.ribs);
  const check = recipe.steps.find(step => step.id === 'check-ribs');
  assert.equal(check.completion.type, 'tenderness');
  assert.equal(check.recheck.notReadyMin, 20);
  assert.equal(recipe.steps.find(step => step.id === 'cook-macaroni').dependencies[0].stepId, 'check-ribs');
  assert.equal(recipe.steps.find(step => step.id === 'glaze-ribs').dependencies[0].stepId, 'check-ribs');

  const schedule = buildMealSchedule(recipe, { servings: 4, targetServingAt });
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
});

test('halloumi is a genuinely fast recipe without temperature tracking', async () => {
  const recipe = await loadJson(recipeFiles.halloumi);
  assert.equal(recipe.temperature, undefined);
  assert.ok(recipe.timing.elapsedRangeMin[1] <= 70);
  assert.equal(recipe.steps.some(step => step.completion?.type === 'temperature'), false);

  const schedule = buildMealSchedule(recipe, { servings: 4, targetServingAt });
  assert.ok(byStepId(schedule, 'grill-veg').end <= byStepId(schedule, 'grill-halloumi').start);
});

test('teriyaki skewers combine advance prep, parallel rice and safe chicken temperature completion', async () => {
  const recipe = await loadJson(recipeFiles.skewers);
  assert.equal(recipe.temperature.defaultTargetC, 74);
  assert.match(recipe.advancePrep?.[0]?.timing || '', /30 min à 4 h/);
  assert.ok(recipe.steps.some(step => step.resources?.includes('stovetop')));
  assert.equal(recipe.steps.find(step => step.id === 'grill-skewers').completion.type, 'temperature');
});

test('wave-two recipes are live with their matching local realistic WebP covers', async () => {
  const library = await loadJson('../recipes/index.json');
  const ids = new Set(Object.values(recipeFiles).map(path => path.match(/\/([^/]+)\.json$/)[1]));
  const entries = library.recipes.filter(entry => ids.has(entry.id));
  assert.equal(entries.length, 4);
  for (const entry of entries) {
    assert.equal(entry.status, 'available');
    assert.equal(entry.visual?.imageUrl, `./assets/recipes/${entry.id}.webp`);
  }
});
