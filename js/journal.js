export const JOURNAL_KEY = 'woodfire-companion-journal-v1';
export const JOURNAL_SCHEMA_VERSION = 1;

function safeIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function defaultData() {
  return { schemaVersion: JOURNAL_SCHEMA_VERSION, entries: [] };
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
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { schemaVersion: JOURNAL_SCHEMA_VERSION, entries: parsed };
    if (parsed?.schemaVersion === JOURNAL_SCHEMA_VERSION && Array.isArray(parsed.entries)) return parsed;
    return defaultData();
  } catch (error) {
    console.warn('Journal local illisible, retour à un journal vide.', error);
    return defaultData();
  }
}

export function saveJournal(data, storage = globalThis.localStorage) {
  if (!storage) return;
  storage.setItem(JOURNAL_KEY, JSON.stringify({
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    entries: Array.isArray(data?.entries) ? data.entries : []
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
    ...Object.values(state.completed || {})
  ]
    .map(value => safeIso(value))
    .filter(Boolean)
    .sort();
  return candidates[0] || fallback;
}

export function buildJournalEntry({ state, recipe, schedule, now = new Date() }) {
  if (!state?.sessionId) throw new Error('A sessionId is required to archive a cook.');
  if (!recipe) throw new Error('A recipe is required to archive a cook.');

  const serveStep = recipe.steps.find(step => step.plan?.anchor === 'serve');
  if (!serveStep) throw new Error('The recipe has no serve anchor.');
  const servedAt = safeIso(state.completed?.[serveStep.id]);
  if (!servedAt) throw new Error('The serve step must be completed before archiving.');

  const updatedAt = now.toISOString();
  const completed = { ...(state.completed || {}) };
  const measurements = (state.measurements || []).map(sample => ({ ...sample }));

  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION,
    id: state.sessionId,
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    recipeTitle: recipe.title,
    servings: state.servings,
    targetMealTime: state.mealTime,
    targetServingAt: safeIso(state.targetServingAt),
    sessionStartedAt: earliestTimestamp(state, servedAt),
    servedAt,
    updatedAt,
    temperatureTarget: state.temperatureTarget,
    measurements,
    completed,
    taskShifts: { ...(state.taskShifts || {}) },
    totalSteps: recipe.steps.length,
    schedule: serializeSchedule(schedule)
  };
}

export function upsertJournalEntry(entry, storage = globalThis.localStorage) {
  const data = loadJournal(storage);
  const index = data.entries.findIndex(item => item.id === entry.id);
  if (index >= 0) data.entries[index] = { ...data.entries[index], ...entry };
  else data.entries.push(entry);
  data.entries.sort((a, b) => new Date(b.servedAt || b.updatedAt) - new Date(a.servedAt || a.updatedAt));
  saveJournal(data, storage);
  return data;
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
