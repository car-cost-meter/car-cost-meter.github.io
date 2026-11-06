// Dev service worker — same as sw.template.js with a fixed dev cache name.
// In production the deploy workflow generates sw.js with the build hash.
const CACHE_NAME = 'app-cache-dev';

self.addEventListener('fetch', (event) => {
  event.respondWith(handleFetch(event));
});

// Network-first: a good response is served and cached in the background;
// offline, the cache answers — with the /app/ shell as fallback for SPA
// deep links (/app/veh/<id>, /app/calc render that same document).
async function handleFetch(event) {
  try {
    const networkResponse = await fetch(event.request);
    // Navigations answered by 404.html carry the app shell — cache them
    // under their own URL so deep links keep working offline.
    // Cross-origin payloads (fuel-prices Gist) are NOT cached here: the
    // domain manages them in its own cache with a same-day freshness rule.
    if (new URL(event.request.url).origin === self.location.origin
        && (networkResponse?.status === 200
            || (event.request.mode === 'navigate' && networkResponse?.status === 404))) {
      event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()))
      );
    }
    return networkResponse;
  } catch {
    // ignoreSearch only for same-origin assets — for the fuel-prices API
    // the query carries coordinates/radius, so an exact match is required
    // (serving another location's prices silently would be worse than
    // the view's error+retry state).
    const sameOrigin = new URL(event.request.url).origin === self.location.origin;
    const cached = await caches.match(event.request, { ignoreSearch: sameOrigin });
    return cached
      ?? (sameOrigin && event.request.mode === 'navigate'
        ? caches.match('/app/', { ignoreSearch: true }) : undefined);
  }
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});
