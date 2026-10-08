const CACHE = 'dev-agent-v10';
const ASSETS = ['./','./index.html','./styles.css?v=6','./visuals-v6.css?v=1','./activity-preview-v8.css?v=1','./app-v6.js?v=1','./cost-sync-v7.js?v=1','./visual-approval-guard-v7.js?v=2','./activity-preview-v8.js?v=2','./manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).then(response => {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
  );
});
