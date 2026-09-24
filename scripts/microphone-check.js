// Lifecycle tests use simulated permission, stream and recognition events; no real recording.
const assert=require('node:assert/strict');
module.exports=async function microphoneCheck(page){
 await page.evaluate(()=>{
  window.__mic={originals:{openMicrophone,createVoiceGate,sleep,speak,tone,confetti,SpeechRecognition:window.SpeechRecognition,setTimeout:window.setTimeout},requests:[],recognizers:[],stopped:0,gatesClosed:0,heard:true,timers:[]};
  openMicrophone=()=>new Promise(resolve=>__mic.requests.push(resolve));
  createVoiceGate=()=>{if(__mic.gateThrows)throw Error('simulated audio init failure');return {heardVoice:()=>__mic.heard,stop:()=>__mic.gatesClosed++}};
  sleep=()=>Promise.resolve();speak=()=>{};tone=()=>{};confetti=()=>{};
  window.setTimeout=(fn,ms,...args)=>{if(ms===8000||ms===12000){__mic.timers.push(fn);return __mic.originals.setTimeout.call(window,()=>{},60000)}return __mic.originals.setTimeout.call(window,fn,ms,...args)};
  window.SpeechRecognition=class {constructor(){__mic.recognizers.push(this)}start(){this.onstart?.()}abort(){this.aborted=true}};
  __mic.grant=()=>__mic.requests.shift()({getTracks:()=>[{stop:()=>__mic.stopped++}]});
  state=normalizeState({streak:4});gamePronunciation();
 });
 try{
  // One request even when called twice, then late permission after navigation.
  await page.evaluate(()=>{void startPronunciationRecognition();void startPronunciationRecognition()});
  assert.equal(await page.evaluate(()=>__mic.requests.length),1);
  await page.evaluate(()=>{activate('home');__mic.grant()});
  await page.waitForFunction(()=>__mic.stopped===1);
  assert.equal(await page.evaluate(()=>__mic.recognizers.length),0);
  // An active recognition is aborted on navigation; already queued callbacks are harmless.
  await page.evaluate(()=>{gamePronunciation();void startPronunciationRecognition();__mic.grant()});
  await page.waitForFunction(()=>__mic.recognizers.length===1);
  await page.evaluate(()=>{__mic.lateResult=__mic.recognizers[0].onresult;__mic.expected=currentAnswer;gameListen('ma')});
  await page.waitForFunction(()=>__mic.recognizers[0].aborted===true);
  const before=await page.evaluate(()=>JSON.stringify([state.stats,state.mastery,state.stars,state.streak]));
  await page.evaluate(()=>__mic.lateResult({results:[[{transcript:__mic.expected}]]}));
  assert.equal(await page.evaluate(()=>locked),false);
  assert.equal(await page.evaluate(()=>JSON.stringify([state.stats,state.mastery,state.stars,state.streak])),before);
  // The stop button closes the track and allows retry.
  await page.evaluate(()=>{gamePronunciation();void startPronunciationRecognition();__mic.grant()});
  await page.waitForFunction(()=>__mic.recognizers.length===2);
  await page.locator('[data-action="pronunciation-stop"]').click();
  assert.equal(await page.evaluate(()=>pronunciationSession),null);
  assert.equal(await page.locator('[data-action="pronunciation-record"]').isDisabled(),false);
  // Missing voice and wrong recognition do not penalize the learning streak.
  for(const heard of [false,true]){
   await page.evaluate(heard=>{__mic.heard=heard;void startPronunciationRecognition();__mic.grant()},heard);
   await page.waitForFunction(()=>!!pronunciationSession?.recognition);
   await page.evaluate(()=>pronunciationSession.recognition.onresult({results:[[{transcript:'incompréhensible'}]]}));
   assert.equal(await page.evaluate(()=>JSON.stringify([state.stats,state.mastery,state.stars,state.streak])),before);
  }
  // Successful practice still awards no mastery or reward.
  await page.evaluate(()=>{void startPronunciationRecognition();__mic.grant()});
  await page.waitForFunction(()=>!!pronunciationSession?.recognition);
  await page.evaluate(()=>pronunciationSession.recognition.onresult({results:[[{transcript:currentAnswer}]]}));
  assert.equal(await page.evaluate(()=>locked),true);
  assert.equal(await page.evaluate(()=>JSON.stringify([state.stats,state.mastery,state.stars,state.streak])),before);
  // Cleanup must also run if the audio gate cannot initialize.
  await page.evaluate(()=>{gamePronunciation();__mic.gateThrows=true;void startPronunciationRecognition();__mic.grant()});
  await page.waitForFunction(()=>pronunciationSession===null);
  assert.equal(await page.locator('[data-action="pronunciation-record"]').isDisabled(),false);
  // A silent recognizer (no onstart/onend) still times out and releases resources.
  await page.evaluate(()=>{__mic.gateThrows=false;window.SpeechRecognition.prototype.start=function(){};void startPronunciationRecognition();__mic.grant()});
  await page.waitForFunction(()=>!!pronunciationSession?.recognition);
  await page.evaluate(()=>__mic.timers.at(-1)());
  assert.equal(await page.evaluate(()=>pronunciationSession),null);
  assert.equal(await page.evaluate(()=>__mic.recognizers.at(-1).aborted),true);
  assert.equal(await page.evaluate(()=>__mic.stopped),8);
  // Recognition errors and a backgrounded page release the same resources.
  for(const reason of ['error','hidden']){
   await page.evaluate(()=>{gamePronunciation();void startPronunciationRecognition();__mic.grant()});
   await page.waitForFunction(()=>!!pronunciationSession?.recognition);
   await page.evaluate(reason=>{
    if(reason==='error')pronunciationSession.recognition.onerror({error:'network'});
    else{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden}
   },reason);
   assert.equal(await page.evaluate(()=>pronunciationSession),null);
  }
  assert.equal(await page.evaluate(()=>__mic.stopped),10);
  console.log('Microphone lifecycle OK: duplicate requests, late permission/results, navigation, stop, no-voice, practice, initialization failure and silent timeout.');
 }finally{
  await page.evaluate(()=>{stopPronunciationSession();const o=__mic.originals;({openMicrophone,createVoiceGate,sleep,speak,tone,confetti}=o);window.SpeechRecognition=o.SpeechRecognition;window.setTimeout=o.setTimeout;state=normalizeState({});activate('home');delete window.__mic});
 }
};
