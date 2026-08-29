/* =====================================================================
   ЗВУК
   Синтез через Web Audio, без единого файла: внешние медиа в артефакте
   заблокированы политикой безопасности, а data-URI раздули бы страницу.
   Контекст создаётся только по первому нажатию — до жеста браузер
   всё равно не даст ничего воспроизвести.
   ===================================================================== */
var SFX = (function(){
  var ctx = null, master = null, broken = false;

  function init(){
    if(broken) return null;
    try{
      if(!ctx){
        var AC = window.AudioContext || window.webkitAudioContext;
        if(!AC){ broken = true; return null; }
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 1.7;
        master.connect(ctx.destination);
      }
      if(ctx.state === "suspended") ctx.resume();
      return ctx;
    }catch(e){ broken = true; return null; }
  }

  /* одна нота: частота, скольжение, длительность, тембр, огибающая */
  function note(o){
    var c = init(); if(!c) return;
    var t = c.currentTime + (o.at || 0);
    var dur = o.dur || 0.12;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if(o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);

    var peak = o.gain == null ? 0.16 : o.gain;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (o.attack || 0.010));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    var tail = osc;
    if(o.lp){
      var f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(o.lp, t);
      if(o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + dur);
      tail.connect(f); tail = f;
    }
    tail.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.06);
  }

  var on = function(){ return !(typeof S !== "undefined" && S.mute); };

  return {
    /* верный ответ: короткая светлая квинта вверх */
    correct: function(){
      if(!on()) return;
      note({f:784,  dur:0.10, type:"triangle", gain:0.15});
      note({f:1175, dur:0.16, type:"triangle", gain:0.13, at:0.070});
      note({f:1568, dur:0.20, type:"sine",     gain:0.06, at:0.070});
    },
    /* неверный: низкий короткий гудок со съездом вниз, приглушённый */
    wrong: function(){
      if(!on()) return;
      note({f:200, to:126, dur:0.26, type:"sawtooth", gain:0.11, lp:1100, lpTo:420});
      note({f:100, to:70,  dur:0.24, type:"sine",     gain:0.09});
    },
    /* конец урока: восходящее трезвучие */
    finish: function(){
      if(!on()) return;
      [[523,0],[659,0.085],[784,0.17],[1047,0.28]].forEach(function(p){
        note({f:p[0], dur:p[1] === 0.28 ? 0.42 : 0.20, type:"triangle", gain:0.13, at:p[1]});
      });
    },
    /* провал урока: две ступени вниз */
    fail: function(){
      if(!on()) return;
      note({f:330, dur:0.20, type:"triangle", gain:0.12});
      note({f:247, dur:0.34, type:"triangle", gain:0.12, at:0.16});
    },
    /* потеря жизни: сухой щелчок */
    heart: function(){
      if(!on()) return;
      note({f:520, to:300, dur:0.09, type:"square", gain:0.05, lp:1800});
    },
    ready: function(){ return init() !== null; }
  };
})();
