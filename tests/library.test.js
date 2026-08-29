import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateLibrary, findLibraryRecipe } from '../js/library.js';

const library = JSON.parse(await readFile(new URL('../recipes/index.json', import.meta.url), 'utf8'));

test('recipe library manifest is valid and has one available recipe', () => {
  const validation = validateLibrary(library);
  assert.equal(validation.valid, true, validation.errors.join('\n'));
  const available = library.recipes.filter(entry => entry.status === 'available');
  assert.equal(available.length, 1);
  assert.equal(available[0].id, 'pork-belly-burnt-ends-meal');
});

test('library can resolve the active recipe by id', () => {
  const entry = findLibraryRecipe(library, 'pork-belly-burnt-ends-meal');
  assert.equal(entry.recipeUrl, './recipes/pork-belly-burnt-ends.json');
});
