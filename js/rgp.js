/* RepoGraph AI - walkthrough player: autoplay on view, default 1.25x, chaptered timeline, floating glass controls. */
(function(){
"use strict";

var root = document.getElementById('rgPlayer');
if(!root) return;
var v = document.getElementById('walkthroughVideo');
if(!v) return;

var bigPlay = document.getElementById('rgpCover');
var playBtn = document.getElementById('rgpPlay');
var icoPlay = playBtn ? playBtn.querySelector('.rgp-ico-play') : null;
var icoPause = playBtn ? playBtn.querySelector('.rgp-ico-pause') : null;
var curEl = document.getElementById('rgpCur');
var durEl = document.getElementById('rgpDur');
var track = document.getElementById('rgpTrack');
var buf = document.getElementById('rgpBuf');
var fill = document.getElementById('rgpFill');
var knob = document.getElementById('rgpKnob');
var tip = document.getElementById('rgpTip');
var marks = document.getElementById('rgpMarks');
var spdBtn = document.getElementById('rgpSpd');
var spdVal = document.getElementById('rgpSpdVal');
var menu = document.getElementById('rgpMenu');
var fsBtn = document.getElementById('rgpFs');
var chapNo = document.getElementById('rgpChapNo');
var chapTitle = document.getElementById('rgpChapTitle');
var rail = document.getElementById('rgChapRail');
var railBtns = rail ? Array.prototype.slice.call(rail.querySelectorAll('.chap')) : [];
var railFills = railBtns.map(function(b){ return b.querySelector('.chap-rule i'); });

/* chapters of the walkthrough cut (seconds into the final video) */
var CH = [
  {t:0.0,  n:'01', title:'Analyze workspace'},
  {t:6.1,  n:'02', title:'Dependency graph'},
  {t:30.4, n:'03', title:'Data flow'},
  {t:40.6, n:'04', title:'Agent context file'},
  {t:51.2, n:'05', title:'Your own AI provider'}
];

var RATES = [0.75, 1, 1.25, 1.5, 2];
var DEFAULT_RATE = 1.25;
var STORE = 'rgWalkthroughRate';
var coarse = window.matchMedia('(pointer: coarse)').matches;

var dragging = false;
var idleTimer = null;
var autoPaused = false;
var started = false;
var chapIdx = -1;
var swapTimer = null;

/* ── tiny helpers ── */
function fmt(s){
  if(!isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  return Math.floor(s / 60) + ':' + ((s % 60) < 10 ? '0' : '') + (s % 60);
}
function clamp(n, a, b){ return n < a ? a : (n > b ? b : n); }
function show(el, on){ if(!el) return; if(on) el.removeAttribute('hidden'); else el.setAttribute('hidden',''); }

/* ── control bar visibility ── */
function barStay(){
  clearTimeout(idleTimer);
  root.classList.add('bar-on');
}
function barFlash(){
  if(coarse){ barStay(); return; }
  barStay();
  if(!v.paused && !v.ended){
    idleTimer = setTimeout(function(){ root.classList.remove('bar-on'); }, 2800);
  }
}

/* ── speed ── */
function storedRate(){
  try{
    var r = parseFloat(localStorage.getItem(STORE));
    if(RATES.indexOf(r) > -1) return r;
  }catch(e){}
  return DEFAULT_RATE;
}
function setRate(r, persist){
  if(RATES.indexOf(r) < 0) r = DEFAULT_RATE;
  try{ v.playbackRate = r; }catch(e){}
  if(spdVal) spdVal.textContent = (r === 1 ? '1' : r) + '×';
  if(menu){
    menu.querySelectorAll('button[data-rate]').forEach(function(b){
      b.setAttribute('aria-checked', parseFloat(b.getAttribute('data-rate')) === r ? 'true' : 'false');
    });
  }
  if(persist){ try{ localStorage.setItem(STORE, String(r)); }catch(e){} }
}
function openMenu(){ if(!menu) return; menu.hidden = false; if(spdBtn) spdBtn.setAttribute('aria-expanded','true'); }
function closeMenu(){ if(!menu || menu.hidden) return; menu.hidden = true; if(spdBtn) spdBtn.setAttribute('aria-expanded','false'); }

/* ── chapters ── */
function chapterAt(t){
  var i = 0;
  for(var k = 0; k < CH.length; k++){ if(t + 0.05 >= CH[k].t) i = k; }
  return i;
}
function buildMarks(){
  if(!marks) return;
  marks.innerHTML = '';
  var d = v.duration || 0;
  if(!d) return;
  for(var k = 1; k < CH.length; k++){
    var s = document.createElement('i');
    s.style.left = (CH[k].t / d * 100) + '%';
    marks.appendChild(s);
  }
}
function syncChapters(){
  var idx = chapterAt(v.currentTime);
  if(idx !== chapIdx){
    chapIdx = idx;
    if(chapNo) chapNo.textContent = CH[idx].n;
    if(chapTitle) chapTitle.textContent = CH[idx].title;
    root.classList.add('chap-swap');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function(){ root.classList.remove('chap-swap'); }, 700);
  }
  var d = v.duration || 0;
  for(var k = 0; k < railBtns.length; k++){
    var start = CH[k].t;
    var end = (k + 1 < CH.length) ? CH[k + 1].t : d;
    var p = v.currentTime <= start ? 0 : (v.currentTime >= end ? 100 : ((v.currentTime - start) / (end - start) * 100));
    if(railFills[k]) railFills[k].style.width = p + '%';
    railBtns[k].classList.toggle('is-live', k === idx);
    railBtns[k].classList.toggle('is-past', !!end && v.currentTime >= end);
  }
}
if(rail){
  railBtns.forEach(function(b){
    b.addEventListener('click', function(){
      var i = parseInt(b.getAttribute('data-chap'), 10);
      if(!(i >= 0) || i >= CH.length) i = 0;
      v.currentTime = CH[i].t + 0.001;
      if(v.paused || v.ended) play();
      syncProgress();
      barStay();
      chapIdx = -1;
      syncChapters();
    });
  });
}

/* ── state sync ── */
function syncPlayIcon(){
  var playing = !v.paused && !v.ended;
  root.classList.toggle('is-playing', playing);
  show(icoPlay, !playing);
  show(icoPause, playing);
  if(playBtn) playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function syncProgress(){
  var d = v.duration || 0;
  var p = d ? (v.currentTime / d) * 100 : 0;
  if(fill) fill.style.width = p + '%';
  if(knob) knob.style.left = p + '%';
  if(curEl) curEl.textContent = fmt(v.currentTime);
  if(durEl && d) durEl.textContent = fmt(Math.round(d));
  if(track){
    track.setAttribute('aria-valuenow', Math.round(v.currentTime));
    track.setAttribute('aria-valuemax', Math.round(d || 0));
    track.setAttribute('aria-valuetext', fmt(v.currentTime) + ' of ' + fmt(d));
  }
  if(buf && v.buffered && v.buffered.length){
    try{
      var end = v.buffered.end(v.buffered.length - 1);
      buf.style.width = (d ? (end / d) * 100 : 0) + '%';
    }catch(e){}
  }
  syncChapters();
}

/* ── actions ── */
function play(){
  if(v.ended) v.currentTime = 0;
  var p = v.play();
  if(p && p.catch) p.catch(function(){});
}
function toggle(){
  if(v.paused || v.ended) play();
  else v.pause();
}
function seekBy(sec){
  var d = v.duration || 0;
  v.currentTime = clamp(v.currentTime + sec, 0, d ? d - 0.25 : 0);
  syncProgress();
}
function seekFromClientX(clientX){
  if(!track) return;
  var r = track.getBoundingClientRect();
  if(!r.width) return;
  var d = v.duration || 0;
  var ratio = clamp((clientX - r.left) / r.width, 0, 1);
  if(tip){ tip.textContent = fmt(ratio * d); tip.style.left = (ratio * 100) + '%'; }
  v.currentTime = ratio * d;
  syncProgress();
}

/* ── pointer / controls ── */
v.addEventListener('click', function(){ toggle(); });
if(bigPlay) bigPlay.addEventListener('click', function(){ closeMenu(); toggle(); });
if(playBtn) playBtn.addEventListener('click', function(){ closeMenu(); toggle(); });

v.addEventListener('play', function(){ syncPlayIcon(); barFlash(); });
v.addEventListener('pause', function(){ syncPlayIcon(); barStay(); });
v.addEventListener('ended', function(){ syncPlayIcon(); barStay(); syncProgress(); });
v.addEventListener('timeupdate', syncProgress);
v.addEventListener('seeking', syncProgress);
v.addEventListener('seeked', syncProgress);
v.addEventListener('progress', syncProgress);
v.addEventListener('durationchange', syncProgress);
v.addEventListener('loadedmetadata', function(){ setRate(storedRate(), false); buildMarks(); syncProgress(); });
v.addEventListener('loadeddata', syncProgress);
v.addEventListener('ratechange', function(){ if(spdVal) spdVal.textContent = (v.playbackRate === 1 ? '1' : v.playbackRate) + '×'; });
v.addEventListener('contextmenu', function(){ barStay(); });

root.addEventListener('pointermove', barFlash);
root.addEventListener('pointerdown', barStay);
root.addEventListener('focusin', barStay);
root.addEventListener('pointerleave', function(){
  if(coarse) return;
  clearTimeout(idleTimer);
  if(!v.paused && !v.ended) idleTimer = setTimeout(function(){ root.classList.remove('bar-on'); }, 900);
});

if(track){
  track.addEventListener('pointerdown', function(e){
    dragging = true;
    if(track.setPointerCapture){ try{ track.setPointerCapture(e.pointerId); }catch(err){} }
    seekFromClientX(e.clientX);
  });
  track.addEventListener('pointermove', function(e){
    var r = track.getBoundingClientRect();
    if(r.width && tip){
      var ratio = clamp((e.clientX - r.left) / r.width, 0, 1);
      tip.textContent = fmt(ratio * (v.duration || 0));
      tip.style.left = (ratio * 100) + '%';
    }
    if(dragging) seekFromClientX(e.clientX);
  });
  function stopDrag(e){
    if(!dragging) return;
    dragging = false;
    try{
      if(track.hasPointerCapture && e.pointerId !== undefined && track.hasPointerCapture(e.pointerId)) track.releasePointerCapture(e.pointerId);
    }catch(err){}
  }
  track.addEventListener('pointerup', stopDrag);
  track.addEventListener('pointercancel', stopDrag);
  track.addEventListener('keydown', function(e){
    if(e.key === 'ArrowRight'){ seekBy(5); e.preventDefault(); }
    else if(e.key === 'ArrowLeft'){ seekBy(-5); e.preventDefault(); }
    else if(e.key === 'Home'){ v.currentTime = 0; e.preventDefault(); }
    else if(e.key === 'End'){ v.currentTime = (v.duration || 0) - 0.25; e.preventDefault(); }
    else if(e.key === ' ' || e.key === 'Enter'){ toggle(); e.preventDefault(); }
  });
}

if(spdBtn) spdBtn.addEventListener('click', function(e){ e.stopPropagation(); if(menu && menu.hidden) openMenu(); else closeMenu(); });
if(menu){
  menu.addEventListener('click', function(e){
    var b = e.target.closest('button[data-rate]');
    if(!b) return;
    setRate(parseFloat(b.getAttribute('data-rate')), true);
    closeMenu();
    if(v.paused && !v.ended) play();
  });
}
document.addEventListener('click', function(e){ if(menu && !menu.hidden && !e.target.closest('.rgp-spd')) closeMenu(); });

/* ── fullscreen ── */
function isFs(){ return document.fullscreenElement === root || document.webkitFullscreenElement === root; }
function toggleFs(){
  if(isFs()){
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }else if(root.requestFullscreen){
    root.requestFullscreen().catch(function(){});
  }else if(root.webkitRequestFullscreen){
    root.webkitRequestFullscreen();
  }else if(v.webkitEnterFullscreen){
    v.webkitEnterFullscreen(); /* iOS: hands over to the native player */
  }
}
if(fsBtn){
  if(root.requestFullscreen || root.webkitRequestFullscreen || v.webkitEnterFullscreen) fsBtn.addEventListener('click', function(){ toggleFs(); barStay(); });
  else fsBtn.hidden = true;
}

/* ── keyboard (when focus is inside the player) ── */
root.addEventListener('keydown', function(e){
  if(e.target.closest('input')) return;
  var k = e.key;
  if(k === ' ' || k === 'k' || k === 'K'){ toggle(); e.preventDefault(); }
  else if(k === 'ArrowRight'){ seekBy(5); e.preventDefault(); }
  else if(k === 'ArrowLeft'){ seekBy(-5); e.preventDefault(); }
  else if(k === 'f' || k === 'F'){ toggleFs(); e.preventDefault(); }
  else if(k === 'Escape'){ closeMenu(); }
});

/* ── autoplay when it scrolls into view, pause when it leaves ── */
if('IntersectionObserver' in window){
  new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      var r = en.intersectionRatio;
      if(r >= 0.35){
        if(!started){ started = true; play(); }
        else if(autoPaused){ autoPaused = false; play(); }
      }else if(r < 0.25 && !v.paused && !v.ended){
        autoPaused = true;
        v.pause();
      }
    });
  }, { threshold: [0, 0.25, 0.35, 0.6, 1] }).observe(root);
}

/* ── init ── */
setRate(storedRate(), false);
buildMarks();
syncPlayIcon();
syncProgress();
if(coarse || v.paused) barStay(); else barFlash();
})();
