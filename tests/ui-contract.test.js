import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('static DOM ids referenced by UI modules exist in index.html', async () => {
  const [appJs, settingsJs, indexHtml] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/settings.js', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8')
  ]);
  const ids = [...`${appJs}\n${settingsJs}`.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
  assert.ok(ids.length > 20);
  for (const id of new Set(ids)) {
    assert.match(indexHtml, new RegExp(`id=["']${id}["']`), `Missing DOM id: ${id}`);
  }
});
