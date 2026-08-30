import { loadLibrary, findLibraryRecipe } from './js/library.js';
import { loadRecipe } from './js/recipe-loader.js';
import { formatWoodfireSummary, scaleIngredients, validateRecipe } from './js/recipe.js';
import { renderPreCook } from './js/prep-ui.js';
import {
  buildJournalEntry,
  clearJournal,
  createSessionId,
  loadJournal,
  removeJournalEntry,
  resolveServiceStep,
  upsertJournalEntry
} from './js/journal.js';
import { renderJournalEntries } from './js/journal-ui.js';
import { buildMealSchedule, resolveSessionServingTarget } from './js/meal-planner.js';
import {
  addStepDelay,
  findDependencyIssues,
  findResourceConflicts,
  getNextScheduledTask,
  plannedDurationMin
} from './js/planner.js';
import {
  applyObservation,
  clearPendingRecheck,
  getObservationOptions,
  observationsForStep,
  pendingRecheckDate,
  resolveObservationDelayMin
} from './js/observations.js';
import {
  completeStep,
  firstKnownSessionTimestamp,
  hasSessionProgress as sessionHasProgress,
  loadSessionState,
  resetCookProgress,
  resetStep,
  saveSessionState,
  snapshotRecipe,
  startStep,
  stepLifecycle
} from './js/session.js';
import { createTemperatureController } from './js/temperature-ui.js';

const LIBRARY_URL = './recipes/index.json';

let library = null;
let recipe = null;
let activeEntry = null;
let selectedRecipe = null;
let selectedEntry = null;
let configServings = 4;
let configMealTime = '20:00';
let schedule = [];
let state = repairLoadedSession(loadSessionState());
saveSessionState(state);

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
const currentTaskCard = $('currentTaskCard');
const currentTaskName = $('currentTaskName');
const currentTaskMeta = $('currentTaskMeta');
const nextTaskName = $('nextTaskName');
const nextTaskCountdown = $('nextTaskCountdown');
const resetChecklistBtn = $('resetChecklistBtn');
const installHelpBtn = $('installHelpBtn');
const installDialog = $('installDialog');

const temperatureController = createTemperatureController({
  elements: {
    input: $('temperatureInput'),
    addButton: $('addTemperatureBtn'),
    validation: $('tempValidation'),
    targetInput: $('targetTemperature'),
    lastValue: $('lastTemperature'),
    lastTime: $('lastTemperatureTime'),
    count: $('measurementCount'),
    chart: $('chartContainer'),
    list: $('measurementList'),
    undoButton: $('undoMeasurementBtn'),
    newSeriesButton: $('newCookBtn'),
    exportButton: $('exportCsvBtn')
  },
  getState: () => state,
  getDefaultTarget: () => recipe?.temperature?.defaultTargetC || 93,
  commit: () => {
    saveState();
    syncJournal();
  },
  formatTime,
  confirmAction: message => confirm(message)
});

function repairLoadedSession(value) {
  const hasProgress = sessionHasProgress(value);
  if (hasProgress && !value.sessionStartedAt) value.sessionStartedAt = firstKnownSessionTimestamp(value);
  if (hasProgress && !value.sessionId) value.sessionId = createSessionId(new Date(value.sessionStartedAt));
  if (hasProgress && value.sessionStartedAt) {
    value.targetServingAt = resolveSessionServingTarget({
      mealTime: value.mealTime || '20:00',
      targetServingAt: value.targetServingAt,
      sessionStartedAt: value.sessionStartedAt
    }).toISOString();
  }
  return value;
}

function saveState() {
  saveSessionState(state);
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
  return sessionHasProgress(state);
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
    const activeTitle = entry?.title || state.recipeSnapshot?.title || 'Cuisson en cours';
    resumeCookTitle.textContent = `Reprendre · ${activeTitle}`;
    const completedCount = Object.keys(state.completed || {}).length;
    const activeCount = Object.keys(state.started || {}).filter(id => !state.completed[id]).length;
    const activeCopy = activeCount ? ` · ${activeCount} en cours` : '';
    resumeCookMeta.textContent = `${completedCount} terminée${completedCount === 1 ? '' : 's'}${activeCopy} · ›`;
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
    state.targetServingAt = resolveSessionServingTarget({
      mealTime: configMealTime,
      sessionStartedAt: state.sessionStartedAt
    }).toISOString();
    return;
  }
  if (!state.sessionStartedAt) state.sessionStartedAt = firstKnownSessionTimestamp(state);
  if (!state.sessionId) state.sessionId = createSessionId(new Date(state.sessionStartedAt));
  state.targetServingAt = resolveSessionServingTarget({
    mealTime: configMealTime,
    targetServingAt: state.targetServingAt,
    sessionStartedAt: state.sessionStartedAt
  }).toISOString();
}

