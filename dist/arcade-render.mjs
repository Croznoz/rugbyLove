export function drawArcade(c,run){
  c.fillStyle='#86a780';c.fillRect(0,0,420,560);
  const offset=run.distance%100;
  for(let y=offset-100;y<560;y+=100){c.fillStyle='#7d9f78';c.fillRect(22,y,376,50);}
  c.fillStyle='#667e5a';c.fillRect(0,0,22,560);c.fillRect(398,0,22,560);
  c.strokeStyle='#eee9cd';c.lineWidth=2;c.strokeRect(22,-2,376,564);
  c.setLineDash([8,12]);c.beginPath();c.moveTo(115,0);c.lineTo(115,560);c.moveTo(305,0);c.lineTo(305,560);c.stroke();c.setLineDash([]);
  const toTry=(run.tries+1)*1600-run.distance,tryY=run.y-toTry;
  if(tryY>-40){c.fillStyle='#f4e7b9';c.fillRect(22,tryY,376,5);c.font='14px monospace';c.textAlign='center';c.fillText('M E T A',210,tryY-12);}
  function player(x,y,home,down=false){
    c.save();c.translate(x,y);if(down)c.rotate(Math.PI/2);
    c.fillStyle='#283f343f';c.beginPath();c.ellipse(4,8,13,7,0,0,Math.PI*2);c.fill();
    const step=run.state==='playing'?Math.sin(run.time*17+(home?0:x)) * 3:0;
    c.fillStyle='#243c42';c.fillRect(-7,7,5,9+step);c.fillRect(2,7,5,9-step);
    c.fillStyle=home?'#345b82':'#f0dfb5';c.fillRect(-11,-7,22,17);
    c.fillStyle=home?'#adc4cc':'#ad765c';c.fillRect(-11,-4,22,4);
    c.fillStyle='#bb8e69';c.fillRect(-15,-5,4,12);c.fillRect(11,-5,4,12);
    c.fillStyle='#cfa17b';c.fillRect(-6,-17,12,10);c.fillStyle='#3a3d32';c.fillRect(-6,-18,12,3);
    if(home){c.fillStyle='#f7edcf';c.beginPath();c.ellipse(12,2,4,7,-.4,0,Math.PI*2);c.fill();}
    c.restore();
  }
  for(const e of run.enemies)player(e.x,e.y,false,e.down);
  if(run.sprint>0){c.strokeStyle='#efe4ac';c.lineWidth=2;for(const dx of [-8,0,8]){c.beginPath();c.moveTo(run.x+dx,run.y+22);c.lineTo(run.x+dx,run.y+40);c.stroke();}}
  c.strokeStyle=run.charge>0?'#f8cf76':run.dodge>0?'#d9f4ed':'#e3d9a5';c.lineWidth=run.charge>0?4:2;
  c.beginPath();c.ellipse(run.x,run.y+2,20,24,0,0,Math.PI*2);c.stroke();
  player(run.x,run.y,true,run.state==='over');
}
