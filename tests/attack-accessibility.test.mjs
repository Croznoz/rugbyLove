import test from 'node:test';
import assert from 'node:assert/strict';
import {Match} from '../dist/engine.mjs';
function setup(dir=-1){
 const m=new Match();m.reset({difficulty:'normal'});m.lineup(0);m.phase='live';m.attackDir=dir;m.guard=10;m.passCooldown=0;
 for(const p of m.players)p.down=100;
 Object.assign(m.carrier,{x:300,y:600,down:0});
 Object.assign(m.players[1],{x:350,y:600-dir*20,down:0,vx:0,vy:-dir*60});
 return m;
}
test('retreating support turns forward on the pass and continues briefly with neutral input',()=>{
 for(const dir of [-1,1]){
  const m=setup(dir),p=m.players[1],before=p.y;
  assert.equal(m.throwBall(p),true);assert.ok(m.ball.runY*dir>0);
  for(let i=0;i<60&&m.ball;i++)m.step(1/120,{});
  assert.equal(m.carrierId,p.id);assert.ok((p.y-before)*dir>0);
  const received=p.y;for(let i=0;i<24;i++)m.step(1/120,{});
  assert.ok((p.y-received)*dir>5);
  m.step(1/120,{x:1,y:0});assert.equal(p.receiveUntil,0);
 }
});
test('difficulty changes decisions and reaction time, not ordinary CPU speed',()=>{
 const speeds=[];
 for(const difficulty of ['easy','normal','hard']){const m=new Match();m.reset({difficulty});speeds.push(m.aiSpeed);}
 assert.deepEqual(speeds,[78,78,78]);
});
test('charge cue respects timing, energy and containing defenders; kick cue respects offside',()=>{
 const m=setup(),c=m.carrier,d=m.players[7];Object.assign(d,{x:c.x,y:c.y-40,down:0});
 assert.equal(m.chargeReady(),true);d.brace=true;assert.equal(m.chargeReady(),false);d.brace=false;c.energy=35;assert.equal(m.chargeReady(),false);
 c.energy=100;m.beginKick({x:0,y:-1});assert.ok(m.previewChaser());assert.ok((m.previewChaser().y-c.y)*m.dir(0)<=0);
});
test('passing only resets the wind-up of defenders drawn near the passer',()=>{
 const m=setup(),near=m.players[7],far=m.players[8];Object.assign(near,{x:310,y:600,tackleWind:.2});Object.assign(far,{x:550,y:300,tackleWind:.2});
 m.throwBall(m.players[1]);assert.equal(near.tackleWind,0);assert.equal(far.tackleWind,.2);
});
