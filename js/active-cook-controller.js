import {
  buildJournalEntry,
  removeJournalEntry,
  resolveServiceStep,
  upsertJournalEntry
} from './journal.js';
import { buildMealSchedule } from './meal-planner.js';
import {
  addStepDelay,
  findDependencyIssues,
  findResourceConflicts,
  getNextScheduledTask,
  plannedDurationMin
} from './planner.js';
import {
  applyObservation,
  clearPendingRecheck,
  pendingRecheckDate
} from './observations.js';
import {
  completeStep,
  resetStep,
  startStep,
  stepLifecycle
} from './session.js';

const DEFAULT_JOURNAL_OPS = {
  buildJournalEntry,
  removeJournalEntry,
  resolveServiceStep,
  upsertJournalEntry
};

export function createActiveCookController({
  getRecipe,
  getState,
  setState,
  saveState,
  journalOps = DEFAULT_JOURNAL_OPS,
  now = () => new Date()
}) {
  let schedule = [];

  function recomputeSchedule() {
    const recipe = getRecipe();
    if (!recipe) {
      schedule = [];
      return schedule;
    }

    const state = getState();
    schedule = buildMealSchedule(recipe, {
      servings: state.servings,
      targetServingAt: state.targetServingAt,
      taskShifts: state.taskShifts,
      actualStartTimes: state.started,
      actualCompletionTimes: state.completed,
      expectedCompletionTimes: state.rechecks
    });

    const dependencyIssues = findDependencyIssues(recipe, schedule);
    const woodfireConflicts = findResourceConflicts(schedule, 'woodfire');
    if (dependencyIssues.length) console.warn('Planning dependency issues:', dependencyIssues);
    if (woodfireConflicts.length) console.warn('Planning Woodfire conflicts:', woodfireConflicts);
    return schedule;
  }

  function getSchedule() {
    return schedule;
  }

  function syncJournal() {
    const recipe = getRecipe();
    const state = getState();
    if (!recipe || !state.sessionId) return;

    let serve = null;
    try {
      serve = journalOps.resolveServiceStep(recipe);
    } catch (error) {
      console.warn('Service step resolution failed:', error);
    }

    const servedAt = serve ? state.completed?.[serve.id] : null;
    if (!servedAt) {
      state.sessionServedAt = null;
      journalOps.removeJournalEntry(state.sessionId);
      saveState();
      return;
    }

    state.sessionServedAt = servedAt;
    journalOps.upsertJournalEntry(journalOps.buildJournalEntry({ state, recipe, schedule }));
    saveState();
  }

  function refresh() {
    recomputeSchedule();
    syncJournal();
    return schedule;
  }

  function commit(nextState, { sync = true } = {}) {
    setState(nextState);
    saveState();
    recomputeSchedule();
    if (sync) syncJournal();
    return getState();
  }

  function applyStepObservation(step, option, at = now()) {
    let state = getState();
    if (!state.started[step.id]) state = startStep(state, step.id, at);

    const result = applyObservation({
      observations: state.observations,
      rechecks: state.rechecks,
      completed: state.completed
    }, step, option, at);

    state = {
      ...state,
      observations: result.observations,
      rechecks: result.rechecks,
      completed: result.completed,
      cookStartedAt: state.cookStartedAt || result.record.timestamp
    };
    commit(state);
    return result.record;
  }

  function toggleStep(step, at = now()) {
    let state = getState();
    const lifecycle = stepLifecycle(state, step.id);

    if (lifecycle === 'done') {
      state = resetStep(state, step.id);
    } else if (lifecycle === 'active') {
      state = completeStep(state, step.id, at);
      state = { ...state, rechecks: clearPendingRecheck(state.rechecks, step.id) };
    } else if (plannedDurationMin(step) > 0) {
      state = startStep(state, step.id, at);
    } else {
      state = completeStep(state, step.id, at);
      state = { ...state, rechecks: clearPendingRecheck(state.rechecks, step.id) };
    }

    commit(state);
    return stepLifecycle(getState(), step.id);
  }

  function delayNext(minutes) {
    const state = getState();
    const nextTask = getNextScheduledTask(schedule, state.completed, state.rechecks, state.started);
    if (!nextTask) return false;

    const pending = pendingRecheckDate(state.rechecks, nextTask.step.id);
    let nextState;
    if (pending) {
      nextState = {
        ...state,
        rechecks: {
          ...state.rechecks,
          [nextTask.step.id]: new Date(pending.getTime() + minutes * 60000).toISOString()
        }
      };
    } else {
      nextState = {
        ...state,
        taskShifts: addStepDelay(state.taskShifts, nextTask.step.id, minutes)
      };
    }

    commit(nextState, { sync: false });
    return true;
  }

  function resetPlanning() {
    const state = getState();
    commit({
      ...state,
      started: {},
      completed: {},
      taskShifts: {},
      observations: [],
      rechecks: {},
      sessionServedAt: null
    });
  }

  return {
    applyStepObservation,
    delayNext,
    getSchedule,
    recomputeSchedule,
    refresh,
    resetPlanning,
    syncJournal,
    toggleStep
  };
}
