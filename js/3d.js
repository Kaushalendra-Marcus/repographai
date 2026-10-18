/* RepoGraph AI - 3D premium pack: tilt, glare, mouse + scroll parallax. */
(function(){
"use strict";
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var coarse = window.matchMedia('(pointer: coarse)').matches;
if(reduceMotion) return;

function ensureGlare(el){
  if(el.querySelector(':scope > .tilt-glare')) return;
  var g = document.createElement('div');
  g.className = 'tilt-glare';
  g.setAttribute('aria-hidden','true');
  el.appendChild(g);
}

// auto-enhance cards that deserve depth but weren't tagged in HTML
function autoTag(){
  document.querySelectorAll('.bcard, .icard, .author-card').forEach(function(el){
    if(!el.hasAttribute('data-tilt')){
      el.setAttribute('data-tilt','');
      el.setAttribute('data-tilt-max','6');
    }
  });
}

function initTilt(){
  if(coarse) return; // no tilt on touch — keeps scroll smooth
  var els = document.querySelectorAll('[data-tilt]');
  els.forEach(function(el){
    ensureGlare(el);
    var max = parseFloat(el.getAttribute('data-tilt-max') || '7');
    var raf = null, rx = 0, ry = 0, trx = 0, try_ = 0;
    function render(){
      raf = null;
      rx += (trx - rx) * 0.14;
      ry += (try_ - ry) * 0.14;
      if(Math.abs(trx-rx)<0.01 && Math.abs(try_-ry)<0.01 && trx===0 && try_===0){
        el.style.transform = '';
        return;
      }
      el.style.transform = 'perspective(950px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) translateZ(0)';
      if(trx!==0 || try_!==0) raf = requestAnimationFrame(render);
    }
    function kick(){ if(!raf) raf = requestAnimationFrame(render); }
    el.addEventListener('pointermove', function(e){
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      try_ = (px * max * 2).toFixed(2) * 1;
      trx = (-py * max * 2).toFixed(2) * 1;
      el.style.setProperty('--gx', ((px+0.5)*100).toFixed(1)+'%');
      el.style.setProperty('--gy', ((py+0.5)*100).toFixed(1)+'%');
      kick();
    });
    el.addEventListener('pointerleave', function(){
      trx = 0; try_ = 0;
      kick();
      // clear after settle
      setTimeout(function(){ if(trx===0 && try_===0) el.style.transform=''; }, 400);
    });
  });
}

function initParallax(){
  var pxEls = document.querySelectorAll('[data-parallax]');
  var orbs = document.querySelectorAll('.orb');
  var canvas = document.getElementById('graph-canvas');
  var mx = 0, my = 0, tmx = 0, tmy = 0, sy = 0;
  window.addEventListener('pointermove', function(e){
    tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    tmy = (e.clientY / window.innerHeight - 0.5) * 2;
  }, {passive:true});
  function onScroll(){ sy = window.scrollY || 0; }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  var heroVisual = document.querySelector('.hero-visual');
  (function loop(){
    mx += (tmx - mx) * 0.06;
    my += (tmy - my) * 0.06;
    pxEls.forEach(function(el){
      var f = parseFloat(el.getAttribute('data-parallax') || '0.05');
      // combine mouse drift + gentle scroll lift; skip if element itself is tilted (tilt owns transform)
      if(el.hasAttribute('data-tilt')) return;
      var y = (-sy * f * 0.35);
      el.style.transform = 'translate3d('+(mx*f*36).toFixed(1)+'px,'+(my*f*28 + y).toFixed(1)+'px,0)';
    });
    if(heroVisual && !coarse){
      heroVisual.style.transform = '';
    }
    orbs.forEach(function(o, idx){
      var depth = (idx+1) * 0.5;
      // use transform so it composes with the CSS `translate` float animation
      o.style.transform = 'translate3d('+(mx*22*depth).toFixed(1)+'px,'+(my*18*depth - Math.min(sy*0.04*depth, 60)).toFixed(1)+'px,0)';
    });
    if(canvas){
      // fade the field as you scroll past hero so text stays legible
      var fade = Math.max(0.12, 0.62 - sy/1600);
      canvas.style.opacity = fade.toFixed(3);
    }
    requestAnimationFrame(loop);
  })();
}

function initFootWave(){
  var wrap = document.getElementById('footWave');
  if(!wrap) return;
  var letters = Array.prototype.slice.call(wrap.querySelectorAll('.fl-letter'));
  if(!letters.length) return;
  var spaces = Array.prototype.slice.call(wrap.querySelectorAll('.fl-space'));
  var geo = [];

  // size the wordmark so it spans the viewport edge to edge (design: full-bleed)
  function fit(){
    wrap.style.fontSize = '100px';
    var total = 0;
    letters.forEach(function(el){ total += el.offsetWidth; });
    spaces.forEach(function(el){ total += el.offsetWidth; });
    var target = document.documentElement.clientWidth - 4;
    if(total > 0 && target > 60) wrap.style.fontSize = (100 * target / total).toFixed(2) + 'px';
    else wrap.style.fontSize = '';
  }
  // cache letter centres in document space once per layout change (no per-frame reflow)
  function measure(){
    var sx = window.scrollX || 0, sy = window.scrollY || 0;
    geo = letters.map(function(el){
      var r = el.getBoundingClientRect();
      return {x: r.left + r.width/2 + sx, y: r.top + r.height/2 + sy};
    });
  }
  var refitT = null;
  function refit(){
    if(refitT) clearTimeout(refitT);
    refitT = setTimeout(function(){ fit(); measure(); }, 120);
  }
  fit(); measure();
  window.addEventListener('resize', refit);
  window.addEventListener('orientationchange', refit);
  if(window.addEventListener) window.addEventListener('load', function(){ fit(); measure(); });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ fit(); measure(); });

  var R = 260;
  var cur = letters.map(function(){ return 0; });
  var cx = -9999, cy = -9999, px = -9999, py = -9999, active = false, raf = null;
  var ripples = []; // tap ripples for touch: {x, y, t0} in document space
  function syncPointer(){
    px = cx + (window.scrollX || 0);
    py = cy + (window.scrollY || 0);
  }
  function frame(){
    var now = performance.now();
    ripples = ripples.filter(function(rp){ return now - rp.t0 < 1600; });
    var settling = false;
    letters.forEach(function(el, k){
      var g = geo[k] || {x: px, y: py};
      var dx = px - g.x, dy = py - g.y;
      var d = Math.sqrt(dx*dx + dy*dy);
      var t = active ? Math.max(0, 1 - d/R) : 0;
      for(var i = 0; i < ripples.length; i++){
        var age = (now - ripples[i].t0)/1000;
        var ddx = ripples[i].x - g.x, ddy = ripples[i].y - g.y;
        var dd = Math.sqrt(ddx*ddx + ddy*ddy);
        var rad = age * 620;
        var band = Math.exp(-Math.pow(dd - rad, 2)/(2*80*80));
        var amp = Math.max(0, 1 - age/1.4);
        t = Math.max(t, band * amp);
      }
      t = t*t*(3 - 2*t); // smoothstep falloff
      cur[k] += (t - cur[k]) * 0.2;
      if(Math.abs(t - cur[k]) > 0.001) settling = true;
      el.style.setProperty('--p', cur[k].toFixed(3));
    });
    if(active || settling || ripples.length) raf = requestAnimationFrame(frame);
    else raf = null;
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(frame); }
  if(!coarse){
    wrap.addEventListener('pointermove', function(e){
      cx = e.clientX; cy = e.clientY;
      syncPointer(); active = true; kick();
    });
    wrap.addEventListener('pointerleave', function(){ active = false; kick(); });
  }
  // while the page scrolls under a resting cursor, keep the wave glued to the pointer
  window.addEventListener('scroll', function(){
    if(!active) return;
    syncPointer(); kick();
  }, {passive:true});
  // touch: tap anywhere on the wordmark fires an outward ripple (page still scrolls normally)
  wrap.addEventListener('pointerdown', function(e){
    ripples.push({x: e.pageX, y: e.pageY, t0: performance.now()});
    kick();
  });
}

document.addEventListener('DOMContentLoaded', function(){
  autoTag();
  initTilt();
  initParallax();
  initFootWave();
});
})();
