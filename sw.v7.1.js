// sw.v7.1.js
const CACHE_NAME = 'albumrater-v7.1';
const CORE_ASSETS = [
  './',
  './index.html?v=7.1',
  './ui.v7.1.js?v=7.1',
  './sw-register.v7.1.js',
  './manifest.webmanifest?v=7.1',
  './favicon.png?v=7.1',
  './icons/apple-touch-icon.png?v=7.1'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) =>
      c.addAll(CORE_ASSETS).catch(() => {})
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('albumrater-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Estrategia:
//  - HTML: network-first (para ver cambios inmediatos)
//  - Archivos con query ?v=...: cache-first (versionados)
//  - Resto: network, y si falla usa cache
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  const isHTML =
    req.destination === 'document' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cualquier recurso versionado (?v=...)
  if (url.searchParams.has('v')) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return resp;
          })
      )
    );
    return;
  }

  // Fallback genérico
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
```0
