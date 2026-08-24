/* ===========================================================
   DIENSTENMENU
   ===========================================================
   Het paneel is een verrijking, geen voorwaarde: "Onze services"
   blijft een gewone link naar de hub, dus zonder JS werkt de
   navigatie nog steeds. Openen gebeurt op hover en op focus, zodat
   toetsenbord en muis dezelfde route hebben.
   =========================================================== */
(function(){
  'use strict';

  var nav = document.querySelector('.nav');
  var trigger = document.querySelector('.nav__svc');
  var mega = document.getElementById('svcmenu');
  if(!nav || !trigger || !mega) return;

  var open = false;
  var closeTimer = null;

  var setOpen = function(next){
    if(next === open) return;
    open = next;
    mega.classList.toggle('is-open', open);
    nav.classList.toggle('is-mega', open);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  // Korte tolerantie bij het verlaten: de muis moet van de knop naar
  // het paneel kunnen bewegen zonder dat het onderweg dichtklapt.
  var scheduleClose = function(){
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function(){ setOpen(false); }, 180);
  };
  var cancelClose = function(){ clearTimeout(closeTimer); };

  [trigger, mega].forEach(function(el){
    el.addEventListener('mouseenter', function(){ cancelClose(); setOpen(true); });
    el.addEventListener('mouseleave', scheduleClose);
  });

  trigger.addEventListener('focus', function(){ cancelClose(); setOpen(true); });

  // Focus die het paneel én de knop verlaat sluit af; blijft de focus
  // binnen, dan niet.
  document.addEventListener('focusin', function(e){
    if(!open) return;
    if(trigger.contains(e.target) || mega.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' || !open) return;
    setOpen(false);
    trigger.focus();
  });

  // Buiten klikken sluit. De klik op de knop zelf navigeert gewoon.
  document.addEventListener('click', function(e){
    if(!open) return;
    if(trigger.contains(e.target) || mega.contains(e.target)) return;
    setOpen(false);
  });

  window.addEventListener('resize', function(){
    if(open && window.innerWidth <= 900) setOpen(false);
  });
})();
