import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildJournalEntry, loadJournal, upsertJournalEntry } from '../js/journal.js';
import { buildSchedule } from '../js/planner.js';

const [settingsJs, timestampEditorJs, devToolsJs, serviceWorker, recipeText] = await Promise.all([
  readFile(new URL('../js/settings.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/timestamp-editor.js', import.meta.url), 'utf8'),
  readFile(new URL('../js/dev-tools.js', import.meta.url), 'utf8'),
  readFile(new URL('../service-worker.js', import.meta.url), 'utf8'),
  readFile(new URL('../recipes/pork-belly-burnt-ends.json', import.meta.url), 'utf8')
]);
const recipe = JSON.parse(recipeText);

class MemoryStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

test('timestamp editor is bootstrapped for normal cooks and persists through session API', () => {
  assert.match(settingsJs, /import\('\.\/timestamp-editor\.js'\)/);
  assert.match(timestampEditorJs, /editStepTimestamps/);
  assert.match(timestampEditorJs, /datetime-local/);
  assert.match(timestampEditorJs, /saveSessionState/);
  assert.match(timestampEditorJs, /window\.location\.reload/);
});

test('DEV test-cook tool is gated by DEV badge and supports restoring a previous session', () => {
  assert.match(settingsJs, /\.dev-badge/);
  assert.match(settingsJs, /import\('\.\/dev-tools\.js'\)/);
  assert.match(devToolsJs, /Cuisson test/);
  assert.match(devToolsJs, /woodfire-companion-test-backup-v1/);
  assert.match(devToolsJs, /isTest:\s*true/);
  assert.match(devToolsJs, /restorePreviousSession/);
});

test('timestamp and DEV modules are included in the offline shell', () => {
  assert.match(serviceWorker, /\.\/js\/timestamp-editor\.js/);
  assert.match(serviceWorker, /\.\/js\/dev-tools\.js/);
});

test('test cook journal entry is intentionally ignored by journal persistence', () => {
  const storage = new MemoryStorage();
  const schedule = buildSchedule(recipe, '20:00', new Date(2026, 7, 29, 12, 0, 0, 0));
  const state = {
    isTest: true,
    sessionId: 'test-session',
    sessionStartedAt: '2026-08-29T14:30:00.000Z',
    targetServingAt: '2026-08-29T20:00:00.000Z',
    mealTime: '20:00',
    servings: 4,
    temperatureTarget: 93,
    started: { eat: '2026-08-29T20:00:00.000Z' },
    completed: { eat: '2026-08-29T20:00:00.000Z' },
    taskShifts: {},
    observations: [],
    measurements: []
  };
  const entry = buildJournalEntry({ state, recipe, schedule, now: new Date('2026-08-29T20:01:00.000Z') });
  assert.equal(entry.isTest, true);
  upsertJournalEntry(entry, storage);
  assert.equal(loadJournal(storage).entries.length, 0);
});
