import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,distance} from '../dist/engine.mjs';
const live=()=>{const m=new Match();m.reset();m.phase='live';m.guard=999;m.passCooldown=0;return m;};
const tick=(m,t,input={x:0,y:0})=>{for(let i=0;i<Math.round(t*120);i++)m.step(1/120,input);};
test('short runs preserve energy but only resting recovers it',()=>{const rest=live(),run=live();rest.carrier.energy=run.carrier.energy=40;tick(rest,1);tick(run,1,{x:1,y:0});assert.ok(rest.carrier.energy>run.carrier.energy+5);assert.ok(run.carrier.energy<41);const full=live();tick(full,1,{x:1,y:0});assert.equal(full.carrier.energy,100);});
test('sprint drains only the active player and exhaustion cannot flicker every frame',()=>{const m=live();m.carrier.energy=10;tick(m,.5,{x:1,y:0,sprint:true});assert.ok(m.carrier.exhausted);assert.equal(m.players[1].energy,100);const energy=m.carrier.energy;tick(m,.3,{x:1,y:0,sprint:true});assert.ok(m.carrier.exhausted);assert.ok(m.carrier.energy>=energy);tick(m,4);assert.ok(m.carrier.energy>=25);assert.equal(m.carrier.exhausted,false);});
test('sprint costs 20 percent more but exhaustion preserves ordinary running',()=>{
 const fresh=live();fresh.carrier.runLoad=0;fresh.step(1/120,{x:1,y:0,sprint:true});assert.ok(Math.abs(fresh.carrier.energy-(100-28.8/120))<.02);
 const rested=live(),empty=live(),startRested={x:rested.carrier.x,y:rested.carrier.y},startEmpty={x:empty.carrier.x,y:empty.carrier.y};
 rested.carrier.energy=empty.carrier.energy=0;empty.carrier.exhausted=true;
 for(const m of [rested,empty]){m.carrier.energyWait=2;m.carrier.runLoad=0;}
 tick(rested,.3,{x:0,y:-1});tick(empty,.3,{x:0,y:-1});
 assert.ok(Math.abs(distance(empty.carrier,startEmpty)-distance(rested.carrier,startRested))<.01);
});
test('low but nonempty stamina preserves normal speed and passing, charge has a shorter timing window',()=>{const a=live(),b=live();a.carrier.energy=5;tick(a,.4,{x:1,y:0});tick(b,.4,{x:1,y:0});assert.ok(distance(a.carrier,b.carrier)<.01);assert.ok(a.pass());const fresh=live(),tired=live();tired.carrier.energy=38;fresh.special({x:0,y:-1});tired.special({x:0,y:-1});assert.ok(tired.carrier.charge>0&&tired.carrier.charge<fresh.carrier.charge);});
test('automatic tackles charge either team exactly once, including the offload window',()=>{for(const team of [0,1]){const m=live();m.lineup(team);m.guard=0;const defender=m.players[(1-team)*7];m.tackle(defender);assert.equal(defender.energy,88);if(m.phase==='contact'){m.phase='live';m.tackle(defender,false,true);}assert.equal(defender.energy,88);}});
test('pause freezes energy; reset fills all individual reserves',()=>{const m=live();m.spendEnergy(m.carrier,40);m.state='paused';tick(m,5);assert.equal(m.carrier.energy,60);m.reset();assert.ok(m.players.every(p=>p.energy===p.profile.stamina&&!p.exhausted));});
test('sustained running drains progressively and a brief stop does not reset accumulated effort',()=>{
 const m=live(),p=m.carrier;p.moveSpeed=78;
 for(let i=0;i<240;i++)m.recoverEnergy(1/120,{});
 assert.ok(p.energy>99.9);
 for(let i=0;i<240;i++)m.recoverEnergy(1/120,{});
 const early=100-p.energy,atFour=p.energy;
 for(let i=0;i<240;i++)m.recoverEnergy(1/120,{});
 assert.ok(atFour-p.energy>early);
 const load=p.runLoad;p.moveSpeed=0;m.recoverEnergy(.1,{});assert.ok(p.runLoad>load-1);
 p.moveSpeed=78;const energy=p.energy;m.recoverEnergy(.1,{});assert.ok(p.energy<energy);
});
test('normal running fatigue applies equally to AI on both teams and does not drain idle players',()=>{
 const m=live();for(const p of m.players)p.moveSpeed=p.slot===1?78:0;
 for(let i=0;i<1200;i++)m.recoverEnergy(1/120,{});
 assert.ok(m.players[1].energy<85);assert.equal(m.players[1].energy,m.players[8].energy);
 assert.equal(m.carrier.energy,100);
});
test('actual long runs lose energy; rest restores it without reducing normal pace',()=>{
 const m=live();tick(m,5,{x:0,y:-1});assert.ok(m.carrier.energy<97);
 const energy=m.carrier.energy;tick(m,2);assert.ok(m.carrier.energy>energy);
 const a=live(),b=live();a.carrier.energy=1;a.carrier.exhausted=true;a.carrier.runLoad=12;
 const startA={x:a.carrier.x,y:a.carrier.y},startB={x:b.carrier.x,y:b.carrier.y};
 tick(a,1,{x:0,y:-1});tick(b,1,{x:0,y:-1});assert.ok(Math.abs(distance(a.carrier,startA)-distance(b.carrier,startB))<.01);
});
test('fatigue follows simulation time during kick aim and freezes on pause',()=>{
 const slow=live(),normal=live();for(const m of [slow,normal]){m.carrier.runLoad=6;m.carrier.moveSpeed=78;}
 slow.beginKick();tick(slow,1,{x:0,y:-1});tick(normal,.35,{x:0,y:-1});
 assert.ok(Math.abs(slow.carrier.energy-normal.carrier.energy)<.1);
 assert.ok(Math.abs(slow.carrier.runLoad-normal.carrier.runLoad)<.02);
 const load=slow.carrier.runLoad,energy=slow.carrier.energy;slow.state='paused';tick(slow,3);
 assert.equal(slow.carrier.runLoad,load);assert.equal(slow.carrier.energy,energy);
 slow.reset();assert.ok(slow.players.every(p=>p.runLoad===0&&p.moveSpeed===0));
});
test('kicks and sidesteps charge once and immediate rest respects recovery delay',()=>{
 const kick=live();assert.ok(kick.kick({x:0,y:-1},.5));assert.equal(kick.carrier.energy,88);tick(kick,.3);assert.equal(kick.players[0].energy,88);
 const dodge=live();dodge.special({x:1,y:0});assert.equal(dodge.carrier.energy,82);tick(dodge,.1,{x:1,y:0});assert.equal(dodge.carrier.energy,82);
});


