import {KickChallenge} from './kicks-engine.mjs';
import {bindKickControls} from './kicks-controls.mjs';
import {drawKickChallenge} from './kicks-render.mjs';
import {paintStadium} from './art.mjs';
const $=id=>document.getElementById(id),game=new KickChallenge(),ctx=$('field').getContext('2d',{alpha:false});
const scene=document.createElement('canvas');scene.width=420;scene.height=460;paintStadium(scene.getContext('2d'),420,460);
const RECORD='rrc-kicks-record-v1';let best=0,startBest=0,storage=true,last=0,bank=0,raf=0,resolved=0,hudTime=0;
try{const saved=Number(localStorage.getItem(RECORD));best=Number.isFinite(saved)?Math.max(0,saved):0;}catch{storage=false;}
function save(){best=Math.max(best,game.score);try{localStorage.setItem(RECORD,String(best));}catch{storage=false;}$('storageNote').hidden=storage;}
function overlay(title,description,button){$('overlay').hidden=false;$('title').textContent=title;$('description').textContent=description;$('play').textContent=button;$('play').focus();}
function resume(){game.state='playing';controls.clear();$('overlay').hidden=true;$('play').blur();last=0;bank=0;updateHud();}
function pause(){
  if(game.state==='playing'){game.state='paused';controls.clear();overlay('FIATO. POI CALCIA.','Potenza e precisione restano ferme.','RIPRENDI ↗');}
  else if(game.state==='paused')resume();updateHud();
}
function shoot(){if(game.action()){if(game.stage!=='accuracy')controls.clear();updateHud();}}
const controls=bindKickControls({target:window,joystick:$('joystick'),stick:$('stick'),left:$('left'),right:$('right'),kick:$('kick'),
  active:()=>game.state==='playing',canAim:()=>game.state==='playing'&&['power','accuracy'].includes(game.stage),
  steer:(axis,dt)=>game.steer(axis,dt),shoot,pause});
$('pause').addEventListener('click',pause);
$('play').addEventListener('click',()=>{
  if(game.state==='paused'){resume();return;}
  game.start();startBest=best;resolved=0;controls.clear();$('overlay').hidden=true;$('summary').hidden=true;$('play').blur();last=0;bank=0;updateHud();
});
function updateHud(){
  $('score').textContent=game.score;$('best').textContent=best;$('level').textContent=String(game.shotLevel).padStart(2,'0');
  const x=game.position.x,position=Math.abs(x)<.1?'CENTRO':Math.abs(x).toFixed(1)+' m '+(x<0?'SX':'DX');
  $('position').textContent=Math.round(game.distance)+' m · '+position;$('lives').textContent=game.lives+' ERRORI DISPONIBILI';
  $('wind').textContent=Math.abs(game.wind)<.05?'VENTO ASSENTE':'VENTO '+(game.wind<0?'←':'→')+' DEVIA '+Math.abs(game.wind).toFixed(1)+' m';
  $('shotStats').textContent=game.goals+' CENTRI · SERIE '+game.streak+' · TIRO '+(game.attempt+1);
  let prompt=game.stage==='power'?'FERMA LA POTENZA NEL VERDE':game.stage==='accuracy'?'FERMA LA PRECISIONE NEL VERDE':game.stage==='flight'?'PALLONE IN VOLO…':game.result.reason+(game.result.scored?' +'+game.result.points:'');
  $('shotPrompt').textContent=prompt;
  const power=game.powerLocked??game.power,accuracy=game.accuracyLocked??game.accuracy,green=game.green;
  $('powerValue').textContent=Math.round(power*100)+'%';$('accuracyValue').textContent=game.stage==='power'?'ATTENDI':Math.round(accuracy*100)+'%';
  $('powerNeedle').style.left=power*100+'%';$('accuracyNeedle').style.left=accuracy*100+'%';
  $('powerZone').style.left=game.minPower*100+'%';$('powerZone').style.width=(1-game.minPower)*100+'%';
  $('accuracyZone').style.left=green.left*100+'%';$('accuracyZone').style.width=(green.right-green.left)*100+'%';
  $('powerRow').setAttribute('data-active',String(game.stage==='power'));$('accuracyRow').setAttribute('data-active',String(game.stage==='accuracy'));
  $('powerTrack').setAttribute('aria-valuenow',Math.round(power*100));$('accuracyTrack').setAttribute('aria-valuenow',Math.round(accuracy*100));
  $('pause').disabled=!['playing','paused'].includes(game.state);$('pause').textContent=game.state==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',game.state==='paused'?'Riprendi':'Pausa');
  const aim=game.state==='playing'&&['power','accuracy'].includes(game.stage);
  $('left').disabled=$('right').disabled=!aim;
  $('kick').disabled=game.state!=='playing'||game.stage==='flight'||game.elapsed<(game.stage==='result'?.65:.18);
  $('kickLabel').textContent=game.stage==='power'?'POTENZA':game.stage==='accuracy'?'CALCIA':game.stage==='flight'?'IN VOLO':'PROSSIMO';
  $('kick').setAttribute('aria-label',game.stage==='power'?'Ferma potenza':game.stage==='accuracy'?'Ferma precisione e calcia':'Prossimo tiro');
}
function finish(){
  save();controls.clear();overlay(game.score>startBest?'NUOVO RECORD!':'GARA FINITA.',game.result.reason+'. Riparti e cerca il prossimo centro.','RIPROVA ↗');
  $('summary').hidden=false;$('summary').textContent=`${game.score} punti · ${game.goals} centri · ${game.attempt+1} tiri`;
}
function frame(now){
  const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
  if(game.state==='playing'){
    bank+=dt;while(bank>=1/120&&game.state==='playing'){game.step(1/120,controls.input());bank-=1/120;}
    if(game.resolved!==resolved){resolved=game.resolved;save();updateHud();}
    if(game.state==='over')finish();
  }
  drawKickChallenge(ctx,game,scene);hudTime+=dt;if(hudTime>.05||game.state!=='playing'){updateHud();hudTime=0;}
  raf=requestAnimationFrame(frame);
}
window.addEventListener('blur',()=>{if(game.state==='playing')pause();else controls.clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(game.state==='playing')pause();cancelAnimationFrame(raf);raf=0;}else if(!raf){last=0;raf=requestAnimationFrame(frame);}});
$('storageNote').hidden=storage;updateHud();raf=requestAnimationFrame(frame);
