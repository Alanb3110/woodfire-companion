import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const files = await readdir(new URL('../recipes/', import.meta.url));
const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));

test('Korean pulled pork has one canonical recipe file and manifest entry', () => {
  assert.equal(files.filter(name => name.includes('korean-pulled-pork') && name.endsWith('.json')).length, 1);
  assert.equal(library.recipes.filter(entry => entry.id === 'korean-pulled-pork-woodfire').length, 1);
});
