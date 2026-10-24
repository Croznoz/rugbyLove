// DOM + real canvas integration; no browser/device performance claims.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createCanvas} from '@napi-rs/canvas';
import {ArcadeRun} from '../dist/arcade-engine.mjs';
let run;const start=ArcadeRun.prototype.start;ArcadeRun.prototype.start=function(){start.call(this);run=this;};
function element(id){const el=id==='field'?createCanvas(420,560):{};return Object.assign(el,{style:{},events:{},textContent:'',hidden:false,disabled:false,addEventListener(k,f){(this.events[k]||=[]).push(f);},setAttribute(){},focus(){},blur(){},setPointerCapture(){},getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}});}
const html=readFileSync(new URL('../dist/arcade.html',import.meta.url),'utf8'),nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],element(m[1])]));
const win=element(),doc=element();globalThis.window=win;globalThis.document=Object.assign(doc,{hidden:false,getElementById:id=>{assert.ok(nodes.has(id),id);return nodes.get(id);}});
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
let now=1000,serial=0;const frames=new Map();globalThis.requestAnimationFrame=f=>{frames.set(++serial,f);return serial;};globalThis.cancelAnimationFrame=id=>frames.delete(id);
const fire=(node,event,props={})=>{for(const f of node.events[event]||[])f({preventDefault(){},...props});};
function frame(count=1){for(let i=0;i<count;i++){now+=1000/60;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(now));}}
await import('../dist/arcade.mjs');
const el=id=>nodes.get(id);
fire(el('play'),'click');frame();assert.equal(run.state,'playing');
fire(el('joystick'),'pointerdown',{pointerId:1,clientX:85,clientY:50});fire(el('sprint'),'pointerdown',{pointerId:2});frame(20);assert.ok(run.x>230);assert.ok(run.energy<100);
fire(el('joystick'),'pointercancel',{pointerId:1});const x=run.x;frame(5);assert.equal(run.x,x);
fire(win,'keydown',{code:'KeyA'});frame(15);fire(win,'keyup',{code:'KeyA'});assert.ok(run.x<x);
fire(el('pause'),'click');const distance=run.distance;frame(20);assert.equal(run.distance,distance);assert.equal(el('overlay').hidden,false);
fire(el('play'),'click');frame(2);assert.equal(run.state,'playing');assert.equal(el('overlay').hidden,true);
fire(win,'blur');assert.equal(run.state,'paused');fire(el('play'),'click');frame(2);
run.distance=1599;frame(2);assert.equal(run.tries,1);assert.equal(run.energy,100);
run.enemies=[{x:run.x,y:run.y,home:run.x,passed:false}];frame(2);assert.equal(run.state,'over');assert.equal(el('overlay').hidden,false);assert.ok(Number(store.get('rrc-arcade-record-v1'))>0);assert.match(el('summary').textContent,/punti/);
fire(el('play'),'click');frame(2);assert.equal(run.tries,0);assert.ok(run.distance<10);
run.spawn();run.enemies.forEach((e,i)=>{e.y=100+i*100;});frame();mkdirSync('qa',{recursive:true});writeFileSync('qa/arcade-field.png',el('field').toBuffer('image/png'));
doc.hidden=true;fire(doc,'visibilitychange');assert.equal(run.state,'paused');assert.equal(frames.size,0);doc.hidden=false;fire(doc,'visibilitychange');assert.equal(frames.size,1);
// Restricted storage must not block retry or the end screen.
fire(el('play'),'click');localStorage.setItem=()=>{throw new Error('blocked');};run.enemies=[{x:run.x,y:run.y,home:run.x}];frame(2);assert.equal(run.state,'over');assert.equal(el('storageNote').hidden,false);
console.log('Arcade UI: touch, keyboard, pause, visibility, retry, record, denied storage and canvas passed.');
