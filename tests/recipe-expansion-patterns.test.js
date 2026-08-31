import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import { findDependencyIssues, findResourceConflicts } from '../js/planner.js';
import { validateRecipe, scaleIngredients } from '../js/recipe.js';
import { validateStepIngredientUsage } from '../js/step-details.js';

const targetServingAt = new Date(2026, 7, 31, 20, 0, 0, 0);
const recipeFiles = {
  salmon: '../recipes/honey-soy-salmon-rice-asparagus.json',
  shawarma: '../recipes/smoked-chicken-shawarma-potatoes.json',
  beef: '../recipes/reverse-sear-beef-potatoes-pepper-sauce.json',
  wings: '../recipes/smoky-honey-soy-wings-potatoes-slaw.json'
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
  test(`${name} expansion recipe satisfies Recipe Schema V1 and Planner V1`, async () => {
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

test('salmon adds a fast temperature-driven fish pattern with stovetop parallel work', async () => {
  const recipe = await loadJson(recipeFiles.salmon);
  assert.equal(recipe.temperature.defaultTargetC, 63);
  assert.ok(recipe.timing.elapsedRangeMin[1] <= 80);
  assert.ok(recipe.steps.some(step => step.resources?.includes('stovetop')));
  assert.ok(recipe.steps.some(step => step.completion?.type === 'temperature'));
});

test('shawarma adds advance preparation and a multi-mode Woodfire flow', async () => {
  const recipe = await loadJson(recipeFiles.shawarma);
  assert.equal(recipe.temperature.defaultTargetC, 74);
  assert.match(recipe.advancePrep?.[0]?.timing || '', /4 à 12 h/);
  const modes = new Set(recipe.steps.filter(step => step.woodfire).map(step => step.woodfire.mode));
  assert.ok(modes.has('SMOKER'));
  assert.ok(modes.has('GRILL'));
  assert.ok(modes.has('AIR_FRY'));
});

test('reverse-sear beef exercises an intermediate checkpoint before the final temperature criterion', async () => {
  const recipe = await loadJson(recipeFiles.beef);
  assert.equal(recipe.temperature.defaultTargetC, 63);
  const smoke = recipe.steps.find(step => step.id === 'smoke-beef');
  const sear = recipe.steps.find(step => step.id === 'sear-beef');
  assert.equal(smoke.completion.type, 'combined');
  assert.match([smoke.summary, ...(smoke.details || [])].join(' '), /52[–-]55/);
  assert.equal(sear.completion.type, 'temperature');

  const schedule = buildMealSchedule(recipe, { servings: recipe.servings.reference, targetServingAt });
  const order = ['smoke-beef', 'airfry-potatoes', 'preheat-grill', 'sear-beef'].map(id => byStepId(schedule, id).start.getTime());
  assert.ok(order.every((value, index) => index === 0 || value >= order[index - 1]));
});

test('wings leaves two Woodfire branches unordered in recipe data and lets Planner V1 resolve the conflict', async () => {
  const recipe = await loadJson(recipeFiles.wings);
  const wings = recipe.steps.find(step => step.id === 'cook-wings');
  const potatoes = recipe.steps.find(step => step.id === 'cook-potatoes');
  assert.ok(wings.resources.includes('woodfire'));
  assert.ok(potatoes.resources.includes('woodfire'));
  assert.equal((wings.dependencies || []).some(dep => dep.stepId === potatoes.id), false);
  assert.equal((potatoes.dependencies || []).some(dep => dep.stepId === wings.id), false);

  const schedule = buildMealSchedule(recipe, { servings: recipe.servings.reference, targetServingAt });
  assert.deepEqual(findResourceConflicts(schedule, 'woodfire'), []);
  const wingsItem = byStepId(schedule, 'cook-wings');
  const potatoesItem = byStepId(schedule, 'cook-potatoes');
  assert.ok(wingsItem.end <= potatoesItem.start || potatoesItem.end <= wingsItem.start);
});

test('planner-pattern recipes are promoted with truthful local WebP covers', async () => {
  const library = await loadJson('../recipes/index.json');
  const ids = new Set(Object.values(recipeFiles).map(path => path.match(/\/([^/]+)\.json$/)[1]));
  const entries = library.recipes.filter(entry => ids.has(entry.id));
  assert.equal(entries.length, 4);
  for (const entry of entries) {
    assert.equal(entry.status, 'available');
    assert.match(entry.recipeUrl || '', /^\.\/recipes\/.+\.json$/);
    assert.match(entry.visual?.imageUrl || '', /^\.\/assets\/recipes\/.+\.webp$/);
  }
});
