import { loadLibrary, findLibraryRecipe } from './js/library.js';
import { loadRecipe } from './js/recipe-loader.js';
import { formatWoodfireSummary, scaleIngredients } from './js/recipe.js';
import { renderPreCook } from './js/prep-ui.js';
import {
  buildJournalEntry,
  clearJournal,
  createSessionId,
  loadJournal,
  removeJournalEntry,
  upsertJournalEntry
} from './js/journal.js';
import { renderJournalEntries } from './js/journal-ui.js';
import {
  addStepDelay,
  buildSchedule,
  findDependencyIssues,
  findResourceConflicts,
  getNextScheduledTask,
  mealAnchorDate
} from './js/planner.js';

const STORAGE_KEY = 'woodfire-companion-v1';
const LIBRARY_URL = './recipes/index.json';

const defaultState = () => ({
  view: 'library',
  mealTime: '20:00',
  servings: 4,
  completed: {},
  taskShifts: {},
  temperatureTarget: 93,
  measurements: [],
  cookStartedAt: null,
  sessionId: null,
  sessionStartedAt: null,
  sessionServedAt: null,
  targetServingAt: null,
  activeTab: 'planning',
  recipeId: null,
  recipeVersion: null,
  activeRecipeUrl: null
});

let library = null;
let recipe = null;
let activeEntry = null;
let selectedRecipe = null;
let selectedEntry = null;
let configServings = 4;
let configMealTime = '20:00';
let schedule = [];
let state = loadState();

const $ = id => document.getElementById(id);
const appError = $('appError');
const libraryView = $('libraryView');
const recipeView = $('recipeView');
const cookView = $('cookView');
const recipeGrid = $('recipeGrid');
const resumeCookBtn = $('resumeCookBtn');
const resumeCookTitle = $('resumeCookTitle');
const resumeCookMeta = $('resumeCookMeta');
const journalList = $('journalList');
const journalCount = $('journalCount');
const clearJournalBtn = $('clearJournalBtn');
const recipeHero = $('recipeHero');
const recipeHeroSymbol = $('recipeHeroSymbol');
const recipeHeroEyebrow = $('recipeHeroEyebrow');
const recipeTags = $('recipeTags');
const recipeTitle = $('recipeTitle');
const recipeDescription = $('recipeDescription');
const recipeMeta = $('recipeMeta');
const servingsValue = $('servingsValue');
const ingredientsHeading = $('ingredientsHeading');
const componentList = $('componentList');
const ingredientPreview = $('ingredientPreview');
const startTimeHint = $('startTimeHint');
const configMealHour = $('configMealHour');
const configMealMinute = $('configMealMinute');
const cookMealHour = $('cookMealHour');
const cookMealMinute = $('cookMealMinute');
const cookTitle = $('cookTitle');
const cookSubtitle = $('cookSubtitle');
const taskList = $('taskList');
const nextTaskName = $('nextTaskName');
const nextTaskCountdown = $('nextTaskCountdown');
const resetChecklistBtn = $('resetChecklistBtn');
const temperatureInput = $('temperatureInput');
const addTemperatureBtn = $('addTemperatureBtn');
const tempValidation = $('tempValidation');
const targetTemperature = $('targetTemperature');
const lastTemperature = $('lastTemperature');
const lastTemperatureTime = $('lastTemperatureTime');
const measurementCount = $('measurementCount');
const chartContainer = $('chartContainer');
const measurementList = $('measurementList');
const undoMeasurementBtn = $('undoMeasurementBtn');
const newCookBtn = $('newCookBtn');
const exportCsvBtn = $('exportCsvBtn');
const installHelpBtn = $('installHelpBtn');
const installDialog = $('installDialog');

