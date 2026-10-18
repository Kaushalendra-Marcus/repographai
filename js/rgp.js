/* RepoGraph AI - walkthrough player: autoplay (muted) on view, default 1.25x, floating glass controls. */
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
var spdBtn = document.getElementById('rgpSpd');
var spdVal = document.getElementById('rgpSpdVal');
var menu = document.getElementById('rgpMenu');
var muteBtn = document.getElementById('rgpMute');
var icoVol = muteBtn ? muteBtn.querySelector('.rgp-ico-vol') : null;
var icoMute = muteBtn ? muteBtn.querySelector('.rgp-ico-mute') : null;
var vol = document.getElementById('rgpVol');
var fsBtn = document.getElementById('rgpFs');
var soundBtn = document.getElementById('rgpSound');

var RATES = [0.75, 1, 1.25, 1.5, 2];
var DEFAULT_RATE = 1.25;
var STORE = 'rgWalkthroughRate';
var coarse = window.matchMedia('(pointer: coarse)').matches;

var dragging = false;
var idleTimer = null;
var autoPaused = false;
var started = false;

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

/* ── state sync ── */
function syncPlayIcon(){
  var playing = !v.paused && !v.ended;
  root.classList.toggle('is-playing', playing);
  show(icoPlay, !playing);
  show(icoPause, playing);
  if(playBtn) playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
}
function syncVolume(){
  var muted = v.muted || v.volume === 0;
  root.classList.toggle('is-muted', muted);
  show(icoVol, !muted);
  show(icoMute, muted);
  if(muteBtn) muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
  if(vol && !vol.dataset.user) vol.value = muted ? 0 : v.volume;
}
function syncProgress(){
  var d = v.duration || 0;
  var p = d ? (v.currentTime / d) * 100 : 0;
  if(fill) fill.style.width = p + '%';
  if(knob) knob.style.left = p + '%';
  if(curEl) curEl.textContent = fmt(v.currentTime);
  if(durEl && d) durEl.textContent = fmt(d);
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
}

/* ── actions ── */
function unmute(){
  if(!v.muted && v.volume > 0) return;
  v.muted = false;
  if(v.volume === 0) v.volume = 1;
  try{ localStorage.setItem('rgSound','1'); }catch(e){}
  syncVolume();
}
function soundPref(){ try{ return localStorage.getItem('rgSound') === '1'; }catch(e){ return false; } }
function play(){
  if(v.ended) v.currentTime = 0;
  if(soundPref()) v.muted = false; /* browsers only allow this once the visitor has engaged before */
  var p = v.play();
  if(p && p.catch){
    p.catch(function(){
      if(v.muted) return;
      v.muted = true;
      syncVolume();
      var q = v.play();
      if(q && q.catch) q.catch(function(){});
    });
  }
}
function toggle(fromControl){
  if(v.paused || v.ended){
    if(fromControl) unmute();
    play();
  }else{
    v.pause();
  }
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
v.addEventListener('click', function(){ toggle(false); });
if(bigPlay) bigPlay.addEventListener('click', function(){ closeMenu(); toggle(true); });
if(playBtn) playBtn.addEventListener('click', function(){ closeMenu(); toggle(true); });
if(soundBtn) soundBtn.addEventListener('click', function(){ unmute(); barFlash(); });

v.addEventListener('play', function(){ syncPlayIcon(); barFlash(); });
v.addEventListener('pause', function(){ syncPlayIcon(); barStay(); });
v.addEventListener('ended', function(){ syncPlayIcon(); barStay(); syncProgress(); });
v.addEventListener('timeupdate', syncProgress);
v.addEventListener('progress', syncProgress);
v.addEventListener('durationchange', syncProgress);
v.addEventListener('loadedmetadata', function(){ setRate(storedRate(), false); syncProgress(); });
v.addEventListener('loadeddata', syncProgress);
v.addEventListener('ratechange', function(){ if(spdVal) spdVal.textContent = (v.playbackRate === 1 ? '1' : v.playbackRate) + '×'; });
v.addEventListener('volumechange', syncVolume);
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
    else if(e.key === ' ' || e.key === 'Enter'){ toggle(true); e.preventDefault(); }
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

if(muteBtn) muteBtn.addEventListener('click', function(){
  if(v.muted || v.volume === 0){ unmute(); }else{ v.muted = true; try{ localStorage.setItem('rgSound','0'); }catch(e){} }
  barStay();
});
if(vol) vol.addEventListener('input', function(){
  vol.dataset.user = '1';
  var x = parseFloat(vol.value);
  v.volume = x;
  v.muted = x === 0;
});

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
  if(k === ' ' || k === 'k' || k === 'K'){ toggle(true); e.preventDefault(); }
  else if(k === 'ArrowRight'){ seekBy(5); e.preventDefault(); }
  else if(k === 'ArrowLeft'){ seekBy(-5); e.preventDefault(); }
  else if(k === 'ArrowUp'){ unmute(); v.volume = clamp(v.volume + 0.1, 0, 1); e.preventDefault(); }
  else if(k === 'ArrowDown'){ v.volume = clamp(v.volume - 0.1, 0, 1); e.preventDefault(); }
  else if(k === 'm' || k === 'M'){ if(v.muted) unmute(); else v.muted = true; e.preventDefault(); }
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
syncPlayIcon();
syncVolume();
syncProgress();
if(coarse || v.paused) barStay(); else barFlash();
})();
