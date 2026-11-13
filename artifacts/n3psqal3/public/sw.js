const STATIC_CACHE = "n3psqal3-static-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Never cache API or auth traffic — always hit the network.
  if (url.pathname.startsWith("/api")) {
    return;
  }

  // Cache-first for immutable hashed build assets only.
  // (Icons are intentionally NOT cached — they aren't content-hashed,
  // so caching them would pin old icons on devices after an update.)
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const resp = await fetch(event.request);
        if (resp.ok) cache.put(event.request, resp.clone());
        return resp;
      }),
    );
    return;
  }

  // Everything else (HTML, manifest): network passthrough, no caching,
  // so deploys are picked up immediately.
});
