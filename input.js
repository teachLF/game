// input.js
// إدارة Gamepad API حتى 6 وحدات تحكم، واجهة الانضمام والاختيارات
import { GAME } from './app.js';

export let controllers = Array(6).fill(null).map((_,i)=>({slot:i,connected:false,joined:false,side:null,gamepadIndex:null}));

export function initInput(){
  window.addEventListener('gamepadconnected', (e)=>{ onGamepadConnected(e.gamepad); });
  window.addEventListener('gamepaddisconnected', (e)=>{ onGamepadDisconnected(e.gamepad); });
  pollGamepads();
}

function onGamepadConnected(gp){
  const free = controllers.find(c=>!c.connected);
  if(free){
    free.connected = true; free.gamepadIndex = gp.index;
  }
  renderSlots();
}

function onGamepadDisconnected(gp){
  controllers.forEach(c=>{ if(c.gamepadIndex===gp.index){ c.connected=false; c.joined=false; c.side=null; c.gamepadIndex=null; }});
  renderSlots();
}

function renderSlots(){
  const slotsEl = document.getElementById('slots');
  if(!slotsEl) return;
  slotsEl.innerHTML = '';
  controllers.forEach((c,i)=>{
    const div = document.createElement('div');
    div.style.display='flex'; div.style.gap='8px'; div.style.alignItems='center'; div.style.marginTop='6px';
    div.innerHTML = `<div style="width:36px;height:36px;border-radius:6px;background:${c.joined? '#0b6':'#333'};display:flex;align-items:center;justify-content:center">${i+1}</div>
      <div style="flex:1"><div style="font-weight:700">Slot ${i+1}</div><div style="font-size:12px;color:#ccc">${c.connected? (c.joined? 'Joined - '+(c.side||'No side') : 'Connected - اضغط X للانضمام') : 'غير متصل'}</div></div>`;
    slotsEl.appendChild(div);
  });
}

function pollGamepads(){
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  controllers.forEach(c=>{
    // find matching gp by index
    const gp = Array.from(gps).find(g=>g && g.index===c.gamepadIndex) || null;
    if(gp && !c.connected){ c.connected=true; c.gamepadIndex=gp.index; }
    if(gp && !c.joined && gp.buttons[0] && gp.buttons[0].pressed){ // X
      c.joined = true;
    }
    if(gp && c.joined && !c.side){
      if(gp.buttons[14] && gp.buttons[14].pressed) c.side='LEFT';
      if(gp.buttons[15] && gp.buttons[15].pressed) c.side='RIGHT';
    }
    if(gp && c.joined && gp.buttons[1] && gp.buttons[1].pressed){ // Circle cancel
      c.joined=false; c.side=null;
    }
  });
  renderSlots();
  requestAnimationFrame(pollGamepads);
}

export function mapControllersToPlayers(){
  // ربط وحدات التحكم باللاعبين: كل وحدة تحكم على نفس الجانب تتحكم بلاعب من نفس الفريق
  const joined = controllers.filter(c=>c.joined);
  const leftJoins = joined.filter(c=>c.side==='LEFT');
  const rightJoins = joined.filter(c=>c.side==='RIGHT');
  // مسح تحكم سابق
  GAME.players.forEach(p=>p.controlled=false);
  const leftPlayers = GAME.players.filter(p=>p.team==='LEFT' && !p.isKeeper);
  const rightPlayers = GAME.players.filter(p=>p.team==='RIGHT' && !p.isKeeper);
  leftJoins.forEach((c,idx)=>{ const p = leftPlayers[idx % leftPlayers.length]; if(p) p.controlled = true; });
  rightJoins.forEach((c,idx)=>{ const p = rightPlayers[idx % rightPlayers.length]; if(p) p.controlled = true; });
}
