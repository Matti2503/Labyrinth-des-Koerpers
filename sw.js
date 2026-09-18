/* Netzwerk zuerst, Cache nur als Rueckfallebene.
   Damit ist eine neue Fassung sofort sichtbar, sobald sie online liegt,
   und die App bleibt trotzdem offline lauffaehig. */
const CACHE='leitungsbahnen-v28';
const FILES=['./','./index.html','./style.css','./app.js','./gamedata.js',
             './manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('message',e=>{ if(e.data==='update') self.skipWaiting(); });

const SCHRIFTHOSTS=['fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET') return;
  const u=new URL(r.url);
  // Schriften liegen auf fremden Servern: erst aus dem Cache, damit die App
  // auch offline im gewohnten Schriftbild laeuft.
  if(SCHRIFTHOSTS.includes(u.host)){
    e.respondWith(caches.match(r).then(treffer=>{
      if(treffer) return treffer;
      return fetch(r).then(res=>{
        const kopie=res.clone();
        caches.open(CACHE).then(c=>c.put(r,kopie)).catch(()=>{});
        return res;
      }).catch(()=>treffer);
    }));
    return;
  }
  if(u.origin!==location.origin) return;
  e.respondWith(
    fetch(r).then(res=>{
      const kopie=res.clone();
      caches.open(CACHE).then(c=>c.put(r,kopie)).catch(()=>{});
      return res;
    }).catch(()=> caches.match(r).then(t=>t||caches.match('./index.html')))
  );
});
