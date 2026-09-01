import { scaleIngredient } from './recipe.js';

const USAGE_TOKEN = /\{\{use:([a-zA-Z0-9_-]+)\}\}/g;
const SCALE_TYPES = new Set(['linear', 'fixed', 'step', 'range', 'to_taste']);

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function quantityIsValid(quantity) {
  if (quantity === null) return true;
  if (isFiniteNumber(quantity)) return quantity >= 0;
  return quantity
    && isFiniteNumber(quantity.min)
    && isFiniteNumber(quantity.max)
    && quantity.min >= 0
    && quantity.max >= quantity.min;
}

function niceNumber(value) {
  if (Number.isInteger(value)) return String(value);
  return Number(value.toFixed(2)).toString().replace('.', ',');
}

function formatQuantity(quantity, unit, displayUnit = true) {
  if (quantity === null) return 'au goût';
  const unitMap = { g: 'g', kg: 'kg', mL: 'mL', L: 'L', piece: 'pièce', tbsp: 'c. à soupe', tsp: 'c. à café' };
  const suffix = displayUnit ? (unitMap[unit] || unit || '') : '';
  if (typeof quantity === 'number') return `${niceNumber(quantity)}${suffix ? ` ${suffix}` : ''}`;
  return `${niceNumber(quantity.min)}–${niceNumber(quantity.max)}${suffix ? ` ${suffix}` : ''}`;
}

function validateScale(scale, usageLabel, errors, maxServings) {
  if (!scale) return;
  if (!SCALE_TYPES.has(scale.type)) {
    errors.push(`${usageLabel} has invalid scale type ${scale.type}.`);
    return;
  }
  if (scale.type !== 'step') return;
  if (!Array.isArray(scale.breakpoints) || !scale.breakpoints.length) {
    errors.push(`${usageLabel} step scaling requires breakpoints.`);
    return;
  }
  let previousMax = 0;
  for (const breakpoint of scale.breakpoints) {
    if (!isFiniteNumber(breakpoint.maxServings) || breakpoint.maxServings <= previousMax || !quantityIsValid(breakpoint.quantity)) {
      errors.push(`${usageLabel} has invalid step-scaling breakpoints.`);
      return;
    }
    previousMax = breakpoint.maxServings;
  }
  if (isFiniteNumber(maxServings) && previousMax < maxServings) {
    errors.push(`${usageLabel} step scaling must cover servings.max.`);
  }
}

function tokensFromFragments(fragments) {
  return fragments
    .filter(value => value !== undefined && value !== null)
    .flatMap(fragment => [...String(fragment).matchAll(USAGE_TOKEN)].map(match => match[1]));
}

function stepTokens(step) {
  return tokensFromFragments([step?.summary, ...(Array.isArray(step?.details) ? step.details : [])]);
}

function advancePrepTokens(item) {
  return tokensFromFragments([item?.details]);
}

function buildReplacements(recipe, item, servings) {
  const ingredients = new Map((recipe.ingredients || []).map(ingredient => [ingredient.id, ingredient]));
  const referenceServings = recipe.servings?.reference;
  const replacements = new Map();

  for (const usage of item.ingredientUsage || []) {
    const ingredient = ingredients.get(usage.ingredientId);
    const scaled = scaleIngredient({
      ...ingredient,
      quantity: usage.quantity ?? ingredient.quantity,
      unit: usage.unit ?? ingredient.unit,
      scale: usage.scale ?? ingredient.scale
    }, servings, referenceServings);
    replacements.set(
      usage.id,
      formatQuantity(scaled.quantity, usage.unit ?? ingredient.unit, usage.displayUnit !== false)
    );
  }
  return replacements;
}

function materializeText(text, replacements) {
  if (text === undefined || text === null) return text;
  return String(text).replace(USAGE_TOKEN, (_, id) => replacements.get(id));
}