test('off-ball recovery is exactly 9 percent faster, for both teams and national bonuses',()=>{
 for(const team of [0,1])for(const home of ['ita','fra','wal']){
  const m=live();m.reset({home,away:home==='fra'?'ita':'fra'});m.lineup(team);m.phase='live';
  const carrier=m.carrier,other=m.players[team*7+1];
  for(const speed of [0,20]){
   for(const p of [carrier,other])Object.assign(p,{energy:20,energyWait:0,moveSpeed:speed});
   m.recoverEnergy(.25,{});
   assert.ok(Math.abs((other.energy-20)/(carrier.energy-20)-1.09)<1e-10);
  }
 }
});
test('a ball in flight gives the passer the off-ball recovery bonus; cooldown and cap remain',()=>{
 const m=live(),p=m.carrier;p.energy=20;p.moveSpeed=0;
 m.ball={kind:'pass'};m.recoverEnergy(.25,{});
 assert.ok(Math.abs(p.energy-(20+3*p.nation.recovery*1.09))<1e-10);
 p.energyWait=.65;const energy=p.energy;m.recoverEnergy(.2,{});assert.equal(p.energy,energy);
 p.energyWait=0;p.energy=99.9;m.recoverEnergy(.25,{});assert.equal(p.energy,100);
});
