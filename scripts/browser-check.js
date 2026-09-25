// Optional real-browser checks: requires Playwright + Chromium and a local HTTP server.
// Usage: CALY_TEST_URL=http://127.0.0.1:8765 node scripts/browser-check.js
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.CALY_TEST_URL||'http://127.0.0.1:8765';
const mockClient=`window.__mock={reads:[],writes:[],holdWrites:false,authCalls:[],inserts:[],children:[]};
window.supabase={createClient:()=>({
 auth:{getSession:async()=>{if(__mock.recoveryAtBoot){const session={user:{id:'parent'}};__mock.authChange('PASSWORD_RECOVERY',session);return {data:{session}}}return {data:{session:null}}},
 onAuthStateChange:fn=>{window.__mock.authChange=fn},signOut:async()=>({}),
 signInWithPassword:async args=>{__mock.authCalls.push({type:'login'});if(__mock.loginThrows)throw Error('offline');return {error:__mock.loginError||null}},
 resetPasswordForEmail:async()=>{__mock.authCalls.push({type:'forgot'});return {error:null}},
 signUp:async()=>{__mock.authCalls.push({type:'signup'});return {data:{session:null},error:null}},
 updateUser:async args=>{__mock.authCalls.push({type:'update',password:args.password});return __mock.holdUpdate?new Promise(resolve=>__mock.releaseUpdate=resolve):{error:__mock.updateError||null}}},
 from:()=>{const filters={};const q={select:()=>q,order:async()=>({data:__mock.children,error:null}),insert:row=>{__mock.inserts.push(row);return q},single:()=>new Promise(resolve=>__mock.releaseInsert=resolve),eq:(k,v)=>{filters[k]=v;return q},
 maybeSingle:()=>new Promise(resolve=>__mock.reads.push({filters,resolve})),
 upsert:row=>{__mock.writes.push(row);return __mock.holdWrites?new Promise(resolve=>__mock.releaseWrite=resolve):Promise.resolve({error:null})}};return q}
})};`;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH,args:["--no-sandbox","--disable-dev-shm-usage","--no-zygote","--single-process","--in-process-gpu","--use-gl=angle","--use-angle=swiftshader","--disable-features=AudioServiceOutOfProcess"]}:{})});
 try{
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('dialog',dialog=>dialog.accept());page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:mockClient,contentType:'application/javascript'}));
  await page.goto(url);await page.locator('[data-action="mission-start"]').first().waitFor();
  await require('./audit-games-browser')(page);
  await require('./microphone-check')(page);
  await require('./saved-state-check')(page);
  await require('./mission-boundaries-check')(page);
  await require('./practice-navigation-check')(page);
  await require('./long-term-progress-check')(page);
  await require('./parent-detail-check')(page);
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
  // A mission Memory keeps its deck, matched pairs and mistakes across reloads.
  await page.evaluate(()=>{state=normalizeState({});buildDailyMission();state.dailyMission.index=3;state.dailyMission.steps[3]={type:'memory',title:'Memory',detail:'Paires'};startMissionStep()});
  const memoryCards=await page.evaluate(()=>memoryDeck.map(c=>({pair:c.pair,type:c.type})));
  const memoryPairs=[...new Set(memoryCards.map(c=>c.pair))];
  const positions=pair=>memoryCards.flatMap((c,i)=>c.pair===pair?[i]:[]);
  for(const i of positions(memoryPairs[0]))await page.locator(`[data-action="memory-card"][data-index="${i}"]`).click();
  const initialMemoryCorrect=await page.evaluate(()=>state.stats.correct);
  for(const pair of memoryPairs.slice(1))await page.locator(`[data-action="memory-card"][data-index="${positions(pair)[0]}"]`).click();
  await page.reload();await page.waitForFunction(()=>state.dailyMission?.index===3);
  await page.locator('[data-action="mission-next"]').click();
  assert.deepEqual(await page.evaluate(()=>memoryDeck.map(c=>({pair:c.pair,type:c.type}))),memoryCards);
  assert.equal(await page.locator('.memory-card.matched').count(),2);
  assert.equal(await page.locator('.memory-card.open').count(),0);
  assert.deepEqual(await page.evaluate(()=>[...memoryMissedPairs].sort()),memoryPairs.slice(1).sort());
  assert.equal(await page.evaluate(()=>state.stats.correct),initialMemoryCorrect);
  for(const pair of memoryPairs.slice(1))for(const i of positions(pair))await page.locator(`[data-action="memory-card"][data-index="${i}"]`).click();
  assert.equal(await page.evaluate(()=>state.dailyMission.index),4);
  for(const pair of memoryPairs.slice(1))assert.equal(await page.evaluate(p=>state.mastery[p]?.correct||0,pair),0);
  const memoryStars=await page.evaluate(()=>state.stars);
  assert.equal(await page.locator('.memory-card').first().isDisabled(),true);
  await page.locator('.memory-card').first().evaluate(el=>el.click());
  assert.equal(await page.evaluate(()=>state.stars),memoryStars);
  // A save made after the final pair but before advancing must finish only once.
  const completedMemoryStats=await page.evaluate(()=>JSON.stringify(state.stats));
  await page.evaluate(()=>{state.dailyMission.index=3;gameMemory([],true)});
  assert.equal(await page.evaluate(()=>state.dailyMission.index),4);
  assert.equal(await page.evaluate(()=>state.stars),memoryStars);
  assert.equal(await page.evaluate(()=>JSON.stringify(state.stats)),completedMemoryStats);
  // Invalid legacy decks are rebuilt; a recorded error still blocks mastery for that round.
  await page.evaluate(()=>{state.dailyMission.index=3;state.dailyMission.memoryRound={step:3,cards:[{pair:'invalid',type:'text'}]};gameMemory([],true)});
  assert.equal(await page.evaluate(()=>memoryDeck.length),6);
  assert.equal(await page.evaluate(()=>memoryMissedPairs.size),3);
  await page.evaluate(()=>gameMemory());
  assert.equal(await page.evaluate(()=>memoryMissedPairs.size),0);
  assert.equal(await page.evaluate(()=>memoryMatches),0);
  // Parent suggestions prioritize errors, keep unassessed syllables neutral and preserve the mission.
  await page.evaluate(()=>{state=normalizeState({mastery:{ma:{attempts:1,correct:0,lastSeen:localDayKey()},mi:{attempts:4,correct:4,lastSeen:'2020-01-01'},mo:{attempts:1,correct:1,lastSeen:localDayKey()}},reviewQueue:['ma','ma']});buildDailyMission();activate('parents')});
  assert.deepEqual(await page.evaluate(()=>parentReviewSuggestions().map(x=>x.s)),['ma','mi','mo']);
  assert(!(await page.evaluate(()=>masterySummary().weakest.some(x=>x.s==='mi'))));
  assert.equal(await page.evaluate(()=>parentSyllableStatus('mu')),'Pas encore évaluée');
  assert.equal(await page.evaluate(()=>parentSyllableStatus(DATA.sets.at(-1)[0])),'À découvrir plus tard');
  for(const width of [320,768,1280]){
   await page.setViewportSize({width,height:900});
   await page.locator('details.card summary').click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Parent detail overflows at ${width}px`);
   await page.locator('details.card summary').click();
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/caly-parent-018.png',fullPage:true});
  const missionBefore=await page.evaluate(()=>JSON.stringify(state.dailyMission));
  await page.locator('[data-action="parent-review"][data-target="ma"]').click();
  assert.equal(await page.evaluate(()=>currentAnswer),'ma');
  assert.equal(await page.evaluate(()=>missionMode),false);
  await page.locator('[data-action="listen-answer"][data-value="ma"]').click();
  assert.equal(await page.evaluate(()=>JSON.stringify(state.dailyMission)),missionBefore);
  await page.evaluate(()=>{state=normalizeState({});activate('parents')});
  assert.equal(await page.locator('[data-action="parent-review"]').count(),0);
  assert(await page.getByText('Commencez par la mission du jour', {exact:false}).isVisible());
  // Correcting an error must not award mastery, including after a mission reload.
  await page.evaluate(()=>{state=normalizeState({});buildDailyMission();state.dailyMission.index=1;gameListen(state.dailyMission.primary,true)});
  let target=await page.evaluate(()=>currentAnswer);
  await page.locator(`[data-action="listen-answer"]:not([data-value="${target}"])`).first().click();
  assert.equal(await page.evaluate(()=>state.mastery[currentAnswer].correct),0);
  await page.reload();await page.waitForFunction(()=>state.dailyMission?.index===1);
  await page.locator('[data-action="mission-next"]').click();
  assert.equal(await page.evaluate(()=>questionErrorRecorded),true);
  await page.locator(`[data-action="listen-answer"][data-value="${target}"]`).click();
  assert.equal(await page.evaluate(target=>state.mastery[target].correct,target),0);
  assert.equal(await page.evaluate(target=>state.reviewQueue.filter(x=>x===target).length,target),2);
  assert.equal(await page.evaluate(()=>state.dailyMission.index),2);
  // A fresh independent success can establish mastery and retire one review.
  await page.evaluate(target=>gameListen(target),target);
  await page.locator(`[data-action="listen-answer"][data-value="${target}"]`).click();
  assert.equal(await page.evaluate(target=>state.mastery[target].correct,target),1);
  assert.equal(await page.evaluate(target=>state.reviewQueue.filter(x=>x===target).length,target),1);
  // A corrected word is also practice, not autonomous decoding evidence.
  await page.evaluate(()=>{state=normalizeState({});gameBuild({w:'salami',parts:['sa','la','mi'],emoji:'🥓'});orderMade=['mi','la','sa'];updateBuild()});
  await page.waitForTimeout(900);
  for(const part of ['sa','la','mi'])await page.locator(`[data-action="build-token"][data-value="${part}"]`).click();
  assert.equal(await page.evaluate(()=>state.mastery['word:salami']?.correct||0),0);
  assert.equal(await page.evaluate(()=>locked),true);
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
  // Dictated word encoding never exposes the written answer before the child assembles it.
  await page.setViewportSize({width:320,height:900});
  await page.evaluate(()=>{state=normalizeState({missionHistory:Array.from({length:4},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0')})),mastery:Object.fromEntries(['ma','mi','mo','la'].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))});gameWordEncode(DATA.words.find(w=>w.w==='silo'))});
  assert.equal(await page.locator('#wordEncodeZone').isVisible(),true);
  assert.equal(await page.evaluate(()=>stage.innerHTML.includes('silo')),false);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'word encoding overflows at 320px');
  const wordEncodeBefore=await page.evaluate(()=>state.stats.correct);
  await page.locator('[data-action="word-encode-token"][data-value="si"]').click();
  await page.locator('[data-action="word-encode-token"][data-value="lo"]').click();
  assert.equal(await page.evaluate(()=>locked),true);
  assert.equal(await page.evaluate(()=>state.stats.correct),wordEncodeBefore+1);
  assert.equal(await page.evaluate(()=>state.wordPractice.silo),true);
  assert.equal(await page.evaluate(()=>state.mastery['word:silo']?.correct),1);
  assert(await page.locator('#feedback').textContent().then(t=>t.includes('silo')));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>currentView),'word-encode');
  assert.equal(await page.locator('#wordEncodeZone').isVisible(),true);
  // Parent can launch a targeted weak-word practice without changing the daily mission.
  await page.evaluate(()=>{state=normalizeState({missionHistory:Array.from({length:4},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0')})),mastery:{ma:{attempts:4,correct:4,lastSeen:localDayKey()},mi:{attempts:4,correct:4,lastSeen:localDayKey()},mo:{attempts:4,correct:4,lastSeen:localDayKey()},la:{attempts:4,correct:4,lastSeen:localDayKey()},'word:silo':{attempts:2,correct:0,lastSeen:localDayKey()}}});parents()});
  const parentMissionBefore=await page.evaluate(()=>JSON.stringify(state.dailyMission));
  await page.locator('[data-action="parent-word-review"][data-word="silo"]').click();
  assert.equal(await page.evaluate(()=>currentView),'word-encode');
  assert.equal(await page.evaluate(()=>state.lastView),'parents');
  assert.equal(await page.evaluate(()=>currentAnswer.w),'silo');
  assert.equal(await page.evaluate(()=>JSON.stringify(state.dailyMission)),parentMissionBefore);
  await page.locator('[data-action="go"][data-to="parents"]').click();
  assert.equal(await page.evaluate(()=>currentView),'parents');
  // Reading aloud is deliberate practice: the model stays hidden until the child finishes and no score/mastery changes.
  await page.setViewportSize({width:320,height:900});
  await page.evaluate(()=>{state=normalizeState({missionHistory:Array.from({length:8},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0')})),mastery:Object.fromEntries(['ma','mi','mo','mu','mé','la'].map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))});gameReadAloud()});
  assert.equal(await page.locator('#readaloudModel').isHidden(),true);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'read-aloud overflows at 320px');
  const readAloudBefore=await page.evaluate(()=>JSON.stringify({stats:state.stats,stars:state.stars,mastery:state.mastery,rewardLedger:state.rewardLedger,reviewQueue:state.reviewQueue}));
  await page.locator('[data-action="readaloud-done"]').click();
  assert.equal(await page.locator('#readaloudModel').isVisible(),true);
  assert.equal(await page.evaluate(()=>JSON.stringify({stats:state.stats,stars:state.stars,mastery:state.mastery,rewardLedger:state.rewardLedger,reviewQueue:state.reviewQueue})),readAloudBefore);
  assert.equal(await page.locator('[data-action="readaloud-done"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'readaloud-model');
  await page.setViewportSize({width:390,height:844});
  // Large text is a device preference: it persists locally and must not touch learning progress.
  const largeTextBefore=await page.evaluate(()=>JSON.stringify({stats:state.stats,stars:state.stars,mastery:state.mastery,rewardLedger:state.rewardLedger}));
  await page.locator('#textSizeBtn').click();
  assert.equal(await page.evaluate(()=>document.body.classList.contains('large-text')),true);
  assert.equal(await page.locator('#textSizeBtn').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>localStorage.getItem('lectureCpLargeText')),'1');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  assert.equal(await page.evaluate(()=>JSON.stringify({stats:state.stats,stars:state.stars,mastery:state.mastery,rewardLedger:state.rewardLedger})),largeTextBefore);
  await page.reload();await page.waitForFunction(()=>document.body.classList.contains('large-text'));
  assert.equal(await page.locator('#textSizeBtn').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await page.locator('#textSizeBtn').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('lectureCpLargeText')),'0');
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
  // Progress learned independently on two devices must be merged instead of replacing one side wholesale.
  await page.evaluate(()=>{
   state=normalizeState({updatedAt:300,stars:10,done:{listen:true},mastery:{ma:{attempts:2,correct:1,lastSeen:localDayKey()}},missionHistory:[{date:'2026-09-20',attempts:2,correct:1,word:'moto'}]});
   saveLocal();__mock.reads=[];__mock.writes=[];void loadRemoteState()
  });
  await page.evaluate(()=>__mock.reads[0].resolve({data:{lesson_state:{updatedAt:400,stars:12,done:{memory:true},mastery:{mi:{attempts:4,correct:4,lastSeen:localDayKey()}},missionHistory:[{date:'2026-09-21',attempts:1,correct:1,word:'lune'}]}},error:null}));
  await page.waitForFunction(()=>state.stars===12&&state.done.listen&&state.done.memory&&state.mastery.ma&&state.mastery.mi);
  assert.equal(await page.evaluate(()=>state.missionHistory.length),2);
  await page.waitForFunction(()=>__mock.writes.length>0);
  assert(await page.evaluate(()=>__mock.writes.some(x=>x.child_id==='B'&&x.lesson_state.done.listen&&x.lesson_state.done.memory&&x.lesson_state.mastery.ma&&x.lesson_state.mastery.mi)));

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
  // A slow import cannot end up on a different child's profile.
  await page.evaluate(()=>{state=normalizeState({stars:9});window.__importTask=importProgressFile({size:1,text:()=>new Promise(resolve=>window.__readImport=resolve)});currentChild={id:'other',nickname:'Autre'};__readImport(JSON.stringify({app:'La Fabrique des Syllabes',state:{stars:99}}))});
  await page.evaluate(()=>window.__importTask);assert.equal(await page.evaluate(()=>state.stars),9);
  // If the safety backup cannot be written, replacement is cancelled.
  await page.evaluate(async()=>{currentChild=null;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.endsWith('_backup'))throw Error('quota');return original.call(this,key,value)};try{await importProgressFile({size:1,text:async()=>JSON.stringify({app:'La Fabrique des Syllabes',state:{stars:99}})})}finally{Storage.prototype.setItem=original}});
  assert.equal(await page.evaluate(()=>state.stars),9);
  // Restoring a backup preserves the state it replaced, allowing an undo.
  await page.evaluate(()=>{localStorage.setItem(backupKey(),JSON.stringify({stars:3}));restoreBackup()});
  assert.equal(await page.evaluate(()=>state.stars),3);
  await page.evaluate(()=>restoreBackup());assert.equal(await page.evaluate(()=>state.stars),9);
  // Invalid emails never invoke auth, and network failures stay inside the form.
  await page.locator('#accountBtn').click();
  await page.locator('#loginEmail').fill('incorrect');
  await page.locator('[data-action="forgot"]').click();
  assert.equal(await page.evaluate(()=>__mock.authCalls.length),0);
  await page.locator('#loginEmail').fill('parent@example.test');
  await page.locator('[data-action="forgot"]').click();
  assert.equal(await page.evaluate(()=>__mock.authCalls.filter(x=>x.type==='forgot').length),1);
  await page.locator('#loginPassword').fill('test-password');
  await page.evaluate(()=>__mock.loginThrows=true);
  await page.locator('#loginPassword').press('Enter');
  await page.waitForFunction(()=>document.querySelector('#authMsg').classList.contains('error'));
  assert.equal(await page.evaluate(()=>document.querySelector('[data-action="login"]').disabled),false);
  // Recovery rejects a mismatch, then updates exactly once despite repeated requests.
  await page.evaluate(()=>__mock.authChange('PASSWORD_RECOVERY',{user:{id:'parent'}}));
  await page.locator('#recoveryPassword').fill('replacement-password');
  await page.locator('#recoveryConfirm').fill('different-password');
  await page.locator('[data-action="update-password"]').click();
  assert.equal(await page.evaluate(()=>__mock.authCalls.filter(x=>x.type==='update').length),0);
  await page.locator('#recoveryConfirm').fill('replacement-password');
  await page.evaluate(()=>{__mock.holdUpdate=true;void updatePassword();void updatePassword()});
  assert.equal(await page.evaluate(()=>__mock.authCalls.filter(x=>x.type==='update').length),1);
  await page.evaluate(()=>__mock.releaseUpdate({error:null}));
  await page.locator('[data-action="account-open"]').waitFor();
  assert.equal(await page.evaluate(()=>passwordRecovery),false);
  await page.locator('[data-action="account-open"]').click();
  await page.locator('#newChildName').fill('Enfant test');
  await page.evaluate(()=>{void createChild();void createChild()});
  assert.equal(await page.evaluate(()=>__mock.inserts.length),1);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>__mock.releaseInsert({data:{id:'new',parent_id:'parent'},error:null}));
  await page.waitForTimeout(30);
  // The listener must catch recovery during initial getSession, before boot finishes.
  const recoveryPage=await page.context().newPage();
  recoveryPage.on('pageerror',e=>errors.push(e.message));
  await recoveryPage.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:mockClient+'window.__mock.recoveryAtBoot=true;',contentType:'application/javascript'}));
  await recoveryPage.goto(url);await recoveryPage.locator('#recoveryPassword').waitFor();
  assert.equal(await recoveryPage.evaluate(()=>passwordRecovery),true);
  await recoveryPage.close();
  await page.screenshot({path:'/tmp/caly-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('Browser checks OK: 32 responsive screens, mission resume/completion, single reward, delayed navigation, profile races, save queue, token refresh, password recovery, auth errors and duplicate submissions.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
