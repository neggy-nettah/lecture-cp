const fs=require("fs");
const vm=require("vm");

const src=fs.readFileSync("content.js","utf8");
const context=vm.createContext({});
try{vm.runInContext(src,context,{timeout:1000})}
catch(error){console.error("CONTENT VALIDATION FAILED: syntax/runtime",error);process.exit(1)}

const data=vm.runInContext("DATA",context);
const miniTexts=vm.runInContext("MINI_TEXTS",context);
const cpRoadmap=vm.runInContext("CP_READING_ROADMAP",context);
const cpMilestones=vm.runInContext("CP_OFFICIAL_MILESTONES",context);
const cgpExpansionPlan=vm.runInContext("CGP_EXPANSION_PLAN",context);
const syllableOverrides=vm.runInContext("SYLLABLE_GRAPHEME_OVERRIDES",context);
const deferredWords=vm.runInContext("DEFERRED_WORDS",context);
const silentFinalEWords=vm.runInContext("SILENT_FINAL_E_WORDS",context);
const silentEPracticeWords=vm.runInContext("SILENT_E_PRACTICE_WORDS",context);
const basicCvFamilyCount=vm.runInContext("BASIC_CV_FAMILY_COUNT",context);
const pictureWords=vm.runInContext("PICTURE_WORDS",context);
const pictures=data.words.filter(w=>pictureWords.includes(w.w));
if(pictures.length!==pictureWords.length||new Set(pictures.map(w=>w.emoji)).size!==pictures.length)throw Error("Ambiguous or missing picture vocabulary");
const collectibles=vm.runInContext("COLLECTIBLES",context);
const zones=vm.runInContext("WORLD_ZONES",context);

function fail(message,details=""){
  console.error("CONTENT VALIDATION FAILED:",message,details);
  process.exit(1);
}
function duplicates(arr){return [...new Set(arr.filter((x,i,a)=>a.indexOf(x)!==i))]}

if(!Array.isArray(cpRoadmap)||cpRoadmap.length<8)fail("CP reading roadmap is incomplete.");
const roadmapIds=new Set(cpRoadmap.map(x=>x.id));
for(const id of ["cg-basic","encode-basic","words-basic","sentences-basic","orthography-rules","complex-graphemes","fluency-prosody","texts-comprehension"]){
  if(!roadmapIds.has(id))fail("Missing CP roadmap stage:",id);
}
for(const stage of cpRoadmap){
  if(!stage.label||!Array.isArray(stage.skills)||!stage.skills.length||!Array.isArray(stage.app))fail("Invalid CP roadmap stage:",stage.id);
}

if(!syllableOverrides||typeof syllableOverrides!=="object"||Array.isArray(syllableOverrides))fail("Syllable grapheme overrides must be an object.");
for(const [syllable,parts] of Object.entries(syllableOverrides)){
  if(!Array.isArray(parts)||parts.length<2||parts.some(x=>typeof x!=="string"||!x)||parts.join("")!==syllable)fail("Invalid syllable grapheme override:",syllable);
}
if(!Array.isArray(cgpExpansionPlan)||cgpExpansionPlan.length<4)fail("CGP expansion plan is incomplete.");
const expansionIds=new Set(cgpExpansionPlan.map(x=>x.id));
for(const id of ["stable-single","consonant-digraph","vowel-complex","context-sensitive"]){
  if(!expansionIds.has(id))fail("Missing CGP expansion stage:",id);
}
const contextStage=cgpExpansionPlan.find(x=>x.id==="context-sensitive");
if(!contextStage?.graphemes?.includes("c")||!contextStage?.graphemes?.includes("g")||contextStage.mode!=="planned-rule")fail("Context-sensitive c/g handling is no longer protected.");
const stableStage=cgpExpansionPlan.find(x=>x.id==="stable-single"),digraphStage=cgpExpansionPlan.find(x=>x.id==="consonant-digraph");
if(stableStage?.mode!=="active"||!["z","k"].every(g=>stableStage.graphemes.includes(g)&&data.familyGraphemes?.includes(g)))fail("Active z/k progression metadata is inconsistent.");
if(digraphStage?.mode!=="active"||!digraphStage.graphemes.includes("ch")||!data.familyGraphemes?.includes("ch"))fail("Active ch progression metadata is inconsistent.");
if(!Array.isArray(cpMilestones)||cpMilestones.length<2)fail("Official CP milestones are missing.");
const period1=cpMilestones.find(x=>x.id==="period-1"),midyear=cpMilestones.find(x=>x.id==="midyear");
if(period1?.cgpMin!==12||period1?.cgpMax!==15||midyear?.cgpMin!==25||midyear?.cgpMax!==30)fail("Official CP CGP milestones changed unexpectedly.");
if(cpRoadmap.findIndex(x=>x.id==="complex-graphemes")>cpRoadmap.findIndex(x=>x.id==="orthography-rules"))fail("CGP expansion must precede silent-letter rules in the current roadmap.");

