import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,distance} from '../dist/engine.mjs';
const setup=(team=0)=>{const m=new Match();m.reset();m.phase='live';m.lineup(team);m.guard=0;m.passCooldown=0;return m;};
const tick=(m,n,input={x:0,y:0})=>{for(let i=0;i<n;i++)m.step(1/120,input);};
test('defense hold contains without a forward lunge; release and cancellation do not dive',()=>{
 const m=setup(1),p=m.controlled,start={x:p.x,y:p.y};m.beginSpecial();tick(m,30,{x:0,y:0,sprint:true});
 assert.equal(p.brace,true);assert.equal(p.dive,0);assert.ok(distance(p,start)<1);
 const plan=m.defenseTargets(m.carrier);assert.equal(plan.pressure,p.id);assert.equal([...plan.points.values()].filter(v=>v.role==='cover').length,1);
 m.releaseSpecial();assert.equal(p.brace,false);assert.equal(p.dive,0);
 m.beginSpecial();m.releaseSpecial(true);assert.equal(p.dive,0);
});
test('short defensive tap dives once, while a changed controlled player cancels it',()=>{
 const m=setup(1),p=m.controlled;m.beginSpecial();m.releaseSpecial();assert.ok(p.dive>0);
 const n=setup(1);n.beginSpecial();n.selected=(n.selected+1)%7;n.releaseSpecial();assert.equal(n.controlled.dive,0);
});
test('a braced defender stops a frontal charge instead of being knocked down',()=>{
 const m=setup(1),c=m.carrier,p=m.controlled;
 m.beginSpecial();tick(m,25,{x:0,y:0,sprint:true});assert.equal(p.brace,true);
 p.x=c.x;p.y=c.y+17;c.charge=1;c.chargeX=0;c.chargeY=1;c.burst=.4;m.guard=0;m.tackle(p);
 assert.equal(m.stats.breaks[1],0);assert.equal(c.charge,0);assert.equal(c.burst,0);assert.ok(m.phase==='contact'||m.phase==='ruck');
});
test('lateral action sidesteps with energy and cooldown, forward action remains a charge',()=>{
 const m=setup(),p=m.carrier,x=p.x;m.guard=99;m.special({x:1,y:0});assert.equal(p.energy,p.profile.stamina-18);assert.equal(p.charge,0);assert.ok(p.evade>0);
 m.special({x:1,y:0});assert.equal(p.energy,p.profile.stamina-18);tick(m,22);assert.ok(p.x>x+15);
 const n=setup();n.special({x:0,y:-1});assert.ok(n.carrier.charge>0);assert.equal(n.carrier.evade,0);
});
test('automatic tackle has a readable wind-up and misses a lateral escape',()=>{
 const m=setup(),c=m.carrier,d=m.players[7];m.players.filter(p=>p.team===1&&p!==d).forEach(p=>p.down=5);
 d.x=c.x;d.y=c.y-20;m.step(1/120);assert.equal(m.phase,'live');assert.ok(d.tackleWind>0);
 m.special({x:1,y:0});tick(m,38,{x:1,y:0});assert.equal(m.phase,'live');assert.equal(m.tackles,0);assert.ok(d.cd>0);
});
test('kick reception grants time for a decision and holding defense cannot survive possession change',()=>{
 const m=setup();m.kick();m.recoverKick(m.players[7]);assert.ok(m.guard>=.7);
 m.beginSpecial();m.ball={team:1};m.recoverKick(m.players[0]);tick(m,1,{sprint:true});assert.equal(m.defenseGesture,null);assert.equal(m.players.some(p=>p.brace),false);
});
