function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function toDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function recheckBounds(step) {
  const value = step?.recheck?.notReadyMin;
  if (isFiniteNumber(value) && value > 0) return [value, value];
  if (Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]) && value[0] > 0 && value[1] >= value[0]) {
    return value;
  }
  return null;
}

function temperatureTarget(step, recipe) {
  const fromRecipe = recipe?.temperature?.defaultTargetC;
  if (isFiniteNumber(fromRecipe)) return fromRecipe;
  const match = /(\d+(?:[.,]\d+)?)\s*°\s*C/i.exec(step?.completion?.description || '');
  return match ? Number(match[1].replace(',', '.')) : null;
}

export function getObservationOptions(step, recipe = null) {
  const bounds = recheckBounds(step);
  if (!bounds) return [];
  const [soonest, latest] = bounds;
  const almostDelay = Math.max(1, Math.min(soonest, Math.round(latest / 2)));

  if (step?.completion?.type === 'tenderness') {
    return [
      { id: 'still-firm', label: 'Encore ferme', outcome: 'recheck', delayMin: latest },
      { id: 'almost-ready', label: 'Presque prêt', outcome: 'recheck', delayMin: almostDelay },
      { id: 'tender', label: 'Très tendre', outcome: 'complete' }
    ];
  }

  const target = temperatureTarget(step, recipe);
  if (target !== null && ['temperature', 'combined'].includes(step?.completion?.type)) {
    const displayTarget = Number.isInteger(target) ? String(target) : String(target).replace('.', ',');
    return [
      { id: 'below-target', label: `Sous ${displayTarget} °C`, outcome: 'recheck', delayMin: latest },
      { id: 'near-target', label: `Presque ${displayTarget} °C`, outcome: 'recheck', delayMin: soonest },
      { id: 'target-reached', label: `${displayTarget} °C atteint`, outcome: 'complete' }
    ];
  }

  return [
    { id: 'not-ready', label: 'Pas prêt', outcome: 'recheck', delayMin: latest },
    { id: 'almost-ready', label: 'Presque prêt', outcome: 'recheck', delayMin: almostDelay },
    { id: 'ready', label: 'Prêt', outcome: 'complete' }
  ];
}

export function hasObservationControls(step, recipe = null) {
  return getObservationOptions(step, recipe).length > 0;
}

export function resolveObservationDelayMin(step, option) {
  if (isFiniteNumber(option?.delayMin) && option.delayMin > 0) return option.delayMin;
  const bounds = recheckBounds(step);
  return bounds ? bounds[0] : null;
}

export function applyObservation({ observations = [], rechecks = {}, completed = {} }, step, option, now = new Date()) {
  if (!step?.id) throw new Error('Observation requires a step id.');
  if (!option?.id || !option?.label) throw new Error('Observation option requires id and label.');
  if (!['recheck', 'complete'].includes(option.outcome)) throw new Error(`Unsupported observation outcome: ${option.outcome}`);

  const at = toDate(now);
  if (!at) throw new Error('Observation timestamp is invalid.');

  const nextObservations = [...observations];
  const nextRechecks = { ...rechecks };
  const nextCompleted = { ...completed };
  let recheckDueAt = null;

  if (option.outcome === 'recheck') {
    const delayMin = resolveObservationDelayMin(step, option);
    if (!delayMin) throw new Error(`Observation ${option.id} requires a positive recheck delay.`);
    recheckDueAt = new Date(at.getTime() + delayMin * 60000).toISOString();
    nextRechecks[step.id] = recheckDueAt;
    delete nextCompleted[step.id];
  } else {
    nextCompleted[step.id] = at.toISOString();
    delete nextRechecks[step.id];
  }

  const record = {
    stepId: step.id,
    observationId: option.id,
    label: option.label,
    outcome: option.outcome,
    timestamp: at.toISOString(),
    recheckDueAt
  };
  nextObservations.push(record);

  return {
    observations: nextObservations,
    rechecks: nextRechecks,
    completed: nextCompleted,
    record
  };
}

export function latestObservationForStep(observations = [], stepId) {
  for (let index = observations.length - 1; index >= 0; index--) {
    if (observations[index]?.stepId === stepId) return observations[index];
  }
  return null;
}

export function editLatestObservationTimestamp({ observations = [], rechecks = {}, started = {}, completed = {} }, stepId, at) {
  if (!stepId) throw new Error('Observation timestamp edit requires a step id.');
  const nextAt = toDate(at);
  if (!nextAt) throw new Error('Heure de contrôle invalide.');

  const index = observations.map(item => item?.stepId).lastIndexOf(stepId);
  if (index < 0) throw new Error('Aucune observation à corriger pour cette étape.');

  const nextObservations = observations.map(item => ({ ...item }));
  const nextRechecks = { ...rechecks };
  const nextStarted = { ...started };
  const nextCompleted = { ...completed };
  const current = nextObservations[index];
  const previousAt = toDate(current.timestamp);
  if (!previousAt) throw new Error('L’heure enregistrée du contrôle est invalide.');
  const deltaMs = nextAt.getTime() - previousAt.getTime();
  const previousTimestamp = previousAt.toISOString();

  current.timestamp = nextAt.toISOString();

  if (current.recheckDueAt) {
    const previousDue = toDate(current.recheckDueAt);
    if (!previousDue) throw new Error('L’heure de recontrôle enregistrée est invalide.');
    const shiftedDue = new Date(previousDue.getTime() + deltaMs).toISOString();
    if (nextRechecks[stepId] === current.recheckDueAt) nextRechecks[stepId] = shiftedDue;
    current.recheckDueAt = shiftedDue;
  }

  if (nextStarted[stepId] === previousTimestamp) nextStarted[stepId] = nextAt.toISOString();
  if (current.outcome === 'complete' && nextCompleted[stepId] === previousTimestamp) {
    nextCompleted[stepId] = nextAt.toISOString();
  }

  return {
    observations: nextObservations,
    rechecks: nextRechecks,
    started: nextStarted,
    completed: nextCompleted,
    record: current
  };
}

export function clearPendingRecheck(rechecks = {}, stepId) {
  const next = { ...rechecks };
  delete next[stepId];
  return next;
}

export function pendingRecheckDate(rechecks = {}, stepId) {
  const value = rechecks?.[stepId];
  if (!value) return null;
  return toDate(value);
}

export function observationsForStep(observations = [], stepId) {
  return observations.filter(item => item.stepId === stepId);
}
