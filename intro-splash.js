window.initIntroSplash = function(text){
  'use strict';
  var splash = document.getElementById('introSplash');
  if(!splash) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced){
    splash.parentNode.removeChild(splash);
    return;
  }

  document.body.classList.add('intro-splash-active');

  var canvas = document.getElementById('introSplashGrid');
  if(canvas && window.initKineticGrid){
    window.initKineticGrid(canvas, splash, '#0a1837');
  }

  var textEl = document.getElementById('introSplashText');
  var dismissed = false;

  function dismiss(){
    if(dismissed) return;
    dismissed = true;
    splash.classList.add('is-hidden');
    document.body.classList.remove('intro-splash-active');
    setTimeout(function(){
      if(splash.parentNode) splash.parentNode.removeChild(splash);
    }, 700);
  }

  splash.addEventListener('click', dismiss);

  var i = 0;
  var timer = setInterval(function(){
    textEl.textContent = text.slice(0, i + 1);
    i++;
    if(i >= text.length){
      clearInterval(timer);
      setTimeout(dismiss, 900);
    }
  }, 55);
};
