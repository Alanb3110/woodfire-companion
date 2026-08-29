const APP_VERSION = '0.3.0-dev.3';
const CACHE_NAME = `woodfire-companion-${APP_VERSION}`;
const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './prep.css',
  './app.js',
  './js/planner.js',
  './js/recipe.js',
  './js/recipe-loader.js',
  './js/library.js',
  './js/settings.js',
  './js/shopping.js',
  './js/prep-ui.js',
  './recipes/index.json',
  './recipes/pork-belly-burnt-ends.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)));
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
    fetch(event.request)
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
