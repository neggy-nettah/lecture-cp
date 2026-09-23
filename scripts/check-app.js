const fs=require("fs");

const html=fs.readFileSync("index.html","utf8");
const main=html.match(/<script>\s*"use strict";([\s\S]*?)<\/script>/);

if(!main){
  console.error("Main application script not found.");
  process.exit(1);
}

try{
  new Function('"use strict";'+main[1]);
}catch(error){
  console.error("JavaScript syntax error:",error.message);
  process.exit(1);
}

const required=[
  "function normalizeState(",
  "function buildDailyMission(",
  "function completeMissionStep(",
  "function rewardVerified(",
  "function masteryLevel(",
  "function gameMemory(",
  "function gameFamily(",
  "function worldView(",
  "function collectionView(",
  "function parents("
];

const missing=required.filter(token=>!html.includes(token));
if(missing.length){
  console.error("Missing required app functions:",missing.join(", "));
  process.exit(1);
}

const words=(html.match(/{w:"/g)||[]).length;
if(words<20){
  console.error("Unexpectedly low reading content:",words,"words");
  process.exit(1);
}

if(!html.includes('function speakMission(text,rate=.60){speak(text,rate)}')){
  console.error("Audio engine changed. Review the known Safari macOS issue before merging.");
  process.exit(1);
}

console.log("App validation OK");
console.log("- JavaScript syntax: OK");
console.log("- Core functions: OK");
console.log("- Reading words:",words);
console.log("- Audio guard: unchanged");
