/* =========================================================
   FlowLink kit — shared motion.
   Masked type reveals, staggered groups, scroll progress,
   spotlight grids, magnetic buttons. Pairs with fl-kit.css.
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
    // Collect words along with whether they sat inside an <em>, so an accented
    // heading survives the rebuild instead of being flattened to plain text.
    var words = [];
    (function walk(node, accented){
      Array.prototype.forEach.call(node.childNodes, function(child){
        if(child.nodeType === 3){
          child.nodeValue.split(/\s+/).forEach(function(word){
            if(word) words.push({ text: word, accented: accented });
          });
        } else if(child.nodeType === 1){
          walk(child, accented || child.tagName === 'EM');
        }
      });
    })(el, false);

    if(!words.length) return;

    el.setAttribute('aria-label', words.map(function(w){ return w.text; }).join(' '));
    el.textContent = '';

    var frag = doc.createDocumentFragment();

    words.forEach(function(word, i){
      var mask = doc.createElement('span');
      mask.className = 'w';
      mask.setAttribute('aria-hidden', 'true');

      // Re-emit an <em> for accented words so the page's own `em` rules keep
      // applying without the splitter needing to know about them.
      var inner = doc.createElement(word.accented ? 'em' : 'span');
      inner.className = 'wi';
      inner.textContent = word.text;
      inner.style.setProperty('--i', i);

      mask.appendChild(inner);
      frag.appendChild(mask);
      if(i < words.length - 1) frag.appendChild(doc.createTextNode(' '));
    });

    el.appendChild(frag);
    el.classList.add('is-split');
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
     3. Scroll progress bar + condensed nav.
     --------------------------------------------------------- */
  var progressBar = doc.querySelector('.scroll-progress__bar');
  var nav = doc.querySelector('.nav');

  if(progressBar || nav){
    var ticking = false;

    var onFrame = function(){
      ticking = false;
      var vh = window.innerHeight || 1;
      var scrolled = window.pageYOffset || doc.documentElement.scrollTop || 0;

      if(progressBar){
        var scrollable = doc.documentElement.scrollHeight - vh;
        var p = scrollable > 0 ? clamp01(scrolled / scrollable) : 0;
        progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      }

      if(nav) nav.classList.toggle('is-scrolled', scrolled > 24);
    };

    var requestFrame = function(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(onFrame);
    };

    window.addEventListener('scroll', requestFrame, { passive:true });
    window.addEventListener('resize', requestFrame);
    requestFrame();
  }

  /* ---------------------------------------------------------
     4. Spotlight grid — a CSS-masked blueprint pattern that
     follows the cursor. On touch there is no cursor, so cards
     get an in-view class and CSS sweeps the mask instead.
     --------------------------------------------------------- */
  var spots = list('.grid-spot');

  if(spots.length && !reduced){
    if(canHover){
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
    } else if('IntersectionObserver' in window){
      var spotIO = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          entry.target.classList.toggle('is-inview', entry.isIntersecting);
        });
      }, { threshold: 0.35 });
      spots.forEach(function(el){ spotIO.observe(el); });
    }
  }

  /* ---------------------------------------------------------
     5. Magnetic buttons.
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
     6. iOS Safari only fires :active on elements with a bound
     touch listener.
     --------------------------------------------------------- */
  list('.tech-panel, .build-row, .qa__item, .sysview, .service-item').forEach(function(el){
    el.addEventListener('touchstart', function(){}, { passive:true });
  });
})();
