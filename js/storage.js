export const STORAGE_MESSAGES = Object.freeze({
  unavailable: 'Le stockage local est indisponible. Les changements ne seront pas conservés après rechargement.',
  quota: 'Le stockage local est plein. Exporte le journal puis libère de l’espace avant de continuer.',
  preserved: 'Des données locales illisibles ou créées par une version plus récente ont été conservées. Aucun nouvel enregistrement ne les a remplacées.'
});

export class LocalDataError extends Error {
  constructor(message, { code = 'storage-error', cause } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'LocalDataError';
    this.code = code;
  }
}

function quotaExceeded(error) {
  return error?.name === 'QuotaExceededError'
    || error?.code === 22
    || error?.code === 1014;
}

export function storageError(error) {
  if (error instanceof LocalDataError) return error;
  if (quotaExceeded(error)) {
    return new LocalDataError(STORAGE_MESSAGES.quota, { code: 'quota', cause: error });
  }
  return new LocalDataError(STORAGE_MESSAGES.unavailable, { code: 'unavailable', cause: error });
}

export function preservedDataError(error) {
  return new LocalDataError(STORAGE_MESSAGES.preserved, { code: 'preserved', cause: error });
}

export function resolveStorage(storage) {
  if (storage !== undefined) {
    if (!storage) throw new LocalDataError(STORAGE_MESSAGES.unavailable, { code: 'unavailable' });
    return storage;
  }

  try {
    const target = globalThis.localStorage;
    if (!target) throw new Error('localStorage is not available.');
    return target;
  } catch (error) {
    throw storageError(error);
  }
}

export function readStorageItem(key, storage) {
  try {
    return resolveStorage(storage).getItem(key);
  } catch (error) {
    throw storageError(error);
  }
}

export function writeStorageItem(key, value, storage) {
  try {
    resolveStorage(storage).setItem(key, value);
  } catch (error) {
    throw storageError(error);
  }
}
