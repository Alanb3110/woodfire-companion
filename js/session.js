import {
  LocalDataError,
  preservedDataError,
  readStorageItem,
  writeStorageItem
} from './storage.js';

export const SESSION_STORAGE_KEY = 'woodfire-companion-v1';
export const SESSION_SCHEMA_VERSION = 3;

export function createDefaultSessionState() {
  return {
    schemaVersion: SESSION_SCHEMA_VERSION,
    view: 'library',
    mealTime: '20:00',
    servings: 4,
    started: {},
    completed: {},
    taskShifts: {},
    observations: [],
    rechecks: {},
    temperatureTarget: 93,
    measurements: [],
    cookStartedAt: null,
    sessionId: null,
    sessionStartedAt: null,
    sessionServedAt: null,
    targetServingAt: null,
    activeTab: 'planning',
    recipeId: null,
    recipeVersion: null,
    activeRecipeUrl: null,
    recipeSnapshot: null,
    isTest: false
  };
}

function migrateV1ToV2(value) {
  return {
    ...value,
    schemaVersion: 2,
    started: value.started && typeof value.started === 'object' ? value.started : {},
    recipeSnapshot: value.recipeSnapshot && typeof value.recipeSnapshot === 'object' ? value.recipeSnapshot : null
  };
}

function migrateV2ToV3(value) {
  return {
    ...value,
    schemaVersion: 3,
    isTest: Boolean(value.isTest)
  };
}

export function migrateSessionState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createDefaultSessionState();

  const hadExplicitView = Object.prototype.hasOwnProperty.call(value, 'view');
  let migrated = { ...value };
  let version = Number.isInteger(migrated.schemaVersion) ? migrated.schemaVersion : 1;
  if (version > SESSION_SCHEMA_VERSION) {
    throw new Error(`Unsupported session schemaVersion ${version}.`);
  }

  while (version < SESSION_SCHEMA_VERSION) {
    if (version === 1) migrated = migrateV1ToV2(migrated);
    else if (version === 2) migrated = migrateV2ToV3(migrated);
    version = migrated.schemaVersion;
  }

  const defaults = createDefaultSessionState();
  const result = {
    ...defaults,
    ...migrated,
    schemaVersion: SESSION_SCHEMA_VERSION,
    started: { ...(migrated.started || {}) },
    completed: { ...(migrated.completed || {}) },
    taskShifts: { ...(migrated.taskShifts || {}) },
    observations: Array.isArray(migrated.observations) ? migrated.observations.map(item => ({ ...item })) : [],
    rechecks: { ...(migrated.rechecks || {}) },
    measurements: Array.isArray(migrated.measurements) ? migrated.measurements.map(item => ({ ...item })) : [],
    recipeSnapshot: migrated.recipeSnapshot && typeof migrated.recipeSnapshot === 'object'
      ? structuredClone(migrated.recipeSnapshot)
      : null,
    isTest: Boolean(migrated.isTest)
  };
  if (!hadExplicitView && hasSessionProgress(result)) result.view = 'cook';
  return result;
}

function decodeSessionState(raw) {
  try {
    return migrateSessionState(JSON.parse(raw));
  } catch (error) {
    throw preservedDataError(error);
  }
}

export function readSessionState(storage) {
  try {
    const raw = readStorageItem(SESSION_STORAGE_KEY, storage);
    if (!raw) return { state: createDefaultSessionState(), status: 'empty', warning: null };
    return { state: decodeSessionState(raw), status: 'ok', warning: null };
  } catch (error) {
    console.warn('État local illisible ou incompatible, réinitialisation.', error);
    const normalized = error instanceof LocalDataError ? error : preservedDataError(error);
    return {
      state: createDefaultSessionState(),
      status: normalized.code,
      warning: normalized.message,
      error: normalized
    };
  }
}

export function loadSessionState(storage) {
  return readSessionState(storage).state;
}

export function saveSessionState(state, storage) {
  const existing = readStorageItem(SESSION_STORAGE_KEY, storage);
  if (existing) decodeSessionState(existing);
  writeStorageItem(SESSION_STORAGE_KEY, JSON.stringify({
    ...state,
    schemaVersion: SESSION_SCHEMA_VERSION
  }), storage);
}

