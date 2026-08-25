const CACHE='grit-static-v3';
const STATIC=['/plate-icon.png','/icon-192.png','/icon-512.png','/offline.html'];
self.addEventListener('install',(event)=>event.waitUntil(caches.open(CACHE).then((cache)=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));
self.addEventListener('activate',(event)=>event.waitUntil(caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET'||event.request.url.includes('/api/')||event.request.url.includes('/auth/'))return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/offline.html')));return}
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!(url.pathname.startsWith('/_next/static/')||STATIC.includes(url.pathname)))return;
  event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then((cache)=>cache.put(event.request,copy))}return response})));
});
