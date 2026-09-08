// app.js
// مدخل التطبيق: إدارة الحالة، تحميل الأصول، ربط الوحدات الأخرى
import { loadAssets } from './assets.json' assert { type: 'json' };
import { setupRenderer, createTifo, setClubs } from './render.js';
import { spawnPlayers, updatePhysics, checkGoal, goalkeeperAI } from './physics.js';
import { initInput, mapControllersToPlayers } from './input.js';
import { initAudio, playCrowdCheer, speakArabic } from './audio.js';

export let GAME = {
  leftClub: null,
  rightClub: null,
  formation: '4-4-2',
  players: [],
  score: { left:0, right:0 },
  minute: 0,
  running: false,
  varActive: false,
  addedTime: 0,
  settings: loadAssets
};

let lastFrame = performance.now();
let lastMinuteTick = performance.now();

export function initApp(){
  // تهيئة الواجهة والربط
  setupRenderer();
  initInput();
  initAudio();
  // ربط أزرار الواجهة
  document.getElementById('toTeam').onclick = showTeamPanel;
  document.getElementById('toFormation').onclick = showFormationPanel;
  document.getElementById('startMatch').onclick = startMatch;
  // عرض الـ slots مبدئياً
  renderSlotsUI();
  speakArabic('مرحباً بك في Saudi League 5');
}

function renderSlotsUI(){
  const slotsEl = document.getElementById('slots');
  slotsEl.innerHTML = '';
  for(let i=0;i<6;i++){
    const div = document.createElement('div');
    div.style.display='flex'; div.style.gap='8px'; div.style.alignItems='center'; div.style.marginTop='6px';
    div.innerHTML = `<div style="width:36px;height:36px;border-radius:6px;background:#333;display:flex;align-items:center;justify-content:center">${i+1}</div>
      <div style="flex:1"><div style="font-weight:700">Slot ${i+1}</div><div style="font-size:12px;color:#ccc">انتظر اتصال وحدة تحكم</div></div>`;
    slotsEl.appendChild(div);
  }
}

// واجهة اختيار الفرق
function showTeamPanel(){
  document.getElementById('startPanel').style.display='none';
  document.getElementById('teamPanel').style.display='block';
  const container = document.getElementById('teamChoices');
  container.innerHTML = '';
  GAME.settings.CLUBS.forEach((club, idx)=>{
    const b = document.createElement('button');
    b.style.padding='8px'; b.style.borderRadius='8px'; b.style.background='#111'; b.style.border='1px solid #333'; b.style.color='#fff';
    b.style.display='flex'; b.style.alignItems='center'; b.style.gap='8px';
    b.dataset.idx = idx;
    b.innerHTML = `<img src="${club.logo}" style="width:40px;height:40px;object-fit:contain;background:#fff;padding:4px;border-radius:6px"/> <div style="text-align:left"><div style="font-weight:700">${club.name}</div><div style="font-size:12px;color:#ccc">${club.colors.join(' / ')}</div></div>`;
    container.appendChild(b);
  });
  // اختيار اليسار ثم اليمين
  let left=null, right=null;
  container.onclick = (ev)=>{
    const btn = ev.target.closest('button');
    if(!btn) return;
    const idx = Number(btn.dataset.idx);
    if(left===null){ left = idx; btn.style.outline='3px solid #0b6'; btn.style.opacity=0.9; return; }
    if(right===null && idx!==left){ right = idx; btn.style.outline='3px solid #f4d03f'; btn.style.opacity=0.9; return; }
  };
  document.getElementById('toFormation').onclick = ()=>{
    if(left===null || right===null){ alert('اختر فريقين للجانبين'); return; }
    GAME.leftClub = GAME.settings.CLUBS[left];
    GAME.rightClub = GAME.settings.CLUBS[right];
    setClubs(GAME.leftClub, GAME.rightClub);
    document.getElementById('teamPanel').style.display='none';
    document.getElementById('formationPanel').style.display='block';
  };
}

document.querySelectorAll('.formation').forEach(b=>{
  b.onclick = ()=> {
    document.querySelectorAll('.formation').forEach(x=>x.style.boxShadow='');
    b.style.boxShadow='0 0 0 3px rgba(11,102,6,0.25)';
    GAME.formation = b.dataset.f;
  };
});

async function startMatch(){
  if(!GAME.leftClub || !GAME.rightClub){ alert('اختر الفرق أولاً'); return; }
  if(!GAME.formation){ alert('اختر التشكيل'); return; }
  document.getElementById('formationPanel').style.display='none';
  // تهيئة اللاعبين والمشهد
  spawnPlayers(GAME.leftClub, GAME.rightClub, GAME.formation);
  await createTifo(GAME.leftClub, GAME.rightClub, GAME.settings.TIFO_COUNT);
  mapControllersToPlayers(); // من input.js
  document.getElementById('scoreboard').style.display='block';
  speakArabic('انطلاق المباراة');
  GAME.running = true;
  lastFrame = performance.now();
  lastMinuteTick = performance.now();
  requestAnimationFrame(loop);
}

function loop(now){
  if(!GAME.running) return;
  const dt = (now - lastFrame)/1000;
  lastFrame = now;
  // تحديثات
  updatePhysics(dt);
  goalkeeperAI(dt);
  checkGoal();
  // تحديث الوقت
  updateClock(now);
  // تحديث واجهة الوقت والنتيجة
  document.getElementById('time').textContent = `${String(GAME.minute).padStart(2,'0')}:00`;
  document.getElementById('score').textContent = `${GAME.score.left} - ${GAME.score.right}`;
  requestAnimationFrame(loop);
}

function updateClock(now){
  if(GAME.varActive) return;
  const elapsed = now - lastMinuteTick;
  if(elapsed >= GAME.settings.GAME_MINUTE_MS){
    GAME.minute += Math.floor(elapsed / GAME.settings.GAME_MINUTE_MS);
    lastMinuteTick = now;
    if(GAME.minute >= GAME.settings.MATCH_MINUTES && GAME.addedTime===0){
      GAME.addedTime = 1 + Math.floor(Math.random()*7);
    }
    if(GAME.minute >= GAME.settings.MATCH_MINUTES + GAME.addedTime){
      endMatch();
    }
  }
}

function endMatch(){
  GAME.running = false;
  speakArabic('نهاية المباراة');
  setTimeout(()=>{ alert(`Full time: ${GAME.score.left} - ${GAME.score.right}`); }, 200);
}
