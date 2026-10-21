import {FIELD,clamp} from './engine.mjs';
import {drawConversion} from './conversion-render.mjs';
export class Renderer{
  constructor(canvas,map){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.map=map;this.mc=map.getContext('2d');this.camera={x:240,y:440};this.scrumView=0;this.kickView=0;this.width=1;this.height=1;this.zoom=1;this.dpr=1;this.field=this.makeField();this.resize();
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.zoom=this.width<650?this.width/480:Math.min(1.65,this.width/720);this.ctx.imageSmoothingEnabled=false;
  }
  makeField(){
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1040;const c=canvas.getContext('2d');c.translate(160,80);
    c.fillStyle='#304c39';c.fillRect(-160,-80,800,1040);
    const fill=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    // Static stadium detail is painted once, not rebuilt every frame.
    for(let side=0;side<2;side++){
      const x=side===0?-142:518;fill(x,-30,104,940,'#233d31');
      for(let row=0;row<10;row++)for(let n=0;n<110;n++){const px=x+row*10,py=n*8-20;const seed=(row*73+n*41+side*7)%17;c.fillStyle=['#778b62','#c5c5a0','#233a33','#477562','#7c9c9d'][seed%5];c.fillRect(px,py,4,4);if(seed%3===0){c.fillStyle='#cab299';c.fillRect(px+1,py-2,2,2);}}
      fill(side===0?-35:489,0,23,880,'#b5ad86');fill(side===0?-29:494,0,3,880,'#c7c4a0');fill(side===0?-18:483,0,5,880,'#193d2d');
      for(let n=0;n<9;n++){fill(side===0?-17:483,n*100+8,12,82,n%2?'#e4e4c5':'#17392c');c.save();c.translate(side===0?-8:491,n*100+50);c.rotate(-Math.PI/2);c.fillStyle=n%2?'#264534':'#d3dfa1';c.font='bold 6px monospace';c.textAlign='center';c.fillText(n%2?'RUGBY CLUB':'PLAY FOR THE GAME',0,0);c.restore();}
    }
    fill(0,0,480,880,'#47764d');
    for(let y=85;y<795;y+=71)fill(34,y,412,71,(Math.round((y-85)/71)%2)?'#5b8456':'#628c5b');
    fill(34,30,412,55,'#406746');fill(34,795,412,55,'#406746');
    // Deterministic, very subtle turf texture.
    for(let i=0;i<4200;i++){const x=(i*173)%475,y=(i*257)%876;c.fillStyle=i%2?'#d3da9a0c':'#1939210c';c.fillRect(x,y,2,1);}
    c.strokeStyle='#dce4bc';c.lineWidth=1.6;c.strokeRect(34,30,412,820);
    for(const y of [85,241,440,639,795]){c.beginPath();c.moveTo(34,y);c.lineTo(446,y);c.stroke();}
    c.save();c.setLineDash([7,8]);c.lineWidth=1;for(const y of [120,369,511,760]){c.beginPath();c.moveTo(34,y);c.lineTo(446,y);c.stroke();}for(const x of [69,140,340,411]){c.beginPath();c.moveTo(x,85);c.lineTo(x,795);c.stroke();}c.restore();
    c.font='bold 11px monospace';c.fillStyle='#d3e2b29c';c.textAlign='center';
    for(const [y,label] of [[241,'22'],[440,'50'],[639,'22']]){c.save();c.translate(49,y-5);c.rotate(-Math.PI/2);c.fillText(label,0,0);c.restore();c.save();c.translate(432,y+5);c.rotate(Math.PI/2);c.fillText(label,0,0);c.restore();}
    c.save();c.translate(240,440);c.rotate(-Math.PI/2);c.fillStyle='#b6d6a12a';c.font='italic 900 40px Arial';c.fillText('RRC',0,14);c.restore();
    for(const y of [85,795])for(const x of [30,450]){fill(x+2,y-20,2,22,'#d9dec2');fill(x+4,y-20,8,6,'#e8b85f');}
    // H posts and long afternoon shadows.
    for(const y of [85,795]){
      c.strokeStyle='#183d2c45';c.lineWidth=3;c.beginPath();c.moveTo(218,y);c.lineTo(242,y+28);c.moveTo(262,y);c.lineTo(286,y+28);c.moveTo(232,y+16);c.lineTo(276,y+16);c.stroke();
      fill(216,y-48,3,48,'#dce4ca');fill(260,y-48,3,48,'#dce4ca');fill(216,y-24,47,3,'#e9ebd7');fill(214,y-10,7,10,'#293f4a');fill(258,y-10,7,10,'#293f4a');
    }
    // Stadium apron markings.
    c.textAlign='center';c.font='bold 13px monospace';c.fillStyle='#8da27a';c.fillText('R E T R O   R U G B Y   C L U B',240,-26);c.fillText('F O R   T H E   L O V E   O F   T H E   G A M E',240,915);
    return canvas;
  }
  drawPlayer(c,p,x,y,selected,carrier){
    c.save();c.translate(x,y);c.fillStyle='#173d2b62';c.beginPath();c.ellipse(4,4,12,5,0,0,Math.PI*2);c.fill();
    if(selected){c.strokeStyle='#e5f29d';c.lineWidth=1.5;c.beginPath();c.ellipse(0,3,14,6,0,0,Math.PI*2);c.stroke();}
    if(p.charge>0){c.strokeStyle='#f4ca70';c.lineWidth=2;c.beginPath();c.ellipse(0,3,16,7,0,0,Math.PI*2);c.stroke();c.beginPath();for(const offset of [-5,5]){c.moveTo(offset-p.chargeX*19,4-p.chargeY*19);c.lineTo(offset-p.chargeX*29,4-p.chargeY*29);}c.stroke();}
    if(p.dive>0){c.rotate(Math.atan2(p.diveY,p.diveX)+Math.PI/2);c.scale(1,.72);}
    else if(p.down>0)c.rotate(Math.PI/2);
    else if(p.charge>0)c.rotate(p.chargeX*.2);
    const step=Math.sin(p.anim),run=Math.min(1,Math.hypot(p.vx,p.vy)/40),s=p.kickAnim>0?-7:step*3*run;
    const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    const skin=['#d5a77c','#b67c54','#ecc29a'][p.slot%3],kit=p.team===0?'#65a9df':'#f0eee0',body=p.team===0?'#4187c6':'#225d43';
    rect(-7,-2,5,8+s,skin);rect(2,-2,5,8-s,skin);
    rect(-7,4+s,5,4,p.team===0?'#a5cee7':'#f1edce');rect(2,4-s,5,4,p.team===0?'#a5cee7':'#f1edce');
    rect(-8,7+s,7,3,'#23382f');rect(2,7-s,7,3,'#23382f');
    rect(-8,-8,16,7,p.team===0?'#203e58':'#e5e5d3');rect(-9,-21,18,14,body);
    rect(-9,-21,18,3,kit);rect(-12,-20,4,9,body);rect(8,-20,4,9,body);
    rect(-13,-12-s,4,7,skin);rect(9,-12+s,4,7,skin);
    rect(-5,-29,10,9,skin);rect(-5,-30,10,4,p.slot%3===1?'#262c25':'#564432');rect(-6,-27,2,4,skin);rect(5,-27,2,4,skin);
    if(p.facing>0){rect(-3,-24,1,1,'#26352e');rect(2,-24,1,1,'#26352e');}
    else{c.fillStyle='#f4f4da';c.font='bold 6px monospace';c.textAlign='center';c.fillText(String(p.number),0,-12);}
    if(carrier){c.save();c.translate(11,-12);c.rotate(-.5);c.fillStyle='#664c35';c.fillRect(-4,-2,10,6);c.fillStyle='#eee8c9';c.fillRect(-4,-3,9,5);c.fillStyle='#967b53';c.fillRect(-1,-2,1,3);c.restore();}
    if(selected){c.fillStyle='#e6f39a';c.beginPath();c.moveTo(-4,-39);c.lineTo(4,-39);c.lineTo(0,-34);c.fill();}
    c.restore();
  }
  drawOverhead(c,p,x,y){
    c.save();c.translate(x,y);c.rotate(p.facing<0?0:Math.PI);
    c.fillStyle='#173d2b70';c.beginPath();c.ellipse(2,3,13,10,0,0,Math.PI*2);c.fill();
    c.fillStyle=p.team===0?'#65a9df':'#e9edda';c.fillRect(-11,-6,22,12);
    c.fillStyle=p.team===0?'#4187c6':'#225d43';c.fillRect(-7,-7,14,15);
    c.fillStyle='#d5a77c';c.fillRect(-4,-12,8,7);c.fillStyle='#564432';c.fillRect(-4,-12,8,3);
    c.fillStyle='#203e40';c.fillRect(-6,8,4,5);c.fillRect(2,8,4,5);c.restore();
  }
  draw(match,dt=1/60,alpha=1){
    if(match.phase==='conversion'&&match.conversion){drawConversion(this,match);return;}
    this.scrumView+=((match.scrum?1:0)-this.scrumView)*(1-Math.exp(-dt*6));
    const c=this.ctx,w=this.width,h=this.height;
    const aim=match.kickAim?match.kickTarget(match.kickAim,match.kickAim.power):null;
    this.kickView+=(((aim||match.loose)?1:0)-this.kickView)*(1-Math.exp(-dt*6));
    const z=this.zoom*(1-this.scrumView*.22)*(1-this.kickView*.2);
    const focus=aim?{x:(aim.tx+match.carrier.x)/2,y:(aim.ty+match.carrier.y)/2}:match.scrum||match.ball||match.carrier;const look=match.state==='playing'&&!match.scrum&&!aim?match.dir(match.possession)*70:0;
    const desired=h/z>=950?440:clamp(focus.y+look,h/(2*z)-35,880-h/(2*z)+35);
    this.camera.x+=((match.scrum?match.scrum.x:aim?focus.x:240)-this.camera.x)*(1-Math.exp(-dt*6));
    this.camera.y+=(desired-this.camera.y)*(1-Math.exp(-dt*5));
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#304c39';c.fillRect(0,0,w,h);c.translate(w/2,h/2);c.scale(z,z);c.translate(-this.camera.x,-this.camera.y);
    c.drawImage(this.field,-160,-80);
    c.textAlign='center';c.font='bold 18px monospace';c.fillStyle='#d4e0b67a';c.fillText(match.attackDir<0?'IRLANDA':'ITALIA',240,62);c.fillText(match.attackDir<0?'ITALIA':'IRLANDA',240,832);
    if(match.scrum&&match.scrum.feed===0){
      const s=match.scrum,receiver=match.players[s.side<0?3:4];
      c.strokeStyle='#e4f398';c.lineWidth=2;c.setLineDash([4,4]);
      c.beginPath();c.moveTo(s.x,s.y);c.lineTo(receiver.x,receiver.y);c.stroke();c.setLineDash([]);
      c.beginPath();c.ellipse(receiver.x,receiver.y+2,18,8,0,0,Math.PI*2);c.stroke();
      c.fillStyle='#e4f398';c.font='bold 8px monospace';c.fillText('USCITA',receiver.x,receiver.y-35);
    }
    if(match.loose){
      const b=match.ball,pulse=14+Math.sin(match.elapsed*8)*2;
      c.strokeStyle='#f3d08b';c.lineWidth=1.5;c.setLineDash([4,4]);c.beginPath();c.ellipse(b.tx,b.ty,pulse,pulse*.55,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
      c.beginPath();c.moveTo(b.tx-5,b.ty);c.lineTo(b.tx+5,b.ty);c.moveTo(b.tx,b.ty-4);c.lineTo(b.tx,b.ty+4);c.stroke();
      c.font='bold 7px monospace';c.fillStyle='#f3e3b1';c.fillText('RECUPERA',b.tx,b.ty-20);
    }
    if(match.possession===0&&['live','contact'].includes(match.phase)&&!match.ball&&!match.kickAim){
      const target=match.target();if(target){
        const long=Math.hypot(target.x-match.carrier.x,target.y-match.carrier.y)>125;
        const risky=match.laneClearance(match.carrier,target)<19,color=risky?'#ffc27b':'#e4f398';
        c.strokeStyle=color;c.lineWidth=1.6;c.setLineDash([4,6]);c.beginPath();c.moveTo(match.carrier.x,match.carrier.y);c.lineTo(target.x,target.y);c.stroke();c.setLineDash([]);
        c.lineWidth=2.5;c.beginPath();c.ellipse(target.x,target.y+2,16,7,0,0,Math.PI*2);c.stroke();
        c.fillStyle='#14271fe8';c.fillRect(target.x-28,target.y-52,56,13);
        c.fillStyle=color;c.font='bold 8px monospace';c.fillText(match.phase==='contact'?'OFFLOAD':risky?'RISCHIO':long?'LUNGO':'PASSA',target.x,target.y-42);
      }
    }
    if(match.state==='playing'&&match.phase==='live'&&(match.possession===1||match.loose)){
      const next=match.bestDefender();
      if(next&&next.id!==match.selected){
        c.strokeStyle='#8ddcff';c.lineWidth=1.7;c.setLineDash([3,3]);c.beginPath();c.ellipse(next.x,next.y+2,15,7,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
        c.fillStyle='#14271fe8';c.fillRect(next.x-25,next.y-52,50,13);c.fillStyle='#8ddcff';c.font='bold 8px monospace';c.fillText('CAMBIA',next.x,next.y-42);
      }
    }
    for(const p of match.players){
      if(p.brace||p.tackleWind>0||p.evade>0){
        c.strokeStyle=p.brace?'#8ddcff':p.evade>0?'#e4f398':'#ffc27b';c.lineWidth=2.5;
        c.beginPath();c.ellipse(p.x,p.y+2,p.brace?20:15,8,0,0,Math.PI*2);c.stroke();
        if(p.brace){c.font='bold 7px monospace';c.fillStyle='#8ddcff';c.fillText('CONTIENI',p.x,p.y-36);}
      }
    }
    if(match.phase==='contact'&&match.contact){
      const p=match.carrier,ratio=clamp(match.contact.remaining/match.contact.duration,0,1);
      c.fillStyle='#14271fe8';c.fillRect(p.x-40,p.y-62,80,18);
      c.fillStyle=ratio>.35?'#e4f398':'#f4c36c';c.fillRect(p.x-38,p.y-46,76*ratio,3);
      c.font='bold 8px monospace';c.fillText(match.possession===0?'PASSA ORA':'CONTATTO',p.x,p.y-50);
    }
    if(match.kickAim){
      const a=match.kickAim,p=match.carrier,{tx,ty}=match.kickTarget(a,a.power);
      const angle=Math.atan2(ty-p.y,tx-p.x);
      c.strokeStyle='#ffe29b';c.lineWidth=2.5;c.setLineDash([7,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(tx,ty);c.stroke();c.setLineDash([]);
      c.fillStyle='#ffe29b';c.beginPath();c.moveTo(tx,ty);c.lineTo(tx-Math.cos(angle-.45)*17,ty-Math.sin(angle-.45)*17);c.lineTo(tx-Math.cos(angle+.45)*17,ty-Math.sin(angle+.45)*17);c.closePath();c.fill();
      c.beginPath();c.ellipse(tx,ty,15,8,0,0,Math.PI*2);c.stroke();
      c.font='bold 8px monospace';c.fillText('MIRA',tx,ty-15);
    }
    const ordered=[...match.players].sort((a,b)=>a.y-b.y);
    for(const p of ordered){const x=p.px+(p.x-p.px)*alpha,y=p.py+(p.y-p.py)*alpha;if(match.scrum){this.drawOverhead(c,p,x,y);continue;}this.drawPlayer(c,p,x,y,p.id===match.selected,p.id===match.carrierId&&!match.ball&&match.phase!=='scrum');}
    if(match.scrum&&match.scrum.feed===0){
      const s=match.scrum;c.strokeStyle='#e4f398';c.lineWidth=2;
      const x=s.x+s.side*80,y=s.y-match.dir(0)*45;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(x,y);c.stroke();
      c.fillStyle='#e4f398';c.beginPath();c.ellipse(x,y,14,6,0,0,Math.PI*2);c.fill();
      c.font='bold 8px monospace';c.fillText('USCITA',x,y-12);c.fillStyle='#f3ecd2';c.fillRect(s.x-5,s.y-2,10,5);
    }
    if(match.ball){const b=match.ball,t=clamp(b.t/b.duration,0,1),height=Math.sin(t*Math.PI)*(match.loose?72:22),ground=match.loose&&t>=1;
      c.fillStyle='#1c342751';c.beginPath();c.ellipse(b.x,b.y+3,5+height*.02,2+height*.008,0,0,Math.PI*2);c.fill();
      c.save();c.translate(b.x,b.y-(ground?Math.abs(Math.sin(b.groundTime*11))*Math.max(0,5-b.groundTime*6):12)-height);c.rotate(t*9);c.fillStyle='#604d31';c.fillRect(-6,-3,12,6);c.fillStyle='#f3ecd2';c.fillRect(-5,-2,10,4);c.fillStyle='#a68b63';c.fillRect(-1,-2,1,4);c.restore();}
    for(const p of match.particles){c.globalAlpha=clamp(p.life*2,0,1);c.fillStyle=p.color;c.fillRect(p.x,p.y,2,2);}c.globalAlpha=1;
    this.drawMap(match);
  }
  drawMap(match){
    const c=this.mc;c.fillStyle='#193e2ceb';c.fillRect(0,0,108,172);c.strokeStyle='#a9c49155';c.lineWidth=1;c.strokeRect(7,8,94,156);c.beginPath();c.moveTo(7,86);c.lineTo(101,86);c.stroke();
    for(const p of match.players){c.fillStyle=p.team===0?'#93c7ee':'#d7e4c1';c.fillRect(p.x/480*94+5,p.y/880*156+6,4,4);}
    const ball=match.ball||match.carrier;c.fillStyle='#f1c975';c.beginPath();c.arc(ball.x/480*94+7,ball.y/880*156+8,3,0,Math.PI*2);c.fill();
    c.strokeStyle='#e8efad66';const view=this.height/this.zoom;c.strokeRect(7,clamp((this.camera.y-view/2)/880*156+8,8,164),94,Math.min(view/880*156,156));
  }
}
