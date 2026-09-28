/* Service worker gabungan: Kuis Muraja'ah + Mushaf per Juz.
   Satu file ini menggantikan sw.js lama (semua halaman mendaftarkan 'sw.js').
   Naikkan VERSION setiap kali index.html / juz-N.html / config.js diubah. */
const VERSION = 'v3';
const APP_ROOT = new URL('./', self.location).pathname;
const SHELL_CACHE = 'murajaah-shell-' + VERSION;
const FONT_CACHE = 'murajaah-fonts-v1';
const MUSHAF_CACHE = 'mushaf-v1'; // cache gambar halaman, diisi oleh download-juz.html (JANGAN diganti/dihapus)

const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './config.js', './download-juz.html'
];
for (let j = 1; j <= 30; j++) SHELL.push('./juz-' + j + '.html');

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Satu per satu: kalau ada file yang tidak ada, yang lain tetap tersimpan.
    await Promise.allSettled(SHELL.map(u => cache.add(new Request(u, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
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

  // Font Google: cache dulu, perbarui di latar belakang.
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

  // Gambar halaman mushaf (dari mana pun asalnya): pakai unduhan offline kalau ada.
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req, { cacheName: MUSHAF_CACHE }).then(hit => hit || fetch(req))
    );
    return;
  }

  // Audio & CDN lain: biarkan aplikasi yang menangani.
  if (url.origin !== self.location.origin) return;

  // Halaman (kuis, juz-N.html, download-juz.html): jaringan dulu, cache jika offline.
  if (req.mode === 'navigate') {
    const isApp = url.pathname === APP_ROOT || url.pathname === APP_ROOT + 'index.html';
    const key = isApp ? './index.html' : new Request(url.origin + url.pathname);
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(key, copy));
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
            '<p>Sambungkan internet dan buka halaman ini sekali, lalu bisa dibuka offline.</p>' +
            '<p><a href="' + APP_ROOT + '">&larr; Kembali ke Kuis</a></p></body>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        })
      )
    );
    return;
  }

  // File statis se-origin lain (config.js dll.): cache dulu, lalu jaringan.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
