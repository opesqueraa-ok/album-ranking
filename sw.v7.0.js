// sw.v7.0.js
const CACHE_NAME = 'albumrater-v7.0';
const CORE_ASSETS = [
  './',
  './index.html?v=7.0',
  './autofillAlbum.v7.0.js?v=7.0',
  './ui.v7.0.js?v=7.0',
  './sw-register.v7.0.js',
  './manifest.webmanifest?v=7.0',
  './favicon.png?v=7.0',
  './icons/apple-touch-icon.png?v=7.0'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(k => k.startsWith('albumrater-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      );
      // Reclamar control inmediatamente
      await self.clients.claim();
    })()
  );
});

// Estrategia: network-first para HTML, cache-first para estáticos con “v=7.0”
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Páginas HTML -> network first
  const isHTML = req.destination === 'document' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Estáticos versionados -> cache first
  if (url.searchParams.get('v') === '7.0') {
    e.respondWith(
      caches.match(req).then(c => c || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return resp;
      }))
    );
    return;
  }

  // fallback: network then cache
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
