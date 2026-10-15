// Keep the guide available offline. Change this version whenever app files change.
const CACHE_PREFIX = 'shoulder-guide-';
const CACHE = CACHE_PREFIX + 'v5';
const ASSETS = ['./', './index.html', './guide.js', './model.js', './guide.css', './routine.js', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];
const SCOPE = new URL(self.registration.scope);
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, SCOPE).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE && (key.startsWith(CACHE_PREFIX) || /^shoulder-v\d+$/.test(key)))
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  // Cache only this guide's known files, never other sites or app data.
  url.search = '';
  url.hash = '';
  if (!ASSET_URLS.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Fresh HTML and scripts take priority when reopening the guide online.
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        // A full or unavailable cache must not hide a working online response.
        try { await cache.put(url.href, response.clone()); } catch (error) {}
        return response;
      }
      return (await cache.match(url.href)) || response;
    } catch (error) {
      const saved = await cache.match(url.href);
      if (saved) return saved;
      if (request.mode === 'navigate') {
        const home = await cache.match(new URL('./index.html', SCOPE).href);
        if (home) return home;
      }
      return Response.error();
    }
  })());
});
