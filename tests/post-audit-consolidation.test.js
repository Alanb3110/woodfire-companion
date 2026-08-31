import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [indexHtml, app, serviceWorker, prepUi] = await Promise.all([
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/prep-ui.js', import.meta.url), 'utf8')
]);

test('planner-derived start hint is rendered directly and remains available offline', () => {
  assert.doesNotMatch(indexHtml, /\.\/js\/start-hint\.js/);
  assert.match(app, /recommendedStartFromPlan\(selectedRecipe,/);
  assert.match(serviceWorker, /\.\/js\/meal-planner\.js/);
});

test('shopping checkbox persistence is scoped by recipe content version', () => {
  assert.match(prepUi, /`\$\{recipe\.id\}@\$\{recipe\.version \?\? 1\}`/);
  assert.match(prepUi, /compatibility path for shopping checks saved before recipe-version scoping/i);
});
