import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveServiceStep } from '../js/journal.js';

test('zero-offset serve anchor is the service milestone even when another task is serve-relative', () => {
  const recipe = {
    steps: [
      { id: 'sauce', plan: { anchor: 'serve', anchorOffsetMin: -120 } },
      { id: 'plate' },
      { id: 'eat', plan: { anchor: 'serve' } }
    ]
  };

  assert.equal(resolveServiceStep(recipe).id, 'eat');
});

test('explicit serviceStepId wins when multiple zero-offset serve anchors exist', () => {
  const recipe = {
    serviceStepId: 'serve-guests',
    steps: [
      { id: 'hold', plan: { anchor: 'serve' } },
      { id: 'serve-guests', plan: { anchor: 'serve' } }
    ]
  };

  assert.equal(resolveServiceStep(recipe).id, 'serve-guests');
});

test('ambiguous service anchors require serviceStepId', () => {
  const recipe = {
    steps: [
      { id: 'one', plan: { anchor: 'serve' } },
      { id: 'two', plan: { anchor: 'serve' } }
    ]
  };

  assert.throws(() => resolveServiceStep(recipe), /serviceStepId/);
});
