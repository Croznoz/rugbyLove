import {fileURLToPath} from 'node:url';
// Inspect the actual canvas scene independently of browser layout.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {Match} from '../dist/engine.mjs';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.window={devicePixelRatio:1};
const {Renderer}=await import('../dist/render.mjs');
const dir=fileURLToPath(new URL('../qa/',import.meta.url));await mkdir(dir,{recursive:true});
for(const [label,w,h,x,shot] of [['conversion-mobile',358,470,100,false],['conversion-small',358,310,240,false],['conversion-landscape',620,290,240,true],['conversion-flight',358,470,100,true]]){
 const canvas=createCanvas(w,h);canvas.getBoundingClientRect=()=>({width:w,height:h});
 const renderer=new Renderer(canvas,createCanvas(108,172)),m=new Match();m.reset();m.phase='live';m.carrier.x=x;m.tryScored(0);m.beginConversion();
 m.conversion.power=.8;m.conversion.elapsed=.3;m.conversionAction();m.conversion.elapsed=.3;m.conversion.accuracy=.5;
 if(shot){m.conversionAction();m.conversion.flightTime=1.1;}
 renderer.draw(m,1,1);await writeFile(dir+'/'+label+'.png',canvas.toBuffer('image/png'));console.log('Rendered '+label);
}
