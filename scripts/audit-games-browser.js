// Exercise every reachable curriculum tier in a real DOM. Audio output is stubbed:
// this checks game logic, not pronunciation quality or microphone hardware.
module.exports=async function auditGames(page){
 await page.setViewportSize({width:320,height:900});
 const result=await page.evaluate(()=>{
  const originals={speak,tone,confetti,starFx},counts={tiers:0,syllableQuestions:0,encoding:0,wordEncoding:0,families:0,wordBuilds:0,missingWords:0,pictures:0,sentences:0,readAloud:0,comprehension:0};
  speak=()=>{};tone=()=>{};confetti=()=>{};starFx=()=>{};
  const check=(ok,message)=>{if(!ok)throw Error('Exercise audit: '+message)};
  const buttons=action=>[...document.querySelectorAll(`[data-action="${action}"]`)];
  const answer=(action,target,wrongFirst=false)=>{
   check(document.documentElement.scrollWidth<=innerWidth+1,action+' mobile overflow');
   const choices=buttons(action);check(choices.length>=2,action+' has too few choices');
   check(new Set(choices.map(b=>b.dataset.value)).size===choices.length,action+' duplicate answers');
   check(choices.filter(b=>b.dataset.value===target).length===1,action+' missing/ambiguous answer '+target);
   if(wrongFirst){const wrong=choices.find(b=>b.dataset.value!==target);wrong.click();check(!locked&&wrong.disabled,action+' wrong choice handling')}
   const good=choices.find(b=>b.dataset.value===target);good.click();check(locked,action+' success did not lock');
   const snapshot=JSON.stringify([state.stats,state.stars,state.mastery]);good.click();check(JSON.stringify([state.stats,state.stars,state.mastery])===snapshot,action+' duplicate reward');
  };
  try{
   for(let tier=3;tier<=DATA.sets.length;tier++){
    state=normalizeState({mastery:{[DATA.sets[tier-1][0]]:{attempts:1,correct:0}},missionHistory:Array.from({length:14},(_,i)=>({date:'2020-01-'+String(i+1).padStart(2,'0')}))});
    missionMode=false;check(unlockedFamilyCount()===tier,'curriculum fixture');counts.tiers++;
    for(const target of activeLearningSyllables()){
     gameListen(target);answer('listen-answer',target,true);counts.syllableQuestions++;
     gameBubbles(target);answer('bubble-answer',target);counts.syllableQuestions++;
     gameEncode(target);
     check(document.documentElement.scrollWidth<=innerWidth+1,'encoding mobile overflow');
     const expected=syllableGraphemes(target),bank=buttons('encode-letter');
     check(bank.some(b=>b.dataset.value===expected[0])&&bank.some(b=>b.dataset.value===expected[1]),'encoding missing target letters '+target);
     const beforeCorrect=state.mastery[target]?.correct||0,beforeStars=state.stars;
     bank.find(b=>b.dataset.value===expected[0]).click();bank.find(b=>b.dataset.value===expected[1]).click();
     check(locked&&encodeMade.join('')===target,'encoding failed '+target);
     check((state.mastery[target]?.correct||0)===beforeCorrect+1,'encoding mastery missing '+target);
     const snapshot=JSON.stringify([state.stats,state.stars,state.mastery]);bank[0].click();check(JSON.stringify([state.stats,state.stars,state.mastery])===snapshot,'encoding duplicate reward');
     check(state.stars===beforeStars+1,'encoding reward missing '+target);counts.encoding++;
    }
    const correctionTarget=activeLearningSyllables()[0];gameEncode(correctionTarget);
    const expectedLetters=syllableGraphemes(correctionTarget),encodeButtons=buttons('encode-letter'),firstComponents=new Set(activeLearningSyllables().map(syllableGraphemes).filter(parts=>parts.length===2).map(parts=>parts[0])),wrongLetter=encodeButtons.find(b=>b.dataset.value!==expectedLetters[0]&&firstComponents.has(b.dataset.value));
    if(wrongLetter){
     const beforeMastery=state.mastery[correctionTarget]?.correct||0;
     wrongLetter.click();encodeButtons.find(b=>b.dataset.value===expectedLetters[1]).click();
     check(questionErrorRecorded&&state.reviewQueue.filter(x=>x===correctionTarget).length>=2,'encoding error not queued');
     locked=false;encodeMade=[];encodeButtons.forEach(b=>b.disabled=false);
     encodeButtons.find(b=>b.dataset.value===expectedLetters[0]).click();encodeButtons.find(b=>b.dataset.value===expectedLetters[1]).click();
     check((state.mastery[correctionTarget]?.correct||0)===beforeMastery,'corrected encoding inflated mastery');
    }
    for(let i=0;i<tier;i++){
     activate('syllables');state.set=i;syllables();startSyllableQuiz();answer('syllable-answer',currentAnswer,true);counts.syllableQuestions++;
     gameFamily(DATA.sets[i]);answer('family-answer',currentAnswer,true);counts.families++;
    }
    for(const word of decodableMissionWords()){
     check(!DEFERRED_WORDS.includes(word.w),'deferred word leaked');
     gameBuild(word);
     for(const part of word.parts){const b=buttons('build-token').find(b=>!b.disabled&&b.dataset.value===part);check(!!b,'missing duplicate construction token');b.click()}
     check(locked&&orderMade.join('')===word.w,'word cannot be assembled '+word.w);
     check(!state.mastery['word:'+word.w],'copying model awarded reading mastery');counts.wordBuilds++;
    }
    for(const word of missingSyllableWords()){
     gameMissing(word);const target=currentAnswer;const before=state.mastery[target]?.correct||0;
     check(!!document.querySelector('[data-action="missing-listen"]'),'missing word has no unambiguous audio prompt');
     answer('missing-answer',target,true);check((state.mastery[target]?.correct||0)===before,'corrected missing syllable inflated mastery');counts.missingWords++;
    }
    for(let n=0;n<10;n++){
     gamePicture();check(PICTURE_WORDS.includes(currentAnswer),'unreviewed image target');
     const target=currentAnswer,before=state.mastery['word:'+target]?.correct||0;
     document.querySelector('[data-action="picture-hint"]').click();answer('picture-answer',target);
     check((state.mastery['word:'+target]?.correct||0)===before,'audio hint awarded autonomous word mastery');counts.pictures++;
    }
    for(const sentence of decodableSentencePool()){
     const originalPick=pick;pick=pool=>pool.includes(sentence)?sentence:originalPick(pool);
     try{gameOrder()}finally{pick=originalPick}
     for(const part of sentence){const b=buttons('order-token').find(b=>!b.disabled&&b.dataset.value===part);check(!!b,'missing sentence token');b.click()}
     check(locked&&orderMade.join(' ')===sentence.join(' '),'unsolvable sentence');counts.sentences++;
    }
    for(const sentence of decodableSentencePool()){
     const before=JSON.stringify([state.stats,state.stars,state.mastery,state.rewardLedger,state.reviewQueue]);
     gameReadAloud(sentence);
     check(readAloudSentence.join(' ')===sentence.join(' '),'wrong read-aloud sentence');
     check(document.documentElement.scrollWidth<=innerWidth+1,'read-aloud mobile overflow');
     const model=document.querySelector('#readaloudModel');check(!!model&&model.hidden,'read-aloud model visible before attempt');
     document.querySelector('[data-action="readaloud-done"]').click();
     check(!model.hidden,'read-aloud model stayed hidden after attempt');
     check(JSON.stringify([state.stats,state.stars,state.mastery,state.rewardLedger,state.reviewQueue])===before,'read-aloud changed scored progress');
     counts.readAloud++;
    }
    for(const target of new Set(comprehensionSentencePool().map(x=>x.word.w))){
     gameComprehension(target);check(currentAnswer===target,'wrong comprehension target');
     const emojis=buttons('comprehension-answer').map(b=>b.textContent);check(new Set(emojis).size===emojis.length,'ambiguous images');
     answer('comprehension-answer',target,true);counts.comprehension++;
    }
   }
   state=normalizeState({missionHistory:Array.from({length:20},(_,i)=>({date:'2020-02-'+String(i+1).padStart(2,'0')})),mastery:Object.fromEntries(DATA.sets.flat().map(s=>[s,{attempts:4,correct:4,lastSeen:localDayKey()}]))});
   check(wordEncodingUnlocked(),'word encoding fixture is not ready');
   for(const word of wordEncodePool()){
    gameWordEncode(word);check(currentAnswer.w===word.w,'wrong dictated word target');
    check(document.documentElement.scrollWidth<=innerWidth+1,'word encoding mobile overflow');
    const before=state.mastery['word:'+word.w]?.correct||0;
    for(const part of word.parts){const b=buttons('word-encode-token').find(b=>!b.disabled&&b.dataset.value===part);check(!!b,'missing word encoding token '+word.w+':'+part);b.click()}
    check(locked&&wordEncodeMade.join('')===word.w,'word encoding failed '+word.w);
    check((state.mastery['word:'+word.w]?.correct||0)===before+1,'word encoding mastery missing '+word.w);
    const snapshot=JSON.stringify([state.stats,state.stars,state.mastery]);buttons('word-encode-token')[0]?.click();check(JSON.stringify([state.stats,state.stars,state.mastery])===snapshot,'word encoding duplicate reward '+word.w);counts.wordEncoding++;
   }
   state=normalizeState({});gamePicture();const independentTarget=currentAnswer;answer('picture-answer',independentTarget);
   check(state.mastery['word:'+independentTarget]?.correct===1,'independent picture answer lost mastery');
   for(const syllable of DATA.sets.flat())check(pronunciationMatches(syllable,syllable),'exact pronunciation rejected');
   check(!pronunciationMatches('me','mé')&&!pronunciationMatches('mé','me'),'e and é confused');
   check(!pronunciationMatches('ma','mari')&&!pronunciationMatches('la','lama'),'word prefix accepted as syllable');
   state=normalizeState({});buildDailyMission();state.dailyMission.index=4;state.dailyMission.steps[4].target='valise';startMissionStep();
   check(currentAnswer.w!=='valise'&&state.dailyMission.word===currentAnswer.w,'legacy mission retained deferred word');
   // Training buttons must never count as verified answers or rewards.
   state=normalizeState({});missionMode=false;activate('sounds');
   const before=JSON.stringify([state.stats,state.mastery,state.stars]);
   document.querySelector('[data-action="sound-repeat"]').click();activate('words');document.querySelector('[data-action="word-read"]').click();gamePronunciation();
   check(JSON.stringify([state.stats,state.mastery,state.stars])===before,'practice inflated results');
   check(!sentenceUnlocked(),'new profile has phrases unlocked');gameOrder();check(currentView==='games','phrase lock');gameComprehension();check(currentView==='games','comprehension lock');
   return counts;
  }finally{
   ({speak,tone,confetti,starFx}=originals);state=normalizeState({});missionMode=false;activate('home');
  }
 });
 console.log('Exercise audit OK:',JSON.stringify(result));return result;
};
