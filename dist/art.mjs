// Shared pastoral, low-poly palette. All match artwork is procedural and available offline.
export const ART=Object.freeze({
  ink:'#253e43',deep:'#21383d',navy:'#376578',slate:'#597c7b',steel:'#657c7c',
  cream:'#f5efdb',sun:'#ffe3a0',amber:'#df976d',rust:'#a86443',
  grass:'#86a780',grassLight:'#a5bf91',grassDark:'#688c75',line:'#f2eed9'
});
export const KITS=Object.freeze([
  Object.freeze({body:'#386d87',light:'#6195a4',shade:'#295267',trim:'#f5ecc7',shorts:'#eee5b9',shortLight:'#fff4cd',shortShade:'#b9b085',socks:'#141e37',sockLight:'#2d3e53',number:'#fff4cc',patch:'#141e35'}),
  Object.freeze({body:'#f2dfbd',light:'#fff1d6',shade:'#c6b79c',trim:'#243b3d',shorts:'#1b2c37',shortLight:'#3d5153',shortShade:'#0d1b2b',socks:'#e1dab1',sockLight:'#fff0c5',number:'#16243a',patch:'#eee6ba'})
]);

// Cached faceted countryside for the conversion view.
export function polygon(c,points,color){
  c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
}
export function paintStadium(c,w,h){
  const horizon=h*.42;
  c.fillStyle='#e7d9bb';c.fillRect(0,0,w,h);
  c.fillStyle='#f7e8c7';c.beginPath();c.arc(w*.23,h*.18,h*.065,0,Math.PI*2);c.fill();
  polygon(c,[[0,horizon],[0,h*.29],[w*.18,h*.17],[w*.4,h*.34],[w*.64,h*.21],[w,h*.3],[w,horizon]],'#b7c4ae');
  polygon(c,[[0,horizon],[w*.16,h*.31],[w*.35,h*.39],[w*.58,h*.27],[w*.79,h*.36],[w,h*.25],[w,horizon]],'#92ad97');
  c.fillStyle=ART.grass;c.fillRect(0,horizon,w,h-horizon);
  polygon(c,[[0,horizon],[w*.55,horizon],[w*.15,h],[0,h]],'#92b18a');
  polygon(c,[[w*.75,horizon],[w,horizon],[w,h],[w*.4,h]],'#7d9f7d');
  for(let i=0;i<17;i++){
    const x=i*w/16,y=horizon-4,size=h*(.025+(i%3)*.012);
    c.fillStyle='#6d8271';c.fillRect(x-1,y-size*.2,2,size*.3);
    polygon(c,[[x-size*.55,y],[x,y-size*2],[x+size*.55,y]],'#608b7d');
    polygon(c,[[x,y],[x,y-size*2],[x+size*.55,y]],'#527b72');
  }
  // A small rural clubhouse leaves the sky and shooting lane open.
  c.fillStyle='#eee3ca';c.fillRect(w*.77,horizon-h*.07,w*.19,h*.07);
  polygon(c,[[w*.75,horizon-h*.07],[w*.8,horizon-h*.11],[w*.96,horizon-h*.11],[w*.98,horizon-h*.07]],'#c88f73');
  c.fillStyle='#617875';for(let i=0;i<5;i++)c.fillRect(w*(.79+i*.033),horizon-h*.045,w*.018,h*.028);
}
