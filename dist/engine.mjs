export const FIELD={width:480,height:880,left:34,right:446,top:85,bottom:795};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const NUMBERS=[9,10,12,13,11,14,15];
export class Match{
  constructor(){this.events=[];this.reset({});this.state='menu';this.phase='live';}
  reset({seconds=60,difficulty='normal',scrums=false}={}){
    this.scrumsEnabled=!!scrums;this.scrum=null;this.seconds=seconds;this.difficulty=difficulty;this.aiSpeed={easy:70,normal:80,hard:88}[difficulty]||80;
    this.score=[0,0];this.half=1;this.time=seconds;this.elapsed=0;this.attackDir=-1;this.possession=0;this.tackles=0;this.state='playing';this.phase='kickoff';this.phaseTime=2.1;this.events=[];this.ball=null;this.particles=[];this.cpuThink=0;this.passCooldown=0;this.guard=1;this.selected=0;
    this.passSelection=null;this.kickAim=null;this.attackPlan=null;this.defensePlan=null;this.conversion=null;this.contact=null;this.cpuOffloadAt=-10;this.defenseGesture=null;this.aim={x:0,y:0};
    this.stats={tries:[0,0],conversions:[0,0],conversionAttempts:[0,0],passes:[0,0],offloads:[0,0],scrums:[0,0],tackles:[0,0],breaks:[0,0],kicks:[0,0],possession:[0,0]};
    this.players=Array.from({length:14},(_,id)=>({id,team:id<7?0:1,slot:id%7,number:NUMBERS[id%7],x:0,y:0,px:0,py:0,vx:0,vy:0,down:0,energy:100,energyWait:0,exhausted:false,burst:0,cd:0,charge:0,chargeX:0,chargeY:0,dive:0,diveX:0,diveY:0,kickAnim:0,kickCd:0,brace:false,evade:0,tackleWind:0,tackleX:0,tackleY:0,anim:0,facing:0}));
    this.lineup(0);this.emit('kickoff','SI GIOCA.','CALCIO D’INIZIO');
  }
  spendEnergy(p,amount){
    p.energy=clamp(p.energy-amount,0,100);p.energyWait=.65;
    if(p.energy<=1)p.exhausted=true;
  }
  recoverEnergy(dt,input){
    for(const p of this.players){
      p.energyWait=Math.max(0,p.energyWait-dt);
      if(p.exhausted&&p.energy>=25)p.exhausted=false;
      const sprint=this.phase==='live'&&p.id===this.selected&&(this.possession===0||this.loose)&&input.sprint&&!p.exhausted&&p.energy>1&&Math.hypot(input.x||0,input.y||0)>.1;
      if(!sprint&&p.energyWait===0&&p.charge<=0&&p.dive<=0&&p.burst<=0){
        const resting=this.phase!=='live'||Math.hypot(p.vx,p.vy)<8;
        p.energy=clamp(p.energy+dt*(resting?17:9),0,100);
      }
    }
  }
  emit(type,text='',tag=''){this.events.push({type,text,tag});if(this.events.length>30)this.events.shift();}
  dir(team){return team===0?this.attackDir:-this.attackDir;}
  get carrier(){return this.players[this.carrierId];}
  get controlled(){return this.players[this.selected];}
  get loose(){return this.ball?.kind==='kick';}
  lineup(team,x=240,y=440){
    this.passSelection=null;this.kickAim=null;this.attackPlan=null;this.defensePlan=null;this.scrum=null;this.contact=null;this.defenseGesture=null;this.possession=team;this.carrierId=team*7;const d=this.dir(team);this.ball=null;this.passCooldown=.7;this.guard=1.15;
    const xs=[240,120,360,62,418,170,310];
    for(const p of this.players){const own=p.team===team;p.x=xs[p.slot];p.y=clamp(y+(own?(-d*(45+Math.floor(p.slot/2)*22)):(d*(72+Math.floor(p.slot/2)*32))),FIELD.top+24,FIELD.bottom-24);if(own&&p.slot===0){p.x=x;p.y=y;}p.px=p.x;p.py=p.y;p.vx=p.vy=0;p.down=0;p.supportUntil=0;p.burst=0;p.charge=0;p.dive=0;p.kickAnim=0;p.brace=false;p.evade=0;p.tackleWind=0;p.facing=this.dir(p.team);}
    this.selected=team===0?this.carrierId:this.nearest(0,this.carrier).id;
  }
  launchKickoff(){
    // The setup keeps kickers behind halfway and receivers beyond the 10 m line.
    const p=this.carrier,dir=this.dir(p.team);
    this.phase='live';this.passSelection=null;this.kickAim=null;
    p.kickAnim=.4;p.kickCd=1.2;
    this.ball={kind:'kick',kickoff:true,x:p.x,y:p.y,sx:p.x,sy:p.y,
      tx:240,ty:440+dir*180,from:p.id,team:p.team,t:0,duration:1.65,groundTime:0,
      eligible:this.players.filter(a=>a.team===p.team&&(a.y-p.y)*dir<=0).map(a=>a.id)};
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
    const value=p=>this.passValue(p,c)+(directed?260*alignment(p):-distance(p,c)*.16);
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
  supportPoint(p,c){
    if(!this.attackPlan||this.attackPlan.carrier!==c.id){
      // Keep left/right roles stable until possession changes hands, avoiding crossed runs.
      const ids=this.players.filter(q=>q.team===c.team&&q.id!==c.id).sort((a,b)=>a.x-b.x||a.id-b.id).map(q=>q.id);
      this.attackPlan={carrier:c.id,ids};
    }
    if(p.supportCarrier===c.id&&p.supportUntil>this.elapsed)return p.support;
    const rank=this.attackPlan.ids.indexOf(p.id),dir=this.dir(c.team);
    const spread=[-155,-85,-38,38,85,155][rank]||0;
    const close=rank===2||rank===3,wide=rank===0||rank===5;
    const depth=close?18:wide?38:26;
    const base=clamp(c.x+spread+clamp(c.vx*.25,-18,18),FIELD.left+14,FIELD.right-14);
    const ty=clamp(c.y-dir*depth,FIELD.top-22,FIELD.bottom+22);
    const opponents=this.players.filter(q=>q.team!==p.team&&q.down<=0);
    let tx=base,best=-Infinity;
    for(const shift of (close?[-8,0,8]:[-25,0,25])){
      const x=clamp(base+shift,FIELD.left+14,FIELD.right-14);
      const gap=Math.min(150,...opponents.map(q=>Math.hypot(q.x-x,q.y-(ty+dir*55))));
      const lane=this.laneClearance(c,{x,y:ty},opponents);
      const value=gap*.55+Math.min(lane,65)*.7-Math.abs(shift)*.3;
      if(value>best){best=value;tx=x;}
    }
    p.supportRole=close?'close':wide?'wide':'channel';p.supportCarrier=c.id;p.supportUntil=this.elapsed+.16;p.support={x:tx,y:ty};return p.support;
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
    const dir=this.dir(c.team),cost=p=>distance(p,c)+((p.y-c.y)*dir<0?18:0);
    eligible.sort((a,b)=>cost(a)-cost(b));
    let pressure=eligible[0];
    const previous=eligible.find(p=>p.id===old?.pressure);
    if(previous&&pressure&&cost(previous)<cost(pressure)+14)pressure=previous;
    // A user-controlled defender only takes the pressure role when already close to the carrier.
    if(pressure?.team===0&&pressure.id===this.selected&&distance(pressure,c)>75)pressure=eligible.find(p=>p.id!==this.selected)||pressure;
    if(anchor)pressure=anchor;
    const remaining=eligible.filter(p=>p.id!==pressure?.id);
    const cover=[...remaining].sort((a,b)=>(b.y-a.y)*dir)[0];
    const markers=remaining.filter(p=>p.id!==cover?.id).sort((a,b)=>a.x-b.x);
    const threats=this.players.filter(p=>p.team===c.team&&p.id!==c.id&&p.down<=0).sort((a,b)=>distance(a,c)-distance(b,c)).slice(0,markers.length).sort((a,b)=>a.x-b.x);
    const points=new Map();
    if(pressure)points.set(pressure.id,{x:c.x+clamp(c.vx*.18,-16,16),y:c.y+clamp(c.vy*.18,-16,16),role:'pressure'});
    if(cover)points.set(cover.id,{x:c.x+clamp(c.vx*.3,-25,25),y:c.y+dir*105,role:'cover'});
    markers.forEach((p,i)=>{const t=threats[i];points.set(p.id,{x:t?t.x*.8+c.x*.2:c.x+(i-(markers.length-1)/2)*65,y:c.y+dir*(30+(i%2)*14),role:'mark'});});
    for(const point of points.values()){point.x=clamp(point.x,FIELD.left+8,FIELD.right-8);point.y=clamp(point.y,FIELD.top-16,FIELD.bottom+16);}
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
    const c=this.carrier;c.charge=0;this.ball={kind:'pass',x:c.x,y:c.y,sx:c.x,sy:c.y,tx:to.x,ty:to.y,to:to.id,from:c.id,t:0,duration:clamp(distance(c,to)/430,.2,.52),team:c.team};for(const p of this.players)p.tackleWind=0;this.ball.runX=to.vx;this.ball.runY=Math.abs(to.vy)>8?to.vy:this.dir(c.team)*65;this.passCooldown=.18;this.emit('pass');return true;
  }
  canChase(p,b=this.ball){
    return p.team!==b.team||b.eligible.includes(p.id)||(p.y-this.players[b.from].y)*this.dir(b.team)<=0;
  }
  canKick(){return this.state==='playing'&&this.phase==='live'&&!this.ball&&this.possession===0&&this.carrier.down<=0&&this.carrier.kickCd<=0&&this.carrier.energy>=12;}
  beginKick(aim={x:0,y:0}){
    if(!this.canKick()||this.kickAim)return false;
    this.kickAim={from:this.carrierId,x:0,y:this.dir(0),elapsed:0,power:.25};
    this.carrier.charge=this.carrier.burst=0;this.updateKickAim(0,aim);return true;
  }
  updateKickAim(dt,aim){
    const a=this.kickAim;if(!a)return;
    if(!this.canKick()||a.from!==this.carrierId){this.cancelKick();return;}
    a.elapsed+=dt;a.power=clamp(.25+a.elapsed*.25,.25,1);
    const length=Math.hypot(aim.x||0,aim.y||0);
    if(length>.2){a.x=aim.x/length;a.y=aim.y/length;}
  }
  cancelKick(){this.kickAim=null;}
  releaseKick(){
    const a=this.kickAim;if(!a)return false;
    this.kickAim=null;if(a.from!==this.carrierId)return false;
    return this.kick({x:a.x,y:a.y},a.power);
  }
  kickTarget(aim,power=.5){
    const p=this.carrier;
    if(typeof aim==='number')return {tx:clamp(p.x+clamp(aim,-1,1)*125,FIELD.left+12,FIELD.right-12),ty:clamp(p.y+this.dir(p.team)*210,FIELD.top-12,FIELD.bottom+12)};
    const length=Math.hypot(aim.x,aim.y)||1,range=110+clamp(power,0,1)*200;
    return {tx:clamp(p.x+aim.x/length*range,FIELD.left+12,FIELD.right-12),ty:clamp(p.y+aim.y/length*range,FIELD.top-12,FIELD.bottom+12)};
  }
  kick(aim=0,power=.5){
    if(!this.canKick())return false;
    const p=this.carrier,dir=this.dir(p.team),{tx,ty}=this.kickTarget(aim,power);this.kickAim=null;
    this.spendEnergy(p,12);p.kickCd=1.2;p.kickAnim=.3;p.charge=0;p.burst=0;
    this.ball={kind:'kick',x:p.x,y:p.y,sx:p.x,sy:p.y,tx,ty,from:p.id,team:p.team,t:0,duration:clamp(distance(p,{x:tx,y:ty})/200,.55,1.2),groundTime:0,eligible:this.players.filter(a=>a.team===p.team&&(a.y-p.y)*dir<=0).map(a=>a.id)};
    this.guard=0;this.stats.kicks[p.team]++;this.emit('kick','CALCIO DIREZIONATO','INSEGUI LA PALLA');return true;
  }
  recoverKick(p){
    const previous=this.ball.team;for(const q of this.players)q.tackleWind=0;this.ball=null;this.carrierId=p.id;this.possession=p.team;if(p.team!==previous)this.tackles=0;
    this.selected=p.team===0?p.id:this.nearest(0,p).id;this.guard=.75;this.passCooldown=.12;p.charge=0;p.dive=0;
    this.emit('recovery',p.team===0?'PALLA RECUPERATA!':'PALLA ALL’IRLANDA',p.team===0?'RIPARTI!':'TORNA IN DIFESA');
  }
  bestDefender(){
    const focus=this.loose?{x:this.ball.tx,y:this.ball.ty,vx:0,vy:0}:this.ball?.kind==='pass'?this.players[this.ball.to]:this.carrier;
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
    const next=this.bestDefender();
    if(next){this.selected=next.id;this.defensePlan=null;}
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
    if(this.loose){if(p.energy>=12){this.spendEnergy(p,12);p.burst=.4;p.cd=.6;this.emit('sprint');}return;}
    if(this.ball)return;
    if(this.possession===0){
      if(Math.abs(input.x||0)>.55&&Math.abs(input.x)>Math.abs(input.y||0)*1.25){
        if(p.energy<18)return;
        p.evade=.22;p.chargeX=Math.sign(input.x);p.chargeY=this.dir(0)*.28;
        p.charge=0;p.burst=0;p.cd=.85;this.spendEnergy(p,18);this.emit('sidestep');return;
      }
      if(p.energy<30){this.emit('hint','RIPRENDI FIATO','SERVE ENERGIA PER SFONDARE');return;}
      let dx=input.x||0,dy=input.y||0;
      if(Math.hypot(dx,dy)<.15){dx=p.vx;dy=p.vy;if(Math.hypot(dx,dy)<6){dx=0;dy=this.dir(p.team);}}
      const len=Math.hypot(dx,dy)||1;p.chargeX=dx/len;p.chargeY=dy/len;p.charge=.28+.20*clamp((p.energy-30)/30,0,1);p.burst=.4;this.spendEnergy(p,30);p.cd=1.25;this.emit('charge');
    }else{
      if(p.energy<12){this.emit('hint','RIPRENDI FIATO','IL PLACCAGGIO A CONTATTO RESTA ATTIVO');return;}this.spendEnergy(p,12);p.cd=.9;const c=this.carrier,len=distance(p,c)||1;
      p.diveX=(c.x-p.x)/len;p.diveY=(c.y-p.y)/len;p.dive=.22;this.emit('dive');
    }
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
    if(this.tackles>=3){this.restart.team=1-c.team;this.tackles=0;this.emit('turnover','CAMBIO POSSESSO',this.restart.team===0?'PALLA ALL’ITALIA':'PALLA ALL’IRLANDA');}
    this.phase='ruck';this.phaseTime=.42;this.restart.receiver=this.nearest(this.restart.team,this.restart,c.id).id;
  }
  // Recover at the tackle without resetting either team's formation.
  stepRecovery(dt){
    const r=this.restart,receiver=this.players[r.receiver];
    for(const p of this.players){
      p.px=p.x;p.py=p.y;p.down=Math.max(0,p.down-dt);p.cd=Math.max(0,p.cd-dt);
      if(p.down>0){p.vx=p.vy=0;continue;}
      let target;
      if(p===receiver)target=r;
      else if(p.team===r.team)target=this.supportPoint(p,receiver);
      else target={x:p.x,y:r.y+this.dir(r.team)*48};
      const d=distance(p,target),speed=Math.min(p===receiver?150:65,d/Math.max(dt,.001));
      p.vx=d>1?(target.x-p.x)/d*speed:0;p.vy=d>1?(target.y-p.y)/d*speed:0;
      p.x=clamp(p.x+p.vx*dt,FIELD.left+8,FIELD.right-8);p.y=clamp(p.y+p.vy*dt,FIELD.top-22,FIELD.bottom+22);
      p.anim+=Math.hypot(p.vx,p.vy)*dt*.11;
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
    this.scrum={x,y,feed,elapsed:0,duration:2,balance:feed===0?.68:.32,side:1,pushing:false};
    for(const p of this.players){p.down=p.charge=p.dive=p.burst=0;p.vx=p.vy=0;p.px=p.x;p.py=p.y;}
    this.emit('scrumStart');
  }
  stepScrum(dt,input){
    const s=this.scrum;s.elapsed+=dt;s.pushing=s.feed===1?true:!!input.sprint;
    if(s.feed===0&&Math.abs(input.x||0)>.25)s.side=Math.sign(input.x);
    const strength=this.players.slice(0,3).reduce((sum,p)=>sum+p.energy,0)/300;
    const cpu={easy:.08,normal:.10,hard:.12}[this.difficulty]||.1;
    s.balance=clamp(s.balance+((s.pushing?(s.feed===1?.12:.24)*strength:0)-cpu)*dt,.02,.98);
    const displacement=(s.balance-.5)*24;
    for(const p of this.players){
      p.px=p.x;p.py=p.y;const d=this.dir(p.team),pack=p.slot<3;
      const tx=clamp(s.x+(pack?(p.slot-1)*17:([0,0,0,-85,85,-140,140][p.slot])),FIELD.left+8,FIELD.right-8);
      const ty=clamp(s.y-d*(pack?13:65+(p.slot-3)*12)+displacement*this.dir(0),FIELD.top+10,FIELD.bottom-10);
      const blend=1-Math.exp(-dt*9);p.x+=(tx-p.x)*blend;p.y+=(ty-p.y)*blend;
      p.vx=(p.x-p.px)/dt;p.vy=(p.y-p.py)/dt;p.anim+=Math.hypot(p.vx,p.vy)*dt*.11;
      p.facing=d;if(pack&&p.team===0&&s.pushing)this.spendEnergy(p,dt*12);
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
      this.emit('scrumEnd',team===0?'MISCHIA VINTA!':'PALLA ALL’IRLANDA',team===0?(side<0?'ESCI A SINISTRA':'ESCI A DESTRA'):'TORNA IN DIFESA');
      if(this.time<=0)this.endHalf();
    }
  }
  tryScored(team){
    if(this.phase!=='live')return;
    this.cancelKick();
    this.trySpot={x:this.carrier.x,team};
    this.score[team]+=5;this.stats.tries[team]++;this.phase='try';this.phaseTime=2.2;this.nextTeam=1-team;this.tackles=0;this.ball=null;this.scatter(this.carrier.x,this.carrier.y,team===0?'#b9dafa':'#d3edab',36);this.emit('try',team===0?'META ITALIA!':'META IRLANDA!','+5 PUNTI');
  }
  beginConversion(){
    this.cancelKick();
    const {team,x}=this.trySpot,angle=Math.abs(x-240)/206;
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
      this.lineup(this.nextTeam);this.launchKickoff();return;
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
    const realDt=dt;
    const gesture=this.defenseGesture;
    const holding=this.phase==='live'&&this.possession===1&&!this.ball&&input.sprint&&
      gesture&&gesture.id===this.selected&&gesture.carrier===this.carrierId;
    if(gesture&&!holding)this.releaseSpecial(true);
    for(const p of this.players)p.brace=!!(holding&&p.id===this.selected&&
      this.elapsed-gesture.at>=.18&&p.down<=0&&p.dive<=0&&p.cd<=0&&p.energy>=8);

    // World and clock slow together; aiming input and power use real time.
    if(this.phase==='live'&&this.kickAim)dt*=.35;
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
    if(this.phase!=='live'){
      this.phaseTime-=dt;if(this.phaseTime>0)return;
      
      if(this.phase==='try'){this.beginConversion();return;}
      if(this.phase==='kickoff'){this.launchKickoff();return;}
      if(this.phase==='halftime'){this.half=2;this.time=this.seconds;this.attackDir=1;this.tackles=0;this.lineup(1);this.emit('kickoff','SECONDO TEMPO','ORA ATTACCHI VERSO IL BASSO');this.launchKickoff();return;}
      this.phase='live';return;
    }
    this.time=Math.max(0,this.time-dt);if(this.time<=0){this.endHalf();return;}
    if(!this.loose)this.stats.possession[this.possession]+=dt;this.guard=Math.max(0,this.guard-dt);this.passCooldown=Math.max(0,this.passCooldown-dt);this.cpuThink-=dt;
    this.updateKickAim(realDt,input);
    const carrier=this.carrier;const defenders=this.players.filter(p=>p.team!==this.possession).sort((a,b)=>distance(a,carrier)-distance(b,carrier));
    if(this.possession===0&&!this.ball)this.selected=this.carrierId;
    const focus=this.ball?.kind==='pass'?this.players[this.ball.to]:carrier;
    const defense=this.loose?null:this.defenseTargets(focus);
    const landing=this.loose?{x:this.ball.tx,y:this.ball.ty}:null;
    const chasers=landing?[0,1].map(team=>this.players.filter(p=>p.team===team&&p.down<=0&&this.canChase(p)).sort((a,b)=>distance(a,landing)-distance(b,landing))):null;
    for(const p of this.players){p.px=p.x;p.py=p.y;p.cd=Math.max(0,p.cd-dt);p.down=Math.max(0,p.down-dt);p.burst=Math.max(0,p.burst-dt);p.charge=Math.max(0,p.charge-dt);p.kickAnim=Math.max(0,p.kickAnim-dt);p.kickCd=Math.max(0,p.kickCd-dt);p.evade=Math.max(0,p.evade-dt);
      const wasDiving=p.dive>0;p.dive=Math.max(0,p.dive-dt);if(wasDiving&&p.dive===0){p.down=.25;this.emit('miss');}
      if(p.down>0){p.vx=p.vy=0;continue;}
      let dx=0,dy=0,speed=p.team===0?(p.id===this.selected?78:65):this.aiSpeed;
      if(p.dive>0){dx=p.diveX;dy=p.diveY;speed=210;
      }else if(p.evade>0&&!this.ball){dx=p.chargeX;dy=p.chargeY;speed=150;
      }else if(this.ball?.kind==='pass'&&p.id===this.ball.to){
        dx=this.ball.runX;dy=this.ball.runY;const run=Math.hypot(dx,dy)||1;dx/=run;dy/=run;speed=78;
      }else if(p.id===this.selected){dx=input.x||0;dy=input.y||0;if(p.charge>0&&!this.ball){dx=p.chargeX;dy=p.chargeY;}const l=Math.hypot(dx,dy);if(l>1){dx/=l;dy/=l;}if((this.possession===0||this.loose)&&input.sprint&&!p.exhausted&&p.energy>1&&(dx||dy)){speed*=1.35;this.spendEnergy(p,dt*24);}if(p.burst>0&&(this.possession===0||this.loose))speed*=1.4;
      }else if(p.id===this.carrierId&&!this.ball){
        const dir=this.dir(p.team);let repel=0;
        for(const d of defenders){const ahead=(d.y-p.y)*dir;if(ahead>-15&&ahead<110)repel+=(p.x>=d.x?1:-1)*Math.max(0,75-Math.abs(p.x-d.x))*.025;}
        dx=clamp(repel+(240-p.x)*.002,-.75,.75);dy=dir;
        if(p.x<60)dx=.8;if(p.x>420)dx=-.8;
      }else{
        let tx,ty;const dir=this.dir(this.possession);
        if(landing){
          const rank=chasers[p.team].indexOf(p);
          if(rank<0){tx=p.x;ty=clamp(this.players[this.ball.from].y-this.dir(this.ball.team)*24,FIELD.top-12,FIELD.bottom+12);}
          else if(rank<2){tx=landing.x;ty=landing.y;speed=p.team===0?78:this.aiSpeed;}
          else{tx=clamp(landing.x+(p.slot%2?50:-50),FIELD.left+8,FIELD.right-8);ty=clamp(landing.y-this.dir(p.team)*(35+rank*12),FIELD.top+12,FIELD.bottom-12);}
        }else if(p.team===this.possession){
          if(this.ball&&p.id===this.ball.to){tx=this.ball.tx;ty=this.ball.ty;}
          else{const support=this.supportPoint(p,focus);tx=support.x;ty=support.y;speed=p.team===0?88:this.aiSpeed+5;}
        }else{
          const point=defense.points.get(p.id);
          tx=point?.x??p.x;ty=point?.y??p.y;
          p.defenseRole=point?.role||'recover';
          speed=p.team===0?76:this.aiSpeed*.95;

        }
        const dist=Math.hypot(tx-p.x,ty-p.y);if(dist>4){dx=(tx-p.x)/dist;dy=(ty-p.y)/dist;speed=Math.min(speed,dist*3);}
      }
      if(p.brace){speed*=.6;this.spendEnergy(p,dt*5);}
      if(p.tackleWind>0&&p.dive<=0)speed*=.45;
      const norm=Math.hypot(dx,dy);if(norm>1){dx/=norm;dy/=norm;}
      const blend=p.dive>0?1:1-Math.exp(-dt*18);p.vx+=(dx*speed-p.vx)*blend;p.vy+=(dy*speed-p.vy)*blend;
      p.x=clamp(p.x+p.vx*dt,FIELD.left+8,FIELD.right-8);p.y=clamp(p.y+p.vy*dt,FIELD.top-22,FIELD.bottom+22);p.anim+=Math.hypot(p.vx,p.vy)*dt*.11;if(Math.abs(p.vy)>3)p.facing=Math.sign(p.vy);
    }
    // Soft separation keeps support runners readable without a physics engine.
    for(let i=0;i<14;i++)for(let j=i+1;j<14;j++){const a=this.players[i],b=this.players[j];if(a.team!==b.team||a.down||b.down)continue;const d=distance(a,b);if(d<16&&d>.01){const n=(16-d)*.5,dx=(a.x-b.x)/d*n,dy=(a.y-b.y)/d*n;a.x=clamp(a.x+dx,FIELD.left+8,FIELD.right-8);b.x=clamp(b.x-dx,FIELD.left+8,FIELD.right-8);a.y=clamp(a.y+dy,FIELD.top-22,FIELD.bottom+22);b.y=clamp(b.y-dy,FIELD.top-22,FIELD.bottom+22);}}
    if(this.loose){
      const b=this.ball;b.t+=dt;const ratio=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*ratio;b.y=b.sy+(b.ty-b.sy)*ratio;
      if(ratio>=1)b.groundTime+=dt;
      if(ratio>=.94){
        const receiver=this.players.filter(p=>p.down<=0&&p.dive<=0&&this.canChase(p)&&distance(p,b)<16).sort((p,q)=>distance(p,b)-distance(q,b))[0];
        if(receiver)this.recoverKick(receiver);
      }
    }else if(this.ball){
      const b=this.ball;b.t+=dt;const receiver=this.players[b.to];b.tx=receiver.x;b.ty=receiver.y;const ratio=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*ratio;b.y=b.sy+(b.ty-b.sy)*ratio;
      const intercept=this.players.find(p=>p.team!==b.team&&p.down<=0&&distance(p,b)<10&&ratio>.2&&ratio<.95);
      if(intercept){this.carrierId=intercept.id;this.possession=intercept.team;this.tackles=0;this.ball=null;this.guard=.6;this.selected=this.possession===0?intercept.id:this.nearest(0,intercept).id;this.emit('turnover','INTERCETTO!',this.possession===0?'PALLA ALL’ITALIA':'PALLA ALL’IRLANDA');}
      else if(ratio>=1){const p=this.players[b.to];this.carrierId=b.to;this.possession=p.team;this.stats.passes[p.team]++;if(b.offload)this.stats.offloads[p.team]++;this.ball=null;this.guard=.6;if(p.team===0)this.selected=p.id;}
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
            defender.tackleWind=.18;defender.tackleX=(c.x-defender.x)/Math.max(1,gap);
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
      }
    }
  }
}
