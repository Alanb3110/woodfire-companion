import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appJs = await readFile(new URL('../app.js', import.meta.url), 'utf8');

test('active cook hides and guards the temperature tab for recipes without tracking', () => {
  assert.match(appJs, /temperatureTrackingEnabled/);
  assert.match(appJs, /temperatureTab\.hidden = !enabled/);
  assert.match(appJs, /temperaturePanel\.hidden = !enabled/);
  assert.match(appJs, /state\.temperatureTarget = temperatureEnabled \? defaultTemperatureTarget\(recipe\) : null/);
  assert.match(appJs, /tabName === 'temperature' && !temperatureTrackingEnabled\(recipe\) \? 'planning' : tabName/);
  assert.match(appJs, /if \(temperatureEnabled\) temperatureController\.render\(\)/);
});
