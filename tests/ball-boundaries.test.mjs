import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD} from '../dist/engine.mjs';
const setup=()=>{const m=new Match();m.reset({seconds:120});m.phase='live';m.guard=999;return m;};
function loose(m,x,y,team=0){m.ball={kind:'kick',team,from:team*7,x,y,sx:x,sy:y,tx:x,ty:y,t:1,duration:1,landed:true,z:0,vx:0,vy:0,vz:0,groundTime:0,bounceCount:0,eligible:m.players.filter(p=>p.team===team).map(p=>p.id)};}
test('both teams can collect deep in either in-goal, in both halves',()=>{
 for(const dir of [-1,1])for(const team of [0,1])for(const y of [FIELD.inGoalTop+2,FIELD.inGoalBottom-2]){
  const m=setup();m.attackDir=dir;const p=m.players[team*7+1];
  for(const q of m.players){q.x=FIELD.left+80;q.y=FIELD.height/2;}
  p.x=FIELD.width/2;p.y=y<FIELD.height/2?FIELD.top:FIELD.bottom;
  loose(m,p.x,y,team);
  for(let i=0;i<600&&m.ball;i++)m.step(1/120);
  assert.equal(m.ball,null);assert.equal(m.carrierId,p.id);assert.equal(m.possession,team);
 }
});
test('outside any edge restarts inside the pitch for the other team, including corners',()=>{
 for(const team of [0,1])for(const [x,y] of [[FIELD.left-1,660],[FIELD.right+1,660],[360,FIELD.inGoalTop-1],[360,FIELD.inGoalBottom+1],[FIELD.left-1,FIELD.inGoalBottom+1]]){
  const m=setup();loose(m,x,y,team);m.step(1/120);
  assert.equal(m.phase,'ruck');assert.equal(m.ball,null);assert.equal(m.restart.team,1-team);
  for(let i=0;i<1800&&m.phase==='ruck';i++)m.step(1/120);
  assert.equal(m.phase,'live');assert.equal(m.possession,1-team);
  assert.ok(m.carrier.x>=FIELD.left&&m.carrier.x<=FIELD.right);
  assert.ok(m.carrier.y>FIELD.top&&m.carrier.y<FIELD.bottom);
 }
});
test('moving ball exits instead of bouncing off an invisible touchline wall',()=>{
 const m=setup();loose(m,FIELD.right-.1,660);m.ball.vx=100;
 m.step(1/60);assert.equal(m.phase,'ruck');assert.equal(m.restart.team,1);
});
test('controlled player can run to a ball at the back of their own in-goal',()=>{
 const m=setup(),p=m.controlled;p.x=360;p.y=FIELD.bottom;
 loose(m,p.x,FIELD.inGoalBottom-2);for(const q of m.players)if(q!==p)q.y=FIELD.top;
 for(let i=0;i<240&&m.ball;i++)m.step(1/120,{x:0,y:1});
 assert.equal(m.ball,null);assert.equal(m.carrierId,p.id);assert.deepEqual(m.score,[0,0]);
 m.step(1/120,{x:0,y:-1});assert.ok(p.y>FIELD.bottom+22,'no teleport back to old movement limit');
});
