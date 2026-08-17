window.initKineticGrid = function(canvas, region, bgColor){
  'use strict';
  if(!canvas || !region) return;

  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Touch devices never fire mousemove, so without an ambient driver the grid
  // renders a completely static lattice — indistinguishable from "no animation".
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  var CELL_SIZE = fine ? 55 : 62;
  var INFLUENCE_RADIUS = fine ? 260 : 200;
  var MAX_WARP = 24;
  var DOT_SPACING = fine ? 28 : 36;
  var LERP_SPEED = 0.08;

  var LINE_BASE = { r:255, g:255, b:255, a:.06 };
  var NODE_BASE_A = .12;
  var NODE_BASE_RADIUS = 1.8;
  var NODE_ACTIVE_RADIUS = 3.2;

  // The grid picks up whatever accent the page is set to, so a service page
  // does not end up with a magenta lattice under a green wordmark. Falls back
  // to the house magenta when --pink is missing or unparseable.
  function readAccent(){
    var raw = getComputedStyle(document.body).getPropertyValue('--pink').trim();
    var m = /^#?([0-9a-f]{6})$/i.exec(raw);
    if(!m) return null;
    var n = parseInt(m[1], 16);
    return { r:(n >> 16) & 255, g:(n >> 8) & 255, b:n & 255 };
  }

  var accent = readAccent() || { r:193, g:0, b:124 };
  // The active line/node sit a step brighter than the flat accent, the way the
  // original magenta (#f056b9) sat above #C1007C.
  var lift = function(c){ return Math.round(c + (255 - c) * .30); };
  var hi = { r:lift(accent.r), g:lift(accent.g), b:lift(accent.b) };

  var THEME = {
    bg: bgColor || '#060f26',
    lineActive: { r:hi.r, g:hi.g, b:hi.b, a:.9 },
    nodeActive: { r:hi.r, g:hi.g, b:hi.b, a:1 },
    glow: accent.r + ',' + accent.g + ',' + accent.b,
    ripple: '0,115,255'
  };

  var mouse = { x:-9999, y:-9999 };
  var targetMouse = { x:-9999, y:-9999 };
  var ripples = [];
  var W = 0, H = 0;
  var visible = true;
  var running = false;

  // Ambient drive: a slow figure-eight focal point that keeps the grid alive
  // when nothing is pointing at it. A real pointer always takes priority.
  var ambient = true;
  var ambientPhase = Math.random() * 1000;
  var releaseTimer = 0;
  var nextAutoRipple = 0;

  function lerpN(a, b, t){ return a + (b - a) * t; }

  function lerpColor(base, active, t){
    var r = Math.round(lerpN(base.r, active.r, t));
    var g = Math.round(lerpN(base.g, active.g, t));
    var b = Math.round(lerpN(base.b, active.b, t));
    var a = lerpN(base.a, active.a, t);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  function setSize(){
    var rect = region.getBoundingClientRect();
    W = Math.round(rect.width);
    H = Math.round(rect.height);
    var dpr = Math.min(window.devicePixelRatio || 1, fine ? 2 : 1.75);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getWarpedPoint(gx, gy, col, row, cols, rows){
    var edgeMargin = 1.5;
    var colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
    var rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
    var pinFactor = colPin * colPin * rowPin * rowPin;

    var dx = gx - mouse.x;
    var dy = gy - mouse.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

    var rx = 0, ry = 0;
    for(var i = 0; i < ripples.length; i++){
      var r = ripples[i];
      var rdx = gx - r.x;
      var rdy = gy - r.y;
      var rdist = Math.sqrt(rdx * rdx + rdy * rdy);
      var waveWidth = 55;
      var diff = rdist - r.radius;
      if(Math.abs(diff) < waveWidth){
        var strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
        var angle2 = Math.atan2(rdy, rdx);
        var sign = diff < 0 ? -1 : 1;
        rx += Math.cos(angle2) * strength * sign * -1;
        ry += Math.sin(angle2) * strength * sign * -1;
      }
    }

    if(dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0){
      var t = dist / INFLUENCE_RADIUS;
      var eased = t < .01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
      var warpAmt = eased * MAX_WARP * pinFactor;
      var angle = Math.atan2(dy, dx);
      return {
        pt: { x: gx - Math.cos(angle) * warpAmt + rx, y: gy - Math.sin(angle) * warpAmt + ry },
        proximity: proximity
      };
    }

    return { pt: { x: gx + rx, y: gy + ry }, proximity: proximity };
  }

  function drawSeg(p1, p2, pr1, pr2){
    var avg = (pr1 + pr2) / 2;
    var t = avg * avg * (3 - 2 * avg);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = lerpColor(LINE_BASE, THEME.lineActive, t);
    ctx.lineWidth = lerpN(.8, 1.5, t);
    ctx.stroke();
  }

  function draw(now){
    if(!W || !H) return;

    ctx.clearRect(0, 0, W, H);
    if(THEME.bg !== 'transparent'){
      ctx.fillStyle = THEME.bg;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for(var x = DOT_SPACING / 2; x < W; x += DOT_SPACING){
      for(var y = DOT_SPACING / 2; y < H; y += DOT_SPACING){
        ctx.beginPath();
        ctx.arc(x, y, .7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for(var i = ripples.length - 1; i >= 0; i--){
      var r = ripples[i];
      var age = (now - r.born) / 1000;
      r.radius = Math.max(0, age * 400);
      r.opacity = Math.max(0, 1 - age * 1.2);
      if(r.opacity <= 0) ripples.splice(i, 1);
    }

    var cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
    var rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
    var cellW = W / (cols - 1);
    var cellH = H / (rows - 1);

    var pts = [];
    var prox = [];
    var row, col;

    for(row = 0; row < rows; row++){
      pts[row] = [];
      prox[row] = [];
      for(col = 0; col < cols; col++){
        var res = getWarpedPoint(col * cellW, row * cellH, col, row, cols, rows);
        pts[row][col] = res.pt;
        prox[row][col] = res.proximity;
      }
    }

    ctx.lineCap = 'butt';

    for(row = 0; row < rows; row++)
      for(col = 0; col < cols - 1; col++)
        drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);

    for(col = 0; col < cols; col++)
      for(row = 0; row < rows - 1; row++)
        drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);

    for(row = 0; row < rows; row++){
      for(col = 0; col < cols; col++){
        var p = pts[row][col];
        var pr = prox[row][col];
        var t = pr * pr * (3 - 2 * pr);
        var rad = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

        if(t > .3){
          var glowR = rad + lerpN(0, 6, (t - .3) / .7);
          var grd = ctx.createRadialGradient(p.x, p.y, rad * .5, p.x, p.y, glowR);
          grd.addColorStop(0, 'rgba(' + THEME.glow + ',' + (t * .3).toFixed(3) + ')');
          grd.addColorStop(1, 'rgba(' + THEME.glow + ',0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = lerpColor({ r:255, g:255, b:255, a:NODE_BASE_A }, THEME.nodeActive, t);
        ctx.fill();
      }
    }

    for(i = 0; i < ripples.length; i++){
      var rp = ripples[i];
      var safeRadius = Math.max(0, rp.radius);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, safeRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(' + THEME.ripple + ',' + (rp.opacity * .28).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function driveAmbient(now){
    var t = now / 1000 + ambientPhase;
    targetMouse.x = W * (0.5 + 0.36 * Math.cos(t * 0.29));
    targetMouse.y = H * (0.5 + 0.32 * Math.sin(t * 0.21));

    // A ripple every few seconds so the motion reads as deliberate, not drift.
    if(now > nextAutoRipple){
      if(nextAutoRipple) addRipple(targetMouse.x, targetMouse.y, now);
      nextAutoRipple = now + 5200;
    }
  }

  function animate(now){
    // Stop the loop when the canvas is detached or scrolled out of view, so
    // several instances on one page don't all render forever.
    if(!canvas.isConnected || !visible){ running = false; return; }
    if(ambient) driveAmbient(now);
    mouse.x = lerpN(mouse.x, targetMouse.x, LERP_SPEED);
    mouse.y = lerpN(mouse.y, targetMouse.y, LERP_SPEED);
    draw(now);
    window.requestAnimationFrame(animate);
  }

  function addRipple(x, y, now){
    ripples.push({ x:x, y:y, radius:0, opacity:1, born: now || performance.now() });
  }

  function takeOver(clientX, clientY){
    var rect = canvas.getBoundingClientRect();
    ambient = false;
    window.clearTimeout(releaseTimer);
    targetMouse.x = clientX - rect.left;
    targetMouse.y = clientY - rect.top;
    start();
  }

  // Hand the grid back to the ambient driver once the pointer is done, so a
  // touch screen never freezes on the last finger position.
  function release(delay){
    window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(function(){
      ambient = true;
      nextAutoRipple = 0;
      start();
    }, delay);
  }

  function start(){
    if(running) return;
    running = true;
    window.requestAnimationFrame(animate);
  }

  setSize();

  if(reduced){
    draw(performance.now());
  } else {
    window.addEventListener('resize', setSize);

    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        visible = entries[0].isIntersecting;
        if(visible) start();
      }, { rootMargin:'160px' }).observe(region);
    }

    if(fine){
      window.addEventListener('mousemove', function(e){
        if(!visible) return;
        takeOver(e.clientX, e.clientY);
      }, { passive:true });

      // Cursor left the window entirely — resume the ambient drift.
      document.addEventListener('mouseleave', function(){ release(400); });
    }

    // Touch drag steers the grid directly; lifting hands it back after a beat.
    region.addEventListener('touchstart', function(e){
      if(!e.touches.length) return;
      takeOver(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive:true });

    region.addEventListener('touchmove', function(e){
      if(!e.touches.length) return;
      takeOver(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive:true });

    region.addEventListener('touchend', function(){ release(1400); }, { passive:true });
    region.addEventListener('touchcancel', function(){ release(1400); }, { passive:true });

    region.addEventListener('click', function(e){
      var rect = canvas.getBoundingClientRect();
      addRipple(e.clientX - rect.left, e.clientY - rect.top);
      start();
    });

    start();
  }
};
