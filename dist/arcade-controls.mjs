// Pointer capture keeps joystick steering active outside its rim; other fingers stay independent.
export function bindArcadeControls({target,joystick,stick,buttons,action,pause,active}){
  const keys=new Set();let pointer=null,x=0,y=0;
  const input=()=>({x:Math.max(-1,Math.min(1,x+Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')))),y:Math.max(-1,Math.min(1,y+Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'))))});
  function clear(){keys.clear();pointer=null;x=y=0;stick.style.transform='translate(0px,0px)';}
  function move(e){if(e.pointerId!==pointer)return;const r=joystick.getBoundingClientRect(),radius=r.width*.35;let dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;const n=Math.max(1,Math.hypot(dx,dy)/radius);dx/=n;dy/=n;x=dx/radius;y=dy/radius;stick.style.transform=`translate(${dx}px,${dy}px)`;}
  joystick.addEventListener('pointerdown',e=>{if(pointer!==null||!active())return;e.preventDefault();pointer=e.pointerId;joystick.setPointerCapture(pointer);move(e);});
  joystick.addEventListener('pointermove',move);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===pointer){pointer=null;x=y=0;stick.style.transform='translate(0px,0px)';}});
  for(const [kind,button] of Object.entries(buttons)){
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(active())action(kind,input().x);});
    button.addEventListener('click',e=>{if(e.detail===0&&active())action(kind,input().x);});
  }
  const actions={KeyJ:'sprint',Space:'sprint',KeyK:'dodge',KeyL:'charge'};
  target.addEventListener('keydown',e=>{
    if(['Escape','KeyP'].includes(e.code)){if(!e.repeat){e.preventDefault();pause();}return;}
    // Native buttons and links retain Enter/Space activation when focused.
    if(e.code==='Space'&&['BUTTON','A'].includes(e.target?.tagName))return;
    if(!active())return;
    if(actions[e.code]||['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(actions[e.code]&&!e.repeat)action(actions[e.code],input().x);
    }
  });
  target.addEventListener('keyup',e=>keys.delete(e.code));
  return {input,clear};
}
