import {
  appendTemperatureMeasurement,
  clampTemperatureTarget,
  removeLastTemperatureMeasurement,
  temperatureCsv
} from './temperature.js';

function temperatureText(value) {
  return `${Number(value).toFixed(1).replace('.0', '')} °C`;
}

function renderChart({ measurements, target, container, formatTime }) {
  if (!measurements.length) {
    container.innerHTML = '<div class="empty-chart">Ajoute une température : l’heure est enregistrée automatiquement et la courbe apparaît ici.</div>';
    return;
  }

  const width = 640;
  const height = 300;
  const pad = { left: 48, right: 18, top: 18, bottom: 42 };
  const times = measurements.map(item => new Date(item.timestamp).getTime());
  const temperatures = measurements.map(item => item.temperature);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = Math.max(maxTime - minTime, 10 * 60 * 1000);
  const minTemp = Math.max(0, Math.floor(Math.min(...temperatures, target) / 10) * 10 - 5);
  const maxTemp = Math.min(150, Math.ceil(Math.max(...temperatures, target) / 10) * 10 + 5);
  const tempSpan = Math.max(maxTemp - minTemp, 10);
  const x = timestamp => pad.left + ((timestamp - minTime) / timeSpan) * (width - pad.left - pad.right);
  const y = temperature => pad.top + (1 - (temperature - minTemp) / tempSpan) * (height - pad.top - pad.bottom);
  const points = measurements
    .map(item => `${x(new Date(item.timestamp).getTime()).toFixed(1)},${y(item.temperature).toFixed(1)}`)
    .join(' ');

  let grid = '';
  for (let index = 0; index <= 5; index++) {
    const value = minTemp + (tempSpan * index / 5);
    const yy = y(value);
    grid += `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.10" />`;
    grid += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.65">${Math.round(value)}°</text>`;
  }

  const tickCount = Math.min(4, Math.max(2, measurements.length));
  let xLabels = '';
  for (let index = 0; index < tickCount; index++) {
    const timestamp = minTime + (timeSpan * index / (tickCount - 1));
    xLabels += `<text x="${x(timestamp)}" y="${height - 15}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.65">${formatTime(new Date(timestamp))}</text>`;
  }

  const circles = measurements
    .map(item => `<circle cx="${x(new Date(item.timestamp).getTime())}" cy="${y(item.temperature)}" r="4.5" fill="var(--accent)" />`)
    .join('');
  const targetY = y(target);

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution de la température à cœur">
      ${grid}
      <line x1="${pad.left}" y1="${targetY}" x2="${width - pad.right}" y2="${targetY}" stroke="var(--success)" stroke-width="2" stroke-dasharray="7 6" />
      <text x="${width - pad.right}" y="${Math.max(12, targetY - 6)}" text-anchor="end" font-size="11" fill="var(--success)">Cible ${target} °C</text>
      <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
      ${xLabels}
    </svg>`;
}

export function createTemperatureController({
  elements,
  getState,
  getDefaultTarget = () => 93,
  commit = () => {},
  formatTime,
  confirmAction = message => globalThis.confirm(message),
  now = () => new Date()
}) {
  const {
    input,
    addButton,
    validation,
    targetInput,
    lastValue,
    lastTime,
    count,
    chart,
    list,
    undoButton,
    newSeriesButton,
    exportButton
  } = elements;
  let bound = false;

  function focus() {
    input?.focus();
  }

  function render() {
    const state = getState();
    const measurements = state.measurements || [];
    const target = Number(state.temperatureTarget) || Number(getDefaultTarget()) || 93;
    targetInput.value = target;

    const last = measurements.at(-1);
    lastValue.textContent = last ? temperatureText(last.temperature) : '—';
    lastTime.textContent = last ? formatTime(new Date(last.timestamp)) : '—';
    count.textContent = `${measurements.length} mesure${measurements.length === 1 ? '' : 's'}`;

    list.innerHTML = '';
    for (const measurement of [...measurements].reverse().slice(0, 12)) {
      const row = document.createElement('div');
      row.className = 'measurement-row';
      const left = document.createElement('span');
      left.textContent = formatTime(new Date(measurement.timestamp));
      const right = document.createElement('strong');
      right.textContent = temperatureText(measurement.temperature);
      row.append(left, right);
      list.appendChild(row);
    }

    renderChart({ measurements, target, container: chart, formatTime });
  }

  function addMeasurement() {
    const state = getState();
    const result = appendTemperatureMeasurement(state.measurements, input.value, now());
    if (!result.ok) {
      validation.textContent = result.message;
      focus();
      return;
    }

    validation.textContent = '';
    state.measurements = result.measurements;
    if (!state.cookStartedAt) state.cookStartedAt = result.measurement.timestamp;
    commit();
    input.value = '';
    render();
    focus();
  }

  function updateTarget() {
    const state = getState();
    state.temperatureTarget = clampTemperatureTarget(targetInput.value, getDefaultTarget());
    commit();
    render();
  }

  function undoMeasurement() {
    const state = getState();
    if (!(state.measurements || []).length) return;
    state.measurements = removeLastTemperatureMeasurement(state.measurements);
    if (!state.measurements.length && !Object.keys(state.started || {}).length) state.cookStartedAt = null;
    commit();
    render();
  }

  function newSeries() {
    if (!confirmAction('Effacer toutes les mesures de température et démarrer une nouvelle série de mesures ?')) return;
    const state = getState();
    state.measurements = [];
    if (!Object.keys(state.started || {}).length) state.cookStartedAt = null;
    commit();
    render();
    focus();
  }

  function exportMeasurements() {
    const state = getState();
    if (!(state.measurements || []).length) return;
    const blob = new Blob([temperatureCsv(state.measurements)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `woodfire-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function bind() {
    if (bound) return;
    bound = true;
    addButton.addEventListener('click', addMeasurement);
    input.addEventListener('keydown', event => { if (event.key === 'Enter') addMeasurement(); });
    targetInput.addEventListener('change', updateTarget);
    undoButton.addEventListener('click', undoMeasurement);
    newSeriesButton.addEventListener('click', newSeries);
    exportButton.addEventListener('click', exportMeasurements);
  }

  return { bind, render, focus };
}
