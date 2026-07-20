/* Bhojpatra PWA service worker — shell + icons only.
   Never cache Next.js hashed JS/CSS chunks (breaks deploys / HMR). */
const CACHE = "bhojpatra-shell-v3";
const PRECACHE = ["/", "/bhojpatra-icon.png", "/bhojpatra-logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // Leave Next runtime / hashed bundles to the network.
  if (url.pathname.startsWith("/_next/")) return;

  const isAsset = /\.(png|webp|jpg|jpeg|svg|woff2?|ttf)$/i.test(url.pathname);
  const isNav = request.mode === "navigate" || url.pathname === "/";

  if (!isAsset && !isNav) return;

  // Pages: network-first so a deploy shows up on the next visit; the cache is
  // only the offline fallback. Assets: cache-first, refreshed in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached || caches.match("/"));
      return isNav ? network : cached || network;
    }),
  );
});
