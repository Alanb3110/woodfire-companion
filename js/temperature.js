export function temperatureTrackingEnabled(recipe) {
  const config = recipe?.temperature;
  if (!config || typeof config !== 'object') return false;
  if (config.enabled === false) return false;
  if (config.enabled === true) return true;
  return Number.isFinite(config.defaultTargetC);
}

export function defaultTemperatureTarget(recipe) {
  if (!temperatureTrackingEnabled(recipe)) return null;
  return Number.isFinite(recipe?.temperature?.defaultTargetC)
    ? recipe.temperature.defaultTargetC
    : null;
}

export function validateTemperature(raw) {
  const value = Number(raw);
  if (raw === '' || raw === null || raw === undefined || !Number.isFinite(value)) {
    return { ok: false, message: 'Saisis une température.' };
  }
  if (value < 0 || value > 150) {
    return { ok: false, message: 'Valeur attendue entre 0 et 150 °C.' };
  }
  return { ok: true, value: Math.round(value * 10) / 10 };
}

export function clampTemperatureTarget(raw, fallback = 93) {
  const value = Number(raw);
  const fallbackValue = Number(fallback);
  const resolved = Number.isFinite(value)
    ? value
    : Number.isFinite(fallbackValue)
      ? fallbackValue
      : 93;
  return Math.min(120, Math.max(30, resolved));
}

export function appendTemperatureMeasurement(measurements, raw, now = new Date()) {
  const validation = validateTemperature(raw);
  if (!validation.ok) return validation;

  const measurement = {
    timestamp: now.toISOString(),
    temperature: validation.value,
    source: 'manual'
  };
  return {
    ok: true,
    measurement,
    measurements: [...(measurements || []), measurement]
  };
}

export function removeLastTemperatureMeasurement(measurements) {
  return (measurements || []).slice(0, -1);
}

export function temperatureCsv(measurements) {
  const lines = ['timestamp,temperature_c,source'];
  for (const measurement of measurements || []) {
    lines.push(`${measurement.timestamp},${measurement.temperature},${measurement.source || 'manual'}`);
  }
  return lines.join('\n');
}
