import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,distance} from '../dist/engine.mjs';
const setup=()=>{const m=new Match();m.reset();m.phase='live';m.guard=999;return m;};
const tick=(m,t,input={x:0,y:0})=>{for(let i=0;i<Math.ceil(t*120);i++)m.step(1/120,input);};
test('hold aims all directions and release matches preview exactly',()=>{for(const dir of [-1,1])for(const aim of [{x:-1,y:0},{x:1,y:-1},{x:0,y:1},{x:0,y:-1}]){const m=setup();m.attackDir=dir;assert.equal(m.beginKick(aim),true);tick(m,.5,aim);const preview=m.kickTarget(m.kickAim,m.kickAim.power);assert.equal(m.ball,null);assert.equal(m.releaseKick(),true);assert.equal(m.ball.tx,preview.tx);assert.equal(m.ball.ty,preview.ty);assert.equal(m.stats.kicks[0],1);assert.equal(m.releaseKick(),false);}});
test('long hold increases range, saturates power, and neutral stick retains direction',()=>{const a=setup(),b=setup();a.beginKick({x:0,y:-1});b.beginKick({x:0,y:-1});tick(a,.1);tick(b,3.1);assert.equal(b.kickAim.power,1);assert.equal(b.kickAim.y,-1);a.releaseKick();b.releaseKick();assert.ok(distance(b.ball,{x:b.ball.tx,y:b.ball.ty})>distance(a.ball,{x:a.ball.tx,y:a.ball.ty}));});
test('aim lets the carrier run, cancel costs no kick energy and never kicks',()=>{const m=setup(),p=m.carrier,point={x:p.x,y:p.y};m.beginKick();tick(m,.5,{x:1,y:0,sprint:false});assert.ok(distance(p,point)>3&&distance(p,point)<12);m.pass();assert.equal(m.kickAim,null);assert.equal(m.stats.kicks[0],0);assert.equal(p.energy,100);assert.equal(m.releaseKick(),false);});
test('tackle, try, reset and expiry cancel kick preparation; no ghost kick on release',()=>{for(const kind of ['tackle','try','reset','expiry']){const m=setup();m.beginKick();if(kind==='tackle'){m.guard=0;m.tackle(m.players[7]);}if(kind==='try')m.tryScored(0);if(kind==='reset')m.reset();if(kind==='expiry'){m.time=0;m.step(1/120);}assert.equal(m.kickAim,null,kind);assert.equal(m.releaseKick(),false);assert.equal(m.stats.kicks[0],0);}});
test('cannot aim in defense, with insufficient stamina or during conversion',()=>{const m=setup();m.lineup(1);assert.equal(m.beginKick(),false);m.lineup(0);m.carrier.energy=11;assert.equal(m.beginKick(),false);m.carrier.energy=100;m.tryScored(0);m.beginConversion();assert.equal(m.beginKick(),false);});
test('kick aim slows world and clock to 35 percent while direction and power follow real time',()=>{
 const slow=setup(),normal=setup();slow.beginKick();
 tick(slow,1,{x:1,y:0});tick(normal,.35,{x:1,y:0});
 assert.ok(Math.abs(slow.time-normal.time)<.001);
 assert.ok(distance(slow.carrier,normal.carrier)<1);
 assert.ok(Math.abs(slow.kickAim.power-.5)<.001);
 assert.equal(slow.kickAim.x,1);assert.equal(slow.kickAim.y,0);
 const t=slow.time;assert.ok(slow.releaseKick());tick(slow,.2);assert.ok(Math.abs(t-slow.time-.2)<.001);
});
test('cancel immediately restores time speed; pause does not charge or advance time',()=>{
 const m=setup();m.beginKick();tick(m,.4);const power=m.kickAim.power,t=m.time;
 m.state='paused';tick(m,2);assert.equal(m.kickAim.power,power);assert.equal(m.time,t);
 m.state='playing';m.cancelKick();tick(m,.2);assert.ok(Math.abs(t-m.time-.2)<.001);assert.equal(m.ball,null);
});
