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

test('automatic pass avoids a blocked lane but explicit direction keeps that receiver available',()=>{
 const m=setup(),c=m.carrier,left=m.players[1],right=m.players[2],defender=m.players[7];
 Object.assign(left,{x:c.x-100,y:c.y+30,down:0});
 Object.assign(right,{x:c.x+80,y:c.y+30,down:0});
 Object.assign(defender,{x:c.x-50,y:c.y+15,down:0});
 assert.equal(m.target({x:0,y:-1}).id,right.id);
 assert.equal(m.target({x:-1,y:0}).id,left.id);
 assert.equal(m.target({x:0,y:-1}).id,right.id);
 right.down=10;assert.equal(m.target({x:0,y:-1}).id,left.id);
});
test('neutral input follows a live kick while directional input takes immediate control',()=>{
 for(const power of [.25,.6]){
  const m=setup();for(const p of m.players)p.down=100;m.carrier.down=0;
  assert.equal(m.kick({x:0,y:-1},power),true);
  const p=m.controlled,y=p.y;
  for(let i=0;i<12;i++)m.step(1/120,{x:0,y:0});
  assert.ok(p.y<y,'selected eligible chaser runs without holding a direction');
  const x=p.x;for(let i=0;i<12;i++)m.step(1/120,{x:1,y:0});
  assert.ok(p.x>x+2,'manual direction overrides the chase');
 }
});
test('neutral kick assistance never moves an offside selected player toward the ball',()=>{
 const m=setup();m.players[1].y=m.carrier.y-50;m.kick({x:0,y:-1},.6);m.selected=1;
 const p=m.controlled;p.vx=p.vy=0;const y=p.y;
 for(let i=0;i<12;i++)m.step(1/120,{});
 assert.equal(p.y,y);
});
