import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('recipe start hint is rendered directly by app orchestration', () => {
  assert.match(app, /recommendedStartFromPlan\(selectedRecipe,/);
  assert.match(app, /calculé depuis le planning complet/);
});

test('recipe start hint no longer uses a DOM-observer sidecar', () => {
  assert.doesNotMatch(index, /js\/start-hint\.js/);
  assert.doesNotMatch(app, /MutationObserver/);
});