async function activateRecipe(entry, loadedRecipe, resetSession) {
  recipe = loadedRecipe;
  activeEntry = entry;
  if (resetSession) state = resetCookProgress(state);
  ensureSessionMetadata(resetSession);
  if (resetSession || !state.recipeSnapshot) state.recipeSnapshot = snapshotRecipe(recipe);
  state.recipeId = recipe.id;
  state.recipeVersion = recipe.version;
  state.activeRecipeUrl = entry.recipeUrl || state.activeRecipeUrl;
  state.servings = configServings;
  state.mealTime = configMealTime;
  state.temperatureTarget = resetSession ? (recipe.temperature?.defaultTargetC || 93) : state.temperatureTarget;
  state.view = 'cook';
  saveState();
  renderCookShell();
  recomputeSchedule();
  syncJournal();
  renderTasks();
  temperatureController.render();
  switchTab(state.activeTab || 'planning', false);
  showView('cook');
}

async function startConfiguredCook() {
  if (!selectedRecipe || !selectedEntry) return;
  if (hasSessionProgress() && !state.sessionServedAt) {
    const ok = confirm('Démarrer ce repas comme nouvelle cuisson ? Les étapes en cours/terminées, observations et mesures de la cuisson actuelle seront effacées.');
    if (!ok) return;
  }
  await activateRecipe(selectedEntry, selectedRecipe, true);
}

