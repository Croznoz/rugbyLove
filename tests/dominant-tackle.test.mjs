import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD,PROFILES} from '../dist/engine.mjs';
function setup(dir=1){
 const m=new Match();m.reset();m.attackDir=-dir;m.lineup(1);m.phase='live';m.guard=0;m.cpuThink=99;
 for(const p of m.players){p.down=20;p.x=FIELD.left+20;p.y=FIELD.top+20;}
 const c=m.carrier,d=m.players[2];Object.assign(c,{x:300,y:550,vx:0,vy:0,down:0});Object.assign(d,{x:300,y:550+dir*18,down:0});m.selected=d.id;return {m,c,d};
}
function hit(dir=1){const s=setup(dir);s.m.special();s.m.tackle(s.d,true);return s;}
test('manual frontal powerful tackle dislodges ball with one 25-point cost in both halves',()=>{
 for(const dir of [-1,1]){const {m,c,d}=hit(dir);assert.equal(m.ball.kind,'fumble');assert.ok(m.loose);assert.equal(d.energy,d.profile.stamina-25);assert.equal(d.dominantReadyAt,6);assert.equal(m.stats.tackles[0],1);assert.equal(m.phase,'live');assert.equal(m.contact,null);assert.ok(c.down>0&&d.down>0);assert.equal(m.possession,1);assert.deepEqual(m.stats.kicks,[0,0]);
  m.tackle(d,true);assert.equal(d.energy,d.profile.stamina-25);assert.equal(m.stats.tackles[0],1);
 }
});
test('automatic, rear, lateral, low-energy, cooldown and non-powerful tackles stay ordinary',()=>{
 for(const kind of ['automatic','rear','lateral','energy','cooldown','agile','regista']){
  const {m,c,d}=setup();
  if(kind==='rear')d.y=c.y-18;
  if(kind==='lateral'){d.x=c.x+18;d.y=c.y;}
  if(kind==='energy')d.energy=34;
  if(kind==='cooldown')d.dominantReadyAt=6;
  if(kind==='agile')d.profile=PROFILES.agile;
  if(kind==='regista')d.profile=PROFILES.playmaker;
  if(kind!=='automatic')m.special();m.tackle(d,kind!=='automatic');assert.notEqual(m.ball?.kind,'fumble',kind);
 }
});
test('both teams can recover the dislodged ball, including original attackers ahead of contact',()=>{
 for(const team of [0,1]){const {m}=hit();const b=m.ball,p=m.players[team===0?1:8];Object.assign(p,{down:0,x:b.tx,y:b.ty});assert.ok(m.canChase(p));
  for(let i=0;i<50&&m.ball;i++)m.step(1/120);
  assert.equal(m.ball,null);assert.equal(m.possession,team);assert.equal(m.carrierId,p.id);assert.equal(m.phase,'live');assert.deepEqual(m.stats.kicks,[0,0]);
 }
});
test('real dive contact triggers dominant tackle; pause freezes its cooldown and reset clears it',()=>{
 const {m,d}=setup();d.y=m.carrier.y+34;m.carrier.vy=80;m.special();for(let i=0;i<30&&!m.ball;i++)m.step(1/120);
 assert.equal(m.ball?.kind,'fumble');assert.ok(d.dominantReadyAt>m.elapsed);
 const remaining=d.dominantReadyAt-m.elapsed;m.state='paused';m.step(3);assert.equal(d.dominantReadyAt-m.elapsed,remaining);
 m.reset();assert.ok(m.players.every(p=>p.dominantReadyAt===0&&!p.dominantAttempt));
});
test('dominant ball stays inside the field near the goal and touchline',()=>{
 const {m,c,d}=setup();c.x=d.x=FIELD.left+8;c.y=FIELD.top+4;d.y=c.y+18;m.special();m.tackle(d,true);
 assert.equal(m.ball.kind,'fumble');assert.ok(m.ball.tx>=FIELD.left&&m.ball.tx<=FIELD.right);assert.ok(m.ball.ty>=FIELD.top-12);
});
test('perfect tackle cue respects facing, range, energy and cooldown in both halves',()=>{
 for(const dir of [-1,1]){
  const {m,c,d}=setup(dir);d.y=c.y+dir*34;
  assert.equal(m.perfectTackleReady(),true);
  d.energy=34;assert.equal(m.perfectTackleReady(),false);d.energy=90;
  d.dominantReadyAt=1;assert.equal(m.perfectTackleReady(),false);d.dominantReadyAt=0;
  d.y=c.y-dir*34;assert.equal(m.perfectTackleReady(),false);
  d.y=c.y+dir*70;assert.equal(m.perfectTackleReady(),false);
 }
});
test('perfect impact freezes the ball briefly, respects pause and clears on reset',()=>{
 const {m}=hit();const time=m.time;
 assert.ok(m.events.some(e=>e.type==='perfectTackle'));
 m.step(.03);assert.equal(m.ball.t,0);assert.equal(m.time,time);
 const remaining=m.perfectImpact.remaining;m.state='paused';m.step(1);
 assert.equal(m.perfectImpact.remaining,remaining);
 m.state='playing';m.step(.05);assert.ok(m.ball.t>0);
 m.reset();assert.equal(m.perfectImpact,null);
});
