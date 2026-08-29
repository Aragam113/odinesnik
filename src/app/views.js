/* ===================== ЭКРАНЫ ===================== */
var screen = "path", refTab = "arch", openRef = "";

/* ---------- ПУТЬ ---------- */
function vPath(){
  var cur = currentIdx(), h = "";
  var gi = 0;
  COURSE.forEach(function(sec, si){
    var pr = unitProgress(sec);
    var locked = gi > 0 && !unlocked(gi);
    h += '<div class="unit" style="--u:'+sec.u.c+'">'+
      '<div class="unit-head">'+
        '<div class="unit-head-txt">'+
          '<span class="unit-n">Раздел '+(si+1)+'</span>'+
          '<h2>'+esc(sec.u.t)+'</h2>'+
          '<p>'+esc(sec.u.sub)+'</p>'+
        '</div>'+
        '<div class="unit-prog"><b>'+pr.done+'/'+pr.total+'</b><span>уроков</span></div>'+
      '</div>';
    if(!locked) h += '<p class="unit-greet">'+esc(sec.u.greet)+'</p>';
    h += '<ol class="path">';
    sec.lessons.forEach(function(l, li){
      var idx = gi, cr = crowns(l.id), open = unlocked(idx), isCur = idx === cur;
      var off = [0, 34, 52, 34, 0, -34, -52, -34][li % 8];
      var state = cr >= 3 ? "gold" : cr > 0 ? "done" : open ? "open" : "lock";
      h += '<li class="node-wrap" style="--off:'+off+'px">'+
        (isCur ? '<span class="node-flag">Старт</span>' : '')+
        '<button class="node '+state+(isCur?" cur":"")+'" data-lesson="'+idx+'"'+(open?"":" disabled")+
          ' aria-label="'+esc(l.t)+'">'+
          '<span class="node-ic">'+nodeIcon(l, state)+'</span>'+
          (cr ? '<span class="node-crowns">'+repeat("★", cr)+'</span>' : '')+
        '</button>'+
        '<span class="node-label">'+esc(l.t)+'</span>'+
      '</li>';
      gi++;
    });
    h += '</ol></div>';
  });
  return h;
}
function repeat(s, n){ var o = ""; for(var i=0;i<n;i++) o += s; return o; }
function nodeIcon(l, state){
  if(state === "lock") return ICON.lock;
  if(l.kind === "check") return ICON.check;
  if(l.kind === "boss") return ICON.boss;
  if(l.kind === "slang") return ICON.chat;
  return ICON.star;
}

