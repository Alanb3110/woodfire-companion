import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSchedule } from '../js/planner.js';
import {
  JOURNAL_KEY,
  JOURNAL_SCHEMA_VERSION,
  buildJournalEntry,
  clearJournal,
  loadJournal,
  removeJournalEntry,
  updateJournalFeedback,
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
    sessionStartedAt: '2026-08-29T14:30:00.000Z',
    targetServingAt: '2026-08-29T20:00:00.000Z',
    mealTime: '20:00',
    servings: 4,
    temperatureTarget: 93,
    completed: {
      smoke: '2026-08-29T17:15:00.000Z',
      eat: '2026-08-29T20:04:00.000Z'
    },
    taskShifts: { 'first-check': 10 },
    observations: [
      {
        stepId: 'first-check',
        observationId: 'still-firm',
        label: 'Encore ferme',
        outcome: 'recheck',
        timestamp: '2026-08-29T18:00:00.000Z',
        recheckDueAt: '2026-08-29T18:20:00.000Z'
      },
      {
        stepId: 'first-check',
        observationId: 'tender',
        label: 'Très tendre',
        outcome: 'complete',
        timestamp: '2026-08-29T18:18:00.000Z',
        recheckDueAt: null
      }
    ],
    measurements: [
      { timestamp: '2026-08-29T18:00:00.000Z', temperature: 72.5, source: 'manual' },
      { timestamp: '2026-08-29T19:20:00.000Z', temperature: 91, source: 'manual' }
    ]
  };
}

test('journal entry snapshots recipe, actuals, observations, temperatures and schedule', () => {
  const state = sessionState();
  const reference = new Date(2026, 7, 29, 12, 0, 0, 0);
  const schedule = buildSchedule(recipe, '20:00', reference, state.taskShifts, { actualCompletionTimes: state.completed });
  const entry = buildJournalEntry({ state, recipe, schedule, now: new Date('2026-08-29T20:05:00.000Z') });

  assert.equal(entry.schemaVersion, JOURNAL_SCHEMA_VERSION);
  assert.equal(entry.id, state.sessionId);
  assert.equal(entry.recipeId, recipe.id);
  assert.equal(entry.recipeVersion, recipe.version);
  assert.equal(entry.targetServingAt, state.targetServingAt);
  assert.equal(entry.servedAt, state.completed.eat);
  assert.equal(entry.measurements.length, 2);
  assert.equal(entry.observations.length, 2);
  assert.equal(entry.observations[0].label, 'Encore ferme');
  assert.notEqual(entry.observations, state.observations, 'Journal must snapshot the observation array.');
  assert.equal(entry.taskShifts['first-check'], 10);
  assert.equal(entry.schedule.length, recipe.steps.length);
  assert.ok(entry.schedule.every(item => item.baselineStart && item.finalStart));
});

test('journal upsert is idempotent per cook session', () => {
  const storage = new MemoryStorage();
  const state = sessionState();
  const schedule = buildSchedule(recipe, '20:00', new Date(2026, 7, 29, 12, 0, 0, 0));
  const first = buildJournalEntry({ state, recipe, schedule, now: new Date('2026-08-29T20:05:00.000Z') });
  upsertJournalEntry(first, storage);

  const updated = { ...first, measurements: [...first.measurements, { timestamp: '2026-08-29T20:06:00.000Z', temperature: 92, source: 'manual' }] };
  upsertJournalEntry(updated, storage);

  const data = loadJournal(storage);
  assert.equal(data.entries.length, 1);
  assert.equal(data.entries[0].measurements.length, 3);
  assert.equal(data.entries[0].observations.length, 2);
  assert.ok(storage.getItem(JOURNAL_KEY));
});

test('legacy journal entries migrate to v2 feedback defaults', () => {
  const storage = new MemoryStorage();
  storage.setItem(JOURNAL_KEY, JSON.stringify({
    schemaVersion: 1,
    entries: [{ id: 'legacy', recipeTitle: 'Legacy meal', servedAt: '2026-08-20T20:00:00.000Z' }]
  }));

  const data = loadJournal(storage);
  assert.equal(data.schemaVersion, JOURNAL_SCHEMA_VERSION);
  assert.equal(data.entries[0].schemaVersion, JOURNAL_SCHEMA_VERSION);
  assert.equal(data.entries[0].rating, null);
  assert.equal(data.entries[0].notes, '');
});

test('journal feedback persists and survives later cook resync', () => {
  const storage = new MemoryStorage();
  const state = sessionState();
  const schedule = buildSchedule(recipe, '20:00', new Date(2026, 7, 29, 12, 0, 0, 0));
  const first = buildJournalEntry({ state, recipe, schedule, now: new Date('2026-08-29T20:05:00.000Z') });
  upsertJournalEntry(first, storage);

  updateJournalFeedback(first.id, {
    rating: 4,
    notes: 'Morceaux plus gros et moins de cuisson découverte.'
  }, storage, new Date('2026-08-29T21:00:00.000Z'));

  const resync = {
    ...first,
    measurements: [...first.measurements, { timestamp: '2026-08-29T20:10:00.000Z', temperature: 92, source: 'manual' }]
  };
  upsertJournalEntry(resync, storage);

  const entry = loadJournal(storage).entries[0];
  assert.equal(entry.rating, 4);
  assert.equal(entry.notes, 'Morceaux plus gros et moins de cuisson découverte.');
  assert.equal(entry.measurements.length, 3);
  assert.equal(entry.feedbackUpdatedAt, '2026-08-29T21:00:00.000Z');
});

test('journal feedback validates rating bounds', () => {
  const storage = new MemoryStorage();
  const state = sessionState();
  const schedule = buildSchedule(recipe, '20:00', new Date(2026, 7, 29, 12, 0, 0, 0));
  const first = buildJournalEntry({ state, recipe, schedule });
  upsertJournalEntry(first, storage);
  assert.throws(() => updateJournalFeedback(first.id, { rating: 6 }, storage), /1 et 5/);
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