if(!Array.isArray(data.sounds)||data.sounds.length<10)fail("Sound list is missing or too small.");
if(!Array.isArray(data.sets)||data.sets.length<10)fail("Expected at least 10 syllable families.");
const EXPECTED_FAMILIES=["m","l","s","r","f","v","p","t","n","b","d","j","z","k","ch"];
if(data.familyGraphemes?.join("|")!==EXPECTED_FAMILIES.join("|")||data.sets.length!==EXPECTED_FAMILIES.length)fail("CP syllable-family progression changed unexpectedly.");
if(basicCvFamilyCount!==14)fail("Basic CV family boundary changed unexpectedly.");
for(const vowel of ["a","e","i","o","u","é"]){
 const syllable="ch"+vowel,parts=syllableOverrides[syllable];
 if(!Array.isArray(parts)||parts[0]!=="ch"||parts[1]!==vowel)fail("Missing ch grapheme override:",syllable);
}

if(!Array.isArray(data.familyGraphemes)||data.familyGraphemes.length!==data.sets.length)fail("Syllable family grapheme metadata is incomplete.");
if(!Array.isArray(data.words)||data.words.length<35)fail("Word bank is unexpectedly small.");
for(const expected of [
 {w:"judo",parts:["ju","do"]},{w:"joli",parts:["jo","li"]},
 {w:"zébu",parts:["zé","bu"]},{w:"zéro",parts:["zé","ro"]},
 {w:"kilo",parts:["ki","lo"]},{w:"kaki",parts:["ka","ki"]},{w:"kimono",parts:["ki","mo","no"]},
 {w:"chéri",parts:["ché","ri"]},{w:"chili",parts:["chi","li"]}
]){
  const word=data.words.find(x=>x.w===expected.w);
  if(!word||word.parts.join("|")!==expected.parts.join("|"))fail("Missing or malformed advanced word:",expected.w);
}

if(!Array.isArray(data.sentences)||data.sentences.length<10)fail("Sentence bank is unexpectedly small.");

if(!Array.isArray(miniTexts)||miniTexts.length<8)fail("Mini-text corpus is unexpectedly small.");
const miniIds=duplicates(miniTexts.map(x=>x.id));if(miniIds.length)fail("Duplicate mini-text ids:",miniIds.join(", "));
const sentenceKeys=new Set(data.sentences.map(sentence=>sentence.join("\u0000"))),wordSet=new Set(data.words.map(w=>w.w));
for(const item of miniTexts){
  if(!item.id||!["subject","object"].includes(item.kind)||!Array.isArray(item.sentences)||item.sentences.length!==2||!item.question||!item.answer||!Array.isArray(item.choices)||item.choices.length<2)fail("Malformed mini-text:",JSON.stringify(item));
  if(item.sentences.some(sentence=>!sentenceKeys.has(sentence.join("\u0000"))))fail("Mini-text uses an unvalidated sentence:",item.id);
  if(new Set(item.choices).size!==item.choices.length||!item.choices.includes(item.answer))fail("Ambiguous mini-text choices:",item.id);
  const subjects=item.sentences.map(sentence=>String(sentence[0]||""));
  const objects=item.sentences.map(sentence=>[...sentence].reverse().map(token=>String(token).toLowerCase().replace(/[.!?,;:]/g,"")).find(token=>wordSet.has(token))||"");
  const grounded=item.kind==="subject"?subjects:objects;
  if(item.choices.some(choice=>!grounded.includes(choice))||!grounded.includes(item.answer))fail("Mini-text answer is not grounded in its sentences:",item.id);
}
if(!miniTexts.some(x=>x.kind==="subject")||!miniTexts.some(x=>x.kind==="object"))fail("Mini-text questions must cover both subject and object comprehension.");

const soundKeys=data.sounds.map(x=>x.g);
const dupSounds=duplicates(soundKeys);
if(dupSounds.length)fail("Duplicate sound graphemes:",dupSounds.join(", "));
for(const grapheme of data.familyGraphemes){
  if(!soundKeys.includes(grapheme))fail("Missing sound entry for syllable-family grapheme:",grapheme);
}
for(const s of data.sounds){
  if(!s.g||!s.say||!s.hint||!s.emoji)fail("Malformed sound entry:",JSON.stringify(s));
}

