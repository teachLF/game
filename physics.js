// physics.js
import * as THREE from 'three';
import { scene } from './render.js';
import { GAME } from './app.js';
export let ball;

export function spawnPlayers(leftClub, rightClub, formation){
  // إزالة أي لاعبين سابقين
  scene.children.filter(o=>o.userData && o.userData.isPlayer).forEach(o=>scene.remove(o));
  // كرة
  if(!ball){
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.6,16,16), new THREE.MeshStandardMaterial({color:0xffffff}));
    ball.userData.velocity = new THREE.Vector3();
    scene.add(ball);
  }
  ball.position.set(0,0.6,0); ball.userData.velocity.set(0,0,0);
  GAME.players = [];
  // توليد 5 لاعبين لكل فريق (بما فيهم الحارس)
  const leftPositions = [new THREE.Vector3(-56,0.6,0), new THREE.Vector3(-36,0.6,-12), new THREE.Vector3(-36,0.6,12), new THREE.Vector3(-20,0.6,-8), new THREE.Vector3(-20,0.6,8)];
  const rightPositions = leftPositions.map(p=>new THREE.Vector3(-p.x,p.y,p.z));
  for(let i=0;i<5;i++){
    const mesh = createPlayerMesh(leftClub.colors[0]);
    mesh.position.copy(leftPositions[i]); mesh.userData.isPlayer=true;
    scene.add(mesh);
    GAME.players.push({team:'LEFT', idx:i, mesh, isKeeper:i===0, rating: randomInRange(70,90)});
  }
  for(let i=0;i<5;i++){
    const mesh = createPlayerMesh(rightClub.colors[0]);
    mesh.position.copy(rightPositions[i]); mesh.userData.isPlayer=true;
    scene.add(mesh);
    GAME.players.push({team:'RIGHT', idx:i, mesh, isKeeper:i===0, rating: randomInRange(70,90)});
  }
  // رفع تقييم الحراس
  GAME.players.filter(p=>p.isKeeper).forEach(k=>k.rating = randomInRange(85,92));
}

function createPlayerMesh(color){
  const g = new THREE.CapsuleGeometry(0.6,1.2,4,8);
  const m = new THREE.MeshStandardMaterial({color});
  const mesh = new THREE.Mesh(g,m);
  return mesh;
}

export function updatePhysics(dt){
  // حركة الكرة مع احتكاك
  ball.userData.velocity.multiplyScalar(Math.max(0, 1 - dt*1.5));
  ball.position.add(ball.userData.velocity.clone().multiplyScalar(dt));
  // حدود الملعب
  ball.position.x = Math.max(-59, Math.min(59, ball.position.x));
  ball.position.z = Math.max(-39, Math.min(39, ball.position.z));
  // لاعبين يتحركون تلقائياً نحو الكرة إن لم يكن لديهم تحكم
  GAME.players.forEach(p=>{
    if(!p.controlled){
      const toBall = ball.position.clone().sub(p.mesh.position);
      if(toBall.length() > 2){
        const dir = toBall.normalize().multiplyScalar((p.isKeeper?0.8:1.2) * (p.rating/80) * 0.5);
        p.mesh.position.add(dir);
      }
    }
    // تفاعل مع الكرة
    const dist = p.mesh.position.distanceTo(ball.position);
    if(dist < 1.2){
      const push = ball.position.clone().sub(p.mesh.position).normalize().multiplyScalar(8 * (p.rating/80));
      ball.userData.velocity.add(push);
    }
  });
}

export function checkGoal(){
  if(ball.position.x <= -60 + 0.5){
    // هدف لليمين
    handleGoal('RIGHT');
  } else if(ball.position.x >= 60 - 0.5){
    handleGoal('LEFT');
  }
}

function handleGoal(scoringTeam){
  // احتمال حالة قريبة تستدعي VAR
  const closeCall = Math.random() < 0.2;
  if(closeCall && Math.random() < 0.5){
    runVAR(scoringTeam);
    return;
  }
  if(scoringTeam==='LEFT') GAME.score.left++; else GAME.score.right++;
  ball.position.set(0,0.6,0); ball.userData.velocity.set(0,0,0);
}

function runVAR(scoringTeam){
  GAME.varActive = true;
  document.getElementById('varOverlay').style.display='flex';
  const replayDuration = 3000;
  const start = performance.now();
  const interval = setInterval(()=>{
    const t = (performance.now()-start)/replayDuration;
    if(t>=1){
      clearInterval(interval);
      const overturned = Math.random() < 0.5;
      if(!overturned){
        if(scoringTeam==='LEFT') GAME.score.left++; else GAME.score.right++;
      }
      GAME.varActive = false;
      document.getElementById('varOverlay').style.display='none';
      ball.position.set(0,0.6,0); ball.userData.velocity.set(0,0,0);
    } else {
      // دوران الكاميرا البسيط أثناء الريبلاي يمكن إضافته في render.js
    }
  }, 30);
}

export function goalkeeperAI(dt){
  GAME.players.filter(p=>p.isKeeper).forEach(k=>{
    const goalX = k.team==='LEFT' ? -60 : 60;
    const distToGoal = Math.abs(ball.position.x - goalX);
    const ballTowardGoal = (k.team==='LEFT' && ball.userData.velocity.x < -0.5) || (k.team==='RIGHT' && ball.userData.velocity.x > 0.5);
    if(distToGoal < 12 && ballTowardGoal){
      const reaction = Math.max(0.15, 1.2 - (k.rating-85)/7);
      if(Math.random() < dt / reaction){
        const successProb = (k.rating - 60) / 40;
        if(Math.random() < successProb){
          ball.userData.velocity.multiplyScalar(-0.6);
        } else {
          // هدف محتمل، سيتم معالجته في checkGoal
        }
      }
    }
  });
}

function randomInRange(a,b){ return Math.floor(a + Math.random()*(b-a+1)); }