function validateUsageItem(recipe, item, tokens, itemLabel) {
  const errors = [];
  const ingredients = new Map((recipe?.ingredients || []).map(ingredient => [ingredient.id, ingredient]));
  const maxServings = recipe?.servings?.max;
  const usages = item?.ingredientUsage;

  if (usages === undefined) {
    if (tokens.length) errors.push(`${itemLabel} uses quantity tokens without ingredientUsage.`);
    return errors;
  }
  if (!Array.isArray(usages)) {
    errors.push(`${itemLabel} ingredientUsage must be an array.`);
    return errors;
  }

  const ids = new Set();
  for (const usage of usages) {
    const label = `${itemLabel} ingredientUsage ${usage?.id || '?'}`;
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
      errors.push(`${itemLabel} ingredientUsage entries must be objects.`);
      continue;
    }
    if (!usage.id || typeof usage.id !== 'string') errors.push(`${label} requires an id.`);
    else if (ids.has(usage.id)) errors.push(`${itemLabel} has duplicate ingredientUsage id ${usage.id}.`);
    else ids.add(usage.id);

    const ingredient = ingredients.get(usage.ingredientId);
    if (!ingredient) {
      errors.push(`${label} references missing ingredient ${usage.ingredientId || '?'}.`);
    } else if (usage.unit !== undefined && usage.unit !== ingredient.unit && usage.quantity === undefined) {
      errors.push(`${label} changes unit without an explicit converted quantity.`);
    }
    if (usage.quantity !== undefined && !quantityIsValid(usage.quantity)) errors.push(`${label} has invalid quantity.`);
    if (usage.unit !== undefined && (typeof usage.unit !== 'string' || !usage.unit)) errors.push(`${label} unit must be a non-empty string.`);
    if (usage.displayUnit !== undefined && typeof usage.displayUnit !== 'boolean') errors.push(`${label} displayUnit must be boolean.`);
    validateScale(usage.scale, label, errors, maxServings);
  }

  for (const token of tokens) {
    if (!ids.has(token)) errors.push(`${itemLabel} text references missing ingredientUsage token ${token}.`);
  }
  for (const id of ids) {
    if (!tokens.includes(id)) errors.push(`${itemLabel} ingredientUsage ${id} is not referenced by item text.`);
  }
  return errors;
}

export function validateStepIngredientUsage(recipe) {
  const errors = [];
  for (const step of recipe?.steps || []) {
    errors.push(...validateUsageItem(recipe, step, stepTokens(step), `Step ${step?.id || '?'}`));
  }
  return { valid: errors.length === 0, errors };
}

export function validateAdvancePrepIngredientUsage(recipe) {
  const errors = [];
  for (const item of recipe?.advancePrep || []) {
    errors.push(...validateUsageItem(recipe, item, advancePrepTokens(item), `advancePrep ${item?.id || '?'}`));
  }
  return { valid: errors.length === 0, errors };
}

export function validateRecipeIngredientUsage(recipe) {
  const step = validateStepIngredientUsage(recipe);
  const advance = validateAdvancePrepIngredientUsage(recipe);
  const errors = [...step.errors, ...advance.errors];
  return { valid: errors.length === 0, errors };
}

export function materializeStepDetails(recipe, step, servings) {
  const validation = validateUsageItem(recipe, step, stepTokens(step), `Step ${step?.id || '?'}`);
  if (validation.length) throw new Error(`Invalid step ingredient usage: ${validation.join(' | ')}`);
  if (!Array.isArray(step.details)) return [];
  if (!step.ingredientUsage?.length) return [...step.details];
  const replacements = buildReplacements(recipe, step, servings);
  return step.details.map(detail => materializeText(detail, replacements));
}

export function materializeStepSummary(recipe, step, servings) {
  const validation = validateUsageItem(recipe, step, stepTokens(step), `Step ${step?.id || '?'}`);
  if (validation.length) throw new Error(`Invalid step ingredient usage: ${validation.join(' | ')}`);
  if (!step.ingredientUsage?.length) return step.summary;
  return materializeText(step.summary, buildReplacements(recipe, step, servings));
}

export function materializeAdvancePrepItem(recipe, item, servings) {
  const validation = validateUsageItem(recipe, item, advancePrepTokens(item), `advancePrep ${item?.id || '?'}`);
  if (validation.length) throw new Error(`Invalid advance-prep ingredient usage: ${validation.join(' | ')}`);
  if (!item?.ingredientUsage?.length) return { ...item };
  return {
    ...item,
    details: materializeText(item.details, buildReplacements(recipe, item, servings))
  };
}

export function materializeAdvancePrepForServings(recipe, servings) {
  const validation = validateAdvancePrepIngredientUsage(recipe);
  if (!validation.valid) throw new Error(`Invalid advance-prep ingredient usage: ${validation.errors.join(' | ')}`);
  return (recipe.advancePrep || []).map(item => materializeAdvancePrepItem(recipe, item, servings));
}

export function materializeRecipeForServings(recipe, servings) {
  const validation = validateRecipeIngredientUsage(recipe);
  if (!validation.valid) throw new Error(`Invalid recipe ingredient usage: ${validation.errors.join(' | ')}`);
  return {
    ...recipe,
    advancePrep: materializeAdvancePrepForServings(recipe, servings),
    steps: (recipe.steps || []).map(step => ({
      ...step,
      summary: materializeStepSummary(recipe, step, servings),
      details: materializeStepDetails(recipe, step, servings)
    }))
  };
}
