const assert=require('node:assert/strict');
module.exports=async function checkMissionBoundaries(page){
 const before=await page.evaluate(()=>JSON.stringify(state));
 // Finish the last exercise, then close/reload before opening the reward screen.
 await page.evaluate(()=>{
  state=normalizeState({rewards:{pieces:3}});buildDailyMission();
  state.dailyMission.index=4;startMissionStep();
 });
 const parts=await page.evaluate(()=>orderTarget);
 for(const part of parts)await page.locator(`[data-action="build-token"][data-value="${part}"]:not(:disabled)`).first().click();
 assert.deepEqual(await page.evaluate(()=>({history:state.missionHistory.length,puzzles:state.rewards.puzzles,pieces:state.rewards.pieces})),{history:1,puzzles:1,pieces:0});
 await page.reload();await page.locator('[data-action="mission-next"]').waitFor();
 await page.locator('[data-action="mission-next"]').click();
 assert.equal(await page.getByText('Nouveau trésor !',{exact:true}).count(),1,'reward remains visible after reload');
 await page.evaluate(()=>missionComplete());
 assert.equal(await page.evaluate(()=>state.rewards.puzzles),1,'reward cannot be collected twice');
 // Recover a completed mission created before immediate reward recording existed.
 const oldDay=await page.evaluate(()=>{
  state=normalizeState({stars:14,rewards:{pieces:2}});buildDailyMission();
  const old=new Date();old.setDate(old.getDate()-1);
  const date=old.getFullYear()+'-'+String(old.getMonth()+1).padStart(2,'0')+'-'+String(old.getDate()).padStart(2,'0');
  Object.assign(state.dailyMission,{date,index:5,completed:true});state.lastView='home';save();return date;
 });
 await page.reload();await page.locator('[data-action="mission-start"]').first().waitFor();
 assert.deepEqual(await page.evaluate(()=>({date:state.missionHistory[0]?.date,pieces:state.rewards.pieces,index:state.dailyMission.index,stars:state.stars})),{date:oldDay,pieces:3,index:0,stars:14});
 await page.reload();await page.locator('[data-action="mission-start"]').first().waitFor();
 assert.equal(await page.evaluate(()=>state.rewards.pieces),3);
 // An answer on yesterday's still-visible exercise must not validate today's step.
 await page.evaluate(()=>{
  state=normalizeState({});buildDailyMission();state.dailyMission.index=1;startMissionStep();
  window.__originalDay=localDayKey;
  const next=new Date();next.setDate(next.getDate()+1);
  const date=next.getFullYear()+'-'+String(next.getMonth()+1).padStart(2,'0')+'-'+String(next.getDate()).padStart(2,'0');
  localDayKey=()=>date;
 });
 try{
  const answer=await page.evaluate(()=>currentAnswer);
  await page.locator(`[data-action="listen-answer"][data-value="${answer}"]`).click();
  assert.deepEqual(await page.evaluate(()=>({index:state.dailyMission.index,attempts:state.stats.attempts,stars:state.stars})),{index:0,attempts:0,stars:0});
  assert.equal(await page.getByRole('status').filter({hasText:'Un nouveau jour commence'}).count(),1);
 }finally{
  await page.evaluate(raw=>{localDayKey=window.__originalDay;delete window.__originalDay;state=normalizeState(JSON.parse(raw));missionMode=false;activate('home')},before);
 }
 console.log('Mission boundaries OK: immediate reward, reload, old completed mission, idempotency and day rollover');
};
