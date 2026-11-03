// ============================================================
// SIPENA — sw.js (Service Worker PWA — gas-pwa-github)
// Strategi:
// 1. Network-Only (Bypass) untuk semua panggilan API Google Apps Script & Google OAuth
// 2. Stale-While-Revalidate untuk App Shell (HTML, CSS, JS, Ikon, Font) agar buka 0ms
// ============================================================

const CACHE_NAME = 'sipena-pwa-v1.3.0';

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './config.js',
  './js/ui.js',
  './js/logic.js',
  './js/api.js',
  './js/views-auth.js',
  './js/views-main.js',
  './js/views-data.js',
  './js/views-laporan.js',
  './js/views-admin.js',
  './js/app.js',
  './manifest.json',
  './assets/logo.png',
  './assets/favicon.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  const url = req.url || '';

  // ATURAN 1: Abaikan semua request selain GET
  if (req.method !== 'GET') return;

  // ATURAN 2: JANGAN PERNAH meng-cache endpoint API GAS, Google OAuth, atau layanan dinamis eksternal
  if (
    url.indexOf('script.google.com') >= 0 ||
    url.indexOf('googleusercontent.com') >= 0 ||
    url.indexOf('accounts.google.com') >= 0 ||
    url.indexOf('oauth2.googleapis.com') >= 0 ||
    url.indexOf('api.qrserver.com') >= 0 ||
    url.indexOf('chrome-extension://') === 0
  ) {
    return;
  }

  // ATURAN 3: Stale-While-Revalidate untuk App Shell & Aset Statis
  event.respondWith(
    caches.match(req).then(function (cachedResp) {
      const fetchPromise = fetch(req)
        .then(function (netResp) {
          if (netResp && netResp.status === 200 && (netResp.type === 'basic' || netResp.type === 'cors')) {
            const copy = netResp.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, copy);
            });
          }
          return netResp;
        })
        .catch(function () {
          // Jika offline saat navigasi halaman, kembalikan index.html dari cache
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResp;
        });

      return cachedResp || fetchPromise;
    })
  );
});

