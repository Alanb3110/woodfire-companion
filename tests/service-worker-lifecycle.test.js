import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serviceWorker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

test('service-worker updates do not force activation over an open cook', () => {
  assert.doesNotMatch(serviceWorker, /self\.skipWaiting\s*\(/);
  assert.match(serviceWorker, /const CACHE_REVISION = '[^']+'/);
  assert.match(serviceWorker, /CACHE_NAME = `woodfire-companion-\$\{APP_VERSION\}-\$\{CACHE_REVISION\}`/);
});

test('activation still claims the current page when activation is allowed', () => {
  assert.match(serviceWorker, /self\.clients\.claim\s*\(\)/);
});
