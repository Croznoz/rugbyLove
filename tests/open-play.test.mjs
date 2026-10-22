import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD,distance} from '../dist/engine.mjs';
const tick=(m,n,input={x:0,y:0})=>{for(let i=0;i<n;i++)m.step(1/120,input);};
function setup(team=0,dir=-1){
 const m=new Match();m.reset();m.attackDir=team===0?dir:-dir;m.lineup(team);m.phase='live';m.guard=999;m.passCooldown=0;m.cpuThink=999;
 for(const p of m.players)p.down=20;
 const c=m.carrier,r=m.players[team*7+1];
 Object.assign(c,{down:0,x:260,y:550,vx:0,vy:dir*78});
 Object.assign(r,{down:0,x:330,y:550-dir*30,vx:0,vy:dir*65});
 return {m,c,r};
}
test('passer wraps around receiver and offers a legal, optional return without position jumps',()=>{
 for(const dir of [-1,1]){
  const {m,c,r}=setup(0,dir);assert.ok(m.throwBall(r));
  for(let i=0;i<160;i++){
   const previous=m.players.map(p=>({x:p.x,y:p.y}));
   m.step(1/120,{x:0,y:dir});
   for(const p of m.players)assert.ok(distance(p,previous[p.id])<1,'no teleporting');
  }
  assert.equal(m.carrierId,r.id);assert.ok(c.x>r.x+15);
  assert.ok((c.y-r.y)*dir<0);assert.ok(m.loopPoint(c,r));
  assert.equal(m.target({x:1,y:0}).id,c.id);
  assert.ok(m.pass({x:1,y:0}));assert.equal(m.ball.oneTwo,true);
  tick(m,80,{x:0,y:dir});assert.equal(m.carrierId,c.id);
  assert.ok(m.events.some(e=>e.type==='oneTwo'));assert.equal(m.stats.passes[0],2);
 }
});
test('support run stays inside either touchline and expires; long passes use normal support',()=>{
 for(const x of [FIELD.left+20,FIELD.right-20]){
  const {m,c,r}=setup();r.x=x;c.x=x<300?x+60:x-60;m.throwBall(r);
  const point=m.loopPoint(c,r);assert.ok(point.x>FIELD.left&&point.x<FIELD.right);
  assert.ok((point.x-r.x)*(x<300?1:-1)>0);
  m.elapsed=3;assert.equal(m.loopPoint(c,r),null);m.lineup(0);assert.equal(m.loopRun,null);
 }
 const {m,r}=setup();r.x=500;m.throwBall(r);assert.equal(m.loopRun,null);
});
test('draw-and-pass commits an approaching defender briefly but leaves cover and manual defense free',()=>{
 for(const team of [0,1]){
  const {m,c,r}=setup(team),d=m.players[(1-team)*7],cover=m.players[(1-team)*7+2];
  Object.assign(d,{down:0,x:c.x,y:c.y-45,vy:60,vx:0});
  Object.assign(cover,{down:0,x:c.x+140,y:c.y-100,vy:60});
  m.throwBall(r);
  const point=m.defenseTargets(r).points.get(d.id);
  if(team===0){assert.equal(point.role,'committed');assert.ok(Math.abs(point.x-c.x)<1);}
  else assert.ok(!d.commitUntil,'controlled defender keeps full control');
  assert.notEqual(m.defenseTargets(r).points.get(cover.id).role,'committed');
  m.elapsed=.6;m.defensePlan=null;
  assert.notEqual(m.defenseTargets(r).points.get(d.id).role,'committed');
 }
 const {m,c,r}=setup(),d=m.players[7];
 Object.assign(d,{down:0,x:c.x,y:c.y-45,vx:0,vy:-60});
 m.throwBall(r);assert.ok(!d.commitUntil,'defender retreating to cover is not drawn in');
});
test('short tap produces preview-matched grubber; hold produces a longer high kick',()=>{
 for(const dir of [-1,1]){
  const {m}=setup(0,dir);m.beginKick({x:0,y:dir});
  const preview=m.kickTarget(m.kickAim,m.kickAim.power);
  m.releaseKick();assert.equal(m.ball.grubber,true);
  assert.equal(m.ball.tx,preview.tx);assert.equal(m.ball.ty,preview.ty);
  const short=distance(m.ball,{x:m.ball.tx,y:m.ball.ty});
  const {m:high}=setup(0,dir);high.beginKick({x:0,y:dir});tick(high,60);
  high.releaseKick();assert.equal(high.ball.grubber,false);
  assert.ok(distance(high.ball,{x:high.ball.tx,y:high.ball.ty})>short+40);
 }
});
test('either team can collect rolling ball before its destination; offside attackers cannot',()=>{
 for(const team of [0,1]){
  const {m}=setup();m.beginKick({x:0,y:-1});m.releaseKick();const b=m.ball;
  for(const p of m.players)p.down=20;
  const p=m.players[team===0?2:8];Object.assign(p,{down:0,x:b.sx,y:b.sy+(b.ty-b.sy)*.5});
  if(team===0)b.eligible.push(p.id);
  b.t=b.duration*.5;
  m.step(1/120);assert.equal(m.ball,null);assert.equal(m.carrierId,p.id);
 }
 const {m}=setup();const p=m.players[2];p.y=m.carrier.y-20;
 m.beginKick({x:0,y:-1});m.releaseKick();const b=m.ball;
 for(const q of m.players)q.down=20;
 Object.assign(p,{down:0,x:b.sx,y:b.sy+(b.ty-b.sy)*.5});b.t=b.duration*.5;
 m.step(1/120);assert.ok(m.ball);assert.equal(m.canChase(p),false);
});
