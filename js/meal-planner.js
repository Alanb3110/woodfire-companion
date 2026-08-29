import { buildSchedule } from './planner.js';

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocalTime(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
    actualCompletionTimes: { ...(context.actualCompletionTimes || {}) },
    expectedCompletionTimes: { ...(context.expectedCompletionTimes || {}) },
    selectedComponents,
    variants
  };
}

export function buildMealSchedule(recipe, context = {}) {
  const normalized = normalizeMealPlanContext(recipe, context);
  return buildSchedule(
    recipe,
    normalized.mealTime,
    normalized.referenceDate,
    normalized.taskShifts,
    {
      actualCompletionTimes: normalized.actualCompletionTimes,
      expectedCompletionTimes: normalized.expectedCompletionTimes
    }
  );
}
