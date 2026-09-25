"use strict";
const CACHE_NAME="lecture-cp-shell-v0.41.0";
const BASE="/lecture-cp/";
const SHELL=[
  BASE,
  BASE+"index.html",
  BASE+"styles.css?v=0.41.0",
  BASE+"content.js?v=0.41.0",
  BASE+"progression.js?v=0.41.0",
  BASE+"rewards.js?v=0.41.0",
  BASE+"exercises.js?v=0.41.0",
  BASE+"missions.js?v=0.41.0",
  BASE+"app.js?v=0.41.0",
  BASE+"manifest.webmanifest",
  BASE+"icon.svg"
];

self.addEventListener("install",event=>{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(SHELL))
      .then(()=>self.skipWaiting())
  )
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith("lecture-cp-shell-")&&k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  )
});

async function cachedShellPage(){
 try{const cache=await caches.open(CACHE_NAME);return await cache.match(BASE+"index.html")||await cache.match(BASE)}catch(e){return null}
}
async function navigateWithFallback(request){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
 try{
  const response=await fetch(request,{signal:controller.signal});
  if(response.status>=500)return await cachedShellPage()||response;
  // Keep the offline HTML installed with its own assets. A newer online page
  // must not replace it before the next worker's complete shell is installed.
  return response
 }catch(error){const cached=await cachedShellPage();if(cached)return cached;throw error}
 finally{clearTimeout(timer)}
}
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;

  if(request.mode==="navigate"){
    event.respondWith(navigateWithFallback(request));
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache=>cache.match(request)).catch(()=>null)
      .then(cached=>cached||fetch(request))
  )
});
