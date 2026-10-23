import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,PROFILES,distance,FIELD} from '../dist/engine.mjs';
function setup(profile){const m=new Match();m.reset();m.phase='live';m.guard=999;m.passCooldown=0;m.carrier.profile=profile;for(const p of m.players)if(p.id!==m.carrierId)p.down=10;return m;}
function run(profile,sprint=false){const m=setup(profile),start={x:m.carrier.x,y:m.carrier.y};for(let i=0;i<60;i++)m.step(1/120,{x:0,y:-1,sprint});return distance(start,m.carrier);}
test('profiles are role-based, symmetric between teams and restored on reset',()=>{
 const m=new Match();for(let i=0;i<7;i++)assert.equal(m.players[i].profile,m.players[i+7].profile);
 assert.equal(m.players[2].profile,PROFILES.powerful);assert.equal(m.players[4].profile,PROFILES.agile);assert.equal(m.players[1].profile,PROFILES.playmaker);
 m.players[0].profile=PROFILES.agile;m.reset();assert.equal(m.players[0].profile,PROFILES.playmaker);
});
test('normal running is equal while agile sprint outruns powerful sprint',()=>{
 const normal=Object.values(PROFILES).map(p=>run(p));assert.ok(Math.max(...normal)-Math.min(...normal)<.001);
 assert.ok(run(PROFILES.agile,true)>run(PROFILES.powerful,true)+4);
});
test('ordinary carriers run 18% slower than free runners on both teams',()=>{
 const home=setup(PROFILES.playmaker);
 for(let i=0;i<90;i++)home.step(1/120,{x:0,y:-1});
 assert.ok(Math.abs(home.carrier.moveSpeed-78*.82)<.1);
 const away=new Match();away.reset({difficulty:'hard'});away.lineup(1);away.phase='live';away.guard=999;away.cpuThink=999;
 for(const p of away.players)if(p.id!==away.carrierId&&p.id!==0)p.down=100;
 Object.assign(away.players[0],{x:FIELD.width/2+180,y:FIELD.height/2,vx:0,vy:0});
 for(let i=0;i<90;i++)away.step(1/120,{x:0,y:1});
 assert.ok(Math.abs(away.carrier.moveSpeed-78*.82)<.1);
 assert.ok(away.players[0].moveSpeed>away.carrier.moveSpeed);
 assert.ok(away.players[0].moveSpeed>77&&away.players[0].moveSpeed<79);
});
test('every profile can pass when exhausted and kick preview remains exact',()=>{
 for(const profile of Object.values(PROFILES)){
  const m=setup(profile),c=m.carrier,r=m.players[1];Object.assign(r,{down:0,x:c.x+65,y:c.y+25});c.energy=0;c.exhausted=true;
  assert.ok(m.pass());assert.equal(m.ball.to,r.id);
  const k=setup(profile);assert.ok(k.beginKick({x:1,y:-1}));k.updateKickAim(3,{x:1,y:-1});assert.equal(k.kickAim.power,1);
  const preview=k.kickTarget(k.kickAim,k.kickAim.power);assert.ok(k.releaseKick());assert.equal(k.ball.tx,preview.tx);assert.equal(k.ball.ty,preview.ty);
 }
});
test('powerful charge and tackle last longer; agile dodge travels farther; playmaker kick reaches farther',()=>{
 const powerful=setup(PROFILES.powerful),agile=setup(PROFILES.agile);powerful.special({x:0,y:-1});agile.special({x:0,y:-1});assert.ok(powerful.carrier.charge>agile.carrier.charge);
 const dodge=profile=>{const m=setup(profile),start={x:m.carrier.x,y:m.carrier.y};m.special({x:1,y:0});for(let i=0;i<12;i++)m.step(1/120,{x:1,y:0});return distance(start,m.carrier);};assert.ok(dodge(PROFILES.agile)>dodge(PROFILES.powerful));
 const dive=profile=>{const m=setup(profile);m.lineup(1);m.controlled.profile=profile;m.special();return m.controlled.dive;};assert.ok(dive(PROFILES.powerful)>dive(PROFILES.agile));
 const reach=profile=>{const m=setup(profile),t=m.kickTarget({x:0,y:-1},1);return distance(m.carrier,{x:t.tx,y:t.ty});};assert.ok(reach(PROFILES.playmaker)>reach(PROFILES.agile)*1.1);
});
test('profile capacity changes real sprint endurance and recovery stops at each capacity',()=>{
 const duration=profile=>{const m=setup(profile),p=m.carrier;p.energy=profile.stamina;let frames=0;while(!p.exhausted&&frames<1200){m.step(1/120,{x:Math.sin(frames/90),y:Math.cos(frames/90),sprint:true});frames++;}assert.ok(p.exhausted);return frames/120;};
 assert.ok(duration(PROFILES.agile)>duration(PROFILES.playmaker));assert.ok(duration(PROFILES.playmaker)>duration(PROFILES.powerful));
 const m=new Match();m.reset();for(const p of m.players){assert.equal(p.energy,p.profile.stamina);m.spendEnergy(p,200);assert.equal(p.energy,0);}
 for(let i=0;i<1440;i++)m.recoverEnergy(1/120,{});
 for(const p of m.players)assert.equal(p.energy,p.profile.stamina);
});

test('playmaker kick has 35 percent more range at every charge level and respects field limits',()=>{
 for(const dir of [-1,1])for(const power of [.25,.5,1]){
  const normal=setup(PROFILES.agile),regista=setup(PROFILES.playmaker);
  normal.attackDir=regista.attackDir=dir;normal.carrier.y=regista.carrier.y=FIELD.height/2-dir*60;
  const a=normal.kickTarget({x:0,y:dir},power),b=regista.kickTarget({x:0,y:dir},power);
  assert.ok(Math.abs(distance(regista.carrier,{x:b.tx,y:b.ty})/distance(normal.carrier,{x:a.tx,y:a.ty})-1.35)<.0001);
  regista.carrier.y=dir<0?120:980;regista.beginKick({x:0,y:dir});regista.updateKickAim(3,{x:0,y:dir});
  const preview=regista.kickTarget(regista.kickAim,regista.kickAim.power);regista.releaseKick();
  assert.equal(regista.ball.ty,preview.ty);assert.ok(regista.ball.ty>=FIELD.top-12&&regista.ball.ty<=FIELD.bottom+12);
 }
});

test('field shrinks five percent, stamina grows ten percent and kick reach grows five percent independently',()=>{
 const oldField={width:720,height:1320,left:51,right:669,top:127.5,bottom:1192.5,inGoalTop:45,inGoalBottom:1275};
 for(const [key,old] of Object.entries(oldField))assert.ok(Math.abs(FIELD[key]/old-.95)<1e-12);
 assert.equal(PROFILES.playmaker.stamina,110);assert.equal(PROFILES.powerful.stamina,99);assert.equal(PROFILES.agile.stamina,132);
 for(const dir of [-1,1])for(const power of [.25,.5,1]){
  const m=setup(PROFILES.playmaker);m.attackDir=dir;m.carrier.y=FIELD.height/2-dir*80;
  const target=m.kickTarget({x:0,y:dir},power);
  const oldRange=(power<=.32?70+power*120:110+power*200)*1.2*1.35;
  assert.ok(Math.abs(distance(m.carrier,{x:target.tx,y:target.ty})/oldRange-1.05)<1e-10);
 }
 const cpu=new Match();cpu.lineup(1);const y=cpu.carrier.y;cpu.launchKickoff();assert.ok(Math.abs(Math.abs(cpu.ball.ty-y)-216*1.05)<1e-10);
});
