import { buildShoppingGroups, countShoppingItems, getAdvancePrep, getRequiredEquipment } from './shopping.js';

const SHOPPING_KEY = 'woodfire-companion-shopping-v1';
const $ = id => document.getElementById(id);

function loadShoppingState() {
  try {
    return JSON.parse(localStorage.getItem(SHOPPING_KEY) || '{}');
  } catch (error) {
    console.warn('Liste de courses locale illisible, réinitialisation.', error);
    return {};
  }
}

function saveShoppingState(state) {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(state));
}

function checkedFor(recipeId) {
  const state = loadShoppingState();
  return state[recipeId] || {};
}

function setChecked(recipeId, itemId, checked) {
  const state = loadShoppingState();
  state[recipeId] ||= {};
  if (checked) state[recipeId][itemId] = true;
  else delete state[recipeId][itemId];
  saveShoppingState(state);
}

function resetRecipeShopping(recipeId) {
  const state = loadShoppingState();
  delete state[recipeId];
  saveShoppingState(state);
}

function updateProgress(recipeId, groups) {
  const progress = $('shoppingProgress');
  if (!progress) return;
  const checked = checkedFor(recipeId);
  const total = countShoppingItems(groups);
  const done = groups.flatMap(group => group.items).filter(item => checked[item.id]).length;
  progress.textContent = `${done}/${total}`;
}

function renderShopping(recipe, servings, formatQuantity) {
  const container = $('shoppingList');
  const resetButton = $('resetShoppingBtn');
  if (!container) return;

  const groups = buildShoppingGroups(recipe, servings);
  const checked = checkedFor(recipe.id);
  container.innerHTML = '';

  for (const group of groups) {
    const section = document.createElement('section');
    section.className = 'shopping-group';
    const heading = document.createElement('h3');
    heading.textContent = group.label;
    section.appendChild(heading);

    for (const item of group.items) {
      const label = document.createElement('label');
      label.className = `shopping-row${checked[item.id] ? ' checked' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(checked[item.id]);
      checkbox.setAttribute('aria-label', `Cocher ${item.name}`);

      const copy = document.createElement('span');
      copy.className = 'shopping-copy';
      const name = document.createElement('strong');
      name.textContent = item.optional ? `${item.name} · option` : item.name;
      copy.appendChild(name);
      if (item.preparation) {
        const note = document.createElement('small');
        note.textContent = item.preparation;
        copy.appendChild(note);
      }

      const quantity = document.createElement('span');
      quantity.className = 'shopping-quantity';
      quantity.textContent = item.type === 'ingredient' ? formatQuantity(item) : item.displayQuantity;

      checkbox.addEventListener('change', () => {
        setChecked(recipe.id, item.id, checkbox.checked);
        label.classList.toggle('checked', checkbox.checked);
        updateProgress(recipe.id, groups);
      });

      label.append(checkbox, copy, quantity);
      section.appendChild(label);
    }
    container.appendChild(section);
  }

  updateProgress(recipe.id, groups);
  if (resetButton) {
    resetButton.onclick = () => {
      resetRecipeShopping(recipe.id);
      renderShopping(recipe, servings, formatQuantity);
    };
  }
}

function renderEquipment(recipe) {
  const container = $('equipmentList');
  if (!container) return;
  container.innerHTML = '';
  for (const item of getRequiredEquipment(recipe)) {
    const row = document.createElement('div');
    row.className = 'equipment-row';
    const mark = document.createElement('span');
    mark.textContent = item.optional ? '○' : '✓';
    const name = document.createElement('span');
    name.textContent = item.optional ? `${item.name} · optionnel` : item.name;
    row.append(mark, name);
    container.appendChild(row);
  }
}

function renderAdvancePrep(recipe) {
  const container = $('advancePrepList');
  if (!container) return;
  const items = getAdvancePrep(recipe);
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="empty-prep">Pas de préparation anticipée particulière.</p>';
    return;
  }

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'advance-prep-card';
    const timing = document.createElement('span');
    timing.className = 'prep-timing';
    timing.textContent = item.timing || 'À préparer en avance';
    const title = document.createElement('strong');
    title.textContent = item.optional ? `${item.title} · option` : item.title;
    const details = document.createElement('p');
    details.textContent = item.details || '';
    card.append(timing, title, details);
    container.appendChild(card);
  }
}

export function renderPreCook(recipe, servings, formatQuantity) {
  if (!recipe) return;
  renderShopping(recipe, servings, formatQuantity);
  renderEquipment(recipe);
  renderAdvancePrep(recipe);
}
