/* RepoGraph AI - UI module: tabs, nav, reveal, counters, copy, FAQ, steps, slider, stars. */
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
    function setMenu(open){
      nav.classList.toggle('open', open);
      burger.classList.toggle('active', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    burger.addEventListener('click', function(e){ e.stopPropagation(); setMenu(!nav.classList.contains('open')); });
    document.addEventListener('click', function(e){
      if(nav.classList.contains('open') && !nav.contains(e.target) && !burger.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && nav.classList.contains('open')){ setMenu(false); burger.focus(); }
    });
    nav.querySelectorAll('a').forEach(function(l){ l.addEventListener('click', function(){ setMenu(false); }); });
    window.addEventListener('resize', function(){ if(window.innerWidth > 900) setMenu(false); });
  }
  // solidify after hero - the pill stays visible at all times
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

/* Hero command widget tabs */
function initHeroTabs(){
  var tabs = document.querySelectorAll('.htab');
  var cmd = document.getElementById('hsCmd');
  var btn = document.querySelector('.hs-btn');
  if(!tabs.length || !cmd) return;
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(o){ o.classList.remove('active'); o.setAttribute('aria-selected','false'); });
      t.classList.add('active'); t.setAttribute('aria-selected','true');
      var c = t.getAttribute('data-cmd') || '';
      cmd.textContent = c;
      if(btn) btn.setAttribute('data-copy', c);
    });
  });
}

/* Hero typewriter — rotates the promise line, caret only while typing */
function initTyped(){
  var line = document.getElementById('typedLine');
  var title = document.getElementById('heroTitle');
  if(!line || !title) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var phrases = ['Cite every line.', 'Trace every call.', 'Prove every diff.'];
  var pi = 0, ci = phrases[0].length, deleting = false, timer = null;
  function tick(){
    if(document.hidden){ timer = setTimeout(tick, 800); return; }
    var full = phrases[pi];
    if(!deleting){
      ci++;
      line.textContent = full.slice(0, ci);
      if(ci >= full.length){
        title.classList.remove('typing');
        timer = setTimeout(function(){ deleting = true; title.classList.add('typing'); tick(); }, 2300);
        return;
      }
      timer = setTimeout(tick, 34 + Math.random()*46);
    } else {
      ci--;
      line.textContent = full.slice(0, ci);
      if(ci <= 0){
        pi = (pi + 1) % phrases.length;
        deleting = false;
        timer = setTimeout(tick, 350);
        return;
      }
      timer = setTimeout(tick, 20);
    }
  }
  timer = setTimeout(function(){ title.classList.add('typing'); deleting = true; tick(); }, 2600);
}

/* Gliding pill indicator — follows hover, settles on .active */
function makeGlider(container, itemSel, glideCls){
  if(!container) return null;
  if(!window.matchMedia('(hover:hover)').matches) return null;
  var glide = document.createElement('span');
  glide.className = glideCls;
  glide.setAttribute('aria-hidden', 'true');
  container.appendChild(glide);
  var hovered = null;
  function place(el){
    if(!el || !el.offsetWidth){ glide.style.opacity = '0'; return; }
    glide.style.opacity = '1';
    glide.style.left = el.offsetLeft + 'px';
    glide.style.width = el.offsetWidth + 'px';
  }
  function toActive(){
    if(hovered) return;
    place(container.querySelector(itemSel + '.active'));
  }
  container.querySelectorAll(itemSel).forEach(function(el){
    el.addEventListener('mouseenter', function(){ hovered = el; place(el); });
    el.addEventListener('mouseleave', function(){ hovered = null; });
  });
  container.addEventListener('mouseleave', function(){ hovered = null; toActive(); });
  // follow .active changes (scrollspy, clicks) with zero wiring
  if('MutationObserver' in window){
    var mo = new MutationObserver(function(){ toActive(); });
    mo.observe(container, {attributes: true, subtree: true, attributeFilter: ['class']});
  }
  window.addEventListener('resize', toActive);
  window.addEventListener('load', toActive);
  setTimeout(toActive, 350);
  toActive();
  return {refresh: toActive};
}

function initGliders(){
  makeGlider(document.getElementById('navlinks'), '.nav-links a', 'nav-glide');
  makeGlider(document.querySelector('.hero-tabs'), '.htab', 'hero-glide');
}

/* Topbar dismiss — remembered across visits */
function initTopbar(){
  var bar = document.getElementById('topbar');
  var btn = document.getElementById('topbarClose');
  if(!bar || !btn) return;
  try{
    if(localStorage.getItem('rg-topbar-closed') === '1'){ bar.classList.add('hide'); return; }
  }catch(e){}
  btn.addEventListener('click', function(){
    bar.classList.add('hide');
    try{ localStorage.setItem('rg-topbar-closed', '1'); }catch(e){}
  });
}

document.addEventListener('DOMContentLoaded', function(){
  initNav(); initReveal(); initCounters(); initCopy(); initFaq(); initHow(); initTabs(); initHeroTabs(); initTyped(); initGliders(); initTopbar();
});
})();
