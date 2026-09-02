import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  JOURNAL_KEY,
  JOURNAL_SCHEMA_VERSION,
  clearJournal,
  readJournal,
  upsertJournalEntry
} from '../js/journal.js';
import {
  SESSION_SCHEMA_VERSION,
  SESSION_STORAGE_KEY,
  createDefaultSessionState,
  readSessionState,
  saveSessionState
} from '../js/session.js';
import { STORAGE_MESSAGES } from '../js/storage.js';

const originalConsoleWarn = console.warn;
test.before(() => { console.warn = () => {}; });
test.after(() => { console.warn = originalConsoleWarn; });

class MemoryStorage {
  constructor(entries = []) {
    this.data = new Map(entries);
  }

  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }

  setItem(key, value) {
    this.data.set(key, String(value));
  }
}

class UnavailableStorage extends MemoryStorage {
  getItem() {
    const error = new Error('Access denied');
    error.name = 'SecurityError';
    throw error;
  }
}

class QuotaStorage extends MemoryStorage {
  setItem() {
    const error = new Error('Quota reached');
    error.name = 'QuotaExceededError';
    throw error;
  }
}

test('corrupt session data is reported and never overwritten implicitly', () => {
  const raw = '{broken';
  const storage = new MemoryStorage([[SESSION_STORAGE_KEY, raw]]);
  const result = readSessionState(storage);

  assert.equal(result.status, 'preserved');
  assert.equal(result.warning, STORAGE_MESSAGES.preserved);
  assert.deepEqual(result.state, createDefaultSessionState());
  assert.throws(
    () => saveSessionState(createDefaultSessionState(), storage),
    error => error.code === 'preserved' && error.message === STORAGE_MESSAGES.preserved
  );
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), raw);
});

test('future session schemas are preserved instead of downgraded or replaced', () => {
  const raw = JSON.stringify({ schemaVersion: SESSION_SCHEMA_VERSION + 1, recipeId: 'future' });
  const storage = new MemoryStorage([[SESSION_STORAGE_KEY, raw]]);
  const result = readSessionState(storage);

  assert.equal(result.status, 'preserved');
  assert.throws(() => saveSessionState(createDefaultSessionState(), storage), /version plus récente|conservées/i);
  assert.equal(storage.getItem(SESSION_STORAGE_KEY), raw);
});

test('unavailable and full storage produce actionable messages without replacing existing session data', () => {
  const unavailable = new UnavailableStorage();
  const read = readSessionState(unavailable);
  assert.equal(read.status, 'unavailable');
  assert.equal(read.warning, STORAGE_MESSAGES.unavailable);
  assert.throws(
    () => saveSessionState(createDefaultSessionState(), unavailable),
    error => error.code === 'unavailable' && error.message === STORAGE_MESSAGES.unavailable
  );

  const existing = JSON.stringify({ ...createDefaultSessionState(), schemaVersion: SESSION_SCHEMA_VERSION, recipeId: 'keep-me' });
  const quota = new QuotaStorage([[SESSION_STORAGE_KEY, existing]]);
  assert.throws(
    () => saveSessionState({ ...createDefaultSessionState(), recipeId: 'new-value' }, quota),
    error => error.code === 'quota' && error.message === STORAGE_MESSAGES.quota
  );
  assert.equal(quota.getItem(SESSION_STORAGE_KEY), existing);
});

test('corrupt and future journals stay intact when a mutation is attempted', () => {
  for (const raw of [
    '{broken',
    JSON.stringify({ schemaVersion: JOURNAL_SCHEMA_VERSION + 1, entries: [] })
  ]) {
    const storage = new MemoryStorage([[JOURNAL_KEY, raw]]);
    const result = readJournal(storage);
    assert.equal(result.status, 'preserved');
    assert.equal(result.warning, STORAGE_MESSAGES.preserved);

    assert.throws(
      () => upsertJournalEntry({ id: 'new-cook', servedAt: '2026-09-02T20:00:00.000Z' }, storage),
      error => error.code === 'preserved'
    );
    assert.throws(() => clearJournal(storage), error => error.code === 'preserved');
    assert.equal(storage.getItem(JOURNAL_KEY), raw);
  }
});

test('journal quota failures are visible and local history remains byte-for-byte unchanged', () => {
  const existing = JSON.stringify({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    entries: [{ id: 'existing', servedAt: '2026-09-01T20:00:00.000Z' }]
  });
  const storage = new QuotaStorage([[JOURNAL_KEY, existing]]);

  assert.throws(
    () => upsertJournalEntry({ id: 'new-cook', servedAt: '2026-09-02T20:00:00.000Z' }, storage),
    error => error.code === 'quota' && error.message === STORAGE_MESSAGES.quota
  );
  assert.equal(storage.getItem(JOURNAL_KEY), existing);
});

test('the guarded storage helper is available in the offline shell', async () => {
  const serviceWorker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
  assert.match(serviceWorker, /['"]\.\/js\/storage\.js['"]/);
});
