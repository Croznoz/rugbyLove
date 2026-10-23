// Shared rugby silhouette for possession, loose balls and conversions.
export function drawBall(c,x,y,size=7,angle=0){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(size/7,size/7);
  c.beginPath();c.moveTo(-7,0);
  c.bezierCurveTo(-4.5,-5.8,4.5,-5.8,7,0);
  c.bezierCurveTo(4.5,5.8,-4.5,5.8,-7,0);
  c.closePath();c.fillStyle='#fff3d5';c.fill();
  c.strokeStyle='#493f32';c.lineWidth=1.1;c.stroke();
  c.save();c.clip();
  // Warm lower panel and restrained terracotta end bands.
  c.beginPath();c.moveTo(-7,0);c.quadraticCurveTo(0,2,7,-.5);
  c.lineTo(7,5);c.lineTo(-7,5);c.closePath();c.fillStyle='#c6ac7e';c.fill();
  c.strokeStyle='#a35e47';c.lineWidth=1.5;
  for(const end of [-1,1]){c.beginPath();c.moveTo(end*4,-4);c.quadraticCurveTo(end*2.8,0,end*4,4);c.stroke();}
  c.restore();
  c.strokeStyle='#806d51';c.lineWidth=.65;c.beginPath();c.moveTo(-2.2,-.7);c.lineTo(2.2,-.7);
  for(const stitch of [-1.4,0,1.4]){c.moveTo(stitch,-1.5);c.lineTo(stitch,.1);}c.stroke();
  c.restore();
}
