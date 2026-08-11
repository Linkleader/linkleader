window.initIntroSplash = function(text, options){
  'use strict';
  var splash = document.getElementById('introSplash');
  var opts = options || {};

  function announce(){
    document.dispatchEvent(new CustomEvent('intro:done'));
  }

  function remove(){
    if(splash && splash.parentNode) splash.parentNode.removeChild(splash);
    document.body.classList.remove('intro-splash-active');
  }

  if(!splash){ announce(); return; }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Only greet once per browser session — a splash on every navigation is a toll,
  // not a welcome.
  var seen = false;
  try { seen = window.sessionStorage.getItem('ll-intro-seen') === '1'; } catch(e){}

  if(reduced || seen){
    remove();
    announce();
    return;
  }

  try { window.sessionStorage.setItem('ll-intro-seen', '1'); } catch(e){}

  document.body.classList.add('intro-splash-active');

  var canvas = document.getElementById('introSplashGrid');
  if(canvas && window.initKineticGrid){
    window.initKineticGrid(canvas, splash, opts.bg || '#060f26');
  }

  var textEl = document.getElementById('introSplashText');
  var dismissed = false;
  var timer = null;

  function dismiss(){
    if(dismissed) return;
    dismissed = true;
    if(timer) clearInterval(timer);
    splash.classList.add('is-hidden');
    document.body.classList.remove('intro-splash-active');
    announce();
    setTimeout(remove, 900);
  }

  splash.addEventListener('click', dismiss);
  window.addEventListener('keydown', dismiss, { once:true });
  window.addEventListener('wheel', dismiss, { once:true, passive:true });
  window.addEventListener('touchstart', dismiss, { once:true, passive:true });

  var i = 0;
  timer = setInterval(function(){
    textEl.textContent = text.slice(0, i + 1);
    i++;
    if(i >= text.length){
      clearInterval(timer);
      timer = null;
      splash.classList.add('is-complete');
      setTimeout(dismiss, 620);
    }
  }, 42);
};
