const CACHE_NAME='albumrater-v6.6';
const ASSETS=[
  './',
  './index.html?v=6.6',
  './db.v6.6.js?v=6.6',
  './autofillAlbum.v6.6.js?v=6.6',
  './ui.v6.6.js?v=6.6',
  './sw-register.v6.6.js',
  './manifest.webmanifest?v=6.6'
];
self.addEventListener('install',e=>{self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener('fetch',e=>{
  const req=e.request;
  e.respondWith(
    caches.match(req).then(c=>c||fetch(req).then(resp=>{
      const copy=resp.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)); return resp;
    }).catch(()=>caches.match('./'))));
});
