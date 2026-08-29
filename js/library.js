const VALID_STATUSES = new Set(['available', 'coming_soon']);

export function validateLibrary(library) {
  const errors = [];
  if (!library || typeof library !== 'object') return { valid: false, errors: ['Library must be an object.'] };
  if (library.schemaVersion !== 1) errors.push('Library schemaVersion must be 1.');
  if (!Array.isArray(library.recipes) || !library.recipes.length) errors.push('Library requires at least one recipe entry.');

  const ids = new Set();
  for (const entry of library.recipes || []) {
    if (!entry.id) errors.push('Every library entry requires an id.');
    else if (ids.has(entry.id)) errors.push(`Duplicate library recipe id: ${entry.id}`);
    else ids.add(entry.id);
    if (!entry.title) errors.push(`Library entry ${entry.id || '?'} requires a title.`);
    if (!VALID_STATUSES.has(entry.status)) errors.push(`Invalid status for ${entry.id || '?'}.`);
    if (entry.status === 'available' && !entry.recipeUrl) errors.push(`Available recipe ${entry.id || '?'} requires recipeUrl.`);
  }

  return { valid: errors.length === 0, errors };
}

export async function loadLibrary(url = './recipes/index.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Recipe library load failed (${response.status}).`);
  const library = await response.json();
  const validation = validateLibrary(library);
  if (!validation.valid) throw new Error(`Invalid recipe library: ${validation.errors.join(' | ')}`);
  return library;
}

export function findLibraryRecipe(library, recipeId) {
  return library.recipes.find(entry => entry.id === recipeId) || null;
}
