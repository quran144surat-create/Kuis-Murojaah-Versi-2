/* Service worker Kuis Muraja'ah — membuat aplikasi bisa dibuka offline.
   Naikkan VERSION setiap kali index.html diubah agar pengguna dapat versi terbaru. */
const VERSION = 'v2';
const APP_ROOT = new URL('./', self.location).pathname;
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

  // Halaman: coba jaringan dulu; jika offline pakai cache halaman ITU SENDIRI.
  // (juz-N.html, download-juz.html, dll. tidak boleh dialihkan ke halaman kuis.)
  if (req.mode === 'navigate') {
    const isApp = url.pathname === APP_ROOT || url.pathname === APP_ROOT + 'index.html';
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(isApp ? './index.html' : req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit => {
          if (hit) return hit;
          if (isApp) return caches.match('./index.html');
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<body style="font-family:sans-serif;padding:24px;line-height:1.6;background:#F2F1E7;color:#10231D">' +
            '<h2>Halaman ini belum tersimpan offline</h2>' +
            '<p>Sambungkan internet dan buka halaman ini sekali, atau unduh dulu lewat menu <b>Download Mushaf per Juz</b>. Setelah itu bisa dibuka offline.</p>' +
            '<p><a href="' + APP_ROOT + '">&larr; Kembali ke Kuis</a></p></body>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
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
