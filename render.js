// render.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
export let scene, camera, renderer;
let tifoGroup = null;

export function setupRenderer(){
  const canvas = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 18, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); hemi.position.set(0,50,0); scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(10,20,10); scene.add(dir);

  // الملعب
  const field = new THREE.Mesh(new THREE.PlaneGeometry(120,80), new THREE.MeshStandardMaterial({color:0x0b7a3a}));
  field.rotation.x = -Math.PI/2; scene.add(field);
  // خطوط بسيطة
  const lineMat = new THREE.LineBasicMaterial({color:0xffffff});
  const addLine = (p1,p2)=>{ const g = new THREE.BufferGeometry().setFromPoints([p1,p2]); const l = new THREE.Line(g,lineMat); l.rotation.x=-Math.PI/2; scene.add(l); };
  addLine(new THREE.Vector3(-60,0.01,0), new THREE.Vector3(60,0.01,0));

  window.addEventListener('resize', ()=>{ renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); });
  animate();
}

function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// إنشاء التيفو باستخدام InstancedMesh لتحسين الأداء
export async function createTifo(leftClub, rightClub, count){
  // إزالة أي تيفو سابق
  if(tifoGroup){ scene.remove(tifoGroup); tifoGroup = null; }
  tifoGroup = new THREE.Group();
  // نرسم شعارين على canvas صغير ثم نأخذ ألوان عشوائية منه
  const canvas = document.createElement('canvas'); canvas.width=400; canvas.height=160;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle='#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
  // رسم شعارات إن أمكن
  try {
    const leftImg = await loadImage(leftClub.logo);
    const rightImg = await loadImage(rightClub.logo);
    ctx.drawImage(leftImg, 0, 0, canvas.width/2, canvas.height);
    ctx.drawImage(rightImg, canvas.width/2, 0, canvas.width/2, canvas.height);
  } catch(e){
    // fallback: fill with club colors
    ctx.fillStyle = leftClub.colors[0]; ctx.fillRect(0,0,canvas.width/2,canvas.height);
    ctx.fillStyle = rightClub.colors[0]; ctx.fillRect(canvas.width/2,0,canvas.width/2,canvas.height);
  }
  const imgData = ctx.getImageData(0,0,canvas.width,canvas.height).data;
  // InstancedMesh plane
  const geom = new THREE.PlaneGeometry(0.6,0.4);
  const mat = new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  const inst = new THREE.InstancedMesh(geom, mat, count);
  const dummy = new THREE.Object3D();
  for(let i=0;i<count;i++){
    const x = Math.floor(Math.random()*canvas.width);
    const y = Math.floor(Math.random()*canvas.height);
    const idx = (y*canvas.width + x)*4;
    const r = imgData[idx], g = imgData[idx+1], b = imgData[idx+2], a = imgData[idx+3];
    const color = (a>10) ? new THREE.Color(`rgb(${r},${g},${b})`) : new THREE.Color(0x222222);
    mat.color = mat.color; // keep
    // وضع الطائرة في المدرجات حول الملعب
    const angle = Math.random()*Math.PI*2;
    const radius = 60 + 12 + Math.random()*10;
    dummy.position.set(Math.cos(angle)*radius, 8 + Math.random()*6, Math.sin(angle)*radius);
    dummy.lookAt(0,8,0);
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
    inst.setColorAt(i, color);
  }
  inst.instanceMatrix.needsUpdate = true;
  if(inst.instanceColor) inst.instanceColor.needsUpdate = true;
  tifoGroup.add(inst);
  scene.add(tifoGroup);
}

function loadImage(url){
  return new Promise((res,rej)=>{
    const img = new Image(); img.crossOrigin='anonymous';
    img.onload = ()=>res(img); img.onerror = ()=>rej();
    img.src = url;
  });
}

export function setClubs(left, right){
  // يمكن استخدام هذه الدالة لاحقًا لتحديث ألوان اللاعبين أو واجهة الملعب
}
