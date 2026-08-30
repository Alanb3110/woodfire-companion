import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const serviceWorker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');

test('temperature modules are available in the offline app shell', () => {
  assert.match(serviceWorker, /'\.\/js\/temperature\.js'/);
  assert.match(serviceWorker, /'\.\/js\/temperature-ui\.js'/);
});
