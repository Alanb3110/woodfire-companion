import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecipe } from '../js/recipe.js';

function validRecipe() {
  return {
    schemaVersion: 1,
    id: 'contract-fixture',
    version: 1,
    title: 'Contract fixture',
    servings: { min: 1, reference: 2, max: 4 },
    timing: { activePrepMin: 5, elapsedRangeMin: [5, 15] },
    serviceStepId: 'serve',
    components: [{
      id: 'main',
      type: 'main',
      title: 'Main',
      ingredientIds: ['ingredient'],
      stepIds: ['prep', 'serve']
    }],
    ingredients: [{
      id: 'ingredient',
      name: 'Ingredient',
      quantity: 2,
      unit: 'piece',
      scale: { type: 'linear' }
    }],
    equipment: [],
    steps: [
      {
        id: 'prep',
        component: 'main',
        title: 'Prep',
        durationMin: 5,
        resources: [],
        completion: { type: 'manual', description: 'Prepared' }
      },
      {
        id: 'serve',
        component: 'main',
        title: 'Serve',
        durationMin: 0,
        plan: { anchor: 'serve' },
        dependencies: [{ stepId: 'prep', relation: 'after_finish', lagMin: 0 }],
        resources: [],
        completion: { type: 'manual', description: 'Served' }
      }
    ]
  };
}

function errorsFor(mutator) {
  const recipe = validRecipe();
  mutator(recipe);
  return validateRecipe(recipe).errors.join('\n');
}

test('minimal structured recipe satisfies the hardened contract', () => {
  const result = validateRecipe(validRecipe());
  assert.equal(result.valid, true, result.errors.join('\n'));
});

test('serving bounds must contain the reference serving count', () => {
  assert.match(errorsFor(recipe => { recipe.servings.min = 3; }), /servings\.min/);
  assert.match(errorsFor(recipe => { recipe.servings.max = 1; }), /servings\.reference/);
});

test('component identities and step ownership must be coherent', () => {
  assert.match(errorsFor(recipe => { recipe.components.push({ ...recipe.components[0] }); }), /Duplicate component id/);
  assert.match(errorsFor(recipe => { recipe.steps[0].component = 'missing'; }), /missing component/);
  assert.match(errorsFor(recipe => { recipe.components[0].stepIds = ['serve']; }), /missing from component\.stepIds/);
});

test('anchored recipes reject disconnected planner steps', () => {
  const errors = errorsFor(recipe => {
    recipe.steps.push({
      id: 'orphan',
      component: 'meal',
      title: 'Orphan',
      durationMin: 5,
      resources: [],
      completion: { type: 'manual', description: 'Done' }
    });
  });
  assert.match(errors, /not connected to any planning anchor/);
});

test('completion and recheck semantics are validated', () => {
  assert.match(errorsFor(recipe => { recipe.steps[0].completion.type = 'magic'; }), /Invalid completion type/);
  assert.match(errorsFor(recipe => { recipe.steps[0].recheck = { notReadyMin: [0, 10] }; }), /recheck\.notReadyMin/);
});

test('serviceStepId must resolve to the actual zero-offset service anchor', () => {
  assert.match(errorsFor(recipe => { recipe.serviceStepId = 'missing'; }), /serviceStepId references missing step/);
  assert.match(errorsFor(recipe => { recipe.steps[1].plan.anchorOffsetMin = -10; }), /serviceStepId must reference a zero-offset serve anchor/);
});

test('step scaling breakpoints must cover servings.max', () => {
  const errors = errorsFor(recipe => {
    recipe.ingredients[0].scale = { type: 'step', breakpoints: [{ maxServings: 2, quantity: 1 }] };
  });
  assert.match(errors, /breakpoints must cover servings\.max/);
});
