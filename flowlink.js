/* =========================================================
   FlowLink page — the parts that only exist on this page:
   hero wordmark, hero parallax, process timeline, the pink
   compare band and the FAQ accordion.
   Shared motion lives in fl-motion.js and must load first.
   ========================================================= */
(function(){
  'use strict';

  var doc = document;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var list = function(sel, root){ return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var clamp01 = function(v){ return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------------------------------------------------------
     1. Hero wordmark — letters drop in once the intro hands over.
     Each letter carries its own mask so the reveal never depends
     on the wordmark's own overflow box, which has to stay open
     for the scroll parallax.
     --------------------------------------------------------- */
  function splitChars(el, start){
    var text = el.textContent || '';
    el.textContent = '';
    for(var i = 0; i < text.length; i++){
      var mask = doc.createElement('span');
      mask.className = 'ch';

      var inner = doc.createElement('span');
      inner.className = 'chi';
      inner.textContent = text.charAt(i);
      inner.style.setProperty('--i', start + i);

      mask.appendChild(inner);
      el.appendChild(mask);
    }
    return start + text.length;
  }

  var mark = doc.querySelector('.flowlink-mark');
  if(mark && !reduced){
    var charIndex = 0;
    Array.prototype.slice.call(mark.children).forEach(function(part){
      charIndex = splitChars(part, charIndex);
    });
  }

  var heroRevealed = false;
  function revealHero(){
    if(heroRevealed) return;
    heroRevealed = true;
    doc.body.classList.add('is-hero-ready');
  }

  if(reduced){
    revealHero();
  } else {
    doc.addEventListener('intro:done', revealHero);
    // Safety net: never leave the hero hidden if the splash never reports back.
    // The splash hands over at ~1.8s, so this only ever fires if it broke.
    window.setTimeout(revealHero, 2600);
  }

  /* ---------------------------------------------------------
     2. Scroll driver — one rAF-throttled pass sets every
     scroll-derived value on the page.
     --------------------------------------------------------- */
  var hero = doc.getElementById('aiHero');
  var timeline = doc.querySelector('.process-timeline');
  var steps = list('.process-step');
  var compare = doc.getElementById('pinkSection');
  var NAV_H = 79;
  var ticking = false;

  function onFrame(){
    ticking = false;

    var vh = window.innerHeight || 1;

    if(hero){
      var hr = hero.getBoundingClientRect();
      hero.style.setProperty('--hp', clamp01(-hr.top / Math.max(1, hr.height)).toFixed(4));
    }

    if(timeline){
      var tr = timeline.getBoundingClientRect();
      // The line is drawn to wherever the activation band currently sits, so
      // the fill and the dots light up at exactly the same moment.
      var lineY = vh * 0.68;
      var fill = clamp01((lineY - tr.top) / Math.max(1, tr.height));
      timeline.style.setProperty('--tp', fill.toFixed(4));
      steps.forEach(function(step){
        step.classList.toggle('is-active', step.getBoundingClientRect().top < lineY);
      });
    }

    if(compare){
      var cr = compare.getBoundingClientRect();
      // Active only while the band actually straddles the middle of the
      // viewport, so the colour change reads as deliberate rather than a flash.
      var active = cr.top < vh * 0.6 && cr.bottom > vh * 0.4;
      compare.classList.toggle('is-pink-active', active);
      // Re-tint the sticky nav while the pink band sits underneath it.
      doc.body.classList.toggle('is-pink-nav', active && cr.top < NAV_H && cr.bottom > NAV_H);
    }
  }

  function requestFrame(){
    if(ticking) return;
    ticking = true;
    window.requestAnimationFrame(onFrame);
  }

  window.addEventListener('scroll', requestFrame, { passive:true });
  window.addEventListener('resize', requestFrame);
  requestFrame();

  /* ---------------------------------------------------------
     3. FAQ accordion — one panel open at a time, height animated
     with grid-template-rows so it survives resizes and reflow.
     --------------------------------------------------------- */
  var qaItems = list('.qa__item');
  qaItems.forEach(function(item){
    var btn = item.querySelector('.qa__toggle');
    if(!btn) return;

    btn.addEventListener('click', function(){
      var opening = !item.classList.contains('is-open');
      qaItems.forEach(function(other){
        var isTarget = other === item && opening;
        other.classList.toggle('is-open', isTarget);
        var otherBtn = other.querySelector('.qa__toggle');
        if(otherBtn) otherBtn.setAttribute('aria-expanded', isTarget ? 'true' : 'false');
      });
    });
  });
})();
