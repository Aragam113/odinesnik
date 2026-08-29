/* =====================================================================
   ДВИЖОК МИМИКИ
   Состояние меняет не картинку целиком, а три слоя лица — так же, как
   стейт-машина в анимационном движке Duolingo подменяет глаза и рот,
   не трогая тело. Плюс холостой цикл моргания и короткие реакции.
   ===================================================================== */
var RIG = (function(){
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch(e){}

  var live = [];                       /* активные персонажи на экране */

  function faceSet(el, mood){
    var char = el.getAttribute("data-char");
    var m = typeof mood === "string" ? MASCOT.mood(char, mood) : mood;
    var b = el.querySelector(".m-brows"), e = el.querySelector(".m-eyes"), o = el.querySelector(".m-mouth");
    if(b) b.innerHTML = MASCOT.part(char, "brows", m.brows);
    if(e) e.innerHTML = MASCOT.part(char, "eyes",  m.eyes);
    if(o) o.innerHTML = MASCOT.part(char, "mouth", m.mouth);
    el.setAttribute("data-mood", typeof mood === "string" ? mood : "custom");
  }

  /* моргание: пауза 2.4–6 с, иногда двойное — так живее */
  function scheduleBlink(rec){
    clearTimeout(rec.blinkT);
    rec.blinkT = setTimeout(function(){
      if(!document.body.contains(rec.el)) return detach(rec);
      if(rec.busy) return scheduleBlink(rec);
      var base = rec.mood;
      var eyes = rec.el.querySelector(".m-eyes");
      var char = rec.el.getAttribute("data-char");
      if(!eyes) return;
      eyes.innerHTML = MASCOT.part(char, "eyes", "blink");
      var twice = Math.random() < 0.25;
      setTimeout(function(){
        if(!document.body.contains(rec.el)) return detach(rec);
        eyes.innerHTML = MASCOT.part(char, "eyes", MASCOT.mood(char, base).eyes);
        if(twice){
          setTimeout(function(){
            eyes.innerHTML = MASCOT.part(char, "eyes", "blink");
            setTimeout(function(){
              eyes.innerHTML = MASCOT.part(char, "eyes", MASCOT.mood(char, base).eyes);
            }, 110);
          }, 150);
        }
        scheduleBlink(rec);
      }, 120);
    }, 2400 + Math.random()*3600);
  }

  function detach(rec){
    clearTimeout(rec.blinkT); clearTimeout(rec.backT);
    var i = live.indexOf(rec); if(i >= 0) live.splice(i, 1);
  }
  function find(el){ for(var i=0;i<live.length;i++) if(live[i].el === el) return live[i]; return null; }

  function attach(el){
    if(!el || el.__rig) return null;
    el.__rig = 1;
    var rec = {el:el, mood: el.getAttribute("data-mood") || "idle", busy:false, blinkT:0, backT:0};
    live.push(rec);
    if(!reduced) scheduleBlink(rec);
    return rec;
  }

  /* короткая анимация тела: класс снимается сам */
  function pulse(el, cls, ms){
    if(reduced) return;
    el.classList.remove(cls);
    void el.offsetWidth;                 /* перезапуск анимации */
    el.classList.add(cls);
    setTimeout(function(){ el.classList.remove(cls); }, ms);
  }

  var REACT = {
    correct:   {mood:"happy", anim:"is-pop",   hold:1400},
    wrong:     {mood:"sad",   anim:"is-shake", hold:1600},
    celebrate: {mood:"cheer", anim:"is-hop",   hold:2600},
    think:     {mood:"think", anim:"",         hold:1200},
    wow:       {mood:"wow",   anim:"is-pop",   hold:1400}
  };

  return {
    /* привязать все ещё не привязанные фигуры внутри корня */
    scan: function(root){
      /* перерисовка выбрасывает старые узлы — снимаем их таймеры сразу,
         иначе на каждом рендере копится по будильнику на мёртвую фигуру */
      for(var j = live.length - 1; j >= 0; j--){
        if(!document.body || !document.body.contains(live[j].el)) detach(live[j]);
      }
      var list = (root || document).querySelectorAll(".mascot[data-char]");
      for(var i = 0; i < list.length; i++) attach(list[i]);
    },
    stopAll: function(){ for(var i = live.length - 1; i >= 0; i--) detach(live[i]); },
    /* задать постоянное настроение */
    set: function(el, mood){
      var rec = find(el) || attach(el);
      if(!rec) return;
      rec.mood = mood; rec.busy = false;
      clearTimeout(rec.backT);
      faceSet(el, mood);
      if(!reduced) scheduleBlink(rec);
    },
    /* сыграть реакцию и вернуться в покой */
    play: function(el, event){
      if(!el) return;
      var r = REACT[event]; if(!r) return;
      var rec = find(el) || attach(el);
      if(!rec) return;
      rec.busy = true;
      clearTimeout(rec.backT);
      faceSet(el, r.mood);
      if(r.anim) pulse(el, r.anim, r.hold);
      rec.backT = setTimeout(function(){
        rec.busy = false;
        faceSet(el, rec.mood);
      }, r.hold);
    },
    /* реакция для всех фигур на экране — удобно для экрана урока */
    playAll: function(event, root){
      var list = (root || document).querySelectorAll(".mascot[data-char]");
      for(var i = 0; i < list.length; i++) RIG.play(list[i], event);
    },
    reduced: function(){ return reduced; }
  };
})();
