import {fileURLToPath} from 'node:url';
// Canvas-only render check, not a browser or real-device performance test.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {Match} from '../dist/engine.mjs';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.window={devicePixelRatio:1};
const {Renderer}=await import('../dist/render.mjs');
const output=fileURLToPath(new URL('../qa/',import.meta.url));
await mkdir(output,{recursive:true});
for(const [label,w,h] of [['desktop',1100,480],['mobile',358,470],['landscape',620,290],['charge',358,470],['dive',358,470],['kick',358,470]]){
 const canvas=createCanvas(w,h);canvas.getBoundingClientRect=()=>({width:w,height:h});
 const map=createCanvas(108,172),r=new Renderer(canvas,map),m=new Match();m.reset();m.phase='live';m.events=[];
 if(label==='charge'){m.special({x:0,y:-1});for(let i=0;i<18;i++)m.step(1/120,{x:0,y:-1});}
 else if(label==='dive'){m.lineup(1);m.guard=0;m.controlled.x=m.carrier.x+70;m.controlled.y=m.carrier.y;m.special();for(let i=0;i<9;i++)m.step(1/120);}
 else if(label==='kick'){m.kick(.5);for(let i=0;i<60;i++)m.step(1/120);}
 else for(let i=0;i<140;i++)m.step(1/120,{x:-.4,y:-1});
 r.draw(m,1,1);await writeFile(output+'/'+label+'-field.png',canvas.toBuffer('image/png'));
 console.log('Canvas rendered:',label,w,h);
}
