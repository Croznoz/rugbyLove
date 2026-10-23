// DOM-adapter integration tests. These do not substitute for real-browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {Match} from '../dist/engine.mjs';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
let active,now=1000,rafId=0;
const frames=new Map(),windowEvents={},documentEvents={},elements=new Map();
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
function element(id){
 const el=(id==='pitch'||id==='minimap')?createCanvas(id==='pitch'?358:108,id==='pitch'?470:172):{};
 const classes=new Set();Object.assign(el,{id,style:{},attrs:{},events:{},hidden:false,disabled:false,textContent:'',value:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){(this.events[k]||=[]).push(fn);},getBoundingClientRect(){return id==='joystick'?{left:20,top:20,width:80,height:80}:{width:358,height:470};},setPointerCapture(){},focus(){},scrollIntoView(){},closest(){return null;}});
 return el;
}
for(const m of html.matchAll(/<[^>]*id="([^"]+)"[^>]*>/g)){const node=element(m[1]);node.hidden=/\bhidden\b/.test(m[0]);elements.set(m[1],node);}
elements.get('duration').value='60';elements.get('difficulty').value='normal';
globalThis.document={body:element('body'),hidden:false,getElementById:id=>{assert.ok(elements.has(id),'missing DOM element '+id);return elements.get(id);},createElement:()=>createCanvas(1,1),addEventListener:(k,fn)=>(documentEvents[k]||=[]).push(fn)};
globalThis.window={devicePixelRatio:1,addEventListener:(k,fn)=>(windowEvents[k]||=[]).push(fn)};
globalThis.HTMLSelectElement=class{};
globalThis.ResizeObserver=class{constructor(cb){this.cb=cb;}observe(){this.cb();}};
globalThis.requestAnimationFrame=cb=>{const id=++rafId;frames.set(id,cb);return id;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
if(!globalThis.navigator)globalThis.navigator={};
const reset=Match.prototype.reset;Match.prototype.reset=function(opts){reset.call(this,opts);active=this;};
await import('../dist/game.mjs');
const el=id=>elements.get(id);
function dispatch(target,type,props={}){const e={type,preventDefault(){},target:el('pitch'),detail:1,...props};const handlers=typeof target==='string'?el(target).events:target;for(const fn of handlers[type]||[])fn(e);}
function frame(n=1){for(let i=0;i<n;i++){now+=1000/60;const list=[...frames.values()];frames.clear();list.forEach(fn=>fn(now));}}
// Most UI scenarios need settled possession; kickoff itself is tested separately.
function start(opening=false){dispatch('start','click');active.guard=999;frame(132);if(!opening){active.phase='live';active.lineup(0);active.stats.kicks=[0,0];active.carrier.kickCd=0;active.passCooldown=0;frame(7);}active.guard=999;}
test('menu starts a match and touch kickoff waits for aim and release',()=>{assert.equal(active.state,'menu');start(true);assert.equal(active.ball,null);dispatch('actionC','pointerdown',{pointerId:201});frame(30);assert.ok(active.kickAim);dispatch('actionC','pointerup',{pointerId:201});assert.equal(active.ball.kickoff,true);assert.equal(active.state,'playing');assert.equal(active.phase,'live');assert.equal(el('menu').hidden,true);assert.equal(el('pause').disabled,false);});
test('help opens and can be dismissed',()=>{dispatch('quit','click');dispatch('help','click');assert.equal(el('helpContent').hidden,false);dispatch('closeHelp','click');assert.equal(el('helpContent').hidden,true);});
test('joystick + sprint work simultaneously and cancel safely',()=>{start();const x=active.carrier.x;dispatch('joystickArea','pointerdown',{pointerId:1,clientX:100,clientY:60});dispatch('actionB','pointerdown',{pointerId:2});frame(25);assert.ok(active.carrier.x>x+20);assert.ok(active.controlled.energy<active.controlled.profile.stamina);dispatch('joystickArea','pointercancel',{pointerId:1});dispatch('actionB','lostpointercapture',{pointerId:2});frame(20);assert.equal(el('stick').style.transform,'translate(0px,0px)');assert.equal(el('actionB').classList.contains('pressed'),false);assert.ok(Math.abs(active.controlled.vx)<1);});
test('pointer-only controls do not double-trigger through touchstart',()=>{assert.ok(!el('actionA').events.touchstart);assert.ok(!el('actionB').events.touchstart);start();active.passCooldown=0;dispatch('actionA','pointerdown',{pointerId:3});const from=active.ball.from;dispatch('actionA','click',{detail:1});assert.equal(active.ball.from,from);dispatch('actionA','pointerup',{pointerId:3});});
test('keyboard movement and keyup release work',()=>{start();const x=active.carrier.x;dispatch(windowEvents,'keydown',{code:'KeyD',repeat:false});frame(20);assert.ok(active.carrier.x>x+15);dispatch(windowEvents,'keyup',{code:'KeyD'});frame(20);assert.ok(Math.abs(active.carrier.vx)<1);});
test('pause freezes time; resume preserves match',()=>{start();dispatch('pause','click');const t=active.time;frame(30);assert.equal(active.time,t);assert.equal(el('pauseMenu').hidden,false);dispatch('resume','click');frame(10);assert.ok(active.time<t);assert.equal(el('pauseMenu').hidden,true);});
test('blur and hidden tab pause rather than lose match time',()=>{start();dispatch(windowEvents,'blur');const t=active.time;frame(5);assert.equal(active.time,t);dispatch('resume','click');document.hidden=true;dispatch(documentEvents,'visibilitychange');assert.equal(frames.size,0);document.hidden=false;dispatch(documentEvents,'visibilitychange');frame(5);assert.equal(active.time,t);dispatch('resume','click');});
test('final whistle shows result, replay resets score, menu is reachable',()=>{start();active.half=2;active.time=.001;active.score=[10,5];frame(3);assert.equal(el('result').hidden,false);assert.equal(el('resultTitle').textContent,'VITTORIA ITALIA!');assert.equal(el('finalScore').textContent,'10 — 5');dispatch('replay','click');assert.deepEqual(active.score,[0,0]);assert.equal(el('result').hidden,true);dispatch('quit','click');assert.equal(active.state,'menu');assert.equal(el('menu').hidden,false);});
test('C uses joystick aim once; contested ball updates buttons; release clears feedback',()=>{start();dispatch('joystickArea','pointerdown',{pointerId:11,clientX:100,clientY:60});dispatch('actionC','pointerdown',{pointerId:12});assert.ok(active.kickAim);assert.equal(active.ball,null);frame(12);dispatch('actionC','pointerup',{pointerId:12});assert.equal(active.ball.kind,'kick');assert.ok(active.ball.tx>active.ball.sx);dispatch('actionC','click',{detail:1});assert.equal(active.stats.kicks[0],1);frame(7);assert.equal(el('labelA').textContent,'CAMBIA');assert.equal(el('labelB').textContent,'SCATTO');assert.equal(el('actionC').disabled,true);dispatch('actionC','pointercancel',{pointerId:12});assert.equal(el('actionC').classList.contains('pressed'),false);dispatch('joystickArea','pointerup',{pointerId:11});});
test('L kicks once on keyboard, and pause blocks new kick actions',()=>{start();dispatch(windowEvents,'keydown',{code:'KeyL',repeat:false});dispatch(windowEvents,'keydown',{code:'KeyL',repeat:true});assert.equal(active.stats.kicks[0],0);dispatch(windowEvents,'keyup',{code:'KeyL'});assert.equal(active.stats.kicks[0],1);dispatch('pause','click');const ball=active.ball;dispatch('actionC','click',{detail:0});frame(5);assert.equal(active.ball,ball);assert.equal(active.stats.kicks[0],1);dispatch('resume','click');});
function conversionSetup(){dispatch('start','click');active.phase='live';active.tryScored(0);active.beginConversion();frame(18);}
test('conversion touch button locks both meters without duplicated pointer/click actions',()=>{conversionSetup();assert.equal(el('conversionPanel').hidden,false);assert.equal(el('actionA').disabled,true);assert.equal(el('actionB').disabled,true);active.conversion.power=.78;dispatch('conversionStop','pointerdown');dispatch('conversionStop','click',{detail:1});assert.equal(active.conversion.stage,'accuracy');frame(13);active.conversion.accuracy=.5;dispatch('actionC','pointerdown',{pointerId:20});assert.equal(active.conversion.stage,'flight');frame(105);assert.equal(active.score[0],7);assert.equal(el('homeScore').textContent,'07');assert.equal(el('conversionStop').textContent,'CONVERSIONE RIUSCITA');});
test('Space and L stop meters, key repeat does not skip accuracy, pause freezes arrow',()=>{conversionSetup();active.conversion.power=.8;dispatch(windowEvents,'keydown',{code:'Space',repeat:false});dispatch(windowEvents,'keydown',{code:'Space',repeat:true});assert.equal(active.conversion.stage,'accuracy');frame(15);dispatch('pause','click');const before=active.conversion.accuracy;frame(8);assert.equal(active.conversion.accuracy,before);dispatch('conversionStop','pointerdown');assert.equal(active.conversion.stage,'accuracy');dispatch('resume','click');active.conversion.accuracy=.5;dispatch(windowEvents,'keydown',{code:'KeyL',repeat:false});assert.equal(active.conversion.stage,'flight');});
test('ending a zero-time conversion shows final result and hides shooting UI without an exception',()=>{conversionSetup();active.half=2;active.time=0;active.conversion.power=.78;active.conversionAction();active.conversion.elapsed=.3;active.conversion.accuracy=.5;active.conversionAction();frame(215);assert.equal(active.state,'finished');assert.equal(el('result').hidden,false);assert.equal(el('conversionPanel').hidden,true);assert.equal(el('finalScore').textContent,'7 — 0');});
test('touch joystick directs pass and A releases during contact with visible offload label',()=>{start();active.passCooldown=0;active.players[1].x=active.carrier.x-65;active.players[1].y=active.carrier.y+35;active.players[2].x=active.carrier.x+65;active.players[2].y=active.carrier.y+35;dispatch('joystickArea','pointerdown',{pointerId:31,clientX:100,clientY:60});const chosen=active.target({x:1,y:0});dispatch('actionA','pointerdown',{pointerId:32});assert.equal(active.ball.to,chosen.id);dispatch('joystickArea','pointerup',{pointerId:31});dispatch('actionA','pointerup',{pointerId:32});start();active.guard=0;active.tackle(active.players[7]);assert.equal(active.phase,'contact');frame(1);assert.equal(el('labelA').textContent,'OFFLOAD');assert.equal(el('actionB').disabled,true);dispatch('actionA','pointerdown',{pointerId:33});assert.equal(active.ball.offload,true);assert.equal(active.phase,'live');dispatch('actionA','pointerup',{pointerId:33});});
test('optional scrum delays the timed B duel for its callout, then keeps the joystick exit',()=>{el('scrums').value='on';start();assert.equal(active.scrumsEnabled,true);active.guard=0;active.tackles=2;active.tackle(active.players[7],false,true);active.scrum.feed=0;frame(1);assert.equal(el('scrumPanel').hidden,false);assert.equal(el('scrumPush'),undefined);assert.equal(el('labelB').textContent,'DUELLA');frame(20);assert.equal(active.scrum.elapsed,0);dispatch('actionB','pointerdown',{pointerId:50});dispatch('actionB','pointerup',{pointerId:50});assert.equal(active.scrum.started,true);assert.equal(el('labelB').textContent,'DUELLA');assert.equal(el('scrumTiming').hidden,true);assert.equal(el('scrumCallout').hidden,false);assert.match(el('scrumCallout').textContent,/MISCHIA.*SPINGI/);active.scrum.elapsed=.2;assert.equal(active.scrumAction(),false);assert.equal(active.scrum.lastAction,'');active.scrum.elapsed=1;active.scrum.needle=.5;dispatch('actionB','pointerdown',{pointerId:51});dispatch('actionB','pointerup',{pointerId:51});assert.equal(active.scrum.lastAction,'win');frame(1);assert.equal(el('scrumTiming').hidden,false);assert.equal(el('scrumCallout').hidden,true);dispatch('joystickArea','pointerdown',{pointerId:52,clientX:20,clientY:60});frame(241);dispatch('joystickArea','pointerup',{pointerId:52});assert.equal(el('scrumPanel').hidden,true);assert.equal(active.phase,'live');assert.equal(el('labelC').textContent,'CALCIA');el('scrums').value='off';start();assert.equal(active.scrumsEnabled,false);});
test('scrum keyboard duel is a tap, repeat does not tap again, and pause freezes the bar',()=>{el('scrums').value='on';start();active.guard=0;active.tackles=2;active.tackle(active.players[7],false,true);active.scrum.feed=0;frame(1);assert.equal(el('labelB').textContent,'DUELLA');dispatch(windowEvents,'keydown',{code:'KeyK',repeat:false});assert.equal(active.scrum.started,true);assert.equal(active.scrum.elapsed,0);assert.equal(active.scrum.lastAction,'');dispatch(windowEvents,'keyup',{code:'KeyK'});active.scrum.elapsed=1;active.scrum.needle=.5;dispatch(windowEvents,'keydown',{code:'KeyK',repeat:false});assert.equal(active.scrum.lastAction,'win');const energy=active.players[1].energy;dispatch(windowEvents,'keydown',{code:'KeyK',repeat:true});assert.equal(active.players[1].energy,energy);dispatch('pause','click');const t=active.scrum.elapsed;frame(4);assert.equal(active.scrum.elapsed,t);dispatch('resume','click');frame(1);el('scrums').value='off';});
test('defensive scrum hides duel button and gives automatic defense instructions',()=>{el('scrums').value='on';start();active.guard=0;active.tackles=2;active.tackle(active.players[7],false,true);frame(1);assert.equal(el('scrumPush'),undefined);assert.equal(el('actionB').disabled,true);assert.match(el('scrumInstructions').textContent,/NESSUN COMANDO/);assert.equal(el('pitchView').classList.contains('scrum-view'),true);frame(305);assert.equal(el('pitchView').classList.contains('scrum-view'),false);el('scrums').value='off';});
test('kick charge preview cancels on pointercancel and pause, without firing on release',()=>{start();dispatch('actionC','pointerdown',{pointerId:71});frame(10);assert.ok(active.kickAim);assert.equal(el('kickPanel').hidden,false);dispatch('actionC','pointercancel',{pointerId:71});assert.equal(active.kickAim,null);assert.equal(active.stats.kicks[0],0);dispatch('actionC','pointerdown',{pointerId:72});dispatch('pause','click');dispatch('actionC','pointerup',{pointerId:72});assert.equal(active.kickAim,null);assert.equal(active.stats.kicks[0],0);dispatch('resume','click');});
test('accessible C activation toggles aim and release; A cancels',()=>{start();dispatch('actionC','click',{detail:0});assert.ok(active.kickAim);dispatch('actionA','click',{detail:0});assert.equal(active.kickAim,null);assert.equal(active.ball,null);dispatch('actionC','click',{detail:0});dispatch('actionC','click',{detail:0});assert.equal(active.ball.kind,'kick');assert.equal(active.stats.kicks[0],1);});
test('touch Pass uses the indicated side; Cambia selects useful cover without extra gestures',()=>{
 start();active.passCooldown=0;
 dispatch('joystickArea','pointerdown',{pointerId:91,clientX:100,clientY:60});
 const expected=active.target({x:1,y:0}).id;
 dispatch('actionA','pointerdown',{pointerId:92});assert.equal(active.ball.to,expected);
 dispatch('actionA','pointerup',{pointerId:92});dispatch('joystickArea','pointerup',{pointerId:91});
 active.lineup(1);active.selected=6;frame(7);const defender=active.bestDefender().id;
 assert.equal(el('labelA').textContent,'CAMBIA');dispatch('actionA','pointerdown',{pointerId:93});assert.equal(active.selected,defender);
 dispatch('actionA','pointerup',{pointerId:93});dispatch('actionA','pointerdown',{pointerId:94});assert.equal(active.selected,defender);
 dispatch('actionA','pointerup',{pointerId:94});
});
test('low stamina shows recovery feedback without disabling the pass button',()=>{start();active.controlled.energy=5;active.controlled.exhausted=true;frame(7);assert.match(el('energyLabel').textContent,/RECUPERO/);assert.equal(el('stamina').style.background,'#ef947f');assert.equal(el('actionA').disabled,false);});
test('defensive touch tap dives on release; hold contains and cancellation never dives',()=>{
 start();active.lineup(1);active.guard=99;frame(7);const p=active.controlled;
 dispatch('actionB','pointerdown',{pointerId:111});assert.equal(p.dive,0);
 frame(22);assert.equal(p.brace,true);assert.equal(p.dive,0);assert.equal(el('labelB').textContent,'CONTIENI');
 dispatch('actionB','pointerup',{pointerId:111});assert.equal(p.brace,false);assert.equal(p.dive,0);
 dispatch('actionB','pointerdown',{pointerId:112});dispatch('actionB','pointercancel',{pointerId:112});assert.equal(p.dive,0);
 dispatch('actionB','pointerdown',{pointerId:113});dispatch('actionB','pointerup',{pointerId:113});assert.ok(p.dive>0);
});
test('keyboard defense hold is stationary; pause cancels it without a release tackle',()=>{
 start();active.lineup(1);active.guard=99;const p=active.controlled,x=p.x,y=p.y;
 dispatch(windowEvents,'keydown',{code:'Space',repeat:false});frame(15);
 assert.equal(p.brace,true);assert.ok(Math.hypot(p.x-x,p.y-y)<1);assert.equal(p.dive,0);
 dispatch('pause','click');assert.equal(p.brace,false);dispatch(windowEvents,'keyup',{code:'Space'});
 dispatch('resume','click');frame(1);assert.equal(p.dive,0);assert.equal(active.defenseGesture,null);
});
test('sideways joystick and action button sidestep without a forward charge',()=>{
 start();active.guard=99;dispatch('joystickArea','pointerdown',{pointerId:121,clientX:100,clientY:60});
 dispatch('actionB','pointerdown',{pointerId:122});assert.ok(active.carrier.evade>0);assert.equal(active.carrier.charge,0);
 dispatch('actionB','pointerup',{pointerId:122});dispatch('joystickArea','pointerup',{pointerId:121});
});
test('selected player label follows role profiles when switching players',()=>{
 start();
 for(const [id,label] of [[0,'REGISTA'],[2,'POTENTE'],[4,'AGILE']]){
  active.carrierId=id;active.selected=id;frame(7);assert.ok(el('playerName').textContent.endsWith(' · '+label));
 }
});
test('stamina bar length reflects profile capacity and fill reflects remaining fraction',()=>{
 start();
 for(const id of [0,2,4]){
  active.carrierId=id;active.selected=id;const p=active.controlled;p.energy=p.profile.stamina/2;p.energyWait=10;frame(7);
  assert.equal(el('staminaTrack').style.width,(55*p.profile.stamina/100)+'px');
  assert.equal(el('stamina').style.transform,'scaleX(0.5)');
  assert.ok(el('energyLabel').textContent.endsWith(Math.round(p.profile.stamina/2)+'/'+p.profile.stamina));
 }
});
test('touch and keyboard tackles can trigger the powerful profile loose-ball action',()=>{
 for(const control of ['touch','keyboard']){
  start();active.lineup(1);active.guard=0;active.cpuThink=99;
  for(const p of active.players)p.down=20;
  const c=active.carrier,d=active.players[2];Object.assign(c,{x:300,y:550,vx:0,vy:80,down:0});Object.assign(d,{x:300,y:584,down:0});active.selected=d.id;
  if(control==='touch'){dispatch('actionB','pointerdown',{pointerId:91});dispatch('actionB','pointerup',{pointerId:91});}
  else{dispatch(windowEvents,'keydown',{code:'KeyK',repeat:false});dispatch(windowEvents,'keyup',{code:'KeyK'});}
  frame(8);assert.equal(active.ball?.kind,'fumble',control);assert.equal(el('phase').textContent,'PALLONE LIBERO');assert.equal(active.stats.tackles[0],1);
 }
});
test('joystick keeps steering beyond its rim and ignores a second finger until release',()=>{
 start();active.guard=99;
 // Allow acceleration toward the carrier pace (78 × 0.82).
 const moving=78*.82*.94;
 dispatch('joystickArea','pointerdown',{pointerId:201,clientX:138,clientY:60});
 frame(10);assert.ok(active.controlled.vx>moving);
 dispatch('joystickArea','pointerdown',{pointerId:202,clientX:-18,clientY:60});
 dispatch('joystickArea','pointermove',{pointerId:202,clientX:-80,clientY:60});
 frame(3);assert.ok(active.controlled.vx>moving);
 dispatch('joystickArea','pointermove',{pointerId:201,clientX:60,clientY:-80});
 frame(10);assert.ok(active.controlled.vy< -moving);
 dispatch('joystickArea','pointerup',{pointerId:202});frame(3);
 assert.ok(active.controlled.vy< -moving);
 dispatch('joystickArea','pointerup',{pointerId:201});frame(20);
 assert.ok(Math.hypot(active.controlled.vx,active.controlled.vy)<1);
 assert.equal(el('stick').style.transform,'translate(0px,0px)');
});
test('crowd reuses its loop and silences immediately on mute and hidden-tab pause',()=>{
 let loops=0,lastVolume=null;
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(value){lastVolume=value;}});
 const node=()=>({connect(){},start(){},stop(){},frequency:param(),gain:param()});
 window.AudioContext=class{
  constructor(){this.state='running';this.sampleRate=8000;this.currentTime=0;this.destination={};}
  createOscillator(){return node();}
  createGain(){return node();}
  createBiquadFilter(){return node();}
  createBuffer(channels,length){return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){loops++;return node();}
 };
 start();active.tryScored(0);dispatch('sound','click');frame(2);
 assert.equal(loops,1);assert.ok(lastVolume>0);
 dispatch('sound','click');assert.equal(lastVolume,0);
 dispatch('sound','click');frame(2);assert.equal(loops,1);assert.ok(lastVolume>0);
 document.hidden=true;dispatch(documentEvents,'visibilitychange');
 assert.equal(lastVolume,0);assert.equal(frames.size,0);
 document.hidden=false;dispatch(documentEvents,'visibilitychange');
 dispatch('sound','click');dispatch('resume','click');
});
test('touch and keyboard can complete a pass-and-return using the same pass button',()=>{
 for(const control of ['touch','keyboard']){
  start();for(const p of active.players)p.down=20;
  const c=active.carrier,r=active.players[1];
  Object.assign(c,{down:0,x:260,y:550,vx:0,vy:-78,px:260,py:550});
  Object.assign(r,{down:0,x:330,y:580,vx:0,vy:-65,px:330,py:580});
  if(control==='touch'){
   dispatch('joystickArea','pointerdown',{pointerId:301,clientX:100,clientY:60});
   dispatch('actionA','pointerdown',{pointerId:302});dispatch('actionA','pointerup',{pointerId:302});
   dispatch('joystickArea','pointermove',{pointerId:301,clientX:60,clientY:20});
  }else{
   dispatch(windowEvents,'keydown',{code:'KeyD',repeat:false});dispatch(windowEvents,'keydown',{code:'KeyJ',repeat:false});
   dispatch(windowEvents,'keyup',{code:'KeyJ'});dispatch(windowEvents,'keyup',{code:'KeyD'});
   dispatch(windowEvents,'keydown',{code:'KeyW',repeat:false});
  }
  frame(80);assert.equal(active.carrierId,r.id,control);assert.ok(c.x>r.x);
  if(control==='touch'){
   dispatch('joystickArea','pointermove',{pointerId:301,clientX:100,clientY:60});
   dispatch('actionA','pointerdown',{pointerId:303});dispatch('actionA','pointerup',{pointerId:303});
   dispatch('joystickArea','pointerup',{pointerId:301});
  }else{
   dispatch(windowEvents,'keyup',{code:'KeyW'});dispatch(windowEvents,'keydown',{code:'KeyD',repeat:false});
   dispatch(windowEvents,'keydown',{code:'KeyJ',repeat:false});dispatch(windowEvents,'keyup',{code:'KeyJ'});
   dispatch(windowEvents,'keyup',{code:'KeyD'});
  }
  assert.equal(active.ball?.oneTwo,true,control);frame(32);assert.equal(active.carrierId,c.id,control);
 }
});
test('touch tap and keyboard hold select grubber and high kick with matching labels',()=>{
 start();dispatch('actionC','pointerdown',{pointerId:310});frame(2);
 assert.match(el('kickType').textContent,/RASOTERRA/);
 dispatch('actionC','pointerup',{pointerId:310});assert.equal(active.ball?.grubber,true);
 start();dispatch(windowEvents,'keydown',{code:'KeyL',repeat:false});frame(22);
 assert.match(el('kickType').textContent,/CALCIO ALTO/);
 dispatch(windowEvents,'keyup',{code:'KeyL'});assert.equal(active.ball?.grubber,false);
});

