import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildMealSchedule } from '../js/meal-planner.js';
import {
  materializeAdvancePrepForServings,
  materializeRecipeForServings,
  validateAdvancePrepIngredientUsage,
  validateRecipeIngredientUsage,
  validateStepIngredientUsage
} from '../js/step-details.js';

const pork = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));
const targetServingAt = new Date(2026, 7, 29, 20, 0, 0, 0);

function step(recipe, id) {
  return recipe.steps.find(item => item.id === id);
}

function allStepText(recipe) {
  return recipe.steps.flatMap(item => [item.summary || '', ...(item.details || [])]).join('\n');
}

test('Pork Belly structured step ingredient usage validates', () => {
  const validation = validateRecipeIngredientUsage(pork);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
});

test('Pork Belly step quantities materialize cleanly for 2, 4, 6 and 8 servings', () => {
  const expectations = new Map([
    [2, {
      pork: '0,6–0,75 kg',
      potatoes: '350–400 g',
      lemonCount: '1 citron(s)',
      lemonJuice: '10–15 mL'
    }],
    [4, {
      pork: '1,2–1,5 kg',
      potatoes: '700–800 g',
      lemonCount: '1 citron(s)',
      lemonJuice: '20–30 mL'
    }],
    [6, {
      pork: '1,8–2,25 kg',
      potatoes: '1050–1200 g',
      lemonCount: '2 citron(s)',
      lemonJuice: '30–45 mL'
    }],
    [8, {
      pork: '2,4–3 kg',
      potatoes: '1400–1600 g',
      lemonCount: '2 citron(s)',
      lemonJuice: '40–60 mL'
    }]
  ]);

  for (const [servings, expected] of expectations) {
    const materialized = materializeRecipeForServings(pork, servings);
    assert.doesNotMatch(allStepText(materialized), /\{\{use:/, `No unresolved usage token at ${servings} servings.`);
    assert.match(step(materialized, 'take-out-pork').details[0], new RegExp(expected.pork.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(step(materialized, 'potato-boil').summary, new RegExp(expected.potatoes.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(step(materialized, 'sauce').details[2], new RegExp(expected.lemonCount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(step(materialized, 'sauce').details[2], new RegExp(expected.lemonJuice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('meal planner exposes serving-materialized text without changing the execution structure', () => {
  const four = buildMealSchedule(pork, { servings: 4, targetServingAt });
  const eight = buildMealSchedule(pork, { servings: 8, targetServingAt });

  assert.equal(four.length, pork.steps.length);
  assert.equal(eight.length, pork.steps.length);
  assert.deepEqual(four.map(item => item.step.id), eight.map(item => item.step.id));
  assert.equal(step({ steps: four.map(item => item.step) }, 'potato-boil').summary, '700–800 g · 8 à 10 min');
  assert.equal(step({ steps: eight.map(item => item.step) }, 'potato-boil').summary, '1400–1600 g · 8 à 10 min');
  assert.equal(four.at(-1).end.getTime(), eight.at(-1).end.getTime(), 'Serving scaling does not invent duration/batching changes in Planner V1.');
});

test('step usage validation rejects missing tokens and unsafe unit overrides', () => {
  const fixture = {
    servings: { reference: 4, min: 2, max: 8 },
    ingredients: [
      { id: 'item', name: 'Item', quantity: 100, unit: 'g', scale: { type: 'linear' } }
    ],
    steps: [
      {
        id: 'bad',
        summary: '{{use:missing}}',
        details: ['{{use:converted}}'],
        ingredientUsage: [
          { id: 'converted', ingredientId: 'item', unit: 'kg' }
        ]
      }
    ]
  };

  const validation = validateStepIngredientUsage(fixture);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('missing ingredientUsage token missing')));
  assert.ok(validation.errors.some(error => error.includes('changes unit without an explicit converted quantity')));
});

test('step-local step scaling must cover the recipe maximum serving count', () => {
  const fixture = {
    servings: { reference: 4, min: 2, max: 8 },
    ingredients: [
      { id: 'item', name: 'Item', quantity: 1, unit: 'piece', scale: { type: 'fixed' } }
    ],
    steps: [
      {
        id: 'bad-step-scale',
        summary: '{{use:item-count}}',
        details: [],
        ingredientUsage: [
          {
            id: 'item-count',
            ingredientId: 'item',
            scale: {
              type: 'step',
              breakpoints: [{ maxServings: 4, quantity: 1 }]
            }
          }
        ]
      }
    ]
  };

  const validation = validateStepIngredientUsage(fixture);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('must cover servings.max')));
});

test('advance-prep ingredient usage materializes with the same serving semantics as steps', () => {
  const fixture = {
    servings: { reference: 4, min: 2, max: 8 },
    ingredients: [
      { id: 'meat', name: 'Meat', quantity: 2, unit: 'kg', scale: { type: 'linear' } },
      { id: 'lime', name: 'Lime', quantity: 2, unit: 'piece', scale: { type: 'fixed' } }
    ],
    advancePrep: [
      {
        id: 'marinate',
        title: 'Marinate',
        details: 'Mariner {{use:meat}} avec {{use:lime}} citron(s).',
        ingredientUsage: [
          { id: 'meat', ingredientId: 'meat' },
          { id: 'lime', ingredientId: 'lime', displayUnit: false }
        ]
      }
    ],
    steps: []
  };

  const validation = validateAdvancePrepIngredientUsage(fixture);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  assert.equal(materializeAdvancePrepForServings(fixture, 8)[0].details, 'Mariner 4 kg avec 2 citron(s).');
});

test('advance-prep tokens are included in whole-recipe usage validation', () => {
  const fixture = {
    servings: { reference: 4, min: 2, max: 8 },
    ingredients: [{ id: 'item', name: 'Item', quantity: 1, unit: 'piece', scale: { type: 'fixed' } }],
    advancePrep: [{ id: 'bad-prep', title: 'Bad prep', details: '{{use:missing}}' }],
    steps: []
  };

  const validation = validateRecipeIngredientUsage(fixture);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(error => error.includes('advancePrep bad-prep')));
  assert.ok(validation.errors.some(error => error.includes('without ingredientUsage')));
});
