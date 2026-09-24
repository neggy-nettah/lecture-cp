const assert=require('node:assert/strict');
module.exports=async function checkLongTermProgress(page){
 const before=await page.evaluate(()=>JSON.stringify(state));
 const result=await page.evaluate(()=>{
  const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  state=normalizeState({missionHistory:Array.from({length:60},(_,i)=>({date:day(i-60)}))});
  const migrated=completedMissionCount()===60&&bestMissionStreak()===60;
  buildDailyMission();state.dailyMission.index=5;state.dailyMission.completed=true;missionComplete();
  const advanced=completedMissionCount()===61&&state.missionHistory.length===60&&state.bestMissionStreak===61;
  missionComplete();const unique=completedMissionCount()===61;
  const imported=parseProgressImport(JSON.stringify({app:'La Fabrique des Syllabes',state}));
  const roundTrip=imported.missionCount===61&&imported.bestMissionStreak===61;
  // Date statistics ignore duplicates, invalid dates and accidental future entries.
  state=normalizeState({missionHistory:[{date:day(-1)},{date:day(-1)},{date:day(-2)},{date:day(-3)},{date:day(1)},{date:'invalid'}]});
  const dates=missionsLast7Days()===3&&missionDayStreak()===3&&completedMissionCount()===4;
  // Preserve an earned badge after its old rows leave the bounded history.
  state=normalizeState({missionCount:61,bestMissionStreak:3,missionHistory:[{date:day(-8)}]});
  const permanent=missionDayStreak()===0&&badgeData().find(x=>x.name==='3 jours de suite').ok;
  state.lastView='parents';save();return {migrated,advanced,unique,roundTrip,dates,permanent}
 });
 for(const [key,value] of Object.entries(result))assert.equal(value,true,'Long-term progress: '+key);
 await page.reload();await page.waitForFunction(()=>currentView==='parents');
 assert.equal(await page.evaluate(()=>completedMissionCount()),61);
 assert.equal(await page.evaluate(()=>bestMissionStreak()),3);
 assert.match(await page.locator('#stage').textContent(),/Meilleure série : 3 jour/);
 await page.evaluate(raw=>{state=normalizeState(JSON.parse(raw));missionMode=false;activate('home')},before);
 console.log('Long-term progress OK: 61st mission, bounded history, migration, import/reload, unique dates and lasting streak badge');
};
