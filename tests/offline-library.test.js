import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serviceWorker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

test('offline recipe cache is driven by the library manifest', () => {
  assert.match(serviceWorker, /fetch\('\.\/recipes\/index\.json'/);
  assert.match(serviceWorker, /entry\.status === 'available' && entry\.recipeUrl/);
  assert.match(serviceWorker, /\.map\(entry => entry\.recipeUrl\)/);
  assert.match(serviceWorker, /cache\.addAll\(recipeUrls\)/);
});

test('service worker does not hard-code an executable recipe filename', () => {
  assert.doesNotMatch(serviceWorker, /recipes\/pork-belly-burnt-ends\.json/);
});
