import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serviceWorker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

test('offline recipe cache is driven by the library manifest', () => {
  assert.match(serviceWorker, /fetch\('\.\/recipes\/index\.json'/);
  assert.match(serviceWorker, /entry\.status === 'available' && entry\.recipeUrl/);
  assert.match(serviceWorker, /entry\.visual\?\.imageUrl/);
  assert.match(serviceWorker, /\.flatMap\(/);
  assert.match(serviceWorker, /cache\.addAll\(uniqueUrls\)/);
});

test('service worker does not hard-code executable recipe or cover filenames', () => {
  assert.doesNotMatch(serviceWorker, /recipes\/pork-belly-burnt-ends\.json/);
  assert.doesNotMatch(serviceWorker, /assets\/recipes\/pork-belly-burnt-ends\.svg/);
});

test('offline shell carries an explicit cache revision and bypasses stale HTTP cache', () => {
  assert.match(serviceWorker, /const CACHE_REVISION = '[^']+'/);
  assert.match(serviceWorker, /'\.\/js\/start-hint\.js'/);
  assert.match(serviceWorker, /'\.\/js\/step-details\.js'/);
  assert.match(serviceWorker, /fetch\(event\.request, \{ cache: 'no-store' \}\)/);
});
