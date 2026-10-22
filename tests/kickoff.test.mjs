import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD,distance} from '../dist/engine.mjs';
const tick=(m,n)=>{for(let i=0;i<n;i++)m.step(1/60);};
test('both kickoffs form a rugby sevens line with wings, centres and deep cover',()=>{
 for(const kicking of [0,1])for(const attackDir of [-1,1]){
  const m=new Match();m.reset();m.attackDir=attackDir;m.lineup(kicking);
  const kick=m.players.slice(kicking*7,kicking*7+7);
  const receive=m.players.slice((1-kicking)*7,(1-kicking)*7+7);
  const d=m.dir(kicking),half=FIELD.height/2;
  assert.equal(kick[0].y,half);
  assert.ok(kick[4].x<kick[2].x&&kick[2].x<kick[0].x&&kick[0].x<kick[3].x&&kick[3].x<kick[5].x);
  assert.ok(receive[4].x<receive[2].x&&receive[2].x<receive[0].x&&receive[0].x<receive[3].x&&receive[3].x<receive[5].x);
  for(const side of [kick,receive]){
   const towardOwnTryLine=-m.dir(side[0].team);
   assert.ok(side[4].x<=FIELD.left+12,'left wing is close to the sideline');
   assert.ok(side[5].x>=FIELD.right-12,'right wing is close to the sideline');
   assert.ok((side[6].y-side[4].y)*towardOwnTryLine>70,'fullback stays deeper than either wing');
   assert.ok((side[6].y-side[5].y)*towardOwnTryLine>70,'fullback stays deeper than either wing');
  }
  assert.ok((kick[6].y-half)*d<(kick[1].y-half)*d);
  assert.ok((receive[6].y-half)*d>(receive[1].y-half)*d);
  assert.ok(kick.every(p=>(p.y-half)*d<=0));
  assert.ok(receive.every(p=>(p.y-half)*d>=85));
  for(const side of [kick,receive])for(let i=0;i<side.length;i++)for(let j=i+1;j<side.length;j++)assert.ok(distance(side[i],side[j])>30);
 }
});
test('opening kick crosses halfway before possession can be recovered',()=>{
 const m=new Match();m.reset();
 const d=m.dir(0);
 for(const p of m.players)assert.ok(p.team===0?(p.y-FIELD.height/2)*d<=0:(p.y-FIELD.height/2)*d>=71);
 assert.equal(m.pass(),false);tick(m,180);assert.equal(m.ball,null);assert.equal(m.phase,'kickoff');m.beginKick({x:.3,y:d});tick(m,60);m.releaseKick();
 assert.equal(m.phase,'live');assert.equal(m.ball.kind,'kick');assert.equal(m.ball.kickoff,true);
 assert.equal(m.ball.sy,FIELD.height/2);assert.ok((m.ball.ty-FIELD.height/2)*d>=71);assert.equal(m.stats.kicks[0],1);
 tick(m,40);assert.ok(m.loose,'ball stays airborne before reception');
 let recovered=false;
 for(let i=0;i<600;i++){m.step(1/60);if(!m.ball){recovered=true;break;}}
 assert.ok(recovered,'either team can recover the kick');assert.equal(m.phase,'live');
});
test('second half starts with an opponent kick in the reversed direction',()=>{
 const m=new Match();m.reset();m.phase='halftime';m.phaseTime=.01;m.step(.02);
 assert.equal(m.half,2);tick(m,127);assert.equal(m.ball.team,1);assert.equal(m.ball.sy,FIELD.height/2);
 assert.ok((m.ball.ty-FIELD.height/2)*m.dir(1)>71);assert.equal(m.stats.kicks[1],1);
});
test('restart power always produces a high flight, including a quick tap and CPU kicks',()=>{
 for(const power of [.25,.32,.5,1]){
  const m=new Match();m.reset();const aim={x:.3,y:-1,kickoff:true};
  const target=m.kickTarget(aim,power);m.kick(aim,power,true);
  const b=m.ball;assert.equal(b.grubber,false);assert.equal(b.tx,target.tx);assert.equal(b.ty,target.ty);
  assert.ok(b.duration>=2.5);m.stepKickBall(b,b.duration/2);assert.ok(b.z>=110);assert.equal(b.landed,false);
 }
 const cpu=new Match();cpu.reset();cpu.lineup(1);cpu.launchKickoff();assert.equal(cpu.ball.grubber,false);assert.ok(cpu.ball.duration>=2.5);assert.ok(cpu.ball.apex>=110);
});
test('both sides chase and arrive to contest a high restart before it lands',()=>{
 for(const team of [0,1])for(const dir of [-1,1]){
  const m=new Match();m.reset();m.attackDir=dir;m.lineup(team);m.phase='kickoff';
  if(team===0)m.kick({x:0,y:m.dir(team)},.5,true);else m.launchKickoff();
  const b=m.ball,target={x:b.tx,y:b.ty};
  const before=[0,1].map(t=>Math.min(...m.players.filter(p=>p.team===t).map(p=>distance(p,target))));
  for(let i=0;i<Math.floor(b.duration*.9*120);i++)m.step(1/120);
  assert.equal(m.ball,b,'still in the air for the contest');
  for(const t of [0,1]){
   const nearest=Math.min(...m.players.filter(p=>p.team===t&&m.canChase(p)).map(p=>distance(p,target)));
   assert.ok(nearest<before[t],`team ${t} closes in`);assert.ok(nearest<40,`team ${t} reaches contest area: ${nearest}`);
  }
 }
});
test('manual movement overrides selected player kickoff chase assistance',()=>{
 const m=new Match();m.reset();m.kick({x:0,y:-1},.5,true);const p=m.controlled,x=p.x;
 for(let i=0;i<60;i++)m.step(1/120,{x:1,y:0});
 assert.ok(p.x>x+20);
});
