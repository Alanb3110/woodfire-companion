function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function minutesFromTime(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) throw new Error(`Invalid time: ${value}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error(`Invalid time: ${value}`);
  return hours * 60 + minutes;
}

export function mealAnchorDate(mealTime, referenceDate = new Date()) {
  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0, 0);
  base.setMinutes(minutesFromTime(mealTime));
  return base;
}

export function plannedDurationMin(step) {
  if (isFiniteNumber(step.durationPlanMin)) return step.durationPlanMin;
  if (isFiniteNumber(step.durationMin)) return step.durationMin;
  if (Array.isArray(step.durationRangeMin)) return step.durationRangeMin[1];
  return 0;
}

function topoOrder(recipe) {
  const steps = recipe.steps || [];
  const byId = new Map(steps.map(step => [step.id, step]));
  const indegree = new Map(steps.map(step => [step.id, 0]));
  const outgoing = new Map(steps.map(step => [step.id, []]));

  for (const step of steps) {
    for (const dependency of step.dependencies || []) {
      if (!byId.has(dependency.stepId)) throw new Error(`Step ${step.id} depends on missing step ${dependency.stepId}.`);
      indegree.set(step.id, indegree.get(step.id) + 1);
      outgoing.get(dependency.stepId).push(step.id);
    }
  }

  const index = new Map(steps.map((step, i) => [step.id, i]));
  const queue = steps.filter(step => indegree.get(step.id) === 0).map(step => step.id);
  queue.sort((a, b) => index.get(a) - index.get(b));

  const result = [];
  while (queue.length) {
    const id = queue.shift();
    result.push(byId.get(id));
    for (const next of outgoing.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
        queue.sort((a, b) => index.get(a) - index.get(b));
      }
    }
  }

  if (result.length !== steps.length) throw new Error('Recipe dependency graph contains a cycle.');
  return result;
}

function planningGapMin(dependency, includePlanningBuffer = true) {
  const lag = isFiniteNumber(dependency.lagMin) ? dependency.lagMin : 0;
  const buffer = includePlanningBuffer && isFiniteNumber(dependency.planningBufferMin)
    ? dependency.planningBufferMin
    : 0;
  return lag + buffer;
}

function predecessorLatestStartMs(successorStartMs, predecessorStep, dependency, includePlanningBuffer = true) {
  const gapMs = planningGapMin(dependency, includePlanningBuffer) * 60000;
  if (dependency.relation === 'after_start') return successorStartMs - gapMs;
  return successorStartMs - gapMs - plannedDurationMin(predecessorStep) * 60000;
}

function dependencyThresholdMs(predecessorItem, dependency, includePlanningBuffer = false) {
  const gapMs = planningGapMin(dependency, includePlanningBuffer) * 60000;
  return dependency.relation === 'after_start'
    ? predecessorItem.start.getTime() + gapMs
    : predecessorItem.end.getTime() + gapMs;
}

function anchorStartMs(step, anchor) {
  if (step.plan?.anchor !== 'serve') return null;
  const offset = isFiniteNumber(step.plan?.anchorOffsetMin) ? step.plan.anchorOffsetMin : 0;
  return anchor.getTime() + offset * 60000;
}

function legacyPreferredStartMs(step, anchor) {
  const offset = step.plan?.preferredStartOffsetMin;
  return isFiniteNumber(offset) ? anchor.getTime() + offset * 60000 : null;
}

function setEarlierWithAncestors(recipe, starts, sourceStepId, targetStartMs, includePlanningBuffer = true) {
  const byId = new Map(recipe.steps.map(step => [step.id, step]));
  const queue = [[sourceStepId, targetStartMs]];
  let changed = false;

  while (queue.length) {
    const [id, requestedStart] = queue.shift();
    const current = starts.get(id);
    if (isFiniteNumber(current) && current <= requestedStart) continue;
    starts.set(id, requestedStart);
    changed = true;

    const step = byId.get(id);
    for (const dependency of step.dependencies || []) {
      const predecessor = byId.get(dependency.stepId);
      const predecessorStart = predecessorLatestStartMs(requestedStart, predecessor, dependency, includePlanningBuffer);
      queue.push([predecessor.id, predecessorStart]);
    }
  }
  return changed;
}

function buildBaselineStarts(recipe, anchor) {
  const ordered = topoOrder(recipe);
  const starts = new Map();

  for (const step of ordered) {
    const anchored = anchorStartMs(step, anchor);
    if (anchored !== null) starts.set(step.id, anchored);
  }

  if (!starts.size) {
    // Compatibility path for older recipes that only contain fixed offsets.
    for (const step of ordered) {
      const preferred = legacyPreferredStartMs(step, anchor);
      if (preferred === null) throw new Error(`Step ${step.id} is not connected to a serving anchor and has no migration timing hint.`);
      starts.set(step.id, preferred);
    }
    return starts;
  }

  for (const step of [...ordered].reverse()) {
    const successorStart = starts.get(step.id);
    if (!isFiniteNumber(successorStart)) continue;
    for (const dependency of step.dependencies || []) {
      const predecessor = recipe.steps.find(candidate => candidate.id === dependency.stepId);
      const candidate = predecessorLatestStartMs(successorStart, predecessor, dependency, true);
      setEarlierWithAncestors(recipe, starts, predecessor.id, candidate, true);
    }
  }

  // V1 migration: old preferred offsets are soft "not later than" hints only.
  // They preserve known buffers/parallel placement while recipe data moves toward
  // explicit planningBuffer/window semantics.
  for (const step of ordered) {
    const preferred = legacyPreferredStartMs(step, anchor);
    if (preferred === null) continue;
    const current = starts.get(step.id);
    if (!isFiniteNumber(current) || preferred < current) {
      setEarlierWithAncestors(recipe, starts, step.id, preferred, true);
    }
  }

  // Tasks explicitly marked "earliest" are pulled to the earliest feasible point
  // after their predecessors, without moving already anchored descendants.
  const byId = new Map(recipe.steps.map(step => [step.id, step]));
  for (const step of ordered) {
    if (step.plan?.placement !== 'earliest' || !(step.dependencies || []).length) continue;
    let earliest = -Infinity;
    let ready = true;
    for (const dependency of step.dependencies) {
      const predecessorStart = starts.get(dependency.stepId);
      if (!isFiniteNumber(predecessorStart)) {
        ready = false;
        break;
      }
      const predecessor = byId.get(dependency.stepId);
      const predecessorEnd = predecessorStart + plannedDurationMin(predecessor) * 60000;
      const threshold = (dependency.relation === 'after_start' ? predecessorStart : predecessorEnd)
        + planningGapMin(dependency, true) * 60000;
      earliest = Math.max(earliest, threshold);
    }
    const current = starts.get(step.id);
    if (ready && isFiniteNumber(current) && earliest <= current) starts.set(step.id, earliest);
  }

  const unresolved = ordered.filter(step => !isFiniteNumber(starts.get(step.id)));
  if (unresolved.length) {
    throw new Error(`Steps not connected to a serving anchor: ${unresolved.map(step => step.id).join(', ')}`);
  }

  return starts;
}

function itemsFromStarts(recipe, starts) {
  return recipe.steps.map(step => {
    const start = new Date(starts.get(step.id));
    const end = new Date(start.getTime() + plannedDurationMin(step) * 60000);
    return { step, start, end, shiftMin: 0 };
  });
}

function shiftItem(item, deltaMs) {
  item.start = new Date(item.start.getTime() + deltaMs);
  item.end = new Date(item.end.getTime() + deltaMs);
}

function pullItemEarlierWithAncestors(recipe, byId, sourceStepId, targetStartMs) {
  const stepById = new Map(recipe.steps.map(step => [step.id, step]));
  const queue = [[sourceStepId, targetStartMs]];

  while (queue.length) {
    const [id, requestedStart] = queue.shift();
    const item = byId.get(id);
    if (item.start.getTime() <= requestedStart) continue;
    const delta = requestedStart - item.start.getTime();
    shiftItem(item, delta);

    for (const dependency of item.step.dependencies || []) {
      const predecessor = stepById.get(dependency.stepId);
      const predecessorTarget = predecessorLatestStartMs(item.start.getTime(), predecessor, dependency, true);
      queue.push([predecessor.id, predecessorTarget]);
    }
  }
}

function resolveBaselineResourceConflicts(recipe, items) {
  const byId = new Map(items.map(item => [item.step.id, item]));
  const maxIterations = Math.max(8, recipe.steps.length * 4);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;
    const reservations = items
      .filter(item => (item.step.resources || []).includes('woodfire') && item.end > item.start)
      .sort((a, b) => a.start - b.start || recipe.steps.indexOf(a.step) - recipe.steps.indexOf(b.step));

    for (let i = 1; i < reservations.length; i++) {
      const earlier = reservations[i - 1];
      const later = reservations[i];
      if (earlier.end <= later.start) continue;
      if (earlier.step.plan?.anchor) {
        throw new Error(`Anchored Woodfire step ${earlier.step.id} conflicts with ${later.step.id}.`);
      }
      const target = later.start.getTime() - plannedDurationMin(earlier.step) * 60000;
      pullItemEarlierWithAncestors(recipe, byId, earlier.step.id, target);
      changed = true;
      break;
    }

    if (!changed) return;
  }

  throw new Error('Planner could not resolve baseline Woodfire resource conflicts.');
}

function freezeBaseline(items) {
  for (const item of items) {
    item.baselineStart = new Date(item.start);
    item.baselineEnd = new Date(item.end);
  }
}

function enforceRuntimeConstraints(recipe, items, completed = {}) {
  const byId = new Map(items.map(item => [item.step.id, item]));
  const ordered = topoOrder(recipe);
  const maxIterations = Math.max(8, recipe.steps.length * 4);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;

    for (const step of ordered) {
      const item = byId.get(step.id);
      if (completed[step.id]) continue;
      for (const dependency of step.dependencies || []) {
        const predecessor = byId.get(dependency.stepId);
        const threshold = dependencyThresholdMs(predecessor, dependency, false);
        if (item.start.getTime() < threshold) {
          shiftItem(item, threshold - item.start.getTime());
          changed = true;
        }
      }
    }

    const reservations = items
      .filter(item => (item.step.resources || []).includes('woodfire') && item.end > item.start)
      .sort((a, b) => a.start - b.start || recipe.steps.indexOf(a.step) - recipe.steps.indexOf(b.step));

    for (let i = 1; i < reservations.length; i++) {
      const previous = reservations[i - 1];
      const current = reservations[i];
      if (current.start >= previous.end) continue;
      if (completed[current.step.id] && completed[previous.step.id]) continue;

      if (!completed[current.step.id]) {
        shiftItem(current, previous.end.getTime() - current.start.getTime());
        changed = true;
      }
    }

    if (!changed) return;
  }

  throw new Error('Planner could not resolve runtime dependency/resource constraints.');
}

export function buildSchedule(recipe, mealTime, referenceDate = new Date(), taskShifts = {}, options = {}) {
  const anchor = mealAnchorDate(mealTime, referenceDate);
  const starts = buildBaselineStarts(recipe, anchor);
  const items = itemsFromStarts(recipe, starts);
  resolveBaselineResourceConflicts(recipe, items);
  freezeBaseline(items);

  const actualCompletionTimes = options.actualCompletionTimes || {};
  for (const item of items) {
    const shift = isFiniteNumber(taskShifts[item.step.id]) ? taskShifts[item.step.id] : 0;
    if (shift) shiftItem(item, shift * 60000);
    item.shiftMin = shift;

    const completion = actualCompletionTimes[item.step.id];
    if (completion) {
      const actualEnd = new Date(completion);
      if (!Number.isNaN(actualEnd.getTime())) item.end = actualEnd;
    }
  }

  enforceRuntimeConstraints(recipe, items, actualCompletionTimes);

  return items.sort((a, b) => a.start - b.start || recipe.steps.indexOf(a.step) - recipe.steps.indexOf(b.step));
}

export function scheduleMap(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

export function findDependencyIssues(recipe, schedule, { includePlanningBuffer = false } = {}) {
  const byId = scheduleMap(schedule);
  const issues = [];

  for (const item of schedule) {
    for (const dependency of item.step.dependencies || []) {
      const dependencyItem = byId[dependency.stepId];
      if (!dependencyItem) continue;
      const threshold = dependencyThresholdMs(dependencyItem, dependency, includePlanningBuffer);
      if (item.start.getTime() < threshold) {
        issues.push({
          stepId: item.step.id,
          dependencyStepId: dependency.stepId,
          relation: dependency.relation,
          violationMin: Math.ceil((threshold - item.start.getTime()) / 60000)
        });
      }
    }
  }
  return issues;
}

export function findResourceConflicts(schedule, resource = 'woodfire') {
  const reservations = schedule.filter(item => (item.step.resources || []).includes(resource) && item.end > item.start);
  const conflicts = [];
  for (let i = 0; i < reservations.length; i++) {
    for (let j = i + 1; j < reservations.length; j++) {
      const a = reservations[i];
      const b = reservations[j];
      if (a.start < b.end && b.start < a.end) conflicts.push({ resource, stepIds: [a.step.id, b.step.id] });
    }
  }
  return conflicts;
}

export function getDependentStepIds(recipe, sourceStepId, { includeSource = true } = {}) {
  const dependents = new Map(recipe.steps.map(step => [step.id, []]));
  for (const step of recipe.steps) {
    for (const dependency of step.dependencies || []) {
      if (dependents.has(dependency.stepId)) dependents.get(dependency.stepId).push(step.id);
    }
  }

  const result = new Set(includeSource ? [sourceStepId] : []);
  const queue = [sourceStepId];
  while (queue.length) {
    const current = queue.shift();
    for (const next of dependents.get(current) || []) {
      if (result.has(next)) continue;
      result.add(next);
      queue.push(next);
    }
  }
  return [...result];
}

export function addStepDelay(taskShifts, sourceStepId, minutes) {
  const next = { ...taskShifts };
  next[sourceStepId] = (next[sourceStepId] || 0) + minutes;
  return next;
}

// Kept temporarily for compatibility with the current active-cook UI.
// The next UI increment should delay one observed step and let buildSchedule()
// propagate only constraints that actually need to move.
export function shiftDependentTasks(recipe, taskShifts, completed, sourceStepId, minutes) {
  const next = { ...taskShifts };
  const ids = getDependentStepIds(recipe, sourceStepId);
  for (const id of ids) {
    if (completed[id]) continue;
    next[id] = (next[id] || 0) + minutes;
  }
  return next;
}

export function getNextScheduledTask(schedule, completed) {
  return schedule.find(item => !completed[item.step.id]) || null;
}
