import test from 'node:test';
import assert from 'node:assert/strict';
import {Match,FIELD} from '../dist/engine.mjs';
function ball(angle){return {kind:'kick',sx:FIELD.width/2,sy:FIELD.height/2,tx:FIELD.width/2+100*Math.cos(angle),ty:FIELD.height/2+100*Math.sin(angle),x:FIELD.width/2,y:FIELD.height/2,from:0,duration:1,t:0};}
test('oval ball bounces and settles in every direction without gaining energy',()=>{
 for(let i=0;i<16;i++){
  const m=new Match(),b=ball(i*Math.PI/8);m.startKickBounce(b);
  let previous=Infinity;
  for(let j=0;j<1200;j++){
   m.stepKickBall(b,1/120);const energy=(b.vx*b.vx+b.vy*b.vy+b.vz*b.vz)/2+180*b.z;
   assert.ok(Number.isFinite(energy)&&b.z>=0);assert.ok(energy<=previous+.001);previous=energy;
  }
  assert.ok(b.bounceCount>0);assert.equal(b.z,0);assert.equal(b.vx,0);assert.equal(b.vy,0);
 }
});
test('bounce trajectory is stable at 30, 60 and 120 updates per second',()=>{
 const m=new Match(),balls=[30,60,120].map(rate=>{const b=ball(.7);m.startKickBounce(b);for(let i=0;i<rate*2;i++)m.stepKickBall(b,1/rate);return b;});
 for(const b of balls){assert.ok(Math.abs(b.x-balls[0].x)<.01);assert.ok(Math.abs(b.y-balls[0].y)<.01);assert.ok(Math.abs(b.z-balls[0].z)<.01);}
});
