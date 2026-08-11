/* =========================================================
   FlowLink — page motion system
   Masked type reveals, scroll-linked state, spotlight grids.
   Everything degrades to a static page under reduced motion.
   ========================================================= */
(function(){
  'use strict';

  var doc = document;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var list = function(sel, root){ return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };
  var clamp01 = function(v){ return v < 0 ? 0 : v > 1 ? 1 : v; };

  /* ---------------------------------------------------------
     1. Type splitting — words rise out of a mask, one by one.
     The visible text is rebuilt from spans, so the original
     string is preserved on the element as an aria-label.
     --------------------------------------------------------- */
  function splitWords(el){
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if(!text) return;

    el.setAttribute('aria-label', text);
    el.textContent = '';

    var words = text.split(' ');
    var frag = doc.createDocumentFragment();

    words.forEach(function(word, i){
      var mask = doc.createElement('span');
      mask.className = 'w';
      mask.setAttribute('aria-hidden', 'true');

      var inner = doc.createElement('span');
      inner.className = 'wi';
      inner.textContent = word;
      inner.style.setProperty('--i', i);

      mask.appendChild(inner);
      frag.appendChild(mask);
      if(i < words.length - 1) frag.appendChild(doc.createTextNode(' '));
    });

    el.appendChild(frag);
    el.classList.add('is-split');
  }

  function splitChars(el, start){
    var text = el.textContent || '';
    el.textContent = '';
    for(var i = 0; i < text.length; i++){
      // Each letter carries its own mask so the reveal never depends on the
      // wordmark's own overflow box, which has to stay open for the scroll parallax.
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

  if(!reduced && 'IntersectionObserver' in window){
    var splitTargets = list('[data-split]');
    splitTargets.forEach(splitWords);

    var splitIO = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        entry.target.classList.add('is-split-in');
        splitIO.unobserve(entry.target);
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

    splitTargets.forEach(function(el){ splitIO.observe(el); });
  }

  /* ---------------------------------------------------------
     2. Stagger — index every child of a [data-stagger] group so
     CSS can offset its transition-delay.
     --------------------------------------------------------- */
  list('[data-stagger]').forEach(function(group){
    Array.prototype.slice.call(group.children).forEach(function(child, i){
      child.style.setProperty('--i', i);
    });
  });

  /* ---------------------------------------------------------
     3. Hero wordmark — letters drop in once the intro hands over.
     --------------------------------------------------------- */
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
     4. Scroll driver — one rAF-throttled pass sets every
     scroll-derived value on the page.
     --------------------------------------------------------- */
  var progressBar = doc.querySelector('.scroll-progress__bar');
  var nav = doc.querySelector('.nav');
  var hero = doc.getElementById('aiHero');
  var timeline = doc.querySelector('.process-timeline');
  var steps = list('.process-step');
  var compare = doc.getElementById('pinkSection');
  var NAV_H = 79;
  var ticking = false;

  function onFrame(){
    ticking = false;

    var vh = window.innerHeight || 1;
    var scrolled = window.pageYOffset || doc.documentElement.scrollTop || 0;

    if(progressBar){
      var scrollable = doc.documentElement.scrollHeight - vh;
      var p = scrollable > 0 ? clamp01(scrolled / scrollable) : 0;
      progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    }

    if(nav) nav.classList.toggle('is-scrolled', scrolled > 24);

    if(hero){
      var hr = hero.getBoundingClientRect();
      hero.style.setProperty('--hp', clamp01(-hr.top / Math.max(1, hr.height)).toFixed(4));
    }

    if(timeline){
      var tr = timeline.getBoundingClientRect();
      var fill = clamp01((vh * 0.68 - tr.top) / Math.max(1, tr.height));
      timeline.style.setProperty('--tp', fill.toFixed(4));
      steps.forEach(function(step){
        step.classList.toggle('is-active', step.getBoundingClientRect().top < vh * 0.68);
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
     5. Spotlight grid — a CSS-masked blueprint pattern that
     follows the cursor. Replaces the per-card canvases.
     --------------------------------------------------------- */
  if(!reduced && canHover){
    var spotEl = null, spotX = 0, spotY = 0, spotQueued = false;

    doc.addEventListener('pointermove', function(e){
      var target = e.target;
      if(!target || typeof target.closest !== 'function') return;
      var el = target.closest('.grid-spot');
      if(!el) return;

      spotEl = el;
      spotX = e.clientX;
      spotY = e.clientY;

      if(spotQueued) return;
      spotQueued = true;
      window.requestAnimationFrame(function(){
        spotQueued = false;
        if(!spotEl) return;
        var r = spotEl.getBoundingClientRect();
        if(!r.width || !r.height) return;
        spotEl.style.setProperty('--mx', ((spotX - r.left) / r.width * 100).toFixed(2) + '%');
        spotEl.style.setProperty('--my', ((spotY - r.top) / r.height * 100).toFixed(2) + '%');
      });
    }, { passive:true });
  }

  /* ---------------------------------------------------------
     6. FAQ accordion — one panel open at a time, height animated
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

  /* ---------------------------------------------------------
     7. Magnetic buttons.
     --------------------------------------------------------- */
  if(!reduced && canHover){
    list('[data-magnetic]').forEach(function(el){
      el.addEventListener('pointermove', function(e){
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        el.style.transform = 'translate(' + (x * 6).toFixed(2) + 'px,' + (y * 4).toFixed(2) + 'px)';
      });
      el.addEventListener('pointerleave', function(){
        el.style.transform = '';
      });
    });
  }

  /* ---------------------------------------------------------
     8. iOS Safari only fires :active on elements with a bound
     touch listener.
     --------------------------------------------------------- */
  list('.tech-panel, .build-row, .qa__item, .sysview').forEach(function(el){
    el.addEventListener('touchstart', function(){}, { passive:true });
  });
})();
