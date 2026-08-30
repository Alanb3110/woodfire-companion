import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [ui, css] = await Promise.all([
  readFile(new URL('../js/journal-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../journal.css', import.meta.url), 'utf8')
]);

test('journal UI exposes rating and next-cook notes controls', () => {
  assert.match(ui, /updateJournalFeedback/);
  assert.match(ui, /Notes pour la prochaine fois/);
  assert.match(ui, /for \(let value = 1; value <= 5; value\+\+\)/);
  assert.match(ui, /textarea\.maxLength = 2000/);
  assert.match(ui, /journal-summary-rating/);
});

test('journal feedback controls keep mobile-friendly star targets', () => {
  assert.match(css, /\.journal-rating-btn[\s\S]*min-height:\s*42px/);
  assert.match(css, /\.journal-notes/);
});
