/* RepoGraph AI - hero sphere: the dependency graph as a living globe.
   Auto-rotates, drag to spin it yourself, hover a node to scatter +
   expand its neighbourhood. Renders every frame while in motion. */
(function(){
"use strict";
function initSphere(){
  var canvas = document.getElementById('sphere-canvas');
  var stage = document.querySelector('.sphere-stage');
  var tip = document.getElementById('sphere-tip');
  var hint = document.querySelector('.sphere-hint');
  if(!canvas || !stage) return;
  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOBILE = window.innerWidth < 640;
  var N = MOBILE ? 80 : 150;
  var nodes = [], links = [];
  var W = 0, H = 0, R = 0, CX = 0, CY = 0;
  var rotX = 0.42, rotY = 0.6, vx = 0, vy = 0;
  var SPIN = 0.009; // full 360° in ~12s, clearly visible
  var dragging = false, hovered = -1, raf = null;
  var mouse = {x: -9999, y: -9999, cx: 0, cy: 0, inside: false};
  var tipDirty = false;
  var pulses = []; // one-shot tap rings {i, t0}
  var downAt = 0, startPos = null, lastPos = null;
  var DIRS = ['lib','src','api','core','utils','graph','ai','store'];
  var NAMES = ['auth','graph','index','scan','cache','config','parser','query','agent','store','edge','node','prompt','model','router','worker','indexer','report'];

  function resize(){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    if(!W || !H) return;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W, H) * 0.42;
    CX = W / 2; CY = H / 2;
  }

  function seed(){
    nodes = []; links = [];
    var golden = Math.PI * (3 - Math.sqrt(5));
    for(var i = 0; i < N; i++){
      var y = 1 - (i / (N - 1)) * 2;
      var rad = Math.sqrt(Math.max(0, 1 - y*y));
      var th = golden * i;
      nodes.push({
        x: Math.cos(th) * rad, y: y, z: Math.sin(th) * rad,
        hub: i % 13 === 0,
        r: (i % 13 === 0) ? 4.2 : (1.8 + (i * 37 % 10) / 10 * 1.6),
        c: (i * 53 % 100) / 100
      });
    }
    // dense stable neighbourhood: 3 nearest in 3D per node
    for(var a = 0; a < N; a++){
      var scored = [];
      for(var b = 0; b < N; b++){
        if(a === b) continue;
        var dx = nodes[a].x-nodes[b].x, dy = nodes[a].y-nodes[b].y, dz = nodes[a].z-nodes[b].z;
        scored.push([dx*dx+dy*dy+dz*dz, b]);
      }
      scored.sort(function(p, q){ return p[0]-q[0]; });
      for(var j = 0; j < 3; j++){
        var x = a, y2 = scored[j][1];
        var key = x < y2 ? x+'-'+y2 : y2+'-'+x;
        var dup = false;
        for(var l = 0; l < links.length; l++) if(links[l][2] === key){ dup = true; break; }
        if(!dup) links.push([x, y2, key]);
      }
    }
    if(hint) hint.textContent = N + ' nodes · drag to spin · hover a node';
  }

  function label(i){
    if(nodes[i].hub) return DIRS[i % DIRS.length]+'/'+NAMES[(i*3) % NAMES.length]+'.ts';
    return NAMES[(i*7) % NAMES.length]+'-'+(i % 9 + 2)+'.ts';
  }
  function degree(i){
    var d = 0;
    for(var l = 0; l < links.length; l++) if(links[l][0] === i || links[l][1] === i) d++;
    return d;
  }
  function project(){
    var SX = new Array(N), SY = new Array(N), SS = new Array(N), SZ = new Array(N);
    var cx = Math.cos(rotX), sx = Math.sin(rotX);
    var cy = Math.cos(rotY), sy = Math.sin(rotY);
    var fov = 3.4;
    for(var i = 0; i < N; i++){
      var n = nodes[i];
      var x1 = n.x*cy + n.z*sy, z1 = -n.x*sy + n.z*cy;
      var y1 = n.y*cx - z1*sx, z2 = n.y*sx + z1*cx;
      var s = fov / (fov + z2);
      SX[i] = CX + x1 * R * s;
      SY[i] = CY + y1 * R * s;
      SS[i] = s;
      SZ[i] = z2;
    }
    return {x: SX, y: SY, s: SS, z: SZ};
  }
  function inHood(i){
    if(i === hovered) return true;
    for(var l = 0; l < links.length; l++){
      if(links[l][0] === hovered && links[l][1] === i) return true;
      if(links[l][1] === hovered && links[l][0] === i) return true;
    }
    return false;
  }
  // nearest VISIBLE node: screen distance wins, but front-layer
  // nodes get a strong discount so back nodes never steal the hover
  function nearest(px, py, P){
    var best = -1, bestScore = Infinity, R2 = 32*32;
    for(var i = 0; i < N; i++){
      var dx = P.x[i]-px, dy = P.y[i]-py, d = dx*dx+dy*dy;
      if(d < R2){
        var score = d - (P.s[i]-0.75)*4200;
        if(score < bestScore){ bestScore = score; best = i; }
      }
    }
    return best;
  }
  // tooltip paints only on change — cheap, no per-frame DOM churn
  function paintTip(){
    if(!tip) return;
    if(hovered < 0 || !mouse.inside){ tip.classList.remove('show'); return; }
    tip.innerHTML = '<b>'+label(hovered)+'</b> · '+degree(hovered)+' links';
    tip.style.left = mouse.cx+'px'; tip.style.top = mouse.cy+'px';
    tip.classList.add('show');
  }
  function kick(){ if(!raf) raf = requestAnimationFrame(frame); }

  function frame(){
    if(!reduceMotion){
      if(dragging){
        // rotation applied directly from drag deltas
      } else {
        rotY += vx + SPIN;
        rotX += vy;
        vx *= 0.95; vy *= 0.95;
      }
      if(rotX > 1.2){ rotX = 1.2; vy = 0; }
      if(rotX < -1.2){ rotX = -1.2; vy = 0; }
    }
    var P = project();
    // keep the hover glued to the node under the cursor while spinning
    if(!dragging && mouse.inside){
      var h = nearest(mouse.x, mouse.y, P);
      if(h !== hovered){ hovered = h; tipDirty = true; }
    }
    if(tipDirty){ paintTip(); tipDirty = false; }
    // hover scatter offsets (screen space, drawn only)
    var OX = new Array(N), OY = new Array(N);
    for(var s = 0; s < N; s++){ OX[s] = 0; OY[s] = 0; }
    if(mouse.inside && hovered < 0){
      for(var m = 0; m < N; m++){
        var mdx = P.x[m]-mouse.x, mdy = P.y[m]-mouse.y;
        var md = Math.sqrt(mdx*mdx+mdy*mdy);
        if(md < 110 && md > 1){
          var push = (1 - md/110) * 13;
          OX[m] = mdx/md*push; OY[m] = mdy/md*push;
        }
      }
    }
    ctx.clearRect(0, 0, W, H);
    // faint globe outline so the full sphere reads at a glance
    ctx.strokeStyle = 'rgba(5,150,105,.16)';
    ctx.setLineDash([4, 7]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    var dim = hovered >= 0;
    // edges, far first
    var order = links.slice().sort(function(p, q){
      return ((P.z[p[0]]+P.z[p[1]]) - (P.z[q[0]]+P.z[q[1]]));
    });
    for(var l = 0; l < order.length; l++){
      var li = order[l];
      var hot = hovered >= 0 && (li[0] === hovered || li[1] === hovered);
      var avgZ = (P.z[li[0]] + P.z[li[1]]) * 0.5;
      var edgeA = 0.13 + avgZ * 0.12;
      if(edgeA < 0.05) edgeA = 0.05;
      ctx.strokeStyle = hot ? 'rgba(4,120,87,0.9)' : 'rgba(105,120,112,'+(dim ? 0.08 : edgeA).toFixed(3)+')';
      ctx.lineWidth = hot ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(P.x[li[0]]+OX[li[0]], P.y[li[0]]+OY[li[0]]);
      ctx.lineTo(P.x[li[1]]+OX[li[1]], P.y[li[1]]+OY[li[1]]);
      ctx.stroke();
    }
    // nodes, far first
    var norder = nodes.map(function(_, idx){ return idx; }).sort(function(p, q){ return P.z[p] - P.z[q]; });
    for(var k = 0; k < norder.length; k++){
      var i = norder[k];
      var p = nodes[i], hot2 = hovered >= 0 && inHood(i);
      var col = p.c > 0.6 ? '5,150,105' : (p.c > 0.3 ? '4,120,87' : '110,135,125');
      var boost = (i === hovered) ? 2.3 : (hot2 ? 1.6 : 1);
      var Rr = p.r * P.s[i] * boost;
      var aFade = 0.45 + (P.s[i]-0.75)*1.1;
      if(aFade > 1) aFade = 1;
      if(aFade < 0.25) aFade = 0.25;
      ctx.globalAlpha = (dim && !hot2 ? 0.3 : 1) * aFade;
      var nx = P.x[i]+OX[i], ny = P.y[i]+OY[i];
      var g = ctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(Rr*4, 1));
      g.addColorStop(0, 'rgba('+col+','+(hot2 ? 1 : 0.8)+')');
      g.addColorStop(1, 'rgba('+col+',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(nx, ny, Rr*4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = hot2 ? '#1C1917' : 'rgba(68,64,60,0.9)';
      ctx.beginPath(); ctx.arc(nx, ny, Math.max(Rr, 0.7), 0, Math.PI*2); ctx.fill();
      if(i === hovered){
        ctx.strokeStyle = 'rgba(4,120,87,0.75)';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(nx, ny, Rr+7, 0, Math.PI*2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // one-shot tap pulses
    var now = performance.now();
    pulses = pulses.filter(function(pu){ return now - pu.t0 < 650; });
    if(pulses.length){
      var PP = project();
      for(var u = 0; u < pulses.length; u++){
        var pu = pulses[u], el = (now - pu.t0) / 650;
        ctx.strokeStyle = 'rgba(4,120,87,'+(0.8*(1-el)).toFixed(3)+')';
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.arc(PP.x[pu.i], PP.y[pu.i], 6 + el*26, 0, Math.PI*2); ctx.stroke();
      }
    }
    var rolling = !reduceMotion;
    if(rolling || dragging || hovered >= 0 || pulses.length ||
       Math.abs(vx) > 0.0004 || Math.abs(vy) > 0.0004){
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
    }
  }

  function evtPos(e){
    var r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  canvas.addEventListener('pointerdown', function(e){
    if(e.button !== undefined && e.button !== 0) return;
    if(canvas.setPointerCapture){ try{ canvas.setPointerCapture(e.pointerId); }catch(err){} }
    dragging = true;
    vx = 0; vy = 0;
    downAt = performance.now();
    startPos = [e.clientX, e.clientY];
    lastPos = [e.clientX, e.clientY];
    var pos = evtPos(e);
    mouse.x = pos[0]; mouse.y = pos[1]; mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.inside = true;
    hovered = nearest(pos[0], pos[1], project());
    tipDirty = true;
    stage.classList.add('dragging');
    kick();
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function(e){
    var pos = evtPos(e);
    mouse.x = pos[0]; mouse.y = pos[1]; mouse.cx = e.clientX; mouse.cy = e.clientY; mouse.inside = true;
    if(dragging && lastPos){
      var dx = e.clientX - lastPos[0], dy = e.clientY - lastPos[1];
      rotY += dx * 0.006;
      rotX += dy * 0.006;
      if(rotX > 1.2) rotX = 1.2;
      if(rotX < -1.2) rotX = -1.2;
      vx = dx * 0.00045; vy = dy * 0.00045;
      lastPos = [e.clientX, e.clientY];
      tipDirty = true;
      kick();
    } else if(!dragging){
      var h = nearest(pos[0], pos[1], project());
      if(h !== hovered){
        hovered = h;
        tipDirty = true;
      } else if(hovered >= 0){
        tipDirty = true;
      }
      kick();
    }
  });
  function release(e){
    if(dragging && startPos && e && e.clientX !== undefined){
      var moved = Math.hypot(e.clientX - startPos[0], e.clientY - startPos[1]);
      // tap on a node → one-shot pulse ring
      if(moved < 6 && performance.now() - downAt < 450 && hovered >= 0){
        pulses.push({i: hovered, t0: performance.now()});
        vx = 0; vy = 0;
      }
      if(reduceMotion){ vx = 0; vy = 0; }
    }
    dragging = false;
    startPos = null; lastPos = null;
    stage.classList.remove('dragging');
    kick();
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', function(){
    mouse.inside = false;
    if(!dragging){ hovered = -1; tipDirty = true; kick(); }
  });

  window.addEventListener('resize', function(){
    var mob = window.innerWidth < 640;
    if(mob !== MOBILE){
      MOBILE = mob;
      N = MOBILE ? 80 : 150;
      seed();
    }
    resize(); kick();
  });
  resize(); seed(); kick();
}
document.addEventListener('DOMContentLoaded', initSphere);
})();
