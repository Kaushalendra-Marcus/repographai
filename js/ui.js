/* RepoGraph AI — UI module: tabs, nav, reveal, counters, copy, FAQ, steps, slider, stars. */
(function(){
"use strict";

/* Screenshot tabs (used by inline onclick handlers) */
window.showShot = function(name, btn){
  document.querySelectorAll('.shot-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.stab').forEach(function(b){ b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
  var pane = document.getElementById('shot-' + name);
  if(pane) pane.classList.add('active');
  if(btn){ btn.classList.add('active'); btn.setAttribute('aria-selected','true'); moveTabIndicator(btn); }
};
function moveTabIndicator(btn){
  var ind = document.querySelector('.tab-indicator');
  var wrap = document.querySelector('.shots-tabs');
  if(!ind || !btn || !wrap) return;
  var b = btn.getBoundingClientRect(), w = wrap.getBoundingClientRect();
  ind.style.width = b.width + 'px';
  ind.style.transform = 'translateX(' + (b.left - w.left + (wrap.scrollLeft||0)) + 'px)';
}
function initTabs(){
  var a = document.querySelector('.stab.active');
  if(a){ var ind = document.querySelector('.tab-indicator'); if(ind) ind.style.left = '4px'; moveTabIndicator(a); }
  var tabs = document.querySelector('.shots-tabs');
  if(tabs) tabs.addEventListener('scroll', function(){ var x = document.querySelector('.stab.active'); if(x) moveTabIndicator(x); });
}
window.addEventListener('resize', initTabs);
window.addEventListener('load', initTabs);

/* Nav: mobile menu + scrolled state + hide-on-scroll + scrollspy */
function initNav(){
  var nav = document.getElementById('navlinks'), burger = document.getElementById('hamburger');
  var shell = document.querySelector('.nav-shell');
  if(burger && nav){
    burger.setAttribute('aria-expanded', 'false');
    burger.addEventListener('click', function(e){ e.stopPropagation(); var open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    document.addEventListener('click', function(e){
      if(nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) nav.classList.remove('open');
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && nav.classList.contains('open')){ nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); }
    });
    nav.querySelectorAll('a').forEach(function(l){ l.addEventListener('click', function(){ nav.classList.remove('open'); }); });
    window.addEventListener('resize', function(){ if(window.innerWidth > 900) nav.classList.remove('open'); });
  }
  // solidify after hero — the pill stays visible at all times
  function onScroll(){
    var y = window.scrollY || 0;
    if(shell) shell.classList.toggle('scrolled', y > 24);
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  // scrollspy: highlight the section in view
  var map = {};
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(function(a){
    var sec = document.querySelector(a.getAttribute('href'));
    if(sec) map[a.getAttribute('href')] = {link:a, sec:sec};
  });
  var keys = Object.keys(map);
  if(keys.length && 'IntersectionObserver' in window){
    var spy = new IntersectionObserver(function(es){
      es.forEach(function(en){
        if(!en.isIntersecting) return;
        var id = '#' + en.target.id;
        keys.forEach(function(k){ map[k].link.classList.toggle('active', k === id); });
      });
    }, {rootMargin:'-40% 0px -55% 0px'});
    keys.forEach(function(k){ spy.observe(map[k].sec); });
  }
}

/* Reveal on scroll */
function initReveal(){
  var els = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('visible'); }); return; }
  var io = new IntersectionObserver(function(es){
    es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, {threshold:0.1, rootMargin:'0px 0px -30px 0px'});
  els.forEach(function(e){ io.observe(e); });
}

/* Animated counters */
function initCounters(){
  var nums = document.querySelectorAll('[data-count]');
  if(!nums.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function(es){
    es.forEach(function(en){
      if(!en.isIntersecting) return;
      var el = en.target, target = parseInt(el.getAttribute('data-count'),10)||0, t0 = null;
      (function tick(t){ if(!t0) t0 = t; var p = Math.min((t-t0)/1100,1); el.textContent = Math.round(target*(1-Math.pow(1-p,3))); if(p<1) requestAnimationFrame(tick); })(performance.now());
      io.unobserve(el);
    });
  }, {threshold:0.5});
  nums.forEach(function(n){ io.observe(n); });
}

/* Copy buttons */
function initCopy(){
  document.querySelectorAll('[data-copy]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var text = btn.getAttribute('data-copy')||'';
      var done = function(){ var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function(){ btn.textContent = o; }, 1500); };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
      else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); done(); }
    });
  });
}

