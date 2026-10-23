import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../dist/engine.mjs';
function setup(remaining=.35){
 const m=new Match();m.reset();m.phase='live';m.guard=99;
 for(const p of m.players){p.x=80;p.y=200;}
 const p=m.controlled;p.x=360;p.y=660;
 m.ball={kind:'kick',team:0,from:0,eligible:[0,1,2,3,4,5,6],x:360,y:660,sx:360,sy:660,tx:360,ty:660,t:2-remaining,duration:2,apex:125,z:70,landed:false};
 return m;
}
test('CONTENDI requires descending high ball, proximity, legal position and available player',()=>{
 const m=setup();assert.ok(m.canContest());
 for(const change of [m=>m.ball.grubber=true,m=>m.ball.landed=true,m=>m.ball.t=.5,m=>m.controlled.x=100,m=>m.controlled.down=1,m=>m.controlled.energy=7,m=>m.controlled.cd=1,m=>m.state='paused']){
  const n=setup();change(n);assert.equal(n.canContest(),false);
 }
 const n=setup();n.selected=1;n.controlled.x=360;n.controlled.y=650;n.ball.eligible=[0];assert.equal(n.canContest(),false);
});
test('one press jumps once and holding cannot repeat or consume more energy',()=>{
 const m=setup();m.beginSpecial();assert.equal(m.controlled.jump,.6);assert.equal(m.controlled.energy,m.controlled.profile.stamina-8);
 m.beginSpecial();m.releaseSpecial();assert.equal(m.controlled.energy,m.controlled.profile.stamina-8);assert.equal(m.controlled.burst,0);
});
test('jump allows a high catch; passive recovery still works lower down',()=>{
 const m=setup();m.contest();let high=false;
 for(let i=0;i<120&&m.ball;i++){high=m.ball.z>22;m.step(1/120);}
 assert.equal(m.ball,null);assert.ok(high);assert.equal(m.carrierId,0);
 const n=setup();for(let i=0;i<120&&n.ball;i++)n.step(1/120);assert.equal(n.ball,null);assert.equal(n.carrierId,0);
});
test('brief descent slowdown is 70 percent, pause freezes it and capture restores normal time',()=>{
 const m=setup(),time=m.time;m.step(.1);assert.ok(Math.abs(time-m.time-.07)<1e-8);
 const t=m.time,b=m.ball.t;m.state='paused';m.step(1);assert.equal(m.time,t);assert.equal(m.ball.t,b);
 m.state='playing';m.ball=null;m.step(.1);assert.ok(Math.abs(t-m.time-.1)<1e-8);
 const n=setup();n.controlled.x=100;const normal=n.time;n.step(.1);assert.ok(Math.abs(normal-n.time-.1)<1e-8);
});
test('opponent also jumps, and jumping out of range cannot steal a ball',()=>{
 const m=setup(.34),q=m.players[7];m.controlled.x=100;q.x=360;q.y=660;
 m.step(1/120);assert.ok(q.jump>0);
 const n=setup();n.contest();n.controlled.x=410;for(let i=0;i<100;i++)n.step(1/120,{x:1,y:0});
 assert.ok(n.ball);assert.equal(n.controlled.jump,0);
});
