import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const expectedVersion = '0.3.0-dev.2';

test('development version is consistent across package, UI and service worker cache', async () => {
  const [packageText, indexHtml, serviceWorker] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../service-worker.js', import.meta.url), 'utf8')
  ]);
  const packageJson = JSON.parse(packageText);
  assert.equal(packageJson.version, expectedVersion);
  assert.match(indexHtml, new RegExp(`v${expectedVersion.replaceAll('.', '\\.')}`));
  assert.match(serviceWorker, new RegExp(`APP_VERSION = '${expectedVersion.replaceAll('.', '\\.')}'`));
});