/* FAQ accordion */
function initFaq(){
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function(item){
    var q = item.querySelector('.faq-q'), a = item.querySelector('.faq-a');
    if(!q || !a) return;
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', function(){
      var open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o){ o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = '0px'; o.querySelector('.faq-q').setAttribute('aria-expanded', 'false'); });
      if(!open){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; q.setAttribute('aria-expanded', 'true'); }
    });
  });
  if(items.length){ items[0].classList.add('open'); var f = items[0].querySelector('.faq-a'); if(f) f.style.maxHeight = f.scrollHeight + 'px'; items[0].querySelector('.faq-q').setAttribute('aria-expanded', 'true'); }
}

/* How-it-works steps */
function initHow(){
  var steps = Array.prototype.slice.call(document.querySelectorAll('#stepsList .step'));
  var bar = document.getElementById('flowBar');
  var nodes = Array.prototype.slice.call(document.querySelectorAll('.fnode'));
  if(!steps.length) return;
  var idx = 0, timer = null;
  function set(i){
    idx = i;
    steps.forEach(function(s,j){ s.classList.toggle('active', j===i); });
    nodes.forEach(function(n,j){ n.classList.toggle('lit', j <= Math.min(i+1, nodes.length-1)); });
    if(bar) bar.style.width = ((i+1)/steps.length*100) + '%';
  }
  steps.forEach(function(s,i){ s.addEventListener('mouseenter', function(){ set(i); restart(); }); s.addEventListener('click', function(){ set(i); restart(); }); });
  function restart(){ if(timer) clearInterval(timer); timer = setInterval(function(){ set((idx+1)%steps.length); }, 4000); }
  set(0); restart();
}

/* Demo slider */
function initSlider(){
  var slides = document.querySelectorAll('.slide-item');
  var dots = document.querySelectorAll('.apple-dot');
  var prev = document.getElementById('applePrev'), next = document.getElementById('appleNext');
  if(!slides.length) return;
  var cur = 0, timer = null;
  var durs = {0:6200, 1:1800, 2:14400, 3:null};
  var vid = document.getElementById('appleSpeedVideo');
  if(vid){ vid.playbackRate = 1.8; vid.addEventListener('loadedmetadata', function(){ vid.playbackRate = 1.8; }); }
  function show(i){
    if(i < 0) i = slides.length-1;
    if(i >= slides.length) i = 0;
    if(timer) clearTimeout(timer);
    slides.forEach(function(s,k){
      s.classList.remove('active');
      if(k !== i){ var v = s.querySelector('video'); if(v){ v.pause(); try{ v.currentTime = 0; }catch(e){} } }
    });
    slides[i].classList.add('active'); cur = i;
    dots.forEach(function(d,k){ d.classList.toggle('active', k===i); });
    var c = slides[i];
    if(c.dataset.type === 'video'){ var v = c.querySelector('video'); if(v){ try{ v.currentTime = 0; }catch(e){} v.play().catch(function(){}); v.onended = function(){ show(cur+1); }; } }
    else if(durs[i]){ var g = c.querySelector('img'); if(g){ var src = g.src; g.src=''; g.src=src; } timer = setTimeout(function(){ show(cur+1); }, durs[i]); }
  }
  if(prev) prev.addEventListener('click', function(){ show(cur-1); });
  if(next) next.addEventListener('click', function(){ show(cur+1); });
  dots.forEach(function(d,k){ d.addEventListener('click', function(){ show(k); }); });
  show(0);
}

document.addEventListener('DOMContentLoaded', function(){
  initNav(); initReveal(); initCounters(); initCopy(); initFaq(); initHow(); initSlider(); initTabs();
});
})();
