import { scaleIngredients } from './recipe.js';

const CATEGORY_LABELS = {
  viande: 'Viande',
  'fruits-legumes': 'Fruits & légumes',
  'produits-frais': 'Produits frais',
  epicerie: 'Épicerie',
  'boissons-epicerie': 'Boissons & épicerie',
  consommables: 'Consommables'
};

const CATEGORY_ORDER = ['viande', 'fruits-legumes', 'produits-frais', 'epicerie', 'boissons-epicerie', 'consommables'];

export function buildShoppingGroups(recipe, servings) {
  const items = scaleIngredients(recipe, servings).map(ingredient => ({
    id: `ingredient:${ingredient.id}`,
    sourceId: ingredient.id,
    name: ingredient.name,
    category: ingredient.category || 'epicerie',
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    preparation: ingredient.preparation || '',
    optional: Boolean(ingredient.optional),
    type: 'ingredient'
  }));

  for (const equipment of recipe.equipment || []) {
    if (!equipment.consumable) continue;
    items.push({
      id: `equipment:${equipment.id}`,
      sourceId: equipment.id,
      name: equipment.name,
      category: 'consommables',
      displayQuantity: equipment.displayQuantity || '',
      optional: Boolean(equipment.optional),
      type: 'consumable'
    });
  }

  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, []);
    groups.get(item.category).push(item);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b, 'fr');
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .map(([id, groupItems]) => ({ id, label: CATEGORY_LABELS[id] || id, items: groupItems }));
}

export function getRequiredEquipment(recipe) {
  return (recipe.equipment || []).filter(item => !item.consumable);
}

export function getAdvancePrep(recipe) {
  return Array.isArray(recipe.advancePrep) ? recipe.advancePrep : [];
}

export function countShoppingItems(groups) {
  return groups.reduce((total, group) => total + group.items.length, 0);
}
