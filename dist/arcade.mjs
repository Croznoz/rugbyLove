import {ArcadeRun} from './arcade-engine.mjs';
import {bindArcadeControls} from './arcade-controls.mjs';
import {drawArcade} from './arcade-render.mjs';
const $=id=>document.getElementById(id),run=new ArcadeRun(),canvas=$('field'),ctx=canvas.getContext('2d',{alpha:false});
const RECORD='rrc-arcade-record-v1';let best=0,storage=true,last=0,bank=0,raf=0,hudTime=0;
try{best=Math.max(0,Number(localStorage.getItem(RECORD))||0);}catch{storage=false;}
const buttons={sprint:$('sprint'),dodge:$('dodge'),charge:$('charge')};
function save(){best=Math.max(best,run.score);try{localStorage.setItem(RECORD,String(best));}catch{storage=false;} $('storageNote').hidden=storage;}
function overlay(title,description,button){$('overlay').hidden=false;$('title').textContent=title;$('description').textContent=description;$('play').textContent=button;$('play').focus();}
function pause(){
  if(run.state==='playing'){run.state='paused';controls.clear();overlay('FIATO. POI VIA.','La corsa ti aspetta.','RIPRENDI ↗');}
  else if(run.state==='paused')resume();
  updateHud();
}
function resume(){run.state='playing';controls.clear();$('overlay').hidden=true;$('play').blur();last=0;bank=0;updateHud();}
const controls=bindArcadeControls({target:window,joystick:$('joystick'),stick:$('stick'),buttons,active:()=>run.state==='playing',pause,action:(kind,x)=>{run.action(kind,x);updateHud();}});
$('pause').addEventListener('click',pause);
$('play').addEventListener('click',()=>{if(run.state==='paused'){resume();return;}run.start();controls.clear();$('overlay').hidden=true;$('summary').hidden=true;$('play').blur();last=0;bank=0;updateHud();});
function updateHud(){
  $('score').textContent=run.score;$('best').textContent=best;$('level').textContent=String(run.level).padStart(2,'0');
  $('tries').textContent=run.tries+' METE';$('progress').textContent='META '+Math.floor((run.distance%1600)/10)+' / 160 m';
  $('energy').value=run.energy;$('energyText').textContent=Math.floor(run.energy);
  $('message').textContent=run.flash>0?'META! ONDATA '+run.level:'';
  $('pause').disabled=!['playing','paused'].includes(run.state);$('pause').textContent=run.state==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',run.state==='paused'?'Riprendi':'Pausa');
  for(const [kind,button] of Object.entries(buttons)){const cost={sprint:20,dodge:22,charge:32}[kind];button.disabled=run.state!=='playing'||run.cooldowns[kind]>0||run.energy<cost;}
}
function finish(){
  const record=run.score>best;save();controls.clear();
  overlay(record?'NUOVO RECORD!':'PLACCATO.',record?'Questa corsa entra nella storia del club.':'Un altro varco ti aspetta.','RIPROVA ↗');
  $('summary').hidden=false;$('summary').textContent=`${run.score} punti · ${run.tries} mete · ${run.passed} difensori superati`;
}
function frame(now){
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  if(run.state==='playing'){
    bank+=dt;while(bank>=1/120&&run.state==='playing'){run.step(1/120,controls.input());bank-=1/120;}
    if(run.state==='over')finish();
  }
  drawArcade(ctx,run);hudTime+=dt;if(hudTime>.08||run.state!=='playing'){updateHud();hudTime=0;}
  raf=requestAnimationFrame(frame);
}
window.addEventListener('blur',()=>{if(run.state==='playing')pause();else controls.clear();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(run.state==='playing')pause();cancelAnimationFrame(raf);raf=0;}
  else if(!raf){last=0;raf=requestAnimationFrame(frame);}
});
$('storageNote').hidden=storage;updateHud();raf=requestAnimationFrame(frame);