test('keyboard kickoff holds time, steers, cancels and releases once',()=>{
 start(true);const time=active.time;
 dispatch(windowEvents,'keydown',{code:'KeyL',repeat:false});
 dispatch(windowEvents,'keydown',{code:'KeyD',repeat:false});frame(35);
 assert.ok(active.kickAim.x>0);assert.equal(active.time,time);
 dispatch(windowEvents,'keydown',{code:'KeyJ',repeat:false});assert.equal(active.kickAim,null);
 dispatch(windowEvents,'keyup',{code:'KeyJ'});dispatch(windowEvents,'keyup',{code:'KeyL'});assert.equal(active.ball,null);
 dispatch(windowEvents,'keydown',{code:'KeyL',repeat:false});frame(35);
 const target=active.kickTarget(active.kickAim,active.kickAim.power);
 dispatch(windowEvents,'keyup',{code:'KeyL'});dispatch(windowEvents,'keyup',{code:'KeyD'});
 assert.equal(active.ball.tx,target.tx);assert.equal(active.ball.ty,target.ty);assert.equal(active.stats.kicks[0],1);
});

test('restart after conceding waits for touch or keyboard direction and power',()=>{
 for(const touch of [true,false]){
  start();active.tryScored(1);active.beginConversion();active.resolveConversion(true);frame(115);
  assert.equal(active.phase,'kickoff');assert.equal(active.ball,null);assert.equal(el('actionC').disabled,false);
  const time=active.time;
  if(touch){dispatch('joystickArea','pointerdown',{pointerId:301,clientX:100,clientY:60});dispatch('actionC','pointerdown',{pointerId:302});}
  else{dispatch(windowEvents,'keydown',{code:'KeyD',repeat:false});dispatch(windowEvents,'keydown',{code:'KeyL',repeat:false});}
  frame(40);assert.ok(active.kickAim.power>.4);assert.ok(active.kickAim.x>0);assert.equal(active.time,time);
  const target=active.kickTarget(active.kickAim,active.kickAim.power);
  if(touch){dispatch('actionC','pointerup',{pointerId:302});dispatch('joystickArea','pointerup',{pointerId:301});}
  else{dispatch(windowEvents,'keyup',{code:'KeyL'});dispatch(windowEvents,'keyup',{code:'KeyD'});}
  assert.equal(active.ball.kickoff,true);assert.equal(active.ball.tx,target.tx);assert.equal(active.ball.ty,target.ty);
  assert.equal(active.stats.kicks[0],1);
 }
});
test('CONTENDI appears on descent and touch, keyboard and accessible activation jump once',()=>{
 for(const mode of ['touch','keyboard','accessible']){
  start();for(const p of active.players){p.x=80;p.y=200;}
  active.controlled.x=360;active.controlled.y=660;
  active.ball={kind:'kick',team:0,from:0,eligible:[0,1,2,3,4,5,6],x:360,y:660,sx:360,sy:660,tx:360,ty:660,t:1.65,duration:2,apex:125,z:70,landed:false};
  frame(1);assert.equal(el('labelB').textContent,'CONTENDI');assert.equal(el('actionB').disabled,false);
  const energy=active.controlled.energy;
  if(mode==='touch'){dispatch('actionB','pointerdown',{pointerId:401});dispatch('actionB','pointerup',{pointerId:401});dispatch('actionB','click',{detail:1});}
  else if(mode==='keyboard'){dispatch(windowEvents,'keydown',{code:'KeyK',repeat:false});dispatch(windowEvents,'keydown',{code:'KeyK',repeat:true});dispatch(windowEvents,'keyup',{code:'KeyK'});}
  else dispatch('actionB','click',{detail:0});
  assert.equal(active.controlled.jump,.6);assert.equal(active.controlled.energy,energy-8);assert.equal(active.controlled.burst,0);
  dispatch('pause','click');frame(10);assert.equal(active.controlled.jump,.6);dispatch('resume','click');frame(50);
  assert.equal(active.ball,null);assert.notEqual(el('labelB').textContent,'CONTENDI');
 }
});

 test('B starts the scrum, ignores repeat and then duels in the green',()=>{
  el('scrums').value='on';start();active.beginScrum(0);frame(1);
  assert.equal(el('labelB').textContent,'DUELLA');
  const energy=active.players[1].energy;
  dispatch(windowEvents,'keydown',{code:'KeyB',repeat:false});
  assert.equal(active.scrum.started,true);assert.equal(active.players[1].energy,energy);
  active.scrum.elapsed=active.scrum.intro;active.scrum.needle=.5;
  dispatch(windowEvents,'keydown',{code:'KeyB',repeat:true});assert.equal(active.scrum.lastAction,'');
  dispatch(windowEvents,'keyup',{code:'KeyB'});
  dispatch(windowEvents,'keydown',{code:'KeyB',repeat:false});assert.equal(active.scrum.lastAction,'win');
  dispatch(windowEvents,'keyup',{code:'KeyB'});el('scrums').value='off';
 });

