(() => {
  'use strict';

  const STORAGE_KEY = 'woodfire-companion-v1';

  const recipe = {
    id: 'pork-belly-burnt-ends',
    name: 'Pork Belly Burnt Ends',
    tasks: [
      {
        id: 'take-out-pork', offset: -330, title: 'Sortir le porc', subtitle: 'Tempérer et vérifier le rub',
        details: [
          '1,2 à 1,5 kg de poitrine de porc en cubes de ~40 mm.',
          'Rub indicatif : 18–22 g de sel, 2 c. à café de paprika fumé, 2 c. à café d’ail en poudre, 1 c. à café de poivre, 1–2 c. à soupe de cassonade.',
          'Si le rub a été appliqué la veille, ne rien ajouter : laisser simplement tempérer.'
        ]
      },
      {
        id: 'smoke', offset: -300, title: 'Début fumage', subtitle: '2 h à 2 h 30',
        mode: 'WOODFIRE · SMOKER 125 °C · SMOKE ON · PELLETS OUI',
        details: [
          'Déposer les cubes bien espacés directement sur la grille.',
          'Pas de plat et pas de panier Air Fry.',
          'Objectif : belle croûte fumée, surface brun-rouge et sèche.'
        ]
      },
      {
        id: 'covered', offset: -165, title: 'Passage en cuisson couverte', subtitle: 'Plat compact, 1 à 2 couches',
        mode: 'WOODFIRE · BAKE/ROAST 155–160 °C · SMOKE OFF',
        details: [
          'Prendre le plus petit plat permettant de garder les cubes sur 1 à 2 couches. Ils peuvent se toucher légèrement.',
          'Ajouter 2–3 c. à soupe de sauce BBQ, 1 c. à soupe de miel, 50 mL de jus de pomme et 10–15 g de beurre (facultatif).',
          'Le liquide ne doit pas noyer les cubes.',
          'Couvrir très hermétiquement avec de l’aluminium.',
          'Durée indicative : ~1 h avant le premier contrôle.'
        ]
      },
      {
        id: 'sauce', offset: -155, title: 'Préparer la sauce fraîche', subtitle: 'Puis réserver au frais',
        details: [
          '250 g de yaourt grec.',
          '60–80 g de crème fraîche.',
          'Zeste de 1 citron + 20–30 mL de jus de citron.',
          '½ c. à café d’ail en poudre.',
          '1–2 c. à soupe de ciboulette ou persil haché.',
          '½ c. à café de sel + poivre.',
          '1 c. à soupe d’huile d’olive facultative.',
          'Mélanger, goûter, ajuster, puis garder au frais. Servir à part pour conserver le croustillant des pommes de terre.'
        ]
      },
      {
        id: 'first-check', offset: -105, title: 'Premier contrôle du porc', subtitle: 'Tester la tendreté',
        details: [
          'Ouvrir rapidement et tester plusieurs cubes.',
          'S’ils sont encore fermes : refermer et poursuivre à 160 °C par tranches de 15–20 min.',
          'Ils sont prêts pour la finition lorsqu’une sonde/pique entre facilement et que le gras/collagène est très tendre.'
        ]
      },
      {
        id: 'potato-boil', offset: -80, title: 'Précuire les grenailles', subtitle: '700–800 g · 8 à 10 min',
        details: [
          'Cuire les pommes de terre grenaille dans une eau salée pendant 8–10 min après reprise de l’ébullition.',
          'Elles doivent commencer à s’attendrir sans se désagréger.'
        ]
      },
      {
        id: 'potato-prep', offset: -70, title: 'Écraser et assaisonner les pommes de terre', subtitle: 'Prêtes à passer en Air Fry',
        details: [
          'Égoutter puis laisser sécher 3–5 min.',
          'Écraser légèrement chaque pomme de terre.',
          'Ajouter 1½–2 c. à soupe d’huile, sel, paprika fumé, ail en poudre et poivre.',
          'Elles peuvent attendre ainsi pendant que le porc termine.'
        ]
      },
      {
        id: 'finish-pork', offset: -70, title: 'Finition du porc à découvert', subtitle: '20 à 30 min',
        mode: 'WOODFIRE · BAKE/ROAST 175–180 °C · SMOKE OFF',
        details: [
          'Retirer l’aluminium lorsque les cubes sont tendres.',
          'Mélanger pour bien les enrober de sauce.',
          'Caraméliser 20–30 min à découvert en remuant une fois à mi-cuisson.',
          'Objectif : extérieur collant et légèrement caramélisé, intérieur très tendre.'
        ]
      },
      {
        id: 'rest-pork', offset: -40, title: 'Sortir et laisser reposer le porc', subtitle: 'Repos pendant les pommes de terre',
        details: [
          'Sortir le plat et couvrir assez lâchement.',
          'Profiter du repos pour libérer immédiatement le Woodfire pour les pommes de terre.'
        ]
      },
      {
        id: 'airfry-potatoes', offset: -35, title: 'Pommes de terre au Woodfire', subtitle: '18 à 22 min',
        mode: 'WOODFIRE · AIR FRY 205–210 °C · SMOKE OFF · PANIER AIR FRY',
        details: [
          'Installer les grenailles dans le panier Air Fry, idéalement en couche assez aérée.',
          'Cuire 18–22 min.',
          'Secouer/remuer vers 10 min.',
          'Objectif : arêtes franchement croustillantes et cœur fondant.'
        ]
      },
      {
        id: 'potatoes-out', offset: -15, title: 'Sortir les pommes de terre', subtitle: 'Vérifier le croustillant',
        details: [
          'Goûter et corriger le sel si nécessaire.',
          'Ne pas napper de sauce avant le service : servir la sauce fraîche à part.'
        ]
      },
      {
        id: 'plate', offset: -10, title: 'Dressage', subtitle: 'Porc + grenailles + sauce à part',
        details: [
          'Burnt ends dans un plat chaud.',
          'Pommes de terre dans un plat séparé.',
          'Bol généreux de sauce fraîche à table.',
          'Option : ciboulette/persil sur les pommes de terre.'
        ]
      },
      {
        id: 'eat', offset: 0, title: 'À table', subtitle: 'Bon appétit',
        details: ['Service visé. Si nécessaire, décale les étapes restantes avec les boutons +5/+10/+15 min en haut du planning.']
      }
    ]
  };

  const defaultState = () => ({
    mealTime: '20:00',
    completed: {},
    taskShifts: {},
    temperatureTarget: 93,
    measurements: [],
    cookStartedAt: null,
    activeTab: 'planning'
  });

  let state = loadState();

  const mealTime = document.getElementById('mealTime');
  const taskList = document.getElementById('taskList');
  const nextTaskName = document.getElementById('nextTaskName');
  const nextTaskCountdown = document.getElementById('nextTaskCountdown');
  const resetChecklistBtn = document.getElementById('resetChecklistBtn');
  const temperatureInput = document.getElementById('temperatureInput');
  const addTemperatureBtn = document.getElementById('addTemperatureBtn');
  const tempValidation = document.getElementById('tempValidation');
  const targetTemperature = document.getElementById('targetTemperature');
  const lastTemperature = document.getElementById('lastTemperature');
  const lastTemperatureTime = document.getElementById('lastTemperatureTime');
  const measurementCount = document.getElementById('measurementCount');
  const chartContainer = document.getElementById('chartContainer');
  const measurementList = document.getElementById('measurementList');
  const undoMeasurementBtn = document.getElementById('undoMeasurementBtn');
  const newCookBtn = document.getElementById('newCookBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const installHelpBtn = document.getElementById('installHelpBtn');
  const installDialog = document.getElementById('installDialog');

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed };
    } catch (error) {
      console.warn('État local illisible, réinitialisation.', error);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function minutesFromTime(value) {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  }

  function taskDate(task) {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const mins = minutesFromTime(state.mealTime) + task.offset + (state.taskShifts[task.id] || 0);
    base.setMinutes(mins);
    return base;
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function formatCompletion(iso) {
    const d = new Date(iso);
    return `Fait à ${formatTime(d)}`;
  }

  function renderTasks() {
    taskList.innerHTML = '';

    recipe.tasks.forEach(task => {
      const card = document.createElement('article');
      card.className = 'task-card' + (state.completed[task.id] ? ' completed' : '');
      card.dataset.taskId = task.id;

      const main = document.createElement('div');
      main.className = 'task-main';

      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'task-check';
      check.checked = Boolean(state.completed[task.id]);
      check.setAttribute('aria-label', `Marquer ${task.title} comme terminée`);
      check.addEventListener('change', () => {
        if (check.checked) state.completed[task.id] = new Date().toISOString();
        else delete state.completed[task.id];
        saveState();
        renderTasks();
        updateNextTask();
      });

      const time = document.createElement('div');
      time.className = 'task-time';
      time.textContent = formatTime(taskDate(task));

      const title = document.createElement('div');
      title.className = 'task-title';
      const strong = document.createElement('strong');
      strong.textContent = task.title;
      const sub = document.createElement('span');
      sub.textContent = task.subtitle || '';
      title.append(strong, sub);

      const detailsBtn = document.createElement('button');
      detailsBtn.type = 'button';
      detailsBtn.className = 'task-details-btn';
      detailsBtn.textContent = '›';
      detailsBtn.setAttribute('aria-expanded', 'false');
      detailsBtn.setAttribute('aria-label', `Afficher le détail de ${task.title}`);
      detailsBtn.addEventListener('click', () => {
        const open = card.classList.toggle('open');
        detailsBtn.textContent = open ? '⌄' : '›';
        detailsBtn.setAttribute('aria-expanded', String(open));
      });

      main.append(check, time, title, detailsBtn);

      const detail = document.createElement('div');
      detail.className = 'task-detail';
      if (task.mode) {
        const mode = document.createElement('div');
        mode.className = 'mode-line';
        mode.textContent = task.mode;
        detail.appendChild(mode);
      }
      const ul = document.createElement('ul');
      task.details.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      detail.appendChild(ul);

      if (state.completed[task.id]) {
        const completion = document.createElement('div');
        completion.className = 'completion-time';
        completion.textContent = formatCompletion(state.completed[task.id]);
        detail.appendChild(completion);
      }

      card.append(main, detail);
      taskList.appendChild(card);
    });
  }

  function updateNextTask() {
    const now = new Date();
    const next = recipe.tasks.find(task => !state.completed[task.id]);

    if (!next) {
      nextTaskName.textContent = 'Checklist terminée';
      nextTaskCountdown.textContent = 'Tout est prêt.';
      return;
    }

    const when = taskDate(next);
    const deltaMin = Math.round((when - now) / 60000);
    nextTaskName.textContent = `${formatTime(when)} · ${next.title}`;

    if (deltaMin > 1) nextTaskCountdown.textContent = `Dans ${deltaMin} min`;
    else if (deltaMin >= -1) nextTaskCountdown.textContent = 'Maintenant';
    else nextTaskCountdown.textContent = `En retard de ${Math.abs(deltaMin)} min`;
  }

  function shiftRemainingTasks(minutes) {
    recipe.tasks.forEach(task => {
      if (!state.completed[task.id]) {
        state.taskShifts[task.id] = (state.taskShifts[task.id] || 0) + minutes;
      }
    });
    saveState();
    renderTasks();
    updateNextTask();
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    saveState();
    document.querySelectorAll('.tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === tabName));
    if (tabName === 'temperature') temperatureInput.focus();
  }

  function validateTemperature(raw) {
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) return { ok: false, message: 'Saisis une température.' };
    if (value < 0 || value > 150) return { ok: false, message: 'Valeur attendue entre 0 et 150 °C.' };
    return { ok: true, value: Math.round(value * 10) / 10 };
  }

  function addTemperature() {
    const validation = validateTemperature(temperatureInput.value);
    if (!validation.ok) {
      tempValidation.textContent = validation.message;
      temperatureInput.focus();
      return;
    }

    tempValidation.textContent = '';
    const now = new Date();
    if (!state.cookStartedAt) state.cookStartedAt = now.toISOString();
    state.measurements.push({ timestamp: now.toISOString(), temperature: validation.value, source: 'manual' });
    saveState();
    temperatureInput.value = '';
    renderTemperature();
    temperatureInput.focus();
  }

  function renderTemperature() {
    targetTemperature.value = state.temperatureTarget;
    const measurements = state.measurements;
    const last = measurements[measurements.length - 1];

    lastTemperature.textContent = last ? `${last.temperature.toFixed(1).replace('.0', '')} °C` : '—';
    lastTemperatureTime.textContent = last ? formatTime(new Date(last.timestamp)) : '—';
    measurementCount.textContent = `${measurements.length} mesure${measurements.length === 1 ? '' : 's'}`;

    measurementList.innerHTML = '';
    [...measurements].reverse().slice(0, 12).forEach(m => {
      const row = document.createElement('div');
      row.className = 'measurement-row';
      const left = document.createElement('span');
      left.textContent = formatTime(new Date(m.timestamp));
      const right = document.createElement('strong');
      right.textContent = `${m.temperature.toFixed(1).replace('.0', '')} °C`;
      row.append(left, right);
      measurementList.appendChild(row);
    });

    renderChart();
  }

  function renderChart() {
    const data = state.measurements;
    if (data.length === 0) {
      chartContainer.innerHTML = '<div class="empty-chart">Ajoute une température : l’heure est enregistrée automatiquement et la courbe apparaît ici.</div>';
      return;
    }

    const width = 640;
    const height = 300;
    const pad = { left: 48, right: 18, top: 18, bottom: 42 };
    const target = Number(state.temperatureTarget) || 93;
    const times = data.map(d => new Date(d.timestamp).getTime());
    const temps = data.map(d => d.temperature);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeSpan = Math.max(maxTime - minTime, 10 * 60 * 1000);
    const minTemp = Math.max(0, Math.floor(Math.min(...temps, target) / 10) * 10 - 5);
    const maxTemp = Math.min(150, Math.ceil(Math.max(...temps, target) / 10) * 10 + 5);
    const tempSpan = Math.max(maxTemp - minTemp, 10);

    const x = t => pad.left + ((t - minTime) / timeSpan) * (width - pad.left - pad.right);
    const y = temp => pad.top + (1 - (temp - minTemp) / tempSpan) * (height - pad.top - pad.bottom);

    const points = data.map(d => `${x(new Date(d.timestamp).getTime()).toFixed(1)},${y(d.temperature).toFixed(1)}`).join(' ');
    const yTicks = 5;
    const xTicks = Math.min(4, Math.max(2, data.length));

    let grid = '';
    for (let i = 0; i <= yTicks; i++) {
      const val = minTemp + (tempSpan * i / yTicks);
      const yy = y(val);
      grid += `<line x1="${pad.left}" y1="${yy}" x2="${width - pad.right}" y2="${yy}" stroke="currentColor" opacity="0.10" />`;
      grid += `<text x="${pad.left - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity="0.65">${Math.round(val)}°</text>`;
    }

    let xLabels = '';
    for (let i = 0; i < xTicks; i++) {
      const t = minTime + (timeSpan * i / (xTicks - 1));
      xLabels += `<text x="${x(t)}" y="${height - 15}" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.65">${formatTime(new Date(t))}</text>`;
    }

    const circles = data.map(d => {
      const cx = x(new Date(d.timestamp).getTime());
      const cy = y(d.temperature);
      return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--accent)" />`;
    }).join('');

    const targetY = y(target);
    chartContainer.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Évolution de la température à cœur">
        ${grid}
        <line x1="${pad.left}" y1="${targetY}" x2="${width - pad.right}" y2="${targetY}" stroke="var(--success)" stroke-width="2" stroke-dasharray="7 6" />
        <text x="${width - pad.right}" y="${Math.max(12, targetY - 6)}" text-anchor="end" font-size="11" fill="var(--success)">Cible ${target} °C</text>
        <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${circles}
        ${xLabels}
      </svg>`;
  }

  function exportCsv() {
    if (!state.measurements.length) return;
    const lines = ['timestamp,temperature_c,source'];
    state.measurements.forEach(m => lines.push(`${m.timestamp},${m.temperature},${m.source}`));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `woodfire-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  mealTime.value = state.mealTime;
  mealTime.addEventListener('change', () => {
    state.mealTime = mealTime.value || '20:00';
    saveState();
    renderTasks();
    updateNextTask();
  });

  document.querySelectorAll('.chip-btn').forEach(btn => btn.addEventListener('click', () => shiftRemainingTasks(Number(btn.dataset.shift))));
  document.querySelectorAll('.tab').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

  resetChecklistBtn.addEventListener('click', () => {
    if (!confirm('Réinitialiser toutes les cases et les décalages du planning ?')) return;
    state.completed = {};
    state.taskShifts = {};
    saveState();
    renderTasks();
    updateNextTask();
  });

  addTemperatureBtn.addEventListener('click', addTemperature);
  temperatureInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') addTemperature();
  });
  targetTemperature.addEventListener('change', () => {
    const val = Number(targetTemperature.value);
    state.temperatureTarget = Number.isFinite(val) ? Math.min(120, Math.max(30, val)) : 93;
    saveState();
    renderTemperature();
  });

  undoMeasurementBtn.addEventListener('click', () => {
    if (!state.measurements.length) return;
    state.measurements.pop();
    if (!state.measurements.length) state.cookStartedAt = null;
    saveState();
    renderTemperature();
  });

  newCookBtn.addEventListener('click', () => {
    if (!confirm('Effacer toutes les mesures de température et démarrer une nouvelle cuisson ?')) return;
    state.measurements = [];
    state.cookStartedAt = null;
    saveState();
    renderTemperature();
    temperatureInput.focus();
  });

  exportCsvBtn.addEventListener('click', exportCsv);
  installHelpBtn.addEventListener('click', () => {
    if (typeof installDialog.showModal === 'function') installDialog.showModal();
    else alert('Dans Safari : Partager → Sur l’écran d’accueil → Ajouter.');
  });

  renderTasks();
  renderTemperature();
  updateNextTask();
  switchTab(state.activeTab || 'planning');
  setInterval(updateNextTask, 30000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(console.warn));
  }
})();
