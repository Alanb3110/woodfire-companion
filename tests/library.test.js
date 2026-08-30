import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLibrary, findLibraryRecipe } from '../js/library.js';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));

test('recipe library manifest is valid and exposes executable entries with local covers', () => {
  const validation = validateLibrary(library);
  assert.equal(validation.valid, true, validation.errors.join('\n'));

  const available = library.recipes.filter(entry => entry.status === 'available');
  assert.ok(available.length >= 1, 'The library should expose at least one executable recipe.');
  for (const entry of available) {
    assert.ok(entry.recipeUrl, `Available recipe ${entry.id} requires recipeUrl.`);
    assert.match(entry.visual?.imageUrl || '', /^\.\//, `Available recipe ${entry.id} requires a local cover.`);
  }
});

test('library rejects remote or missing executable cover URLs', () => {
  const missing = structuredClone(library);
  delete missing.recipes.find(entry => entry.status === 'available').visual.imageUrl;
  assert.equal(validateLibrary(missing).valid, false);

  const remote = structuredClone(library);
  remote.recipes.find(entry => entry.status === 'available').visual.imageUrl = 'https://example.com/cover.jpg';
  assert.equal(validateLibrary(remote).valid, false);
});

test('library can resolve every entry by id', () => {
  for (const expected of library.recipes) {
    const entry = findLibraryRecipe(library, expected.id);
    assert.equal(entry?.id, expected.id);
  }
});
