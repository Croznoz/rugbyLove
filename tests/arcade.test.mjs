import test from 'node:test';
import assert from 'node:assert/strict';
import {ArcadeRun} from '../dist/arcade-engine.mjs';
import {bindArcadeControls} from '../dist/arcade-controls.mjs';
const live=()=>{const r=new ArcadeRun(()=>.4);r.start();r.spawnIn=999;return r;};
const advance=(r,seconds,input={})=>{for(let i=0;i<seconds*120;i++)r.step(1/120,input);};
test('arcade tackle ends the run, dodge evades and charge breaks exactly one defender',()=>{
 for(const kind of [null,'dodge','charge']){
  const r=live();r.enemies=[{x:r.x,y:r.y,home:r.x,down:false,passed:false}];
  if(kind)assert.ok(r.action(kind));r.step(1/120);
  assert.equal(r.state,kind?'playing':'over');
  if(kind==='charge'){assert.equal(r.passed,1);assert.equal(r.charge,0);r.enemies.push({x:r.x,y:r.y,home:r.x});r.step(1/120);assert.equal(r.state,'over');}
 }
});
test('arcade ordinary running stays available at zero energy and actions respect cooldowns',()=>{
 const r=live();r.energy=0;assert.equal(r.action('sprint'),false);advance(r,1);assert.ok(Math.abs(r.distance-175)<1e-8);assert.ok(r.energy>9);
 r.energy=100;assert.ok(r.action('sprint'));assert.equal(r.action('sprint'),false);const before=r.distance;advance(r,.5);assert.ok(r.distance-before>100);
 r.state='paused';const distance=r.distance,energy=r.energy;advance(r,1);assert.equal(r.distance,distance);assert.equal(r.energy,energy);assert.equal(r.action('charge'),false);
});
test('arcade metas restore energy and increase waves with a bounded open lane',()=>{
 const r=live();const initial=r.pace;r.distance=1599;r.energy=1;r.enemies=[{x:50,y:30}];r.step(1/120);
 assert.equal(r.tries,1);assert.equal(r.energy,100);assert.equal(r.enemies.length,0);assert.ok(r.pace>initial);assert.ok(r.score>=260);
 for(const level of [1,3,7,100]){r.tries=level-1;r.enemies=[];r.spawn();assert.equal(r.enemies.length,Math.min(5,3+Math.floor((level-1)/2)));assert.ok(new Set(r.enemies.map(e=>e.home)).size<6);assert.ok(r.pace<=230);}
 r.start();assert.equal(r.score,0);assert.equal(r.level,1);assert.equal(r.enemies.length,0);
});
test('arcade counts passed defenders once and removes distant enemies',()=>{
 const r=live();r.enemies=[{x:50,y:r.y+31,home:50,passed:false}];advance(r,.1);assert.equal(r.passed,1);advance(r,2);assert.equal(r.passed,1);assert.equal(r.enemies.length,0);
});
function node(){const events={};return {events,style:{},addEventListener(k,f){(events[k]||=[]).push(f);},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};},fire(k,args={}){for(const f of events[k]||[])f({preventDefault(){},...args});}};}
test('arcade touch joystick and action coexist; second finger, cancel and lost capture are safe',()=>{
 const target=node(),joystick=node(),stick=node(),buttons={sprint:node(),dodge:node(),charge:node()},calls=[];
 const controls=bindArcadeControls({target,joystick,stick,buttons,action:(...args)=>calls.push(args),pause(){},active:()=>true});
 joystick.fire('pointerdown',{pointerId:1,clientX:110,clientY:50});assert.equal(controls.input().x,1);
 joystick.fire('pointerdown',{pointerId:2,clientX:0,clientY:50});assert.equal(controls.input().x,1);
 buttons.dodge.fire('pointerdown',{pointerId:2});buttons.dodge.fire('click',{detail:1});assert.deepEqual(calls,[['dodge',1]]);
 joystick.fire('pointercancel',{pointerId:2});assert.equal(controls.input().x,1);
 joystick.fire('lostpointercapture',{pointerId:1});assert.equal(controls.input().x,0);
});
test('arcade keyboard shares actions, ignores repeats and clears movement on pause',()=>{
 const target=node(),buttons={sprint:node(),dodge:node(),charge:node()},calls=[];let pauses=0;
 const controls=bindArcadeControls({target,joystick:node(),stick:node(),buttons,action:(...args)=>calls.push(args),pause(){pauses++;controls.clear();},active:()=>true});
 target.fire('keydown',{code:'KeyA'});assert.equal(controls.input().x,-1);
 target.fire('keydown',{code:'KeyL'});target.fire('keydown',{code:'KeyL',repeat:true});assert.deepEqual(calls,[['charge',-1]]);
 target.fire('keyup',{code:'KeyA'});assert.equal(controls.input().x,0);
 target.fire('keydown',{code:'KeyD'});target.fire('keydown',{code:'Escape'});assert.equal(pauses,1);assert.equal(controls.input().x,0);
 buttons.sprint.fire('click',{detail:0});assert.equal(calls.at(-1)[0],'sprint');
});
