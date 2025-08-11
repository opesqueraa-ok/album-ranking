// Album Rater v3.1 Service Worker
const VERSION = '3.1';
const CACHE_NAME = 'albumrater-cache-' + VERSION;
const ASSETS = [
  '/', '/index.html', '/manifest.webmanifest',
  '/sw.js', '/favicon.png', '/favicon-32.png', '/favicon.ico'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.map(k => k.startsWith('albumrater-cache-') && k !== CACHE_NAME ? caches.delete(k) : null)
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(res => res || fetch(e.request))
    );
  }
});
