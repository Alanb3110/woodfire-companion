import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recommendedStartFromPlan } from '../js/start-hint.js';

const pork = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));
const turkey = JSON.parse(await readFile(new URL('../recipes/sweet-savory-turkey-zucchini-gratin.json', import.meta.url), 'utf8'));

function hm(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

test('recommended Pork Belly start comes from the generated plan', () => {
  assert.equal(hm(recommendedStartFromPlan(pork, 4, '20:00')), '14:45');
});

test('recommended turkey meal start comes from the generated plan', () => {
  assert.equal(hm(recommendedStartFromPlan(turkey, 5, '20:30')), '16:45');
});
