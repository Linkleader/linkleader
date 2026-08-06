window.initCardGrid = function(card){
  'use strict';
  if(!card) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var CELL = 30;
  var INFLUENCE = 170;
  var MAX_WARP = 10;

  var canvas = document.createElement('canvas');
  canvas.className = 'card-grid__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  card.insertBefore(canvas, card.firstChild);

  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  var mouse = { x: -9999, y: -9999 };
  var hovering = false;
  var driftOffset = Math.random() * 6000;

  function setSize(){
    var rect = card.getBoundingClientRect();
    W = Math.round(rect.width);
    H = Math.round(rect.height);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function warped(gx, gy, fx, fy){
    var dx = gx - fx, dy = gy - fy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var t = Math.max(0, 1 - dist / INFLUENCE);
    var warp = t * t * MAX_WARP;
    var angle = Math.atan2(dy, dx);
    return { x: gx - Math.cos(angle) * warp, y: gy - Math.sin(angle) * warp, t: t };
  }

  function draw(now){
    if(!W || !H) return;
    ctx.clearRect(0, 0, W, H);

    var fx, fy;
    if(hovering){
      fx = mouse.x;
      fy = mouse.y;
    } else {
      var t = (now + driftOffset) / 5200;
      fx = W / 2 + Math.cos(t) * W * 0.38;
      fy = H / 2 + Math.sin(t * 1.31) * H * 0.38;
    }

    var cols = Math.ceil(W / CELL) + 1;
    var rows = Math.ceil(H / CELL) + 1;
    var row, col, p, pr, pd;

    for(row = 0; row < rows; row++){
      for(col = 0; col < cols; col++){
        p = warped(col * CELL, row * CELL, fx, fy);

        if(col < cols - 1){
          pr = warped((col + 1) * CELL, row * CELL, fx, fy);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pr.x, pr.y);
          ctx.strokeStyle = 'rgba(0,115,255,' + (0.14 + Math.max(p.t, pr.t) * 0.35).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if(row < rows - 1){
          pd = warped(col * CELL, (row + 1) * CELL, fx, fy);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pd.x, pd.y);
          ctx.strokeStyle = 'rgba(0,115,255,' + (0.14 + Math.max(p.t, pd.t) * 0.35).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  setSize();

  if(reduced){
    draw(0);
    return;
  }

  window.addEventListener('resize', setSize);

  card.addEventListener('mousemove', function(e){
    var rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    hovering = true;
  }, { passive:true });

  card.addEventListener('mouseleave', function(){
    hovering = false;
  });

  function loop(now){
    draw(now);
    window.requestAnimationFrame(loop);
  }
  window.requestAnimationFrame(loop);
};
