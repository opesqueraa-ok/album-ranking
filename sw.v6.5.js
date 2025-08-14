const CACHE_NAME='albumrater-v6.5';
const ASSETS=['./','./index.html?v=6.5','./autofillAlbum.v6.5.js?v=6.5','./ui.v6.5.js?v=6.5','./exportGlass.v6.5.js?v=6.5','./sw-register.v6.5.js','./manifest.webmanifest?v=6.5'];
self.addEventListener('install',e=>{self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim();});
self.addEventListener('fetch',e=>{const req=e.request; e.respondWith(caches.match(req).then(c=>c||fetch(req).then(resp=>{const copy=resp.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)); return resp;}).catch(()=>caches.match('./'))));});