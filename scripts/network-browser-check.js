// Real service worker under a local server that can fail or stall navigation.
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const {chromium}=require('playwright');
const version=fs.readFileSync('app.js','utf8').match(/APP_VERSION="([^"]+)"/)[1];
const assets=new Set(['index.html','styles.css','content.js','progression.js','rewards.js','exercises.js','missions.js','app.js','sw.js','manifest.webmanifest','icon.svg']);
const types={html:'text/html',js:'application/javascript',css:'text/css',svg:'image/svg+xml',webmanifest:'application/manifest+json'};
let mode='normal';
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 const file=path==='/lecture-cp/'?'index.html':path.replace(/^\/lecture-cp\//,'');
 if(!path.startsWith('/lecture-cp/')||!assets.has(file)){res.writeHead(404).end();return}
 if(file==='index.html'&&mode==='error'){res.writeHead(503).end('Service unavailable');return}
 if(file==='index.html'&&mode==='stall')return;
 res.setHeader('Content-Type',types[file.split('.').pop()]||'text/plain');res.setHeader('Cache-Control','no-store');
 res.end(file==='index.html'&&mode==='future'?'<html><body>Future release not installed</body></html>':fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/lecture-cp/`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--disable-features=AudioServiceOutOfProcess']}:{})});
  const context=await browser.newContext(),page=await context.newPage();
  await page.route('https://cdn.jsdelivr.net/**',r=>r.abort());
  await page.goto(url);await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.evaluate(()=>{state.name='Connexion instable';state.stars=12;save()});
  for(const failure of ['error','stall']){
   mode=failure;await page.reload({waitUntil:'domcontentloaded',timeout:15000});
   await page.waitForFunction(()=>document.querySelector('#appVersion')?.textContent.length>1);
   assert.equal(await page.evaluate(()=>APP_VERSION),version);
   assert.equal(await page.evaluate(()=>state.stars),12);
  }
  mode='future';await page.goto(url,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('body').textContent(),'Future release not installed');
  await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#appVersion')?.textContent.length>1);
  assert.equal(await page.evaluate(()=>APP_VERSION),version,'fallback uses the fully installed release');
  assert.equal(await page.evaluate(()=>state.name),'Connexion instable');
  assert.equal(await page.evaluate(()=>state.stars),12);
  console.log('Network browser checks OK: actual 503, stalled navigation, coherent offline release and saved progress');
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1;server.closeAllConnections();server.close()});
