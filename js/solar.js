/* RepoGraph AI — Providers solar system. */
(function(){
"use strict";

var stage = document.getElementById('solarStage');
if(!stage) return;

var plane = stage.querySelector('.solar-plane');
var tablist = stage.querySelector('.solar-nodes');
var nodes = Array.prototype.slice.call(stage.querySelectorAll('.solar-node'));
var panels = Array.prototype.slice.call(document.querySelectorAll('.solar-panel'));
var pauseBtn = document.getElementById('solarPause');
var pauseText = pauseBtn ? pauseBtn.querySelector('.solar-pause-text') : null;
var countEl = document.getElementById('solarCount');
var beam = document.getElementById('solarBeam');
var beamGlow = document.getElementById('solarBeamGlow');
var beamSvg = stage.querySelector('.solar-beam-svg');
var rings = {};
Array.prototype.forEach.call(stage.querySelectorAll('.solar-ring'), function(el){
  rings[el.getAttribute('data-ring')] = el;
});

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var paused = reduceMotion;
var visible = true;
var selected = 'groq';
var hovered = null;
var radii = {};
var planeSize = 0;
var last = 0;
var raf = null;

var items = nodes.map(function(el){
  var phase = (parseFloat(el.getAttribute('data-phase')) || 0) * Math.PI / 180;
  return {
    el: el,
    id: el.getAttribute('data-provider'),
    ring: el.getAttribute('data-ring'),
    speed: parseFloat(el.getAttribute('data-speed')) || 40,
    color: el.getAttribute('data-color') || '#8ea2ff',
    angle: phase,
    x: 0,
    y: 0
  };
});

function byId(id){
  for(var i = 0; i < items.length; i++){ if(items[i].id === id) return items[i]; }
  return null;
}

function measure(){
  var w = plane ? plane.clientWidth : 0;
  if(!w) return;
  planeSize = w;
  Object.keys(rings).forEach(function(key){
    radii[key] = rings[key].offsetWidth / 2;
  });
  if(beamSvg){
    beamSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + w);
  }
}

function place(item){
  var r = radii[item.ring] || 0;
  var x = Math.cos(item.angle) * r;
  var y = Math.sin(item.angle) * r;
  item.x = x;
  item.y = y;
  item.el.style.transform = 'translate(-50%,-50%) translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) rotateY(8deg) rotateX(-62deg)';
  item.el.style.zIndex = String(10 + Math.round(((Math.sin(item.angle) + 1) / 2) * 10));
}

function draw(){
  items.forEach(place);
  updateBeam();
}

function updateBeam(){
  var target = byId(hovered || selected);
  if(!beam || !target || !planeSize) return;
  var c = planeSize / 2;
  var x = c + target.x;
  var y = c + target.y;
  beam.setAttribute('x1', c.toFixed(1));
  beam.setAttribute('y1', c.toFixed(1));
  beam.setAttribute('x2', x.toFixed(1));
  beam.setAttribute('y2', y.toFixed(1));
  beam.setAttribute('stroke', target.color);
  beam.style.opacity = hovered ? '.9' : '.55';
  if(beamGlow){
    beamGlow.setAttribute('x1', c.toFixed(1));
    beamGlow.setAttribute('y1', c.toFixed(1));
    beamGlow.setAttribute('x2', x.toFixed(1));
    beamGlow.setAttribute('y2', y.toFixed(1));
    beamGlow.setAttribute('stroke', target.color);
    beamGlow.style.opacity = hovered ? '.17' : '.08';
  }
}

function running(){
  return visible && !paused;
}

function frame(now){
  raf = null;
  if(!last) last = now;
  var dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  items.forEach(function(item){
    item.angle += dt * (Math.PI * 2 / item.speed);
    place(item);
  });
  updateBeam();
  if(running()) raf = requestAnimationFrame(frame);
}

function start(){
  if(raf || !running()) return;
  last = 0;
  raf = requestAnimationFrame(frame);
}

function stop(){
  if(raf){ cancelAnimationFrame(raf); raf = null; }
  last = 0;
}

function syncPause(){
  stage.classList.toggle('is-paused', paused);
  if(pauseBtn){
    pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pauseBtn.setAttribute('aria-label', paused ? 'Resume orbit animation' : 'Pause orbit animation');
  }
  if(pauseText) pauseText.textContent = paused ? 'Resume' : 'Pause';
  if(running()) start(); else stop();
}

function select(id, focus){
  var target = byId(id);
  if(!target) return;
  selected = id;
  hovered = null;
  stage.style.setProperty('--active-color', target.color);

  items.forEach(function(item){
    var on = item.id === id;
    item.el.classList.toggle('is-active', on);
    item.el.setAttribute('aria-selected', on ? 'true' : 'false');
    item.el.tabIndex = on ? 0 : -1;
    if(on && focus) item.el.focus();
  });

  panels.forEach(function(panel){
    panel.hidden = panel.getAttribute('data-provider') !== id;
  });

  if(countEl){
    var idx = items.map(function(i){ return i.id; }).indexOf(id);
    countEl.textContent = ('0' + (idx + 1)).slice(-2) + ' / ' + ('0' + items.length).slice(-2);
  }

  updateBeam();
}

/* pointer + focus states */
items.forEach(function(item){
  item.el.addEventListener('click', function(){ select(item.id, false); });
  item.el.addEventListener('pointerenter', function(){ hovered = item.id; updateBeam(); });
  item.el.addEventListener('pointerleave', function(){ if(hovered === item.id) hovered = null; updateBeam(); });
  item.el.addEventListener('focus', function(){ hovered = item.id; updateBeam(); });
  item.el.addEventListener('blur', function(){ if(hovered === item.id) hovered = null; updateBeam(); });
});

/* keyboard navigation between provider tabs */
if(tablist){
  tablist.addEventListener('keydown', function(e){
    var key = e.key;
    if(key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    var i = nodes.indexOf(document.activeElement);
    if(i < 0) return;
    e.preventDefault();
    var j;
    if(key === 'Home') j = 0;
    else if(key === 'End') j = nodes.length - 1;
    else if(key === 'ArrowRight') j = (i + 1) % nodes.length;
    else j = (i - 1 + nodes.length) % nodes.length;
    select(nodes[j].getAttribute('data-provider'), true);
  });
}

/* play / pause */
if(pauseBtn){
  pauseBtn.addEventListener('click', function(){
    paused = !paused;
    syncPause();
  });
}

/* stop work when the scene is off screen */
if('IntersectionObserver' in window){
  new IntersectionObserver(function(entries){
    visible = entries[0].isIntersecting;
    if(running()) start(); else stop();
  }, {threshold: .02, rootMargin: '120px 0px'}).observe(stage);
}

/* keep geometry in sync with the responsive layout */
var resizeTimer = null;
function remeasure(){
  measure();
  draw();
}
window.addEventListener('resize', function(){
  if(resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(remeasure, 120);
});
if('ResizeObserver' in window && plane){
  new ResizeObserver(function(){ remeasure(); }).observe(plane);
}

measure();
select('groq', false);
syncPause();
draw();
})();
