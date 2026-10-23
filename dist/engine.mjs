import {teamPair,matchKits} from './teams.mjs';
export const FIELD={width:684,height:1254,left:48.45,right:635.55,top:121.125,bottom:1132.875,inGoalTop:42.75,inGoalBottom:1211.25};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const CARRIER_PACE=.82;
// Fixed role profiles: appearance and action bonuses never alter normal running or passing.
export const PROFILES=Object.freeze({
  powerful:Object.freeze({label:'POTENTE',stamina:99,width:1.15,height:1.08,sprint:1.28,agility:.95,charge:1.12,tackle:1.1,kick:1}),
  agile:Object.freeze({label:'AGILE',stamina:132,width:1,height:1,sprint:1.43,agility:1.1,charge:.9,tackle:1,kick:1}),
  playmaker:Object.freeze({label:'REGISTA',stamina:110,width:1.05,height:1.04,sprint:1.35,agility:1,charge:1,tackle:1,kick:1.35})
});
const ROLE_PROFILES=['playmaker','playmaker','powerful','powerful','agile','agile','agile'];
const NUMBERS=[9,10,12,13,11,14,15];
// Slot order: 9, 10, centres 12/13, wings 11/14, fullback 15.
// Offsets are measured from halfway in the kicking team's attacking direction.
const KICKING_FORMATION=Object.freeze([
  [0,0],[0,-76],[-98,-34],[98,-34],[-275,-52],[275,-52],[0,-146]
]);
const RECEIVING_FORMATION=Object.freeze([
  [0,104],[0,172],[-100,88],[100,88],[-275,132],[275,132],[0,230]
]);
export class Match{
  constructor(){this.events=[];this.reset({});this.state='menu';this.phase='live';}
  reset({seconds=60,difficulty='normal',scrums=false,home='ita',away='irl'}={}){
    this.teams=teamPair(home,away);this.kits=matchKits(this.teams);
    this.scrumsEnabled=!!scrums;this.scrum=null;this.seconds=seconds;this.difficulty=difficulty;this.aiSpeed={easy:70,normal:80,hard:88}[difficulty]||80;
    this.score=[0,0];this.half=1;this.time=seconds;this.elapsed=0;this.attackDir=-1;this.possession=0;this.tackles=0;this.state='playing';this.phase='kickoff';this.phaseTime=2.1;this.events=[];this.ball=null;this.particles=[];this.perfectImpact=null;this.cpuThink=0;this.passCooldown=0;this.guard=1;this.selected=0;
    this.passSelection=null;this.kickAim=null;this.loopRun=null;this.attackPlan=null;this.defensePlan=null;this.conversion=null;this.contact=null;this.cpuOffloadAt=-10;this.defenseGesture=null;this.aim={x:0,y:0};
    this.stats={tries:[0,0],conversions:[0,0],conversionAttempts:[0,0],passes:[0,0],offloads:[0,0],scrums:[0,0],tackles:[0,0],breaks:[0,0],kicks:[0,0],possession:[0,0]};
    this.players=Array.from({length:14},(_,id)=>({id,team:id<7?0:1,slot:id%7,number:NUMBERS[id%7],nation:this.teams[id<7?0:1].stats,kit:this.kits[id<7?0:1],profile:PROFILES[ROLE_PROFILES[id%7]],x:0,y:0,px:0,py:0,vx:0,vy:0,down:0,jump:0,jumpQuality:0,energy:PROFILES[ROLE_PROFILES[id%7]].stamina,energyWait:0,runLoad:0,moveSpeed:0,exhausted:false,burst:0,cd:0,charge:0,chargeX:0,chargeY:0,dive:0,diveX:0,diveY:0,kickAnim:0,kickCd:0,dominantReadyAt:0,dominantAttempt:false,brace:false,evade:0,tackleWind:0,tackleX:0,tackleY:0,anim:0,facing:0}));
    this.lineup(0);this.emit('kickoff','SI GIOCA.','CALCIO D’INIZIO');
  }
  spendEnergy(p,amount){
    p.energy=clamp(p.energy-amount,0,p.profile.stamina);p.energyWait=.65;
    if(p.energy<=1)p.exhausted=true;
  }
  recoverEnergy(dt,input){
    for(const p of this.players){
      p.energyWait=Math.max(0,p.energyWait-dt);
      if(p.exhausted&&p.energy>=25)p.exhausted=false;
      const live=this.phase==='live'&&p.down<=0;
      const moving=live&&p.moveSpeed>8,running=live&&p.moveSpeed>30;
      // Sustained effort belongs to each runner, including AI; brief stops do not erase it.
      p.runLoad=clamp(p.runLoad+dt*(running?1:moving?-.5:-2),0,12);
      const sprint=live&&p.id===this.selected&&(this.possession===0||this.loose)&&input.sprint&&!p.exhausted&&p.energy>1&&Math.hypot(input.x||0,input.y||0)>.1;
      if(running&&!sprint&&p.runLoad>2){
        this.spendEnergy(p,dt*(.8+2.2*clamp((p.runLoad-2)/8,0,1)));
      }else if(!running&&!sprint&&p.energyWait===0&&p.charge<=0&&p.dive<=0&&p.burst<=0&&p.evade<=0&&p.kickAnim<=0){
        const carrying=!this.ball&&p.id===this.carrierId&&['live','contact','kickoff','try'].includes(this.phase);
        p.energy=clamp(p.energy+dt*(moving?4:12)*p.nation.recovery*(carrying?1:1.09),0,p.profile.stamina);
      }
    }
  }
  emit(type,text='',tag=''){this.events.push({type,text,tag});if(this.events.length>30)this.events.shift();}
  dir(team){return team===0?this.attackDir:-this.attackDir;}
  get carrier(){return this.players[this.carrierId];}
  get controlled(){return this.players[this.selected];}
  get loose(){return this.ball?.kind==='kick'||this.ball?.kind==='fumble';}
  lineup(team,x=FIELD.width/2,y=FIELD.height/2){
    this.loopRun=null;for(const p of this.players)p.commitUntil=0;
    this.passSelection=null;this.kickAim=null;this.attackPlan=null;this.defensePlan=null;this.scrum=null;this.contact=null;this.defenseGesture=null;this.possession=team;this.carrierId=team*7;const d=this.dir(team);this.ball=null;this.passCooldown=.7;this.guard=1.15;
    for(const p of this.players){
      const own=p.team===team,offset=(own?KICKING_FORMATION:RECEIVING_FORMATION)[p.slot];
      p.x=clamp(x+offset[0]*(FIELD.width/600),FIELD.left+8,FIELD.right-8);
      p.y=clamp(y+d*offset[1]*(FIELD.height/1100),FIELD.top+24,FIELD.bottom-24);
      p.px=p.x;p.py=p.y;p.vx=p.vy=0;p.moveSpeed=0;p.down=0;p.jump=0;p.jumpQuality=0;p.supportUntil=0;p.burst=0;p.charge=0;p.dive=0;p.kickAnim=0;p.dominantAttempt=false;p.brace=false;p.evade=0;p.tackleWind=0;p.facing=this.dir(p.team);
    }
    this.selected=team===0?this.carrierId:this.nearest(0,this.carrier).id;
  }
  launchKickoff(){
    // The setup keeps kickers behind halfway and receivers beyond the 10 m line.
    const p=this.carrier,dir=this.dir(p.team);
    this.phase='live';this.passSelection=null;this.kickAim=null;
    p.kickAnim=.4;p.kickCd=1.2;
    this.ball={kind:'kick',kickoff:true,x:p.x,y:p.y,sx:p.x,sy:p.y,
      tx:FIELD.width/2,ty:FIELD.height/2+dir*216*1.05,from:p.id,team:p.team,t:0,duration:1.65,groundTime:0,
      eligible:this.players.filter(a=>a.team===p.team&&(a.y-p.y)*dir<=0).map(a=>a.id)};
    this.prepareHighKickoff(this.ball);
    this.guard=0;this.passCooldown=0;this.stats.kicks[p.team]++;
    this.selected=this.bestDefender()?.id??this.selected;
    this.emit('kick','CALCIO D’INIZIO!', 'INSEGUI E CONTENDI IL PALLONE');
  }
  nearest(team,point,exclude=-1){return this.players.filter(p=>p.team===team&&p.id!==exclude&&p.down<=0).sort((a,b)=>distance(a,point)-distance(b,point))[0]||this.players[team*7];}
  target(aim=this.aim){
    const c=this.carrier,d=this.dir(c.team),len=Math.hypot(aim.x||0,aim.y||0);
    const ax=len?(aim.x||0)/len:0,ay=len?(aim.y||0)/len:0;
    const directed=len>.25&&(Math.abs(ax)>.35||ay*d<0);
    const side=directed&&Math.abs(ax)>.35?Math.sign(ax):0;
    const options=this.players.filter(p=>p.team===c.team&&p.id!==c.id&&p.down<=0&&(p.y-c.y)*d<=0&&distance(p,c)<320&&(!side||(p.x-c.x)*side>4));
    const alignment=p=>((p.x-c.x)*ax+(p.y-c.y)*ay)/Math.max(1,distance(p,c));
    const value=p=>this.passValue(p,c)+(directed?260*alignment(p):-distance(p,c)*.16)+(this.loopPoint(p,c)?18:0);
    options.sort((a,b)=>value(b)-value(a)||a.id-b.id);
    let chosen=options[0];const old=this.passSelection;
    // Modest hysteresis absorbs thumb jitter, but never keeps an illegal/wrong-side target.
    if(chosen&&old&&old.carrier===c.id&&old.directed===directed&&old.side===side&&(!directed||old.ax*ax+old.ay*ay>.96)){
      const previous=options.find(p=>p.id===old.id);
      if(previous&&value(chosen)-value(previous)<14)chosen=previous;
    }
    this.passSelection=chosen?{carrier:c.id,id:chosen.id,directed,side,ax,ay}:null;
    return chosen||null;
  }
  loopPoint(p,c){
    const run=this.loopRun;
    if(!run||this.elapsed>=run.until||run.from!==p.id||run.to!==c.id||p.down>0||
      this.possession!==run.team||this.loose||!['live','contact'].includes(this.phase))return null;
    return {x:clamp(c.x+run.side*55*(FIELD.width/600),FIELD.left+16,FIELD.right-16),
      y:clamp(c.y-this.dir(c.team)*28*(FIELD.height/1100),FIELD.top-22,FIELD.bottom+22)};
  }
  supportPoint(p,c){
    const loop=this.loopPoint(p,c);if(loop){p.supportRole='loop';return loop;}
    if(!this.attackPlan||this.attackPlan.carrier!==c.id){
      // Keep left/right roles stable until possession changes hands, avoiding crossed runs.
      const ids=this.players.filter(q=>q.team===c.team&&q.id!==c.id).sort((a,b)=>a.x-b.x||a.id-b.id).map(q=>q.id);
      this.attackPlan={carrier:c.id,ids};
    }
    if(p.supportCarrier===c.id&&p.supportUntil>this.elapsed)return p.support;
    const rank=this.attackPlan.ids.indexOf(p.id),dir=this.dir(c.team);
    // Fan back into the pitch near touch instead of clamping several runners together.
    const sx=FIELD.width/600,sy=FIELD.height/1100;
    const leftRoom=c.x-(FIELD.left+14),rightRoom=FIELD.right-14-c.x;
    const edge=clamp((150*sx-Math.min(leftRoom,rightRoom))/(150*sx),0,1);
    const inside=leftRoom<rightRoom?1:-1;
    const central=[-194,-106,-48,48,106,194].map(v=>v*sx);
    const flank=(inside>0?[20,65,115,165,225,285]:[-285,-225,-165,-115,-65,-20]).map(v=>v*sx);
    const lanes=central.map((x,i)=>x*(1-edge)+flank[i]*edge);
    const proximity=lanes.map((x,i)=>i).sort((a,b)=>Math.abs(lanes[a])-Math.abs(lanes[b])||a-b);
    const close=proximity.slice(0,2).includes(rank),wide=proximity.slice(4).includes(rank);
    const opponents=this.players.filter(q=>q.team!==p.team&&q.down<=0);
    const beaten=opponents.filter(q=>(q.y-c.y)*dir<0).length;
    const ahead=opponents.filter(q=>(q.y-c.y)*dir>=0&&(q.y-c.y)*dir<150*(FIELD.height/1100)).length;
    const breakthrough=beaten>=3&&ahead<=1;
    // Close support follows a break for the offload; outside runners keep their width.
    const spread=lanes[rank]*(close&&breakthrough?.7:1);
    const depth=(close?(breakthrough?20:24):wide?48:34)*sy;
    // Each support lane has a distinct attacking intention: the close runner
    // bends into the nearest gap, the channel runner offers a return angle,
    // while the wide runner holds width for a genuine two-on-one.
    const role=close?'close':wide?'wide':'channel';
    const pressure=opponents.filter(q=>(q.y-c.y)*dir>=-20&&(q.y-c.y)*dir<125);
    const gapSide=pressure.length?pressure.reduce((best,q)=>Math.abs(q.x-c.x)<Math.abs(best-c.x)?q.x:best,c.x):c.x;
    const bend=role==='close'?clamp((c.x-gapSide)*.55,-34*sx,34*sx):role==='channel'?clamp((c.x-gapSide)*-.3,-22*sx,22*sx):0;
    const base=clamp(c.x+spread+bend+clamp(c.vx*.15,-10*sx,10*sx),FIELD.left+14,FIELD.right-14);
    const ty=clamp(c.y-dir*depth,FIELD.top-22,FIELD.bottom+22);
    let tx=base,best=-Infinity;
    for(const shift of (close?[-4,0,4]:[-10,0,10]).map(v=>v*sx)){
      const x=clamp(base+shift,FIELD.left+14,FIELD.right-14);
      const gap=Math.min(150*sx,...opponents.map(q=>Math.hypot(q.x-x,q.y-(ty+dir*55*sy))));
      const lane=this.laneClearance(c,{x,y:ty},opponents);
      const value=gap*.55+Math.min(lane,65*sx)*.7-Math.abs(shift)*.3;
      if(value>best){best=value;tx=x;}
    }
    p.supportRole=role;p.supportIntent=role==='close'?'gap':role==='wide'?'width':'return';
    p.supportCarrier=c.id;p.supportUntil=this.elapsed+.16;p.support={x:tx,y:ty};return p.support;
  }
  laneClearance(from,to,opponents=this.players.filter(p=>p.team!==from.team&&p.down<=0)){
    const dx=to.x-from.x,dy=to.y-from.y,l2=Math.max(1,dx*dx+dy*dy);
    let clearance=150;
    for(const p of opponents){const t=clamp(((p.x-from.x)*dx+(p.y-from.y)*dy)/l2,.12,.9);clearance=Math.min(clearance,Math.hypot(p.x-from.x-t*dx,p.y-from.y-t*dy));}
    return clearance;
  }
  defenseTargets(c){
    const old=this.defensePlan,eligible=this.players.filter(p=>p.team!==c.team&&p.down<=0);
    const anchor=eligible.find(p=>p.brace),anchorId=anchor?.id??-1;
    if(old&&old.anchorId===anchorId&&old.carrier===c.id&&old.until>this.elapsed&&eligible.some(p=>p.id===old.pressure))return old;
    const dir=this.dir(c.team),cost=p=>distance(p,c)+((p.y-c.y)*dir<0?18:0)+(p.slot===6?45*(FIELD.width/600):0);
    eligible.sort((a,b)=>cost(a)-cost(b));
    // The fullback always stays in the last line; never send the 15 to pressure.
    let pressure=eligible.find(p=>p.slot!==6)||eligible[0];
    const previous=eligible.find(p=>p.id===old?.pressure);
    if(previous&&pressure&&previous.slot!==6&&cost(previous)<cost(pressure)+14)pressure=previous;
    // A user-controlled defender only takes the pressure role when already close to the carrier.
    if(pressure?.team===0&&pressure.id===this.selected&&distance(pressure,c)>75)pressure=eligible.find(p=>p.id!==this.selected&&p.slot!==6)||pressure;
    if(anchor&&anchor.slot!==6)pressure=anchor;
    const remaining=eligible.filter(p=>p.id!==pressure?.id);
    // Preserve role lanes even when the attack bunches up or moves to touch.
    // Only the pressure defender leaves the line; 11/14 sit a step deeper, 15 sweeps.
    const cover=remaining.find(p=>p.slot===6)||[...remaining].sort((a,b)=>(b.y-a.y)*dir)[0];
    const markers=remaining.filter(p=>p.id!==cover?.id);
    const sx=FIELD.width/600,sy=FIELD.height/1100,centre=FIELD.width/2,shift=clamp((c.x-centre)*.12,-24*sx,24*sx);
    const lanes=[-38,38,-125,125,-300,300,0].map(v=>v*sx);
    const points=new Map();
    if(pressure)points.set(pressure.id,{x:c.x+clamp(c.vx*.18,-16,16),y:c.y+clamp(c.vy*.18,-16,16),role:'pressure'});
    if(cover)points.set(cover.id,{x:centre+(c.x-centre)*.35,y:c.y+dir*168*sy,role:'cover'});
    markers.forEach(p=>points.set(p.id,{
      x:centre+lanes[p.slot]+shift,
      y:c.y+dir*(p.slot===4||p.slot===5?74:38)*sy,role:'mark'
    }));
    for(const point of points.values()){point.x=clamp(point.x,FIELD.left+8,FIELD.right-8);point.y=clamp(point.y,FIELD.top-16,FIELD.bottom+16);}
    // A defender who has closed on the runner must finish that step before turning.
    for(const p of eligible)if(p.commitUntil>this.elapsed&&!(p.team===0&&p.id===this.selected)){
      points.set(p.id,{x:p.commitX,y:p.commitY,role:'committed'});
    }
    return this.defensePlan={carrier:c.id,anchorId,until:this.elapsed+.16,pressure:pressure?.id,points};
  }
  passValue(p,c){const threat=Math.min(150,...this.players.filter(a=>a.team!==p.team&&a.down<=0).map(a=>distance(a,p)));return threat*.7+Math.min(60,this.laneClearance(c,p))*.8-distance(p,c)*.15-Math.abs(p.y-c.y)*.23;}
  pass(aim=this.aim){
    if(this.kickAim){this.cancelKick();return false;}
    this.aim={x:aim.x||0,y:aim.y||0};
    if(this.state==='playing'&&this.phase==='contact')return this.possession===0?this.offload():false;
    if(this.state!=='playing'||this.phase!=='live')return false;
    if(this.loose){this.switchPlayer();return false;}
    if(this.possession!==0){this.switchPlayer();return false;}
    return this.throwBall();
  }
  offload(){
    if(this.state!=='playing'||this.phase!=='contact'||!this.contact)return false;
    const to=this.target(this.possession===0?this.aim:{x:0,y:0});if(!to)return false;
    const c=this.carrier,contact=this.contact;
    this.phase='live';this.passCooldown=0;
    if(!this.throwBall(to)){this.phase='contact';return false;}
    this.ball.offload=true;if(c.team===1)this.cpuOffloadAt=this.elapsed;c.down=.55;c.vx=c.vy=0;
    const defender=this.players[contact.defender];defender.down=.4;defender.dive=0;
    this.contact=null;this.emit('offload','OFFLOAD!','PALLA VIVA · CONTINUA L’AZIONE');return true;
  }
  throwBall(chosen=null){
    if(this.ball||this.passCooldown>0)return false;const to=chosen||this.target();if(!to){if(this.possession===0)this.emit('hint','ASPETTA IL SOSTEGNO','NESSUN PASSAGGIO INDIETRO');return false;}
    const passer=this.carrier,dir=this.dir(passer.team);
    const oneTwo=!!this.loopPoint(to,passer);
    this.loopRun=null;
    if(distance(passer,to)<=150){
      let side=Math.sign(to.x-passer.x)||1;
      if(to.x+side*55>FIELD.right-16||to.x+side*55<FIELD.left+16)side=-side;
      this.loopRun={from:passer.id,to:to.id,team:passer.team,side,until:this.elapsed+2.4};
    }
    for(const p of this.players)if(p.team!==passer.team&&p.down<=0&&distance(p,passer)<64&&
      (p.y-passer.y)*dir>-8&&Math.hypot(p.vx,p.vy)>20&&
      p.vx*(passer.x-p.x)+p.vy*(passer.y-p.y)>Math.hypot(p.vx,p.vy)*distance(p,passer)*.45&&
      !(p.team===0&&p.id===this.selected)){
      p.commitUntil=this.elapsed+.32;p.commitX=clamp(passer.x+passer.vx*.18,FIELD.left+8,FIELD.right-8);
      p.commitY=clamp(passer.y+passer.vy*.18,FIELD.top-16,FIELD.bottom+16);
    }
    this.defensePlan=null;
    const c=this.carrier;c.charge=0;this.ball={kind:'pass',oneTwo,x:c.x,y:c.y,sx:c.x,sy:c.y,tx:to.x,ty:to.y,to:to.id,from:c.id,t:0,duration:clamp(distance(c,to)/(430*c.nation.pass),.2,.52),team:c.team};for(const p of this.players)p.tackleWind=0;this.ball.runX=to.vx;this.ball.runY=Math.abs(to.vy)>8?to.vy:this.dir(c.team)*65;this.passCooldown=.18;this.emit('pass');return true;
  }
  canChase(p,b=this.ball){
    return b.kind==='fumble'||p.team!==b.team||b.eligible.includes(p.id)||(p.y-this.players[b.from].y)*this.dir(b.team)<=0;
  }
  canKick(kickoff=false){
    if(kickoff)return this.state==='playing'&&this.phase==='kickoff'&&!this.ball&&this.carrier.team===this.possession&&this.carrier.down<=0&&this.carrier.energy>=12;
    return this.state==='playing'&&this.phase==='live'&&!this.ball&&this.possession===0&&this.carrier.down<=0&&this.carrier.kickCd<=0&&this.carrier.energy>=12;
  }
  beginKick(aim={x:0,y:0}){
    const kickoff=this.phase==='kickoff';
    if((kickoff&&this.possession!==0)||!this.canKick(kickoff)||this.kickAim)return false;
    this.kickAim={from:this.carrierId,x:0,y:this.dir(this.carrier.team),elapsed:0,power:.25,kickoff};
    this.carrier.charge=this.carrier.burst=0;this.updateKickAim(0,aim);return true;
  }
  updateKickAim(dt,aim){
    const a=this.kickAim;if(!a)return;
    if(!this.canKick(a.kickoff)||a.from!==this.carrierId){this.cancelKick();return;}
    a.elapsed+=dt;a.power=clamp(.25+a.elapsed*.25,.25,1);
    const length=Math.hypot(aim.x||0,aim.y||0);
    if(length>.2){a.x=aim.x/length;a.y=aim.y/length;}
  }
  cancelKick(){this.kickAim=null;}
  releaseKick(){
    const a=this.kickAim;if(!a)return false;
    this.kickAim=null;if(a.from!==this.carrierId)return false;
    return this.kick({x:a.x,y:a.y},a.power,a.kickoff);
  }
  kickTarget(aim,power=.5){
    const p=this.carrier,kick=p.profile.kick*p.nation.kick*1.05;
    if(typeof aim==='number')return {tx:clamp(p.x+clamp(aim,-1,1)*150*kick,FIELD.left+12,FIELD.right-12),ty:clamp(p.y+this.dir(p.team)*252*kick,FIELD.top-12,FIELD.bottom+12)};
    // Retain the old pitch-length reference so the smaller field does not cancel the range bonus.
    const length=Math.hypot(aim.x,aim.y)||1,range=(aim.kickoff?110+clamp(power,0,1)*200:power<=.32?70+clamp(power,0,.32)*120:110+clamp(power,0,1)*200)*(1320/1100)*kick;
    const tx=clamp(p.x+aim.x/length*range,FIELD.left+12,FIELD.right-12);
    let ty=clamp(p.y+aim.y/length*range,FIELD.top-12,FIELD.bottom+12);
    if(aim.kickoff){const half=FIELD.height/2,minimum=71,dir=this.dir(p.team);ty=dir<0?Math.min(ty,half-minimum):Math.max(ty,half+minimum);}
    return {tx,ty};
  }
  kick(aim=0,power=.5,kickoff=false){
    if(!this.canKick(kickoff))return false;
    const p=this.carrier,dir=this.dir(p.team),{tx,ty}=this.kickTarget(kickoff?{...aim,kickoff:true}:aim,power);this.kickAim=null;
    this.spendEnergy(p,12);p.kickCd=1.2;p.kickAnim=.3;p.charge=0;p.burst=0;
    const grubber=!kickoff&&typeof aim!=='number'&&power<=.32;this.loopRun=null;
    this.ball={kind:'kick',kickoff,grubber,x:p.x,y:p.y,sx:p.x,sy:p.y,tx,ty,from:p.id,team:p.team,t:0,duration:clamp(distance(p,{x:tx,y:ty})/(grubber?245:200),grubber?.35:.55,1.2),groundTime:0,landed:false,bounceCount:0,eligible:this.players.filter(a=>a.team===p.team&&(a.y-p.y)*dir<=0).map(a=>a.id)};
    if(kickoff){this.prepareHighKickoff(this.ball,power);this.phase='live';}
    this.guard=0;this.stats.kicks[p.team]++;this.emit('kick',grubber?'RASOTERRA!':'CALCIO DIREZIONATO','INSEGUI LA PALLA');return true;
  }
  prepareHighKickoff(b,power=.5){
    b.grubber=false;b.apex=110+power*30;
    // Hang time lets legal chasers reach the landing area at ordinary running speed.
    b.duration=clamp(Math.hypot(b.tx-b.sx,b.ty-b.sy)/78+.7,2.5,5.5);
  }
  recoverKick(p){
    const previous=this.ball.team;for(const q of this.players)q.tackleWind=0;this.ball=null;this.carrierId=p.id;this.possession=p.team;if(p.team!==previous)this.tackles=0;
    this.selected=p.team===0?p.id:this.nearest(0,p).id;this.guard=.75;this.passCooldown=.12;p.charge=0;p.dive=0;
    this.emit('recovery',p.team===0?'PALLA RECUPERATA!':'PALLA · '+this.teams[1].name,p.team===0?'RIPARTI!':'TORNA IN DIFESA');
  }
  scatterKickBounce(b){
    // One random seed per ball; sample only on impact, never per frame.
    b.bounceSeed??=Math.floor(Math.random()*4294967296);
    b.bounceSeed=(Math.imul(b.bounceSeed,1664525)+1013904223)>>>0;
    const angle=b.bounceSeed/4294967296*Math.PI*2,speed=Math.hypot(b.vx,b.vy);
    b.vx=Math.cos(angle)*speed;b.vy=Math.sin(angle)*speed;
  }
  startKickBounce(b){
    b.landed=true;b.t=b.duration;b.groundTime=0;b.z=0;b.bounceCount=0;b.rotation=b.rotation||0;
    const speed=Math.hypot(b.tx-b.sx,b.ty-b.sy)/Math.max(.1,b.duration),factor=b.grubber?.68:.4;
    b.vx=(b.tx-b.sx)/Math.max(.1,b.duration)*factor;b.vy=(b.ty-b.sy)/Math.max(.1,b.duration)*factor;
    b.vz=b.grubber?Math.min(18,7+speed*.025):Math.min(58,20+speed*.1);
    this.scatterKickBounce(b);
  }
  stepKickBall(b,dt){
    // Small physics steps keep impact damping consistent across frame rates.
    while(dt>0&&!b.out){const h=Math.min(dt,1/120);this.integrateKickBall(b,h);b.out=this.ballOutside(b);dt-=h;}
  }
  integrateKickBall(b,dt){
    if(!b.landed){
      b.t+=dt;const ratio=clamp(b.t/b.duration,0,1);
      b.x=b.sx+(b.tx-b.sx)*ratio;b.y=b.sy+(b.ty-b.sy)*ratio;
      b.z=b.grubber?Math.sin(Math.min(1,ratio/.28)*Math.PI)*4:4*(b.apex||72)*ratio*(1-ratio);
      b.rotation=(b.rotation||0)+dt*9;
      if(ratio>=(b.grubber?.28:1))this.startKickBounce(b);
      return;
    }
    b.groundTime+=dt;b.vz-=180*dt;b.z=Math.max(0,b.z+b.vz*dt);
    const onGround=b.z===0;
    if(onGround&&b.vz< -8){
      b.vx*=.72;b.vy*=.72;this.scatterKickBounce(b);
      b.vz=-b.vz*(b.grubber?.25:.38);b.bounceCount++;
    }else if(onGround)b.vz=0;
    const drag=Math.exp(-(onGround?2.6:.16)*dt);b.vx*=drag;b.vy*=drag;
    if(Math.hypot(b.vx,b.vy)<3&&b.z<.5){b.vx=b.vy=b.vz=0;b.z=0;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    b.rotation=(b.rotation||0)+Math.hypot(b.vx,b.vy)*dt*.08;
  }
  ballOutside(b){
    return b.x<FIELD.left||b.x>FIELD.right||b.y<FIELD.inGoalTop||b.y>FIELD.inGoalBottom;
  }
  restartBallOut(b){
    // Arcade restart: the other team collects inside the pitch, without a lineout UI.
    const team=1-b.team;
    this.restart={team,x:clamp(b.x,FIELD.left+32,FIELD.right-32),y:clamp(b.y,FIELD.top+32,FIELD.bottom-32)};
    this.restart.receiver=this.nearest(team,this.restart).id;
    this.ball=null;this.contact=null;this.cancelKick();this.loopRun=null;this.tackles=0;
    this.possession=team;this.phase='ruck';this.phaseTime=.42;
    this.emit('out','PALLA FUORI','RIMESSA AUTOMATICA · '+this.teams[team].name);
  }

  bestDefender(){
    const focus=this.loose?{x:this.ball.landed?this.ball.x:this.ball.tx,y:this.ball.landed?this.ball.y:this.ball.ty,vx:0,vy:0}:this.ball?.kind==='pass'?this.players[this.ball.to]:this.carrier;
    const choices=this.players.filter(p=>p.team===0&&p.down<=0&&p.dive<=0&&(!this.loose||this.canChase(p)));
    const cost=p=>{
      if(this.loose)return distance(p,focus)/78;
      const vx=focus.vx||0,vy=focus.vy||0,speed=Math.hypot(vx,vy);
      let eta=Infinity;
      for(let t=0;t<=1.6;t+=.2){
        const point={x:clamp(focus.x+vx*t,FIELD.left+8,FIELD.right-8),y:clamp(focus.y+vy*t,FIELD.top-22,FIELD.bottom+22)};
        const gap=Math.max(0,distance(p,point)-18);
        if(gap<=78*t){eta=t;break;}
        eta=t+Math.max(0,gap-78*t)/78;
      }
      // A nearby chaser behind a fast carrier is less useful than cover ahead.
      const behind=speed>25&&((p.x-focus.x)*vx+(p.y-focus.y)*vy)<0;
      return eta+(behind?.4:0)+(p.cd>0?.12:0);
    };
    const ranked=choices.map(p=>({p,cost:cost(p)})).sort((a,b)=>a.cost-b.cost||a.p.id-b.p.id);
    const best=ranked[0],current=ranked.find(a=>a.p.id===this.selected);
    return current&&best&&current.cost<=best.cost+.08?current.p:best?.p||null;
  }
  switchPlayer(){
    if(this.state!=='playing'||this.phase!=='live'||(!this.loose&&this.possession===0))return;
    const focus=this.loose?{x:this.ball.landed?this.ball.x:this.ball.tx,y:this.ball.landed?this.ball.y:this.ball.ty,vx:0,vy:0}:this.ball?.kind==='pass'?this.players[this.ball.to]:this.carrier;
    const allChoices=this.players.filter(p=>p.team===0&&p.down<=0&&p.dive<=0&&(!this.loose||this.canChase(p)));
    if(!allChoices.length)return;
    const cost=p=>{
      if(this.loose)return distance(p,focus)/78;
      const vx=focus.vx||0,vy=focus.vy||0;
      let eta=Infinity;
      for(let t=0;t<=1.6;t+=.2){const point={x:clamp(focus.x+vx*t,FIELD.left+8,FIELD.right-8),y:clamp(focus.y+vy*t,FIELD.top-22,FIELD.bottom+22)};const gap=Math.max(0,distance(p,point)-18);if(gap<=78*t){eta=t;break;}eta=t+Math.max(0,gap-78*t)/78;}
      const behind=Math.hypot(vx,vy)>25&&((p.x-focus.x)*vx+(p.y-focus.y)*vy)<0;
      return eta+(behind?.4:0)+(p.cd>0?.12:0);
    };
    const ranked=allChoices.map(p=>({p,c:cost(p)})).sort((a,b)=>a.c-b.c||a.p.id-b.p.id);
    const best=ranked[0];
    // If a better player exists (ignoring the old 0.08 hysteresis), switch to them.
    if(best.p.id!==this.selected){this.selected=best.p.id;this.defensePlan=null;return;}
    // Repeated taps keep the useful cover instead of rotating to a nearby
    // teammate after the formation has compressed around the carrier.
  }
  contestWindow(p=this.controlled){
    const b=this.ball;
    if(this.state!=='playing'||this.phase!=='live'||b?.kind!=='kick'||b.grubber||b.landed||b.out)return false;
    const remaining=b.duration-b.t;
    return b.t>b.duration*.5&&remaining<=.65&&remaining>.04&&this.canChase(p)&&distance(p,{x:b.tx,y:b.ty})<48;
  }
  canContest(p=this.controlled){return this.contestWindow(p)&&p.down<=0&&p.dive<=0&&p.cd<=0&&p.jump<=0&&p.energy>=8;}
  contest(p=this.controlled){
    if(!this.canContest(p))return false;
    const remaining=this.ball.duration-this.ball.t;
    p.jump=.6;p.jumpQuality=clamp(1-Math.abs(remaining-.35)/.3,0,1);p.cd=1;p.burst=0;
    this.spendEnergy(p,8);
    if(p.team===0)this.emit('contest','CONTENDI!',p.jumpQuality>.65?'BUON TEMPO':'CERCA LA PALLA');
    return true;
  }
  beginSpecial(input={x:0,y:0}){
    if(this.defenseGesture)return;
    if(this.state==='playing'&&this.phase==='live'&&this.possession===1&&!this.ball){
      this.defenseGesture={id:this.selected,carrier:this.carrierId,at:this.elapsed};
    }else this.special(input);
  }
  releaseSpecial(cancel=false){
    const gesture=this.defenseGesture;this.defenseGesture=null;
    for(const p of this.players)p.brace=false;
    if(!cancel&&gesture&&gesture.id===this.selected&&gesture.carrier===this.carrierId&&
      this.possession===1&&!this.ball&&this.elapsed-gesture.at<.18)this.special();
  }
  special(input={x:0,y:0}){
    if(this.kickAim)return;
    if(this.state!=='playing'||this.phase!=='live')return;
    const p=this.controlled;if(p.cd>0||p.down>0)return;
    if(this.contestWindow(p)){this.contest(p);return;}
    if(this.loose){if(p.energy>=12){this.spendEnergy(p,12);p.burst=.4;p.cd=.6;this.emit('sprint');}return;}
    if(this.ball)return;
    if(this.possession===0){
      this.attackAction(p,input);
    }else{
      if(p.energy<12){this.emit('hint','RIPRENDI FIATO','IL PLACCAGGIO A CONTATTO RESTA ATTIVO');return;}p.dominantAttempt=p.profile===PROFILES.powerful&&p.energy>=35&&this.elapsed>=p.dominantReadyAt;this.spendEnergy(p,12);p.cd=.9;const c=this.carrier,len=distance(p,c)||1;
      p.diveX=(c.x-p.x)/len;p.diveY=(c.y-p.y)/len;p.dive=.22*p.profile.tackle*p.nation.tackle;this.emit('dive');
    }
  }
  attackAction(p,input){
    if(p.cd>0||p.down>0||p.charge>0||p.evade>0)return false;
      if(Math.abs(input.x||0)>.55&&Math.abs(input.x)>Math.abs(input.y||0)*1.25){
        if(p.energy<18)return false;
        p.evade=.22;p.chargeX=Math.sign(input.x);p.chargeY=this.dir(p.team)*.28;
        p.charge=0;p.burst=0;p.cd=.85;this.spendEnergy(p,18);this.emit('sidestep');return true;
      }
      if(p.energy<36){if(p.team===0)this.emit('hint','RIPRENDI FIATO','SERVE ENERGIA PER SFONDARE');return false;}
      let dx=input.x||0,dy=input.y||0;
      if(Math.hypot(dx,dy)<.15){dx=p.vx;dy=p.vy;if(Math.hypot(dx,dy)<6){dx=0;dy=this.dir(p.team);}}
      const len=Math.hypot(dx,dy)||1;p.chargeX=dx/len;p.chargeY=dy/len;p.charge=(.28+.20*clamp((p.energy-36)/30,0,1))*p.profile.charge*p.nation.charge;p.burst=.4;this.spendEnergy(p,36);p.cd=1.25;this.emit('charge');return true;
  }
  tackle(defender,manual=false,finalize=false){
    if(this.phase!=='live'||this.ball||this.guard>0)return;
    this.cancelKick();
    const c=this.carrier;
    if(!finalize&&!manual)this.spendEnergy(defender,12);
    const d=distance(c,defender)||1,front=((defender.x-c.x)*c.chargeX+(defender.y-c.y)*c.chargeY)/d;
    if(c.charge>0&&front>.2&&defender.brace){
      c.charge=0;c.burst=0;c.vx=c.vy=0;
      this.emit('block','SFONDAMENTO FERMATO','DIFESA IN CONTENIMENTO');
    }
    if(c.charge>0&&front>.2){
      c.charge=0;c.burst=.25;defender.down=.85;defender.dive=0;defender.vx=defender.vy=0;
      defender.x=clamp(defender.x+c.chargeX*10,FIELD.left+8,FIELD.right-8);defender.y=clamp(defender.y+c.chargeY*10,FIELD.top-22,FIELD.bottom+22);
      this.guard=.12;this.stats.breaks[c.team]++;this.scatter(c.x,c.y,'#f4c36c',16);this.emit('break','SFONDAMENTO!','PLACCAGGIO ROTTO');return;
    }
    const dominant=manual&&!finalize&&defender.dive>0&&defender.dominantAttempt&&
      defender.profile===PROFILES.powerful&&this.elapsed>=defender.dominantReadyAt&&defender.energy>=13&&d<23;
    defender.dominantAttempt=false;
    const speed=Math.hypot(c.vx,c.vy),fx=speed>8?c.vx/speed:0,fy=speed>8?c.vy/speed:this.dir(c.team);
    const headOn=((defender.x-c.x)*fx+(defender.y-c.y)*fy)/d;
    const aligned=((c.x-defender.x)*defender.diveX+(c.y-defender.y)*defender.diveY)/d;
    if(dominant&&headOn>.8&&aligned>.9){this.dominantTackle(defender);return;}
    if(!finalize&&this.target({x:0,y:0})){
      this.contact={defender:defender.id,manual,remaining:.34,duration:.34};this.phase='contact';
      c.vx=c.vy=0;c.charge=c.burst=0;defender.dive=0;defender.vx=defender.vy=0;
      this.emit('contact');return;
    }
    this.contact=null;
    c.down=.9;c.charge=0;defender.down=.5;defender.dive=0;this.stats.tackles[defender.team]++;this.tackles++;
    this.scatter(c.x,c.y,'#e4d9a6',10);this.emit('tackle',manual?'BEL PLACCAGGIO!':'PLACCAGGIO',this.tackles+' / 3');
    this.restart={team:c.team,x:c.x,y:clamp(c.y,FIELD.top+32,FIELD.bottom-32)};
    if(this.tackles>=3&&this.scrumsEnabled){this.beginScrum(1-c.team);return;}
    if(this.tackles>=3){this.restart.team=1-c.team;this.tackles=0;this.emit('turnover','CAMBIO POSSESSO','PALLA · '+this.teams[this.restart.team].name);}
    this.phase='ruck';this.phaseTime=.42;this.restart.receiver=this.nearest(this.restart.team,this.restart,c.id).id;
  }
  perfectTackleReady(){
    const p=this.controlled,c=this.carrier;
    if(this.state!=='playing'||this.phase!=='live'||this.possession!==1||this.ball||this.guard>0||
      p.profile!==PROFILES.powerful||p.energy<35||p.cd>0||p.down>0||p.dive>0||p.brace||
      this.elapsed<p.dominantReadyAt||c.charge>0)return false;
    const gap=distance(p,c),speed=Math.hypot(c.vx,c.vy);
    const fx=speed>8?c.vx/speed:0,fy=speed>8?c.vy/speed:this.dir(c.team);
    return gap>=18&&gap<=48&&((p.x-c.x)*fx+(p.y-c.y)*fy)/gap>.85;
  }
  dominantTackle(defender){
    const c=this.carrier,sx=c.x,sy=c.y,dx=defender.diveX,dy=defender.diveY;
    this.spendEnergy(defender,13);defender.dominantReadyAt=this.elapsed+6;
    c.x=clamp(c.x+dx*10,FIELD.left+8,FIELD.right-8);c.y=clamp(c.y+dy*10,FIELD.top-22,FIELD.bottom+22);
    c.down=.85;c.charge=c.burst=c.evade=0;c.vx=c.vy=c.moveSpeed=0;
    defender.down=.55;defender.dive=0;defender.vx=defender.vy=defender.moveSpeed=0;
    this.contact=null;this.defenseGesture=null;this.passSelection=null;this.attackPlan=this.defensePlan=null;
    this.stats.tackles[defender.team]++;this.tackles++;this.guard=0;this.passCooldown=0;
    this.ball={kind:'fumble',x:sx,y:sy,sx,sy,tx:clamp(sx+dx*34,FIELD.left+12,FIELD.right-12),
      ty:clamp(sy+dy*34,FIELD.top-12,FIELD.bottom+12),from:c.id,team:c.team,t:0,duration:.32,groundTime:0};
    this.selected=this.bestDefender()?.id??defender.id;
    this.perfectImpact={x:sx,y:sy,remaining:.5,freeze:.065};
    this.scatter(sx,sy,'#f4c36c',24);this.emit('perfectTackle','PLACCAGGIO PERFETTO!','PALLONE LIBERO · RECUPERA');
  }
  // Recover at the tackle without resetting either team's formation.
  stepRecovery(dt){
    const r=this.restart,receiver=this.players[r.receiver];
    for(const p of this.players){
      p.px=p.x;p.py=p.y;p.down=Math.max(0,p.down-dt);p.cd=Math.max(0,p.cd-dt);
      if(p.down>0){p.vx=p.vy=0;p.moveSpeed=0;continue;}
      let target;
      if(p===receiver)target=r;
      else if(p.team===r.team)target=this.supportPoint(p,receiver);
      else target={x:p.x,y:r.y+this.dir(r.team)*48};
      const d=distance(p,target),speed=Math.min(p===receiver?150:65,d/Math.max(dt,.001));
      p.vx=d>1?(target.x-p.x)/d*speed:0;p.vy=d>1?(target.y-p.y)/d*speed:0;
      p.x=clamp(p.x+p.vx*dt,FIELD.left+8,FIELD.right-8);p.y=clamp(p.y+p.vy*dt,FIELD.inGoalTop+8,FIELD.inGoalBottom-8);
      p.moveSpeed=dt>0?Math.hypot(p.x-p.px,p.y-p.py)/dt:0;p.anim+=Math.hypot(p.vx,p.vy)*dt*.11;
    }
    this.phaseTime-=dt;
    if(this.phaseTime<=0&&distance(receiver,r)<12){
      this.carrierId=receiver.id;this.possession=r.team;this.ball=null;this.contact=null;
      this.selected=r.team===0?receiver.id:this.nearest(0,receiver).id;
      this.attackPlan=this.defensePlan=null;this.guard=.55;this.passCooldown=0;this.phase='live';
      if(this.time<=0)this.endHalf();
    }
  }
  beginScrum(feed){
    this.cancelKick();
    const c=this.carrier,x=clamp(c.x,120,360),y=clamp(c.y,175,705);
    this.phase='scrum';this.ball=null;this.contact=null;this.tackles=0;
    this.scrum={x,y,feed,started:false,elapsed:0,intro:.4,duration:4.4,balance:feed===0?.68:.32,side:1,needle:0,sweep:0,speed:.72,lastDuelAt:-1,lastAction:'',lastActionAt:-1};
    for(const p of this.players){p.down=p.charge=p.dive=p.burst=0;p.vx=p.vy=0;p.px=p.x;p.py=p.y;}
    this.emit('scrumStart');
  }
  stepScrum(dt,input){
    const s=this.scrum,waiting=s.feed===0&&!s.started;
    if(!waiting)s.elapsed+=dt;
    const duelElapsed=Math.max(0,s.elapsed-s.intro);
    s.speed=.72+duelElapsed*.08;
    if(duelElapsed>0)s.sweep+=s.speed*dt;
    s.needle=1-Math.abs(1-s.sweep%2);
    if(s.feed===0&&Math.abs(input.x||0)>.25)s.side=Math.sign(input.x);
    const cpu={easy:.08,normal:.10,hard:.12}[this.difficulty]||.1;
    if(!waiting)s.balance=clamp(s.balance-cpu*this.teams[1].stats.scrum*(2/s.duration)*dt,.02,.98);
    const displacement=(s.balance-.5)*24;
    for(const p of this.players){
      p.px=p.x;p.py=p.y;const d=this.dir(p.team),pack=p.slot<3;
      const tx=clamp(s.x+(pack?(p.slot-1)*17:([0,0,0,-85,85,-140,140][p.slot])),FIELD.left+8,FIELD.right-8);
      const ty=clamp(s.y-d*(pack?13:65+(p.slot-3)*12)+displacement*this.dir(0),FIELD.top+10,FIELD.bottom-10);
      const blend=1-Math.exp(-dt*9);p.x+=(tx-p.x)*blend;p.y+=(ty-p.y)*blend;
      p.vx=(p.x-p.px)/dt;p.vy=(p.y-p.py)/dt;p.moveSpeed=dt>0?Math.hypot(p.x-p.px,p.y-p.py)/dt:0;p.anim+=Math.hypot(p.vx,p.vy)*dt*.11;
      p.facing=d;
    }
    if(s.elapsed>=s.duration){
      const team=s.balance>=.5?0:1,side=team===0?s.side:(this.players.filter(p=>p.team===0).reduce((sum,p)=>sum+p.x,0)/7>s.x?-1:1);
      // Release from the pack to the actual receiver on the selected side.
      // Keep every player in place instead of resetting both formations.
      const from=this.players[team*7],receiver=this.players[team*7+(side<0?3:4)];
      this.stats.scrums[team]++;this.scrum=null;this.phase='live';this.possession=team;
      this.carrierId=from.id;this.selected=team===0?receiver.id:this.nearest(0,receiver).id;
      this.attackPlan=this.defensePlan=this.passSelection=null;this.passCooldown=.15;this.guard=.6;
      for(const p of this.players){p.tackleWind=0;p.brace=false;p.vx=p.vy=0;}
      this.ball={kind:'pass',scrumExit:true,side,x:from.x,y:from.y,sx:from.x,sy:from.y,
        tx:receiver.x,ty:receiver.y,to:receiver.id,from:from.id,t:0,duration:.42,
        team,runX:0,runY:0};
      this.emit('scrumEnd',team===0?'MISCHIA VINTA!':'PALLA · '+this.teams[1].name,team===0?(side<0?'ESCI A SINISTRA':'ESCI A DESTRA'):'TORNA IN DIFESA');
      if(this.time<=0)this.endHalf();
    }
  }
  scrumAction(){
    const s=this.scrum;
    if(this.state!=='playing'||this.phase!=='scrum'||!s||s.feed!==0)return false;
    if(!s.started){s.started=true;return true;}
    if(s.elapsed<s.intro||s.elapsed-s.lastDuelAt<.28)return false;
    s.lastDuelAt=s.elapsed;
    const success=s.needle>=.38&&s.needle<=.62,pack=this.players.slice(0,3);
    const strength=pack.reduce((sum,p)=>sum+clamp(p.energy/p.profile.stamina,0,1),0)/3*this.teams[0].stats.scrum;
    s.balance=clamp(s.balance+(success?.22:-.1)*strength,.02,.98);
    for(const p of pack)this.spendEnergy(p,success?4:2);
    s.lastAction=success?'win':'miss';s.lastActionAt=s.elapsed;
    this.emit(success?'scrumWin':'scrumMiss',success?'SPINTA!':'FUORI TEMPO',success?'DUELLO VINTO':'RIPROVA NEL VERDE');
    return success;
  }
  // Presentation only: no speed bonus or change to collision/possession rules.
  breakawayIntensity(){
    if(this.state!=='playing'||this.phase!=='live'||this.ball||this.kickAim)return 0;
    const c=this.carrier,dir=this.dir(c.team);
    if(c.down>0||c.vy*dir<35)return 0;
    const defenders=this.players.filter(p=>p.team!==c.team);
    const beaten=defenders.filter(p=>(p.y-c.y)*dir<-12).length;
    const cover=defenders.filter(p=>p.down<=0&&(p.y-c.y)*dir>=-12).length;
    if(beaten<5||cover>1)return 0;
    const remaining=dir<0?c.y-FIELD.top:FIELD.bottom-c.y;
    return .25+.75*clamp(1-remaining/300,0,1);
  }
  tryScored(team){
    if(this.phase!=='live')return;
    this.cancelKick();
    this.trySpot={x:this.carrier.x,team};
    this.score[team]+=5;this.stats.tries[team]++;this.phase='try';this.phaseTime=2.2;this.nextTeam=1-team;this.tackles=0;this.ball=null;this.scatter(this.carrier.x,this.carrier.y,team===0?'#b9dafa':'#d3edab',36);this.emit('try','META '+this.teams[team].name+'!','+5 PUNTI');
  }
  beginConversion(){
    this.cancelKick();
    const {team,x}=this.trySpot,angle=Math.abs(x-FIELD.width/2)/((FIELD.right-FIELD.left)/2);
    this.phase='conversion';this.ball=null;
    this.conversion={team,x,stage:'power',elapsed:0,sweep:0,speed:.72,power:0,accuracy:0,powerLocked:null,accuracyLocked:null,minPower:.58+angle*.12,greenHalf:clamp(.135-angle*.045,.09,.135),flightTime:0,flightDuration:1.65,error:0,crossHeight:0,scored:false,reason:'',resultTime:0,awarded:false};
    this.stats.conversionAttempts[team]++;
    for(const p of this.players){p.vx=p.vy=0;p.charge=p.dive=p.burst=0;}
    this.emit('conversionStart');
  }
  conversionAction(){
    const c=this.conversion;
    if(this.state!=='playing'||this.phase!=='conversion'||!c||c.team!==0||c.elapsed<.18)return false;
    if(c.stage==='power'){this.lockPower();return true;}
    if(c.stage==='accuracy'){this.launchConversion();return true;}
    return false;
  }
  lockPower(){
    const c=this.conversion;c.powerLocked=c.power;c.greenHalf/=1+Math.max(0,c.powerLocked-.88)*2;c.stage='accuracy';c.elapsed=0;c.sweep=0;c.accuracy=0;c.speed=.82;this.emit('powerLocked');
  }
  launchConversion(){
    const c=this.conversion;c.accuracyLocked=c.accuracy;
    c.error=(c.accuracyLocked-.5)/c.greenHalf;
    c.crossHeight=Math.max(0,30+(c.powerLocked-c.minPower)*120);
    c.scored=c.powerLocked>=c.minPower&&Math.abs(c.error)<=1;
    c.reason=c.powerLocked<c.minPower?'TIRO CORTO':c.error<-1?'FUORI A SINISTRA':c.error>1?'FUORI A DESTRA':'TRA I PALI!';
    c.stage='flight';c.elapsed=0;c.flightTime=0;this.emit('conversionKick');
  }
  resolveConversion(timeout=false){
    const c=this.conversion;if(c.stage==='result')return;
    if(timeout){c.scored=false;c.reason='TEMPO SCADUTO';}
    if(c.scored&&!c.awarded){this.score[c.team]+=2;this.stats.conversions[c.team]++;c.awarded=true;}
    c.stage='result';c.resultTime=1.8;this.emit(c.scored?'conversionGood':'conversionMiss');
  }
  stepConversion(dt){
    const c=this.conversion;
    if(c.stage==='result'){
      c.resultTime-=dt;if(c.resultTime>0)return;
      this.conversion=null;this.phase='live';this.emit('conversionEnd');
      if(this.time<=0){this.endHalf();return;}
      this.lineup(this.nextTeam);
      if(this.nextTeam===0){this.phase='kickoff';this.phaseTime=0;this.emit('kickoff','TOCCA A TE','TIENI CALCIA · MIRA E RILASCIA');}
      else this.launchKickoff();
      return;
    }
    if(c.stage==='flight'){
      c.flightTime+=dt;
      if(c.flightTime>=c.flightDuration)this.resolveConversion();
      return;
    }
    c.elapsed+=dt;c.speed=c.stage==='power'?.72+c.elapsed*.08:.82+c.elapsed*.24;
    c.sweep+=c.speed*dt;const value=1-Math.abs(1-c.sweep%2);
    if(c.stage==='power')c.power=value;else c.accuracy=value;
    // The CPU takes its own conversion; player inputs never choose its shot.
    if(c.team===1){
      const n=this.stats.conversionAttempts[1]+this.half,level={easy:1.45,normal:1.1,hard:.72}[this.difficulty]||1.1;
      if(c.stage==='power'&&c.elapsed>=.9){c.power=clamp(.77+Math.sin(n*2.3)*.11,.55,.94);this.lockPower();}
      else if(c.stage==='accuracy'&&c.elapsed>=1.2){c.accuracy=clamp(.5+Math.sin(n*1.9)*c.greenHalf*level,0,1);this.launchConversion();}
    }else if(c.elapsed>=12)this.resolveConversion(true);
  }
  scatter(x,y,color,n){for(let i=0;i<n;i++)this.particles.push({x,y,vx:Math.sin(i*2.4)*60,vy:Math.cos(i*2.4)*60,life:.4+(i%5)*.15,color});}
  endHalf(){
    this.cancelKick();
    if(this.half===1){this.phase='halftime';this.phaseTime=3;this.emit('halftime','CAMBIO CAMPO','INTERVALLO · SECONDO TEMPO');}
    else{this.state='finished';this.emit('end');}
  }
  step(dt,input={x:0,y:0,sprint:false}){
    if(this.state!=='playing')return;
    if(this.perfectImpact){
      const impact=this.perfectImpact;
      impact.remaining=Math.max(0,impact.remaining-dt);
      const frozen=Math.min(dt,impact.freeze);impact.freeze-=frozen;dt-=frozen;
      if(impact.remaining<=0)this.perfectImpact=null;
      if(dt<=0)return;
    }
    const realDt=dt;
    const gesture=this.defenseGesture;
    const holding=this.phase==='live'&&this.possession===1&&!this.ball&&input.sprint&&
      gesture&&gesture.id===this.selected&&gesture.carrier===this.carrierId;
    if(gesture&&!holding)this.releaseSpecial(true);
    for(const p of this.players)p.brace=!!(holding&&p.id===this.selected&&
      this.elapsed-gesture.at>=.18&&p.down<=0&&p.dive<=0&&p.cd<=0&&p.energy>=8);

    // World and clock slow together; aiming input and power use real time.
    if(this.phase==='live'&&this.kickAim)dt*=.35;
    else if(this.contestWindow())dt*=.7;
    if(this.controlled.jump>0)input={...input,sprint:false};
    this.recoverEnergy(dt,input);
    this.elapsed+=dt;
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<0)this.particles.splice(i,1);}
    this.aim={x:input.x||0,y:input.y||0};
    if(this.phase==='contact'){
      this.time=Math.max(0,this.time-dt);
      const contact=this.contact;contact.remaining-=dt;
      if(this.possession===1&&contact.remaining<.16&&contact.remaining>0){
        const to=this.target({x:0,y:0});
        if(to&&this.elapsed-this.cpuOffloadAt>4&&this.passValue(to,this.carrier)>20&&this.offload())return;
      }
      if(contact.remaining<=0){this.phase='live';this.guard=0;this.tackle(this.players[contact.defender],contact.manual,true);}
      return;
    }
    if(this.phase==='ruck'){this.time=Math.max(0,this.time-dt);this.stepRecovery(dt);return;}
    if(this.phase==='scrum'){this.stepScrum(dt,input);return;}
    if(this.phase==='conversion'){this.stepConversion(dt);return;}
    if(this.phase==='kickoff'&&this.possession===0){if(this.kickAim)this.updateKickAim(realDt,input);return;}
    if(this.phase!=='live'){
      this.phaseTime-=dt;if(this.phaseTime>0)return;
      
      if(this.phase==='try'){this.beginConversion();return;}
      if(this.phase==='kickoff'){this.launchKickoff();return;}
      if(this.phase==='halftime'){this.half=2;this.time=this.seconds;this.attackDir=1;this.tackles=0;this.lineup(1);this.phase='kickoff';this.phaseTime=2.1;this.emit('kickoff','SECONDO TEMPO','ORA ATTACCHI VERSO IL BASSO');return;}
      this.phase='live';return;
    }
    this.time=Math.max(0,this.time-dt);if(this.time<=0){this.endHalf();return;}
    if(!this.loose)this.stats.possession[this.possession]+=dt;this.guard=Math.max(0,this.guard-dt);this.passCooldown=Math.max(0,this.passCooldown-dt);this.cpuThink-=dt;
    this.updateKickAim(realDt,input);
    const carrier=this.carrier;const defenders=this.players.filter(p=>p.team!==this.possession).sort((a,b)=>distance(a,carrier)-distance(b,carrier));
    if(this.possession===0&&!this.ball)this.selected=this.carrierId;
    const focus=this.ball?.kind==='pass'?this.players[this.ball.to]:carrier;
    const defense=this.loose?null:this.defenseTargets(focus);
    const landing=this.loose?(this.ball.landed?{x:this.ball.x,y:this.ball.y}:{x:this.ball.tx,y:this.ball.ty}):null;
    const chasers=landing?[0,1].map(team=>this.players.filter(p=>p.team===team&&p.down<=0&&this.canChase(p)).sort((a,b)=>distance(a,landing)-distance(b,landing))):null;
    for(const p of this.players){p.px=p.x;p.py=p.y;p.jump=Math.max(0,p.jump-dt);p.cd=Math.max(0,p.cd-dt);p.down=Math.max(0,p.down-dt);p.burst=Math.max(0,p.burst-dt);p.charge=Math.max(0,p.charge-dt);p.kickAnim=Math.max(0,p.kickAnim-dt);p.kickCd=Math.max(0,p.kickCd-dt);p.evade=Math.max(0,p.evade-dt);
      const wasDiving=p.dive>0;p.dive=Math.max(0,p.dive-dt);if(wasDiving&&p.dive===0){p.dominantAttempt=false;p.down=.25;this.emit('miss');}
      if(p.down>0){p.vx=p.vy=0;p.moveSpeed=0;continue;}
      if(p.team===1&&this.canContest(p)&&this.ball.duration-this.ball.t<=.35)this.contest(p);
      let dx=0,dy=0,speed=p.team===0?(p.id===this.selected?78:65):this.aiSpeed;
      if(p.dive>0){dx=p.diveX;dy=p.diveY;speed=210;
      }else if(p.evade>0&&!this.ball){dx=p.chargeX;dy=p.chargeY;speed=150*p.profile.agility*p.nation.agility;
      }else if(this.ball?.kind==='pass'&&p.id===this.ball.to){
        dx=this.ball.runX;dy=this.ball.runY;const run=Math.hypot(dx,dy)||1;dx/=run;dy/=run;speed=78;
      }else if(p.id===this.selected&&!(this.ball?.kickoff&&!this.ball.landed&&Math.hypot(input.x||0,input.y||0)<.1&&chasers[p.team].indexOf(p)>=0&&chasers[p.team].indexOf(p)<2)){dx=input.x||0;dy=input.y||0;if(p.charge>0&&!this.ball){dx=p.chargeX;dy=p.chargeY;}const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}if((this.possession===0||this.loose)&&input.sprint&&!p.exhausted&&p.energy>1&&(dx||dy)){speed*=p.profile.sprint;this.spendEnergy(p,dt*28.8*(1+.25*clamp(p.runLoad/8,0,1)));}if(p.burst>0&&(this.possession===0||this.loose))speed*=1.4;
      }else if(p.id===this.carrierId&&!this.ball){
        const dir=this.dir(p.team);let repel=0;
        for(const d of defenders){if(d.down>0)continue;const ahead=(d.y-p.y)*dir;if(ahead>-15&&ahead<110)repel+=(p.x>=d.x?1:-1)*Math.max(0,75-Math.abs(p.x-d.x))*.025;}
        dx=clamp(repel+(FIELD.width/2-p.x)*.002,-.75,.75);dy=dir;
        if(p.x<FIELD.left+26)dx=.8;if(p.x>FIELD.right-26)dx=-.8;
      }else{
        let tx,ty;const dir=this.dir(this.possession);
        if(landing){
          const rank=chasers[p.team].indexOf(p);
          if(rank<0){tx=p.x;ty=clamp(this.players[this.ball.from].y-this.dir(this.ball.team)*24,FIELD.top-12,FIELD.bottom+12);}
          else if(rank<2){tx=landing.x;ty=landing.y;speed=p.team===0?78:this.aiSpeed;}
          else{tx=clamp(landing.x+(p.slot%2?50:-50),FIELD.left+8,FIELD.right-8);ty=clamp(landing.y-this.dir(p.team)*(35+rank*12),FIELD.top+12,FIELD.bottom-12);}
        }else if(p.team===this.possession){
          if(this.ball&&p.id===this.ball.to){tx=this.ball.tx;ty=this.ball.ty;}
          else{const support=this.supportPoint(p,focus);tx=support.x;ty=support.y;speed=this.loopPoint(p,focus)?94:p.team===0?88:this.aiSpeed+5;}
        }else{
          const point=defense.points.get(p.id);
          tx=point?.x??p.x;ty=point?.y??p.y;
          p.defenseRole=point?.role||'recover';
          speed=p.team===0?76:this.aiSpeed*.95;

        }
        const dist=Math.hypot(tx-p.x,ty-p.y);if(dist>4){dx=(tx-p.x)/dist;dy=(ty-p.y)/dist;speed=Math.min(speed,dist*3);}
      }
      // A beaten defender on either team can recover ground by actively chasing.
      // Keep chase pace independent of stamina; leave attackers and loose-ball runs alone.
      const chaseDir=this.dir(this.possession),gapX=carrier.x-p.x,gapY=carrier.y-p.y;
      const chasing=!this.ball&&p.team!==this.possession&&gapY*chaseDir>8&&
        (dx*gapX+dy*gapY)>Math.hypot(gapX,gapY)*.5;
      if(chasing&&p.dive<=0&&!p.brace){
        speed=Math.max(speed,this.aiSpeed+(p.id===this.selected?10:4));
      }
      if(p.jump>0)speed*=.65;
      if(p.brace){speed*=.6;this.spendEnergy(p,dt*5);}
      if(p.tackleWind>0&&p.dive<=0&&!chasing)speed*=.45;
      // Carrying the ball costs a little pace for both teams. Dedicated dive
      // and sidestep moves keep their own short action speeds.
      if(!this.ball&&p.id===this.carrierId&&p.dive<=0&&p.evade<=0)speed*=CARRIER_PACE;
      const norm=Math.hypot(dx,dy);if(norm>1){dx/=norm;dy/=norm;}
      const blend=p.dive>0?1:1-Math.exp(-dt*18);p.vx+=(dx*speed-p.vx)*blend;p.vy+=(dy*speed-p.vy)*blend;
      p.x=clamp(p.x+p.vx*dt,FIELD.left+8,FIELD.right-8);p.y=clamp(p.y+p.vy*dt,FIELD.inGoalTop+8,FIELD.inGoalBottom-8);p.moveSpeed=dt>0?Math.hypot(p.x-p.px,p.y-p.py)/dt:0;p.anim+=Math.hypot(p.vx,p.vy)*dt*.11;if(Math.abs(p.vy)>3)p.facing=Math.sign(p.vy);
    }
    // Soft separation keeps support runners readable without a physics engine.
    for(let i=0;i<14;i++)for(let j=i+1;j<14;j++){const a=this.players[i],b=this.players[j];if(a.team!==b.team||a.down||b.down)continue;const d=distance(a,b);if(d<16&&d>.01){const n=(16-d)*.5,dx=(a.x-b.x)/d*n,dy=(a.y-b.y)/d*n;a.x=clamp(a.x+dx,FIELD.left+8,FIELD.right-8);b.x=clamp(b.x-dx,FIELD.left+8,FIELD.right-8);a.y=clamp(a.y+dy,FIELD.inGoalTop+8,FIELD.inGoalBottom-8);b.y=clamp(b.y-dy,FIELD.inGoalTop+8,FIELD.inGoalBottom-8);}}
    if(this.loose){
      const b=this.ball;
      if(b.out||this.ballOutside(b)){this.restartBallOut(b);return;}
      if(b.kind==='kick')this.stepKickBall(b,dt);
      else{b.t+=dt;const ratio=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*ratio;b.y=b.sy+(b.ty-b.sy)*ratio;if(ratio>=1)b.groundTime+=dt;}
      if(b.out||this.ballOutside(b)){this.restartBallOut(b);return;}
      const aerial=p=>!b.landed&&p.jump>=.2&&p.jump<=.52;
      const receiver=this.players.filter(p=>p.down<=0&&p.dive<=0&&this.canChase(p)&&
        (b.kind!=='kick'||(b.landed&&b.z<12)||(!b.landed&&b.t/b.duration>.5&&b.z<(aerial(p)?50:22)))&&
        distance(p,b)<(aerial(p)?18+4*p.jumpQuality:16))
        .sort((p,q)=>(distance(p,b)-(aerial(p)?5*p.jumpQuality:0))-(distance(q,b)-(aerial(q)?5*q.jumpQuality:0)))[0];
      if(receiver)this.recoverKick(receiver);
    }else if(this.ball){
      const b=this.ball;b.t+=dt;const receiver=this.players[b.to];b.tx=receiver.x;b.ty=receiver.y;const ratio=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*ratio;b.y=b.sy+(b.ty-b.sy)*ratio;
      const intercept=this.players.find(p=>p.team!==b.team&&p.down<=0&&distance(p,b)<10&&ratio>.2&&ratio<.95);
      if(intercept){this.carrierId=intercept.id;this.possession=intercept.team;this.tackles=0;this.ball=null;this.guard=.6;this.selected=this.possession===0?intercept.id:this.nearest(0,intercept).id;this.emit('turnover','INTERCETTO!','PALLA · '+this.teams[this.possession].name);}
      else if(ratio>=1){const p=this.players[b.to];this.carrierId=b.to;this.possession=p.team;this.stats.passes[p.team]++;if(b.offload)this.stats.offloads[p.team]++;this.ball=null;this.guard=.6;if(p.team===0)this.selected=p.id;if(b.oneTwo&&p.team===0)this.emit('oneTwo','UNO-DUE!','PALLA VIVA · ATTACCA IL VARCO');}
    }else{
      const c=this.carrier,dir=this.dir(c.team);
      if((dir<0&&c.y<=FIELD.top)||(dir>0&&c.y>=FIELD.bottom)){this.tryScored(c.team);return;}
      if(this.guard<=0){
        for(const defender of defenders){
          if(defender.down>0)continue;
          const gap=distance(defender,c);
          if((defender.dive>0||defender.brace)&&gap<(defender.brace?21:23)){
            defender.tackleWind=0;this.tackle(defender,defender.dive>0);return;
          }
          if(defender.tackleWind>0){
            defender.tackleWind=Math.max(0,defender.tackleWind-dt);
            if(defender.tackleWind===0){
              const facing=((c.x-defender.x)*defender.tackleX+(c.y-defender.y)*defender.tackleY)/Math.max(1,gap);
              if(gap<23&&facing>.55){this.tackle(defender);return;}
              defender.cd=.5;this.emit('miss');
            }
          }else if(defender.dive<=0&&defender.cd<=0&&gap<29){
            defender.tackleWind=.18/(defender.profile.tackle*defender.nation.tackle);defender.tackleX=(c.x-defender.x)/Math.max(1,gap);
            defender.tackleY=(c.y-defender.y)/Math.max(1,gap);
          }
        }
      }
      if(this.possession===1&&this.cpuThink<=0){
        this.cpuThink=.65;
        const near=defenders[0],dir=this.dir(1);
        const options=this.players.filter(p=>p.team===1&&p.id!==c.id&&p.down<=0&&(p.y-c.y)*dir<=0&&distance(p,c)<130);
        const target=options.sort((a,b)=>this.passValue(b,c)-this.passValue(a,c))[0];
        if(near&&distance(near,c)<34&&target){
          const vx=target.x-c.x,vy=target.y-c.y,length2=vx*vx+vy*vy;
          const clear=defenders.every(d=>{const t=clamp(((d.x-c.x)*vx+(d.y-c.y)*vy)/Math.max(1,length2),0,1);return Math.hypot(d.x-c.x-t*vx,d.y-c.y-t*vy)>19;});
          if(clear&&this.throwBall(target))this.cpuThink=1.65;
        }
        if(!this.ball&&near&&distance(near,c)>26&&distance(near,c)<60&&c.cd<=0){
          const dodge=c.nation.agility>1&&Math.abs(near.x-c.x)<24;
          const side=c.x<FIELD.width/2?1:-1;
          this.attackAction(c,dodge?{x:side,y:0}:{x:0,y:dir});
        }
      }
    }
  }
}
