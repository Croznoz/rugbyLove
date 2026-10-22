// Shared sunset palette. All match artwork is procedural and available offline.
export const ART=Object.freeze({
  ink:'#11192e',deep:'#080e20',navy:'#1b2843',slate:'#3e5966',steel:'#657c7c',
  cream:'#f4ebc2',sun:'#f7d99b',amber:'#dfab68',rust:'#a86443',
  grass:'#66813d',grassLight:'#8d9f4a',grassDark:'#365b38',line:'#e1dfae'
});
export const KITS=Object.freeze([
  Object.freeze({body:'#19243e',light:'#34445b',shade:'#0b1228',trim:'#f5ecc7',shorts:'#eee5b9',shortLight:'#fff4cd',shortShade:'#b9b085',socks:'#141e37',sockLight:'#2d3e53',number:'#fff4cc',patch:'#141e35'}),
  Object.freeze({body:'#e7dfb4',light:'#fff2c9',shade:'#b5b28b',trim:'#243b3d',shorts:'#1b2c37',shortLight:'#3d5153',shortShade:'#0d1b2b',socks:'#e1dab1',sockLight:'#fff0c5',number:'#16243a',patch:'#eee6ba'})
]);

// Behind-the-posts stadium: square-edged hills, cantilever roof and late sun.
// This is cached by the renderer, never regenerated in the animation loop.
export function paintStadium(c,w,h){
  const horizon=Math.round(h*.42),fill=(x,y,ww,hh,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(ww),Math.ceil(hh));};
  fill(0,0,w,h,ART.grass);
  const sky=['#f4d7a0','#f8e2af','#faedc6','#f4e9c1','#d4d8b6'];
  for(let row=0;row<5;row++)fill(0,row*horizon/5,w,horizon/5+1,sky[row]);
  for(let i=0;i<65;i++)fill((i*113)%w,(i*29)%Math.max(1,horizon*.8),9+i%5*7,2+i%3,'#fff0c32b');
  // Misty hills and distant stands recede into the golden sky.
  for(let layer=0;layer<3;layer++)for(let i=0;i<Math.ceil(w/16)+1;i++){
    const y=horizon-(20+layer*6)-Math.sin(i*.45+layer)*h*.045;
    fill(i*16,y,17,horizon-y,['#c7cbb0','#a4b6a5','#7f9992'][layer]);
  }
  for(const fraction of [.06,.26,.46,.72]){
    const x=w*fraction,top=h*.14+(fraction>.4?h*.08:0);
    fill(x,top,2,horizon-top,'#879d94');fill(x-3,top-9,8,10,'#a7b6a0');
    fill(x-2,top-8,4,2,'#eee6bc');fill(x-2,top-4,4,2,'#d5d7b1');
  }
  // Stepped grandstand silhouette, ivory terraces and pixel spectators.
  for(let i=0;i<18;i++){
    const x=w*.52+i*w*.027,y=horizon-h*(.035+i*.009);
    fill(x,y,w*.035,horizon-y,'#25394d');
  }
  for(let tier=0;tier<3;tier++){
    const y=horizon-h*(.025+tier*.055),x=w*(.54+tier*.045);
    fill(x,y,w-x,3,'#d5c58f');fill(x,y+3,w-x,2,'#5f7775');
    for(let i=0;i<Math.ceil((w-x)/5);i++){
      const seed=(i*13+tier*29)%7;
      fill(x+i*5,y+5,2,3,['#a87d55','#e3c78d','#19253b','#596566','#ceb67e','#384652','#775841'][seed]);
    }
  }
  // Roof reaches in from the right like the reference, with visible steel supports.
  c.fillStyle='#304c5c';c.beginPath();c.moveTo(w*.45,0);c.lineTo(w,0);c.lineTo(w,h*.18);c.lineTo(w*.65,h*.12);c.lineTo(w*.39,h*.035);c.closePath();c.fill();
  for(let i=0;i<42;i++){
    const x=w*.44+(i*47)%(w*.59),y=(i*13)%Math.max(3,h*.09);
    fill(x,y,8+i%5*4,3,['#405e6b','#526c73','#273c54','#607776'][i%4]);
  }
  for(const x of [w*.55,w*.7,w*.87]){
    fill(x,h*.1,2,horizon-h*.1,'#698079');fill(x,h*.105,10,3,'#85968a');
  }
  fill(0,horizon-2,w,3,'#233d3d');
  // Sunlit lawn, then deeper foreground greens; no continuous gradients.
  const greens=['#8e9f4c','#849344','#70883c','#5f7d38','#4b7037','#355a37'];
  for(let i=0;i<6;i++){
    const y=horizon+(h-horizon)*i/6;
    fill(0,y,w,(h-horizon)/6+1,greens[i]);
  }
  for(let i=0;i<330;i++){
    const x=(i*97)%w,depth=((i*61)%997)/997,y=horizon+depth*(h-horizon);
    fill(x,y,2+depth*(8+i%13),1+Math.floor(depth*2),i%3?'#bac47721':'#183f3b21');
  }
  // Long roof shadow across one edge, leaving the kicking lane clear.
  c.fillStyle='#172e3b22';c.beginPath();c.moveTo(w*.92,horizon);c.lineTo(w,horizon);c.lineTo(w,h);c.lineTo(w*.68,h);c.closePath();c.fill();
}
