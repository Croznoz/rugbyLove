import test from 'node:test';
import assert from 'node:assert/strict';
import {KickChallenge} from '../dist/kicks-engine.mjs';
import {kickProjection} from '../dist/kicks-render.mjs';
import {bindKickControls} from '../dist/kicks-controls.mjs';
const live=()=>{const g=new KickChallenge();g.start();return g;};
function step(g,seconds,axis=0){for(let i=0;i<Math.ceil(seconds*120);i++)g.step(1/120,axis);}
function shoot(g,power=g.minPower+.05,accuracy=.5){g.elapsed=.2;g.power=power;assert.ok(g.action());g.elapsed=.2;g.accuracy=accuracy;assert.ok(g.action());}
test('kick stages require separate taps and points resolve once after flight',()=>{
 const g=live();assert.equal(g.action(),false);shoot(g);assert.equal(g.stage,'flight');assert.equal(g.action(),false);assert.equal(g.score,0);assert.equal(g.lives,3);
 step(g,1.7);assert.equal(g.stage,'result');assert.equal(g.goals,1);assert.ok(g.score>100);const score=g.score;g.resolve();step(g,1);assert.equal(g.score,score);
 assert.ok(g.action());assert.equal(g.stage,'power');assert.equal(g.level,2);assert.equal(g.shotLevel,2);assert.equal(g.powerLocked,null);
});
test('short kicks and wide kicks cost one life, and the third error ends the game',()=>{
 const g=live();
 for(let i=0;i<3;i++){
  shoot(g,i===0?g.minPower-.01:.99,i===0?.5:i===1?0:1);
  assert.equal(g.result.reason,['TIRO CORTO','FUORI A SINISTRA','FUORI A DESTRA'][i]);
  step(g,1.7);assert.equal(g.lives,2-i);assert.equal(g.score,0);
  if(i<2){step(g,.8);assert.ok(g.action());}else{assert.equal(g.state,'over');assert.equal(g.action(),false);}
 }
 g.start();assert.equal(g.lives,3);assert.equal(g.attempt,0);assert.equal(g.score,0);
});
test('distance, position, wind and timing grow with bounded, achievable difficulty',()=>{
 const g=live(),firstTolerance=g.tolerance;let lastDepth=0;
 assert.equal(g.position.z,28);assert.equal(g.position.x,6);assert.equal(g.meterSpeed,.82);assert.ok(firstTolerance<.12);
 for(let n=0;n<120;n++){
  assert.ok(g.position.z>=lastDepth);lastDepth=g.position.z;
  assert.ok(g.distance<57);assert.ok(Math.abs(g.position.x)<=23);assert.ok(Math.abs(g.wind)<=3.2);assert.ok(g.minPower<.87);
  assert.ok(g.tolerance>=.055&&g.tolerance<=firstTolerance);assert.ok(g.meterSpeed<=1.45);
  if(n<4)assert.equal(g.wind,0);if(n===4)assert.notEqual(g.wind,0);if(n===1)assert.ok(g.position.x<0);if(n===2)assert.ok(g.position.x>0);
  g.aim=-g.wind;shoot(g);assert.equal(g.result.scored,true);step(g,2.5);assert.ok(g.action());
 }
 assert.equal(g.goals,120);assert.equal(g.lives,3);
});
test('green interval and rendered crossing agree with success including wind and off-centre aim',()=>{
 for(const level of [1,5,12,40])for(const aim of [-3,0,3]){
  const g=live();g.goals=level-1;g.attempt=level;g.prepare();g.aim=aim;
  const green=g.green,precision=(green.left+green.right)/2;shoot(g,g.minPower+.05,precision);
  assert.ok(g.result.scored);assert.ok(Math.abs(g.result.error)<=2.8);assert.ok(g.result.crossHeight>3);
  const p=kickProjection(g,g.result.error,g.result.crossHeight,0),left=kickProjection(g,-2.8,g.result.crossHeight,0),right=kickProjection(g,2.8,g.result.crossHeight,0);
  assert.ok(p.x>=Math.min(left.x,right.x)-.001&&p.x<=Math.max(left.x,right.x)+.001);
 }
});
test('pause freezes real-time meters and flight; aim is bounded and locked during flight',()=>{
 const g=live();step(g,1,1);assert.ok(g.aim>2.9);const power=g.power;g.state='paused';step(g,2,1);assert.equal(g.power,power);assert.equal(g.action(),false);g.state='playing';
 step(g,4,1);assert.equal(g.aim,7);step(g,8,-1);assert.equal(g.aim,-7);g.aim=0;shoot(g);step(g,.3,1);assert.equal(g.aim,0);
 const t=g.flightTime;g.state='paused';step(g,2);assert.equal(g.flightTime,t);
});
function node(){const events={};return {events,style:{},addEventListener(k,f){(events[k]||=[]).push(f);},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};},fire(k,args={}){for(const f of events[k]||[])f({preventDefault(){},...args});}};}
function controls(){const elements={target:node(),joystick:node(),stick:node(),left:node(),right:node(),kick:node()};let shots=0,paused=0,aim=0;const control=bindKickControls({...elements,active:()=>true,canAim:()=>true,steer:(n,dt)=>aim+=n*dt,shoot:()=>shots++,pause:()=>{paused++;control.clear();}});return {...elements,control,get shots(){return shots;},get paused(){return paused;},get aim(){return aim;}};}
test('touch aim and kick coexist, generated click is ignored, releases cannot leave steering held',()=>{
 const c=controls();c.joystick.fire('pointerdown',{pointerId:1,clientX:100});assert.equal(c.control.input(),1);
 c.joystick.fire('pointerdown',{pointerId:2,clientX:0});assert.equal(c.control.input(),1);
 c.kick.fire('pointerdown',{pointerId:2});c.kick.fire('click',{detail:1});assert.equal(c.shots,1);
 c.joystick.fire('lostpointercapture',{pointerId:1});assert.equal(c.control.input(),0);
 c.left.fire('pointerdown',{pointerId:3});assert.equal(c.control.input(),-1);c.left.fire('pointercancel',{pointerId:3});assert.equal(c.control.input(),0);
 c.right.fire('click',{detail:0});assert.ok(c.aim>0);c.kick.fire('click',{detail:0});assert.equal(c.shots,2);
});
test('keyboard aims, ignores repeated shots, retains native Space activation and clears on pause',()=>{
 const c=controls();c.target.fire('keydown',{code:'KeyA'});assert.equal(c.control.input(),-1);c.target.fire('keyup',{code:'KeyA'});assert.equal(c.control.input(),0);
 c.target.fire('keydown',{code:'Space'});c.target.fire('keydown',{code:'Space',repeat:true});assert.equal(c.shots,1);
 c.target.fire('keydown',{code:'Space',target:{tagName:'BUTTON'}});assert.equal(c.shots,1);
 c.target.fire('keydown',{code:'KeyD'});c.target.fire('keydown',{code:'Escape'});assert.equal(c.paused,1);assert.equal(c.control.input(),0);
});
