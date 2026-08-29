function formatDate(iso) {
  if (!iso) return 'Date inconnue';
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

function serviceDelta(entry) {
  if (!entry.targetServingAt || !entry.servedAt) return null;
  return Math.round((new Date(entry.servedAt) - new Date(entry.targetServingAt)) / 60000);
}

function serviceLabel(entry) {
  const actual = formatTime(entry.servedAt);
  const target = entry.targetServingAt ? formatTime(entry.targetServingAt) : entry.targetMealTime || '—';
  const delta = serviceDelta(entry);
  if (delta === null || delta === 0) return `Servi ${actual} · cible ${target}`;
  return `Servi ${actual} · cible ${target} · ${delta > 0 ? '+' : ''}${delta} min`;
}

function buildMetric(label, value) {
  const metric = document.createElement('div');
  metric.className = 'journal-metric';
  const caption = document.createElement('span');
  caption.textContent = label;
  const strong = document.createElement('strong');
  strong.textContent = value;
  metric.append(caption, strong);
  return metric;
}

function renderStepHistory(entry, container) {
  const title = document.createElement('h4');
  title.textContent = 'Déroulé';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'journal-step-list';
  for (const item of entry.schedule || []) {
    const row = document.createElement('div');
    row.className = 'journal-step-row';

    const copy = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.title;
    const timing = document.createElement('small');
    const baseline = formatTime(item.baselineStart);
    const final = formatTime(item.finalStart);
    timing.textContent = baseline === final ? `Prévu ${baseline}` : `Prévu ${baseline} → replanifié ${final}`;
    copy.append(name, timing);

    const actual = document.createElement('span');
    const completedAt = entry.completed?.[item.stepId];
    actual.textContent = completedAt ? `✓ ${formatTime(completedAt)}` : '—';
    row.append(copy, actual);
    list.appendChild(row);
  }
  container.appendChild(list);
}

function renderTemperatureHistory(entry, container) {
  const measurements = entry.measurements || [];
  if (!measurements.length) return;

  const title = document.createElement('h4');
  title.textContent = 'Températures';
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'journal-temperature-list';
  for (const sample of measurements.slice(-12).reverse()) {
    const row = document.createElement('div');
    const time = document.createElement('span');
    time.textContent = formatTime(sample.timestamp);
    const value = document.createElement('strong');
    value.textContent = `${Number(sample.temperature).toFixed(1).replace('.0', '')} °C`;
    row.append(time, value);
    list.appendChild(row);
  }
  if (measurements.length > 12) {
    const more = document.createElement('small');
    more.className = 'journal-more';
    more.textContent = `${measurements.length - 12} mesure(s) plus ancienne(s) conservée(s) dans le journal.`;
    list.appendChild(more);
  }
  container.appendChild(list);
}

function renderEntry(entry) {
  const card = document.createElement('details');
  card.className = 'journal-card';

  const summary = document.createElement('summary');
  const copy = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'journal-date';
  eyebrow.textContent = formatDate(entry.servedAt);
  const title = document.createElement('strong');
  title.textContent = entry.recipeTitle || entry.recipeId;
  const service = document.createElement('span');
  service.className = 'journal-service';
  service.textContent = serviceLabel(entry);
  copy.append(eyebrow, title, service);

  const chevron = document.createElement('span');
  chevron.className = 'journal-chevron';
  chevron.textContent = '›';
  summary.append(copy, chevron);

  const body = document.createElement('div');
  body.className = 'journal-body';
  const metrics = document.createElement('div');
  metrics.className = 'journal-metrics';
  const completedCount = Object.keys(entry.completed || {}).length;
  metrics.append(
    buildMetric('Personnes', String(entry.servings ?? '—')),
    buildMetric('Étapes', `${completedCount}/${entry.totalSteps || '—'}`),
    buildMetric('Mesures', String((entry.measurements || []).length))
  );
  body.appendChild(metrics);
  renderStepHistory(entry, body);
  renderTemperatureHistory(entry, body);

  card.append(summary, body);
  return card;
}

export function renderJournalEntries(entries, { container, countElement, clearButton } = {}) {
  if (!container) return;
  const list = Array.isArray(entries) ? entries : [];
  container.innerHTML = '';

  if (countElement) countElement.textContent = `${list.length} cuisson${list.length === 1 ? '' : 's'}`;
  if (clearButton) clearButton.hidden = list.length === 0;

  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'journal-empty';
    empty.textContent = 'Les repas servis apparaîtront ici automatiquement.';
    container.appendChild(empty);
    return;
  }

  for (const entry of list) container.appendChild(renderEntry(entry));
}
