/* Service Worker — Portal Masjid Al Ikhlash
 * - Berkas statis (app shell): cache-first + segarkan di latar (stale-while-revalidate) → buka instan, tetap jalan saat sinyal lemah
 * - Permintaan ke Google Apps Script (script.google.com / googleusercontent): JANGAN di-cache di sini
 *   (cache data ditangani aplikasi lewat localStorage + versi data, agar selalu sinkron dengan backend)
 * Naikkan VERSI setiap kali berkas statis berubah, supaya cache lama dibuang.
 */
const VERSI = 'ai-v1.1.0';
const SHELL = [
  './', './index.html', './manifest.json', './css/style.css',
  './js/config.js', './js/util.js', './js/khgt.js', './js/api.js', './js/pages.js', './js/admin.js', './js/app.js',
  './assets/logo-muhammadiyah.webp', './assets/lambang-putih.png', './assets/ikhlas.jpg', './assets/icon-192.png', './assets/icon-512.png'
];
const RUNTIME = VERSI + '-rt';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => { })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSI && k !== RUNTIME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (/(^|\.)script\.google\.com$|googleusercontent\.com$/.test(url.hostname)) return;   // data backend: langsung ke jaringan

  // font Google & pustaka ekspor (cdnjs): simpan saat pertama dipakai
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // navigasi: selalu sajikan app shell (SPA) — jaringan dicoba di latar untuk memperbarui
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(hit => {
      const net = fetch(req).then(r => { if (r.ok) caches.open(VERSI).then(c => c.put('./index.html', r.clone())); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // berkas statis: stale-while-revalidate
  e.respondWith(caches.open(VERSI).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
