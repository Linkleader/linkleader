(function(){
  'use strict';

  var revealEls = document.querySelectorAll('.reveal');
  if(revealEls.length){
    if(!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      revealEls.forEach(function(el){ el.classList.add('is-in'); });
    } else {
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function(el){ io.observe(el); });
    }
  }

  var toggle = document.querySelector('.nav__toggle');
  var panel = document.getElementById('mnav');
  if(toggle && panel){
    toggle.addEventListener('click', function(){
      var isOpen = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    panel.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();
