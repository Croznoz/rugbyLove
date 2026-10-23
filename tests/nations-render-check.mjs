import {createCanvas} from '@napi-rs/canvas';
import {mkdirSync,writeFileSync} from 'node:fs';
import {Match} from '../dist/engine.mjs';
import {NATIONS} from '../dist/teams.mjs';
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.window={devicePixelRatio:1};
const {Renderer}=await import('../dist/render.mjs');
mkdirSync(new URL('../qa/',import.meta.url),{recursive:true});
const canvas=createCanvas(840,300);canvas.getBoundingClientRect=()=>({width:840,height:300});
const r=new Renderer(canvas,createCanvas(108,172)),c=canvas.getContext('2d');
c.fillStyle='#eee2b9';c.fillRect(0,0,840,300);
NATIONS.forEach((nation,i)=>{
 const m=new Match();m.reset({home:nation.id,away:nation.id==='eng'?'wal':'eng'});
 c.fillStyle='#86a780';c.fillRect(i*140+5,5,130,290);
 c.save();c.translate(i*140+70,170);c.scale(2.2,2.2);r.drawPlayer(c,m.players[1],0,0,false,true);c.restore();
 c.fillStyle='#21383d';c.font='bold 12px monospace';c.textAlign='center';c.fillText(nation.name,i*140+70,220);c.font='10px monospace';c.fillText(nation.style,i*140+70,244);
});
writeFileSync(new URL('../qa/nations-kits.png',import.meta.url),canvas.toBuffer('image/png'));
for(const [home,away,w,h] of [['fra','sco',358,470],['wal','irl',1100,480],['eng','ita',620,290]]){
 const out=createCanvas(w,h);out.getBoundingClientRect=()=>({width:w,height:h});
 window.innerWidth=w;window.innerHeight=h;window.matchMedia=()=>({matches:w<650});
 const renderer=new Renderer(out,createCanvas(108,172)),m=new Match();m.reset({home,away});m.phase='live';renderer.draw(m,1,1);
 writeFileSync(new URL(`../qa/nations-${home}-${away}.png`,import.meta.url),out.toBuffer('image/png'));
}
console.log('Rendered six national kits and three national match layouts.');
