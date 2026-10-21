import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,PROFILES,distance} from '../dist/engine.mjs';
function setup(profile){const m=new Match();m.reset();m.phase='live';m.guard=999;m.passCooldown=0;m.carrier.profile=profile;for(const p of m.players)if(p.id!==m.carrierId)p.down=10;return m;}
function run(profile,sprint=false){const m=setup(profile),start={x:m.carrier.x,y:m.carrier.y};for(let i=0;i<60;i++)m.step(1/120,{x:0,y:-1,sprint});return distance(start,m.carrier);}
test('profiles are role-based, symmetric between teams and restored on reset',()=>{
 const m=new Match();for(let i=0;i<7;i++)assert.equal(m.players[i].profile,m.players[i+7].profile);
 assert.equal(m.players[2].profile,PROFILES.powerful);assert.equal(m.players[4].profile,PROFILES.agile);assert.equal(m.players[1].profile,PROFILES.playmaker);
 m.players[0].profile=PROFILES.agile;m.reset();assert.equal(m.players[0].profile,PROFILES.playmaker);
});
test('normal running is equal while agile sprint outruns powerful sprint',()=>{
 const normal=Object.values(PROFILES).map(p=>run(p));assert.ok(Math.max(...normal)-Math.min(...normal)<.001);
 assert.ok(run(PROFILES.agile,true)>run(PROFILES.powerful,true)+4);
});
test('every profile can pass when exhausted and kick preview remains exact',()=>{
 for(const profile of Object.values(PROFILES)){
  const m=setup(profile),c=m.carrier,r=m.players[1];Object.assign(r,{down:0,x:c.x+65,y:c.y+25});c.energy=0;c.exhausted=true;
  assert.ok(m.pass());assert.equal(m.ball.to,r.id);
  const k=setup(profile);assert.ok(k.beginKick({x:1,y:-1}));k.updateKickAim(3,{x:1,y:-1});assert.equal(k.kickAim.power,1);
  const preview=k.kickTarget(k.kickAim,k.kickAim.power);assert.ok(k.releaseKick());assert.equal(k.ball.tx,preview.tx);assert.equal(k.ball.ty,preview.ty);
 }
});
test('powerful charge and tackle last longer; agile dodge travels farther; playmaker kick reaches farther',()=>{
 const powerful=setup(PROFILES.powerful),agile=setup(PROFILES.agile);powerful.special({x:0,y:-1});agile.special({x:0,y:-1});assert.ok(powerful.carrier.charge>agile.carrier.charge);
 const dodge=profile=>{const m=setup(profile),start={x:m.carrier.x,y:m.carrier.y};m.special({x:1,y:0});for(let i=0;i<12;i++)m.step(1/120,{x:1,y:0});return distance(start,m.carrier);};assert.ok(dodge(PROFILES.agile)>dodge(PROFILES.powerful));
 const dive=profile=>{const m=setup(profile);m.lineup(1);m.controlled.profile=profile;m.special();return m.controlled.dive;};assert.ok(dive(PROFILES.powerful)>dive(PROFILES.agile));
 const reach=profile=>{const m=setup(profile),t=m.kickTarget({x:0,y:-1},1);return distance(m.carrier,{x:t.tx,y:t.ty});};assert.ok(reach(PROFILES.playmaker)>reach(PROFILES.agile)*1.1);
});
