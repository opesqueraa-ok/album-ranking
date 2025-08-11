
const VERSION = '4.0';
const CACHE = 'albumrater-' + VERSION;
const ASSETS = [
  './',
  './index.html?v=' + VERSION,
  './manifest.webmanifest?v=' + VERSION,
  './sw.js?v=' + VERSION,
  './icons/icon-192.png?v=' + VERSION,
  './icons/icon-512.png?v=' + VERSION,
  './icons/apple-touch-icon.png?v=' + VERSION,
  './favicon.png?v=' + VERSION
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(net => {
      if(e.request.method==='GET' && net && net.status===200){
        const clone = net.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return net;
    }).catch(() => caches.match('./index.html')))
  );
});
