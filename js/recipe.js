const SCALE_TYPES = new Set(['linear', 'fixed', 'step', 'range', 'to_taste']);
const DEPENDENCY_RELATIONS = new Set(['after_finish', 'after_start']);
const PLAN_ANCHORS = new Set(['serve']);
const PLAN_PLACEMENTS = new Set(['latest', 'earliest']);

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function quantityIsValid(quantity) {
  if (quantity === null) return true;
  if (isFiniteNumber(quantity)) return quantity >= 0;
  return quantity && isFiniteNumber(quantity.min) && isFiniteNumber(quantity.max) && quantity.min >= 0 && quantity.max >= quantity.min;
}

function detectCycles(steps) {
  const graph = new Map(steps.map(step => [step.id, (step.dependencies || []).map(dep => dep.stepId)]));
  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function visit(id, path) {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      cycles.push([...path.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;

    visiting.add(id);
    const nextPath = [...path, id];
    for (const dependencyId of graph.get(id) || []) visit(dependencyId, nextPath);
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of graph.keys()) visit(id, []);
  return cycles;
}

export function validateRecipe(recipe) {
  const errors = [];
  const warnings = [];

  if (!recipe || typeof recipe !== 'object') return { valid: false, errors: ['Recipe must be an object.'], warnings };
  if (recipe.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!recipe.id || typeof recipe.id !== 'string') errors.push('Recipe id is required.');
  if (!Number.isInteger(recipe.version) || recipe.version < 1) errors.push('Recipe version must be a positive integer.');
  if (!recipe.title || typeof recipe.title !== 'string') errors.push('Recipe title is required.');

  const referenceServings = recipe.servings?.reference;
  if (!isFiniteNumber(referenceServings) || referenceServings <= 0) errors.push('servings.reference must be > 0.');

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe.steps) ? recipe.steps : [];
  if (!ingredients.length) errors.push('At least one ingredient is required.');
  if (!steps.length) errors.push('At least one step is required.');

  const ingredientIds = new Set();
  for (const ingredient of ingredients) {
    if (!ingredient.id) errors.push('Every ingredient requires an id.');
    else if (ingredientIds.has(ingredient.id)) errors.push(`Duplicate ingredient id: ${ingredient.id}`);
    else ingredientIds.add(ingredient.id);

    if (!ingredient.name) errors.push(`Ingredient ${ingredient.id || '?'} requires a name.`);
    if (!quantityIsValid(ingredient.quantity)) errors.push(`Invalid quantity for ingredient ${ingredient.id || '?'}.`);

    const scaleType = ingredient.scale?.type;
    if (!SCALE_TYPES.has(scaleType)) errors.push(`Invalid scale type for ingredient ${ingredient.id || '?'}: ${scaleType}`);
    if (scaleType === 'step') {
      const breakpoints = ingredient.scale?.breakpoints;
      if (!Array.isArray(breakpoints) || !breakpoints.length) errors.push(`Step-scaled ingredient ${ingredient.id || '?'} requires breakpoints.`);
    }
  }

  const equipmentIds = new Set();
  for (const equipment of recipe.equipment || []) {
    if (!equipment.id) errors.push('Every equipment item requires an id.');
    else if (equipmentIds.has(equipment.id)) errors.push(`Duplicate equipment id: ${equipment.id}`);
    else equipmentIds.add(equipment.id);
    if (!equipment.name) errors.push(`Equipment ${equipment.id || '?'} requires a name.`);
    if (equipment.consumable !== undefined && typeof equipment.consumable !== 'boolean') errors.push(`Equipment ${equipment.id || '?'} consumable must be boolean.`);
    if (equipment.displayQuantity !== undefined && typeof equipment.displayQuantity !== 'string') errors.push(`Equipment ${equipment.id || '?'} displayQuantity must be a string.`);
  }

  const advancePrepIds = new Set();
  for (const prep of recipe.advancePrep || []) {
    if (!prep.id) errors.push('Every advancePrep item requires an id.');
    else if (advancePrepIds.has(prep.id)) errors.push(`Duplicate advancePrep id: ${prep.id}`);
    else advancePrepIds.add(prep.id);
    if (!prep.title) errors.push(`advancePrep ${prep.id || '?'} requires a title.`);
    if (prep.timing !== undefined && typeof prep.timing !== 'string') errors.push(`advancePrep ${prep.id || '?'} timing must be a string.`);
    if (prep.details !== undefined && typeof prep.details !== 'string') errors.push(`advancePrep ${prep.id || '?'} details must be a string.`);
  }

  const stepIds = new Set();
  for (const step of steps) {
    if (!step.id) errors.push('Every step requires an id.');
    else if (stepIds.has(step.id)) errors.push(`Duplicate step id: ${step.id}`);
    else stepIds.add(step.id);

    if (!step.title) errors.push(`Step ${step.id || '?'} requires a title.`);

    const plan = step.plan || {};
    if (plan.preferredStartOffsetMin !== undefined && !isFiniteNumber(plan.preferredStartOffsetMin)) {
      errors.push(`Invalid preferredStartOffsetMin for step ${step.id || '?'}.`);
    }
    if (plan.anchor !== undefined && !PLAN_ANCHORS.has(plan.anchor)) {
      errors.push(`Invalid plan anchor for step ${step.id || '?'}: ${plan.anchor}`);
    }
    if (plan.anchorOffsetMin !== undefined && !isFiniteNumber(plan.anchorOffsetMin)) {
      errors.push(`Invalid anchorOffsetMin for step ${step.id || '?'}.`);
    }
    if (plan.placement !== undefined && !PLAN_PLACEMENTS.has(plan.placement)) {
      errors.push(`Invalid plan placement for step ${step.id || '?'}: ${plan.placement}`);
    }

    const duration = step.durationMin ?? step.durationPlanMin ?? 0;
    if (!isFiniteNumber(duration) || duration < 0) errors.push(`Invalid duration for step ${step.id || '?'}.`);

    if (step.durationRangeMin) {
      const [min, max] = step.durationRangeMin;
      if (!isFiniteNumber(min) || !isFiniteNumber(max) || min < 0 || max < min) errors.push(`Invalid durationRangeMin for step ${step.id || '?'}.`);
    }

    for (const dependency of step.dependencies || []) {
      if (!dependency.stepId) errors.push(`Dependency in ${step.id || '?'} is missing stepId.`);
      if (!DEPENDENCY_RELATIONS.has(dependency.relation)) errors.push(`Invalid dependency relation in ${step.id || '?'}: ${dependency.relation}`);
      if (dependency.lagMin !== undefined && !isFiniteNumber(dependency.lagMin)) errors.push(`Invalid dependency lag in ${step.id || '?'}.`);
      if (dependency.planningBufferMin !== undefined && (!isFiniteNumber(dependency.planningBufferMin) || dependency.planningBufferMin < 0)) {
        errors.push(`Invalid planningBufferMin in ${step.id || '?'}.`);
      }
    }

    if (step.woodfire) {
      if (!(step.resources || []).includes('woodfire')) errors.push(`Step ${step.id || '?'} has Woodfire settings but does not reserve the woodfire resource.`);
      if (!step.woodfire.mode) errors.push(`Step ${step.id || '?'} is missing woodfire.mode.`);
      if (!isFiniteNumber(step.woodfire.temperatureC)) errors.push(`Step ${step.id || '?'} is missing a numeric woodfire.temperatureC.`);
      if (typeof step.woodfire.smoke !== 'boolean') errors.push(`Step ${step.id || '?'} must explicitly define woodfire.smoke.`);
      if (typeof step.woodfire.pellets !== 'boolean') errors.push(`Step ${step.id || '?'} must explicitly define woodfire.pellets.`);
      if (typeof step.woodfire.covered !== 'boolean') errors.push(`Step ${step.id || '?'} must explicitly define woodfire.covered.`);
      if (!step.woodfire.support) errors.push(`Step ${step.id || '?'} is missing woodfire.support.`);
    }
  }

  for (const step of steps) {
    for (const dependency of step.dependencies || []) {
      if (!stepIds.has(dependency.stepId)) errors.push(`Step ${step.id} depends on missing step ${dependency.stepId}.`);
      if (dependency.stepId === step.id) errors.push(`Step ${step.id} cannot depend on itself.`);
    }
  }

  for (const cycle of detectCycles(steps)) errors.push(`Dependency cycle: ${cycle.join(' -> ')}`);

  const hasServeAnchor = steps.some(step => step.plan?.anchor === 'serve');
  const hasCompleteLegacyTiming = steps.length > 0 && steps.every(step => isFiniteNumber(step.plan?.preferredStartOffsetMin));
  if (!hasServeAnchor && !hasCompleteLegacyTiming) {
    errors.push('Recipe requires a serve anchor or complete legacy preferredStartOffsetMin timing.');
  }
  if (hasServeAnchor && steps.some(step => isFiniteNumber(step.plan?.preferredStartOffsetMin))) {
    warnings.push('preferredStartOffsetMin is a migration hint; prefer dependencies, planning buffers and anchors for new recipes.');
  }

  for (const component of recipe.components || []) {
    for (const ingredientId of component.ingredientIds || []) {
      if (!ingredientIds.has(ingredientId)) errors.push(`Component ${component.id} references missing ingredient ${ingredientId}.`);
    }
    for (const stepId of component.stepIds || []) {
      if (!stepIds.has(stepId)) errors.push(`Component ${component.id} references missing step ${stepId}.`);
    }
  }

  if (!recipe.heroImage) warnings.push('Recipe has no heroImage yet.');

  return { valid: errors.length === 0, errors, warnings };
}

function scaleNumericQuantity(quantity, factor) {
  if (quantity === null) return null;
  if (typeof quantity === 'number') return quantity * factor;
  return { min: quantity.min * factor, max: quantity.max * factor };
}

export function scaleIngredient(ingredient, servings, referenceServings) {
  const scale = ingredient.scale || { type: 'linear' };
  const factor = servings / referenceServings;
  let quantity = ingredient.quantity;

  switch (scale.type) {
    case 'linear':
    case 'range':
      quantity = scaleNumericQuantity(quantity, factor);
      break;
    case 'fixed':
    case 'to_taste':
      break;
    case 'step': {
      const breakpoint = [...(scale.breakpoints || [])]
        .sort((a, b) => a.maxServings - b.maxServings)
        .find(item => servings <= item.maxServings);
      quantity = breakpoint ? breakpoint.quantity : scale.breakpoints?.at(-1)?.quantity ?? quantity;
      break;
    }
    default:
      throw new Error(`Unsupported scale type: ${scale.type}`);
  }

  return { ...ingredient, quantity, servings };
}

export function scaleIngredients(recipe, servings) {
  const reference = recipe.servings.reference;
  if (!isFiniteNumber(servings) || servings <= 0) throw new Error('Servings must be a positive number.');
  return recipe.ingredients.map(ingredient => scaleIngredient(ingredient, servings, reference));
}

export function formatWoodfireSummary(step) {
  if (!step.woodfire) return '';
  const wf = step.woodfire;
  const mode = wf.mode.replaceAll('_', ' ');
  const temperature = wf.temperatureRangeC ? `${wf.temperatureRangeC[0]}–${wf.temperatureRangeC[1]} °C` : `${wf.temperatureC} °C`;
  const smoke = wf.smoke ? 'SMOKE ON' : 'SMOKE OFF';
  const pellets = wf.pellets ? 'PELLETS OUI' : 'PELLETS NON';
  const support = wf.support.replaceAll('_', ' ').toUpperCase();
  const cover = wf.covered ? 'COUVERT' : 'DÉCOUVERT';
  return `WOODFIRE · ${mode} ${temperature} · ${smoke} · ${pellets} · ${support} · ${cover}`;
}
