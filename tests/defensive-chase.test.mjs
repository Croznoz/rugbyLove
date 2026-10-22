import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD} from '../dist/engine.mjs';

function chase(dir=1,energy=100){
  const m=new Match();m.reset({difficulty:'hard',seconds:120});m.lineup(1);m.phase='live';m.attackDir=-dir;m.guard=0;m.cpuThink=100;
  for(const p of m.players)p.down=100;
  Object.assign(m.carrier,{x:FIELD.width/2,y:FIELD.height/2-dir*180,down:0,vx:0,vy:dir*88});
  m.selected=0;
  Object.assign(m.controlled,{x:m.carrier.x,y:m.carrier.y-dir*48,down:0,energy,vx:0,vy:0});
  return m;
}
test('hard-mode rear pursuit closes the gap and completes a tackle in both halves, even exhausted',()=>{
  for(const dir of [-1,1])for(const energy of [0,100]){
    const m=chase(dir,energy);
    for(let i=0;i<720&&m.phase==='live';i++)m.step(1/120,{x:0,y:dir});
    assert.equal(m.stats.tackles[0],1);
    assert.equal(m.phase,'ruck');
  }
});
test('recovery pace requires moving toward the carrier, without a held action button',()=>{
  const m=chase();
  for(let i=0;i<60;i++)m.step(1/120,{x:1,y:0});
  assert.ok(m.controlled.moveSpeed<=78.01);
  for(let i=0;i<60;i++)m.step(1/120,{x:0,y:0});
  assert.ok(m.controlled.moveSpeed<.1);
});
test('a broken tackle retains its knockdown but the defender can recover ground afterwards',()=>{
  const m=chase();const c=m.carrier,p=m.controlled;
  p.y=c.y+12;c.charge=.4;c.chargeX=0;c.chargeY=1;
  m.tackle(p);
  assert.equal(m.stats.breaks[1],1);assert.ok(p.down>0);
  for(let i=0;i<120;i++)m.step(1/120,{x:0,y:1});
  const gap=c.y-p.y;
  for(let i=0;i<120;i++)m.step(1/120,{x:0,y:1});
  assert.ok(c.y-p.y<gap-5);
});
