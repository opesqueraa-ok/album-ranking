// Service Worker v7.0 — cachea sólo los assets v7
const CACHE_NAME = 'albumrater-v7.0';
const ASSETS = [
  './',
  './index.html?v=7.0',
  './autofillAlbum.v7.0.js?v=7.0',
  './ui.v7.0.js?v=7.0',
  './sw-register.v7.0.js',
  './manifest.webmanifest?v=7.0',
  './icons/apple-touch-icon.png?v=7.0',
  './favicon.png?v=7.0',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => caches.match('./index.html?v=7.0'));
    })
  );
});
