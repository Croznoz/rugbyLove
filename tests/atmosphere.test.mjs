import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD} from '../dist/engine.mjs';
function escape(team=0,dir=-1){
 const m=new Match();m.reset();m.lineup(team);m.phase='live';m.attackDir=team===0?dir:-dir;
 const c=m.carrier;Object.assign(c,{x:300,y:550,vy:dir*78,vx:0});
 for(const p of m.players.filter(p=>p.team!==team))Object.assign(p,{y:c.y-dir*80,down:0});
 return m;
}
test('breakaway celebrates either team in either half and builds near the try line',()=>{
 for(const team of [0,1])for(const dir of [-1,1]){
  const m=escape(team,dir),before=m.breakawayIntensity();assert.ok(before>0);
  m.carrier.y=dir<0?FIELD.top+40:FIELD.bottom-40;
  for(const p of m.players.filter(p=>p.team!==team))p.y=m.carrier.y-dir*80;
  assert.ok(m.breakawayIntensity()>before);
  m.carrier.vy=0;assert.equal(m.breakawayIntensity(),0);
 }
});
test('ordinary attack, two cover defenders, pass, kick aim and contact do not trigger the crowd',()=>{
 const m=escape();const rivals=m.players.filter(p=>p.team===1);
 rivals[0].y=rivals[1].y=m.carrier.y-60;assert.equal(m.breakawayIntensity(),0);
 rivals[1].y=m.carrier.y+80;assert.ok(m.breakawayIntensity()>0);
 m.ball={kind:'pass'};assert.equal(m.breakawayIntensity(),0);m.ball=null;
 m.kickAim={};assert.equal(m.breakawayIntensity(),0);m.kickAim=null;
 m.phase='contact';assert.equal(m.breakawayIntensity(),0);
 m.lineup(0);m.phase='live';m.carrier.vy=-78;assert.equal(m.breakawayIntensity(),0);
});
test('presentation queries do not mutate match or prevent the five-point try and conversion',()=>{
 const m=escape(),before=JSON.stringify(m);
 for(let i=0;i<50;i++)m.breakawayIntensity();
 assert.equal(JSON.stringify(m),before);
 m.tryScored(0);assert.equal(m.score[0],5);assert.equal(m.breakawayIntensity(),0);
 for(let i=0;i<270;i++)m.step(1/120);
 assert.equal(m.phase,'conversion');assert.equal(m.score[0],5);
 m.reset();assert.equal(m.breakawayIntensity(),0);
});
