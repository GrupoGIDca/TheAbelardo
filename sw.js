// ═══════════════════════════════════════════════════
//  Service Worker — The Abelardo Barber Shop
//  Maneja caché para página pública Y admin PWA
// ═══════════════════════════════════════════════════
var CACHE_NAME = 'abelardo-v3';
var CACHE_ADMIN = 'abelardo-admin-v3';

var ASSETS_PUBLIC = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

var ASSETS_ADMIN = [
  './admin.html',
  './manifest-admin.json',
  './icon-admin-192.png',
  './icon-admin-512.png'
];

// ── Install: cachear todos los assets ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(function(c) { return c.addAll(ASSETS_PUBLIC); }),
      caches.open(CACHE_ADMIN).then(function(c) { return c.addAll(ASSETS_ADMIN); })
    ])
  );
  self.skipWaiting();
});

// ── Activate: limpiar caches viejos ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== CACHE_NAME && k !== CACHE_ADMIN;
        }).map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: red primero para API, caché para shell ──
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // API calls — siempre red, nunca caché
  if (url.includes('script.google.com') || url.includes('googleapis.com')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return new Response(JSON.stringify({ status:'offline', mensaje:'Sin conexión' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Google Fonts — caché primero
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, copy); });
          return resp;
        });
      })
    );
    return;
  }

  // Shell HTML y assets — caché con actualización en background
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      var fetchPromise = fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var copy = resp.clone();
          var cacheName = url.includes('admin') ? CACHE_ADMIN : CACHE_NAME;
          caches.open(cacheName).then(function(c) { c.put(e.request, copy); });
        }
        return resp;
      });
      return cached || fetchPromise;
    })
  );
});
