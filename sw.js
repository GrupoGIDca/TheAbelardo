// ═══════════════════════════════════════════════════
//  Service Worker — The Abelardo Barber Shop v4
//  Usa paths relativos — funciona en cualquier subfolder
// ═══════════════════════════════════════════════════
var CACHE = 'abelardo-v4';

var ASSETS = [
  './index.html',
  './admin.html',
  './manifest.json',
  './manifest-admin.json',
  './icon-192.png',
  './icon-512.png',
  './icon-admin-192.png',
  './icon-admin-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.allSettled(
        ASSETS.map(function(url) {
          return c.add(url).catch(function(err) {
            console.log('Cache miss (OK):', url, err);
          });
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // API de Google — siempre red, nunca caché
  if (url.includes('script.google.com') || url.includes('googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(
          JSON.stringify({ status: 'offline', mensaje: 'Sin conexión' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Todo lo demás — caché primero, red como fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return resp;
      });
    }).catch(function() {
      // Si falla todo, intentar servir index.html cacheado
      return caches.match('./index.html');
    })
  );
});