function firstKnownSessionTimestamp(value) {
  const candidates = [
    value.sessionStartedAt,
    value.cookStartedAt,
    ...Object.values(value.completed || {})
  ].filter(Boolean).sort();
  return candidates[0] || new Date().toISOString();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const merged = { ...defaultState(), ...parsed };
    const hasProgress = Object.keys(parsed.completed || {}).length > 0 || (parsed.measurements || []).length > 0 || Boolean(parsed.cookStartedAt);
    if (!parsed.view) merged.view = hasProgress ? 'cook' : 'library';

    if (hasProgress && !merged.sessionId) {
      merged.sessionStartedAt = firstKnownSessionTimestamp(merged);
      merged.sessionId = createSessionId(new Date(merged.sessionStartedAt));
    }
    if (hasProgress && !merged.sessionStartedAt) merged.sessionStartedAt = firstKnownSessionTimestamp(merged);
    if (hasProgress && !merged.targetServingAt) merged.targetServingAt = mealAnchorDate(merged.mealTime || '20:00', new Date()).toISOString();
    return merged;
  } catch (error) {
    console.warn('État local illisible, réinitialisation.', error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function showError(message) {
  appError.textContent = message;
  appError.hidden = false;
}

function clearError() {
  appError.hidden = true;
  appError.textContent = '';
}

function hasSessionProgress() {
  return Object.keys(state.completed || {}).length > 0
    || state.measurements.length > 0
    || Boolean(state.cookStartedAt)
    || Boolean(state.sessionStartedAt && state.recipeId);
}

function showView(name, persist = true) {
  libraryView.hidden = name !== 'library';
  recipeView.hidden = name !== 'recipe';
  cookView.hidden = name !== 'cook';
  if (persist) {
    state.view = name;
    saveState();
  }
  window.scrollTo(0, 0);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function formatCompletion(iso) {
  return `Fait à ${formatTime(new Date(iso))}`;
}

function formatDurationRange(range) {
  if (!range) return '';
  const [min, max] = range;
  const formatOne = value => value >= 60
    ? `${Math.floor(value / 60)} h${value % 60 ? ` ${value % 60} min` : ''}`
    : `${value} min`;
  return min === max ? formatOne(min) : `${formatOne(min)} – ${formatOne(max)}`;
}

function formatIngredientQuantity(ingredient) {
  const quantity = ingredient.quantity;
  if (quantity === null) return 'au goût';
  const unitMap = { g: 'g', kg: 'kg', mL: 'mL', L: 'L', piece: 'pièce', tbsp: 'c. à soupe', tsp: 'c. à café' };
  const unit = unitMap[ingredient.unit] || ingredient.unit || '';
  const nice = value => Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  if (typeof quantity === 'number') return `${nice(quantity)}${unit ? ` ${unit}` : ''}`;
  return `${nice(quantity.min)}–${nice(quantity.max)}${unit ? ` ${unit}` : ''}`;
}

function fillTimePicker(hourSelect, minuteSelect, value) {
  if (!hourSelect.options.length) {
    for (let h = 0; h < 24; h++) {
      const option = document.createElement('option');
      option.value = String(h).padStart(2, '0');
      option.textContent = option.value;
      hourSelect.appendChild(option);
    }
    for (let m = 0; m < 60; m++) {
      const option = document.createElement('option');
      option.value = String(m).padStart(2, '0');
      option.textContent = option.value;
      minuteSelect.appendChild(option);
    }
  }
  const [hour, minute] = (value || '20:00').split(':');
  hourSelect.value = hour;
  minuteSelect.value = minute;
}

function readTimePicker(hourSelect, minuteSelect) {
  return `${hourSelect.value}:${minuteSelect.value}`;
}

function applyVisual(element, visual = {}) {
  element.className = `recipe-hero theme-${visual.theme || 'embers'}`;
}

function renderJournalHistory() {
  const data = loadJournal();
  renderJournalEntries(data.entries, { container: journalList, countElement: journalCount, clearButton: clearJournalBtn });
}

function renderLibrary() {
  recipeGrid.innerHTML = '';
  for (const entry of library.recipes) {
    const card = document.createElement(entry.status === 'available' ? 'button' : 'article');
    card.className = `recipe-card ${entry.status === 'coming_soon' ? 'coming-soon' : ''}`;
    if (entry.status === 'available') {
      card.type = 'button';
      card.addEventListener('click', () => openRecipe(entry));
    }

    const art = document.createElement('div');
    art.className = `recipe-card-art theme-${entry.visual?.theme || 'embers'}`;
    const symbol = document.createElement('span');
    symbol.className = 'card-symbol';
    symbol.textContent = entry.visual?.symbol || '🔥';
    const artLabel = document.createElement('span');
    artLabel.className = 'card-art-label';
    artLabel.textContent = entry.visual?.eyebrow || 'WOODFIRE';
    art.append(symbol, artLabel);

    const body = document.createElement('div');
    body.className = 'recipe-card-body';
    const status = document.createElement('span');
    status.className = 'recipe-status';
    status.textContent = entry.status === 'available' ? 'PRÊT À CUISINER' : 'BIENTÔT';
    const title = document.createElement('strong');
    title.className = 'recipe-card-title';
    title.textContent = entry.title;
    const description = document.createElement('p');
    description.textContent = entry.description;
    const tags = document.createElement('div');
    tags.className = 'tag-row small-tags';
    for (const tag of entry.tags || []) {
      const chip = document.createElement('span');
      chip.className = 'tag';
      chip.textContent = tag;
      tags.appendChild(chip);
    }
    body.append(status, title, description, tags);

    if (entry.status === 'available' && entry.elapsedRangeMin) {
      const meta = document.createElement('span');
      meta.className = 'card-meta';
      meta.textContent = `${entry.difficulty} · ${formatDurationRange(entry.elapsedRangeMin)} · ${entry.servings.min}–${entry.servings.max} pers.`;
      body.appendChild(meta);
    }

    card.append(art, body);
    recipeGrid.appendChild(card);
  }

  const resumable = state.recipeId && hasSessionProgress() && !state.sessionServedAt;
  resumeCookBtn.hidden = !resumable;
  if (resumable) {
    const entry = findLibraryRecipe(library, state.recipeId);
    resumeCookTitle.textContent = entry ? `Reprendre · ${entry.title}` : 'Reprendre la cuisson';
    const completedCount = Object.keys(state.completed || {}).length;
    resumeCookMeta.textContent = `${completedCount} étape${completedCount === 1 ? '' : 's'} terminée${completedCount === 1 ? '' : 's'} · ›`;
  }
  renderJournalHistory();
}

async function openRecipe(entry) {
  clearError();
  try {
    selectedEntry = entry;
    selectedRecipe = await loadRecipe(entry.recipeUrl);
    configServings = state.recipeId === selectedRecipe.id ? state.servings : selectedRecipe.servings.reference;
    configMealTime = state.mealTime || '20:00';
    renderRecipeDetail();
    showView('recipe');
  } catch (error) {
    console.error(error);
    showError('Impossible de charger cette recette. Réessaie en ligne puis recharge la page.');
  }
}

function renderRecipeDetail() {
  const visual = selectedEntry.visual || {};
  applyVisual(recipeHero, visual);
  recipeHeroSymbol.textContent = visual.symbol || '🔥';
  recipeHeroEyebrow.textContent = visual.eyebrow || 'WOODFIRE';
  recipeTitle.textContent = selectedRecipe.title;
  recipeDescription.textContent = selectedRecipe.description;

  recipeTags.innerHTML = '';
  for (const tag of selectedRecipe.tags || []) {
    const chip = document.createElement('span');
    chip.className = 'tag';
    chip.textContent = tag.replaceAll('-', ' ');
    recipeTags.appendChild(chip);
  }

  recipeMeta.innerHTML = '';
  const metadata = [
    `Préparation active · ${selectedRecipe.timing?.activePrepMin || '—'} min`,
    `Temps total · ${formatDurationRange(selectedRecipe.timing?.elapsedRangeMin)}`,
    `Difficulté · ${selectedRecipe.difficulty}`
  ];
  for (const text of metadata) {
    const item = document.createElement('span');
    item.textContent = text;
    recipeMeta.appendChild(item);
  }

  componentList.innerHTML = '';
  for (const component of selectedRecipe.components || []) {
    const row = document.createElement('div');
    row.className = 'component-row';
    const type = document.createElement('span');
    type.textContent = ({ main: 'PLAT', side: 'ACCOMPAGNEMENT', sauce: 'SAUCE' })[component.type] || component.type.toUpperCase();
    const title = document.createElement('strong');
    title.textContent = component.title;
    row.append(type, title);
    componentList.appendChild(row);
  }

  fillTimePicker(configMealHour, configMealMinute, configMealTime);
  renderScaledRecipeDetails();
}

function renderScaledRecipeDetails() {
  servingsValue.textContent = configServings;
  ingredientsHeading.textContent = `Pour ${configServings} personne${configServings > 1 ? 's' : ''}`;
  const scaled = scaleIngredients(selectedRecipe, configServings);
  ingredientPreview.innerHTML = '';

  for (const ingredient of scaled) {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    const left = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = ingredient.name;
    left.appendChild(name);
    if (ingredient.preparation) {
      const note = document.createElement('span');
      note.textContent = ingredient.preparation;
      left.appendChild(note);
    }
    const quantity = document.createElement('span');
    quantity.className = 'ingredient-quantity';
    quantity.textContent = `${ingredient.optional ? 'Option · ' : ''}${formatIngredientQuantity(ingredient)}`;
    row.append(left, quantity);
    ingredientPreview.appendChild(row);
  }

  renderPreCook(selectedRecipe, configServings, formatIngredientQuantity);

  const elapsedRange = selectedRecipe.timing?.elapsedRangeMin || [0, 0];
  const planningElapsed = elapsedRange[1] ?? elapsedRange[0] ?? 0;
  const [hour, minute] = configMealTime.split(':').map(Number);
  const service = new Date(2000, 0, 1, hour, minute);
  service.setMinutes(service.getMinutes() - planningElapsed);
  startTimeHint.textContent = `Début conseillé au plus tard vers ${formatTime(service)} · prévoir davantage de marge pour une cuisson longue.`;
}

function changeServings(delta) {
  if (!selectedRecipe) return;
  const min = selectedRecipe.servings.min || 1;
  const max = selectedRecipe.servings.max || 99;
  configServings = Math.max(min, Math.min(max, configServings + delta));
  renderScaledRecipeDetails();
}

function updateConfigTime() {
  configMealTime = readTimePicker(configMealHour, configMealMinute);
  renderScaledRecipeDetails();
}

function ensureSessionMetadata(resetSession) {
  const now = new Date();
  if (resetSession) {
    state.sessionId = createSessionId(now);
    state.sessionStartedAt = now.toISOString();
    state.sessionServedAt = null;
    state.targetServingAt = mealAnchorDate(configMealTime, now).toISOString();
    return;
  }
  if (!state.sessionStartedAt) state.sessionStartedAt = firstKnownSessionTimestamp(state);
  if (!state.sessionId) state.sessionId = createSessionId(new Date(state.sessionStartedAt));
  if (!state.targetServingAt) state.targetServingAt = mealAnchorDate(configMealTime, now).toISOString();
}

async function activateRecipe(entry, loadedRecipe, resetSession) {
  recipe = loadedRecipe;
  activeEntry = entry;
  if (resetSession) {
    state.completed = {};
    state.taskShifts = {};
    state.measurements = [];
    state.cookStartedAt = null;
  }
  ensureSessionMetadata(resetSession);
  state.recipeId = recipe.id;
  state.recipeVersion = recipe.version;
  state.activeRecipeUrl = entry.recipeUrl;
  state.servings = configServings;
  state.mealTime = configMealTime;
  state.temperatureTarget = resetSession ? (recipe.temperature?.defaultTargetC || 93) : state.temperatureTarget;
  state.view = 'cook';
  saveState();
  renderCookShell();
  recomputeSchedule();
  syncJournal();
  renderTasks();
  renderTemperature();
  switchTab(state.activeTab || 'planning', false);
  showView('cook');
}

async function startConfiguredCook() {
  if (!selectedRecipe || !selectedEntry) return;
  if (hasSessionProgress() && !state.sessionServedAt) {
    const ok = confirm('Démarrer ce repas comme nouvelle cuisson ? Les cases cochées et mesures de la cuisson en cours seront effacées.');
    if (!ok) return;
  }
  await activateRecipe(selectedEntry, selectedRecipe, true);
}

async function resumeCook() {
  const entry = findLibraryRecipe(library, state.recipeId);
  if (!entry?.recipeUrl) {
    showError('La recette de la cuisson en cours n’est plus disponible dans la bibliothèque.');
    showView('library');
    return;
  }
  clearError();
  try {
    const loaded = await loadRecipe(entry.recipeUrl);
    configServings = state.servings || loaded.servings.reference;
    configMealTime = state.mealTime || '20:00';
    await activateRecipe(entry, loaded, false);
  } catch (error) {
    console.error(error);
    showError('Impossible de reprendre la cuisson. Réessaie en ligne puis recharge la page.');
    showView('library');
  }
}

function renderCookShell() {
  cookTitle.textContent = recipe.title;
  cookSubtitle.textContent = `${state.servings} personne${state.servings > 1 ? 's' : ''} · service ${state.mealTime}`;
  fillTimePicker(cookMealHour, cookMealMinute, state.mealTime);
}

function recomputeSchedule() {
  if (!recipe) return;
  const referenceDate = state.targetServingAt ? new Date(state.targetServingAt) : new Date();
  schedule = buildSchedule(recipe, state.mealTime, referenceDate, state.taskShifts, {
    actualCompletionTimes: state.completed
  });
  const dependencyIssues = findDependencyIssues(recipe, schedule);
  const woodfireConflicts = findResourceConflicts(schedule, 'woodfire');
  if (dependencyIssues.length) console.warn('Planning dependency issues:', dependencyIssues);
  if (woodfireConflicts.length) console.warn('Planning Woodfire conflicts:', woodfireConflicts);
}

function serveStep() {
  return recipe?.steps.find(step => step.plan?.anchor === 'serve') || null;
}

function syncJournal() {
  if (!recipe || !state.sessionId) return;
  const serve = serveStep();
  const servedAt = serve ? state.completed?.[serve.id] : null;

  if (!servedAt) {
    state.sessionServedAt = null;
    removeJournalEntry(state.sessionId);
    saveState();
    return;
  }

  state.sessionServedAt = servedAt;
  const entry = buildJournalEntry({ state, recipe, schedule });
  upsertJournalEntry(entry);
  saveState();
}

function renderTasks() {
  taskList.innerHTML = '';
  for (const item of schedule) {
    const step = item.step;
    const card = document.createElement('article');
    card.className = `task-card${state.completed[step.id] ? ' completed' : ''}`;
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
      recomputeSchedule();
      syncJournal();
      renderTasks();
      renderLibrary();
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
  updateNextTask();
}

function updateNextTask() {
  if (!recipe) return;
  const next = getNextScheduledTask(schedule, state.completed);
  if (!next) {
    nextTaskName.textContent = 'Checklist terminée';
    nextTaskCountdown.textContent = 'Tout est prêt.';
    return;
  }
  const now = new Date();
  const deltaMin = Math.round((next.start - now) / 60000);
  nextTaskName.textContent = `${formatTime(next.start)} · ${next.step.title}`;
  if (deltaMin > 1) nextTaskCountdown.textContent = `Dans ${deltaMin} min`;
  else if (deltaMin >= -1) nextTaskCountdown.textContent = 'Maintenant';
  else nextTaskCountdown.textContent = `En retard de ${Math.abs(deltaMin)} min`;
}

function shiftRemainingTasks(minutes) {
  const nextTask = getNextScheduledTask(schedule, state.completed);
  if (!nextTask) return;
  state.taskShifts = addStepDelay(state.taskShifts, nextTask.step.id, minutes);
  saveState();
  recomputeSchedule();
  renderTasks();
}

function switchTab(tabName, persist = true) {
  state.activeTab = tabName;
  if (persist) saveState();
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabName));
  if (tabName === 'temperature' && !cookView.hidden) temperatureInput.focus();
}

function updateCookTime() {
  const reference = state.targetServingAt ? new Date(state.targetServingAt) : new Date();
  state.mealTime = readTimePicker(cookMealHour, cookMealMinute);
  state.targetServingAt = mealAnchorDate(state.mealTime, reference).toISOString();
  saveState();
  renderCookShell();
  recomputeSchedule();
  syncJournal();
  renderTasks();
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
  syncJournal();
  temperatureInput.value = '';
  renderTemperature();
  temperatureInput.focus();
}

function renderTemperature() {
  targetTemperature.value = state.temperatureTarget;
  const measurements = state.measurements;
  const last = measurements.at(-1);
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
  if (!data.length) {
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

  let grid = '';
  for (let i = 0; i <= 5; i++) {
    const val = minTemp + (tempSpan * i / 5);
    const yy = y(val);
    grid += `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.10" />`;
    grid += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.65">${Math.round(val)}°</text>`;
  }

  const xTicks = Math.min(4, Math.max(2, data.length));
  let xLabels = '';
  for (let i = 0; i < xTicks; i++) {
    const t = minTime + (timeSpan * i / (xTicks - 1));
    xLabels += `<text x="${x(t)}" y="${height - 15}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.65">${formatTime(new Date(t))}</text>`;
  }
  const circles = data.map(d => `<circle cx="${x(new Date(d.timestamp).getTime())}" cy="${y(d.temperature)}" r="4.5" fill="var(--accent)" />`).join('');
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
  $('backToLibraryBtn').addEventListener('click', () => { renderLibrary(); showView('library'); });
  $('cookHomeBtn').addEventListener('click', () => { renderLibrary(); showView('library'); });
  resumeCookBtn.addEventListener('click', resumeCook);
  $('servingsMinusBtn').addEventListener('click', () => changeServings(-1));
  $('servingsPlusBtn').addEventListener('click', () => changeServings(1));
  configMealHour.addEventListener('change', updateConfigTime);
  configMealMinute.addEventListener('change', updateConfigTime);
  $('startCookBtn').addEventListener('click', startConfiguredCook);
  cookMealHour.addEventListener('change', updateCookTime);
  cookMealMinute.addEventListener('change', updateCookTime);

  document.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => shiftRemainingTasks(Number(btn.dataset.shift))));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  resetChecklistBtn.addEventListener('click', () => {
    if (!confirm('Réinitialiser toutes les cases et les décalages du planning ?')) return;
    state.completed = {};
    state.taskShifts = {};
    state.sessionServedAt = null;
    saveState();
    recomputeSchedule();
    syncJournal();
    renderTasks();
  });

  addTemperatureBtn.addEventListener('click', addTemperature);
  temperatureInput.addEventListener('keydown', event => { if (event.key === 'Enter') addTemperature(); });
  targetTemperature.addEventListener('change', () => {
    const val = Number(targetTemperature.value);
    state.temperatureTarget = Number.isFinite(val) ? Math.min(120, Math.max(30, val)) : recipe?.temperature?.defaultTargetC || 93;
    saveState();
    syncJournal();
    renderTemperature();
  });
  undoMeasurementBtn.addEventListener('click', () => {
    if (!state.measurements.length) return;
    state.measurements.pop();
    if (!state.measurements.length) state.cookStartedAt = null;
    saveState();
    syncJournal();
    renderTemperature();
  });
  newCookBtn.addEventListener('click', () => {
    if (!confirm('Effacer toutes les mesures de température et démarrer une nouvelle série de mesures ?')) return;
    state.measurements = [];
    state.cookStartedAt = null;
    saveState();
    syncJournal();
    renderTemperature();
    temperatureInput.focus();
  });
  exportCsvBtn.addEventListener('click', exportCsv);

  clearJournalBtn.addEventListener('click', () => {
    if (!confirm('Effacer tout le journal de cuisson local ? Cette action est définitive.')) return;
    clearJournal();
    renderJournalHistory();
  });

  installHelpBtn.addEventListener('click', () => {
    if (typeof installDialog.showModal === 'function') installDialog.showModal();
    else alert('Dans Safari : Partager → Sur l’écran d’accueil → Ajouter.');
  });
}

async function init() {
  clearError();
  fillTimePicker(configMealHour, configMealMinute, state.mealTime);
  fillTimePicker(cookMealHour, cookMealMinute, state.mealTime);
  bindEvents();

  try {
    library = await loadLibrary(LIBRARY_URL);
    renderLibrary();
    if (state.view === 'cook' && state.recipeId && !state.sessionServedAt) await resumeCook();
    else showView('library', false);
  } catch (error) {
    console.error(error);
    showError('Impossible de charger la bibliothèque de recettes. Vérifie la connexion puis recharge la page.');
    showView('library', false);
  }

  setInterval(() => { if (!cookView.hidden) updateNextTask(); }, 30000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
  }
}

init();
