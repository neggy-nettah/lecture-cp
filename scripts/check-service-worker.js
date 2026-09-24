// Deterministic network/cache failures in the real worker source.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('sw.js','utf8');
function setup(){
 const listeners={},timers=new Map(),files=new Map();let fetchImpl=async()=>new Response('online'),cacheUnavailable=false,timerId=0;
 const cache={match:async request=>files.get(typeof request==='string'?request:new URL(request.url).pathname+new URL(request.url).search)?.clone()};
 const sandbox={URL,AbortController,setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId},clearTimeout:id=>timers.delete(id),
  self:{location:{origin:'https://app.test'},addEventListener:(name,fn)=>listeners[name]=fn},
  caches:{open:async()=>{if(cacheUnavailable)throw Error('cache unavailable');return cache}},fetch:(...args)=>fetchImpl(...args)};
 vm.runInNewContext(source,sandbox);
 const request=(path='/lecture-cp/',mode='navigate',method='GET')=>({url:'https://app.test'+path,mode,method});
 const run=req=>{let response;listeners.fetch({request:req,respondWith:p=>response=p});return response};
 files.set('/lecture-cp/index.html',new Response('installed HTML'));
 return {request,run,files,timers,network:fn=>fetchImpl=fn,denyCache:()=>cacheUnavailable=true};
}
(async()=>{
 const h=setup();
 h.network(async()=>new Response('new HTML with new assets'));
 assert.equal(await (await h.run(h.request())).text(),'new HTML with new assets');
 h.network(async()=>{throw Error('offline')});
 assert.equal(await (await h.run(h.request())).text(),'installed HTML','online HTML must not corrupt the installed offline shell');
 for(const status of [500,502,503,504]){
  h.network(async()=>new Response('server error',{status}));
  assert.equal(await (await h.run(h.request())).text(),'installed HTML');
 }
 h.network(async()=>new Response('not found',{status:404}));
 assert.equal((await h.run(h.request())).status,404,'real missing pages keep their status');
 h.network((request,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Error('timeout')))));
 const pending=h.run(h.request());
 assert.equal(h.timers.size,1);const [{fn,ms}]=h.timers.values();assert.equal(ms,4000);fn();
 assert.equal(await (await pending).text(),'installed HTML','stalled navigation falls back');assert.equal(h.timers.size,0);
 h.files.set('/lecture-cp/example.js?v=1',new Response('installed script'));
 assert.equal(await (await h.run(h.request('/lecture-cp/example.js?v=1','cors'))).text(),'installed script');
 h.network(async()=>new Response('uncached asset'));
 assert.equal(await (await h.run(h.request('/lecture-cp/other.js','cors'))).text(),'uncached asset');
 assert.equal(h.files.has('/lecture-cp/other.js'),false,'do not grow an unbounded runtime cache');
 assert.equal(h.run(h.request('/outside/')),undefined);
 assert.equal(h.run(h.request('/lecture-cp/','navigate','POST')),undefined);
 const denied=setup();denied.denyCache();denied.network(async()=>new Response('network works'));
 assert.equal(await (await denied.run(denied.request('/lecture-cp/app.js','cors'))).text(),'network works');
 const empty=setup();empty.files.clear();empty.network(async()=>new Response('server error',{status:503}));
 assert.equal((await empty.run(empty.request())).status,503);
 empty.network(async()=>{throw Error('offline without cache')});
 await assert.rejects(empty.run(empty.request()),/offline without cache/);
 console.log('Service worker checks OK: 5xx, timeout, offline version coherence, cache unavailable, bounded caching and request scope');
})().catch(error=>{console.error(error);process.exitCode=1});
