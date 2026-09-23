// Optional real-browser checks: requires Playwright + Chromium and a local HTTP server.
// Usage: CALY_TEST_URL=http://127.0.0.1:8765 node scripts/browser-check.js
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.CALY_TEST_URL||'http://127.0.0.1:8765';
const mockClient=`window.__mock={reads:[],writes:[],holdWrites:false};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:fn=>{window.__mock.authChange=fn},signOut:async()=>({})},
 from:()=>{const filters={};const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q},
 maybeSingle:()=>new Promise(resolve=>__mock.reads.push({filters,resolve})),
 upsert:row=>{__mock.writes.push(row);return __mock.holdWrites?new Promise(resolve=>__mock.releaseWrite=resolve):Promise.resolve({error:null})}};return q}
})};`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage","--no-zygote","--single-process","--in-process-gpu","--use-gl=angle","--use-angle=swiftshader","--disable-features=AudioServiceOutOfProcess"]}:{})});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:mockClient,contentType:'application/javascript'}));
  await page.goto(url);await page.locator('[data-action="mission-start"]').first().waitFor();
  // Every principal screen must fit on phones, tablets and desktop.
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:900});
   for(const view of ['home','sounds','syllables','words','games','world','collection','parents']){
    await page.evaluate(view=>activate(view),view);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${view} overflows at ${width}px`);
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{state=normalizeState({});activate('home')});
  await page.locator('[data-action="mission-start"]').first().click();
  await page.locator('[data-action="mission-next"]').click();
  await page.locator('[data-action="mission-discover-done"]').click();
  assert.equal(await page.evaluate(()=>state.dailyMission.index),1);
  await page.reload();await page.waitForFunction(()=>state.dailyMission?.index===1);
  await page.locator('[data-action="mission-next"]').click();
  // Complete the remaining mission, including whichever visual game is selected today.
  for(let n=0;n<8;n++){
   const type=await page.evaluate(()=>currentView);
   if(type==='listen'||type==='bubbles'){
    const answer=await page.evaluate(()=>currentAnswer);
    await page.locator(`[data-action="${type==='listen'?'listen-answer':'bubble-answer'}"][data-value="${answer}"]`).click();
   }else if(type==='family'||type==='missing'||type==='comprehension'){
    const answer=await page.evaluate(()=>currentAnswer);
    await page.locator(`[data-action="${type==='family'?'family':type}-answer"][data-value="${answer}"]`).click();
   }else if(type==='memory'){
    const pairs=await page.evaluate(()=>[...new Set(memoryDeck.map(x=>x.pair))].map(p=>memoryDeck.map((x,i)=>x.pair===p?i:-1).filter(i=>i>=0)));
    for(const pair of pairs)for(const i of pair)await page.locator(`[data-action="memory-card"][data-index="${i}"]`).click();
   }else if(type==='build'){
    const parts=await page.evaluate(()=>orderTarget);
    for(const part of parts)await page.locator(`[data-action="build-token"][data-value="${part}"]:not(:disabled)`).first().click();
   }
   if(await page.locator('[data-action="mission-finish"]').count()){await page.locator('[data-action="mission-finish"]').click();break}
   await page.locator('[data-action="mission-continue"]').click();
  }
  assert.equal(await page.evaluate(()=>state.missionHistory.length),1);
  assert.equal(await page.evaluate(()=>state.rewards.pieces),1);
  await page.evaluate(()=>missionComplete());assert.equal(await page.evaluate(()=>state.rewards.pieces),1);
  // A pending reset from a wrong word must never mutate the next exercise.
  await page.evaluate(()=>{gameBuild({w:'salami',parts:['sa','la','mi'],emoji:'🥓'});orderMade=['mi','la','sa'];updateBuild();gameBuild({w:'salami',parts:['sa','la','mi'],emoji:'🥓'});orderMade=['sa'];updateBuild()});
  await page.waitForTimeout(950);assert.deepEqual(await page.evaluate(()=>orderMade),['sa']);
  await page.evaluate(()=>{orderMade=['mi','la','sa'];updateBuild();activate('home')});
  await page.waitForTimeout(950);assert.equal(await page.evaluate(()=>currentView),'home');
  // Solved construction remains immutable even when extra choices/reset are pressed.
  await page.evaluate(()=>gameBuild({w:'salami',parts:['sa','la','mi'],emoji:'🥓'}));
  for(const part of ['sa','la','mi'])await page.locator(`[data-action="build-token"][data-value="${part}"]`).click();
  await page.locator('[data-action="build-token"]:not(:disabled)').first().click();
  await page.locator('[data-action="build-reset"]').click();
  assert.deepEqual(await page.evaluate(()=>orderMade),['sa','la','mi']);
  // The account dialog traps focus and closes back to its opener with Escape.
  await page.locator('#accountBtn').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'loginEmail');
  await page.locator('[data-auth-tab="login"]').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'close-modal');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.authTab),'login');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'accountBtn');
  // A late response for A must not replace B or write A's data into B's cache.
  await page.evaluate(()=>{session={user:{id:'parent'}};children=[{id:'A',parent_id:'parent',nickname:'A'},{id:'B',parent_id:'parent',nickname:'B'}];void selectChild('A');void selectChild('B')});
  await page.evaluate(()=>__mock.reads.find(x=>x.filters.child_id==='B').resolve({data:{lesson_state:{stars:22,updatedAt:200,lastView:'parents'}},error:null}));
  await page.waitForFunction(()=>state.stars===22);
  await page.evaluate(()=>__mock.reads.find(x=>x.filters.child_id==='A').resolve({data:{lesson_state:{stars:11,updatedAt:100,lastView:'parents'}},error:null}));
  await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>state.stars),22);
  assert.equal(await page.evaluate(()=>currentChild.id),'B');
  // A new answer recorded while a fetch is pending must win against stale remote data.
  await page.evaluate(()=>{__mock.reads=[];void loadRemoteState();state.stars=23;save();__mock.reads[0].resolve({data:{lesson_state:{stars:22,updatedAt:200}},error:null})});
  await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>state.stars),23);
  // Queued saves must retain the outgoing profile's final snapshot.
  await page.evaluate(()=>{__mock.writes=[];__mock.holdWrites=true;state.stars=24;void saveRemoteNow();state.stars=25;void saveRemoteNow();enterChildProfile(children[0]);__mock.holdWrites=false;__mock.releaseWrite({error:null})});
  await page.waitForTimeout(30);
  assert(await page.evaluate(()=>__mock.writes.some(x=>x.child_id==='B'&&x.lesson_state.stars===25)));
  assert(!(await page.evaluate(()=>__mock.writes.some(x=>x.child_id==='A'&&x.lesson_state.stars>=22))));
  // Old remote saves without timestamps still load, and a failed refresh preserves them.
  await page.evaluate(()=>{state=normalizeState({});localStorage.removeItem(childKey('A'));__mock.reads=[];void loadRemoteState();__mock.reads[0].resolve({data:{lesson_state:{stars:7,lastView:'parents'}},error:null})});
  await page.waitForFunction(()=>state.stars===7);
  await page.evaluate(()=>{__mock.reads=[];void loadRemoteState();__mock.reads[0].resolve({data:null,error:{message:'simulated offline'}})});
  await page.waitForTimeout(30);assert.equal(await page.evaluate(()=>state.stars),7);
  // Token refresh must preserve the exercise currently on screen.
  await page.evaluate(()=>{profileLoading=false;gameBuild({w:'salami',parts:['sa','la','mi'],emoji:'🥓'});orderMade=['sa'];updateBuild();__mock.authChange('TOKEN_REFRESHED',{user:{id:'parent'}})});
  assert.deepEqual(await page.evaluate(()=>orderMade),['sa']);
  assert.equal(await page.evaluate(()=>currentView),'build');
  await page.evaluate(()=>{session=null;currentChild=null;profileLoading=false;state=normalizeState({});activate('home')});
  await page.screenshot({path:'/tmp/caly-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Browser checks OK: 32 responsive screens, mission resume/completion, single reward, delayed navigation, profile races, save queue, token refresh.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
