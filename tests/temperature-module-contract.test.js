import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('app delegates temperature behavior to the extracted controller', async () => {
  const [appJs, controllerJs, coreJs] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/temperature-ui.js', import.meta.url), 'utf8'),
    readFile(new URL('../js/temperature.js', import.meta.url), 'utf8')
  ]);

  assert.match(appJs, /createTemperatureController/);
  assert.match(appJs, /temperatureController\.bind\(\)/);
  assert.match(appJs, /temperatureController\.render\(\)/);
  assert.doesNotMatch(appJs, /function validateTemperature\(/);
  assert.doesNotMatch(appJs, /function renderTemperature\(/);
  assert.doesNotMatch(appJs, /function renderChart\(/);
  assert.doesNotMatch(appJs, /function exportCsv\(/);
  assert.match(controllerJs, /export function createTemperatureController/);
  assert.match(coreJs, /export function appendTemperatureMeasurement/);
});
