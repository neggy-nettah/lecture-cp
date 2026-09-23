// Serve this repository at /lecture-cp/ to reproduce the production service worker scope.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const version=fs.readFileSync('app.js','utf8').match(/APP_VERSION="([^"]+)"/)[1];
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--disable-features=AudioServiceOutOfProcess']}:{})});
 try{
  const context=await browser.newContext();const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.abort());
  await page.goto(process.env.CALY_PWA_URL||'http://127.0.0.1:8766/lecture-cp/');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  const paths=await page.evaluate(async()=>{const cache=await caches.open('lecture-cp-shell-v'+APP_VERSION);return (await cache.keys()).map(r=>new URL(r.url).pathname+new URL(r.url).search)});
  for(const file of ['content.js','progression.js','rewards.js','app.js'])assert(paths.includes('/lecture-cp/'+file+'?v='+version),'Missing offline script '+file);
  await page.evaluate(()=>{state.name='Test hors ligne';save();activate('home')});
  await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>document.querySelector('#appVersion').textContent.length>1);
  assert.equal(await page.evaluate(()=>APP_VERSION),version);
  assert.equal(await page.evaluate(()=>state.name),'Test hors ligne');
  await page.evaluate(()=>gameListen('ma'));
  await page.locator('[data-action="listen-answer"][data-value="ma"]').click();
  assert.equal(await page.evaluate(()=>state.mastery.ma.correct),1);
  assert.equal(await page.evaluate(()=>state.stars),1);
  await page.reload();await page.waitForFunction(()=>state.mastery?.ma?.correct===1);
  assert.equal(await page.evaluate(()=>state.stars),1);
  assert.deepEqual(errors,[]);
  console.log('Offline checks OK: all scripts cached, full offline reload, answer/reward and saved progress retained.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
