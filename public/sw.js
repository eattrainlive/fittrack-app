/// <reference lib="webworker" />

const CACHE_VERSION = 'fittrack-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Assets that never change (hashed by Vite) — cache-first.
const IMMUTABLE_PATTERN = /^https?:\/\/.*\/assets\/.*\.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|gif)$/;
// Navigations (HTML) — network-first so we always get the latest shell.
const NAVIGATE_PATTERN = /(\.html$|\/$)/;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Don't cache cross-origin requests (e.g. Supabase API, Google Fonts).
  if (url.origin !== self.location.origin) return;

  // Don't cache API/auth calls.
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/functions/')) {
    return;
  }

  // Immutable hashed assets → cache-first.
  if (IMMUTABLE_PATTERN.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const fetched = await fetch(request);
        if (fetched.ok) cache.put(request, fetched.clone());
        return fetched;
      })
    );
    return;
  }

  // Navigations (HTML pages) → network-first with cache fallback.
  if (request.mode === 'navigate' || NAVIGATE_PATTERN.test(url.pathname)) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Ultimate fallback — try cached index.html.
          const fallback = await caches.match('/index.html');
          return fallback || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Other same-origin GET requests → stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(request);
      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);
      return cached || networkFetch || new Response('Offline', { status: 503 });
    })()
  );
});
