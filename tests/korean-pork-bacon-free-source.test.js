import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rice = await readFile(new URL('../recipes/egg-fried-rice.json', import.meta.url), 'utf8');

test('Egg Fried Rice recipe intentionally contains no bacon option', () => {
  assert.doesNotMatch(rice, /bacon/i);
});