test('national selection updates match, scrum, conversion and replay without duplicate teams',()=>{
 dispatch('quit','click');el('homeNation').value='wal';dispatch('homeNation','change');
 el('awayNation').value='fra';dispatch('awayNation','change');
 assert.equal(el('homeName').textContent,'GALLES');assert.match(el('homeTraits').textContent,/Placcaggio/);
 start();assert.deepEqual(active.teams.map(t=>t.id),['wal','fra']);
 active.beginScrum(1);frame(1);assert.equal(el('scrumAway').textContent,'FRANCIA');assert.match(el('scrumSide').textContent,/FRANCIA/);
 start();active.tryScored(0);active.beginConversion();frame(1);assert.match(el('conversionTitle').textContent,/GALLES/);
 dispatch('replay','click');assert.deepEqual(active.teams.map(t=>t.id),['wal','fra']);
 dispatch('quit','click');assert.equal(el('homeNation').value,'wal');
 el('awayNation').value='wal';dispatch('awayNation','change');assert.notEqual(el('homeNation').value,el('awayNation').value);
 el('homeNation').value='ita';el('awayNation').value='irl';dispatch('homeNation','change');
});


test('Six Nations selection updates flags and real stat meters for touch and keyboard selectors',()=>{
 dispatch('quit','click');
 for(const [id,key,value] of [['fra','charge',106],['wal','tackle',106],['sco','tackle',94],['eng','agility',92],['irl','pass',106],['ita','recovery',106]]){
  el('homeNation').value=id;dispatch('homeNation','change');
  assert.equal(el('homeFlag').attrs.src,'assets/flags/'+id+'.svg');
  assert.equal(el('homeValue'+key).textContent,(value>100?'+':'')+(value-100)+'%');
  assert.equal(el('homeStat'+key).attrs['aria-valuenow'],String(value));
  assert.equal(parseFloat(el('homeFill'+key).style.width),(value-90)*5);
 }
 el('awayNation').value='ita';dispatch('awayNation','change');
 assert.notEqual(el('homeNation').value,el('awayNation').value);
 assert.equal(el('awayFlag').attrs.src,'assets/flags/ita.svg');
 assert.equal(el('awayValuerecovery').textContent,'+6%');
 el('homeNation').value='ita';el('awayNation').value='irl';dispatch('homeNation','change');
});

