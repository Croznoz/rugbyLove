import {FIELD,clamp} from './engine.mjs';

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
  fill(0,0,w,h,'#244635');c.save();c.beginPath();c.rect(0,0,vw,sh);c.clip();fill(0,0,vw,sh,'#8da391');
  fill(0,sh*.27,vw,sh*.13,'#294739');
  for(let row=0;row<3;row++)for(let col=0;col<Math.ceil(vw/8);col++){
    fill(col*8+row%2*3,sh*.285+row*5,3,3,['#cbd0af','#81a086','#adc5bd','#385848'][(row*7+col*3)%4]);
  }
  fill(0,sh*.39,vw,sh*.61,'#5c8354');
  for(let i=0;i<5;i++){
    const y1=sh*(.4+.6*(i/5)**1.5),y2=sh*(.4+.6*((i+1)/5)**1.5);
    fill(0,y1,vw,y2-y1,i%2?'#608959':'#557c4f');
  }
  c.strokeStyle='#dce7bfaa';c.lineWidth=1;
  c.beginPath();c.moveTo(cx-vw*.3,sh*.4);c.lineTo(-vw*.35,sh);c.moveTo(cx+vw*.3,sh*.4);c.lineTo(vw*1.35,sh);c.stroke();
  c.beginPath();c.moveTo(0,gateY);c.lineTo(vw,gateY);c.stroke();
  c.save();c.setLineDash([5,7]);c.strokeStyle='#dae3b75c';c.beginPath();c.moveTo(0,sh*.84);c.lineTo(vw,sh*.84);c.stroke();c.restore();
  fill(0,sh*.375,vw,sh*.035,'#d3d7b6');
  c.font='bold '+Math.max(6,Math.min(9,sh*.028))+'px monospace';c.textAlign='center';c.fillStyle='#2a4b34';c.fillText('RETRO RUGBY CLUB  ·  TRA I PALI',cx,sh*.397);
  const hasShot=s.accuracyLocked!==null;
  if(!hasShot){
    const aim=s.stage==='accuracy'?(s.accuracy-.5)/s.greenHalf:0;
    c.save();c.strokeStyle='#e6eab75c';c.lineWidth=1;c.setLineDash([3,6]);c.beginPath();c.moveTo(startX,startY);c.lineTo(cx+clamp(aim,-2,2)*gap,gateY-43*heightScale);c.stroke();c.restore();
  }
  const posts=()=>{
    const tint=s.stage==='result'&&s.scored?'#d9f3a6':'#f1edce',thick=Math.max(3,vw/150),top=gateY-sh*.58;
    c.strokeStyle='#234b3755';c.lineWidth=thick;c.beginPath();c.moveTo(cx-gap,gateY);c.lineTo(cx-gap+sh*.13,gateY+sh*.09);c.moveTo(cx+gap,gateY);c.lineTo(cx+gap+sh*.13,gateY+sh*.09);c.stroke();
    fill(cx-gap-thick/2,top,thick,gateY-top,tint);fill(cx+gap-thick/2,top,thick,gateY-top,tint);
    fill(cx-gap,gateY-30*heightScale,2*gap,thick,tint);
    for(const x of [cx-gap,cx+gap]){fill(x-thick,gateY-sh*.065,thick*2,sh*.065,'#284b3a');fill(x-thick,gateY-sh*.06,thick*2,2,'#d0df9b');}
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
  const playerScale=clamp(sh/260,.55,1.05);
  const player={...match.players[s.team*7],down:0,dive:0,charge:0,vx:0,vy:0,anim:0,facing:-1,kickAnim:hasShot&&s.flightTime<.35?.3:0};
  c.save();c.translate(startX-13*playerScale,startY);c.scale(playerScale,playerScale);renderer.drawPlayer(c,player,0,0,false,false);c.restore();
  if(!hasShot){fill(startX-4,startY+2,8,2,'#e0b866');}
  c.restore();
}
