// Reproducible pairing smoke check. This scripted player is NOT a human skill/balance estimate.
const {Match,distance,FIELD}=await import(process.argv[4]||'../dist/engine.mjs');
import {NATIONS} from '../dist/teams.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
const results=[];
const difficulty=process.argv[2]||'hard',seconds=Number(process.argv[3]||30);
if(!['easy','normal','hard'].includes(difficulty)||!Number.isFinite(seconds)||seconds<1||seconds>120)throw new Error('Usage: node tools/check-nations.mjs [easy|normal|hard] [1..120]');
let seed=2026;const random=Math.random;
Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
try{
 for(const a of NATIONS)for(const b of NATIONS){if(a===b)continue;
  const m=new Match();m.reset({home:a.id,away:b.id,difficulty,seconds,scrums:true});
  let frames=0,exhaustedFrames=0,attackFrames=0,lastPass=-999;
  for(;frames<36000&&m.state==='playing';frames++){
   let input={x:0,y:0,sprint:false};
   if(m.phase==='kickoff'&&m.possession===0)m.kick({x:0,y:m.dir(0)},.6,true);
   if(m.scrum?.feed===0){if(!m.scrum.started||m.scrum.needle>.43&&m.scrum.needle<.57)m.scrumAction();input.x=1;}
   if(m.phase==='conversion'&&m.conversion.team===0){const c=m.conversion;if(c.stage==='power'&&c.power>.78||c.stage==='accuracy'&&Math.abs(c.accuracy-.5)<.025)m.conversionAction();}
   if(m.phase==='contact'&&m.possession===0)m.offload();
   if(m.phase==='live'){
    const p=m.controlled;
    if(m.possession===0&&!m.ball){
     attackFrames++;if(m.carrier.exhausted)exhaustedFrames++;
     const near=m.nearest(1,p),gap=distance(p,near),d=m.dir(0);
     // Commit to forward space; only pass under pressure to a less marked runner.
     const opponents=m.players.filter(q=>q.team===1&&q.down<=0);
     const options=[-.8,-.4,0,.4,.8].map(x=>{
      const len=Math.hypot(x,d),tx=p.x+x/len*65,ty=p.y+d/len*65;
      const clearance=Math.min(...opponents.map(q=>Math.hypot(tx-q.x,ty-q.y)));
      return {x,value:Math.min(clearance,100)-Math.abs(x)*10-(tx<FIELD.left+20||tx>FIELD.right-20?100:0)};
     }).sort((a,b)=>b.value-a.value);
     input={x:options[0].x,y:d,sprint:gap<130&&p.energy>25};
     if(frames%18===0){
      const receiver=m.target(),space=receiver?distance(receiver,m.nearest(1,receiver)):0;
      if(gap<35&&receiver&&space>gap+20&&frames-lastPass>90&&m.pass()){lastPass=frames;}
      else if(gap<48&&gap>24)m.special({x:0,y:d});
     }
    }else if(m.loose){const b=m.ball,inputTarget=b.landed?b:{x:b.tx,y:b.ty};const len=distance(p,inputTarget)||1;input={x:(inputTarget.x-p.x)/len,y:(inputTarget.y-p.y)/len,sprint:false};if(m.canContest()&&m.ball.duration-m.ball.t<.36)m.contest();}
    else if(m.possession===1){if(frames%18===0)m.pass();const d=m.controlled,c=m.carrier,len=distance(d,c)||1;input={x:(c.x-d.x)/len,y:(c.y-d.y)/len,sprint:false};if(len<35&&frames%18===0)m.special(input);}
   }
   m.step(1/60,input);
  }
  if(m.state!=='finished'||m.players.some(p=>!Number.isFinite(p.x+p.y)))throw new Error('Stalled pairing '+a.id+' / '+b.id);
  results.push({home:a.id,away:b.id,score:m.score,tries:m.stats.tries,passes:m.stats.passes,tackles:m.stats.tackles,exhaustedAttackPercent:Math.round(100*exhaustedFrames/Math.max(1,attackFrames)),simulatedSeconds:Math.round(frames/60)});
 }
}finally{Math.random=random;}
mkdirSync(new URL('../qa/',import.meta.url),{recursive:true});
writeFileSync(new URL('../qa/nations-check.json',import.meta.url),JSON.stringify({note:`30 ${difficulty} pairings, deterministic scripted player, ${seconds}-second halves. Smoke check only; not human win probabilities.`,results},null,2));
console.log(`Completed ${results.length}/30 ${difficulty} pairings. Scripted home wins: ${results.filter(r=>r.score[0]>r.score[1]).length}; draws: ${results.filter(r=>r.score[0]===r.score[1]).length}.`);
