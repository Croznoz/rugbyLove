import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,distance,FIELD} from '../dist/engine.mjs';
import {NATIONS,teamPair,matchKits} from '../dist/teams.mjs';
function setup(home,away='eng'){
 const m=new Match();m.reset({home,away});m.phase='live';m.guard=999;m.passCooldown=0;return m;
}
test('all thirty national pairings preserve roles, bounded modifiers and readable kits',()=>{
 assert.equal(NATIONS.length,6);
 for(const home of NATIONS)for(const away of NATIONS){if(home===away)continue;
  const m=setup(home.id,away.id);assert.deepEqual(m.teams.map(t=>t.id),[home.id,away.id]);
  for(let i=0;i<7;i++){assert.equal(m.players[i].profile,m.players[i+7].profile);assert.equal(m.players[i].nation,home.stats);assert.equal(m.players[i+7].nation,away.stats);}
  assert.notEqual(m.kits[0].body,m.kits[1].body);
  for(const n of m.teams)for(const v of Object.values(n.stats))assert.ok(v>=.92&&v<=1.08);
 }
 assert.notEqual(teamPair('fra','fra')[0],teamPair('fra','fra')[1]);
 assert.deepEqual(teamPair('invalid','irl').map(t=>t.id),['ita','irl']);
 assert.equal(matchKits(teamPair('fra','sco'))[1].body,NATIONS.find(t=>t.id==='eng').kit.body);
});
test('nations keep identical ordinary running and free passes even at zero energy',()=>{
 const speeds=[];
 for(const n of NATIONS){
  const m=setup(n.id);for(const p of m.players)if(p.id!==0)p.down=10;
  const origin={...m.carrier};for(let i=0;i<60;i++)m.step(1/120,{x:0,y:-1});speeds.push(distance(origin,m.carrier));
  const r=m.players[1];Object.assign(r,{down:0,x:m.carrier.x+100,y:m.carrier.y+25});m.carrier.energy=0;m.carrier.exhausted=true;
  assert.equal(m.pass(),true);assert.equal(m.carrier.energy,0);
 }
 assert.ok(Math.max(...speeds)-Math.min(...speeds)<1e-8);
});
test('national strengths change recovery, passes, charge, dodge, tackles and kick previews',()=>{
 const it=setup('ita'),fr=setup('fra');it.carrier.energy=fr.carrier.energy=40;it.recoverEnergy(1,{});fr.recoverEnergy(1,{});assert.ok(it.carrier.energy>fr.carrier.energy);
 it.carrier.energy=fr.carrier.energy=100;it.special({x:0,y:-1});fr.special({x:0,y:-1});assert.ok(fr.carrier.charge>it.carrier.charge);
 const passTime=id=>{const m=setup(id),r=m.players[1];r.x=m.carrier.x+140;r.y=m.carrier.y+20;m.throwBall(r);return m.ball.duration;};assert.ok(passTime('irl')<passTime('fra'));
 const dodge=id=>{const m=setup(id),origin={...m.carrier};for(const p of m.players)if(p.id!==0)p.down=10;m.special({x:1,y:0});for(let i=0;i<12;i++)m.step(1/120,{x:1,y:0});return distance(origin,m.carrier);};assert.ok(dodge('sco')>dodge('eng'));
 const tackle=id=>{const m=setup(id);m.lineup(1);m.special();return m.controlled.dive;};assert.ok(tackle('wal')>tackle('sco'));
 const ranges={};for(const n of NATIONS){const m=setup(n.id);m.carrier.y=FIELD.bottom-80;m.beginKick({x:0,y:-1});m.updateKickAim(3,{x:0,y:-1});const a=m.kickTarget(m.kickAim,1);ranges[n.id]=distance(m.carrier,{x:a.tx,y:a.ty});m.releaseKick();assert.equal(m.ball.tx,a.tx);assert.equal(m.ball.ty,a.ty);}
 assert.ok(ranges.eng>ranges.wal);
});
test('CPU uses the same national attack windows and costs; scrum strength applies to either side',()=>{
 for(const id of ['fra','sco']){const m=setup('ita',id);m.lineup(1);const p=m.carrier,e=p.energy;m.attackAction(p,id==='sco'?{x:1,y:0}:{x:0,y:1});assert.equal(e-p.energy,id==='sco'?18:36);assert.ok(p.charge>0||p.evade>0);}
 const push=(home,away)=>{const m=setup(home,away);m.beginScrum(0);m.scrumAction();m.scrum.elapsed=m.scrum.intro;m.scrum.needle=.5;const b=m.scrum.balance;m.scrumAction();return m.scrum.balance-b;};assert.ok(push('eng','fra')>push('fra','eng'));
 const pressure=(away)=>{const m=setup('ita',away);m.beginScrum(1);m.stepScrum(1,{});return m.scrum.balance;};assert.ok(pressure('eng')<pressure('fra'));
});
test('each nation can score against every opponent on hard; match events use selected names',()=>{
 for(const home of NATIONS)for(const away of NATIONS){if(home===away)continue;
  const m=setup(home.id,away.id);m.difficulty='hard';m.aiSpeed=88;
  m.carrier.y=FIELD.top+8;for(const p of m.players.slice(7))p.y=700;
  for(let i=0;i<30&&m.phase==='live';i++)m.step(1/120,{x:0,y:-1});
  assert.equal(m.score[0],5);assert.ok(m.events.some(e=>e.text==='META '+home.name+'!'));
 }
});
