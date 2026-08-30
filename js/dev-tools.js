import { loadLibrary } from './library.js';
import { loadRecipe } from './recipe-loader.js';
import { buildMealSchedule } from './meal-planner.js';
import { createSessionId } from './journal.js';
import { applyObservation, getObservationOptions } from './observations.js';
import {
  createDefaultSessionState,
  hasSessionProgress,
  loadSessionState,
  migrateSessionState,
  saveSessionState,
  snapshotRecipe
} from './session.js';

const LIBRARY_URL = './recipes/index.json';
const TEST_BACKUP_KEY = 'woodfire-companion-test-backup-v1';

function isDevBuild() {
  return document.querySelector('.dev-badge')?.textContent?.trim().startsWith('DEV');
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function localMealTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function ensureStyles() {
  if (document.getElementById('devToolsStyles')) return;
  const style = document.createElement('style');
  style.id = 'devToolsStyles';
  style.textContent = `
    .dev-tools-panel{margin:18px 0;padding:16px;border:1px dashed var(--accent-border);border-radius:18px;background:var(--accent-soft);display:flex;align-items:center;justify-content:space-between;gap:16px}
    .dev-tools-panel div{display:grid;gap:3px}.dev-tools-panel strong{font-size:.92rem}.dev-tools-panel span{color:var(--muted);font-size:.82rem}
    .test-cook-banner{margin:0 0 16px;padding:10px 14px;border:1px solid var(--accent-border);border-radius:14px;background:var(--accent-soft);display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.86rem}
    .test-cook-banner strong{color:var(--accent-text-soft);letter-spacing:.06em;text-transform:uppercase}
    @media(max-width:620px){.dev-tools-panel,.test-cook-banner{align-items:stretch;flex-direction:column}.dev-tools-panel button,.test-cook-banner button{width:100%}}
  `;
  document.head.appendChild(style);
}

function backupRealSession() {
  const current = loadSessionState();
  if (!current.isTest && hasSessionProgress(current)) {
    localStorage.setItem(TEST_BACKUP_KEY, JSON.stringify(current));
  }
}

function restorePreviousSession() {
  const raw = localStorage.getItem(TEST_BACKUP_KEY);
  localStorage.removeItem(TEST_BACKUP_KEY);
  if (raw) {
    try {
      saveSessionState(migrateSessionState(JSON.parse(raw)));
      window.location.reload();
      return;
    } catch (error) {
      console.warn('Sauvegarde pré-test illisible.', error);
    }
  }
  saveSessionState(createDefaultSessionState());
  window.location.reload();
}

async function buildTestSession() {
  backupRealSession();
  const library = await loadLibrary(LIBRARY_URL);
  const entry = library.recipes.find(item => item.id === 'pork-belly-burnt-ends-meal' && item.status === 'available')
    || library.recipes.find(item => item.status === 'available' && item.recipeUrl);
  if (!entry) throw new Error('Aucune recette exécutable disponible pour le mode test.');
  const recipe = await loadRecipe(entry.recipeUrl);
  const now = new Date();

  let targetServingAt = addMinutes(now, 120);
  let plan = buildMealSchedule(recipe, { servings: recipe.servings.reference, targetServingAt: targetServingAt.toISOString() });
  const observationItem = plan.find(item => getObservationOptions(item.step, recipe).some(option => option.outcome === 'recheck'));
  if (observationItem) {
    const desiredObservationStart = addMinutes(now, -5);
    targetServingAt = new Date(targetServingAt.getTime() + (desiredObservationStart - observationItem.start));
    plan = buildMealSchedule(recipe, { servings: recipe.servings.reference, targetServingAt: targetServingAt.toISOString() });
  }

  const testObservationItem = observationItem
    ? plan.find(item => item.step.id === observationItem.step.id)
    : null;
  const cutoff = testObservationItem?.start || now;
  const started = {};
  const completed = {};

  for (const item of plan) {
    if (testObservationItem && item.step.id === testObservationItem.step.id) continue;
    if (item.end <= cutoff) {
      started[item.step.id] = item.start.toISOString();
      completed[item.step.id] = item.end.toISOString();
    } else if (item.start <= now && item.end > now) {
      started[item.step.id] = item.start.toISOString();
    }
  }

  let observations = [];
  let rechecks = {};
  if (testObservationItem) {
    started[testObservationItem.step.id] = testObservationItem.start.toISOString();
    const option = getObservationOptions(testObservationItem.step, recipe).find(item => item.outcome === 'recheck');
    if (option) {
      const result = applyObservation({ observations, rechecks, completed }, testObservationItem.step, option, now);
      observations = result.observations;
      rechecks = result.rechecks;
      Object.assign(completed, result.completed);
    }
  }

  const firstProgress = Object.values(started).sort()[0] || addMinutes(now, -60).toISOString();
  const state = {
    ...createDefaultSessionState(),
    view: 'cook',
    isTest: true,
    mealTime: localMealTime(targetServingAt),
    servings: recipe.servings.reference,
    started,
    completed,
    observations,
    rechecks,
    temperatureTarget: recipe.temperature?.defaultTargetC || 93,
    measurements: [
      { timestamp: addMinutes(now, -35).toISOString(), temperature: 58, source: 'test' },
      { timestamp: addMinutes(now, -20).toISOString(), temperature: 72, source: 'test' },
      { timestamp: addMinutes(now, -5).toISOString(), temperature: 84, source: 'test' }
    ],
    cookStartedAt: firstProgress,
    sessionId: createSessionId(now).replace(/^cook-/, 'test-'),
    sessionStartedAt: firstProgress,
    targetServingAt: targetServingAt.toISOString(),
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    activeRecipeUrl: entry.recipeUrl,
    recipeSnapshot: snapshotRecipe(recipe),
    activeTab: 'planning'
  };

  saveSessionState(state);
  window.location.reload();
}

function injectLibraryTool() {
  const libraryView = document.getElementById('libraryView');
  const recipeGrid = document.getElementById('recipeGrid');
  if (!libraryView || !recipeGrid || document.getElementById('devTestCookPanel')) return;
  const panel = document.createElement('section');
  panel.id = 'devTestCookPanel';
  panel.className = 'dev-tools-panel';
  const copy = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = 'Outils DEV';
  const text = document.createElement('span');
  text.textContent = 'Charge une cuisson factice autour de maintenant sans écrire dans le journal.';
  copy.append(title, text);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary-btn';
  button.textContent = '🧪 Cuisson test';
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Préparation…';
    try {
      await buildTestSession();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Impossible de créer la cuisson test.');
      button.disabled = false;
      button.textContent = '🧪 Cuisson test';
    }
  });
  panel.append(copy, button);
  recipeGrid.before(panel);
}

function injectTestBanner() {
  const state = loadSessionState();
  if (!state.isTest) return;
  const cookView = document.getElementById('cookView');
  const heading = cookView?.querySelector('.cook-heading');
  if (!heading || document.getElementById('testCookBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'testCookBanner';
  banner.className = 'test-cook-banner';
  const text = document.createElement('span');
  text.innerHTML = '<strong>Mode test</strong> · données factices · journal désactivé';
  const quit = document.createElement('button');
  quit.type = 'button';
  quit.className = 'secondary-btn';
  quit.textContent = localStorage.getItem(TEST_BACKUP_KEY) ? 'Restaurer ma cuisson' : 'Quitter le test';
  quit.addEventListener('click', restorePreviousSession);
  banner.append(text, quit);
  heading.after(banner);
}

function initDevTools() {
  if (!isDevBuild()) return;
  ensureStyles();
  injectLibraryTool();
  injectTestBanner();
  const observer = new MutationObserver(() => {
    injectLibraryTool();
    injectTestBanner();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

initDevTools();
