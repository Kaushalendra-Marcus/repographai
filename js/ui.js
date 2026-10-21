/* RepoGraph AI — UI: nav themes, mobile menu, tabs, reveal, counters, copy, FAQ, steps. */
(function(){
"use strict";

/* ── Screenshot tabs (used by inline onclick handlers) ── */
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
  ind.style.transform = 'translateX(' + (b.left - w.left - 4 + (wrap.scrollLeft||0)) + 'px)';
}
function initTabs(){
  var active = document.querySelector('.stab.active');
  if(active) moveTabIndicator(active);
  var tabs = document.querySelector('.shots-tabs');
  if(!tabs || tabs.dataset.bound) return;
  tabs.dataset.bound = '1';
  tabs.querySelectorAll('.stab[data-shot]').forEach(function(b){ b.setAttribute('aria-controls', 'shot-' + b.getAttribute('data-shot')); });
  tabs.addEventListener('scroll', function(){ var x = document.querySelector('.stab.active'); if(x) moveTabIndicator(x); });
  tabs.addEventListener('keydown', function(e){
    if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    var list = Array.prototype.slice.call(tabs.querySelectorAll('.stab'));
    var i = list.indexOf(document.activeElement);
    if(i < 0) return;
    var j = e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : (e.key === 'ArrowRight' ? i + 1 : i - 1 + list.length) % list.length;
    e.preventDefault();
    list[j].focus();
    list[j].click();
  });
}
window.addEventListener('resize', initTabs);
window.addEventListener('load', initTabs);

/* ── Nav: mobile menu, light/dark theme, scrollspy ── */
function initNav(){
  var nav = document.getElementById('siteNav');
  var burger = document.getElementById('hamburger');
  var panel = document.getElementById('mobileMenu');

  function setMenu(open){
    if(!panel || !burger) return;
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if(burger && panel){
    burger.addEventListener('click', function(e){ e.stopPropagation(); setMenu(!panel.classList.contains('open')); });
    panel.querySelectorAll('a').forEach(function(l){ l.addEventListener('click', function(){ setMenu(false); }); });
    document.addEventListener('click', function(e){
      if(panel.classList.contains('open') && !panel.contains(e.target) && !burger.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && panel.classList.contains('open')){ setMenu(false); burger.focus(); }
    });
    window.addEventListener('resize', function(){ if(window.innerWidth > 1080) setMenu(false); });
  }

  /* pick nav theme from the section currently under the nav */
  var themed = Array.prototype.slice.call(document.querySelectorAll('[data-nav-theme]')).filter(function(el){ return el.tagName !== 'BODY'; });
  var lastTheme = 'dark';
  function navTheme(){
    var probe = 38;
    var current = lastTheme;
    for(var i = 0; i < themed.length; i++){
      var r = themed[i].getBoundingClientRect();
      if(r.top <= probe && r.bottom > probe){ current = themed[i].getAttribute('data-nav-theme') || 'light'; break; }
    }
    if(current !== lastTheme){
      lastTheme = current;
      if(nav){
        nav.classList.toggle('nav-dark', current === 'dark');
        nav.classList.toggle('nav-light', current === 'light');
      }
    }
  }
  navTheme();
  window.addEventListener('scroll', navTheme, {passive:true});
  window.addEventListener('resize', navTheme);

  /* scrollspy — one active section at a time, clear outside the mapped sections */
  var spyMap = [];
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(function(a){
    var sec = document.querySelector(a.getAttribute('href'));
    if(sec) spyMap.push({link:a, sec:sec});
  });
  function spy(){
    var probe = Math.min(window.innerHeight * 0.28, 220);
    var active = null;
    spyMap.forEach(function(o){
      var r = o.sec.getBoundingClientRect();
      if(r.top <= probe && r.bottom > probe) active = o;
    });
    spyMap.forEach(function(o){
      var on = o === active;
      o.link.classList.toggle('active', on);
      if(on) o.link.setAttribute('aria-current', 'true');
      else o.link.removeAttribute('aria-current');
    });
  }
  spy();
  window.addEventListener('scroll', spy, {passive:true});
  window.addEventListener('resize', spy);
}

/* ── Reveal on scroll ── */
function initReveal(){
  var els = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('visible'); }); return; }
  var io = new IntersectionObserver(function(es){
    es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); } });
  }, {threshold:.08, rootMargin:'0px 0px -32px 0px'});
  els.forEach(function(e){ io.observe(e); });
}