async function resumeCook() {
  const libraryEntry = findLibraryRecipe(library, state.recipeId);
  const entry = libraryEntry || {
    id: state.recipeId,
    title: state.recipeSnapshot?.title || 'Cuisson en cours',
    recipeUrl: state.activeRecipeUrl,
    visual: { theme: 'embers', symbol: '🔥', eyebrow: 'WOODFIRE' }
  };
  clearError();
  try {
    let loaded = null;
    if (state.recipeSnapshot?.id === state.recipeId) {
      const validation = validateRecipe(state.recipeSnapshot);
      if (validation.valid) loaded = snapshotRecipe(state.recipeSnapshot);
    }
    if (!loaded) {
      if (!entry.recipeUrl) throw new Error('No recipe snapshot or recipeUrl is available for the active cook.');
      loaded = await loadRecipe(entry.recipeUrl);
      state.recipeSnapshot = snapshotRecipe(loaded);
      state.recipeVersion = loaded.version;
      saveState();
    }
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
  schedule = buildMealSchedule(recipe, {
    servings: state.servings,
    targetServingAt: state.targetServingAt,
    taskShifts: state.taskShifts,
    actualStartTimes: state.started,
    actualCompletionTimes: state.completed,
    expectedCompletionTimes: state.rechecks
  });
  const dependencyIssues = findDependencyIssues(recipe, schedule);
  const woodfireConflicts = findResourceConflicts(schedule, 'woodfire');
  if (dependencyIssues.length) console.warn('Planning dependency issues:', dependencyIssues);
  if (woodfireConflicts.length) console.warn('Planning Woodfire conflicts:', woodfireConflicts);
}

function serveStep() {
  if (!recipe) return null;
  try {
    return resolveServiceStep(recipe);
  } catch (error) {
    console.warn('Service step resolution failed:', error);
    return null;
  }
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

function applyStepObservation(step, option) {
  const now = new Date();
  if (!state.started[step.id]) state = startStep(state, step.id, now);
  const result = applyObservation({
    observations: state.observations,
    rechecks: state.rechecks,
    completed: state.completed
  }, step, option, now);

  state.observations = result.observations;
  state.rechecks = result.rechecks;
  state.completed = result.completed;
  if (!state.cookStartedAt) state.cookStartedAt = result.record.timestamp;
  saveState();
  recomputeSchedule();
  syncJournal();
  renderTasks();
  renderLibrary();
}

function renderObservationControls(detail, step) {
  const options = getObservationOptions(step, recipe);
  if (!options.length) return;

  const panel = document.createElement('div');
  panel.className = 'observation-panel';

  const heading = document.createElement('div');
  heading.className = 'observation-heading';
  const label = document.createElement('strong');
  label.textContent = 'Observation';
  const criterion = document.createElement('span');
  criterion.textContent = step.completion?.description || 'Choisir l’état observé.';
  heading.append(label, criterion);
  panel.appendChild(heading);

  if (!state.completed[step.id]) {
    const actions = document.createElement('div');
    actions.className = 'observation-actions';
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `observation-btn ${option.outcome === 'complete' ? 'observation-ready' : ''}`;
      const delay = option.outcome === 'recheck' ? resolveObservationDelayMin(step, option) : null;
      button.textContent = delay ? `${option.label} · ${delay} min` : option.label;
      button.addEventListener('click', () => applyStepObservation(step, option));
      actions.appendChild(button);
    }
    panel.appendChild(actions);
  }

  const pending = pendingRecheckDate(state.rechecks, step.id);
  if (pending && !state.completed[step.id]) {
    const due = document.createElement('div');
    due.className = 'recheck-due';
    due.textContent = `Recontrôle prévu à ${formatTime(pending)}`;
    panel.appendChild(due);
  }

  const history = observationsForStep(state.observations, step.id).slice(-3).reverse();
  if (history.length) {
    const historyBox = document.createElement('div');
    historyBox.className = 'observation-history';
    for (const observation of history) {
      const row = document.createElement('div');
      const at = document.createElement('span');
      at.textContent = formatTime(new Date(observation.timestamp));
      const text = document.createElement('span');
      const recheck = observation.recheckDueAt ? ` → recontrôle ${formatTime(new Date(observation.recheckDueAt))}` : '';
      text.textContent = `${observation.label}${recheck}`;
      row.append(at, text);
      historyBox.appendChild(row);
    }
    panel.appendChild(historyBox);
  }

  detail.appendChild(panel);
}

function handleStepToggle(step) {
  const lifecycle = stepLifecycle(state, step.id);
  const now = new Date();
  if (lifecycle === 'done') {
    state = resetStep(state, step.id);
  } else if (lifecycle === 'active') {
    state = completeStep(state, step.id, now);
    state.rechecks = clearPendingRecheck(state.rechecks, step.id);
  } else if (plannedDurationMin(step) > 0) {
    state = startStep(state, step.id, now);
  } else {
    state = completeStep(state, step.id, now);
    state.rechecks = clearPendingRecheck(state.rechecks, step.id);
  }
  saveState();
  recomputeSchedule();
  syncJournal();
  renderTasks();
  renderLibrary();
}

function renderTasks() {
  taskList.innerHTML = '';
  for (const item of schedule) {
    const step = item.step;
    const lifecycle = stepLifecycle(state, step.id);
    const pending = pendingRecheckDate(state.rechecks, step.id);
    const classes = ['task-card'];
    if (lifecycle === 'done') classes.push('completed');
    if (lifecycle === 'active') classes.push('active');
    if (pending && lifecycle !== 'done') classes.push('awaiting-recheck');

    const card = document.createElement('article');
    card.className = classes.join(' ');
    card.dataset.taskId = step.id;

    const main = document.createElement('div');
    main.className = 'task-main';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = lifecycle === 'done';
    check.indeterminate = lifecycle === 'active';
    check.setAttribute('aria-label', lifecycle === 'done'
      ? `Réinitialiser ${step.title}`
      : lifecycle === 'active'
        ? `Terminer ${step.title}`
        : plannedDurationMin(step) > 0
          ? `Démarrer ${step.title}`
          : `Marquer ${step.title} comme terminée`);
    check.addEventListener('change', () => handleStepToggle(step));

    const time = document.createElement('div');
    time.className = 'task-time';
    time.textContent = formatTime(pending && lifecycle !== 'done' ? pending : item.start);

    const title = document.createElement('div');
    title.className = 'task-title';
    const strong = document.createElement('strong');
    strong.textContent = step.title;
    const sub = document.createElement('span');
    const baseSummary = step.summary || '';
    if (pending && lifecycle !== 'done') {
      sub.textContent = `${baseSummary}${baseSummary ? ' · ' : ''}Recontrôle ${formatTime(pending)}`;
    } else if (lifecycle === 'active') {
      sub.textContent = `EN COURS${baseSummary ? ` · ${baseSummary}` : ''}`;
    } else {
      sub.textContent = baseSummary;
    }
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

    if (step.completion?.description) {
      const criterion = document.createElement('div');
      criterion.className = 'completion-criterion';
      criterion.textContent = `Critère de fin · ${step.completion.description}`;
      detail.appendChild(criterion);
    }

    const ul = document.createElement('ul');
    for (const detailText of step.details || []) {
      const li = document.createElement('li');
      li.textContent = detailText;
      ul.appendChild(li);
    }
    detail.appendChild(ul);

    renderObservationControls(detail, step);

    if (state.started[step.id]) {
      const started = document.createElement('div');
      started.className = 'completion-time';
      started.textContent = `Démarré à ${formatTime(new Date(state.started[step.id]))}`;
      detail.appendChild(started);
    }
    if (state.completed[step.id]) {
      const completion = document.createElement('div');
      completion.className = 'completion-time';
      completion.textContent = `Terminé à ${formatTime(new Date(state.completed[step.id]))}`;
      detail.appendChild(completion);
    }

    card.append(main, detail);
    taskList.appendChild(card);
  }
  renderCurrentTask();
  updateNextTask();
}

function activeScheduleItems() {
  return schedule.filter(item => state.started[item.step.id] && !state.completed[item.step.id]);
}

function renderCurrentTask() {
  const active = activeScheduleItems();
  currentTaskCard.hidden = !active.length;
  if (!active.length) return;

  const ordered = [...active].sort((a, b) => {
    const aWoodfire = (a.step.resources || []).includes('woodfire') ? 0 : 1;
    const bWoodfire = (b.step.resources || []).includes('woodfire') ? 0 : 1;
    return aWoodfire - bWoodfire || a.start - b.start;
  });
  const primary = ordered[0];
  const extra = ordered.length - 1;
  currentTaskName.textContent = `${primary.step.title}${extra ? ` · +${extra} autre${extra > 1 ? 's' : ''}` : ''}`;
  const startedAt = new Date(state.started[primary.step.id]);
  const config = primary.step.woodfire ? formatWoodfireSummary(primary.step) : primary.step.summary || 'Étape active';
  currentTaskMeta.textContent = `${config} · démarré ${formatTime(startedAt)} · fin indicative ${formatTime(primary.end)}`;
}

function updateNextTask() {
  if (!recipe) return;
  const next = getNextScheduledTask(schedule, state.completed, state.rechecks, state.started);
  if (!next) {
    if (activeScheduleItems().length) {
      nextTaskName.textContent = 'Aucune autre action planifiée';
      nextTaskCountdown.textContent = 'Poursuis les étapes en cours.';
    } else {
      nextTaskName.textContent = 'Checklist terminée';
      nextTaskCountdown.textContent = 'Tout est prêt.';
    }
    return;
  }

  const pending = pendingRecheckDate(state.rechecks, next.step.id);
  const target = pending || next.start;
  const now = new Date();
  const deltaMin = Math.round((target - now) / 60000);

  nextTaskName.textContent = `${formatTime(target)} · ${pending ? 'Recontrôler · ' : ''}${next.step.title}`;
  if (pending) {
    if (deltaMin > 1) nextTaskCountdown.textContent = `Recontrôle dans ${deltaMin} min`;
    else if (deltaMin >= -1) nextTaskCountdown.textContent = 'Recontrôle maintenant';
    else nextTaskCountdown.textContent = `Recontrôle en retard de ${Math.abs(deltaMin)} min`;
    return;
  }

  if (deltaMin > 1) nextTaskCountdown.textContent = `Dans ${deltaMin} min`;
  else if (deltaMin >= -1) nextTaskCountdown.textContent = 'Maintenant';
  else nextTaskCountdown.textContent = `En retard de ${Math.abs(deltaMin)} min`;
}

function shiftRemainingTasks(minutes) {
  const nextTask = getNextScheduledTask(schedule, state.completed, state.rechecks, state.started);
  if (!nextTask) return;

  const pending = pendingRecheckDate(state.rechecks, nextTask.step.id);
  if (pending) {
    state.rechecks[nextTask.step.id] = new Date(pending.getTime() + minutes * 60000).toISOString();
  } else {
    state.taskShifts = addStepDelay(state.taskShifts, nextTask.step.id, minutes);
  }
  saveState();
  recomputeSchedule();
  renderTasks();
}

function switchTab(tabName, persist = true) {
  state.activeTab = tabName;
  if (persist) saveState();
  document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabName));
  if (tabName === 'temperature' && !cookView.hidden) temperatureController.focus();
}

function updateCookTime() {
  const reference = state.targetServingAt;
  state.mealTime = readTimePicker(cookMealHour, cookMealMinute);
  state.targetServingAt = resolveSessionServingTarget({
    mealTime: state.mealTime,
    targetServingAt: reference,
    sessionStartedAt: state.sessionStartedAt || new Date().toISOString()
  }).toISOString();
  saveState();
  renderCookShell();
  recomputeSchedule();
  syncJournal();
  renderTasks();
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
    if (!confirm('Réinitialiser les étapes, observations et décalages du planning ?')) return;
    state.started = {};
    state.completed = {};
    state.taskShifts = {};
    state.observations = [];
    state.rechecks = {};
    state.sessionServedAt = null;
    saveState();
    recomputeSchedule();
    syncJournal();
    renderTasks();
  });

  temperatureController.bind();

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

  setInterval(() => {
    if (!cookView.hidden) {
      renderCurrentTask();
      updateNextTask();
    }
  }, 30000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
  }
}

init();