const syllables=data.sets.flat();
const dupSyllables=duplicates(syllables);
if(dupSyllables.length)fail("Duplicate syllables:",dupSyllables.join(", "));
const familyVowels=["a","e","i","o","u","é"];
for(const [index,family] of data.sets.entries()){
  if(family.length!==familyVowels.length)fail("Each syllable family must contain "+familyVowels.length+" syllables:",family.join(", "));
  const grapheme=data.familyGraphemes[index];
  if(!grapheme||!family.every(s=>s.startsWith(grapheme)))fail("Mixed family grapheme:",family.join(", "));
  if(!familyVowels.every(v=>family.includes(grapheme+v)))fail("Incomplete vowel pattern inside a family:",family.join(", "));
}

const wordNames=data.words.map(x=>x.w);
const dupWords=duplicates(wordNames);
if(dupWords.length)fail("Duplicate words:",dupWords.join(", "));
for(const w of data.words){
  if(!w.w||!Array.isArray(w.parts)||!w.parts.length||!w.emoji)fail("Malformed word:",JSON.stringify(w));
  if(w.parts.some(p=>!p||typeof p!=="string"))fail("Invalid word part:",w.w);
}
const exactWords=data.words.filter(w=>w.parts.join("")===w.w);
if(exactWords.length<30)fail("Too few exactly assembled words:",String(exactWords.length));

const taughtParts=new Set([...syllables,"a","e","i","o","u","é"]);
const fullyDecodable=data.words.filter(w=>w.parts.join("")===w.w&&w.parts.every(p=>taughtParts.has(p))&&!deferredWords.includes(w.w));
if(fullyDecodable.length<40)fail("Too few fully decodable words with taught graphemes:",String(fullyDecodable.length));
for(const expected of ["menu","poli","puni","revu","relu","pari","rami","vomi","domino","dodo","midi","radio","défi","dino"]){
  if(!fullyDecodable.some(w=>w.w===expected))fail("Expected regular CV word is not fully decodable:",expected);
}
if(!silentFinalEWords.every(w=>deferredWords.includes(w)))fail("Silent-final-e vocabulary must stay deferred until the rule is taught.");
if(!Array.isArray(silentEPracticeWords)||silentEPracticeWords.length<5||silentEPracticeWords.some(w=>!silentFinalEWords.includes(w)||!data.words.some(x=>x.w===w)))fail("Silent-e practice vocabulary is invalid.");
for(const deferred of ["maman","robot","tapis",...deferredWords]){
  if(fullyDecodable.some(w=>w.w===deferred))fail("Word with an untaught rule became decodable too early:",deferred);
}
if(pictureWords.some(w=>deferredWords.includes(w)))fail("A deferred word remains in the picture-answer bank.");

for(const sentence of data.sentences){
  if(!Array.isArray(sentence)||sentence.length<3)fail("Malformed sentence:",JSON.stringify(sentence));
  if(sentence.some(token=>typeof token!=="string"||!token.trim()))fail("Invalid sentence token:",JSON.stringify(sentence));
  const last=sentence[sentence.length-1];
  if(!/[.!?]$/.test(last))fail("Sentence must end with punctuation:",sentence.join(" "));
}
const sentenceStrings=data.sentences.map(x=>x.join(" "));
const dupSentences=duplicates(sentenceStrings);
if(dupSentences.length)fail("Duplicate sentences:",dupSentences.join(" | "));

if(!Array.isArray(collectibles)||collectibles.length<5)fail("Collectible bank is too small.");
if(duplicates(collectibles.map(x=>x.id)).length)fail("Duplicate collectible ids.");
if(collectibles.some(x=>!x.id||!x.name||!x.emoji))fail("Malformed collectible.");

if(!Array.isArray(zones)||zones.length<4)fail("World zone list is too small.");
if(duplicates(zones.map(x=>x.id)).length)fail("Duplicate world zone ids.");
let previous=-1;
for(const z of zones){
  if(!z.id||!z.name||!z.emoji||!Number.isFinite(z.need))fail("Malformed world zone:",JSON.stringify(z));
  if(z.need<=previous)fail("World zone mission thresholds must increase:",z.id);
  previous=z.need;
}

console.log("Content validation OK");
console.log("- Sounds:",data.sounds.length);
console.log("- Syllable families:",data.sets.length);
console.log("- Syllables:",syllables.length);
console.log("- Words:",data.words.length);
console.log("- Exactly assembled words:",exactWords.length);
console.log("- Fully decodable with taught graphemes:",fullyDecodable.length);
console.log("- Sentences:",data.sentences.length);
console.log("- Collectibles:",collectibles.length);
console.log("- World zones:",zones.length);