/* ── Animated counters ── */
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
  }, {threshold:.5});
  nums.forEach(function(n){ io.observe(n); });
}

/* ── Copy buttons ── */
function initCopy(){
  var live = document.getElementById('copyLive');
  if(!live){
    live = document.createElement('span');
    live.id = 'copyLive'; live.className = 'sr-only';
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  document.querySelectorAll('[data-copy]').forEach(function(btn){
    if(btn.dataset.copyBound) return;
    btn.dataset.copyBound = '1';
    btn.addEventListener('click', function(){
      var text = btn.getAttribute('data-copy')||'';
      var done = function(){
        var o = btn.textContent;
        btn.textContent = 'Copied';
        live.textContent = 'Copied to clipboard: ' + text;
        setTimeout(function(){ btn.textContent = o; }, 1500);
      };
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
      else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); done(); }
    });
  });
}

/* ── FAQ accordion ── */
function initFaq(){
  var items = document.querySelectorAll('.faq-item');
  items.forEach(function(item, i){
    var q = item.querySelector('.faq-q'), a = item.querySelector('.faq-a');
    if(!q || !a) return;
    if(!a.id) a.id = 'faq-a' + (i + 1);
    q.setAttribute('aria-controls', a.id);
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', function(){
      var open = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(o){
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = '0px';
        o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if(!open){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; q.setAttribute('aria-expanded', 'true'); }
    });
  });
  if(items.length){
    items[0].classList.add('open');
    var f = items[0].querySelector('.faq-a');
    if(f) f.style.maxHeight = f.scrollHeight + 'px';
    items[0].querySelector('.faq-q').setAttribute('aria-expanded', 'true');
  }
  var frT = null;
  window.addEventListener('resize', function(){
    if(frT) clearTimeout(frT);
    frT = setTimeout(function(){
      var open = document.querySelector('.faq-item.open .faq-a');
      if(open) open.style.maxHeight = open.scrollHeight + 'px';
    }, 150);
  });
}

/* ── How-it-works steps ── */
function initHow(){
  var steps = Array.prototype.slice.call(document.querySelectorAll('#stepsList .step'));
  if(!steps.length) return;
  var idx = 0, timer = null;
  function set(i){
    idx = i;
    steps.forEach(function(s,j){ s.classList.toggle('active', j===i); });
  }
  steps.forEach(function(s,i){
    s.addEventListener('mouseenter', function(){ set(i); restart(); });
    s.addEventListener('click', function(){ set(i); restart(); });
  });
  function restart(){ if(timer) clearInterval(timer); timer = setInterval(function(){ set((idx+1)%steps.length); }, 4200); }
  set(0); restart();
}

/* ── Hero command tabs ── */
function initHeroTabs(){
  var tabs = document.querySelectorAll('.htab');
  var cmd = document.getElementById('hsCmd');
  var btn = document.querySelector('.hs-btn');
  if(!tabs.length || !cmd) return;
  tabs.forEach(function(t){
    t.addEventListener('click', function(){
      tabs.forEach(function(o){ o.classList.remove('active'); o.setAttribute('aria-pressed','false'); });
      t.classList.add('active'); t.setAttribute('aria-pressed','true');
      var c = t.getAttribute('data-cmd') || '';
      cmd.textContent = c;
      if(btn) btn.setAttribute('data-copy', c);
    });
  });
}

document.addEventListener('DOMContentLoaded', function(){
  initNav(); initReveal(); initCounters(); initCopy(); initFaq(); initHow(); initTabs(); initHeroTabs();
});
})();
