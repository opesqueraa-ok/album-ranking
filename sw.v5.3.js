// Simple cache by version
const CACHE_NAME = 'albumrater-v5.3';
const ASSETS = [
  './',
  './index.html?v=5.3',
  './autofillAlbum.v5.3.js?v=5.3',
  './sw-register.v5.3.js',
  './manifest.webmanifest?v=5.3'
];
self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS).catch(()=>{})));
});
self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  if(url.origin===location.origin){
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request)));
  }
});