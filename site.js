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

  /* De balk staat bovenaan transparant over de hero en trekt zich samen
     zodra je scrollt. De drempel ligt op een paar tellen scrollen, zodat
     hij niet flikkert bij het kleinste duwtje. Het mobiele paneel houdt
     de balk gevuld, anders zweeft een uitgeklapt menu boven de pagina. */
  var nav = document.querySelector('.nav');
  if(nav){
    var vast = false;
    var meten = function(){
      var mnav = document.getElementById('mnav');
      var open = mnav && mnav.classList.contains('is-open');
      var moet = open || window.scrollY > 24;
      if(moet === vast) return;
      vast = moet;
      nav.classList.toggle('is-stuck', moet);
      document.documentElement.classList.toggle('nav-stuck', moet);
    };
    meten();
    window.addEventListener('scroll', meten, { passive:true });
    nav.addEventListener('menuwissel', meten);
  }

  var toggle = document.querySelector('.nav__toggle');
  var panel = document.getElementById('mnav');
  if(toggle && panel){
    var wissel = function(){
      if(nav) nav.dispatchEvent(new Event('menuwissel'));
    };
    toggle.addEventListener('click', function(){
      var isOpen = panel.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      wissel();
    });
    panel.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        panel.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
        wissel();
      });
    });
  }
})();
