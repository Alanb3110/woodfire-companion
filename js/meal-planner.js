import { buildSchedule, closestMealAnchorDate, nextMealAnchorDate } from './planner.js';
import { materializeRecipeForServings } from './step-details.js';

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function resolveSessionServingTarget({ mealTime, targetServingAt = null, sessionStartedAt }) {
  const startedAt = validDate(sessionStartedAt);
  if (!startedAt) throw new Error('Session serving target requires a valid sessionStartedAt.');
  if (!mealTime) throw new Error('Session serving target requires mealTime.');

  const reference = validDate(targetServingAt) || startedAt;
  let target = closestMealAnchorDate(mealTime, reference);

  if (target.getTime() < startedAt.getTime()) {
    target = nextMealAnchorDate(mealTime, startedAt);
  }

  return target;
}

export function normalizeMealPlanContext(recipe, context = {}) {
  if (!recipe || typeof recipe !== 'object') throw new Error('A recipe is required.');

  const servings = context.servings ?? recipe.servings?.reference;
  if (!isFiniteNumber(servings) || servings <= 0) throw new Error('Meal-plan servings must be a positive number.');
  if (isFiniteNumber(recipe.servings?.min) && servings < recipe.servings.min) {
    throw new Error(`Meal-plan servings ${servings} are below recipe minimum ${recipe.servings.min}.`);
  }
  if (isFiniteNumber(recipe.servings?.max) && servings > recipe.servings.max) {
    throw new Error(`Meal-plan servings ${servings} exceed recipe maximum ${recipe.servings.max}.`);
  }

  let targetServingAt = null;
  let referenceDate = context.referenceDate ? validDate(context.referenceDate) : new Date();
  if (!referenceDate) throw new Error('Invalid meal-plan referenceDate.');

  let mealTime = context.mealTime || null;
  if (context.targetServingAt !== undefined && context.targetServingAt !== null) {
    targetServingAt = validDate(context.targetServingAt);
    if (!targetServingAt) throw new Error('Invalid meal-plan targetServingAt.');
    referenceDate = targetServingAt;
    mealTime = formatLocalTime(targetServingAt);
  }

  if (!mealTime) throw new Error('Meal-plan context requires mealTime or targetServingAt.');

  const selectedComponents = context.selectedComponents == null
    ? null
    : [...context.selectedComponents];
  const variants = context.variants && typeof context.variants === 'object'
    ? { ...context.variants }
    : {};

  return {
    servings,
    mealTime,
    targetServingAt,
    referenceDate,
    taskShifts: { ...(context.taskShifts || {}) },
    actualStartTimes: { ...(context.actualStartTimes || {}) },
    actualCompletionTimes: { ...(context.actualCompletionTimes || {}) },
    expectedCompletionTimes: { ...(context.expectedCompletionTimes || {}) },
    selectedComponents,
    variants
  };
}

export function buildMealSchedule(recipe, context = {}) {
  const normalized = normalizeMealPlanContext(recipe, context);
  const materializedRecipe = materializeRecipeForServings(recipe, normalized.servings);
  return buildSchedule(
    materializedRecipe,
    normalized.mealTime,
    normalized.referenceDate,
    normalized.taskShifts,
    {
      actualStartTimes: normalized.actualStartTimes,
      actualCompletionTimes: normalized.actualCompletionTimes,
      expectedCompletionTimes: normalized.expectedCompletionTimes
    }
  );
}

export function recommendedStartFromPlan(recipe, context = {}) {
  const plan = buildMealSchedule(recipe, context);
  if (!plan.length) return null;
  return plan.reduce((earliest, item) => item.start < earliest ? item.start : earliest, plan[0].start);
}
