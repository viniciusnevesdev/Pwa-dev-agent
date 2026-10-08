self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});

// Intencionalmente sem interceptar fetch.
// O Safari deve carregar o Dev Agent diretamente da rede para evitar estados de cache
// inconsistentes entre versões do frontend.
