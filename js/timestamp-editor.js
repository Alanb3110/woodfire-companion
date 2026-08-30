import { editStepTimestamps, loadSessionState, saveSessionState } from './session.js';

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Heure invalide.');
  return date;
}

function ensureStyles() {
  if (document.getElementById('timestampEditorStyles')) return;
  const style = document.createElement('style');
  style.id = 'timestampEditorStyles';
  style.textContent = `
    .actual-time-editor{margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:grid;gap:10px}
    .actual-time-editor-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .actual-time-editor-heading strong{font-size:.86rem;text-transform:uppercase;letter-spacing:.08em;color:var(--accent-text-soft)}
    .actual-time-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .actual-time-field{display:grid;gap:5px;font-size:.82rem;color:var(--muted)}
    .actual-time-field input{min-width:0;width:100%;border:1px solid var(--border);border-radius:12px;background:#111113;color:var(--text);padding:10px 11px;font:inherit;color-scheme:dark}
    .actual-time-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
    .actual-time-message{font-size:.82rem;color:var(--muted)}
    .actual-time-message.error{color:var(--danger)}
    @media(max-width:620px){.actual-time-fields{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function createField(labelText, value, enabled = true) {
  const label = document.createElement('label');
  label.className = 'actual-time-field';
  const text = document.createElement('span');
  text.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'datetime-local';
  input.step = '60';
  input.value = toLocalInputValue(value);
  input.disabled = !enabled;
  label.append(text, input);
  return { label, input };
}

function enhanceCard(card, state) {
  if (card.dataset.timestampEditor === '1') return;
  const stepId = card.dataset.taskId;
  if (!stepId) return;
  const startedAt = state.started?.[stepId] || null;
  const completedAt = state.completed?.[stepId] || null;
  if (!startedAt && !completedAt) return;

  const detail = card.querySelector('.task-detail');
  if (!detail) return;
  card.dataset.timestampEditor = '1';

  const editor = document.createElement('section');
  editor.className = 'actual-time-editor';

  const heading = document.createElement('div');
  heading.className = 'actual-time-editor-heading';
  const title = document.createElement('strong');
  title.textContent = 'Heures réelles';
  const hint = document.createElement('span');
  hint.className = 'actual-time-message';
  hint.textContent = 'À corriger si la validation a été faite en retard.';
  heading.append(title, hint);

  const fields = document.createElement('div');
  fields.className = 'actual-time-fields';
  const startField = createField('Début réel', startedAt, true);
  const endField = createField('Fin réelle', completedAt, Boolean(completedAt));
  fields.append(startField.label, endField.label);

  const actions = document.createElement('div');
  actions.className = 'actual-time-actions';
  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'secondary-btn';
  save.textContent = 'Enregistrer les heures';
  const message = document.createElement('span');
  message.className = 'actual-time-message';
  actions.append(save, message);

  save.addEventListener('click', () => {
    try {
      const latest = loadSessionState();
      const next = editStepTimestamps(latest, stepId, {
        startedAt: localInputToDate(startField.input.value),
        completedAt: completedAt ? localInputToDate(endField.input.value) : undefined
      });
      saveSessionState(next);
      message.classList.remove('error');
      message.textContent = 'Enregistré · recalcul du planning…';
      window.setTimeout(() => window.location.reload(), 120);
    } catch (error) {
      message.classList.add('error');
      message.textContent = error.message || 'Impossible d’enregistrer ces heures.';
    }
  });

  editor.append(heading, fields, actions);
  detail.appendChild(editor);
}

function enhanceVisibleTasks() {
  const state = loadSessionState();
  document.querySelectorAll('.task-card[data-task-id]').forEach(card => enhanceCard(card, state));
}

export function initTimestampEditor() {
  ensureStyles();
  enhanceVisibleTasks();
  const observer = new MutationObserver(() => enhanceVisibleTasks());
  const list = document.getElementById('taskList');
  if (list) observer.observe(list, { childList: true, subtree: true });
  else observer.observe(document.body, { childList: true, subtree: true });
}

initTimestampEditor();
