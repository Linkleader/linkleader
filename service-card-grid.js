(function(){
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cards = Array.prototype.slice.call(document.querySelectorAll('.service-item'));
  if(!cards.length) return;

  var CELL = 30;
  var INFLUENCE = 150;
  var MAX_WARP = 9;

  cards.forEach(function(card){
    var canvas = document.createElement('canvas');
    canvas.className = 'service-item__grid';
    canvas.setAttribute('aria-hidden', 'true');
    card.insertBefore(canvas, card.firstChild);

    var ctx = canvas.getContext('2d');
    var W = 0, H = 0;
    var mouse = { x: -9999, y: -9999 };
    var ticking = false;

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

    function warped(gx, gy){
      var dx = gx - mouse.x, dy = gy - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var t = Math.max(0, 1 - dist / INFLUENCE);
      var warp = t * t * MAX_WARP;
      var angle = Math.atan2(dy, dx);
      return { x: gx - Math.cos(angle) * warp, y: gy - Math.sin(angle) * warp, t: t };
    }

    function draw(){
      if(!W || !H) return;
      ctx.clearRect(0, 0, W, H);

      var cols = Math.ceil(W / CELL) + 1;
      var rows = Math.ceil(H / CELL) + 1;
      var row, col, p, pr, pd;

      for(row = 0; row < rows; row++){
        for(col = 0; col < cols; col++){
          p = warped(col * CELL, row * CELL);

          if(col < cols - 1){
            pr = warped((col + 1) * CELL, row * CELL);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pr.x, pr.y);
            ctx.strokeStyle = 'rgba(0,115,255,' + (0.05 + Math.max(p.t, pr.t) * 0.28).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          if(row < rows - 1){
            pd = warped(col * CELL, (row + 1) * CELL);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pd.x, pd.y);
            ctx.strokeStyle = 'rgba(0,115,255,' + (0.05 + Math.max(p.t, pd.t) * 0.28).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    function requestDraw(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(function(){
        draw();
        ticking = false;
      });
    }

    setSize();
    draw();

    if(reduced) return;

    window.addEventListener('resize', function(){
      setSize();
      draw();
    });

    card.addEventListener('mousemove', function(e){
      var rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      requestDraw();
    }, { passive:true });

    card.addEventListener('mouseleave', function(){
      mouse.x = -9999;
      mouse.y = -9999;
      requestDraw();
    });
  });
})();
