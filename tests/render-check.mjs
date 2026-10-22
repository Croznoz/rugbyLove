import {fileURLToPath} from 'node:url';
// Canvas-only render check, not a browser or real-device performance test.
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {Match,FIELD} from '../dist/engine.mjs';
const require=createRequire(import.meta.url);
const {createCanvas}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.window={devicePixelRatio:1};
const {Renderer}=await import('../dist/render.mjs');
const output=fileURLToPath(new URL('../qa/',import.meta.url));
await mkdir(output,{recursive:true});
for(const [label,w,h] of [['desktop',1100,480],['mobile',358,470],['landscape',620,290],['charge',358,470],['dive',358,470],['kick',358,470],['touchline',358,470],['stamina-medium',358,470],['stamina-low',358,470],['stamina-empty',358,470],['dominant',358,470],['perfect-ready',358,470],['breakaway',358,470],['try-party',358,470],['one-two',358,470],['switch-target',358,470],['grubber',358,470],['grubber-aim',358,470]]){
 const canvas=createCanvas(w,h);canvas.getBoundingClientRect=()=>({width:w,height:h});
 const map=createCanvas(108,172),r=new Renderer(canvas,map),m=new Match();m.reset();m.phase='live';m.events=[];
 if(label==='one-two'){m.guard=999;m.passCooldown=0;for(const p of m.players.filter(p=>p.team===1)){p.y=180;p.py=180;}const c=m.carrier,r=m.players[1];c.x=260;c.y=550;r.x=330;r.y=580;r.vy=-65;m.throwBall(r);for(let i=0;i<160;i++)m.step(1/120,{x:0,y:-1});m.aim={x:c.x-r.x,y:c.y-r.y};}
 else if(label==='switch-target'){m.lineup(1);m.phase='live';const next=m.bestDefender();m.selected=next.id===7?8:7;}
 else if(label==='grubber'||label==='grubber-aim'){m.beginKick({x:1,y:-1});if(label==='grubber'){m.releaseKick();for(let i=0;i<30;i++)m.step(1/120,{x:1,y:-1});}}
 else if(label==='breakaway'||label==='try-party'){const c=m.carrier;c.x=300;c.y=FIELD.top+120;c.px=c.x;c.py=c.y;c.vy=-78;for(const p of m.players.filter(p=>p.team===1)){p.y=c.y+90+p.slot*20;p.py=p.y;}if(label==='try-party'){c.y=FIELD.top;c.py=c.y;m.tryScored(0);m.step(.25);}}
 else if(label==='perfect-ready'){m.lineup(1);m.guard=0;m.selected=2;const d=m.controlled,c=m.carrier;d.x=c.x;d.y=c.y+34;d.px=d.x;d.py=d.y;}
 else if(label==='dominant'){m.lineup(1);m.guard=0;m.selected=2;const d=m.controlled,c=m.carrier;d.x=c.x;d.y=c.y+18;m.special();m.tackle(d,true);m.step(.12);}
 else if(label==='touchline'){m.guard=999;m.carrier.x=FIELD.left+8;for(let i=0;i<360;i++)m.step(1/120,{x:0,y:-1});}
 else if(label==='charge'){m.special({x:0,y:-1});for(let i=0;i<18;i++)m.step(1/120,{x:0,y:-1});}
 else if(label==='dive'){m.lineup(1);m.guard=0;m.controlled.x=m.carrier.x+70;m.controlled.y=m.carrier.y;m.special();for(let i=0;i<9;i++)m.step(1/120);}
 else if(label==='kick'){m.kick(.5);for(let i=0;i<60;i++)m.step(1/120);}
 else for(let i=0;i<140;i++)m.step(1/120,{x:-.4,y:-1});
 if(label.startsWith('stamina-'))m.controlled.energy=label==='stamina-medium'?45:label==='stamina-low'?20:0;
 r.draw(m,1,1);await writeFile(output+'/'+label+'-field.png',canvas.toBuffer('image/png'));
 console.log('Canvas rendered:',label,w,h);
}

// Compare full capacity at the same scale, independently of the camera.
{
 const canvas=createCanvas(358,160),map=createCanvas(108,172);canvas.getBoundingClientRect=()=>({width:358,height:160});
 const renderer=new Renderer(canvas,map),m=new Match(),c=canvas.getContext('2d');
 c.fillStyle='#47764d';c.fillRect(0,0,358,160);
 [2,0,4].forEach((id,i)=>{const p=m.players[id],x=60+i*119,y=105;
  renderer.drawPlayer(c,p,x,y,false,false);renderer.drawStamina(c,p,x,y);
  c.fillStyle='#f4f4da';c.font='10px monospace';c.textAlign='center';c.fillText(p.profile.label+' '+p.profile.stamina,x,135);
 });
 await writeFile(output+'/stamina-profiles.png',canvas.toBuffer('image/png'));
}

// Art-direction sheet: compare kits, body types, number visibility and action poses.
{
 const canvas=createCanvas(960,420),map=createCanvas(108,172);canvas.getBoundingClientRect=()=>({width:960,height:420});
 const r=new Renderer(canvas,map),c=canvas.getContext('2d'),m=new Match();
 c.fillStyle='#e8dcb1';c.fillRect(0,0,960,420);
 const poses=[['DOS',1,{facing:-1}],['FACE',1,{facing:1}],['POTENTE',2,{facing:-1}],['CORSA',4,{facing:-1,vx:0,vy:-78,anim:1}],['PALLA',1,{facing:-1}],['TUFFO',2,{facing:1,dive:.2,diveX:1,diveY:0}]];
 for(let team=0;team<2;team++){
  c.fillStyle=team===0?'#627e3d':'#516e3a';c.fillRect(12,12+team*204,936,192);
  poses.forEach(([label,slot,pose],i)=>{
   const p={...m.players[team*7+slot],...pose},x=80+i*152,y=157+team*204;
   c.save();c.translate(x,y);c.scale(1.8,1.8);r.drawPlayer(c,p,0,0,false,label==='PALLA');c.restore();
   c.fillStyle='#f5eac0';c.font='10px monospace';c.textAlign='center';c.fillText(label,x,190+team*204);
  });
 }
 await writeFile(output+'/player-style.png',canvas.toBuffer('image/png'));
}
