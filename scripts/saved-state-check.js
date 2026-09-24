// Regression checks against real DOM/storage; no real account or remote writes.
const assert=require('node:assert/strict');
module.exports=async function checkSavedState(page){
 const before=await page.evaluate(()=>JSON.stringify(state));
 const result=await page.evaluate(()=>{
  const damaged={name:'Caly',stars:27,stats:{attempts:'12',correct:7},
   mastery:{ma:{attempts:4,correct:3,lastSeen:'2026-09-01'},mi:null,mo:{attempts:'bad',correct:99,lastSeen:'2026-02-31'}},
   rewards:{collection:{broken:true},pieces:-1,puzzles:'bad'},
   reviewQueue:[null,{},'ma','not-a-syllable'],sound:-1,set:'bad',word:-7,
   missionHistory:[null,false,{date:'2026-09-01',primary:7,word:{},attempts:'2',correct:99,accuracy:'<img>'}],
   dailyMission:{date:localDayKey(),index:-1,steps:[null,null,null,null,null]},lastView:'home'};
  const clean=normalizeState(damaged);
  const safeCounters=clean.sound===0&&clean.set===0&&clean.word===0&&clean.mastery.mo.attempts===0&&clean.mastery.mo.lastSeen===null;
  const preserved=clean.stars===27&&clean.stats.attempts===12&&clean.mastery.ma.correct===3&&clean.rewards.collection.length===0;
  const safeHistory=clean.missionHistory.length===1&&clean.missionHistory[0].correct===2&&clean.missionHistory[0].accuracy===100;
  const safeRoots=[null,[],false,2,'broken'].every(x=>normalizeState(x).stars===0);
  const imported=parseProgressImport(JSON.stringify({app:'La Fabrique des Syllabes',state:{...damaged,mastery:{'word:moto':{attempts:4,correct:3}}}}));
  const importedWord=imported.mastery['word:moto'].correct===3&&imported.dailyMission===null;
  const rejectInvalid=[{stars:-1},{stats:{attempts:1,correct:2}},{stars:'bad'},[]].every(value=>{try{parseProgressImport(JSON.stringify({app:'La Fabrique des Syllabes',state:value}));return false}catch{return true}});
  state=normalizeState({});buildDailyMission();state.dailyMission.steps[0].title='<img src=x onerror="window.__injected=true">';
  missionHub();const escaped=!stage.querySelector('img')&&stage.textContent.includes('<img src=x');
  state=normalizeState(JSON.parse(JSON.stringify(state)));
  const missionRetained=validDailyMission(state.dailyMission)&&state.dailyMission.steps[0].title.includes('<img');
  // A stale completion screen must not mint a reward for a regenerated mission.
  state=normalizeState({...damaged,lastView:'mission-complete'});currentView='mission-complete';render();
  const noFalseReward=state.rewards.pieces===0&&state.missionHistory.length===1&&state.dailyMission.index===0;
  localStorage.setItem(guestKey(),JSON.stringify(damaged));
  return {safeCounters,preserved,safeHistory,safeRoots,importedWord,rejectInvalid,escaped,missionRetained,noFalseReward}
 });
 for(const [name,passed] of Object.entries(result))assert.equal(passed,true,`Saved state: ${name}`);
 await page.reload();await page.locator('[data-action="mission-start"]').first().waitFor();
 assert.equal(await page.evaluate(()=>state.stars),27,'partial corruption must not erase valid stars');
 for(const view of ['sounds','syllables','words','parents','collection']){
  await page.evaluate(view=>activate(view),view);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'stage','navigation focuses the new content');
  assert.equal(await page.locator('#stage').getByText('Petit problème technique').count(),0);
 }
 await page.locator('#accountBtn').click();
 await page.locator('[data-auth-tab="login"]').click();
 await page.locator('#loginEmail').focus();await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'loginPassword');
 assert.equal(await page.locator('#loginPassword').evaluate(el=>getComputedStyle(el).outlineStyle),'solid','keyboard outline remains visible');
 await page.keyboard.press('Escape');
 await page.evaluate(raw=>{state=normalizeState(JSON.parse(raw));missionMode=false;activate('home')},before);
 console.log('Saved state checks OK: damaged storage, safe imports, word tracking, mission guards and keyboard focus');
};
