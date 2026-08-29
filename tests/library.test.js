import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLibrary, findLibraryRecipe } from '../js/library.js';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));

test('recipe library manifest is valid and exposes executable entries through recipeUrl', () => {
  const validation = validateLibrary(library);
  assert.equal(validation.valid, true, validation.errors.join('\n'));

  const available = library.recipes.filter(entry => entry.status === 'available');
  assert.ok(available.length >= 1, 'The library should expose at least one executable recipe.');
  for (const entry of available) {
    assert.ok(entry.recipeUrl, `Available recipe ${entry.id} requires recipeUrl.`);
  }
});

test('library can resolve every entry by id', () => {
  for (const expected of library.recipes) {
    const entry = findLibraryRecipe(library, expected.id);
    assert.equal(entry?.id, expected.id);
  }
});