test('Six Nations completes five fixtures, persists once per round and resumes interrupted games',()=>{
 const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 dispatch('quit','click');el('gameMode').value='tournament';el('homeNation').value='ita';dispatch('gameMode','change');
 assert.equal(el('awayNation').disabled,true);assert.equal(el('tournamentInfo').hidden,false);
 dispatch('start','click');const opponents=[];
 for(let r=0;r<5;r++){
  opponents.push(active.teams[1].id);
  assert.equal(active.teams[0].id,'ita');
  if(r===1){
   const opponent=active.teams[1].id;dispatch('quit','click');
   assert.equal(el('resumeTournament').hidden,false);dispatch('resumeTournament','click');assert.equal(active.teams[1].id,opponent);
  }
  active.phase='live';active.half=2;active.time=0;active.score=[7,0];active.stats.tries=[1,0];frame(3);
  assert.equal(active.state,'finished');assert.equal(el('tournamentResult').hidden,false);
  const saved=JSON.parse([...memory.values()][0]);assert.equal(saved.results.length,(r+1)*3);
  frame(3);assert.equal(JSON.parse([...memory.values()][0]).results.length,(r+1)*3);
  assert.equal(el('winnerCup').hidden,r<4);
  if(r<4){assert.match(el('replay').textContent,/PROSSIMA/);dispatch('replay','click');}
 }
 assert.equal(new Set(opponents).size,5);assert.match(el('roundTitle').textContent,/ITALIA/);assert.match(el('nextFixture').textContent,/1°/);
 assert.equal(el('standingPoints0').textContent,23);assert.equal(el('tournamentCalendar').textContent.split('\n').length,5);
 dispatch('resultMenu','click');assert.equal(el('resumeTournament').hidden,true);
 el('gameMode').value='single';dispatch('gameMode','change');dispatch('start','click');assert.equal(el('awayNation').disabled,false);
 active.phase='live';active.half=2;active.time=0;frame(3);assert.equal(el('tournamentResult').hidden,true);
});

test('unavailable tournament storage keeps play working and explains the limitation',()=>{
 globalThis.localStorage={getItem:()=>null,setItem:()=>{throw new Error('quota');}};
 dispatch('quit','click');el('gameMode').value='tournament';dispatch('gameMode','change');dispatch('start','click');
 assert.equal(active.state,'playing');assert.equal(el('saveStatus').hidden,false);assert.match(el('saveStatus').textContent,/questa scheda/);
 dispatch('quit','click');assert.equal(el('resumeTournament').hidden,false);
 el('gameMode').value='single';dispatch('gameMode','change');delete globalThis.localStorage;
});
