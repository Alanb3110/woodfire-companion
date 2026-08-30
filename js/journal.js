export const JOURNAL_KEY = 'woodfire-companion-journal-v1';
export const JOURNAL_SCHEMA_VERSION = 2;

function safeIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 5) return null;
  return number;
}

function normalizeNotes(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, 2000);
}

function normalizeEntry(entry) {
  return {
    ...entry,
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    rating: normalizeRating(entry?.rating),
    notes: normalizeNotes(entry?.notes),
    feedbackUpdatedAt: safeIso(entry?.feedbackUpdatedAt)
  };
}

function defaultData() {
  return { schemaVersion: JOURNAL_SCHEMA_VERSION, entries: [] };
}

function migrateJournalData(parsed) {
  if (Array.isArray(parsed)) {
    return { schemaVersion: JOURNAL_SCHEMA_VERSION, entries: parsed.map(normalizeEntry) };
  }
  if (!parsed || !Array.isArray(parsed.entries)) return defaultData();
  if (parsed.schemaVersion > JOURNAL_SCHEMA_VERSION) return defaultData();
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    entries: parsed.entries.map(normalizeEntry)
  };
}

export function createSessionId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '');
  const random = Math.random().toString(36).slice(2, 8);
  return `cook-${stamp}-${random}`;
}

export function loadJournal(storage = globalThis.localStorage) {
  if (!storage) return defaultData();
  try {
    const raw = storage.getItem(JOURNAL_KEY);
    if (!raw) return defaultData();
    return migrateJournalData(JSON.parse(raw));
  } catch (error) {
    console.warn('Journal local illisible, retour à un journal vide.', error);
    return defaultData();
  }
}

export function saveJournal(data, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(JOURNAL_KEY, JSON.stringify({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    entries: Array.isArray(data?.entries) ? data.entries.map(normalizeEntry) : []
  }));
}

function serializeSchedule(schedule) {
  return (schedule || []).map(item => ({
    stepId: item.step.id,
    title: item.step.title,
    component: item.step.component || null,
    baselineStart: safeIso(item.baselineStart || item.start),
    baselineEnd: safeIso(item.baselineEnd || item.end),
    finalStart: safeIso(item.start),
    finalEnd: safeIso(item.end)
  }));
}

function earliestTimestamp(state, fallback) {
  const candidates = [
    state.sessionStartedAt,
    state.cookStartedAt,
    ...Object.values(state.started || {}),
    ...Object.values(state.completed || {})
  ]
    .map(value => safeIso(value))
    .filter(Boolean)
    .sort();
  return candidates[0] || fallback;
}

export function resolveServiceStep(recipe) {
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];

  if (recipe?.serviceStepId) {
    const explicit = steps.find(step => step.id === recipe.serviceStepId);
    if (!explicit) throw new Error(`serviceStepId references missing step ${recipe.serviceStepId}.`);
    return explicit;
  }

  const zeroOffsetServeAnchors = steps.filter(step =>
    step.plan?.anchor === 'serve' && (step.plan?.anchorOffsetMin ?? 0) === 0
  );

  if (zeroOffsetServeAnchors.length === 1) return zeroOffsetServeAnchors[0];
  if (!zeroOffsetServeAnchors.length) {
    throw new Error('Recipe requires serviceStepId or exactly one zero-offset serve anchor.');
  }
  throw new Error('Recipe has multiple zero-offset serve anchors; define serviceStepId explicitly.');
}

export function buildJournalEntry({ state, recipe, schedule, now = new Date() }) {
  if (!state?.sessionId) throw new Error('A sessionId is required to archive a cook.');
  if (!recipe) throw new Error('A recipe is required to archive a cook.');

  const serviceStep = resolveServiceStep(recipe);
  const servedAt = safeIso(state.completed?.[serviceStep.id]);
  if (!servedAt) throw new Error(`Service step ${serviceStep.id} must be completed before archiving.`);

  const updatedAt = now.toISOString();
  const started = { ...(state.started || {}) };
  const completed = { ...(state.completed || {}) };
  const measurements = (state.measurements || []).map(sample => ({ ...sample }));
  const observations = (state.observations || []).map(observation => ({ ...observation }));

  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    id: state.sessionId,
    isTest: Boolean(state.isTest),
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    recipeTitle: recipe.title,
    serviceStepId: serviceStep.id,
    servings: state.servings,
    targetMealTime: state.mealTime,
    targetServingAt: safeIso(state.targetServingAt),
    sessionStartedAt: earliestTimestamp(state, servedAt),
    servedAt,
    updatedAt,
    temperatureTarget: state.temperatureTarget,
    measurements,
    observations,
    started,
    completed,
    taskShifts: { ...(state.taskShifts || {}) },
    totalSteps: recipe.steps.length,
    schedule: serializeSchedule(schedule)
  };
}

export function upsertJournalEntry(entry, storage = globalThis.localStorage) {
  if (entry?.isTest) return loadJournal(storage);
  const data = loadJournal(storage);
  const hasRating = Object.prototype.hasOwnProperty.call(entry || {}, 'rating');
  const hasNotes = Object.prototype.hasOwnProperty.call(entry || {}, 'notes');
  const hasFeedbackUpdatedAt = Object.prototype.hasOwnProperty.call(entry || {}, 'feedbackUpdatedAt');
  const normalized = normalizeEntry(entry);
  const index = data.entries.findIndex(item => item.id === normalized.id);

  if (index >= 0) {
    const existing = data.entries[index];
    data.entries[index] = normalizeEntry({
      ...existing,
      ...normalized,
      rating: hasRating ? normalized.rating : existing.rating,
      notes: hasNotes ? normalized.notes : existing.notes,
      feedbackUpdatedAt: hasFeedbackUpdatedAt ? normalized.feedbackUpdatedAt : existing.feedbackUpdatedAt
    });
  } else {
    data.entries.push(normalized);
  }

  data.entries.sort((a, b) => new Date(b.servedAt || b.updatedAt) - new Date(a.servedAt || a.updatedAt));
  saveJournal(data, storage);
  return data;
}

export function updateJournalFeedback(id, { rating = null, notes = '' } = {}, storage = globalThis.localStorage, now = new Date()) {
  if (!id) throw new Error('Journal feedback requires an entry id.');
  const normalizedRating = rating === null || rating === '' ? null : Number(rating);
  if (normalizedRating !== null && (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5)) {
    throw new Error('La note doit être comprise entre 1 et 5.');
  }
  const normalizedNotes = normalizeNotes(notes);
  const data = loadJournal(storage);
  const index = data.entries.findIndex(item => item.id === id);
  if (index < 0) throw new Error('Cuisson introuvable dans le journal.');
  data.entries[index] = normalizeEntry({
    ...data.entries[index],
    rating: normalizedRating,
    notes: normalizedNotes,
    feedbackUpdatedAt: now.toISOString()
  });
  saveJournal(data, storage);
  return data.entries[index];
}

export function removeJournalEntry(id, storage = globalThis.localStorage) {
  const data = loadJournal(storage);
  data.entries = data.entries.filter(item => item.id !== id);
  saveJournal(data, storage);
  return data;
}

export function clearJournal(storage = globalThis.localStorage) {
  const data = defaultData();
  saveJournal(data, storage);
  return data;
}
