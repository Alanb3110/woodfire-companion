import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [appJs, styles] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../styles.css', import.meta.url), 'utf8')
]);

test('active cook hides and guards the temperature tab for recipes without tracking', () => {
  assert.match(appJs, /temperatureTrackingEnabled/);
  assert.match(appJs, /temperatureTab\.hidden = !enabled/);
  assert.match(appJs, /temperaturePanel\.hidden = !enabled/);
  assert.match(appJs, /state\.temperatureTarget = temperatureEnabled \? defaultTemperatureTarget\(recipe\) : null/);
  assert.match(appJs, /tabName === 'temperature' && !temperatureTrackingEnabled\(recipe\) \? 'planning' : tabName/);
  assert.match(appJs, /if \(temperatureEnabled\) temperatureController\.render\(\)/);
});

test('single visible cook tab expands to the full navigation width', () => {
  assert.match(styles, /\.tabs:has\(\.tab\[hidden\]\)\s*\{\s*grid-template-columns:\s*1fr;/);
});
