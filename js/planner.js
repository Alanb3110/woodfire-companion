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

export function buildSchedule(recipe, mealTime, referenceDate = new Date(), taskShifts = {}) {
  const anchor = mealAnchorDate(mealTime, referenceDate);
  return recipe.steps
    .map(step => {
      const offset = step.plan?.preferredStartOffsetMin;
      if (!isFiniteNumber(offset)) throw new Error(`Step ${step.id} is missing preferredStartOffsetMin.`);
      const shift = isFiniteNumber(taskShifts[step.id]) ? taskShifts[step.id] : 0;
      const start = new Date(anchor.getTime() + (offset + shift) * 60000);
      const end = new Date(start.getTime() + plannedDurationMin(step) * 60000);
      return { step, start, end, shiftMin: shift };
    })
    .sort((a, b) => a.start - b.start || recipe.steps.indexOf(a.step) - recipe.steps.indexOf(b.step));
}

export function scheduleMap(schedule) {
  return Object.fromEntries(schedule.map(item => [item.step.id, item]));
}

export function findDependencyIssues(recipe, schedule) {
  const byId = scheduleMap(schedule);
  const issues = [];

  for (const item of schedule) {
    for (const dependency of item.step.dependencies || []) {
      const dependencyItem = byId[dependency.stepId];
      if (!dependencyItem) continue;
      const lagMs = (dependency.lagMin || 0) * 60000;
      const threshold = dependency.relation === 'after_start'
        ? dependencyItem.start.getTime() + lagMs
        : dependencyItem.end.getTime() + lagMs;
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
