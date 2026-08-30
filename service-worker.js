const APP_VERSION = '0.3.0-dev.10';
const CACHE_REVISION = 'ios-recipe-detail-hotfix-1';
const CACHE_NAME = `woodfire-companion-${APP_VERSION}-${CACHE_REVISION}`;
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './prep.css',
  './journal.css',
  './observations.css',
  './app.js',
  './js/planner.js',
  './js/meal-planner.js',
  './js/recipe.js',
  './js/recipe-loader.js',
  './js/library.js',
  './js/recipe-hero.js',
  './js/settings.js',
  './js/shopping.js',
  './js/prep-ui.js',
  './js/journal.js',
  './js/journal-ui.js',
  './js/observations.js',
  './js/session.js',
  './js/timestamp-editor.js',
  './js/dev-tools.js',
  './js/start-hint.js',
  './js/temperature.js',
  './js/temperature-ui.js',
  './recipes/index.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

async function cacheAvailableRecipeContent(cache) {
  const response = await fetch('./recipes/index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Recipe manifest preload failed (${response.status}).`);

  const library = await response.json();
  const contentUrls = (library.recipes || [])
    .filter(entry => entry.status === 'available' && entry.recipeUrl)
    .flatMap(entry => [entry.recipeUrl, entry.visual?.imageUrl].filter(Boolean));
  const uniqueUrls = [...new Set(contentUrls)];

  if (uniqueUrls.length) await cache.addAll(uniqueUrls);
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    await cacheAvailableRecipeContent(cache);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
  );
});
