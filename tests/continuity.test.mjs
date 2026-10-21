import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,distance} from '../dist/engine.mjs';
const live=()=>{const m=new Match();m.reset();m.phase='live';m.guard=0;m.passCooldown=0;return m;};
test('both teams restart on the spot without teleporting any player',()=>{
 for(const team of [0,1]){
  const m=live();m.lineup(team);m.guard=0;
  const previous=m.carrierId;m.tackle(m.players[(1-team)*7],false,true);
  let count=0;
  while(m.phase==='ruck'&&count++<500){
   const before=m.players.map(p=>({x:p.x,y:p.y}));m.step(1/120);
   for(const p of m.players)assert.ok(distance(p,before[p.id])<1.3,'discontinuous player '+p.id);
  }
  assert.equal(m.phase,'live');assert.equal(m.possession,team);assert.notEqual(m.carrierId,previous);assert.equal(m.passCooldown,0);
 }
});
test('receiver advances during flight, catches without a position jump and can pass immediately',()=>{
 const m=live();m.guard=999;for(const p of m.players.filter(p=>p.team))p.y=130;
 const receiver=m.players[1],y=receiver.y;assert.ok(m.throwBall(receiver));
 while(m.ball){const before={x:receiver.x,y:receiver.y};m.step(1/120,{x:0,y:-1});assert.ok(distance(receiver,before)<1);}
 assert.equal(m.carrierId,receiver.id);assert.equal(m.selected,receiver.id);assert.ok(receiver.y<y-10);assert.ok(Math.abs(receiver.vy)>40);assert.ok(m.pass());
});
