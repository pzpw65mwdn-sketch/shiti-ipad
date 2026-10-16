/* 拾题 PWA v4.0.3：仅缓存公开程序文件，不缓存私人题库 JSON 或用户文件。 */
const CACHE = 'shiti-pwa-shell-v403-20261017';
const BASE = self.registration.scope;
const OFFLINE_PAGE = new URL('./index.html', BASE).href;
const ASSETS = ['./index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png']
  .map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('shiti-pwa-shell-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin || !url.href.startsWith(BASE)) return;
  // Navigation: use newest app online; offline use cached application shell.
  if(req.mode === 'navigate'){
    event.respondWith((async () => {
      try {
        const response = await fetch(req);
        if(response.ok){
          const cache=await caches.open(CACHE);
          await cache.put(OFFLINE_PAGE, response.clone());
        }
        return response;
      } catch (err) {
        return (await caches.match(req, {ignoreSearch:true}))
          || (await caches.match(OFFLINE_PAGE))
          || Response.error();
      }
    })());
    return;
  }
  // Only the application shell is cached; never store backup/data filenames.
  if(!ASSETS.includes(url.href)) return;
  event.respondWith((async () => {
    return (await caches.match(req)) || (async () => {
      const response=await fetch(req);
      if(response.ok){const cache=await caches.open(CACHE);await cache.put(req, response.clone());}
      return response;
    })();
  })());
});
