"use strict";
const CACHE_NAME="lecture-cp-shell-v0.14.1";
const BASE="/lecture-cp/";
const SHELL=[
  BASE,
  BASE+"index.html",
  BASE+"styles.css?v=0.14.1",
  BASE+"content.js?v=0.14.1",
  BASE+"app.js?v=0.14.1",
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

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;

  if(request.mode==="navigate"){
    event.respondWith(
      fetch(request)
        .then(response=>{
          const type=response.headers.get("content-type")||"";
          if(response.ok&&type.includes("text/html")){
            const copy=response.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(BASE+"index.html",copy))
          }
          return response
        })
        .catch(()=>caches.match(BASE+"index.html").then(r=>r||caches.match(BASE)))
    );
    return
  }

  event.respondWith(
    caches.match(request).then(cached=>{
      if(cached)return cached;
      return fetch(request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))
        }
        return response
      })
    })
  )
});
