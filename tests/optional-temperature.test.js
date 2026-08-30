import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateRecipe } from '../js/recipe.js';
import { defaultTemperatureTarget, temperatureTrackingEnabled } from '../js/temperature.js';

const reference = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));

function copyRecipe() {
  return structuredClone(reference);
}

test('a recipe with no temperature metadata is valid and disables tracking', () => {
  const recipe = copyRecipe();
  delete recipe.temperature;
  const validation = validateRecipe(recipe);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(temperatureTrackingEnabled(recipe), false);
  assert.equal(defaultTemperatureTarget(recipe), null);
});

test('temperature tracking can be explicitly disabled', () => {
  const recipe = copyRecipe();
  recipe.temperature = { enabled: false };
  const validation = validateRecipe(recipe);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(temperatureTrackingEnabled(recipe), false);
});

test('temperature metadata must be a real object when provided', () => {
  for (const malformed of [null, '74', [], 74]) {
    const recipe = copyRecipe();
    recipe.temperature = malformed;
    const validation = validateRecipe(recipe);
    assert.equal(validation.valid, false, `Expected malformed temperature value ${JSON.stringify(malformed)} to fail.`);
    assert.ok(validation.errors.some(error => error.includes('temperature must be an object')));
  }
});

test('enabled tracking requires a valid 30–120 °C default target', () => {
  const missing = copyRecipe();
  missing.temperature = { enabled: true };
  assert.equal(validateRecipe(missing).valid, false);

  const tooHigh = copyRecipe();
  tooHigh.temperature = { enabled: true, defaultTargetC: 130 };
  assert.equal(validateRecipe(tooHigh).valid, false);

  const valid = copyRecipe();
  valid.temperature = { enabled: true, defaultTargetC: 93 };
  assert.equal(validateRecipe(valid).valid, true, validateRecipe(valid).errors.join('\n'));
});

test('temperature completion cannot be declared when recipe tracking has no target', () => {
  const recipe = copyRecipe();
  delete recipe.temperature;
  recipe.steps[0].completion = { type: 'temperature', description: 'Atteindre la température cible.' };
  const validation = validateRecipe(recipe);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('Temperature completion')));
});
