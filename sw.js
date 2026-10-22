// Service worker supaya aplikasi bisa diinstal (PWA).
// Cuma file aplikasi sendiri yang di-cache. Supabase (data keuangan) dan CDN selalu langsung ke internet, nggak pernah disimpan.
const CACHE = "keuangan-v1";
const SHELL = [
  "./",
  "./index.html",
  "./assets/style.css",
  "./assets/js/main.js",
  "./assets/js/config.js",
  "./assets/js/supabase.js",
  "./assets/js/auth.js",
  "./assets/js/router.js",
  "./assets/js/ui.js",
  "./assets/js/utils.js",
  "./assets/js/views/login.js",
  "./assets/js/views/register.js",
  "./assets/js/views/dashboard.js",
  "./assets/js/views/transactions.js",
  "./assets/js/views/transaction-form.js",
  "./assets/js/views/categories.js",
  "./assets/js/views/budgets.js",
  "./assets/js/views/report.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Supabase, Chart.js, dll: langsung ke internet

  // File aplikasi: ambil dari internet dulu (biar update langsung kepakai), pakai cache kalau offline
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./")))
  );
});
