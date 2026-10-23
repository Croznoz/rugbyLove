import {drawBall} from './ball-art.mjs';
import {FIELD,clamp} from './engine.mjs';
import {drawConversion} from './conversion-render.mjs';
import {ART,KITS,polygon} from './art.mjs';
const DIGITS=[
  '01110100011001110101110011000101110','00100011000010000100001000010001110',
  '01110100010000100010001000100011111','11110000010000101110000010000111110',
  '00010001100101010010111110001000010','11111100001111000001000011000101110',
  '00110010001000011110100011000101110','11111000010001000100010000100001000',
  '01110100011000101110100011000101110','01110100011000101111000010001001100'
];
const NUMBER_TILES=new Map();
function drawShirtNumber(c,number,y,kit=KITS[0]){
  const digits=String(number),width=digits.length*6-1,key=kit.patch+kit.number+digits;
  let tile=NUMBER_TILES.get(key);
  if(!tile){
    tile=document.createElement('canvas');tile.width=width+2;tile.height=9;
    const ink=tile.getContext('2d');ink.fillStyle=kit.patch;ink.fillRect(0,0,tile.width,9);ink.fillStyle=kit.number;
    for(let n=0;n<digits.length;n++)for(let i=0;i<35;i++)if(DIGITS[Number(digits[n])][i]==='1')ink.fillRect(1+n*6+i%5,1+Math.floor(i/5),1,1);
    NUMBER_TILES.set(key,tile);
  }
  c.drawImage(tile,Math.round(-width/2)-1,y-1);
}
export class Renderer{
  constructor(canvas,map){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.map=map;this.mc=map.getContext('2d');this.camera={x:FIELD.width/2,y:FIELD.height/2};this.scrumView=0;this.kickView=0;this.width=1;this.height=1;this.zoom=1;this.dpr=1;this.field=this.makeField();this.resize();
  }
  resize(){
    const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=Math.min(window.devicePixelRatio||1,2);
    this.playerScale=window.matchMedia?.('(pointer: coarse)').matches&&Math.min(window.innerWidth||this.width,window.innerHeight||this.height)<650?1.1:1;
    this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.zoom=this.width<650?this.width/FIELD.width:Math.min(1.65,this.width/720);this.ctx.imageSmoothingEnabled=true;
  }
  makeField(){
    const canvas=document.createElement('canvas');canvas.width=FIELD.width+320*FIELD.width/480;canvas.height=FIELD.height+160*FIELD.height/880;
    const c=canvas.getContext('2d');c.scale(FIELD.width/480,FIELD.height/880);c.translate(160,80);
    const fill=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    fill(-160,-80,800,1040,'#a8b999');
    polygon(c,[[-160,-80],[180,-80],[-25,960],[-160,960]],'#b9c5a1');
    polygon(c,[[480,-80],[640,80],[640,960],[500,760]],'#94af93');
    // Quiet paths, a few spectators and faceted trees frame the playing surface.
    for(const side of [-1,1]){
      const x=side<0?-34:494;
      fill(x,-40,20,960,'#d8c9a8');
      for(let i=0;i<12;i++){
        const tx=side<0?-72-(i%3)*24:550+(i%3)*24,ty=i*82-20,size=19+i%3*6;
        polygon(c,[[tx-7,ty],[tx+size*1.6,ty+size],[tx+size*2,ty+size*.6],[tx+5,ty-8]],'#466d6126');
        fill(tx-2,ty-8,4,14,'#8b8c6c');
        polygon(c,[[tx-size,ty-9],[tx-size*.7,ty-size*1.7],[tx,ty-size*2.4],[tx+size,ty-size],[tx+size*.7,ty]],i%4===0?'#d1b481':'#739d87');
        polygon(c,[[tx,ty-size*2.4],[tx+size,ty-size],[tx+size*.7,ty],[tx,ty-9]],i%4===0?'#b5a37b':'#5d8778');
      }
      for(let i=0;i<22;i++){
        const py=i*39+20,px=side<0?-10:484;
        fill(px+3,py+1,8,3,'#496c6333');fill(px,py-6,4,7,['#e7dcc2','#547685','#c58e75'][i%3]);fill(px,py-9,4,3,'#d1ae86');
      }
    }
    fill(0,0,480,880,ART.grass);
    for(let i=0;i<10;i++)fill(34,85+i*71,412,71,i%2?'#89aa82':'#8dae85');
    fill(34,30,412,55,'#7e9f7c');fill(34,795,412,55,'#7e9f7c');
    c.strokeStyle=ART.line;c.lineWidth=1.4;c.strokeRect(34,30,412,820);
    for(const y of [85,241,440,639,795]){c.beginPath();c.moveTo(34,y);c.lineTo(446,y);c.stroke();}
    c.save();c.setLineDash([7,8]);c.lineWidth=1;for(const y of [120,369,511,760]){c.beginPath();c.moveTo(34,y);c.lineTo(446,y);c.stroke();}for(const x of [69,140,340,411]){c.beginPath();c.moveTo(x,85);c.lineTo(x,795);c.stroke();}c.restore();
    c.font='bold 11px monospace';c.fillStyle='#e6dfb08c';c.textAlign='center';
    for(const [y,label] of [[241,'22'],[440,'50'],[639,'22']])for(const x of [49,432]){c.save();c.translate(x,y+(x===49?-5:5));c.rotate(x===49?-Math.PI/2:Math.PI/2);c.fillText(label,0,0);c.restore();}
    c.save();c.translate(240,440);c.rotate(-Math.PI/2);c.fillStyle='#e5d89f12';c.font='bold 34px monospace';c.fillText('R R C',0,12);c.restore();
    for(const y of [85,795])for(const x of [30,450]){fill(x+2,y-20,2,22,'#ece3b8');fill(x+4,y-20,8,6,'#e5b36a');}
    for(const y of [85,795]){
      // Block shadows and ivory H posts, lit from the upper left.
      for(let i=0;i<13;i++){fill(218+i*2,y+i*2,3,3,'#1b353b50');fill(262+i*2,y+i*2,3,3,'#1b353b50');}
      fill(216,y-48,3,48,'#fff0bf');fill(260,y-48,3,48,'#fff0bf');fill(216,y-24,47,3,'#eee4b8');fill(214,y-10,7,10,ART.navy);fill(258,y-10,7,10,ART.navy);
    }
    c.textAlign='center';c.font='bold 12px monospace';c.fillStyle='#d2c69c';c.fillText('R E T R O   R U G B Y   C L U B',240,-26);c.fillText('F O R   T H E   L O V E   O F   T H E   G A M E',240,915);
    return canvas;
  }
  drawPlayer(c,p,x,y,selected,carrier){
    c.save();c.translate(x,y);c.scale(1.08*this.playerScale*p.profile.width,1.08*this.playerScale*p.profile.height);
    polygon(c,[[-8,4],[6,1],[36,20],[28,26]],'#355d5730');
    c.fillStyle='#355d5738';c.beginPath();c.ellipse(0,5,10,4,0,0,Math.PI*2);c.fill();
    if(selected){c.strokeStyle=ART.sun;c.lineWidth=1.5;c.beginPath();c.ellipse(0,4,14,6,0,0,Math.PI*2);c.stroke();}
    if(p.charge>0){c.strokeStyle='#f4ca70';c.lineWidth=2;c.beginPath();c.ellipse(0,4,16,7,0,0,Math.PI*2);c.stroke();c.beginPath();for(const offset of [-5,5]){c.moveTo(offset-p.chargeX*19,4-p.chargeY*19);c.lineTo(offset-p.chargeX*29,4-p.chargeY*29);}c.stroke();}
    if(p.jump>0)c.translate(0,-Math.sin((.6-p.jump)/.6*Math.PI)*22);
    if(p.dive>0){c.rotate(Math.atan2(p.diveY,p.diveX)+Math.PI/2);c.scale(1,.72);}
    else if(p.down>0)c.rotate(Math.PI/2);
    else if(p.charge>0)c.rotate(p.chargeX*.2);
    const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    const kit=p.kit||KITS[p.team],outline=ART.deep,powerful=p.profile.label==='POTENTE';
    const skins=[['#eaa16b','#aa5538','#ffd092'],['#bc7850','#743c32','#e9a46e'],['#efb77d','#b96c43','#ffdaa0']], [skin,skinShade,skinLight]=skins[p.slot%3];
    const run=Math.min(1,Math.hypot(p.vx,p.vy)/40),s=p.kickAnim>0?-5:Math.round(Math.sin(p.anim)*3*run);
    // Simple faceted volumes, with one sunlit face and one shaded face.
    for(const [lx,offset] of [[-7,s],[2,-s]]){
      rect(lx,-11,5,12+offset,skin);rect(lx+3,-11,2,12+offset,skinShade);
      rect(lx,offset,5,9,kit.socks);rect(lx,offset,5,2,kit.trim);
      polygon(c,[[lx-1,8+offset],[lx+5,8+offset],[lx+7,11+offset],[lx-1,11+offset]],outline);
    }
    polygon(c,[[-9,-17],[9,-17],[8,-6],[1,-6],[0,-11],[-2,-6],[-8,-6]],kit.shorts);
    polygon(c,[[2,-17],[9,-17],[8,-6],[2,-6]],kit.shortShade);
    polygon(c,[[-7,-32],[6,-32],[11,-26],[8,-16],[-8,-16],[-11,-26]],kit.body);
    polygon(c,[[-7,-32],[6,-32],[9,-28],[-9,-28]],kit.light);
    polygon(c,[[6,-31],[11,-26],[8,-16],[5,-16]],kit.shade);
    for(const side of [-1,1]){
      const ax=side<0?-12:8,arm=side<0?-s:carrier?-3:s;
      rect(ax,-27,4,7,kit.body);rect(ax,-21+arm,4,9,skin);rect(ax+2,-21+arm,2,9,skinShade);
    }
    rect(-3,-35,6,5,skinShade);
    polygon(c,[[-4,-42],[3,-42],[5,-39],[4,-34],[-3,-34],[-5,-38]],skin);
    polygon(c,[[2,-42],[5,-39],[4,-34],[1,-34]],skinShade);
    const hair=['#69564a','#3c4641','#967252'][p.slot%3];
    polygon(c,[[-4,-42],[3,-43],[5,-40],[2,-39],[-5,-40]],hair);
    if(p.facing<0)rect(-4,-40,7,4,hair);
    if(powerful){rect(-5,-41,9,3,kit.shade);rect(-5,-40,2,5,kit.body);rect(3,-40,2,5,kit.shade);}
    if(carrier)drawBall(c,12,-19,7,-.5);
    // Number is the last layer, so arms and the ball never cover it.
    drawShirtNumber(c,p.number,-27,kit);c.restore();
  }
  drawStamina(c,p,x,y){
    // Draw after the players, outside their pose transforms: the meter stays horizontal.
    const top=y-43*1.08*this.playerScale*p.profile.height-12;
    const energy=clamp(p.energy/p.profile.stamina,0,1),width=30*p.profile.stamina/100;
    c.save();c.translate(x,top);
    c.fillStyle='#e6f39a';c.beginPath();c.moveTo(-5,-11);c.lineTo(5,-11);c.lineTo(0,-5);c.fill();
    c.fillStyle=ART.ink;c.fillRect(-width/2-2,-2,width+4,8);
    c.fillStyle='#455a50';c.fillRect(-width/2,0,width,4);
    c.fillStyle=energy>.55?'#b8de78':energy>.25?'#efc56e':'#ef947f';
    c.fillRect(-width/2,0,width*energy,4);c.restore();
  }
  drawOverhead(c,p,x,y){
    c.save();c.translate(x,y);c.scale(.8*this.playerScale*p.profile.width,.8*this.playerScale*p.profile.height);c.rotate(p.facing<0?0:Math.PI);
    c.fillStyle='#173d2b70';c.beginPath();c.ellipse(2,3,13,10,0,0,Math.PI*2);c.fill();
    c.fillStyle=(p.kit||KITS[p.team]).light;c.fillRect(-11,-6,22,12);
    c.fillStyle=(p.kit||KITS[p.team]).body;c.fillRect(-7,-7,14,15);
    c.fillStyle=(p.kit||KITS[p.team]).shade;c.fillRect(4,-5,3,12);c.fillStyle='#eee9d2';c.fillRect(-10,-3,3,3);c.fillRect(7,-3,3,3);c.fillRect(-3,-7,6,2);
    c.fillStyle=['#d5a77c','#b67c54','#ecc29a'][p.slot%3];c.fillRect(-4,-12,8,7);c.fillStyle='#564432';c.fillRect(-4,-12,8,3);
    c.fillStyle='#203e40';c.fillRect(-6,8,4,5);c.fillRect(2,8,4,5);
    // Keep the number upright for either scrum direction.
    c.save();c.rotate(p.facing<0?0:Math.PI);drawShirtNumber(c,p.number,-2,p.kit||KITS[p.team]);c.restore();c.restore();
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
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.fillStyle='#314c4b';c.fillRect(0,0,w,h);c.translate(w/2,h/2);c.scale(z,z);c.translate(-this.camera.x,-this.camera.y);
    c.drawImage(this.field,-160*FIELD.width/480,-80*FIELD.height/880);
    const rush=match.breakawayIntensity();
    if(rush>0){
      const p=match.carrier,speed=Math.hypot(p.vx,p.vy)||1,dx=p.vx/speed,dy=p.vy/speed;
      c.save();c.fillStyle=p.team===0?'#b4ddff':'#e4f398';
      // Trail sits beneath the runner so the shirt number remains unobstructed.
      for(let i=1;i<=5;i++){
        c.globalAlpha=(1-i/6)*rush*.55;
        for(const side of [-1,1])c.fillRect(p.x-dx*i*9+dy*side*9-2,p.y-dy*i*9-dx*side*9,4,6);
      }
      c.globalAlpha=.35+ rush*.3;
      for(const side of [FIELD.left-12,FIELD.right+8])for(let i=0;i<10;i++){
        const y=p.y-100+i*22,hop=Math.sin(match.elapsed*9+i*1.7)>0?4:0;
        c.fillRect(side,y-hop,4,4);
      }
      c.restore();
    }
    c.textAlign='center';c.font='bold 18px monospace';c.fillStyle='#d4e0b67a';c.fillText(match.teams[match.attackDir<0?1:0].name,FIELD.width/2,FIELD.top-23);c.fillText(match.teams[match.attackDir<0?0:1].name,FIELD.width/2,FIELD.bottom+37);
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
      const runner=match.loopRun&&match.players[match.loopRun.from],point=runner&&match.loopPoint(runner,match.carrier);
      if(point){
        c.strokeStyle='#8ddcff99';c.lineWidth=1.5;c.setLineDash([3,5]);
        c.beginPath();c.moveTo(runner.x,runner.y);c.lineTo(point.x,point.y);c.stroke();c.setLineDash([]);
        if((runner.y-match.carrier.y)*match.dir(0)<=0&&Math.hypot(runner.x-match.carrier.x,runner.y-match.carrier.y)<320){
          c.strokeStyle='#8ddcff';c.beginPath();c.ellipse(runner.x,runner.y+3,15,7,0,0,Math.PI*2);c.stroke();
          c.fillStyle='#142238ed';c.fillRect(runner.x-25,runner.y+18,50,13);
          c.fillStyle='#8ddcff';c.font='bold 8px monospace';c.fillText('UNO-DUE',runner.x,runner.y+28);
        }
      }
      const target=match.target();if(target){
        const long=Math.hypot(target.x-match.carrier.x,target.y-match.carrier.y)>125;
        const risky=match.laneClearance(match.carrier,target)<19,color=risky?'#ffc27b':'#e4f398';
        c.strokeStyle=color;c.lineWidth=1.6;c.setLineDash([4,6]);c.beginPath();c.moveTo(match.carrier.x,match.carrier.y);c.lineTo(target.x,target.y);c.stroke();c.setLineDash([]);
        c.lineWidth=2.5;c.beginPath();c.ellipse(target.x,target.y+2,16,7,0,0,Math.PI*2);c.stroke();
        const returning=!!match.loopPoint(target,match.carrier),labelY=returning?target.y+28:target.y-56;
        c.fillStyle='#142238ed';c.fillRect(target.x-28,labelY-10,56,13);
        c.fillStyle=color;c.font='bold 8px monospace';c.fillText(match.phase==='contact'?'OFFLOAD':risky?'RISCHIO':returning?'UNO-DUE':long?'LUNGO':'PASSA',target.x,labelY);
      }
    }
    if(match.state==='playing'&&match.phase==='live'&&(match.possession===1||match.loose)){
      const next=match.bestDefender();
      if(next&&next.id!==match.selected){
        c.strokeStyle='#8ddcff';c.lineWidth=1.7;c.setLineDash([3,3]);c.beginPath();c.ellipse(next.x,next.y+2,15,7,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
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
      c.fillStyle='#142238ed';c.fillRect(p.x-40,p.y-94,80,18);
      c.fillStyle=ratio>.35?'#e4f398':'#f4c36c';c.fillRect(p.x-38,p.y-78,76*ratio,3);
      c.font='bold 8px monospace';c.fillText(match.possession===0?'PASSA ORA':'CONTATTO',p.x,p.y-82);
    }
    if(match.kickAim){
      const a=match.kickAim,p=match.carrier,{tx,ty}=match.kickTarget(a,a.power);
      const angle=Math.atan2(ty-p.y,tx-p.x);
      c.strokeStyle='#ffe29b';c.lineWidth=2.5;c.setLineDash([7,5]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(tx,ty);c.stroke();c.setLineDash([]);
      c.fillStyle='#ffe29b';c.beginPath();c.moveTo(tx,ty);c.lineTo(tx-Math.cos(angle-.45)*17,ty-Math.sin(angle-.45)*17);c.lineTo(tx-Math.cos(angle+.45)*17,ty-Math.sin(angle+.45)*17);c.closePath();c.fill();
      c.beginPath();c.ellipse(tx,ty,15,8,0,0,Math.PI*2);c.stroke();
      c.font='bold 8px monospace';c.fillText(!a.kickoff&&a.power<=.32?'RASOTERRA':'MIRA',tx,ty-15);
    }
    if(match.contestWindow()){
      const p=match.controlled,b=match.ball,remaining=b.duration-b.t,good=Math.abs(remaining-.35)<.15;
      c.strokeStyle=good?'#b8de78':'#f4c36c';c.lineWidth=2;c.beginPath();c.ellipse(p.x,p.y+4,19,8,0,0,Math.PI*2);c.stroke();
      c.fillStyle=c.strokeStyle;c.font='bold 8px monospace';c.textAlign='center';c.fillText('CONTENDI',p.x,p.y-86);
    }
    const ordered=[...match.players].sort((a,b)=>a.y-b.y);
    for(const p of ordered){const x=p.px+(p.x-p.px)*alpha,y=p.py+(p.y-p.py)*alpha;if(match.scrum){this.drawOverhead(c,p,x,y);continue;}this.drawPlayer(c,p,x,y,p.id===match.selected,p.id===match.carrierId&&!match.ball&&match.phase!=='scrum');}
    if(!match.scrum){
      const p=match.controlled;this.drawStamina(c,p,p.px+(p.x-p.px)*alpha,p.py+(p.y-p.py)*alpha);
      if(match.state==='playing'&&match.phase==='live'&&(match.possession===1||match.loose)){
        const next=match.bestDefender();
        if(next&&next.id!==match.selected){
          c.fillStyle='#8ddcff';c.beginPath();c.moveTo(next.x-5,next.y-68);c.lineTo(next.x+5,next.y-68);c.lineTo(next.x,next.y-60);c.closePath();c.fill();
        }
      }
    }
    if(match.scrum&&match.scrum.feed===0){
      const s=match.scrum;c.strokeStyle='#e4f398';c.lineWidth=2;
      const x=s.x+s.side*80,y=s.y-match.dir(0)*45;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(x,y);c.stroke();
      c.fillStyle='#e4f398';c.beginPath();c.ellipse(x,y,14,6,0,0,Math.PI*2);c.fill();
      c.font='bold 8px monospace';c.fillText('USCITA',x,y-12);c.fillStyle='#f3ecd2';c.fillRect(s.x-5,s.y-2,10,5);
    }
    if(match.ball){const b=match.ball,t=clamp(b.t/b.duration,0,1),height=b.kind==='kick'?(b.z||0):b.grubber?Math.abs(Math.sin(t*Math.PI*3))*4:Math.sin(t*Math.PI)*(b.kind==='fumble'?12:match.loose?72:22),ground=match.loose&&t>=1;
      c.fillStyle='#1c342751';c.beginPath();c.ellipse(b.x,b.y+3,5+height*.02,2+height*.008,0,0,Math.PI*2);c.fill();
      drawBall(c,b.x,b.y-(b.kind==='kick'?2:ground?Math.abs(Math.sin(b.groundTime*11))*Math.max(0,5-b.groundTime*6):b.grubber?2:12)-height,7,b.kind==='kick'?(b.rotation||0):t*9);}
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
    if(match.phase==='try'){
      const t=2.2-match.phaseTime,p=match.carrier;
      c.save();c.strokeStyle='#ffe29b';c.lineWidth=3;c.globalAlpha=Math.max(0,1-t/1.1);
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6,r=24+t*90;
        c.beginPath();c.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.6);
        c.lineTo(p.x+Math.cos(a)*(r+16),p.y+Math.sin(a)*(r+16)*.6);c.stroke();
      }
      // Pixel confetti at the screen edges leaves the score and players readable.
      c.setTransform(this.dpr,0,0,this.dpr,0,0);c.globalAlpha=clamp(match.phaseTime/.5,0,1);
      for(let i=0;i<44;i++){
        const side=i%2,spread=12+(i*17)%Math.max(24,w*.22),x=side?w-spread:spread;
        const y=((i*47)%Math.max(1,h)+t*(35+i%5*12))%(h+20)-10;
        c.fillStyle=['#ffe29b','#b4ddff','#e4f398','#fff5d6'][i%4];
        c.fillRect(x+Math.sin(t*5+i)*5,y,3+i%3,3+i%2*3);
      }
      c.restore();
    }
    this.drawMap(match);
  }
  drawMap(match){
    const c=this.mc;c.fillStyle='#142537eb';c.fillRect(0,0,108,172);c.strokeStyle='#d2c79b55';c.lineWidth=1;c.strokeRect(7,8,94,156);c.beginPath();c.moveTo(7,86);c.lineTo(101,86);c.stroke();
    for(const p of match.players){c.fillStyle=p.kit.light;c.fillRect(p.x/FIELD.width*94+5,p.y/FIELD.height*156+6,4,4);}
    const ball=match.ball||match.carrier;c.fillStyle='#f1c975';c.beginPath();c.arc(ball.x/FIELD.width*94+7,ball.y/FIELD.height*156+8,3,0,Math.PI*2);c.fill();
    c.strokeStyle='#e8efad66';const view=this.height/this.zoom;c.strokeRect(7,clamp((this.camera.y-view/2)/FIELD.height*156+8,8,164),94,Math.min(view/FIELD.height*156,156));
  }
}
