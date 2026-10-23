import {NATIONS,teamPair,matchKits} from './teams.mjs';
import {Match,clamp} from './engine.mjs';
import {Renderer} from './render.mjs';
const $=id=>document.getElementById(id);
const match=new Match(),renderer=new Renderer($('pitch'),$('minimap'));
const input={x:0,y:0,sprint:false},keys=new Set();
let kickPointer=null,joyPointer=null,stickX=0,stickY=0,buttonPointer=null,paused=false,last=0,accumulator=0,hudAt=0,noticeUntil=0,sound=false,audio=null,frameId=0;
let contestHud=0;
const STEP=1/120,roles=['MEDIANO','APERTURA','CENTRO','CENTRO','ALA','ALA','ESTREMO'];
function audioReady(){if(!sound)return;try{audio||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function beep(freq=440,duration=.08,type='sine',volume=.04,delay=0){if(!sound||!audio)return;const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+delay;o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+.006);g.gain.exponentialRampToValueAtTime(.001,at+duration);o.connect(g);g.connect(audio.destination);o.start(at);o.stop(at+duration+.01);}
let crowd=null;
function updateCrowd(){
  const intensity=!paused&&match.state==='playing'?(match.phase==='try'?Math.min(1,match.phaseTime):match.breakawayIntensity()):0;
  if(!audio)return;
  if(!crowd&&sound&&intensity>0){
    // One reusable filtered-noise loop: a soft stadium roar, not extra notes.
    const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(.65+.35*Math.sin(i/audio.sampleRate*7));
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
    source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=1100;gain.gain.value=0;
    source.connect(filter);filter.connect(gain);gain.connect(audio.destination);source.start();crowd=gain;
  }
  if(crowd)crowd.gain.setTargetAtTime(sound?intensity*.16:0,audio.currentTime,sound&&intensity>0?.18:.025);
}
function releaseControls(){match.releaseSpecial(true);kickPointer=null;match.cancelKick();joyPointer=null;buttonPointer=null;stickX=stickY=0;keys.clear();input.x=input.y=0;input.sprint=false;$('stick').style.transform='translate(0px,0px)';for(const id of ['actionA','actionB','actionC'])$(id).classList.remove('pressed');}
function notice(text,tag,time=1100){$('noticeText').textContent=text;$('noticeTag').textContent=tag;$('notice').classList.add('show');noticeUntil=performance.now()+time;}
function consumeEvents(){
  for(const e of match.events){
    if(e.text){$('notice').classList[['try','halftime','kickoff'].includes(e.type)?'remove':'add']('compact');notice(e.text,e.tag,e.type==='try'?2200:e.type==='halftime'?2700:e.type==='kickoff'?1700:650);}
    if(e.type==='contact'){beep(220,.05,'triangle',.03);$('notice').classList.remove('show');noticeUntil=0;updateHud();}
    if(e.type==='offload'){beep(750,.1,'triangle',.035);updateHud();}
    if(e.type==='scrumStart'||e.type==='scrumEnd'){releaseControls();if(e.type==='scrumStart'){$('notice').classList.remove('show');noticeUntil=0;}updateHud();}
    if(e.type==='pass')beep(430,.06,'triangle',.025);
    if(e.type==='oneTwo'){beep(580,.08,'triangle',.03);beep(780,.1,'triangle',.03,.07);}
    if(e.type==='tackle'){beep(100,.1,'triangle',.06);navigator.vibrate?.(18);}
    if(e.type==='perfectTackle'){beep(75,.14,'triangle',.07);beep(440,.09,'triangle',.04,.07);beep(660,.12,'sine',.035,.14);navigator.vibrate?.([25,25,40]);}
    if(e.type==='dive')beep(190,.08,'triangle',.025);
    if(e.type==='charge')beep(160,.08,'triangle',.035);
    if(e.type==='break'){beep(160,.09,'triangle',.06);beep(320,.12,'triangle',.04,.06);navigator.vibrate?.([18,20,18]);}
    if(e.type==='kick'){beep(140,.06,'triangle',.06);beep(600,.13,'sine',.025,.04);}
    if(e.type==='recovery')beep(720,.08,'triangle',.025);
    if(e.type==='try'){[523,659,784,1047].forEach((f,i)=>beep(f,.16,'triangle',.05,i*.1));navigator.vibrate?.([25,40,25]);}
    if(e.type==='conversionStart'||e.type==='conversionEnd'){releaseControls();$('notice').classList.remove('show');noticeUntil=0;updateHud();}
    if(e.type==='powerLocked')beep(540,.07,'triangle',.03);
    if(e.type==='conversionKick'){beep(150,.06,'triangle',.05);beep(620,.12,'sine',.025,.04);}
    if(e.type==='conversionGood'){[659,880,1047].forEach((f,i)=>beep(f,.15,'triangle',.045,i*.1));navigator.vibrate?.([15,30,15]);updateHud();}
    if(e.type==='conversionMiss'){beep(180,.2,'triangle',.035);updateHud();}
    if(e.type==='kickoff'||e.type==='halftime')beep(1400,.18,'sine',.02);
    if(e.type==='end')showResult();
  }
  match.events.length=0;
}
function updateHud(){
  $('homeScore').textContent=String(match.score[0]).padStart(2,'0');$('awayScore').textContent=String(match.score[1]).padStart(2,'0');
  const t=Math.ceil(match.time);$('clock').textContent=String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
  $('half').textContent=match.half+'° TEMPO';
  if(match.phase==='conversion'){
    const c=match.conversion,ready=c.team===0&&['power','accuracy'].includes(c.stage)&&!paused;
    $('possession').textContent='◎ CONVERSIONE '+match.teams[c.team].name;$('phase').textContent='CRONOMETRO FERMO';
    $('actionA').disabled=true;$('actionB').disabled=true;$('actionC').disabled=!ready;
    $('labelA').textContent='—';$('labelB').textContent='—';$('labelC').textContent=ready?'FERMA':'TIRO';
    $('controlHint').textContent='C: POTENZA, POI PRECISIONE';$('actionC').setAttribute('aria-label',c.stage==='power'?'Ferma la potenza':'Ferma la precisione e calcia');return;
  }
  if(match.phase==='scrum'){
    $('possession').textContent='MISCHIA ARCADE';$('phase').textContent='INTRODUCE '+match.teams[match.scrum.feed].name;
    $('actionA').disabled=true;$('actionB').disabled=paused||match.scrum.feed===1;$('actionC').disabled=true;
    $('labelA').textContent='—';$('labelB').textContent=match.scrum.feed===0?'DUELLA':'AUTO';$('labelC').textContent='—';
    $('actionB').classList.remove('cooling');$('actionB').setAttribute('aria-label',match.scrum.started?'Premi quando la lancetta è nel verde per duellare in mischia':'Premi per iniziare la mischia');
    $('controlHint').textContent=match.scrum.feed===0?(match.scrum.started?'PREMI B NEL VERDE · JOYSTICK: USCITA':'PREMI DUELLA PER INIZIARE'):'MISCHIA DIFENSIVA AUTOMATICA';return;
  }
  $('actionA').disabled=paused||(match.phase==='contact'&&match.possession!==0);$('actionB').disabled=match.phase==='contact';$('labelC').textContent=match.kickAim?'RILASCIA':'CALCIA';$('actionC').setAttribute('aria-label','Tieni premuto, mira col joystick e rilascia per calciare');
  $('possession').textContent=match.loose?'◌ PALLA CONTESA':'● PALLA · '+match.teams[match.possession].name;
  $('phase').textContent=match.state==='menu'?'7 vs 7 · PARTITA RAPIDA':match.loose?(match.ball.kind==='fumble'?'PALLONE LIBERO':'INSEGUI IL CALCIO'):match.phase==='contact'?'PASSA ORA · OFFLOAD':match.phase==='ruck'?'RIPARTENZA':match.tackles+' / 3 PLACCAGGI';
  $('labelA').textContent=match.phase==='contact'&&match.possession===0?'OFFLOAD':match.possession===0&&!match.loose?'PASSA':'CAMBIA';$('labelB').textContent=match.loose?'SCATTO':match.possession===0?(Math.abs(directionInput().x)>.55&&Math.abs(directionInput().x)>Math.abs(directionInput().y)*1.25?'SCHIVA':'SFONDA'):match.controlled.brace?'CONTIENI':'PLACCA';
  $('direction').textContent='ATTACCA '+(match.attackDir<0?'↑':'↓');$('playerNumber').textContent=String(match.controlled.number).padStart(2,'0');$('playerName').textContent=roles[match.controlled.slot]+' · '+match.controlled.profile.label;
  $('stamina').style.transform='scaleX('+(Math.min(1,match.controlled.energy/match.controlled.profile.stamina))+')';
  $('controlHint').textContent=match.loose?'INSEGUI E RECUPERA.':match.possession===0?(match.phase==='contact'?'A ORA: LIBERA LA PALLA':'INDICA IL COMPAGNO · PREMI PASSA'):'TOCCA: PLACCA · TIENI: CONTIENI';
  $('actionA').setAttribute('aria-label',match.possession===0&&!match.loose?'Passa al compagno evidenziato':'Seleziona il difensore meglio posizionato');
  $('actionB').setAttribute('aria-label',match.loose?'Scatto: tieni premuto':match.possession===0?'Tocca per sfondare, orienta di lato per schivare; tieni per scattare':'Tocca e rilascia per placcare; tieni premuto per contenere');
  if(match.contestWindow()){
    $('labelB').textContent='CONTENDI';$('actionB').disabled=paused||!match.canContest();
    $('actionB').setAttribute('aria-label','Contendi: premi per saltare e prendere il pallone alto');
    $('controlHint').textContent=match.controlled.jump>0?'CERCA LA PRESA!':'PALLA IN DISCESA · PREMI CONTENDI';
  }
  if(match.kickAim){$('labelA').textContent='ANNULLA';$('actionB').disabled=true;$('controlHint').textContent=!match.kickAim.kickoff&&match.kickAim.power<=.32?'RILASCIA: RASOTERRA DA INSEGUIRE':'RILASCIA: CALCIO ALTO';}
  if(match.phase==='kickoff'){
    $('possession').textContent='CALCIO D’INIZIO';$('phase').textContent='BATTUTA DALLA METÀ CAMPO';
    $('actionA').disabled=!match.kickAim;$('actionB').disabled=true;
    $('controlHint').textContent=match.possession===0?'TIENI CALCIA · MIRA · RILASCIA PER BATTERE':'CALCIO AVVERSARIO · PREPARATI A RICEVERE';
  }
  const p=match.controlled;
  $('staminaTrack').style.width=(55*p.profile.stamina/100)+'px';
  const tired=p.energy<30||p.exhausted;
  $('energyLabel').textContent=(p.exhausted?'RECUPERO ':tired?'POCA ENERGIA ':'ENERGIA ')+Math.round(p.energy)+'/'+p.profile.stamina;
  $('stamina').style.background=p.energy<12||p.exhausted?'#ef947f':tired?'#f4c36c':'#d0e789';
  $('actionB').classList[p.cd>0||tired?'add':'remove']('cooling');
  $('actionC').disabled=paused||match.state!=='playing'||!['live','kickoff'].includes(match.phase)||match.possession!==0||!!match.ball||(match.phase==='live'&&match.carrier.kickCd>0)||match.carrier.energy<12;
}

function selectedTeams(changed='home'){
  let home=$('homeNation').value||'ita',away=$('awayNation').value||'irl';
  if(home===away){
    if(changed==='away')home=NATIONS.find(n=>n.id!==away).id;
    else away=NATIONS.find(n=>n.id!==home).id;
  }
  const teams=teamPair(home,away);
  $('homeNation').value=teams[0].id;$('awayNation').value=teams[1].id;
  return teams;
}
function teamLabels(teams,kits){
  for(const [i,side] of ['home','away'].entries()){
    $(side+'Name').textContent=teams[i].name;
    $(side+'Style').textContent=(i===0?'TU':'CPU')+' · '+teams[i].style;
    $(side+'Chip').textContent=teams[i].short;
    $(side+'Chip').style.background=kits[i].body;
    $(side+'Chip').style.color=i===1&&kits[i]!==teams[i].kit?'#21383d':teams[i].id==='eng'?'#21383d':'#fff4cc';
    $('scrum'+(i===0?'Home':'Away')).textContent=teams[i].name;
  }
  $('scrumBalance').style.background=kits[0].body;
}
function previewTeams(changed){
  const teams=selectedTeams(changed);
  $('homeTraits').textContent=teams[0].detail;$('awayTraits').textContent=teams[1].detail;
  for(const [i,side] of ['home','away'].entries()){
    const team=teams[i];
    $(side+'Flag').setAttribute('src','assets/flags/'+team.id+'.svg');
    $(side+'Flag').setAttribute('alt','Bandiera '+team.name);
    $(side+'Identity').textContent=team.short;
    for(const [key,multiplier] of Object.entries(team.stats)){
      const value=Math.round(multiplier*100),id=side+'Stat'+key;
      $(id).setAttribute('aria-valuenow',String(value));
      $(id).setAttribute('aria-valuetext',value+' · base 100');
      $(side+'Value'+key).textContent=(value>100?'+':'')+(value-100)+'%';
      $(side+'Fill'+key).style.width=((value-90)/20*100)+'%';
      $(side+'Fill'+key).style.background=value>100?'#e8bc86':value<100?'#b7826b':'#a5bf91';
    }
  }
  teamLabels(teams,matchKits(teams));
}
$('homeNation').addEventListener('change',()=>previewTeams('home'));
$('awayNation').addEventListener('change',()=>previewTeams('away'));

function start(){
  const teams=selectedTeams();
  releaseControls();audioReady();match.reset({seconds:Number($('duration').value),difficulty:$('difficulty').value,scrums:$('scrums').value==='on',home:teams[0].id,away:teams[1].id});paused=false;
  $('menu').hidden=true;$('pauseMenu').hidden=true;$('result').hidden=true;$('helpContent').hidden=true;$('help').setAttribute('aria-expanded','false');$('pause').disabled=false;
  teamLabels(match.teams,match.kits);renderer.camera.y=440;accumulator=0;consumeEvents();updateHud();
  document.body.classList.add('playing');renderer.resize();
  $('pitchView').scrollIntoView({block:'nearest'});
}
function pause(){
  if(match.state!=='playing'||paused)return;paused=true;releaseControls();updateCrowd();$('pauseMenu').hidden=false;$('resume').focus();$('pause').setAttribute('aria-label','Partita in pausa');
}
function resume(){paused=false;last=performance.now();accumulator=0;$('pauseMenu').hidden=true;$('pause').setAttribute('aria-label','Metti in pausa');}
function menu(){document.body.classList.remove('playing');renderer.resize();paused=false;releaseControls();match.reset({});match.state='menu';match.phase='live';match.events=[];$('menu').hidden=false;$('pauseMenu').hidden=true;$('result').hidden=true;$('pause').disabled=true;$('notice').classList.remove('show');renderer.camera.y=440;updateHud();previewTeams();$('start').focus();}
function showResult(){
  releaseControls();$('resultTitle').textContent=match.score[0]>match.score[1]?'VITTORIA '+match.teams[0].name+'!':match.score[0]<match.score[1]?'LA RIVINCITA?':'ALLA PARI.';
  $('resultTeams').textContent=match.teams.map(t=>t.name).join(' · ');
  $('finalScore').textContent=match.score[0]+' — '+match.score[1];$('statTries').textContent=match.stats.tries[0];$('statPasses').textContent=match.stats.passes[0];$('statTackles').textContent=match.stats.tackles[0];
  $('result').hidden=false;$('pause').disabled=true;$('replay').focus();beep(1250,.3,'sine',.025);
}
function actionA(){if(paused)return;audioReady();match.pass(directionInput());updateHud();}
function directionInput(){return {x:stickX+(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0),y:stickY+(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0)};}
function actionB(){if(paused)return;audioReady();if(match.phase==='scrum'){match.scrumAction();updateHud();updateScrum();return;}match.special(directionInput());}
function beginB(){if(paused)return;audioReady();if(match.phase==='scrum'){match.scrumAction();updateHud();updateScrum();return;}match.beginSpecial(directionInput());}
function stopConversion(){if(paused)return;audioReady();match.conversionAction();}
function actionC(){if(paused)return;if(match.phase==='conversion'){stopConversion();return;}audioReady();if(match.kickAim)match.releaseKick();else match.beginKick(directionInput());}
const conversionButton=$('conversionStop');
conversionButton.addEventListener('pointerdown',e=>{e.preventDefault();if(!conversionButton.disabled)stopConversion();});
conversionButton.addEventListener('click',e=>{if(e.detail===0&&!conversionButton.disabled)stopConversion();});
$('start').addEventListener('click',start);$('replay').addEventListener('click',start);$('resultMenu').addEventListener('click',menu);$('quit').addEventListener('click',menu);$('pause').addEventListener('click',pause);$('resume').addEventListener('click',resume);
$('help').addEventListener('click',()=>{$('helpContent').hidden=!$('helpContent').hidden;$('help').setAttribute('aria-expanded',String(!$('helpContent').hidden));});
$('closeHelp').addEventListener('click',()=>{$('helpContent').hidden=true;$('help').setAttribute('aria-expanded','false');$('help').focus();});
$('sound').addEventListener('click',()=>{sound=!sound;audioReady();$('soundLabel').textContent=sound?'ON':'OFF';$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Disattiva audio':'Attiva audio');if(sound)beep(600);updateCrowd();});
function moveStick(e){
  const r=$('joystick').getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),d=Math.hypot(dx,dy),max=29;
  if(d<5){stickX=stickY=0;}else{stickX=dx/Math.max(d,max);stickY=dy/Math.max(d,max);}
  $('stick').style.transform='translate('+(stickX*max)+'px,'+(stickY*max)+'px)';
}
const ja=$('joystickArea');
ja.addEventListener('pointerdown',e=>{e.preventDefault();if(paused||match.state!=='playing'||joyPointer!==null)return;joyPointer=e.pointerId;ja.setPointerCapture(e.pointerId);moveStick(e);});
ja.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer){e.preventDefault();moveStick(e);}});
function releaseStick(e){if(e.pointerId!==joyPointer)return;joyPointer=null;stickX=stickY=0;$('stick').style.transform='translate(0px,0px)';}
ja.addEventListener('pointerup',releaseStick);ja.addEventListener('pointercancel',releaseStick);ja.addEventListener('lostpointercapture',releaseStick);
for(const id of ['actionA','actionB','actionC']){
  const el=$(id);
  el.addEventListener('pointerdown',e=>{e.preventDefault();if(el.disabled)return;el.setPointerCapture(e.pointerId);el.classList.add('pressed');if(id==='actionA')actionA();else if(id==='actionC'){if(match.phase==='conversion')stopConversion();else if(match.beginKick(directionInput()))kickPointer=e.pointerId;}else if(match.phase==='scrum'){actionB();}else{buttonPointer=e.pointerId;input.sprint=true;beginB();}});
  const up=e=>{el.classList.remove('pressed');if(id==='actionC'&&e.pointerId===kickPointer){kickPointer=null;if(e.type==='pointerup'&&!paused){match.updateKickAim(0,directionInput());match.releaseKick();}else match.cancelKick();}if(id==='actionB'&&e.pointerId===buttonPointer){input.sprint=false;buttonPointer=null;match.releaseSpecial(e.type!=='pointerup'||paused);}};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up);
  // Keyboard/screen-reader activation has no pointerdown.
  el.addEventListener('click',e=>{if(e.detail===0&&!el.disabled){if(id==='actionA')actionA();else if(id==='actionC')actionC();else actionB();}});
}
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLSelectElement)return;
  const active=match.state==='playing'&&!paused;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','KeyJ','KeyK','KeyL'].includes(e.code)&&active)e.preventDefault();
  if(e.code==='Escape'||e.code==='KeyP'){if(match.state==='playing'){if(paused)resume();else pause();}return;}
  if(!active)return;
  if(match.phase==='conversion'){
    if(['Space','KeyL','KeyC','Enter'].includes(e.code)){e.preventDefault();if(!e.repeat)stopConversion();}return;
  }
  if(match.phase==='scrum'&&e.code==='KeyB'){e.preventDefault();if(!e.repeat)actionB();return;}
  if(!e.repeat){if(e.code==='KeyJ')actionA();if(e.code==='Space'||e.code==='KeyK'){if(match.phase==='scrum')actionB();else beginB();}if(e.code==='KeyL')match.beginKick(directionInput());}keys.add(e.code);
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if((e.code==='Space'||e.code==='KeyK')&&!keys.has('Space')&&!keys.has('KeyK'))match.releaseSpecial(paused);if(e.code==='KeyL'&&!paused){match.updateKickAim(0,directionInput());match.releaseKick();}});
window.addEventListener('blur',()=>{releaseControls();pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseControls();pause();cancelAnimationFrame(frameId);frameId=0;}else if(!frameId){last=performance.now();frameId=requestAnimationFrame(frame);}});
window.addEventListener('contextmenu',e=>{if(e.target.closest('.controller'))e.preventDefault();});
new ResizeObserver(()=>renderer.resize()).observe($('pitchView'));
function setText(id,value){if($(id).textContent!==value)$(id).textContent=value;}
function updateConversion(){
  const c=match.phase==='conversion'?match.conversion:null;
  $('conversionPanel').hidden=!c;$('pitchView').classList[c?'add':'remove']('converting');if(!c)return;
  const power=c.powerLocked??c.power,accuracy=c.accuracyLocked??c.accuracy;
  $('powerZone').style.left=(c.minPower*100)+'%';$('powerZone').style.width=((.88-c.minPower)*100)+'%';
  $('powerFill').style.transform='scaleX('+power+')';$('powerNeedle').style.left=(power*100)+'%';
  $('accuracyZone').style.left=((.5-c.greenHalf)*100)+'%';$('accuracyZone').style.width=(c.greenHalf*200)+'%';$('accuracyNeedle').style.left=(accuracy*100)+'%';
  $('powerRow').classList[c.stage==='power'?'remove':'add']('inactive');
  $('accuracyRow').classList[c.stage==='power'?'add':'remove']('inactive');
  setText('conversionTitle','CONVERSIONE · '+match.teams[c.team].name);
  setText('powerValue',Math.round(power*100)+'%'+(c.powerLocked!==null?' ✓':''));
  setText('accuracyValue',c.stage==='power'?'ATTENDI':c.stage==='accuracy'?(c.speed/.82).toFixed(1)+'×':c.accuracyLocked===null?'NON FERMATA':Math.abs(c.error)<=1?'NEL CENTRO':'FUORI CENTRO');
  const ready=c.team===0&&['power','accuracy'].includes(c.stage);conversionButton.disabled=!ready||paused||c.elapsed<.18;
  let instruction,button,tip,badge='+2 PUNTI';
  if(c.stage==='power'){instruction='Ferma POWER nella zona verde.';button='1 · FERMA POTENZA';tip='C / L / SPAZIO · '+Math.ceil(12-c.elapsed)+'s';}
  else if(c.stage==='accuracy'){instruction='Ferma la freccia al centro verde: sta accelerando!';button='2 · FERMA E CALCIA';tip='ROSSO = ERRORE · CENTRO VERDE = PRECISO · '+Math.ceil(12-c.elapsed)+'s';}
  else if(c.stage==='flight'){instruction='Pallone in volo verso i pali…';button='TIRO IN CORSO';tip='TRA I PALI E SOPRA LA TRAVERSA';}
  else{instruction=c.scored?'Tra i pali! Due punti sul tabellone.':c.reason+'. Nessun punto aggiuntivo.';button=c.scored?'CONVERSIONE RIUSCITA':'CONVERSIONE FALLITA';tip='RIPRESA TRA '+Math.max(1,Math.ceil(c.resultTime))+'s';badge=c.scored?'+2 PUNTI':'0 PUNTI';}
  if(c.team===1&&['power','accuracy'].includes(c.stage)){instruction='L’Irlanda prepara la conversione.';button='CALCIA LA CPU';tip='ATTENDI IL TIRO AVVERSARIO';}
  setText('conversionInstruction',instruction);setText('conversionStop',button);setText('conversionTip',tip);setText('conversionBadge',badge);
}
function updateScrum(){
  const s=match.phase==='scrum'?match.scrum:null;$('scrumPanel').hidden=!s;$('pitchView').classList[s?'add':'remove']('scrum-view');if(!s)return;
  const waiting=s.feed===0&&!s.started;
  setText('scrumTitle',waiting?'MISCHIA · PRONTO?':'MISCHIA · '+Math.max(0,s.duration-s.elapsed).toFixed(1)+'s');
  const ready=s.feed===0&&s.started&&s.elapsed>=s.intro;
  setText('scrumCallout',waiting?'MISCHIA · PREMI DUELLA':'MISCHIA · SPINGI!!');
  $('scrumCallout').hidden=ready||s.feed===1;$('scrumTiming').hidden=!ready;
  $('scrumNeedle').style.left=(s.needle*100)+'%';
  const feedback=s.lastAction&&s.elapsed-s.lastActionAt<.48?(s.lastAction==='win'?'SPINTA!':'FUORI TEMPO'):'MIRA '+Math.round(s.needle*100)+'%';
  setText('scrumMeterValue',s.feed===1?'AUTOMATICA':feedback);
  setText('scrumInstructions',s.feed===0?(waiting?'PREMI DUELLA / B / K / SPAZIO PER INIZIARE':'JOYSTICK: USCITA · PREMI B / SPAZIO NEL VERDE'):'DIFESA AUTOMATICA · NESSUN COMANDO RICHIESTO');
  setText('scrumSide',s.feed===1?'INTRODUCE '+match.teams[1].name+' · PREPARATI A DIFENDERE':s.side<0?'← USCITA A SINISTRA':'USCITA A DESTRA →');
  $('scrumBalance').style.transform='scaleX('+s.balance+')';
}
function updateKick(){
  const a=match.kickAim;$('kickPanel').hidden=!a;if(!a)return;
  setText('kickType',a.kickoff?'RIPARTENZA ALTA · MIRA E RILASCIA':a.power<=.32?'RASOTERRA · MIRA E RILASCIA':'CALCIO ALTO · MIRA E RILASCIA');
  $('kickPower').style.transform='scaleX('+a.power+')';
  setText('kickPowerValue',Math.round(a.power*100)+'%');
}
function frame(now){
  const dt=Math.min((now-last)/1000||0,1/15);last=now;
  if(!paused&&match.state==='playing'){
    input.x=stickX+(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);
    input.y=stickY+(keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0);
    const held=input.sprint;input.sprint=buttonPointer!==null||keys.has('Space')||keys.has('KeyK');accumulator+=dt;
    while(accumulator>=STEP){match.step(STEP,input);accumulator-=STEP;}
    input.sprint=held;consumeEvents();
  }else accumulator=0;
  if(now>noticeUntil)$('notice').classList.remove('show');
  const contestState=match.contestWindow()?(match.canContest()?1:2):0;
  if(now-hudAt>90||contestState!==contestHud){updateHud();hudAt=now;contestHud=contestState;}
  updateConversion();updateScrum();updateKick();updateCrowd();
  renderer.draw(match,dt,['live','scrum'].includes(match.phase)&&!paused?clamp(accumulator/STEP,0,1):1);
  frameId=requestAnimationFrame(frame);
}
match.events=[];updateHud();previewTeams();frameId=requestAnimationFrame(frame);
