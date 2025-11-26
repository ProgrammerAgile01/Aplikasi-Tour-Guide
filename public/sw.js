const CACHE_NAME = "temanwisata-pwa-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  // tambahkan asset penting lain jika mau, misalnya:
  "/logo-temanwisata-bg-clear.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.error("Failed to pre-cache", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Hanya handle GET & hanya untuk origin yang sama
  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Simpan ke cache untuk next time
          return caches.open(CACHE_NAME).then((cache) => {
            // Clone karena response hanya bisa dikonsumsi sekali
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // Bisa dikasih fallback offline di sini
          // contoh: kalau request HTML, balikan halaman offline.html
          // tapi untuk awal, biarkan kosong dulu
        });
    })
  );
});
