// Naikkan angka versi bila file ini berubah. Halaman/skrip: cek internet dulu (selalu terbaru),
// gambar mushaf: pakai simpanan offline dulu (hemat kuota, cepat).
const V='shell-v2', IMG='mushaf-v1';
const SHELL=['config.js','download-juz.html',...Array.from({length:30},(_,i)=>`juz-${i+1}.html`)];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!==IMG).map(k=>caches.delete(k)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  if(/\.(jpe?g|png|webp)$/i.test(u.pathname)){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r)));
  }else{
    e.respondWith(fetch(r).then(res=>{
      if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}
      return res;
    }).catch(()=>caches.match(r,{ignoreSearch:true})));
  }
});
