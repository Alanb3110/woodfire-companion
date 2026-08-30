import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendTemperatureMeasurement,
  clampTemperatureTarget,
  removeLastTemperatureMeasurement,
  temperatureCsv,
  validateTemperature
} from '../js/temperature.js';

test('temperature validation keeps the existing 0–150 °C contract', () => {
  assert.deepEqual(validateTemperature(''), { ok: false, message: 'Saisis une température.' });
  assert.deepEqual(validateTemperature('151'), { ok: false, message: 'Valeur attendue entre 0 et 150 °C.' });
  assert.deepEqual(validateTemperature('-1'), { ok: false, message: 'Valeur attendue entre 0 et 150 °C.' });
  assert.deepEqual(validateTemperature('74.26'), { ok: true, value: 74.3 });
});

test('manual temperature measurement receives an automatic timestamp without mutating input data', () => {
  const before = [{ timestamp: '2026-08-30T12:00:00.000Z', temperature: 60, source: 'manual' }];
  const now = new Date('2026-08-30T12:05:00.000Z');
  const result = appendTemperatureMeasurement(before, '72.5', now);

  assert.equal(result.ok, true);
  assert.equal(result.measurement.timestamp, now.toISOString());
  assert.equal(result.measurement.temperature, 72.5);
  assert.equal(result.measurements.length, 2);
  assert.equal(before.length, 1);
});

test('target clamp and undo preserve existing UI semantics', () => {
  assert.equal(clampTemperatureTarget(20, 93), 30);
  assert.equal(clampTemperatureTarget(130, 93), 120);
  assert.equal(clampTemperatureTarget('oops', 74), 74);
  assert.deepEqual(removeLastTemperatureMeasurement([1, 2, 3]), [1, 2]);
  assert.deepEqual(removeLastTemperatureMeasurement([]), []);
});

test('temperature CSV keeps timestamp, Celsius value and source', () => {
  const csv = temperatureCsv([
    { timestamp: '2026-08-30T12:00:00.000Z', temperature: 72.5, source: 'manual' },
    { timestamp: '2026-08-30T12:10:00.000Z', temperature: 74, source: 'manual' }
  ]);
  assert.equal(csv, [
    'timestamp,temperature_c,source',
    '2026-08-30T12:00:00.000Z,72.5,manual',
    '2026-08-30T12:10:00.000Z,74,manual'
  ].join('\n'));
});
