const assert=require('node:assert/strict');
module.exports=async function checkPracticeNavigation(page){
 const before=await page.evaluate(()=>JSON.stringify(state));
 await page.evaluate(()=>{state=normalizeState({});activate('sounds')});
 await page.locator('[data-action="sound-repeat"]').click();
 assert.equal(await page.locator('.sound-tile.practiced').count(),1);
 assert.match(await page.locator('.tip').textContent(),/1 \/ /);
 assert.equal(await page.evaluate(()=>state.stars),0,'practice must not award stars');
 for(const [view,actions] of [['sounds',['sound-next','sound-prev','sound-repeat']],['syllables',['set-next','set-prev']],['words',['word-next','word-prev','word-read']]]){
  await page.evaluate(view=>activate(view),view);
  for(const action of actions){
   await page.locator(`[data-action="${action}"]`).focus();await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),action,`focus lost after ${action}`);
  }
 }
 await page.evaluate(()=>gameMemory());
 const pairs=await page.evaluate(()=>[...new Set(memoryDeck.map(x=>x.pair))].map(p=>memoryDeck.map((x,i)=>x.pair===p?i:-1).filter(i=>i>=0)));
 for(const [a,b] of pairs){
  for(const index of [a,b])await page.locator(`[data-action="memory-card"][data-index="${index}"]`).click();
  assert.equal(await page.locator(`[data-index="${a}"]`).isDisabled(),true);
 }
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'game-memory');
 await page.evaluate(()=>{state=normalizeState({});buildDailyMission();state.dailyMission.index=1;startMissionStep()});
 const answer=await page.evaluate(()=>currentAnswer);
 await page.locator(`[data-action="listen-answer"][data-value="${answer}"]`).click();
 await page.waitForFunction(()=>document.activeElement?.dataset.action==='mission-continue');
 await page.evaluate(raw=>{state=normalizeState(JSON.parse(raw));missionMode=false;activate('home')},before);
 console.log('Practice navigation OK: immediate counters, keyboard card browsing, matched Memory cards and mission continuation');
};
