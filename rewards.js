"use strict";
// Rewards and encouragement. Calls the shared save and UI functions at runtime.
// Keep reward accounting separate from mastery in progression.js.

function advanceRewards(){
 state.rewards=state.rewards||{towardPiece:0,pieces:0,puzzles:0,collection:[]};
 state.rewards.towardPiece=0;state.rewards.pieces++;
 if(state.rewards.pieces<4)return {piece:true,complete:false};
 state.rewards.pieces=0;state.rewards.puzzles++;
 const item=COLLECTIBLES[(state.rewards.puzzles-1)%COLLECTIBLES.length];
 if(!state.rewards.collection.some(x=>x.id===item.id))state.rewards.collection.push(item);
 return {piece:true,complete:true,item};
}
function rewardVerified(msg="Bravo !",challengeKey=""){
 state.rewardLedger=state.rewardLedger||{};
 const scoped=scopedChallengeKey(challengeKey),key=scoped?localDayKey()+"|"+scoped:"";
 if(key&&state.rewardLedger[key]){
  tone("ok");toast("✅ "+msg+" Déjà récompensé aujourd’hui.","ok");return false
 }
 if(key)state.rewardLedger[key]=1;
 const keys=Object.keys(state.rewardLedger);if(keys.length>500)keys.slice(0,keys.length-300).forEach(k=>delete state.rewardLedger[k]);
 state.stars++;state.streak++;save();tone("ok");starFx();toast("🌟 "+msg,"ok");return true
}
function rewardMissionPiece(){
 const gain=advanceRewards();save();tone("ok");starFx();if(gain.complete)confetti();return gain
}
function practiceDone(msg="Bravo pour ton effort !"){
 tone("ok");toast("👏 "+msg,"ok")
}
function miss(msg="Écoute encore une fois."){
 state.streak=0;save();tone("no");toast("💪 "+msg,"no")
}
