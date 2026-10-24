import {drawBall} from './ball-art.mjs';
import {clamp} from './kicks-engine.mjs';
export function kickProjection(game,x,y,z){
  const cx=game.position.x,cz=game.position.z+8,len=Math.hypot(cx,cz),dx=x-cx,dz=z-cz;
  const depth=Math.max(2,(-cx*dx-cz*dz)/len),side=(cz*dx-cx*dz)/len;
  return {x:210+side*420/depth,y:193+(3.6-y)*420/depth,scale:420/depth};
}
export function drawKickChallenge(c,game,background){
  c.drawImage(background,0,0);
  const project=(x,y,z)=>kickProjection(game,x,y,z);
  function line(a,b,color='#eee7cd',width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
  for(const z of [0,10,22,40,55])line(project(-35,0,z),project(35,0,z),'#eee7cd80',1);
  for(const x of [-35,35])line(project(x,0,-5),project(x,0,game.position.z+5),'#eee7cd',2);
  const shooting=['flight','result'].includes(game.stage),result=game.result;
  const goalColor=game.stage==='result'&&result?.scored?'#e2f4ab':'#fff6dc';
  const posts=()=>{
    for(const x of [-2.8,2.8]){
      line(project(x,0,0),project(x,12,0),goalColor,4);
      line(project(x,0,0),project(x,.9,0),'#294e60',7);
    }
    line(project(-2.8,3,0),project(2.8,3,0),goalColor,4);
  };
  if(!shooting){
    const start=project(game.position.x,.2,game.position.z),target=project(game.aim,5,0),drift=project(game.aim+game.wind,5,0);
    c.setLineDash([5,7]);line(start,target,'#fff3c9a0',1.5);c.setLineDash([]);
    line({x:target.x-6,y:target.y},{x:target.x+6,y:target.y},'#243e43',2);line({x:target.x,y:target.y-6},{x:target.x,y:target.y+6},'#243e43',2);
    c.strokeStyle='#c7774e';c.lineWidth=2;c.beginPath();c.arc(drift.x,drift.y,5,0,Math.PI*2);c.stroke();
    if(Math.abs(game.wind)>.05)line(target,drift,'#c7774e',1);
  }
  const ball=()=>{
    let x=game.position.x,z=game.position.z,y=.2,spin=-.5;
    if(shooting){const d=clamp(game.flightTime/game.flightDuration,0,1)/.78;
      x=game.position.x+(result.error-game.position.x)*d;z=game.position.z*(1-d);
      y=Math.max(.15,4*(5+game.powerLocked*4)*d*(1-d)+result.crossHeight*d);spin=d*11;
    }
    const p=project(x,y,z),shadow=project(x,0,z);
    c.fillStyle='#243c3835';c.beginPath();c.ellipse(shadow.x,shadow.y,Math.max(2,p.scale*.18),2,0,0,Math.PI*2);c.fill();
    drawBall(c,p.x,p.y,clamp(p.scale*.14,3,8),spin);
  };
  if(shooting&&game.flightTime/game.flightDuration>.78){ball();posts();}else{posts();ball();}
  const p=project(game.position.x,0,game.position.z),px=p.x-22,py=p.y-13;
  c.fillStyle='#273b3a44';c.beginPath();c.ellipse(px+3,py+18,16,5,0,0,Math.PI*2);c.fill();
  c.fillStyle='#243e43';c.fillRect(px-7,py+4,6,15);c.fillRect(px+2+(shooting?7:0),py+4-(shooting?7:0),6,15);
  c.fillStyle='#386d87';c.fillRect(px-12,py-15,24,22);c.fillStyle='#f2ead2';c.fillRect(px-12,py-11,24,4);
  c.fillStyle='#c99b77';c.fillRect(px-7,py-29,14,13);c.fillRect(px-16,py-12,4,15);c.fillRect(px+12,py-12,4,15);
  c.fillStyle='#32453c';c.fillRect(px-7,py-30,14,4);
  // Small plan view makes left/right position and distance legible at every angle.
  c.fillStyle='#21383de0';c.fillRect(12,60,72,100);c.strokeStyle='#ede7c49c';c.lineWidth=1;c.strokeRect(20,74,56,76);
  line({x:43,y:75},{x:53,y:75},'#ffe3a0',3);
  c.fillStyle='#fff3c3';c.beginPath();c.arc(48+game.position.x*.8,78+game.position.z*1.25,3,0,Math.PI*2);c.fill();
  c.fillStyle='#e9e1c4';c.font='8px monospace';c.textAlign='center';c.fillText('POSIZIONE',48,69);
}
