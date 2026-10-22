import {FIELD,clamp} from './engine.mjs';
import {drawConversion} from './conversion-render.mjs';
const DIGITS=['111101101101111','010110010010111','111001111100111','111001111001111','101101111001001','111100111001111','111100111101111','111001001001001','111101111101111','111101111001111'];
// A clear central patch keeps both front and back numbers distinct from kit details.
function drawShirtNumber(c,number,y){
  const digits=String(number),width=digits.length*4-1,start=Math.round(-width/2);
  c.fillStyle='#17352f';c.fillRect(start-1,y-1,width+2,7);
  c.fillStyle='#fff5d6';
  for(let n=0;n<digits.length;n++)for(let i=0;i<15;i++)if(DIGITS[Number(digits[n])][i]==='1')c.fillRect(start+n*4+i%3,y+Math.floor(i/3),1,1);
}
export class Renderer{
  constructor(canvas,map){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.map=map;this.mc=map.getContext('2d');this.camera={x:FIELD.width/2,y:FIELD.height/2};this.scrumView=0;this.kickView=0;this.width=1;this.height=1;this.zoom=1;this.dpr=1;this.field=this.makeField();this.resize();
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.zoom=this.width<650?this.width/FIELD.width:Math.min(1.65,this.width/720);this.ctx.imageSmoothingEnabled=false;
  }
  makeField(){
    const canvas=document.createElement('canvas');canvas.width=FIELD.width+320*FIELD.width/480;canvas.height=FIELD.height+160*FIELD.height/880;const c=canvas.getContext('2d');c.scale(FIELD.width/480,FIELD.height/880);c.translate(160,80);
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
    c.save();c.translate(x,y);c.scale(1.35*p.profile.width,1.35*p.profile.height);c.fillStyle='#173d2b62';c.beginPath();c.ellipse(4,4,12,5,0,0,Math.PI*2);c.fill();
    if(selected){c.strokeStyle='#e5f29d';c.lineWidth=1.5;c.beginPath();c.ellipse(0,3,14,6,0,0,Math.PI*2);c.stroke();}
    if(p.charge>0){c.strokeStyle='#f4ca70';c.lineWidth=2;c.beginPath();c.ellipse(0,3,16,7,0,0,Math.PI*2);c.stroke();c.beginPath();for(const offset of [-5,5]){c.moveTo(offset-p.chargeX*19,4-p.chargeY*19);c.lineTo(offset-p.chargeX*29,4-p.chargeY*29);}c.stroke();}
    if(p.dive>0){c.rotate(Math.atan2(p.diveY,p.diveX)+Math.PI/2);c.scale(1,.72);}
    else if(p.down>0)c.rotate(Math.PI/2);
    else if(p.charge>0)c.rotate(p.chargeX*.2);
    const step=Math.sin(p.anim),run=Math.min(1,Math.hypot(p.vx,p.vy)/40),s=p.kickAnim>0?-7:Math.round(step*3*run);
    const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    const home=p.team===0,outline='#203a35',body=home?'#4187c6':'#225d43',light=home?'#75b8e8':'#4a9166',shade=home?'#286398':'#17452f',trim=home?'#d6e8e3':'#eee9d2';
    const skins=[['#d5a77c','#a67551'],['#b67c54','#825335'],['#ecc29a','#bf8e66']], [skin,skinShade]=skins[p.slot%3];
    const powerful=p.profile.label==='POTENTE';
    // Stepped silhouettes and two-tone limbs remain readable at phone scale.
    for(const [lx,offset] of [[-7,s],[2,-s]]){
      rect(lx-1,-3,7,12+offset,outline);rect(lx,-2,5,8+offset,skin);rect(lx+3,-2,2,8+offset,skinShade);
      rect(lx,3+offset,5,5,home?'#91bfdf':'#eee9d2');rect(lx,4+offset,5,1,body);
      rect(lx-1,8+offset,7,3,'#182e2b');rect(lx,8+offset,4,1,'#6b7970');
      rect(lx+1,9+offset,2,1,trim);rect(lx,11+offset,1,1,outline);rect(lx+4,11+offset,1,1,outline);
    }
    rect(-9,-9,18,8,outline);rect(-8,-8,16,6,home?'#243e58':'#dddac8');
    rect(-8,-8,16,1,trim);rect(-1,-6,2,5,outline);rect(5,-7,2,4,home?'#3a5871':'#b9bba6');
    rect(-9,-22,18,16,outline);rect(-11,-21,22,7,outline);
    rect(-8,-21,16,14,body);rect(-8,-21,16,3,light);rect(5,-18,3,11,shade);
    rect(-8,-17,2,9,light);rect(-8,-8,16,1,shade);
    rect(-7,-20,3,1,trim);rect(4,-20,3,1,trim);
    rect(-7,-10,2,2,shade);rect(3,-9,2,1,light);
    for(const side of [-1,1]){
      const ax=side<0?-12:8,arm=side<0?-s:carrier?-2:s;
      rect(ax,-20,4,8,body);rect(ax,-20,4,2,light);rect(ax,-14,4,2,trim);
      rect(ax,-12+arm,4,7,skinShade);rect(ax,-12+arm,3,5,skin);
      rect(ax,-7+arm,3,1,trim);rect(ax,-6+arm,2,1,skinShade);
      if(powerful)rect(ax,-8+arm,4,2,trim);
    }
    rect(-3,-23,6,3,skinShade);rect(-4,-21,3,2,trim);rect(1,-21,3,2,trim);rect(-1,-20,2,2,shade);
    // Leave the centre of the shirt clear in every facing direction.
    if(p.facing>0){rect(-7,-19,2,2,trim);rect(-7,-18,1,1,home?'#b7443b':'#d5b860');}
    rect(-5,-30,10,9,outline);rect(-5,-29,10,7,skin);rect(3,-28,2,6,skinShade);
    rect(-6,-27,2,3,skin);rect(5,-27,2,3,skinShade);
    const hair=['#564432','#252d28','#795637'][p.slot%3];
    rect(-5,-30,10,3,hair);rect(-5,-28,2,2,hair);
    if(p.slot%3===0)rect(-3,-31,6,1,hair);
    if(p.slot%3===1)rect(3,-28,2,3,hair);
    if(powerful){rect(-5,-30,10,3,home?'#29455d':'#d4d7c7');rect(-6,-28,2,5,shade);rect(4,-28,2,5,shade);rect(-1,-30,2,3,trim);}
    if(p.facing>0){rect(-3,-25,1,1,outline);rect(2,-25,1,1,outline);rect(0,-24,1,2,skinShade);rect(-1,-22,3,1,skinShade);}
    else rect(-4,-27,8,3,hair);
    if(carrier){c.save();c.translate(11,-11);c.rotate(-.5);rect(-6,-2,12,5,'#664c35');rect(-5,-3,10,5,'#eee8c9');rect(-3,-3,2,5,'#b7a479');rect(2,-3,1,5,'#b7a479');rect(-1,-2,2,1,'#fff8dc');c.restore();}
    drawShirtNumber(c,p.number,-16);
    c.restore();
  }
  drawStamina(c,p,x,y){
    // Draw after the players, outside their pose transforms: the meter stays horizontal.
    const top=y-30*1.35*p.profile.height-12;
    const energy=clamp(p.energy/p.profile.stamina,0,1),width=30*p.profile.stamina/100;
    c.save();c.translate(x,top);
    c.fillStyle='#e6f39a';c.beginPath();c.moveTo(-5,-11);c.lineTo(5,-11);c.lineTo(0,-5);c.fill();
    c.fillStyle='#142d23';c.fillRect(-width/2-2,-2,width+4,8);
    c.fillStyle='#49664d';c.fillRect(-width/2,0,width,4);
    c.fillStyle=energy>.55?'#b8de78':energy>.25?'#efc56e':'#ef947f';
    c.fillRect(-width/2,0,width*energy,4);c.restore();
  }
  drawOverhead(c,p,x,y){
    c.save();c.translate(x,y);c.scale(p.profile.width,p.profile.height);c.rotate(p.facing<0?0:Math.PI);
    c.fillStyle='#173d2b70';c.beginPath();c.ellipse(2,3,13,10,0,0,Math.PI*2);c.fill();
    c.fillStyle=p.team===0?'#65a9df':'#e9edda';c.fillRect(-11,-6,22,12);
    c.fillStyle=p.team===0?'#4187c6':'#225d43';c.fillRect(-7,-7,14,15);
    c.fillStyle=p.team===0?'#286398':'#17452f';c.fillRect(4,-5,3,12);c.fillStyle='#eee9d2';c.fillRect(-10,-3,3,3);c.fillRect(7,-3,3,3);c.fillRect(-3,-7,6,2);
    c.fillStyle=['#d5a77c','#b67c54','#ecc29a'][p.slot%3];c.fillRect(-4,-12,8,7);c.fillStyle='#564432';c.fillRect(-4,-12,8,3);
    c.fillStyle='#203e40';c.fillRect(-6,8,4,5);c.fillRect(2,8,4,5);
    // Keep the number upright for either scrum direction.
    c.save();c.rotate(p.facing<0?0:Math.PI);drawShirtNumber(c,p.number,-2);c.restore();c.restore();
  }
  draw(match,dt=1/60,alpha=1){
    if(match.phase==='conversion'&&match.conversion){drawConversion(this,match);return;}
    this.scrumView+=((match.scrum?1:0)-this.scrumView)*(1-Math.exp(-dt*6));
    const c=this.ctx,w=this.width,h=this.height;
    const aim=match.kickAim?match.kickTarget(match.kickAim,match.kickAim.power):null;
    this.kickView+=(((aim||match.ball?.kind==='kick')?1:0)-this.kickView)*(1-Math.exp(-dt*6));
    const z=this.zoom*(1-this.scrumView*.22)*(1-this.kickView*.2);
    const focus=aim?{x:(aim.tx+match.carrier.x)/2,y:(aim.ty+match.carrier.y)/2}:match.scrum||match.ball||match.carrier;const look=match.state==='playing'&&!match.scrum&&!aim?match.dir(match.possession)*70:0;
    const desired=h/z>=FIELD.height+70?FIELD.height/2:clamp(focus.y+look,h/(2*z)-35,FIELD.height-h/(2*z)+35);
    this.camera.x+=((match.scrum?match.scrum.x:aim?focus.x:FIELD.width/2)-this.camera.x)*(1-Math.exp(-dt*6));
    this.camera.y+=(desired-this.camera.y)*(1-Math.exp(-dt*5));
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#304c39';c.fillRect(0,0,w,h);c.translate(w/2,h/2);c.scale(z,z);c.translate(-this.camera.x,-this.camera.y);
    c.drawImage(this.field,-160*FIELD.width/480,-80*FIELD.height/880);
    c.textAlign='center';c.font='bold 18px monospace';c.fillStyle='#d4e0b67a';c.fillText(match.attackDir<0?'IRLANDA':'ITALIA',FIELD.width/2,FIELD.top-23);c.fillText(match.attackDir<0?'ITALIA':'IRLANDA',FIELD.width/2,FIELD.bottom+37);
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
        c.fillStyle='#14271fe8';c.fillRect(target.x-28,target.y-66,56,13);
        c.fillStyle=color;c.font='bold 8px monospace';c.fillText(match.phase==='contact'?'OFFLOAD':risky?'RISCHIO':long?'LUNGO':'PASSA',target.x,target.y-56);
      }
    }
    if(match.state==='playing'&&match.phase==='live'&&(match.possession===1||match.loose)){
      const next=match.bestDefender();
      if(next&&next.id!==match.selected){
        c.strokeStyle='#8ddcff';c.lineWidth=1.7;c.setLineDash([3,3]);c.beginPath();c.ellipse(next.x,next.y+2,15,7,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
        c.fillStyle='#14271fe8';c.fillRect(next.x-25,next.y-66,50,13);c.fillStyle='#8ddcff';c.font='bold 8px monospace';c.fillText('CAMBIA',next.x,next.y-56);
      }
    }
    if(match.perfectTackleReady()){
      const p=match.carrier;
      c.strokeStyle='#ffe29b';c.lineWidth=2.5;
      c.beginPath();c.ellipse(p.x,p.y+3,21,10,0,0,Math.PI*2);c.stroke();
      c.fillStyle='#14271ff0';c.fillRect(p.x-35,p.y-78,70,15);
      c.fillStyle='#ffe29b';c.font='bold 9px monospace';c.fillText('PLACCA ORA',p.x,p.y-67);
    }
    for(const p of match.players){
      if(p.brace||p.tackleWind>0||p.evade>0){
        c.strokeStyle=p.brace?'#8ddcff':p.evade>0?'#e4f398':'#ffc27b';c.lineWidth=2.5;
        c.beginPath();c.ellipse(p.x,p.y+2,p.brace?20:15,8,0,0,Math.PI*2);c.stroke();
        if(p.brace){c.font='bold 7px monospace';c.fillStyle='#8ddcff';c.fillText('CONTIENI',p.x,p.y-49);}
      }
    }
    if(match.phase==='contact'&&match.contact){
      const p=match.carrier,ratio=clamp(match.contact.remaining/match.contact.duration,0,1);
      c.fillStyle='#14271fe8';c.fillRect(p.x-40,p.y-94,80,18);
      c.fillStyle=ratio>.35?'#e4f398':'#f4c36c';c.fillRect(p.x-38,p.y-78,76*ratio,3);
      c.font='bold 8px monospace';c.fillText(match.possession===0?'PASSA ORA':'CONTATTO',p.x,p.y-82);
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
    if(!match.scrum){const p=match.controlled;this.drawStamina(c,p,p.px+(p.x-p.px)*alpha,p.py+(p.y-p.py)*alpha);}
    if(match.scrum&&match.scrum.feed===0){
      const s=match.scrum;c.strokeStyle='#e4f398';c.lineWidth=2;
      const x=s.x+s.side*80,y=s.y-match.dir(0)*45;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(x,y);c.stroke();
      c.fillStyle='#e4f398';c.beginPath();c.ellipse(x,y,14,6,0,0,Math.PI*2);c.fill();
      c.font='bold 8px monospace';c.fillText('USCITA',x,y-12);c.fillStyle='#f3ecd2';c.fillRect(s.x-5,s.y-2,10,5);
    }
    if(match.ball){const b=match.ball,t=clamp(b.t/b.duration,0,1),height=Math.sin(t*Math.PI)*(b.kind==='fumble'?12:match.loose?72:22),ground=match.loose&&t>=1;
      c.fillStyle='#1c342751';c.beginPath();c.ellipse(b.x,b.y+3,5+height*.02,2+height*.008,0,0,Math.PI*2);c.fill();
      c.save();c.translate(b.x,b.y-(ground?Math.abs(Math.sin(b.groundTime*11))*Math.max(0,5-b.groundTime*6):12)-height);c.rotate(t*9);c.fillStyle='#604d31';c.fillRect(-6,-3,12,6);c.fillStyle='#f3ecd2';c.fillRect(-5,-2,10,4);c.fillStyle='#a68b63';c.fillRect(-1,-2,1,4);c.restore();}
    for(const p of match.particles){c.globalAlpha=clamp(p.life*2,0,1);c.fillStyle=p.color;c.fillRect(p.x,p.y,2,2);}c.globalAlpha=1;
    if(match.perfectImpact){
      const impact=match.perfectImpact,t=1-impact.remaining/.5,r=20+t*48;
      c.save();c.globalAlpha=1-t;c.strokeStyle='#ffe29b';c.lineWidth=3*(1-t)+1;
      c.beginPath();c.ellipse(impact.x,impact.y,r,r*.55,0,0,Math.PI*2);c.stroke();
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;c.beginPath();
        c.moveTo(impact.x+Math.cos(a)*(r+5),impact.y+Math.sin(a)*(r+5)*.55);
        c.lineTo(impact.x+Math.cos(a)*(r+13),impact.y+Math.sin(a)*(r+13)*.55);c.stroke();
      }
      c.restore();
    }
    this.drawMap(match);
  }
  drawMap(match){
    const c=this.mc;c.fillStyle='#193e2ceb';c.fillRect(0,0,108,172);c.strokeStyle='#a9c49155';c.lineWidth=1;c.strokeRect(7,8,94,156);c.beginPath();c.moveTo(7,86);c.lineTo(101,86);c.stroke();
    for(const p of match.players){c.fillStyle=p.team===0?'#93c7ee':'#d7e4c1';c.fillRect(p.x/FIELD.width*94+5,p.y/FIELD.height*156+6,4,4);}
    const ball=match.ball||match.carrier;c.fillStyle='#f1c975';c.beginPath();c.arc(ball.x/FIELD.width*94+7,ball.y/FIELD.height*156+8,3,0,Math.PI*2);c.fill();
    c.strokeStyle='#e8efad66';const view=this.height/this.zoom;c.strokeRect(7,clamp((this.camera.y-view/2)/FIELD.height*156+8,8,164),94,Math.min(view/FIELD.height*156,156));
  }
}
