import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD,distance} from '../dist/engine.mjs';
test('each conversion outcome restarts with exactly one contested kick from halfway for either team',()=>{
 for(const team of [0,1])for(const scored of [true,false]){
  const m=new Match();m.reset();m.phase='live';m.lineup(team);m.tryScored(team);m.beginConversion();
  m.conversion.scored=scored;m.resolveConversion();const score=[...m.score],time=m.time;
  m.step(1.81);assert.equal(m.conversion,null);
  if(team===1){
   assert.equal(m.phase,'kickoff');assert.equal(m.ball,null);m.step(4);assert.equal(m.time,time);
   assert.equal(m.beginKick({x:.5,y:m.dir(0)}),true);m.step(1,{x:.5,y:m.dir(0)});
   assert.equal(m.kickAim.power,.5);const target=m.kickTarget(m.kickAim,m.kickAim.power);
   assert.equal(m.releaseKick(),true);assert.equal(m.ball.tx,target.tx);assert.equal(m.ball.ty,target.ty);
  }
  assert.equal(m.phase,'live');assert.equal(m.ball.kickoff,true);
  assert.equal(m.ball.team,1-team);assert.equal(m.ball.sx,FIELD.width/2);assert.equal(m.ball.sy,FIELD.height/2);
  assert.equal(m.stats.kicks[1-team],1);assert.equal(m.time,time);assert.deepEqual(m.score,score);
  m.step(.1);assert.equal(m.stats.kicks[1-team],1);assert.ok(m.loose);
 }
});
test('expired half ends after conversion without an extra restart kick',()=>{
 const m=new Match();m.reset();m.phase='live';m.tryScored(0);m.beginConversion();m.time=0;m.half=2;
 m.resolveConversion(true);m.step(1.81);assert.equal(m.state,'finished');assert.equal(m.ball,null);assert.deepEqual(m.stats.kicks,[0,0]);
});
test('scrum exit keeps the last side selection, moves the ball there and never teleports the teams',()=>{
 for(const direction of [-1,1])for(const side of [-1,1]){
  const m=new Match();m.reset({scrums:true});m.phase='live';m.attackDir=direction;m.beginScrum(0);
  m.scrum.started=true;m.scrum.elapsed=m.scrum.intro;m.scrum.needle=.5;assert.equal(m.scrumAction(),true);
  for(let i=0;i<478;i++)m.step(1/120,{x:side,sprint:true});
  for(let i=0;i<30&&m.scrum;i++)m.step(1/120,{x:0,sprint:true});
  const before=m.players.map(p=>({x:p.x,y:p.y}));m.step(1/120,{x:0,sprint:true});
  assert.ok(m.ball?.scrumExit);assert.equal(m.ball.side,side);
  assert.ok(m.players.every((p,i)=>distance(p,before[i])<3));
  const receiver=m.ball.to;assert.equal(receiver,side<0?3:4);
  const target={x:m.ball.tx,y:m.ball.ty};assert.ok(distance(m.ball,target)>40);
  for(let i=0;i<54;i++)m.step(1/120);
  assert.equal(m.ball,null);assert.equal(m.carrierId,receiver);assert.ok(distance(m.carrier,target)<8);
 }
});
