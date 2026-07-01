const CACHE = "kings-siege-v1";
const ASSETS = [
  "./", "./index.html", "./main.js", "./render3d.js", "./strings.js", "./style.css",
  "./manifest.json", "./vendor/three.module.min.js", "./vendor/GLTFLoader.js", "./vendor/BufferGeometryUtils.js",
  "./assets/king.glb",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
];
// Large, rarely-changing files: fine to serve from cache first.
const CACHE_FIRST = [/\/vendor\//, /\/icons\//];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const cacheFirst = CACHE_FIRST.some((re) => re.test(e.request.url));
  if (cacheFirst) {
    e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
    return;
  }
  // App shell (html/js/css): always prefer the network so updates apply on next load;
  // fall back to the last cached copy only when offline.
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
