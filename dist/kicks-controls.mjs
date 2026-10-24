export function bindKickControls({target,joystick,stick,left,right,kick,active,canAim,steer,shoot,pause}){
  const keys=new Set(),holds=new Map();let pointer=null,axis=0;
  function input(){let value=axis+Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));for(const n of holds.values())value+=n;return Math.max(-1,Math.min(1,value));}
  function clear(){keys.clear();holds.clear();pointer=null;axis=0;stick.style.transform='translate(0px,0px)';}
  function move(e){if(e.pointerId!==pointer)return;const r=joystick.getBoundingClientRect(),radius=r.width*.35;axis=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/radius));stick.style.transform=`translate(${axis*radius}px,0px)`;}
  joystick.addEventListener('pointerdown',e=>{if(pointer!==null||!canAim())return;e.preventDefault();pointer=e.pointerId;joystick.setPointerCapture(pointer);move(e);});
  joystick.addEventListener('pointermove',move);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;axis=0;stick.style.transform='translate(0px,0px)';}});
  for(const [button,dir] of [[left,-1],[right,1]]){
    button.addEventListener('pointerdown',e=>{if(!canAim())return;e.preventDefault();button.setPointerCapture(e.pointerId);holds.set(e.pointerId,dir);steer(dir,.06);});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>holds.delete(e.pointerId));
    button.addEventListener('click',e=>{if(e.detail===0&&canAim())steer(dir,.1);});
  }
  kick.addEventListener('pointerdown',e=>{e.preventDefault();if(active())shoot();});
  kick.addEventListener('click',e=>{if(e.detail===0&&active())shoot();});
  target.addEventListener('keydown',e=>{
    if(['Escape','KeyP'].includes(e.code)){if(!e.repeat){e.preventDefault();pause();}return;}
    if(!active())return;
    if(e.code==='Space'&&['BUTTON','A'].includes(e.target?.tagName))return;
    if(['Space','KeyK','KeyL'].includes(e.code)){e.preventDefault();if(!e.repeat)shoot();}
    if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code)){e.preventDefault();if(canAim())keys.add(e.code);}
  });
  target.addEventListener('keyup',e=>keys.delete(e.code));
  return {input,clear};
}
