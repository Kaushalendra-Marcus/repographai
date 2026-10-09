/* RepoGraph AI - hero graph module: graphify-style force layout.
   Springs, hover tooltip, drag + tap-to-pin. */
(function(){
"use strict";
function initHeroCanvas(){
  var canvas = document.getElementById('graph-canvas');
  var tip = document.getElementById('graph-tip');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, nodes = [], links = [];
  var mouse = {x:-9999, y:-9999};
  var cam = {x:0, y:0, tx:0, ty:0};
  var hovered = -1, dragged = -1, downPos = null, t = 0;
  var N = window.innerWidth < 640 ? 34 : 68;
  var MOBILE = window.innerWidth < 640 || window.matchMedia('(pointer:coarse)').matches;
  var SPEED = MOBILE ? 0.35 : 1; // calm the field down on touch screens
  var REST = 115, HOVER_R = 160;
  var DIRS = ['lib','src','api','core','utils','graph','ai','store'];
  var NAMES = ['auth','graph','index','scan','cache','config','parser','query','agent','store','edge','node','prompt','model','router','worker','indexer','report'];
  function label(i){
    if(nodes[i].hub) return DIRS[i%DIRS.length]+'/'+NAMES[(i*3)%NAMES.length]+'.ts';
    return NAMES[(i*7)%NAMES.length]+'-'+(i%9+2)+'.ts';
  }
  function degree(i){
    var d=0;
    for(var l=0;l<links.length;l++) if(links[l][0]===i||links[l][1]===i) d++;
    return d;
  }
  function resize(){
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    W = canvas.offsetWidth; H = canvas.offsetHeight;
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function seed(){
    nodes = []; links = [];
    for(var i=0;i<N;i++){
      var hub = i % 11 === 0; // a few bigger hub nodes, like god nodes
      nodes.push({x:Math.random()*W, y:Math.random()*H*0.72, vx:(Math.random()-.5)*0.4*SPEED, vy:(Math.random()-.5)*0.4*SPEED, r:(hub?3.6:Math.random()*1.6+1.7), hub:hub, c:Math.random(), pinned:false, z:Math.random(), vz:(Math.random()-.5)*0.0022*SPEED, ph:Math.random()*Math.PI*2});
    }
    // fixed link set so hover-highlighting shows a stable neighbourhood
    for(var a=0;a<N;a++){
      var scored = [];
      for(var b=0;b<N;b++){
        if(a===b) continue;
        var dx=nodes[a].x-nodes[b].x, dy=nodes[a].y-nodes[b].y;
        scored.push([dx*dx+dy*dy, b]);
      }
      scored.sort(function(p,q){ return p[0]-q[0]; });
      var k = 2 + (a % 2); // 2-3 links per node
      for(var j=0;j<k && j<scored.length;j++){
        var x=a, y=scored[j][1], key = x<y ? x+'-'+y : y+'-'+x;
        var dup = false;
        for(var l=0;l<links.length;l++) if(links[l][2]===key){ dup=true; break; }
        if(!dup) links.push([x, y, key]);
      }
    }
  }
  function nearest(px, py, maxD){
    var best=-1, bd=maxD*maxD;
    for(var i=0;i<nodes.length;i++){
      var dx=nodes[i].x-px, dy=nodes[i].y-py, d=dx*dx+dy*dy;
      if(d<bd){ bd=d; best=i; }
    }
    return best;
  }
  function showTip(i, cx, cy){
    if(!tip) return;
    if(i < 0){ tip.classList.remove('show'); return; }
    tip.innerHTML = '<b>'+label(i)+'</b> · '+degree(i)+' links'+(nodes[i].pinned?' · pinned':'');
    tip.style.left = cx+'px'; tip.style.top = cy+'px';
    tip.classList.add('show');
  }
  function interactiveTarget(t){
    return !!(t && t.closest && t.closest('a,button,input,textarea,select,video,.faq-q,.apple-nav'));
  }
  // Window-level listeners so EVERY node is draggable - even ones behind text
  // and panels (the content layer sits above the canvas and would eat the events).
  // Links and buttons are excluded so they keep working normally.
  window.addEventListener('pointerdown', function(e){
    if(e.button !== undefined && e.button !== 0) return;
    if(interactiveTarget(e.target)) return;
    var r = canvas.getBoundingClientRect();
    var px = e.clientX-r.left, py = e.clientY-r.top;
    var hit = nearest(px, py, 32);
    if(hit >= 0){
      dragged = hit; hovered = hit; downPos = [px, py];
      mouse.x = px; mouse.y = py;
      canvas.classList.add('dragging');
      showTip(hit, e.clientX, e.clientY);
      e.preventDefault(); // don't start text selection while grabbing a node
    }
  }, {capture:true});
  window.addEventListener('pointermove', function(e){
    var r = canvas.getBoundingClientRect();
    if(r.width === 0) return;
    var px = e.clientX-r.left, py = e.clientY-r.top;
    mouse.x = px; mouse.y = py;
    // camera target for 3D parallax (-1..1)
    cam.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    cam.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    if(dragged >= 0){
      nodes[dragged].x = Math.max(0, Math.min(W, px));
      nodes[dragged].y = Math.max(0, Math.min(H, py));
      nodes[dragged].vx = 0; nodes[dragged].vy = 0;
      showTip(dragged, e.clientX, e.clientY);
    } else {
      hovered = nearest(px, py, 28);
      showTip(hovered, e.clientX, e.clientY);
    }
  }, {passive:true});
  function release(e){
      if(dragged >= 0 && downPos && e && e.clientX !== undefined){
      var r = canvas.getBoundingClientRect();
      var moved = Math.hypot(e.clientX-r.left-downPos[0], e.clientY-r.top-downPos[1]);
      if(moved < 6) nodes[dragged].pinned = !nodes[dragged].pinned; // tap toggles pin
      else { nodes[dragged].vx = (Math.random()-.5)*0.5*SPEED; nodes[dragged].vy = (Math.random()-.5)*0.5*SPEED; }
    }
    dragged = -1; downPos = null;
    canvas.classList.remove('dragging');
  }
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  document.addEventListener('mouseleave', function(){ if(dragged<0){ hovered=-1; mouse.x=-9999; mouse.y=-9999; showTip(-1); } });
  function inHood(i){
    var h = dragged>=0 ? dragged : hovered;
    if(i===h) return true;
    for(var l=0;l<links.length;l++){
      if(links[l][0]===h && links[l][1]===i) return true;
      if(links[l][1]===h && links[l][0]===i) return true;
    }
    return false;
  }
  function frame(){
    t += 0.016;
    ctx.clearRect(0,0,W,H);
    var i, j, l;
    // smooth camera for 3D parallax
    cam.x += (cam.tx - cam.x) * 0.045;
    cam.y += (cam.ty - cam.y) * 0.045;
    // spring forces along links + mild global repulsion + damping (real force layout)
    for(l=0;l<links.length;l++){
      var sA=nodes[links[l][0]], sB=nodes[links[l][1]];
      var sx=sB.x-sA.x, sy=sB.y-sA.y, sd=Math.sqrt(sx*sx+sy*sy)||1;
      var sf=(sd-REST)*0.008, sux=sx/sd*sf, suy=sy/sd*sf;
      if(!sA.pinned && links[l][0]!==dragged){ sA.vx+=sux; sA.vy+=suy; }
      if(!sB.pinned && links[l][1]!==dragged){ sB.vx-=sux; sB.vy-=suy; }
    }
    for(i=0;i<nodes.length;i++){
      for(j=i+1;j<nodes.length;j++){
        var a=nodes[i], b=nodes[j];
        var ex=a.x-b.x, ey=a.y-b.y, d2=ex*ex+ey*ey;
        if(d2<8100 && d2>1){
          var d=Math.sqrt(d2), push=(90-d)*0.012/d;
          if(!a.pinned && i!==dragged){ a.vx+=ex*push; a.vy+=ey*push; }
          if(!b.pinned && j!==dragged){ b.vx-=ex*push; b.vy-=ey*push; }
        }
      }
    }
    // projected positions with depth (pseudo-3D)
    var PX = new Array(nodes.length), PY = new Array(nodes.length), PS = new Array(nodes.length);
    for(i=0;i<nodes.length;i++){
      var n = nodes[i];
      // depth drift — slow float between 0..1
      n.z += n.vz + Math.sin(t*0.6 + n.ph)*0.0006;
      if(n.z>1){ n.z=1; n.vz*=-1; }
      if(n.z<0){ n.z=0; n.vz*=-1; }
      if(i!==dragged && !n.pinned){
        n.vx*=0.92; n.vy*=0.92;
        n.x += n.vx; n.y += n.vy;
        n.vx+=(Math.random()-.5)*0.02*SPEED; n.vy+=(Math.random()-.5)*0.02*SPEED; // never freezes
        if(n.x<0||n.x>W){ n.vx*=-1; n.x=Math.max(0,Math.min(W,n.x)); }
        if(n.y<0||n.y>H){ n.vy*=-1; n.y=Math.max(0,Math.min(H,n.y)); }
        // hover repulsion - nodes move away as you approach
        var dx=n.x-mouse.x, dy=n.y-mouse.y, dd=Math.sqrt(dx*dx+dy*dy);
        if(dd<HOVER_R && dd>1){ var f=(1-dd/HOVER_R)*1.6; n.x+=dx/dd*f; n.y+=dy/dd*f; }
      }
      var depthScale = 0.55 + n.z*0.95;
      PS[i] = depthScale;
      PX[i] = n.x + cam.x * n.z * 34;
      PY[i] = n.y + cam.y * n.z * 26 + Math.sin(t*0.8 + n.ph)*3*n.z;
    }
    var focus = dragged>=0 ? dragged : hovered;
    var dim = focus >= 0;
    // edges — sorted far → near so near edges draw on top
    var order = links.slice().sort(function(p,q){
      return ((nodes[p[0]].z+nodes[p[1]].z) - (nodes[q[0]].z+nodes[q[1]].z));
    });
    for(l=0;l<order.length;l++){
      var li = order[l];
      var A=nodes[li[0]], B=nodes[li[1]];
      var ax = PX[li[0]], ay = PY[li[0]], bx = PX[li[1]], by = PY[li[1]];
      var avgZ = (A.z + B.z) * 0.5;
      var hot = focus>=0 && (li[0]===focus || li[1]===focus);
      var baseA = dim ? 0.06 : 0.07 + avgZ*0.16;
      ctx.strokeStyle = hot ? 'rgba(4,120,87,0.85)' : 'rgba(87,83,80,'+baseA.toFixed(3)+')';
      ctx.lineWidth = hot ? 1.5 : (0.6 + avgZ*0.7);
      ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
    }
    // nodes — far → near
    var norder = nodes.map(function(_,idx){ return idx; }).sort(function(p,q){ return nodes[p].z - nodes[q].z; });
    for(var k=0;k<norder.length;k++){
      i = norder[k];
      var p=nodes[i], hot2 = focus>=0 && inHood(i);
      var col = p.c>0.6 ? '5,150,105' : (p.c>0.3 ? '4,120,87' : '110,168,141');
      var R = p.r * PS[i] * (i===focus ? 1.9 : (hot2 ? 1.35 : 1));
      var fade = 0.35 + p.z*0.65;
      ctx.globalAlpha = (dim && !hot2 ? 0.28 : 1) * fade;
      var nx = PX[i], ny = PY[i];
      var g = ctx.createRadialGradient(nx,ny,0,nx,ny,Math.max(R*4,1));
      g.addColorStop(0,'rgba('+col+','+(hot2?1:0.85)+')'); g.addColorStop(1,'rgba('+col+',0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(nx,ny,R*4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = hot2 ? '#1C1917' : 'rgba(68,64,60,0.9)';
      ctx.beginPath(); ctx.arc(nx,ny,Math.max(R,0.6),0,Math.PI*2); ctx.fill();
      // depth shadow — near nodes get a soft offset for lift
      if(p.z > 0.62){
        ctx.fillStyle = 'rgba(28,25,23,'+((p.z-0.62)*0.28).toFixed(3)+')';
        ctx.beginPath(); ctx.arc(nx+1.5,ny+2.5,R*0.9,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = hot2 ? '#1C1917' : 'rgba(68,64,60,0.9)';
        ctx.beginPath(); ctx.arc(nx,ny,Math.max(R,0.6),0,Math.PI*2); ctx.fill();
      }
      if(i===focus){
        var pulse = 6 + Math.sin(t*4)*2; // breathing ring on the focused node
        ctx.strokeStyle='rgba(4,120,87,0.7)'; ctx.lineWidth=1.2;
        ctx.beginPath(); ctx.arc(nx,ny,R+pulse,0,Math.PI*2); ctx.stroke();
      }
      if(p.pinned && i!==focus){
        ctx.strokeStyle='rgba(4,120,87,0.55)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(nx,ny,R+4,0,Math.PI*2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener('resize', function(){ resize(); seed(); });
  resize(); seed(); frame();
}
document.addEventListener('DOMContentLoaded', initHeroCanvas);
})();
