const SCALE_TYPES = new Set(['linear', 'fixed', 'step', 'range', 'to_taste']);
const DEPENDENCY_RELATIONS = new Set(['after_finish', 'after_start']);
const PLAN_ANCHORS = new Set(['serve']);
const PLAN_PLACEMENTS = new Set(['latest', 'earliest']);
const COMPLETION_TYPES = new Set([
  'manual',
  'time',
  'appearance',
  'temperature',
  'tenderness',
  'checkpoint',
  'combined',
  'observation'
]);
const RESERVED_STEP_COMPONENTS = new Set(['meal']);

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

function numericRangeIsValid(range, { minValue = 0 } = {}) {
  if (!Array.isArray(range) || range.length !== 2) return false;
  const [min, max] = range;
  return isFiniteNumber(min) && isFiniteNumber(max) && min >= minValue && max >= min;
}

function recheckIntervalIsValid(value) {
  if (isFiniteNumber(value)) return value > 0;
  return numericRangeIsValid(value, { minValue: 0 }) && value[0] > 0;
}

function detectCycles(steps) {
  const knownIds = new Set(steps.map(step => step.id).filter(Boolean));
  const graph = new Map(steps
    .filter(step => step.id)
    .map(step => [step.id, (step.dependencies || [])
      .map(dep => dep.stepId)
      .filter(id => knownIds.has(id))]));
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

function prerequisiteClosureFromAnchors(steps) {
  const byId = new Map(steps.filter(step => step.id).map(step => [step.id, step]));
  const connected = new Set();
  const queue = steps.filter(step => step.plan?.anchor).map(step => step.id);

  while (queue.length) {
    const id = queue.shift();
    if (!id || connected.has(id)) continue;
    connected.add(id);
    const step = byId.get(id);
    for (const dependency of step?.dependencies || []) {
      if (byId.has(dependency.stepId)) queue.push(dependency.stepId);
    }
  }

  return connected;
}

export function validateRecipe(recipe) {
  const errors = [];
  const warnings = [];

  if (!recipe || typeof recipe !== 'object') return { valid: false, errors: ['Recipe must be an object.'], warnings };
  if (recipe.schemaVersion !== 1) errors.push('schemaVersion must be 1.');
  if (!recipe.id || typeof recipe.id !== 'string') errors.push('Recipe id is required.');
  if (!Number.isInteger(recipe.version) || recipe.version < 1) errors.push('Recipe version must be a positive integer.');
  if (!recipe.title || typeof recipe.title !== 'string') errors.push('Recipe title is required.');

  const minServings = recipe.servings?.min;
  const referenceServings = recipe.servings?.reference;
  const maxServings = recipe.servings?.max;
  if (!isFiniteNumber(referenceServings) || referenceServings <= 0) errors.push('servings.reference must be > 0.');
  if (!isFiniteNumber(minServings) || minServings <= 0) errors.push('servings.min must be > 0.');
  if (!isFiniteNumber(maxServings) || maxServings <= 0) errors.push('servings.max must be > 0.');
  if (isFiniteNumber(minServings) && isFiniteNumber(referenceServings) && minServings > referenceServings) {
    errors.push('servings.min must be <= servings.reference.');
  }
  if (isFiniteNumber(maxServings) && isFiniteNumber(referenceServings) && referenceServings > maxServings) {
    errors.push('servings.reference must be <= servings.max.');
  }

  if (recipe.timing?.activePrepMin !== undefined && (!isFiniteNumber(recipe.timing.activePrepMin) || recipe.timing.activePrepMin < 0)) {
    errors.push('timing.activePrepMin must be a non-negative number.');
  }
  if (recipe.timing?.elapsedRangeMin !== undefined && !numericRangeIsValid(recipe.timing.elapsedRangeMin)) {
    errors.push('timing.elapsedRangeMin must be a valid [min, max] range.');
  }
  if (recipe.temperature !== undefined
    && (!recipe.temperature || typeof recipe.temperature !== 'object' || Array.isArray(recipe.temperature))) {
    errors.push('temperature must be an object when provided.');
  }
  if (recipe.temperature?.enabled !== undefined && typeof recipe.temperature.enabled !== 'boolean') {
    errors.push('temperature.enabled must be boolean when provided.');
  }
  if (recipe.temperature?.defaultTargetC !== undefined
    && (!isFiniteNumber(recipe.temperature.defaultTargetC)
      || recipe.temperature.defaultTargetC < 30
      || recipe.temperature.defaultTargetC > 120)) {
    errors.push('temperature.defaultTargetC must be between 30 and 120 °C when provided.');
  }
  if (recipe.temperature?.enabled === true && !isFiniteNumber(recipe.temperature.defaultTargetC)) {
    errors.push('temperature.defaultTargetC is required when temperature tracking is enabled.');
  }
  if (recipe.temperature?.enabled === false && recipe.temperature.defaultTargetC !== undefined) {
    errors.push('temperature.defaultTargetC must be omitted when temperature tracking is disabled.');
  }

  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const components = Array.isArray(recipe.components) ? recipe.components : [];
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
      if (!Array.isArray(breakpoints) || !breakpoints.length) {
        errors.push(`Step-scaled ingredient ${ingredient.id || '?'} requires breakpoints.`);
      } else {
        let previousMax = 0;
        for (const breakpoint of breakpoints) {
          if (!isFiniteNumber(breakpoint.maxServings) || breakpoint.maxServings <= previousMax) {
            errors.push(`Step-scaled ingredient ${ingredient.id || '?'} breakpoints must have increasing positive maxServings.`);
            break;
          }
          if (!quantityIsValid(breakpoint.quantity)) {
            errors.push(`Step-scaled ingredient ${ingredient.id || '?'} has an invalid breakpoint quantity.`);
            break;
          }
          previousMax = breakpoint.maxServings;
        }
        if (isFiniteNumber(maxServings) && previousMax < maxServings) {
          errors.push(`Step-scaled ingredient ${ingredient.id || '?'} breakpoints must cover servings.max.`);
        }
      }
    }
  }

  const componentIds = new Set();
  for (const component of components) {
    if (!component.id) errors.push('Every component requires an id.');
    else if (componentIds.has(component.id)) errors.push(`Duplicate component id: ${component.id}`);
    else componentIds.add(component.id);
    if (!component.title) errors.push(`Component ${component.id || '?'} requires a title.`);
    if (!component.type || typeof component.type !== 'string') errors.push(`Component ${component.id || '?'} requires a type.`);
    if (component.ingredientIds !== undefined && !Array.isArray(component.ingredientIds)) {
      errors.push(`Component ${component.id || '?'} ingredientIds must be an array.`);
    }
    if (component.stepIds !== undefined && !Array.isArray(component.stepIds)) {
      errors.push(`Component ${component.id || '?'} stepIds must be an array.`);
    }
  }

  const equipmentIds = new Set();
  for (const equipment of recipe.equipment || []) {
    if (!equipment.id) errors.push('Every equipment item requires an id.');
    else if (equipmentIds.has(equipment.id)) errors.push(`Duplicate equipment id: ${equipment.id}`);
    else equipmentIds.add(equipment.id);
    if (!equipment.name) errors.push(`Equipment ${equipment.id || '?'} requires a name.`);
    if (equipment.optional !== undefined && typeof equipment.optional !== 'boolean') errors.push(`Equipment ${equipment.id || '?'} optional must be boolean.`);
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
    if (prep.optional !== undefined && typeof prep.optional !== 'boolean') errors.push(`advancePrep ${prep.id || '?'} optional must be boolean.`);
  }

  const stepIds = new Set();
  for (const step of steps) {
    if (!step.id) errors.push('Every step requires an id.');
    else if (stepIds.has(step.id)) errors.push(`Duplicate step id: ${step.id}`);
    else stepIds.add(step.id);

    if (!step.title) errors.push(`Step ${step.id || '?'} requires a title.`);
    if (step.component !== undefined
      && !RESERVED_STEP_COMPONENTS.has(step.component)
      && !componentIds.has(step.component)) {
      errors.push(`Step ${step.id || '?'} references missing component ${step.component}.`);
    }
    if (step.resources !== undefined && (!Array.isArray(step.resources) || step.resources.some(resource => typeof resource !== 'string' || !resource))) {
      errors.push(`Step ${step.id || '?'} resources must be an array of non-empty strings.`);
    }

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

    if (step.durationRangeMin !== undefined && !numericRangeIsValid(step.durationRangeMin)) {
      errors.push(`Invalid durationRangeMin for step ${step.id || '?'}.`);
    }
    if (step.durationRangeMin && step.durationPlanMin !== undefined) {
      const [min, max] = step.durationRangeMin;
      if (step.durationPlanMin < min || step.durationPlanMin > max) {
        errors.push(`durationPlanMin for step ${step.id || '?'} must lie inside durationRangeMin.`);
      }
    }

    for (const dependency of step.dependencies || []) {
      if (!dependency.stepId) errors.push(`Dependency in ${step.id || '?'} is missing stepId.`);
      if (!DEPENDENCY_RELATIONS.has(dependency.relation)) errors.push(`Invalid dependency relation in ${step.id || '?'}: ${dependency.relation}`);
      if (dependency.lagMin !== undefined && !isFiniteNumber(dependency.lagMin)) errors.push(`Invalid dependency lag in ${step.id || '?'}.`);
      if (dependency.planningBufferMin !== undefined && (!isFiniteNumber(dependency.planningBufferMin) || dependency.planningBufferMin < 0)) {
        errors.push(`Invalid planningBufferMin in ${step.id || '?'}.`);
      }
    }

    if (!step.completion || typeof step.completion !== 'object') {
      errors.push(`Step ${step.id || '?'} requires a completion criterion.`);
    } else {
      if (!COMPLETION_TYPES.has(step.completion.type)) errors.push(`Invalid completion type for step ${step.id || '?'}: ${step.completion.type}`);
      if (step.completion.type === 'temperature'
        && (recipe.temperature?.enabled === false || !isFiniteNumber(recipe.temperature?.defaultTargetC))) {
        errors.push(`Temperature completion for step ${step.id || '?'} requires enabled recipe temperature tracking with defaultTargetC.`);
      }
      if (!step.completion.description || typeof step.completion.description !== 'string') {
        errors.push(`Step ${step.id || '?'} completion requires a description.`);
      }
    }

    if (step.recheck !== undefined) {
      if (!step.recheck || typeof step.recheck !== 'object') errors.push(`Step ${step.id || '?'} recheck must be an object.`);
      else if (!recheckIntervalIsValid(step.recheck.notReadyMin)) errors.push(`Step ${step.id || '?'} recheck.notReadyMin must be a positive duration or range.`);
    }

    if (step.woodfire) {
      if (!(step.resources || []).includes('woodfire')) errors.push(`Step ${step.id || '?'} has Woodfire settings but does not reserve the woodfire resource.`);
      if (!step.woodfire.mode) errors.push(`Step ${step.id || '?'} is missing woodfire.mode.`);
      if (!isFiniteNumber(step.woodfire.temperatureC)) errors.push(`Step ${step.id || '?'} is missing a numeric woodfire.temperatureC.`);
      if (step.woodfire.temperatureRangeC !== undefined) {
        if (!numericRangeIsValid(step.woodfire.temperatureRangeC)) {
          errors.push(`Step ${step.id || '?'} has invalid woodfire.temperatureRangeC.`);
        } else if (isFiniteNumber(step.woodfire.temperatureC)) {
          const [min, max] = step.woodfire.temperatureRangeC;
          if (step.woodfire.temperatureC < min || step.woodfire.temperatureC > max) {
            errors.push(`Step ${step.id || '?'} woodfire.temperatureC must lie inside temperatureRangeC.`);
          }
        }
      }
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

  if (hasServeAnchor) {
    const connected = prerequisiteClosureFromAnchors(steps);
    for (const step of steps) {
      if (step.id && !connected.has(step.id)) errors.push(`Step ${step.id} is not connected to any planning anchor.`);
    }
  }

  const zeroOffsetServeAnchors = steps.filter(step => step.plan?.anchor === 'serve' && (step.plan?.anchorOffsetMin ?? 0) === 0);
  if (recipe.serviceStepId !== undefined) {
    if (typeof recipe.serviceStepId !== 'string' || !recipe.serviceStepId) {
      errors.push('serviceStepId must be a non-empty string when provided.');
    } else {
      const serviceStep = steps.find(step => step.id === recipe.serviceStepId);
      if (!serviceStep) errors.push(`serviceStepId references missing step ${recipe.serviceStepId}.`);
      else if (serviceStep.plan?.anchor !== 'serve' || (serviceStep.plan?.anchorOffsetMin ?? 0) !== 0) {
        errors.push('serviceStepId must reference a zero-offset serve anchor.');
      }
    }
  } else if (hasServeAnchor && zeroOffsetServeAnchors.length !== 1) {
    errors.push('Recipe requires exactly one zero-offset serve anchor or an explicit serviceStepId.');
  } else if (hasServeAnchor && steps.filter(step => step.plan?.anchor === 'serve').length > 1) {
    warnings.push('Recipe has multiple serve-relative anchors; consider explicit serviceStepId for clarity.');
  }

  for (const component of components) {
    for (const ingredientId of component.ingredientIds || []) {
      if (!ingredientIds.has(ingredientId)) errors.push(`Component ${component.id} references missing ingredient ${ingredientId}.`);
    }
    for (const stepId of component.stepIds || []) {
      if (!stepIds.has(stepId)) {
        errors.push(`Component ${component.id} references missing step ${stepId}.`);
        continue;
      }
      const step = steps.find(candidate => candidate.id === stepId);
      if (step?.component !== component.id) {
        errors.push(`Component ${component.id} includes step ${stepId}, but that step belongs to ${step?.component || 'no component'}.`);
      }
    }
  }

  for (const step of steps) {
    if (!step.component || RESERVED_STEP_COMPONENTS.has(step.component)) continue;
    const component = components.find(candidate => candidate.id === step.component);
    if (component && !(component.stepIds || []).includes(step.id)) {
      errors.push(`Step ${step.id} belongs to component ${step.component} but is missing from component.stepIds.`);
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
