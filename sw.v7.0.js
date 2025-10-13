const CACHE_NAME = 'albumrater-v7.0';

const ASSETS = [
  './',
  './index.html?v=7.0',
  './autofillAlbum.v6.5.js?v=7.0',
  './ui.v6.5.js?v=7.0',
  './sw-register.v7.0.js',
  './manifest.webmanifest?v=7.0',
  './favicon.png?v=7.0',
  './icons/apple-touch-icon.png?v=7.0'
  // Si aún usas exportGlass:
  // './exportGlass.v6.5.js?v=7.0'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  e.respondWith(
    caches.match(req).then(
      (c) =>
        c ||
        fetch(req)
          .then((resp) => {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return resp;
          })
          .catch(() => caches.match('./'))
    )
  );
});
