const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class ArcadeRun {
  constructor(random=Math.random){this.random=random;this.reset();}
  reset(){
    this.state='ready';this.x=210;this.y=410;this.distance=0;this.tries=0;this.passed=0;this.energy=100;
    this.enemies=[];this.spawnIn=1.6;this.sprint=0;this.dodge=0;this.charge=0;this.dodgeDir=1;
    this.cooldowns={sprint:0,dodge:0,charge:0};this.flash=0;this.time=0;
  }
  get level(){return this.tries+1;}
  get score(){return Math.floor(this.distance/10)+this.tries*100+this.passed*10;}
  get pace(){return 140+Math.min(90,(this.level-1)*9);}
  start(){this.reset();this.state='playing';}
  action(kind,axis=0){
    const cost={sprint:20,dodge:22,charge:32}[kind];
    if(this.state!=='playing'||cost===undefined||this.cooldowns[kind]>0||this.energy<cost)return false;
    this.energy-=cost;
    if(kind==='dodge'){this.dodge=.28;this.dodgeDir=axis?Math.sign(axis):(this.x>210?-1:1);}
    else this[kind]=kind==='sprint'?.85:.55;
    this.cooldowns[kind]=kind==='charge'?2.4:1.6;
    return true;
  }
  spawn(){
    const lanes=[60,120,180,240,300,360],gap=Math.floor(this.random()*6);
    // Every row has an open lane; early levels leave several lanes open.
    const candidates=lanes.map((x,i)=>({x,i})).filter(p=>p.i!==gap);
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    const count=Math.min(5,2+Math.floor((this.level-1)/2));
    for(const p of candidates.slice(0,count))this.enemies.push({x:p.x,y:-35,home:p.x,passed:false,down:false});
  }
  step(dt,input={}){
    if(this.state!=='playing')return;
    dt=clamp(dt,0,1/30);this.time+=dt;this.flash=Math.max(0,this.flash-dt);
    for(const k of ['sprint','dodge','charge']){this[k]=Math.max(0,this[k]-dt);this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);}
    this.energy=Math.min(100,this.energy+dt*10);
    let ix=clamp(input.x||0,-1,1),iy=clamp(input.y||0,-1,1);const n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n;}
    this.x=clamp(this.x+(this.dodge>0?this.dodgeDir*390:ix*220)*dt,30,390);
    this.y=clamp(this.y+iy*145*dt,300,470);
    const speed=this.pace*(this.sprint>0?1.55:1),travel=speed*dt;
    this.distance+=travel;
    if(this.distance>=(this.tries+1)*1600){
      this.tries++;this.energy=100;this.flash=1.5;this.enemies=[];this.spawnIn=1.5;
    }
    this.spawnIn-=dt;
    if(this.spawnIn<=0){this.spawn();this.spawnIn=Math.max(1.1,2.15-(this.level-1)*.1);}
    for(const e of this.enemies){
      e.y+=travel;
      // Defenders commit early and stop steering near contact, leaving readable gaps.
      if(!e.down&&e.y>70&&e.y<this.y-100){const chase=Math.min(32,8+this.level*3);e.x=clamp(e.x+Math.sign(this.x-e.x)*chase*dt,e.home-20,e.home+20);}
      if(!e.down&&Math.hypot(e.x-this.x,e.y-this.y)<23){
        if(this.dodge>0)continue;
        if(this.charge>0){e.down=true;this.charge=0;this.passed++;e.passed=true;}
        else{this.state='over';break;}
      }
      if(!e.passed&&e.y>this.y+30){e.passed=true;this.passed++;}
    }
    this.enemies=this.enemies.filter(e=>e.y<620);
  }
}