export function firstKnownSessionTimestamp(value, now = new Date()) {
  const candidates = [
    value?.sessionStartedAt,
    value?.cookStartedAt,
    ...Object.values(value?.started || {}),
    ...Object.values(value?.completed || {}),
    ...(value?.observations || []).map(item => item.timestamp)
  ].filter(Boolean).sort();
  return candidates[0] || now.toISOString();
}

export function hasSessionProgress(state) {
  return Object.keys(state?.started || {}).length > 0
    || Object.keys(state?.completed || {}).length > 0
    || (state?.measurements || []).length > 0
    || (state?.observations || []).length > 0
    || Object.keys(state?.rechecks || {}).length > 0
    || Boolean(state?.cookStartedAt)
    || Boolean(state?.sessionStartedAt && state?.recipeId);
}

export function stepLifecycle(state, stepId) {
  if (state?.completed?.[stepId]) return 'done';
  if (state?.started?.[stepId]) return 'active';
  return 'upcoming';
}

function validIso(value, fallback = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value || fallback);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid lifecycle timestamp.');
  return date.toISOString();
}

function earliestProgressTimestamp(started, completed, fallback = null) {
  const values = [...Object.values(started || {}), ...Object.values(completed || {})]
    .filter(Boolean)
    .map(value => validIso(value))
    .sort();
  return values[0] || fallback;
}

export function startStep(state, stepId, at = new Date()) {
  if (!stepId) throw new Error('startStep requires stepId.');
  if (state.completed?.[stepId]) return state;
  const timestamp = validIso(at);
  return {
    ...state,
    started: { ...(state.started || {}), [stepId]: state.started?.[stepId] || timestamp },
    cookStartedAt: state.cookStartedAt || timestamp
  };
}

export function completeStep(state, stepId, at = new Date(), { ensureStarted = true } = {}) {
  if (!stepId) throw new Error('completeStep requires stepId.');
  const timestamp = validIso(at);
  const started = { ...(state.started || {}) };
  if (ensureStarted && !started[stepId]) started[stepId] = timestamp;
  return {
    ...state,
    started,
    completed: { ...(state.completed || {}), [stepId]: timestamp },
    cookStartedAt: state.cookStartedAt || started[stepId] || timestamp
  };
}

export function editStepTimestamps(state, stepId, { startedAt, completedAt } = {}) {
  if (!stepId) throw new Error('editStepTimestamps requires stepId.');
  const started = { ...(state.started || {}) };
  const completed = { ...(state.completed || {}) };

  const nextStart = startedAt === undefined
    ? started[stepId] || null
    : startedAt === null || startedAt === ''
      ? null
      : validIso(startedAt);
  const nextEnd = completedAt === undefined
    ? completed[stepId] || null
    : completedAt === null || completedAt === ''
      ? null
      : validIso(completedAt);

  if (nextStart && nextEnd && new Date(nextEnd) < new Date(nextStart)) {
    throw new Error('La fin réelle ne peut pas précéder le début réel.');
  }

  if (nextStart) started[stepId] = nextStart;
  else delete started[stepId];
  if (nextEnd) completed[stepId] = nextEnd;
  else delete completed[stepId];

  return {
    ...state,
    started,
    completed,
    cookStartedAt: earliestProgressTimestamp(started, completed, state.cookStartedAt)
  };
}

export function resetStep(state, stepId) {
  const started = { ...(state.started || {}) };
  const completed = { ...(state.completed || {}) };
  const rechecks = { ...(state.rechecks || {}) };
  delete started[stepId];
  delete completed[stepId];
  delete rechecks[stepId];
  return { ...state, started, completed, rechecks };
}

export function resetCookProgress(state) {
  return {
    ...state,
    started: {},
    completed: {},
    taskShifts: {},
    observations: [],
    rechecks: {},
    measurements: [],
    cookStartedAt: null,
    sessionServedAt: null,
    isTest: false
  };
}

export function snapshotRecipe(recipe) {
  return recipe && typeof recipe === 'object' ? structuredClone(recipe) : null;
}
