/* Service worker Kuis Muraja'ah — membuat aplikasi bisa dibuka offline.
   Naikkan VERSION setiap kali index.html diubah agar pengguna dapat versi terbaru. */
const VERSION = 'v1';
const SHELL_CACHE = 'murajaah-shell-' + VERSION;
const FONT_CACHE = 'murajaah-fonts-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('murajaah-shell-') && k !== SHELL_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Font Google: tampilkan dari cache lebih dulu, perbarui di latar belakang.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(hit => {
          const net = fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Audio & CDN lain: biarkan browser/aplikasi yang menangani (audio disimpan aplikasi di IndexedDB).
  if (url.origin !== self.location.origin) return;

  // Halaman: coba jaringan dulu (agar update cepat terlihat), jika offline pakai cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() =>
        caches.match('./index.html').then(hit => hit || caches.match('./'))
      )
    );
    return;
  }

  // File statis lain se-origin: cache dulu, lalu jaringan.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
