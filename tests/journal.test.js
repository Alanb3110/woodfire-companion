import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSchedule } from '../js/planner.js';
import {
  JOURNAL_KEY,
  buildJournalEntry,
  clearJournal,
  loadJournal,
  removeJournalEntry,
  upsertJournalEntry
} from '../js/journal.js';

const recipe = JSON.parse(await readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8'));

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

function sessionState() {
  return {
    sessionId: 'cook-test-1',
    sessionStartedAt: '2026-08-29T12:30:00.000Z',
    targetServingAt: '2026-08-29T18:00:00.000Z',
    mealTime: '20:00',
    servings: 4,
    temperatureTarget: 93,
    completed: {
      smoke: '2026-08-29T15:15:00.000Z',
      eat: '2026-08-29T18:04:00.000Z'
    },
    taskShifts: { 'first-check': 10 },
    measurements: [
      { timestamp: '2026-08-29T16:00:00.000Z', temperature: 72.5, source: 'manual' },
      { timestamp: '2026-08-29T17:20:00.000Z', temperature: 91, source: 'manual' }
    ]
  };
}

test('journal entry snapshots recipe, actuals, temperatures and schedule', () => {
  const state = sessionState();
  const reference = new Date(2026, 7, 29, 12, 0, 0, 0);
  const schedule = buildSchedule(recipe, '20:00', reference, state.taskShifts, { actualCompletionTimes: state.completed });
  const entry = buildJournalEntry({ state, recipe, schedule, now: new Date('2026-08-29T18:05:00.000Z') });

  assert.equal(entry.id, state.sessionId);
  assert.equal(entry.recipeId, recipe.id);
  assert.equal(entry.recipeVersion, recipe.version);
  assert.equal(entry.servedAt, state.completed.eat);
  assert.equal(entry.measurements.length, 2);
  assert.equal(entry.taskShifts['first-check'], 10);
  assert.equal(entry.schedule.length, recipe.steps.length);
  assert.ok(entry.schedule.every(item => item.baselineStart && item.finalStart));
});

test('journal upsert is idempotent per cook session', () => {
  const storage = new MemoryStorage();
  const state = sessionState();
  const schedule = buildSchedule(recipe, '20:00', new Date(2026, 7, 29, 12, 0, 0, 0));
  const first = buildJournalEntry({ state, recipe, schedule, now: new Date('2026-08-29T18:05:00.000Z') });
  upsertJournalEntry(first, storage);

  const updated = { ...first, measurements: [...first.measurements, { timestamp: '2026-08-29T18:06:00.000Z', temperature: 92, source: 'manual' }] };
  upsertJournalEntry(updated, storage);

  const data = loadJournal(storage);
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].measurements.length, 3);
  assert.ok(storage.getItem(JOURNAL_KEY));
});

test('journal entries can be removed individually or cleared without touching other storage keys', () => {
  const storage = new MemoryStorage();
  storage.setItem('woodfire-companion-v1', '{"keep":true}');
  const state = sessionState();
  const schedule = buildSchedule(recipe, '20:00', new Date(2026, 7, 29, 12, 0, 0, 0));
  upsertJournalEntry(buildJournalEntry({ state, recipe, schedule }), storage);

  removeJournalEntry(state.sessionId, storage);
  assert.equal(loadJournal(storage).entries.length, 0);

  upsertJournalEntry(buildJournalEntry({ state, recipe, schedule }), storage);
  clearJournal(storage);
  assert.equal(loadJournal(storage).entries.length, 0);
  assert.equal(storage.getItem('woodfire-companion-v1'), '{"keep":true}');
});
