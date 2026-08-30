const SETTINGS_KEY = 'woodfire-companion-settings-v1';
const DEFAULT_ACCENT = '#F97316';

const $ = id => document.getElementById(id);
const root = document.documentElement;
const settingsBtn = $('settingsBtn');
const settingsDialog = $('settingsDialog');
const accentColorInput = $('accentColorInput');
const accentHexInput = $('accentHexInput');
const accentRedInput = $('accentRedInput');
const accentGreenInput = $('accentGreenInput');
const accentBlueInput = $('accentBlueInput');
const accentPreview = $('accentPreview');
const resetAccentBtn = $('resetAccentBtn');
const accentValidation = $('accentValidation');

function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  let hex = value.trim().toUpperCase();
  if (!hex.startsWith('#')) hex = `#${hex}`;
  if (/^#[0-9A-F]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16)
  };
}

function rgbToHex(r, g, b) {
  const values = [r, g, b].map(value => Number(value));
  if (values.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  return `#${values.map(value => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { accent: normalizeHex(parsed.accent) || DEFAULT_ACCENT };
  } catch (error) {
    console.warn('Préférences visuelles illisibles, retour aux valeurs par défaut.', error);
    return { accent: DEFAULT_ACCENT };
  }
}

function saveAccent(hex) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ accent: hex }));
}

function applyAccent(hex, persist = true) {
  const normalized = normalizeHex(hex);
  if (!normalized) return false;
  root.style.setProperty('--accent', normalized);
  if (persist) saveAccent(normalized);
  return true;
}

function syncControls(hex) {
  const normalized = normalizeHex(hex) || DEFAULT_ACCENT;
  const rgb = hexToRgb(normalized);
  accentColorInput.value = normalized.toLowerCase();
  accentHexInput.value = normalized;
  accentRedInput.value = rgb.r;
  accentGreenInput.value = rgb.g;
  accentBlueInput.value = rgb.b;
  accentPreview.style.background = normalized;
  accentPreview.textContent = normalized;
  accentValidation.textContent = '';

  document.querySelectorAll('[data-accent]').forEach(button => {
    button.classList.toggle('active', normalizeHex(button.dataset.accent) === normalized);
  });
}

function setAccent(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    accentValidation.textContent = 'HEX attendu : #RRGGBB (ex. #3B82F6).';
    return;
  }
  applyAccent(normalized);
  syncControls(normalized);
}

function setAccentFromRgb() {
  const hex = rgbToHex(accentRedInput.value, accentGreenInput.value, accentBlueInput.value);
  if (!hex) {
    accentValidation.textContent = 'Chaque valeur RGB doit être un entier entre 0 et 255.';
    return;
  }
  setAccent(hex);
}

const initialSettings = loadSettings();
applyAccent(initialSettings.accent, false);

if (settingsBtn && settingsDialog) {
  syncControls(initialSettings.accent);

  settingsBtn.addEventListener('click', () => {
    syncControls(loadSettings().accent);
    if (typeof settingsDialog.showModal === 'function') settingsDialog.showModal();
  });

  document.querySelectorAll('[data-accent]').forEach(button => {
    button.addEventListener('click', () => setAccent(button.dataset.accent));
  });

  accentColorInput.addEventListener('input', () => setAccent(accentColorInput.value));
  accentHexInput.addEventListener('change', () => setAccent(accentHexInput.value));
  accentHexInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      setAccent(accentHexInput.value);
    }
  });

  [accentRedInput, accentGreenInput, accentBlueInput].forEach(input => {
    input.addEventListener('change', setAccentFromRgb);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        setAccentFromRgb();
      }
    });
  });

  resetAccentBtn.addEventListener('click', () => setAccent(DEFAULT_ACCENT));
}

import('./timestamp-editor.js').catch(error => console.warn('Éditeur d’heures indisponible.', error));
if (document.querySelector('.dev-badge')?.textContent?.trim().startsWith('DEV')) {
  import('./dev-tools.js').catch(error => console.warn('Outils DEV indisponibles.', error));
}
