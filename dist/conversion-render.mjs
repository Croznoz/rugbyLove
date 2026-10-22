import {FIELD,clamp} from './engine.mjs';
import {ART,paintStadium} from './art.mjs';

// A small, procedural behind-the-kicker view. The flight uses the same
// gate height and horizontal error as the scoring calculation.
export function drawConversion(renderer,match){
  const c=renderer.ctx,s=match.conversion,w=renderer.width,h=renderer.height;
  const side=window.matchMedia?window.matchMedia('(max-height:560px) and (orientation:landscape)').matches:w/h>1.6&&h<340;
  const vw=side?w-254:w,sh=side?h:Math.max(100,h-201),cx=vw/2;
  const gateY=sh*.66,gap=Math.min(vw*.135,66),heightScale=sh*.22/30;
  const startX=cx+(s.x-FIELD.width/2)/((FIELD.right-FIELD.left)/2)*Math.min(vw*.29,145),startY=sh*.96;
  const fill=(x,y,width,height,color)=>{c.fillStyle=color;c.fillRect(x,y,width,height);};
  c.setTransform(renderer.dpr,0,0,renderer.dpr,0,0);
  fill(0,0,w,h,ART.grassDark);c.save();c.beginPath();c.rect(0,0,vw,sh);c.clip();
  const cached=renderer.conversionScene;
  if(!cached||cached.w!==vw||cached.h!==sh){
    const scene=document.createElement('canvas');scene.width=Math.ceil(vw);scene.height=Math.ceil(sh);
    paintStadium(scene.getContext('2d'),vw,sh);renderer.conversionScene={canvas:scene,w:vw,h:sh};
  }
  c.drawImage(renderer.conversionScene.canvas,0,0);
  c.strokeStyle='#efe6b3aa';c.lineWidth=1;
  c.beginPath();c.moveTo(cx-vw*.3,sh*.42);c.lineTo(-vw*.35,sh);c.moveTo(cx+vw*.3,sh*.42);c.lineTo(vw*1.35,sh);c.stroke();
  c.beginPath();c.moveTo(0,gateY);c.lineTo(vw,gateY);c.stroke();
  c.save();c.setLineDash([5,7]);c.strokeStyle='#e9e1af66';c.beginPath();c.moveTo(0,sh*.84);c.lineTo(vw,sh*.84);c.stroke();c.restore();
  const hasShot=s.accuracyLocked!==null;
  if(!hasShot){
    const aim=s.stage==='accuracy'?(s.accuracy-.5)/s.greenHalf:0;
    c.save();c.strokeStyle='#e6eab75c';c.lineWidth=1;c.setLineDash([3,6]);c.beginPath();c.moveTo(startX,startY);c.lineTo(cx+clamp(aim,-2,2)*gap,gateY-43*heightScale);c.stroke();c.restore();
  }
  const posts=()=>{
    const tint=s.stage==='result'&&s.scored?'#d9f3a6':'#fff0bf',thick=Math.max(3,vw/150),top=gateY-sh*.58;
    c.strokeStyle='#162c3e55';c.lineWidth=thick;c.beginPath();c.moveTo(cx-gap,gateY);c.lineTo(cx-gap+sh*.13,gateY+sh*.09);c.moveTo(cx+gap,gateY);c.lineTo(cx+gap+sh*.13,gateY+sh*.09);c.stroke();
    fill(cx-gap-thick/2,top,thick,gateY-top,tint);fill(cx+gap-thick/2,top,thick,gateY-top,tint);
    fill(cx-gap,gateY-30*heightScale,2*gap,thick,tint);
    for(const x of [cx-gap,cx+gap]){fill(x-thick,gateY-sh*.065,thick*2,sh*.065,'#1b2843');fill(x-thick,gateY-sh*.06,thick*2,2,'#e7cd95');}
  };
  const ball=()=>{
    let x=startX,y=startY-3,size=4,spin=-.8;
    if(hasShot){
      const depth=clamp(s.flightTime/s.flightDuration,0,1)/.72;
      const altitude=Math.max(0,(20+s.powerLocked*12)*4*depth*(1-depth)+s.crossHeight*depth);
      x=startX+(cx+s.error*gap-startX)*depth;y=startY+(gateY-startY)*depth-altitude*heightScale;
      size=Math.max(2.2,4-depth*1.15);spin=depth*9;
    }
    c.save();c.translate(x,y);c.rotate(spin);c.fillStyle='#715a3e';c.fillRect(-size-1,-size*.55-1,size*2+2,size*1.1+2);c.fillStyle='#fff3d4';c.fillRect(-size,-size*.55,size*2,size*1.1);c.fillStyle='#a08455';c.fillRect(-.5,-size*.55,1,size*1.1);c.restore();
  };
  if(hasShot&&s.flightTime/s.flightDuration>.72){ball();posts();}else{posts();ball();}
  const playerScale=clamp(sh/160,.6,1.8);
  const player={...match.players[s.team*7+1],down:0,dive:0,charge:0,vx:0,vy:0,anim:0,facing:-1,kickAnim:hasShot&&s.flightTime<.35?.3:0};
  c.save();c.translate(startX-18*playerScale,startY-12*1.35*playerScale);c.scale(playerScale,playerScale);renderer.drawPlayer(c,player,0,0,false,false);c.restore();
  if(!hasShot){fill(startX-4,startY+2,8,2,'#e0b866');}
  c.restore();
}
