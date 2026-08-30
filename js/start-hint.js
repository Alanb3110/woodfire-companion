import { loadLibrary } from './library.js';
import { loadRecipe } from './recipe-loader.js';
import { buildMealSchedule } from './meal-planner.js';

const LIBRARY_URL = './recipes/index.json';
const recipeCache = new Map();
let libraryPromise = null;
let refreshToken = 0;

function $(id) {
  return document.getElementById(id);
}

function visibleRecipeView() {
  const view = $('recipeView');
  return view && !view.hidden;
}

function selectedMealTime() {
  const hour = $('configMealHour')?.value;
  const minute = $('configMealMinute')?.value;
  if (!/^\d{2}$/.test(hour || '') || !/^\d{2}$/.test(minute || '')) return null;
  return `${hour}:${minute}`;
}

function targetServingAt(mealTime) {
  const [hour, minute] = mealTime.split(':').map(Number);
  return new Date(2030, 0, 2, hour, minute, 0, 0);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

export function recommendedStartFromPlan(recipe, servings, mealTime) {
  const plan = buildMealSchedule(recipe, {
    servings,
    targetServingAt: targetServingAt(mealTime).toISOString()
  });
  if (!plan.length) return null;
  return plan.reduce((earliest, item) => item.start < earliest ? item.start : earliest, plan[0].start);
}

async function getLibrary() {
  libraryPromise ||= loadLibrary(LIBRARY_URL);
  return libraryPromise;
}

async function getRecipe(entry) {
  if (!recipeCache.has(entry.id)) recipeCache.set(entry.id, loadRecipe(entry.recipeUrl));
  return recipeCache.get(entry.id);
}

async function refreshStartHint() {
  if (!visibleRecipeView()) return;
  const hint = $('startTimeHint');
  const title = $('recipeTitle')?.textContent?.trim();
  const servings = Number($('servingsValue')?.textContent);
  const mealTime = selectedMealTime();
  if (!hint || !title || !Number.isFinite(servings) || !mealTime || title === 'Chargement…') return;

  const token = ++refreshToken;
  try {
    const library = await getLibrary();
    const entry = library.recipes.find(item => item.status === 'available' && item.title === title && item.recipeUrl);
    if (!entry) return;
    const recipe = await getRecipe(entry);
    const firstStart = recommendedStartFromPlan(recipe, servings, mealTime);
    if (token !== refreshToken || !firstStart) return;
    hint.textContent = `Début conseillé vers ${formatTime(firstStart)} · calculé depuis le planning complet.`;
  } catch (error) {
    console.warn('Impossible de calculer le début conseillé depuis le planner.', error);
  }
}

function scheduleRefresh() {
  queueMicrotask(() => refreshStartHint());
}

function initStartHint() {
  $('configMealHour')?.addEventListener('change', scheduleRefresh);
  $('configMealMinute')?.addEventListener('change', scheduleRefresh);
  $('servingsMinusBtn')?.addEventListener('click', scheduleRefresh);
  $('servingsPlusBtn')?.addEventListener('click', scheduleRefresh);

  const observer = new MutationObserver(scheduleRefresh);
  for (const id of ['recipeView', 'recipeTitle', 'servingsValue']) {
    const node = $(id);
    if (node) observer.observe(node, { attributes: true, childList: true, subtree: true });
  }
  scheduleRefresh();
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') initStartHint();
