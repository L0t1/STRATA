// Simple service worker for offline support
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  // Cache-first for static assets
  if (event.request.method === 'GET' && event.request.destination !== '') {
    event.respondWith(
      caches.open('iwms-static').then(cache =>
        cache.match(event.request).then(resp =>
          resp || fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
        )
      )
    );
  }
});
