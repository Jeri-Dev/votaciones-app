// Service worker de la PWA (solo en el sitio publicado, p. ej. Netlify).
//
// Reglas:
//  - Solo maneja peticiones GET del MISMO origen. Las llamadas a Apps Script (script.google.com)
//    nunca pasan por aquí: votos, estados y resultados siempre van en vivo a Google.
//  - Navegación (index.html): red primero, caché solo si no hay conexión. Así cada apertura con
//    internet trae la versión más reciente, y sin internet la app igual abre (y reintenta sola).
//  - Iconos y manifiesto: caché primero.

const CACHE = 'votacion-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Apps Script y cualquier otro origen: sin tocar.

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || Response.error())),
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
