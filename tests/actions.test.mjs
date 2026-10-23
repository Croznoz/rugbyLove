import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD,distance} from '../dist/engine.mjs';
const live=()=>{const m=new Match();m.reset();m.phase='live';m.guard=0;m.passCooldown=0;m.events=[];return m;};
const tick=(m,seconds,input={x:0,y:0})=>{for(let i=0;i<Math.ceil(seconds*120);i++)m.step(1/120,input);};
test('timed forward charge breaks one tackle, consumes stamina, preserves possession',()=>{
 const m=live(),c=m.carrier,d=m.players[7];d.x=c.x;d.y=c.y-17;m.special({x:0,y:-1});assert.equal(c.energy,c.profile.stamina-36);m.tackle(d);
 assert.equal(m.phase,'live');assert.equal(m.possession,0);assert.equal(m.stats.breaks[0],1);assert.equal(m.tackles,0);assert.ok(d.down>0);assert.equal(c.charge,0);
 m.guard=0;m.tackle(m.players[8]);if(m.phase==='contact')m.step(.35);assert.equal(m.phase,'ruck');assert.equal(m.tackles,1);
});
test('charge fails against a tackle from behind or after timing window',()=>{
 const m=live(),c=m.carrier,d=m.players[7];d.x=c.x;d.y=c.y+16;m.special({x:0,y:-1});m.tackle(d);if(m.phase==='contact')m.step(.35);assert.equal(m.phase,'ruck');assert.equal(m.stats.breaks[0],0);
 const n=live();n.guard=99;n.special();tick(n,.6);n.guard=0;n.tackle(n.players[7]);if(n.phase==='contact')n.step(.35);assert.equal(n.phase,'ruck');assert.equal(n.stats.breaks[0],0);
});
test('charge cooldown and low stamina prevent repeated invulnerability',()=>{const m=live(),c=m.carrier;m.special();const energy=c.energy;m.special();assert.equal(c.energy,energy);c.cd=0;c.charge=0;c.energy=29;m.special();assert.equal(c.charge,0);assert.equal(c.energy,29);});
test('dive moves toward carrier, hits at contact, and cannot tackle remotely',()=>{
 const m=live();m.lineup(1);m.guard=0;const p=m.controlled;p.x=m.carrier.x+55;p.y=m.carrier.y;const x=p.x;m.special();assert.equal(m.phase,'live');tick(m,.07);assert.ok(p.x<x-10);tick(m,.12);if(m.phase==='contact')m.step(.35);assert.equal(m.phase,'ruck');assert.equal(m.stats.tackles[0],1);
 const n=live();n.lineup(1);n.guard=0;n.controlled.x=42;n.carrier.x=430;n.special();tick(n,.25);assert.equal(n.phase,'live');assert.ok(n.controlled.down>0);assert.equal(n.stats.tackles[0],0);
});
test('kick goes forward in each half, respects aim and creates a contested ball',()=>{
 for(const dir of [-1,1]){const m=live();m.attackDir=dir;m.lineup(0);const c=m.carrier;assert.ok(m.kick(1));assert.ok(m.loose);assert.ok((m.ball.ty-c.y)*dir>0);assert.ok(m.ball.tx>c.x);assert.equal(m.stats.kicks[0],1);assert.equal(m.kick(),false);assert.equal(m.pass(),false);}
});
test('ball in flight cannot be charged, passed, tackled or counted as a try',()=>{
 const m=live();assert.ok(m.kick());const b=m.ball;m.special();m.tackle(m.players[7]);m.pass();assert.equal(m.ball,b);assert.equal(m.phase,'live');assert.equal(m.tackles,0);assert.deepEqual(m.score,[0,0]);
 m.carrier.y=FIELD.top-1;tick(m,.1);assert.deepEqual(m.score,[0,0]);
});
test('kick possession goes to a nearby eligible attacker or defender, without teleporting',()=>{
 for(const id of [1,7]){const m=live();m.kick();const b=m.ball;m.players.forEach(p=>{p.x=50;p.y=700;p.down=10;});const p=m.players[id];p.down=0;p.x=b.tx;p.y=b.ty;if(id===1)b.eligible.push(id);b.t=b.duration;const prior={x:p.x,y:p.y};m.step(1/120);
 assert.equal(m.ball,null);assert.equal(m.carrierId,id);assert.equal(m.possession,p.team);assert.ok(distance(p,prior)<2);if(id===1)assert.equal(m.selected,1);}
});
test('players ahead of kicker cannot poach a recovery until onside',()=>{
 const m=live();m.players[1].y=m.carrier.y-100;m.kick();const b=m.ball,p=m.players[1];p.x=b.tx;p.y=b.ty;b.t=b.duration;
 m.step(1/120);assert.ok(m.ball);assert.equal(m.canChase(p),false);
 m.carrier.y=p.y-1;assert.equal(m.canChase(p),true);
});
test('kick can land in the in-goal but only recovery scores the try',()=>{
 const m=live();m.carrier.y=150;m.kick();const b=m.ball;assert.ok(b.ty<FIELD.top);m.players.forEach(p=>p.down=10);tick(m,1.3);assert.equal(m.score[0],0);
 const c=m.carrier;c.down=0;c.x=b.tx;c.y=b.ty;m.step(1/120);assert.equal(m.ball,null);m.step(1/120);assert.equal(m.score[0],5);
});
test('unclaimed kick is chased and resolved, match cannot get stuck',()=>{
 const m=live();m.kick();tick(m,12);assert.notEqual(m.ball?.kind,'kick');assert.ok(m.events.some(e=>e.type==='recovery'));assert.ok(m.time<59);assert.ok(m.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});
test('kick disabled without possession, during pause, or without enough stamina',()=>{
 const m=live();m.carrier.energy=11;assert.equal(m.kick(),false);m.carrier.energy=100;m.state='paused';assert.equal(m.kick(),false);m.state='playing';m.lineup(1);assert.equal(m.kick(),false);assert.equal(m.ball,null);
});
