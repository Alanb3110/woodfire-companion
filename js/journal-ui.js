import { updateJournalFeedback } from './journal.js';

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

function renderFeedback(entry, container) {
  const section = document.createElement('section');
  section.className = 'journal-feedback';

  const heading = document.createElement('div');
  heading.className = 'journal-feedback-heading';
  const title = document.createElement('h4');
  title.textContent = 'Retour sur cette cuisson';
  const status = document.createElement('span');
  status.className = 'journal-feedback-status';
  heading.append(title, status);

  const ratingLabel = document.createElement('span');
  ratingLabel.className = 'journal-feedback-label';
  ratingLabel.textContent = 'Note du repas';

  const ratingRow = document.createElement('div');
  ratingRow.className = 'journal-rating';
  ratingRow.setAttribute('role', 'group');
  ratingRow.setAttribute('aria-label', 'Noter cette cuisson de 1 à 5');
  let selectedRating = Number.isInteger(entry.rating) ? entry.rating : null;
  const ratingButtons = [];

  function syncRatingButtons() {
    for (let index = 0; index < ratingButtons.length; index++) {
      const value = index + 1;
      const active = selectedRating !== null && value <= selectedRating;
      ratingButtons[index].classList.toggle('active', active);
      ratingButtons[index].setAttribute('aria-pressed', value === selectedRating ? 'true' : 'false');
    }
  }

  for (let value = 1; value <= 5; value++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'journal-rating-btn';
    button.textContent = '★';
    button.setAttribute('aria-label', `${value} sur 5`);
    button.addEventListener('click', () => {
      selectedRating = selectedRating === value ? null : value;
      syncRatingButtons();
      status.textContent = 'À enregistrer';
    });
    ratingButtons.push(button);
    ratingRow.appendChild(button);
  }
  syncRatingButtons();

  const notesLabel = document.createElement('label');
  notesLabel.className = 'journal-feedback-label';
  notesLabel.textContent = 'Notes pour la prochaine fois';
  const textarea = document.createElement('textarea');
  textarea.className = 'journal-notes';
  textarea.rows = 3;
  textarea.maxLength = 2000;
  textarea.placeholder = 'Ex. morceaux plus gros, moins de cuisson découverte, plus de sauce…';
  textarea.value = entry.notes || '';
  textarea.addEventListener('input', () => { status.textContent = 'À enregistrer'; });
  notesLabel.appendChild(textarea);

  const actions = document.createElement('div');
  actions.className = 'journal-feedback-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'secondary-btn';
  save.textContent = 'Enregistrer';
  save.addEventListener('click', () => {
    try {
      const updated = updateJournalFeedback(entry.id, {
        rating: selectedRating,
        notes: textarea.value
      });
      entry.rating = updated.rating;
      entry.notes = updated.notes;
      entry.feedbackUpdatedAt = updated.feedbackUpdatedAt;
      status.classList.remove('error');
      status.textContent = 'Enregistré';
    } catch (error) {
      status.classList.add('error');
      status.textContent = error.message || 'Erreur';
    }
  });
  actions.append(save, status);

  section.append(heading, ratingLabel, ratingRow, notesLabel, actions);
  container.appendChild(section);
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
  if (entry.rating) {
    const rating = document.createElement('span');
    rating.className = 'journal-summary-rating';
    rating.textContent = `★ ${entry.rating}/5`;
    copy.appendChild(rating);
  }

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
  renderFeedback(entry, body);
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
