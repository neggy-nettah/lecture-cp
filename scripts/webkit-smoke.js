const assert=require('node:assert/strict');
const {webkit}=require('playwright');
const url=process.env.CALY_TEST_URL||'http://127.0.0.1:8765';
const mockClient=`window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{}},
 from:()=>({select(){return this},eq(){return this},order:async()=>({data:[],error:null}),maybeSingle:async()=>({data:null,error:null}),upsert:async()=>({error:null})})
})};`;

(async()=>{
 const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({body:mockClient,contentType:'application/javascript'}));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('[data-action="mission-start"]').first().waitFor();

  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:900});
   for(const view of ['home','sounds','syllables','words','games','world','collection','parents']){
    await page.evaluate(view=>activate(view),view);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${view} overflows in WebKit at ${width}px`);
   }
  }

  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
   state=normalizeState({
    missionHistory:Array.from({length:4},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0')})),
    mastery:Object.fromEntries(['ma','mi','mo','la'].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))
   });
   gameWordEncode(DATA.words.find(w=>w.w==='silo'));
  });
  assert.equal(await page.evaluate(()=>currentView),'word-encode');
  assert.equal(await page.locator('#wordEncodeZone').isVisible(),true);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>currentView==='word-encode');
  assert.equal(await page.locator('#wordEncodeZone').isVisible(),true);

  await page.evaluate(()=>activate('home'));
  await page.locator('#textSizeBtn').click();
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('large-text')),true);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));

  await page.locator('#accountBtn').click();
  await page.locator('#loginEmail').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#authModal').evaluate(el=>el.classList.contains('hidden')),true);

  assert.deepEqual(errors,[]);
  console.log('WebKit smoke OK: core routes, responsive layout, saved game restoration, large text and parent modal.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
