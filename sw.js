// Naikkan angka versi (v1 -> v2) setiap kali file HTML/JS diperbarui.
const V='shell-v1', IMG='mushaf-v1';
const SHELL=['config.js','download-juz.html',...Array.from({length:30},(_,i)=>`juz-${i+1}.html`)];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==IMG).map(k=>caches.delete(k)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)));
});
