// DOM-adapter and real canvas integration; this does not measure phone performance.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {KickChallenge} from '../dist/kicks-engine.mjs';
import {drawKickChallenge} from '../dist/kicks-render.mjs';
import {paintStadium} from '../dist/art.mjs';
let game;const start=KickChallenge.prototype.start;KickChallenge.prototype.start=function(){start.call(this);game=this;};
function element(id){const el=id==='field'?createCanvas(420,460):{};return Object.assign(el,{style:{},events:{},attrs:{},textContent:'',hidden:false,disabled:false,addEventListener(k,f){(this.events[k]||=[]).push(f);},setAttribute(k,v){this.attrs[k]=v;},focus(){},blur(){},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}});}
const html=readFileSync(new URL('../dist/kicks.html',import.meta.url),'utf8'),nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element(m[1])]));
const win=element(),doc=element();globalThis.window=win;globalThis.document=Object.assign(doc,{hidden:false,createElement:()=>createCanvas(1,1),getElementById:id=>{assert.ok(nodes.has(id),id);return nodes.get(id);}});
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
let now=1000,serial=0;const frames=new Map();globalThis.requestAnimationFrame=f=>{frames.set(++serial,f);return serial;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
const fire=(node,event,props={})=>{for(const f of node.events[event]||[])f({preventDefault(){},...props});};
function frame(count=1){for(let i=0;i<count;i++){now+=1000/60;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now));}}
await import('../dist/kicks.mjs');const el=id=>nodes.get(id);
fire(el('play'),'click');frame(20);assert.equal(game.state,'playing');
fire(el('joystick'),'pointerdown',{pointerId:1,clientX:85});frame(10);assert.ok(game.aim>0);fire(el('joystick'),'pointercancel',{pointerId:1});const aim=game.aim;frame(4);assert.equal(game.aim,aim);
game.aim=0;game.power=game.minPower+.1;fire(el('kick'),'pointerdown',{pointerId:2});fire(el('kick'),'click',{detail:1});assert.equal(game.stage,'accuracy');
frame(20);game.accuracy=.5;fire(el('kick'),'pointerdown',{pointerId:3});assert.equal(game.stage,'flight');assert.equal(el('kick').disabled,true);
frame(10);fire(el('pause'),'click');const flight=game.flightTime;frame(10);assert.equal(game.flightTime,flight);assert.equal(el('overlay').hidden,false);
fire(el('play'),'click');frame(110);assert.equal(game.stage,'result');assert.equal(game.goals,1);assert.ok(Number(store.get('rrc-kicks-record-v1'))>100);assert.match(el('shotPrompt').textContent,/CENTRO PERFETTO/);
frame(45);fire(win,'keydown',{code:'KeyK'});assert.equal(game.stage,'power');assert.equal(game.shotLevel,2);assert.match(el('position').textContent,/SX/);
frame(20);fire(win,'keydown',{code:'KeyD'});frame(12);fire(win,'keyup',{code:'KeyD'});assert.ok(game.aim>0);
game.aim=0;game.power=game.minPower+.1;fire(win,'keydown',{code:'KeyK'});fire(win,'keydown',{code:'KeyK',repeat:true});assert.equal(game.stage,'accuracy');
frame(20);game.accuracy=.5;fire(win,'keydown',{code:'KeyL'});frame(15);
doc.hidden=true;fire(doc,'visibilitychange');assert.equal(game.state,'paused');assert.equal(frames.size,0);doc.hidden=false;fire(doc,'visibilitychange');assert.equal(frames.size,1);
fire(el('play'),'click');frame(110);assert.equal(game.goals,2);frame(45);fire(el('kick'),'click',{detail:0});assert.equal(game.stage,'power');
fire(win,'blur');assert.equal(game.state,'paused');fire(el('play'),'click');frame(20);
for(let i=0;i<3;i++){
 game.power=.05;fire(el('kick'),'click',{detail:0});frame(20);game.accuracy=.5;fire(el('kick'),'click',{detail:0});
 if(i===2)localStorage.setItem=()=>{throw new Error('blocked');};
 frame(110);assert.equal(game.lives,2-i);
 if(i<2){frame(45);fire(el('kick'),'click',{detail:0});frame(20);}
}
assert.equal(game.state,'over');assert.equal(el('overlay').hidden,false);assert.equal(el('storageNote').hidden,false);assert.match(el('summary').textContent,/2 centri/);
fire(el('play'),'click');frame(2);assert.equal(game.lives,3);assert.equal(game.goals,0);assert.equal(game.attempt,0);assert.equal(el('summary').hidden,true);
mkdirSync('qa',{recursive:true});const canvas=createCanvas(420,460),scene=createCanvas(420,460);paintStadium(scene.getContext('2d'),420,460);
for(const [name,goals,attempt,shot] of [['close',0,0,false],['angle',7,5,false],['far',22,5,false],['flight',7,5,true]]){
 const g=new KickChallenge();g.start();g.goals=goals;g.attempt=attempt;g.prepare();g.aim=-g.wind;
 if(shot){g.elapsed=.2;g.power=g.minPower+.08;g.action();g.elapsed=.2;g.accuracy=.5;g.action();g.flightTime=g.flightDuration*.78;}
 drawKickChallenge(canvas.getContext('2d'),g,scene);writeFileSync('qa/kicks-'+name+'.png',canvas.toBuffer('image/png'));
}
console.log('Kicks UI: touch, keyboard, two taps, aim, pause/visibility, record, three errors, retry and denied storage passed. Four canvas views saved.');
