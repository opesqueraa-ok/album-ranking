
const CACHE = 'albumrater-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
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
