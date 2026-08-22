/* ===========================================================
   MATCHLINK — interactie en motion
   ===========================================================
   Beweging moet iets uitleggen dat stilstaand niet overkomt.
   Wie om minder motion vraagt krijgt overal direct de eindstand.
   =========================================================== */
(function(){
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var list = function(sel, root){ return [].slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- reveal ---------------- */
  var revs = list('.mx-rev');
  if(revs.length){
    if(REDUCED || !('IntersectionObserver' in window)){
      revs.forEach(function(el){ el.classList.add('is-in'); });
    } else {
      var revObs = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(!e.isIntersecting) return;
          e.target.classList.add('is-in');
          revObs.unobserve(e.target);
        });
      }, { rootMargin:'0px 0px -12% 0px', threshold:.12 });
      revs.forEach(function(el){ revObs.observe(el); });
    }
  }

  /* ---------------- leesvoortgang ---------------- */
  var bar = document.querySelector('.mx-progress span');
  if(bar){
    var ticking = false;
    var draw = function(){
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? Math.min(1, window.scrollY / h) * 100 : 0).toFixed(2) + '%';
      ticking = false;
    };
    window.addEventListener('scroll', function(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(draw);
    }, { passive:true });
    draw();
  }

  /* ---------------- sticky CTA ----------------
     Aan zodra de hero weg is, weer uit bij de quickscan zelf — een
     balk die naar een sectie wijst terwijl je erin staat is ruis. */
  var sticky = document.querySelector('.mx-sticky');
  var hero = document.querySelector('.mx-hero');
  var scan = document.getElementById('quickscan');
  if(sticky && hero && 'IntersectionObserver' in window){
    var heroOut = false, scanIn = false;
    var sync = function(){ sticky.classList.toggle('is-on', heroOut && !scanIn); };
    new IntersectionObserver(function(e){ heroOut = !e[0].isIntersecting; sync(); }, { threshold:0 }).observe(hero);
    if(scan) new IntersectionObserver(function(e){ scanIn = e[0].isIntersecting; sync(); }, { threshold:0 }).observe(scan);
  }

  /* ---------------- de keten ----------------
     Licht de knopen na elkaar op, zodat je de richting van de lijn
     leest voordat je de labels leest. */
  list('.mx-chain').forEach(function(chain){
    var nodes = list('.mx-node', chain);
    var light = function(){
      chain.classList.add('is-on');
      nodes.forEach(function(n, i){
        if(REDUCED){ n.classList.add('is-lit'); return; }
        setTimeout(function(){ n.classList.add('is-lit'); }, 180 + i * 150);
      });
    };
    if(REDUCED || !('IntersectionObserver' in window)){ light(); return; }
    var obs = new IntersectionObserver(function(entries){
      if(!entries[0].isIntersecting) return;
      light();
      obs.disconnect();
    }, { threshold:.35 });
    obs.observe(chain);
  });

  /* ---------------- automatiseringsspectrum ----------------
     Dezelfde keten als in de hero, nu bedienbaar. De bezoeker kiest
     hoeveel hij wil automatiseren en ziet welke stappen van hand
     wisselen — dat is de verkoopvraag ("welk deel wil je zelf nog
     doen?") als beeld in plaats van als tekst. */
  var spec = document.querySelector('.mx-spec');
  if(spec){
    var lvls = list('.mx-lvl', spec);
    var say  = spec.querySelector('.mx-spec__say');
    var owns = list('.mx-node__w', spec);

    var MODES = {
      1: {
        who:['Binnenkomst','AI','AI','Planner','Planner','AI'],
        say:'<b>De planner houdt de regie.</b> AI leest de aanvraag, toetst je hele bestand en legt uit waarom een kandidaat bovenaan staat. Jouw planner beslist wie hij benadert en bevestigt zelf. Voor bureaus die eerst vertrouwen willen opbouwen.'
      },
      2: {
        who:['Binnenkomst','AI','AI','Planner + AI','AI','AI'],
        say:'<b>AI werkt, je planner controleert.</b> De uitvraag gaat pas de deur uit als je planner het voorstel heeft goedgekeurd. Daarna lopen herinnering, bevestiging en terugschrijven vanzelf. Voor bureaus die het meeste handwerk kwijt willen zonder de controle op te geven.'
      },
      3: {
        who:['Binnenkomst','AI','AI','AI','AI','AI'],
        say:'<b>AI handelt af.</b> Van aanvraag tot bevestigde plaatsing loopt het door. Je planner komt eraan te pas als een regel wordt overschreden, informatie ontbreekt of het oordeel van een mens nodig is. Voor bureaus die maximaal willen automatiseren.'
      }
    };

    var setMode = function(n){
      var mode = MODES[n];
      if(!mode) return;
      owns.forEach(function(el, i){
        var w = mode.who[i] || '';
        el.textContent = w;
        el.classList.toggle('is-ai', w === 'AI');
        el.classList.toggle('is-mix', w === 'Planner + AI');
      });
      if(say) say.innerHTML = mode.say;
      lvls.forEach(function(b){
        var on = b.dataset.lvl === String(n);
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    };

    lvls.forEach(function(b){
      b.addEventListener('click', function(){ setMode(b.dataset.lvl); });
    });
    setMode(2);
  }

  /* ---------------- hero-demo ---------------- */
  var demo = document.querySelector('.mx-demo');
  if(demo){
    var steps = list('.mx-step', demo);
    var elapsed = demo.querySelector('.mx-demo__elapsed b');
    var replay = demo.querySelector('.mx-demo__replay');
    var CUES = [
      { at:0,    label:'0:00' },
      { at:700,  label:'0:03' },
      { at:1500, label:'0:07' },
      { at:2400, label:'0:58' },
      { at:3300, label:'4:37' }
    ];
    var timers = [];

    var showAll = function(){
      steps.forEach(function(s){ s.classList.add('is-on'); });
      if(elapsed) elapsed.textContent = CUES[CUES.length - 1].label;
    };

    var play = function(){
      timers.forEach(clearTimeout);
      timers = [];
      if(REDUCED){ showAll(); return; }
      steps.forEach(function(s){ s.classList.remove('is-on'); });
      if(elapsed) elapsed.textContent = '0:00';
      steps.forEach(function(step, i){
        var cue = CUES[i] || CUES[CUES.length - 1];
        timers.push(setTimeout(function(){
          step.classList.add('is-on');
          if(elapsed) elapsed.textContent = cue.label;
        }, cue.at));
      });
    };

    if(REDUCED){
      showAll();
    } else if('IntersectionObserver' in window){
      var played = false;
      new IntersectionObserver(function(e){
        if(e[0].isIntersecting && !played){ played = true; play(); }
      }, { threshold:.35 }).observe(demo);
    } else {
      play();
    }
    if(replay) replay.addEventListener('click', play);
  }

  /* ---------------- de race ----------------
     Beide sporen staan op dezelfde tijdas. Daardoor is de tweede balk
     maar 1,2% breed — dat verschil in breedte ís het argument, dus
     het wordt niet weggeschaald. */
  var race = document.querySelector('.mx-race');
  if(race){
    var run = function(){
      race.classList.add('is-run');
      list('.mx-fill', race).forEach(function(f){ f.style.width = f.dataset.w + '%'; });
      list('.mx-pin', race).forEach(function(p, i){
        setTimeout(function(){ p.classList.add('is-on'); }, REDUCED ? 0 : 400 + i * 380);
      });
    };
    if(REDUCED || !('IntersectionObserver' in window)){
      run();
    } else {
      var raceObs = new IntersectionObserver(function(e){
        if(!e[0].isIntersecting) return;
        run();
        raceObs.disconnect();
      }, { threshold:.3 });
      raceObs.observe(race);
    }
  }

  /* ---------------- rekenmachine ----------------
     Werkt op de cijfers die de bezoeker zelf invoert, niet op een
     voorbeeld van ons. Het bedrag telt op naar de nieuwe waarde: een
     getal dat verspringt lees je, een getal dat oploopt voel je. */
  var req = document.getElementById('calcReq');
  var miss = document.getElementById('calcMiss');
  var marg = document.getElementById('calcMargin');

  if(req && miss && marg){
    var euro = new Intl.NumberFormat('nl-NL', { style:'currency', currency:'EUR', maximumFractionDigits:0 });
    var num  = new Intl.NumberFormat('nl-NL');
    var outReq = document.getElementById('calcReqOut');
    var outMiss = document.getElementById('calcMissOut');
    var outMarg = document.getElementById('calcMarginOut');
    var amt = document.getElementById('calcAmount');
    var sub = document.getElementById('calcSub');
    var shown = 0, raf = null;

    var animateTo = function(target){
      if(REDUCED){ shown = target; amt.textContent = euro.format(target); return; }
      if(raf) cancelAnimationFrame(raf);
      var from = shown, delta = target - from, t0 = performance.now(), DUR = 420;
      var tick = function(now){
        var p = Math.min(1, (now - t0) / DUR);
        shown = Math.round(from + delta * (1 - Math.pow(1 - p, 3)));
        amt.textContent = euro.format(shown);
        if(p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    var update = function(){
      var r = +req.value, m = +miss.value, g = +marg.value;
      var missed = Math.round(r * 12 * (m / 100));
      outReq.textContent = num.format(r);
      outMiss.textContent = m + '%';
      outMarg.textContent = euro.format(g);
      animateTo(missed * g);
      sub.innerHTML = missed === 1
        ? 'Dat is <b>1</b> gemiste aanvraag per jaar.'
        : 'Dat zijn <b>' + num.format(missed) + '</b> gemiste aanvragen per jaar.';
    };

    [req, miss, marg].forEach(function(el){ el.addEventListener('input', update); });
    update();
  }

  /* ---------------- accordeon ----------------
     Animeert op gemeten pixelhoogte zodat een kort en een lang
     antwoord even snel opengaan. */
  var items = list('.mx-acc__i');
  items.forEach(function(item){
    var btn = item.querySelector('.mx-acc__b');
    var panel = item.querySelector('.mx-acc__p');
    if(!btn || !panel) return;

    var close = function(it, b, p){
      p.style.height = p.scrollHeight + 'px';
      requestAnimationFrame(function(){ p.style.height = '0px'; });
      it.classList.remove('is-open');
      b.setAttribute('aria-expanded','false');
    };

    btn.addEventListener('click', function(){
      var isOpen = item.classList.contains('is-open');
      items.forEach(function(other){
        if(other === item || !other.classList.contains('is-open')) return;
        close(other, other.querySelector('.mx-acc__b'), other.querySelector('.mx-acc__p'));
      });
      if(isOpen){ close(item, btn, panel); return; }
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded','true');
      panel.style.height = panel.scrollHeight + 'px';
      panel.addEventListener('transitionend', function once(e){
        if(e.propertyName !== 'height') return;
        panel.style.height = 'auto';
        panel.removeEventListener('transitionend', once);
      });
    });
  });
})();
