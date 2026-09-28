const VERSI = 'kuis-murojaah-v2';
const FILE_APP = [
  './', './index.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png',
  './apple-touch-icon.png', './favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(FILE_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // File app (satu origin): cache dulu, jaringan sebagai cadangan
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        if (hit) return hit;
        return fetch(req).then(res => {
          if (res.ok) { const salin = res.clone(); caches.open(VERSI).then(c => c.put(req, salin)); }
          return res;
        }).catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      })
    );
    return;
  }

  // Font Google: simpan saat pertama kali online agar tampil sama saat offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSI).then(c => c.match(req).then(hit => {
        const dariJaringan = fetch(req).then(res => {
          if (res.ok || res.type === 'opaque') c.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || dariJaringan;
      }))
    );
  }
  // Selain itu (mis. audio ayat) langsung lewat jaringan, tidak di-cache
});
