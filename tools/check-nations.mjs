// Reproducible pairing smoke check. This scripted player is NOT a human skill/balance estimate.
import {Match,distance,FIELD} from '../dist/engine.mjs';
import {NATIONS} from '../dist/teams.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const results=[];
let seed=2026;const random=Math.random;
Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try{
 for(const a of NATIONS)for(const b of NATIONS){if(a===b)continue;
  const m=new Match();m.reset({home:a.id,away:b.id,difficulty:'hard',seconds:30,scrums:true});
  let frames=0;
  for(;frames<36000&&m.state==='playing';frames++){
   let input={x:0,y:0,sprint:false};
   if(m.phase==='kickoff'&&m.possession===0)m.kick({x:0,y:m.dir(0)},.6,true);
   if(m.scrum?.feed===0){if(!m.scrum.started||m.scrum.needle>.43&&m.scrum.needle<.57)m.scrumAction();input.x=1;}
   if(m.phase==='conversion'&&m.conversion.team===0){const c=m.conversion;if(c.stage==='power'&&c.power>.78||c.stage==='accuracy'&&Math.abs(c.accuracy-.5)<.025)m.conversionAction();}
   if(m.phase==='contact'&&m.possession===0)m.offload();
   if(m.phase==='live'){
    const p=m.controlled;
    if(m.possession===0&&!m.ball){
     const near=m.nearest(1,p),gap=distance(p,near),d=m.dir(0);
     input={x:Math.abs(p.x-FIELD.width/2)>220?(FIELD.width/2-p.x)/200:gap<100?Math.sign(p.x-near.x)*.6:0,y:d,sprint:gap<95&&p.energy>45};
     if(frames%18===0){if(gap<65&&m.target())m.pass();else if(gap<55)m.special(input);}
    }else if(m.loose){const b=m.ball,inputTarget=b.landed?b:{x:b.tx,y:b.ty};const len=distance(p,inputTarget)||1;input={x:(inputTarget.x-p.x)/len,y:(inputTarget.y-p.y)/len,sprint:false};if(m.canContest()&&m.ball.duration-m.ball.t<.36)m.contest();}
    else if(m.possession===1){if(frames%18===0)m.pass();const d=m.controlled,c=m.carrier,len=distance(d,c)||1;input={x:(c.x-d.x)/len,y:(c.y-d.y)/len,sprint:false};if(len<35&&frames%18===0)m.special(input);}
   }
   m.step(1/60,input);
  }
  if(m.state!=='finished'||m.players.some(p=>!Number.isFinite(p.x+p.y)))throw new Error('Stalled pairing '+a.id+' / '+b.id);
  results.push({home:a.id,away:b.id,score:m.score,tries:m.stats.tries,passes:m.stats.passes,simulatedSeconds:Math.round(frames/60)});
 }
}finally{Math.random=random;}
mkdirSync(new URL('../qa/',import.meta.url),{recursive:true});
writeFileSync(new URL('../qa/nations-check.json',import.meta.url),JSON.stringify({note:'30 hard pairings, deterministic scripted player, 30-second halves. Smoke check only; not human win probabilities.',results},null,2));
console.log(`Completed ${results.length}/30 hard pairings. Scripted home wins: ${results.filter(r=>r.score[0]>r.score[1]).length}; draws: ${results.filter(r=>r.score[0]===r.score[1]).length}.`);
