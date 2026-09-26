const assert=require('node:assert/strict');
module.exports=async function checkParentDetail(page){
 const before=await page.evaluate(()=>JSON.stringify(state));
 await page.evaluate(()=>{
  state=normalizeState({mastery:{ma:{attempts:1,correct:0},mi:{attempts:1,correct:1},mo:{attempts:4,correct:4}}});
  buildDailyMission();state.dailyMission.index=2;save();activate('parents');
 });
 const summary=await page.evaluate(()=>masterySummary());
 assert.equal(summary.needsReview,1);assert.equal(summary.learning,1);assert.equal(summary.mastered,1);assert.equal(summary.unseen,summary.total-3);
 assert.equal(summary.needsReview+summary.learning+summary.mastered+summary.unseen,summary.total);
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:900});
  await page.locator('details.card summary').click();
  assert.equal(await page.locator('[data-action="parent-syllable-review"]').count(),summary.total);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Expanded parent detail at ${width}px`);
  await page.locator('details.card summary').click();
 }
 await page.locator('details.card summary').click();
 const future=await page.evaluate(()=>DATA.sets.at(-1)[0]);
 assert.equal(await page.locator(`[data-action="parent-syllable-review"][data-target="${future}"]`).isDisabled(),true);
 const mission=await page.evaluate(()=>JSON.stringify(normalizeState(state).dailyMission));
 await page.locator('[data-action="parent-syllable-review"][data-target="mu"]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.evaluate(()=>currentAnswer),'mu');assert.equal(await page.evaluate(()=>missionMode),false);
 await page.locator('[data-action="listen-answer"][data-value="mu"]').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(normalizeState(state).dailyMission)),mission);
 await page.getByRole('button',{name:'← Retour au bilan'}).click();
 assert.equal(await page.evaluate(()=>masterySummary().unseen),summary.unseen-1);
 await page.locator('[data-action="parent-review"]').first().click();
 await page.reload();await page.waitForFunction(()=>currentView==='parents');
 assert.equal(await page.evaluate(()=>JSON.stringify(normalizeState(state).dailyMission)),mission);

 // Parent-targeted VC/CVC reviews must not alter the daily mission.
 await page.evaluate(()=>{
  const cv=DATA.sets.slice(0,BASIC_CV_FAMILY_COUNT).flat().slice(0,VC_STRUCTURE_MIN_SECURE),mastery=Object.fromEntries(cv.map(x=>[x,{attempts:2,correct:2,lastSeen:localDayKey()}]));
  mastery[structureMasteryKey('il')]={attempts:1,correct:0,lastSeen:localDayKey()};
  state=normalizeState({mastery});buildDailyMission();save();activate('parents');
 });
 const structureMission=await page.evaluate(()=>JSON.stringify(normalizeState(state).dailyMission));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Parent structure review overflows');
 const structureButton=page.locator('[data-action="parent-structure-review"][data-kind="vc"][data-target="il"]');
 assert.equal(await structureButton.count(),1,'Failed VC structure is not surfaced to parent');
 await structureButton.click();
 assert.equal(await page.evaluate(()=>currentAnswer),'il');assert.equal(await page.evaluate(()=>missionMode),false);
 await page.locator('[data-action="structure-answer"][data-value="il"]').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(normalizeState(state).dailyMission)),structureMission);
 await page.getByRole('button',{name:'← Retour au bilan'}).click();
 assert.equal(await page.evaluate(()=>currentView),'parents');

 await page.evaluate(raw=>{state=normalizeState(JSON.parse(raw));missionMode=false;activate('home')},before);
 console.log('Parent detail OK: CV and VC/CVC targeted practice, return/reload, and mission isolation');
};
