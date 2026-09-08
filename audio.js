// audio.js
// Web Audio للجمهور وWeb Speech للتعليق العربي
export let audioCtx, crowdGain;

export function initAudio(){
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  crowdGain = audioCtx.createGain();
  crowdGain.gain.value = 0.0001;
  crowdGain.connect(audioCtx.destination);
  // مولد بسيط لضوضاء الجمهور
  const o = audioCtx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 60;
  const g = audioCtx.createGain();
  g.gain.value = 0.0001;
  o.connect(g); g.connect(crowdGain);
  o.start();
  setTimeout(()=>{ g.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime+1); }, 200);
}

export function playCrowdCheer(big=true){
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = big ? 600 : 300;
  o.connect(g); g.connect(audioCtx.destination);
  g.gain.value = 0.0001;
  o.start();
  g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+1.2);
  setTimeout(()=>{ o.stop(); }, 1400);
}

export function speakArabic(text){
  if('speechSynthesis' in window){
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 1.0;
    u.pitch = 1.0;
    speechSynthesis.speak(u);
  } else {
    console.log('Commentator:', text);
  }
}
