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
 assert.equal(m.pass(),false);tick(m,127);
 assert.equal(m.phase,'live');assert.equal(m.ball.kind,'kick');assert.equal(m.ball.kickoff,true);
 assert.equal(m.ball.sy,FIELD.height/2);assert.ok((m.ball.ty-FIELD.height/2)*d>=71);assert.equal(m.stats.kicks[0],1);
 tick(m,40);assert.ok(m.loose,'ball stays airborne before reception');
 let recovered=false;
 for(let i=0;i<600;i++){m.step(1/60);if(!m.ball){recovered=true;break;}}
 assert.ok(recovered,'either team can recover the kick');assert.equal(m.phase,'live');
});
test('second half starts with an opponent kick in the reversed direction',()=>{
 const m=new Match();m.reset();m.phase='halftime';m.phaseTime=.01;m.step(.02);
 assert.equal(m.half,2);assert.equal(m.ball.team,1);assert.equal(m.ball.sy,FIELD.height/2);
 assert.ok((m.ball.ty-FIELD.height/2)*m.dir(1)>71);assert.equal(m.stats.kicks[1],1);
});
