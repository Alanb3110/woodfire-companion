import { validateRecipe } from './recipe.js';

export async function loadRecipe(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Recipe load failed (${response.status}).`);
  const recipe = await response.json();
  const validation = validateRecipe(recipe);
  if (!validation.valid) throw new Error(`Invalid recipe: ${validation.errors.join(' | ')}`);
  if (validation.warnings.length) console.info('Recipe warnings:', validation.warnings);
  return recipe;
}
