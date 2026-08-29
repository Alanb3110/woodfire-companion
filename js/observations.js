function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function toDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getObservationOptions(step) {
  return Array.isArray(step?.recheck?.observations) ? step.recheck.observations : [];
}

export function hasObservationControls(step) {
  return getObservationOptions(step).length > 0;
}

export function resolveObservationDelayMin(step, option) {
  if (isFiniteNumber(option?.delayMin) && option.delayMin > 0) return option.delayMin;
  const fallback = step?.recheck?.notReadyMin;
  if (isFiniteNumber(fallback) && fallback > 0) return fallback;
  if (Array.isArray(fallback) && fallback.length === 2 && isFiniteNumber(fallback[0]) && fallback[0] > 0) return fallback[0];
  return null;
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
