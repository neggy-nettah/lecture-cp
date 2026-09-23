const fs=require("fs");
const vm=require("vm");

const html=fs.readFileSync("index.html","utf8");
const main=html.match(/<script>\s*"use strict";([\s\S]*?)<\/script>/);
if(!main){
  console.error("Main script not found");
  process.exit(1);
}

function makeClassList(){
  const set=new Set();
  return {
    add:(...v)=>v.forEach(x=>set.add(x)),
    remove:(...v)=>v.forEach(x=>set.delete(x)),
    contains:v=>set.has(v),
    toggle:(v,on)=>{if(on===undefined){if(set.has(v)){set.delete(v);return false}set.add(v);return true}if(on)set.add(v);else set.delete(v);return !!on}
  };
}
function makeElement(){
  return {
    textContent:"",
    innerHTML:"",
    value:"",
    checked:false,
    disabled:false,
    style:{},
    dataset:{},
    className:"",
    classList:makeClassList(),
    appendChild(){},
    remove(){},
    addEventListener(){},
    scrollIntoView(){},
    focus(){},
    closest(){return null}
  };
}

const elements=new Map();
const getEl=key=>{
  if(!elements.has(key))elements.set(key,makeElement());
  return elements.get(key);
};

const documentMock={
  querySelector:sel=>getEl(sel),
  querySelectorAll:()=>[],
  createElement:()=>makeElement(),
  addEventListener(){},
  body:makeElement()
};

const local=new Map();
const localStorageMock={
  getItem:k=>local.has(k)?local.get(k):null,
  setItem:(k,v)=>local.set(k,String(v)),
  removeItem:k=>local.delete(k)
};

const sandbox={
  console,
  document:documentMock,
  localStorage:localStorageMock,
  navigator:{userAgent:"SmokeTestBrowser",maxTouchPoints:0,onLine:true},
  location:{href:"https://example.test/lecture-cp/"},
  confirm:()=>true,
  prompt:()=>"",
  alert:()=>{},
  setTimeout:(fn)=>{ if(typeof fn==="function")fn(); return 1; },
  clearTimeout:()=>{},
  requestAnimationFrame:()=>1,
  cancelAnimationFrame:()=>{},
  Date,
  Math,
  JSON,
  Set,
  Map,
  Promise,
  Uint8Array
};
sandbox.window=sandbox;
sandbox.window.addEventListener=()=>{};
sandbox.window.scrollTo=()=>{};
sandbox.window.isSecureContext=true;
sandbox.window.innerWidth=390;
sandbox.window.innerHeight=844;
sandbox.window.supabase=undefined;

const context=vm.createContext(sandbox);

try{
  vm.runInContext('"use strict";'+main[1],context,{timeout:2000});
}catch(error){
  console.error("Runtime boot failed:",error);
  process.exit(1);
}

const probes=[
  'typeof normalizeState==="function"',
  'typeof buildDailyMission==="function"',
  'typeof decodableMissionWords==="function"',
  'typeof worldView==="function"',
  'typeof collectionView==="function"',
  'typeof diagnosticText==="function"',
  'normalizeState({}).stars===0',
  'decodableMissionWords().length>=20',
  'decodableMissionWords().every(w=>w.parts.join("")===w.w)',
  'getDailyMission().steps.length===5',
  'getDailyMission().startAttempts===null',
  '(startMissionStep(),getDailyMission().startAttempts!==null)',
  'normalizeState({stars:2}).attemptLedger!=null',
  'normalizeState({stars:2}).updatedAt===0',
  '(state=normalizeState({}),recordAttempt(true,"ma","smoke:ma"),recordAttempt(true,"ma","smoke:ma"),state.stats.correct===1&&state.mastery.ma.correct===1)'
];

for(const probe of probes){
  let ok=false;
  try{ok=!!vm.runInContext(probe,context,{timeout:500})}
  catch(error){
    console.error("Smoke probe threw:",probe,error);
    process.exit(1);
  }
  if(!ok){
    console.error("Smoke probe failed:",probe);
    process.exit(1);
  }
}

console.log("Runtime smoke test OK");
console.log("- Application booted with Supabase unavailable");
console.log("- Core functions callable");
console.log("- Daily mission contains 5 steps");
console.log("- Mission stats start only when the mission starts");
console.log("- Legacy state migration: OK");
console.log("- Duplicate mastery guard: OK");
console.log("- Mission words assemble exactly");
