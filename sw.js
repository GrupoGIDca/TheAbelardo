// Service Worker — The Abelardo Barber Shop Admin PWA
var CACHE = 'abelardo-admin-v1';
var ASSETS = ['./admin.html'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Red primero para el API, caché para el shell
  if (e.request.url.includes('script.google.com')) {
    e.respondWith(fetch(e.request).catch(function(){ return new Response('{"status":"offline"}'); }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        return resp;
      });
    })
  );
});
