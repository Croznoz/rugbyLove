export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wave=n=>1-Math.abs(1-n%2);
export class KickChallenge {
  constructor(){this.reset();}
  reset(){
    this.state='ready';this.score=0;this.goals=0;this.lives=3;this.attempt=0;this.streak=0;this.resolved=0;
    this.prepare();
  }
  get level(){return this.goals+1;}
  get distance(){return Math.hypot(this.position.x,this.position.z);}
  get minPower(){return .35+this.distance*.009;}
  get tolerance(){return Math.max(.055,.15-(this.shotLevel-1)*.006-Math.abs(this.position.x)*.001);}
  get meterSpeed(){return Math.min(1.45,.62+(this.shotLevel-1)*.045);}
  get green(){
    // The green interval exactly matches the horizontal scoring window, including wind.
    const centre=.5-(this.aim+this.wind)*this.tolerance/2.8;
    return {left:clamp(centre-this.tolerance,0,1),right:clamp(centre+this.tolerance,0,1)};
  }
  start(){this.reset();this.state='playing';}
  prepare(){
    this.shotLevel=this.level;
    const spread=Math.min(23,(this.level-1)*2.7),sides=[0,-.65,.8,-1,.5,1,-.8];
    this.position={x:sides[this.attempt%sides.length]*spread,z:Math.min(52,18+(this.level-1)*2.4)};
    this.wind=this.level<5?0:Math.sin((this.attempt+1)*2.1)*Math.min(3.2,.65+(this.level-5)*.22);
    this.stage='power';this.aim=0;this.power=0;this.accuracy=0;this.powerLocked=null;this.accuracyLocked=null;
    this.elapsed=0;this.sweep=0;this.flightTime=0;this.flightDuration=1.65;this.result=null;
  }
  steer(amount,dt){if(this.state==='playing'&&['power','accuracy'].includes(this.stage))this.aim=clamp(this.aim+clamp(amount,-1,1)*dt*3,-7,7);}
  action(){
    if(this.state!=='playing'||this.elapsed<.18)return false;
    if(this.stage==='power'){
      this.powerLocked=this.power;this.stage='accuracy';this.sweep=0;this.elapsed=0;return true;
    }
    if(this.stage==='accuracy'){
      this.accuracyLocked=this.accuracy;
      const error=this.aim+this.wind+(this.accuracyLocked-.5)*2.8/this.tolerance;
      const crossHeight=Math.max(0,3+(this.powerLocked-this.minPower)*12);
      const scored=this.powerLocked>=this.minPower&&Math.abs(error)<=2.8;
      const perfect=scored&&Math.abs(error)<.6;
      this.result={error,crossHeight,scored,perfect,reason:this.powerLocked<this.minPower?'TIRO CORTO':error<-2.8?'FUORI A SINISTRA':error>2.8?'FUORI A DESTRA':perfect?'CENTRO PERFETTO!':'TRA I PALI!',points:0};
      this.stage='flight';this.elapsed=0;this.flightTime=0;return true;
    }
    if(this.stage==='result'&&this.elapsed>=.65){this.attempt++;this.prepare();return true;}
    return false;
  }
  resolve(){
    if(this.stage!=='flight')return;
    if(this.result.scored){
      this.streak++;this.result.points=100+this.level*20+Math.round(this.distance)*2+Math.min(5,this.streak)*10+(this.result.perfect?25:0);
      this.score+=this.result.points;this.goals++;
    }else{this.lives--;this.streak=0;}
    this.resolved++;this.stage='result';this.elapsed=0;if(this.lives===0)this.state='over';
  }
  step(dt,axis=0){
    if(this.state!=='playing')return;
    dt=clamp(dt,0,1/30);this.elapsed+=dt;
    if(this.stage==='flight'){this.flightTime=Math.min(this.flightDuration,this.flightTime+dt);if(this.flightTime>=this.flightDuration)this.resolve();return;}
    if(this.stage==='result')return;
    this.steer(axis,dt);this.sweep+=this.meterSpeed*(this.stage==='accuracy'?1.15:1)*dt;
    if(this.stage==='power')this.power=wave(this.sweep);else this.accuracy=wave(this.sweep);
  }
}