/* ---------- УРОК ---------- */
function vLesson(){
  var e = currentEx();
  if(!e) return "";
  var pct = Math.round(LS.done / LS.total * 100);
  var body = "";

  if(e.type === "choose"){
    body = (e.hint ? '<div class="ex-hint">'+esc(e.hint)+'</div>' : '')+
      (e.code ? '<pre class="code">'+hl(e.code)+'</pre>' : '')+
      '<div class="opts">'+ e.o.map(function(o, i){
        var cls = "opt";
        if(LS.pick === i) cls += " sel";
        if(LS.checked){
          if(o.c) cls += " ok";
          else if(LS.pick === i) cls += " no";
        }
        return '<button class="'+cls+'" data-pick="'+i+'"'+(LS.checked?" disabled":"")+'>'+
          '<span class="opt-k">'+(i+1)+'</span><span>'+esc(o.t)+'</span></button>';
      }).join("")+'</div>';
  }

  if(e.type === "match"){
    var left = e.pairs.map(function(p){ return p.l; });
    var right = shuffle(e.pairs.map(function(p){ return p.r; }), seed(e.k));
    body = '<div class="match">'+
      '<div class="match-col">'+ left.map(function(t, i){
        var done = LS.matched["l"+i] ? " matched" : "";
        var sel = LS.matchPick === "l"+i ? " sel" : "";
        return '<button class="chip'+done+sel+'" data-match="l'+i+'"'+(done?" disabled":"")+'>'+esc(t)+'</button>';
      }).join("")+'</div>'+
      '<div class="match-col">'+ right.map(function(t, i){
        var pi = left.indexOf(e.pairs.filter(function(p){ return p.r === t; })[0].l);
        var done = LS.matched["r"+i] ? " matched" : "";
        var sel = LS.matchPick === "r"+i ? " sel" : "";
        return '<button class="chip'+done+sel+'" data-match="r'+i+'" data-pair="'+pi+'"'+(done?" disabled":"")+'>'+esc(t)+'</button>';
      }).join("")+'</div></div>';
  }

  if(e.type === "build"){
    var bank = shuffle(e.tokens.concat(e.extra), seed(e.k)).filter(function(t){ return LS.built.indexOf(t) < 0; });
    body = '<div class="build-line">'+
        (LS.built.length ? LS.built.map(function(t, i){ return '<button class="tok in" data-unbuild="'+i+'">'+esc(t)+'</button>'; }).join("")
                         : '<span class="build-empty">Собери из блоков ниже</span>')+
      '</div>'+
      '<div class="build-bank">'+ bank.map(function(t){
        return '<button class="tok" data-build="'+esc(t).replace(/"/g,"&quot;")+'"'+(LS.checked?" disabled":"")+'>'+esc(t)+'</button>';
      }).join("")+'</div>';
  }

  if(e.type === "recall"){
    body = '<div class="recall">'+
      (LS.checked
        ? '<div class="recall-a">'+esc(e.w)+'</div>'
        : '<div class="recall-hint">Ответь вслух и целиком, как на собеседовании. Потом сверься с эталоном.</div>')+
      '</div>'+
      (LS.checked ? '' :
      '<div class="opts"><button class="opt" data-pick="1">'+
        '<span class="opt-k">✓</span><span>Знаю, могу рассказать</span></button>'+
      '<button class="opt" data-pick="0"><span class="opt-k">?</span><span>Плаваю, покажи ответ</span></button></div>');
  }

  var canCheck = e.type === "choose" ? LS.pick !== null
               : e.type === "build" ? LS.built.length > 0
               : e.type === "match" ? Object.keys(LS.matched).length === e.pairs.length*2
               : LS.pick !== null;

  var bar = "";
  if(LS.checked){
    var mc = lessonMascot(), mm = LS.correct ? "happy" : (e.type === "recall" ? "idle" : "sad");
    bar = '<div class="fb '+(LS.correct?"ok":"no")+'">'+
      '<div class="fb-in">'+
        '<div class="fb-row">'+
          '<div class="fb-mascot">'+MASCOT.render(mc, {mood:mm, frame:"head", label:"реакция"})+'</div>'+
          '<div class="fb-txt"><b>'+(LS.correct ? praise() : (e.type==="recall" ? "Эталонный ответ" : "Не так")) +'</b>'+
          '<span>'+(LS.buildHint ? '<b>'+esc(LS.buildHint)+'</b> ' : '')+esc(e.w)+'</span></div>'+
        '</div>'+
        '<button class="btn '+(LS.correct?"ok":"no")+'" data-next="1">Дальше</button>'+
      '</div></div>';
  } else {
    bar = '<div class="fb idle"><div class="fb-in">'+
      '<button class="btn ghost" data-skip="1">Пропустить</button>'+
      '<button class="btn primary" data-check="1"'+(canCheck?"":" disabled")+'>Проверить</button>'+
      '</div></div>';
  }

  return '<div class="lesson">'+
    '<header class="lesson-top">'+
      '<button class="x" data-quit="1" aria-label="Выйти из урока">✕</button>'+
      '<div class="pbar"><i style="width:'+pct+'%"></i></div>'+
      (S.noHearts ? '<span class="hearts inf">∞</span>' : '<span class="hearts">'+ICON.heart+'<b>'+hearts()+'</b></span>')+
    '</header>'+
    '<div class="lesson-body"><div class="ex">'+
      '<span class="ex-type">'+exLabel(e)+'</span>'+
      '<h2 class="ex-q">'+esc(e.q)+'</h2>'+
      body+
    '</div></div>'+ bar +'</div>';
}
function exLabel(e){
  return e.type === "match" ? "Сопоставь пары"
       : e.type === "build" ? (e.set ? "Собери набор · порядок не важен" : "Собери по порядку")
       : e.type === "recall" ? "Расскажи вслух"
       : e.code ? "Разбери код" : "Выбери ответ";
}
/* персонаж подбирается под тему раздела: предметку ведёт Нина, инженерию — Саныч */
function lessonMascot(){
  var u = LS && LS.sec ? LS.sec.u : null;
  if(!u) return "byte";
  if(u.id === "u2" || u.id === "u3") return "nina";
  if(u.id === "u6" || u.id === "u7" || u.id === "u9") return "sanych";
  return "byte";
}
var PRAISE = ["Верно","Точно","Именно так","Хорошо","В точку","Так и есть","Правильно"];
function praise(){ return PRAISE[Math.floor(Math.random()*PRAISE.length)]; }

/* ---------- ЗАВЕРШЕНИЕ ---------- */
function vDone(){
  var acc = LS.total ? Math.round((LS.total/(LS.total+LS.wrong))*100) : 100;
  var sec = Math.round((Date.now()-LS.startedAt)/1000);
  return '<div class="finish">'+
    '<div class="finish-hero">'+MASCOT.render(lessonMascot(), {mood:"cheer", cls:(LS.wrong===0?"is-hop":"idle-bob")})+'</div>'+
    '<h2>'+(LS.wrong === 0 ? "Идеальный урок" : "Урок пройден")+'</h2>'+
    '<p>'+doneLine(LS.wrong)+'</p>'+
    '<div class="finish-stats">'+
      '<div class="ds xp"><b>+'+LS.earned+'</b><span>XP</span></div>'+
      '<div class="ds acc"><b>'+acc+'%</b><span>точность</span></div>'+
      '<div class="ds time"><b>'+Math.floor(sec/60)+':'+(sec%60<10?"0":"")+(sec%60)+'</b><span>время</span></div>'+
    '</div>'+
    '<button class="btn primary big" data-back="1">Дальше</button>'+
  '</div>';
}
function doneLine(w){
  if(w === 0) return "Ни одной ошибки. Эти термины можно считать своими.";
  if(w <= 2) return "Пара промахов — нормально. Они уже поставлены в очередь на повтор.";
  return "Ошибки записаны в разбор. Прогони его, пока материал свежий.";
}
function vFailed(){
  return '<div class="finish">'+
    '<div class="finish-hero">'+MASCOT.render("byte", {mood:"sad"})+'</div>'+
    '<h2>Жизни кончились</h2>'+
    '<p>Так бывает. Пройди разбор ошибок — он вернёт жизни и закроет пробелы.</p>'+
    '<div class="row">'+
      '<button class="btn primary big" data-mistakes="1">Разбор ошибок</button>'+
      '<button class="btn big" data-back="1">Выйти</button>'+
    '</div>'+
    '<button class="link" data-nohearts="1">Отключить жизни насовсем</button>'+
  '</div>';
}
function vNoHearts(){
  return '<div class="finish">'+
    '<div class="finish-hero">'+MASCOT.render("byte", {mood:"sad"})+'</div>'+
    '<h2>Жизней нет</h2>'+
    '<p>Следующая восстановится через '+heartTimer()+'. Или пройди разбор ошибок — он вернёт все сразу.</p>'+
    '<div class="row">'+
      '<button class="btn primary big" data-mistakes="1">Разбор ошибок</button>'+
      '<button class="btn big" data-back="1">Назад</button>'+
    '</div>'+
    '<button class="link" data-nohearts="1">Учиться без жизней</button>'+
  '</div>';
}
