import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildShoppingGroups, countShoppingItems, getAdvancePrep, getRequiredEquipment } from '../js/shopping.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));

test('shopping checklist groups every scaled ingredient by practical category', () => {
  const groups = buildShoppingGroups(recipe, 6);
  const meat = groups.find(group => group.id === 'viande');
  const pork = meat.items.find(item => item.sourceId === 'pork-belly');
  assert.deepEqual(pork.quantity, { min: 1800, max: 2250 });

  const consumableCount = recipe.equipment.filter(item => item.consumable).length;
  assert.equal(countShoppingItems(groups), recipe.ingredients.length + consumableCount);
});

test('shopping checklist includes recipe-specific consumables', () => {
  const groups = buildShoppingGroups(recipe, 4);
  const consumables = groups.find(group => group.id === 'consommables');
  assert.ok(consumables);
  assert.ok(consumables.items.some(item => item.sourceId === 'pellets'));
});

test('equipment list excludes consumables and advance prep is exposed', () => {
  const equipment = getRequiredEquipment(recipe);
  assert.ok(equipment.some(item => item.id === 'woodfire'));
  assert.ok(!equipment.some(item => item.id === 'pellets'));
  const prep = getAdvancePrep(recipe);
  assert.ok(prep.some(item => item.id === 'rub-ahead'));
});
