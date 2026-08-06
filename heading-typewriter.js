window.initHeadingTypewriter = function(selector){
  'use strict';
  var TYPE_MS = 30;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced || !('IntersectionObserver' in window)) return;

  var headings = Array.prototype.slice.call(document.querySelectorAll(selector));
  if(!headings.length) return;

  headings.forEach(function(h){
    var parts = h.innerHTML.split(/<br\s*\/?>/i);
    if(parts.length > 1){
      h.setAttribute('data-line1', parts[0].replace(/<[^>]*>/g, '').trim());
      h.setAttribute('data-line2', parts.slice(1).join(' ').replace(/<[^>]*>/g, '').trim());
      h.setAttribute('data-two-line', '1');
    } else {
      h.setAttribute('data-line1', h.textContent.trim());
      h.setAttribute('data-two-line', '0');
    }
    h.innerHTML = '';
  });

  function typeInto(el, text, cb){
    var i = 0;
    var timer = setInterval(function(){
      el.appendChild(document.createTextNode(text.charAt(i)));
      i++;
      if(i >= text.length){
        clearInterval(timer);
        if(cb) cb();
      }
    }, TYPE_MS);
  }

  function run(h){
    var line1 = h.getAttribute('data-line1') || '';
    if(h.getAttribute('data-two-line') === '1'){
      var line2 = h.getAttribute('data-line2') || '';
      var span1 = document.createElement('span');
      span1.style.color = 'var(--pink)';
      h.appendChild(span1);
      typeInto(span1, line1, function(){
        h.appendChild(document.createElement('br'));
        var span2 = document.createElement('span');
        h.appendChild(span2);
        typeInto(span2, line2);
      });
    } else {
      typeInto(h, line1);
    }
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        run(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  headings.forEach(function(h){ io.observe(h); });
};
