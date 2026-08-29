import { loadRecipe } from './js/recipe-loader.js';
import { formatWoodfireSummary } from './js/recipe.js';
import {
  buildSchedule,
  findDependencyIssues,
  findResourceConflicts,
  getNextScheduledTask,
  scheduleMap
} from './js/planner.js';

const STORAGE_KEY = 'woodfire-companion-v1';
const RECIPE_URL = './recipes/pork-belly-burnt-ends.json';

const defaultState = () => ({
  mealTime: '20:00',
  completed: {},
  taskShifts: {},
  temperatureTarget: 93,
  measurements: [],
  cookStartedAt: null,
  activeTab: 'planning',
  recipeId: null,
  recipeVersion: null
});

let recipe = null;
let state = loadState();
let schedule = [];
let scheduleById = {};

const cookTitle = document.getElementById('cookTitle');
const mealTime = document.getElementById('mealTime');
const taskList = document.getElementById('taskList');
const nextTaskName = document.getElementById('nextTaskName');
const nextTaskCountdown = document.getElementById('nextTaskCountdown');
const resetChecklistBtn = document.getElementById('resetChecklistBtn');
const temperatureInput = document.getElementById('temperatureInput');
const addTemperatureBtn = document.getElementById('addTemperatureBtn');
const tempValidation = document.getElementById('tempValidation');
const targetTemperature = document.getElementById('targetTemperature');
const lastTemperature = document.getElementById('lastTemperature');
const lastTemperatureTime = document.getElementById('lastTemperatureTime');
const measurementCount = document.getElementById('measurementCount');
const chartContainer = document.getElementById('chartContainer');
const measurementList = document.getElementById('measurementList');
const undoMeasurementBtn = document.getElementById('undoMeasurementBtn');
const newCookBtn = document.getElementById('newCookBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const installHelpBtn = document.getElementById('installHelpBtn');
const installDialog = document.getElementById('installDialog');

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed };
  } catch (error) {
    console.warn('État local illisible, réinitialisation.', error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function recomputeSchedule() {
  if (!recipe) return;
  schedule = buildSchedule(recipe, state.mealTime, new Date(), state.taskShifts);
  scheduleById = scheduleMap(schedule);

  const dependencyIssues = findDependencyIssues(recipe, schedule);
  const woodfireConflicts = findResourceConflicts(schedule, 'woodfire');
  if (dependencyIssues.length) console.warn('Planning dependency issues:', dependencyIssues);
  if (woodfireConflicts.length) console.warn('Planning Woodfire conflicts:', woodfireConflicts);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatCompletion(iso) {
  return `Fait à ${formatTime(new Date(iso))}`;
}

function renderTasks() {
  taskList.innerHTML = '';

  for (const item of schedule) {
    const step = item.step;
    const card = document.createElement('article');
    card.className = 'task-card' + (state.completed[step.id] ? ' completed' : '');
    card.dataset.taskId = step.id;

    const main = document.createElement('div');
    main.className = 'task-main';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = Boolean(state.completed[step.id]);
    check.setAttribute('aria-label', `Marquer ${step.title} comme terminée`);
    check.addEventListener('change', () => {
      if (check.checked) state.completed[step.id] = new Date().toISOString();
      else delete state.completed[step.id];
      saveState();
      renderTasks();
      updateNextTask();
    });

    const time = document.createElement('div');
    time.className = 'task-time';
    time.textContent = formatTime(item.start);

    const title = document.createElement('div');
    title.className = 'task-title';
    const strong = document.createElement('strong');
    strong.textContent = step.title;
    const sub = document.createElement('span');
    sub.textContent = step.summary || '';
    title.append(strong, sub);

    const detailsBtn = document.createElement('button');
    detailsBtn.type = 'button';
    detailsBtn.className = 'task-details-btn';
    detailsBtn.textContent = '›';
    detailsBtn.setAttribute('aria-expanded', 'false');
    detailsBtn.setAttribute('aria-label', `Afficher le détail de ${step.title}`);
    detailsBtn.addEventListener('click', () => {
      const open = card.classList.toggle('open');
      detailsBtn.textContent = open ? '⌄' : '›';
      detailsBtn.setAttribute('aria-expanded', String(open));
    });

    main.append(check, time, title, detailsBtn);

    const detail = document.createElement('div');
    detail.className = 'task-detail';
    if (step.woodfire) {
      const mode = document.createElement('div');
      mode.className = 'mode-line';
      mode.textContent = formatWoodfireSummary(step);
      detail.appendChild(mode);
    }

    const ul = document.createElement('ul');
    for (const detailText of step.details || []) {
      const li = document.createElement('li');
      li.textContent = detailText;
      ul.appendChild(li);
    }
    detail.appendChild(ul);

    if (state.completed[step.id]) {
      const completion = document.createElement('div');
      completion.className = 'completion-time';
      completion.textContent = formatCompletion(state.completed[step.id]);
      detail.appendChild(completion);
    }

    card.append(main, detail);
    taskList.appendChild(card);
  }
}

function updateNextTask() {
  if (!recipe) return;
  const now = new Date();
  const next = getNextScheduledTask(schedule, state.completed);

  if (!next) {
    nextTaskName.textContent = 'Checklist terminée';
    nextTaskCountdown.textContent = 'Tout est prêt.';
    return;
  }

  const when = next.start;
  const deltaMin = Math.round((when - now) / 60000);
  nextTaskName.textContent = `${formatTime(when)} · ${next.step.title}`;

  if (deltaMin > 1) nextTaskCountdown.textContent = `Dans ${deltaMin} min`;
  else if (deltaMin >= -1) nextTaskCountdown.textContent = 'Maintenant';
  else nextTaskCountdown.textContent = `En retard de ${Math.abs(deltaMin)} min`;
}

function shiftRemainingTasks(minutes) {
  for (const step of recipe.steps) {
    if (!state.completed[step.id]) state.taskShifts[step.id] = (state.taskShifts[step.id] || 0) + minutes;
  }
  saveState();
  recomputeSchedule();
  renderTasks();
  updateNextTask();
}

function switchTab(tabName) {
  state.activeTab = tabName;
  saveState();
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabName));
  if (tabName === 'temperature') temperatureInput.focus();
}

function validateTemperature(raw) {
  const value = Number(raw);
  if (raw === '' || !Number.isFinite(value)) return { ok: false, message: 'Saisis une température.' };
  if (value < 0 || value > 150) return { ok: false, message: 'Valeur attendue entre 0 et 150 °C.' };
  return { ok: true, value: Math.round(value * 10) / 10 };
}

function addTemperature() {
  const validation = validateTemperature(temperatureInput.value);
  if (!validation.ok) {
    tempValidation.textContent = validation.message;
    temperatureInput.focus();
    return;
  }

  tempValidation.textContent = '';
  const now = new Date();
  if (!state.cookStartedAt) state.cookStartedAt = now.toISOString();
  state.measurements.push({ timestamp: now.toISOString(), temperature: validation.value, source: 'manual' });
  saveState();
  temperatureInput.value = '';
  renderTemperature();
  temperatureInput.focus();
}

function renderTemperature() {
  targetTemperature.value = state.temperatureTarget;
  const measurements = state.measurements;
  const last = measurements[measurements.length - 1];

  lastTemperature.textContent = last ? `${last.temperature.toFixed(1).replace('.0', '')} °C` : '—';
  lastTemperatureTime.textContent = last ? formatTime(new Date(last.timestamp)) : '—';
  measurementCount.textContent = `${measurements.length} mesure${measurements.length === 1 ? '' : 's'}`;

  measurementList.innerHTML = '';
  [...measurements].reverse().slice(0, 12).forEach(measurement => {
    const row = document.createElement('div');
    row.className = 'measurement-row';
    const left = document.createElement('span');
    left.textContent = formatTime(new Date(measurement.timestamp));
    const right = document.createElement('strong');
    right.textContent = `${measurement.temperature.toFixed(1).replace('.0', '')} °C`;
    row.append(left, right);
    measurementList.appendChild(row);
  });

  renderChart();
}

function renderChart() {
  const data = state.measurements;
  if (data.length === 0) {
    chartContainer.innerHTML = '<div class="empty-chart">Ajoute une température : l’heure est enregistrée automatiquement et la courbe apparaît ici.</div>';
    return;
  }

  const width = 640;
  const height = 300;
  const pad = { left: 48, right: 18, top: 18, bottom: 42 };
  const target = Number(state.temperatureTarget) || 93;
  const times = data.map(d => new Date(d.timestamp).getTime());
  const temps = data.map(d => d.temperature);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeSpan = Math.max(maxTime - minTime, 10 * 60 * 1000);
  const minTemp = Math.max(0, Math.floor(Math.min(...temps, target) / 10) * 10 - 5);
  const maxTemp = Math.min(150, Math.ceil(Math.max(...temps, target) / 10) * 10 + 5);
  const tempSpan = Math.max(maxTemp - minTemp, 10);

  const x = t => pad.left + ((t - minTime) / timeSpan) * (width - pad.left - pad.right);
  const y = temp => pad.top + (1 - (temp - minTemp) / tempSpan) * (height - pad.top - pad.bottom);
  const points = data.map(d => `${x(new Date(d.timestamp).getTime()).toFixed(1)},${y(d.temperature).toFixed(1)}`).join(' ');
  const yTicks = 5;
  const xTicks = Math.min(4, Math.max(2, data.length));

  let grid = '';
  for (let i = 0; i <= yTicks; i++) {
    const val = minTemp + (tempSpan * i / yTicks);
    const yy = y(val);
    grid += `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.10" />`;
    grid += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.65">${Math.round(val)}°</text>`;
  }

  let xLabels = '';
  for (let i = 0; i < xTicks; i++) {
    const t = minTime + (timeSpan * i / (xTicks - 1));
    xLabels += `<text x="${x(t)}" y="${height - 15}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.65">${formatTime(new Date(t))}</text>`;
  }

  const circles = data.map(d => {
    const cx = x(new Date(d.timestamp).getTime());
    const cy = y(d.temperature);
    return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--accent)" />`;
  }).join('');

  const targetY = y(target);
  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution de la température à cœur">
      ${grid}
      <line x1="${pad.left}" y1="${targetY}" x2="${width - pad.right}" y2="${targetY}" stroke="var(--success)" stroke-width="2" stroke-dasharray="7 6" />
      <text x="${width - pad.right}" y="${Math.max(12, targetY - 6)}" text-anchor="end" font-size="11" fill="var(--success)">Cible ${target} °C</text>
      <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${circles}
      ${xLabels}
    </svg>`;
}

function exportCsv() {
  if (!state.measurements.length) return;
  const lines = ['timestamp,temperature_c,source'];
  state.measurements.forEach(m => lines.push(`${m.timestamp},${m.temperature},${m.source}`));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `woodfire-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function bindEvents() {
  mealTime.value = state.mealTime;
  mealTime.addEventListener('change', () => {
    state.mealTime = mealTime.value || '20:00';
    saveState();
    recomputeSchedule();
    renderTasks();
    updateNextTask();
  });

  document.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => shiftRemainingTasks(Number(btn.dataset.shift))));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  resetChecklistBtn.addEventListener('click', () => {
    if (!confirm('Réinitialiser toutes les cases et les décalages du planning ?')) return;
    state.completed = {};
    state.taskShifts = {};
    saveState();
    recomputeSchedule();
    renderTasks();
    updateNextTask();
  });

  addTemperatureBtn.addEventListener('click', addTemperature);
  temperatureInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') addTemperature();
  });
  targetTemperature.addEventListener('change', () => {
    const val = Number(targetTemperature.value);
    state.temperatureTarget = Number.isFinite(val) ? Math.min(120, Math.max(30, val)) : recipe.temperature?.defaultTargetC || 93;
    saveState();
    renderTemperature();
  });

  undoMeasurementBtn.addEventListener('click', () => {
    if (!state.measurements.length) return;
    state.measurements.pop();
    if (!state.measurements.length) state.cookStartedAt = null;
    saveState();
    renderTemperature();
  });

  newCookBtn.addEventListener('click', () => {
    if (!confirm('Effacer toutes les mesures de température et démarrer une nouvelle cuisson ?')) return;
    state.measurements = [];
    state.cookStartedAt = null;
    saveState();
    renderTemperature();
    temperatureInput.focus();
  });

  exportCsvBtn.addEventListener('click', exportCsv);
  installHelpBtn.addEventListener('click', () => {
    if (typeof installDialog.showModal === 'function') installDialog.showModal();
    else alert('Dans Safari : Partager → Sur l’écran d’accueil → Ajouter.');
  });
}

async function init() {
  try {
    recipe = await loadRecipe(RECIPE_URL);
    cookTitle.textContent = recipe.title;
    document.title = `${recipe.title} · Woodfire Companion`;

    state.recipeId = recipe.id;
    state.recipeVersion = recipe.version;
    if (!Number.isFinite(Number(state.temperatureTarget))) state.temperatureTarget = recipe.temperature?.defaultTargetC || 93;
    saveState();

    recomputeSchedule();
    bindEvents();
    renderTasks();
    renderTemperature();
    updateNextTask();
    switchTab(state.activeTab || 'planning');
    setInterval(updateNextTask, 30000);
  } catch (error) {
    console.error(error);
    cookTitle.textContent = 'Erreur de chargement';
    taskList.innerHTML = '<div class="panel"><strong>Recette indisponible.</strong><p>Recharge l’application. Si le problème persiste, vérifie que la recette est bien incluse dans le cache PWA.</p></div>';
    nextTaskName.textContent = 'Planning indisponible';
    nextTaskCountdown.textContent = '';
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
}

init();
