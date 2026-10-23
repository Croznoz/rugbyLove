import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD,distance} from '../dist/engine.mjs';
const live=()=>{const m=new Match();m.reset();m.phase='live';m.guard=999;return m;};
const tick=(m,t,input={x:0,y:0})=>{for(let i=0;i<Math.ceil(t*120);i++)m.step(1/120,input);};
test('six support runners have close, channel and wide roles and legal passing depth in both halves',()=>{for(const dir of [-1,1]){const m=live();m.attackDir=dir;const c=m.carrier,roles={};for(const p of m.players.filter(p=>p.team===0&&p.id!==c.id)){const point=m.supportPoint(p,c);roles[p.supportRole]=(roles[p.supportRole]||0)+1;assert.ok((point.y-c.y)*dir<=0);assert.ok(point.x>=FIELD.left&&point.x<=FIELD.right);if(p.supportRole==='close')assert.ok(distance(point,c)<72);}assert.deepEqual(roles,{wide:2,channel:2,close:2});}});
test('one pressure defender, one cover and separate markers hold a defensive line',()=>{const m=live(),c=m.carrier,plan=m.defenseTargets(c),points=[...plan.points.values()];assert.equal(points.filter(p=>p.role==='pressure').length,1);assert.equal(points.filter(p=>p.role==='cover').length,1);assert.equal(points.filter(p=>p.role==='mark').length,5);const cover=points.find(p=>p.role==='cover');assert.ok((cover.y-c.y)*m.dir(c.team)>60);const markers=points.filter(p=>p.role==='mark');assert.ok(new Set(markers.map(p=>Math.round(p.x))).size>=4);});
test('a grounded pressure defender is immediately replaced and pass switches focus',()=>{const m=live();const a=m.defenseTargets(m.carrier);m.players[a.pressure].down=1;const b=m.defenseTargets(m.carrier);assert.notEqual(a.pressure,b.pressure);m.passCooldown=0;m.pass();const to=m.ball.to;m.step(1/120);assert.equal(m.defensePlan.carrier,to);});
test('pass selection penalizes an obstructed lane with equally spaced receivers',()=>{const m=live(),c=m.carrier,a=m.players[1],b=m.players[2];a.x=c.x-80;a.y=c.y+30;b.x=c.x+80;b.y=c.y+30;for(const p of m.players.filter(p=>p.team===1)){p.x=240;p.y=100;}const d=m.players[7];d.x=c.x-40;d.y=c.y+15;assert.ok(m.laneClearance(c,a)<m.laneClearance(c,b));assert.ok(m.passValue(b,c)>m.passValue(a,c));});
test('support lanes reset on changed carrier and lineup',()=>{const m=live();m.supportPoint(m.players[1],m.carrier);m.carrierId=2;m.elapsed+=.2;m.supportPoint(m.players[1],m.carrier);assert.equal(m.attackPlan.carrier,2);m.defenseTargets(m.carrier);m.lineup(1);assert.equal(m.attackPlan,null);assert.equal(m.defensePlan,null);});
test('AI changes do not move user-controlled defender or multiply speed',()=>{const m=live();m.lineup(1);m.guard=999;const p=m.controlled,prior={x:p.x,y:p.y};tick(m,.4);assert.ok(distance(p,prior)<1);const before={x:p.x,y:p.y};tick(m,.2,{x:1,y:0});assert.ok(distance(p,before)<17);});
test('full match with scrum option and active passing completes without nonfinite coordinates',()=>{const m=new Match();m.reset({seconds:20,scrums:true});for(let i=0;i<120*180&&m.state!=='finished';i++){if(m.phase==='kickoff'&&m.possession===0){m.beginKick();m.releaseKick();}if(m.phase==='scrum'&&m.scrum.feed===0&&!m.scrum.started)m.scrumAction();if(i%85===0)m.pass({x:i%170?1:-1,y:0});m.step(1/120,{x:Math.sin(i/100)*.4,y:m.dir(0)});assert.ok(m.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}assert.equal(m.state,'finished');});
test('touchline support fans inside with distinct legal lanes for both teams and directions',()=>{
 for(const team of [0,1])for(const dir of [-1,1])for(const side of [-1,1]){
  const m=live();m.attackDir=dir;m.lineup(team);const c=m.carrier;
  c.x=side<0?FIELD.left+8:FIELD.right-8;
  const points=m.players.filter(p=>p.team===team&&p.id!==c.id).map(p=>m.supportPoint(p,c)).sort((a,b)=>a.x-b.x);
  for(const point of points){assert.ok(point.x>FIELD.left&&point.x<FIELD.right);assert.ok((point.x-c.x)*side<0);assert.ok((point.y-c.y)*m.dir(team)<0);}
  for(let i=1;i<points.length;i++)assert.ok(points[i].x-points[i-1].x>20,'support lanes must not collapse at touch');
  assert.ok(Math.min(...points.map(p=>distance(p,c)))<60,'an offload runner stays close');
 }
});
test('after beating the defensive line close support tightens while wide outlets stay wide',()=>{
 for(const team of [0,1])for(const dir of [-1,1]){
  const m=live();m.attackDir=dir;m.lineup(team);const c=m.carrier,d=m.dir(team);
  const runners=m.players.filter(p=>p.team===team&&p.id!==c.id),opponents=m.players.filter(p=>p.team!==team);
  for(const p of opponents){p.y=c.y+d*90;p.x=c.x;}
  const before=new Map(runners.map(p=>[p.id,m.supportPoint(p,c)]));
  for(const p of opponents)p.y=c.y-d*90;
  m.elapsed+=.2;
  for(const p of runners){const point=m.supportPoint(p,c);assert.ok((point.y-c.y)*d<0);
   if(p.supportRole==='close')assert.ok(distance(point,c)<distance(before.get(p.id),c)-8);
   if(p.supportRole==='wide')assert.ok(Math.abs(point.x-c.x)>175);
  }
 }
});

test('support runners declare distinct gap, return and width intentions',()=>{
 const m=live(),c=m.carrier;
 const runners=m.players.filter(p=>p.team===0&&p.id!==c.id);
 for(const p of runners)m.supportPoint(p,c);
 assert.equal(new Set(runners.map(p=>p.supportIntent)).size,3);
 assert.equal(runners.filter(p=>p.supportIntent==='gap').length,2);
 assert.equal(runners.filter(p=>p.supportIntent==='return').length,2);
 assert.equal(runners.filter(p=>p.supportIntent==='width').length,2);
});

test('bunched attackers cannot collapse defensive lanes, wings and fullback stay deeper',()=>{
 for(const team of [0,1])for(const direction of [-1,1])for(const x of [FIELD.left+8,300,FIELD.right-8]){
  const m=live();m.attackDir=direction;m.lineup(team);const c=m.carrier,d=m.dir(team);
  c.x=x;c.y=550;
  for(const p of m.players.filter(p=>p.team===team&&p.id!==c.id)){p.x=x;p.y=c.y-d*25;}
  const defenders=m.players.filter(p=>p.team!==team);
  // A central player applies pressure while the back three cover their own lanes.
  const pressure=defenders[0];pressure.x=x;pressure.y=c.y+d*10;
  m.selected=c.id;
  const plan=m.defenseTargets(c),line=defenders.filter(p=>p.slot<4&&p.id!==plan.pressure).map(p=>plan.points.get(p.id));
  assert.equal(plan.pressure,pressure.id);
  assert.equal(plan.points.get(defenders[6].id).role,'cover');
  const wings=[4,5].map(slot=>plan.points.get(defenders[slot].id));
  assert.ok(wings[1].x-wings[0].x>400);
  for(const wing of wings)for(const point of line)assert.ok((wing.y-point.y)*d>=25);
  assert.ok((plan.points.get(defenders[6].id).y-wings[0].y)*d>=40);
  const markers=[...plan.points.values()].filter(p=>p.role==='mark').sort((a,b)=>a.x-b.x);
  for(let i=1;i<markers.length;i++)assert.ok(markers[i].x-markers[i-1].x>=80);
 }
});

test('AI defenders spread back out from a crowd during live play',()=>{
 const m=live(),c=m.carrier;
 for(const p of m.players.filter(p=>p.team===1)){p.x=300;p.y=450;}
 tick(m,5);
 const left=m.players[11],right=m.players[12],fullback=m.players[13];
 assert.ok(right.x-left.x>380);
 assert.ok((fullback.y-left.y)*m.dir(c.team)>25);
});

test('fullback always remains deepest and wings stay widest on both sides',()=>{
 for(const possession of [0,1])for(const attackDir of [-1,1])for(const x of [FIELD.left+8,FIELD.width/2,FIELD.right-8]){
  const m=live();m.attackDir=attackDir;m.lineup(possession);const c=m.carrier;c.x=x;c.y=FIELD.height/2;
  const defenders=m.players.filter(p=>p.team!==possession);m.selected=defenders[6].id;
  const plan=m.defenseTargets(c),forward=m.dir(c.team),fullback=plan.points.get(defenders[6].id);
  assert.notEqual(plan.pressure,defenders[6].id,'15 remains out of the pressure role');
  assert.equal(fullback.role,'cover');
  for(const wing of [defenders[4],defenders[5]]){
   const point=plan.points.get(wing.id);
   if(point.role==='mark')assert.ok(Math.abs(point.x-FIELD.width/2)>300*(FIELD.width/720),'wings hold the touchline channel');
   assert.ok((fullback.y-point.y)*forward>60,'15 stays deeper toward own try line than the wings');
  }
  assert.ok((fullback.y-c.y)*forward>150,'fullback covers well behind the defensive line');
 }
});
