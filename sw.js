const CACHE_NAME = 'notas-magicas-cache-v1';

// On install, pre-cache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache the bare minimum for the app shell to work offline.
        // Other assets will be cached on demand by the fetch handler.
        return cache.addAll([
          '/',
          '/index.html'
        ]);
      })
  );
});

// On fetch, use a cache-first strategy.
self.addEventListener('fetch', (event) => {
  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Do not cache requests to the Gemini API.
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return; // Let the browser handle it, which will fail if offline.
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // If we found a match in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from the network.
        return fetch(event.request).then((networkResponse) => {
          // If the request was successful, clone the response, cache it, and return it.
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return networkResponse;
        });
      })
      .catch(error => {
        // This catch handles errors from both caches.match and fetch.
        // If fetch fails (e.g., offline) and there's no cache match, 
        // the promise will reject, and the browser will show its offline page.
        console.log('Fetch failed:', error);
        // Rethrow the error to allow the browser to handle the network failure.
        throw error;
      })
  );
});

// On activate, clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
