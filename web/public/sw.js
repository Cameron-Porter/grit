const CACHE='grit-static-v6';
// '/' is the launch route and is statically rendered, so it can be precached and
// served instantly. Without it a cold launch waited on the network before the
// browser had anything to paint, showing the PWA background colour - a black
// screen - for the whole round-trip.
const STATIC=['/','/plate-icon.png','/icon-192.png','/icon-512.png','/offline.html'];
const SHELL='/';

self.addEventListener('install',(event)=>event.waitUntil(caches.open(CACHE).then((cache)=>cache.addAll(STATIC)).then(()=>self.skipWaiting())));

self.addEventListener('activate',(event)=>event.waitUntil((async()=>{
  // Lets the browser start the navigation request while the worker is still
  // booting, instead of serialising the two.
  if(self.registration.navigationPreload)await self.registration.navigationPreload.enable();
  const keys=await caches.keys();
  await Promise.all(keys.filter((key)=>key!==CACHE).map((key)=>caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('fetch',(event)=>{
  if(event.request.method!=='GET'||event.request.url.includes('/api/')||event.request.url.includes('/auth/'))return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      const url=new URL(event.request.url);
      // The launch route is static and identical for everyone, so serve it from
      // cache first: it paints immediately and then routes on to the workout.
      if(url.pathname===SHELL){
        const shell=await caches.match(SHELL);
        if(shell){
          // Refresh it in the background so a deploy is picked up next launch.
          void fetch(event.request).then((response)=>{
            if(response.ok)return caches.open(CACHE).then((cache)=>cache.put(SHELL,response.clone()));
          }).catch(()=>undefined);
          return shell;
        }
      }
      try{
        // Preload response when the browser already started one; otherwise fetch.
        const preloaded=await event.preloadResponse;
        return preloaded||await fetch(event.request);
      }catch{
        return (await caches.match(SHELL))||(await caches.match('/offline.html'));
      }
    })());
    return;
  }

  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!(url.pathname.startsWith('/_next/static/')||STATIC.includes(url.pathname)))return;
  event.respondWith(caches.match(event.request).then((cached)=>cached||fetch(event.request).then((response)=>{if(response.ok){const copy=response.clone();void caches.open(CACHE).then((cache)=>cache.put(event.request,copy));}return response;})));
});
