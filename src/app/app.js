/* ---------- ПРОФИЛЬ ---------- */
function vStats(){
  var xpToday = todayXP(), pct = Math.min(100, Math.round(xpToday/S.goal*100));
  var C = 2*Math.PI*33;
  var days = [], names = ["вс","пн","вт","ср","чт","пт","сб"];
  for(var i = 6; i >= 0; i--){
    var d = new Date(Date.now()-i*864e5), k = d.toISOString().slice(0,10);
    days.push({n:names[d.getDay()], v:S.byDay[k]||0});
  }
  var max = Math.max(30, Math.max.apply(null, days.map(function(d){return d.v;})));
  var cr = totalCrowns(), maxCr = FLAT.length*3;
  var learned = Object.keys(S.srs).filter(function(k){ return S.srs[k].b >= 4; }).length;

  return '<div class="sec-h"><span class="eyebrow">Профиль</span><h2>Твой прогресс</h2></div>'+

  '<div class="card goal-ring">'+
    '<svg class="ring" viewBox="0 0 76 76"><circle class="bg" cx="38" cy="38" r="33"/>'+
    '<circle class="fg" cx="38" cy="38" r="33" stroke-dasharray="'+C+'" stroke-dashoffset="'+(C-C*pct/100)+'"/></svg>'+
    '<div><h3 style="font-size:18px">Цель дня: '+S.goal+' XP</h3>'+
    '<p style="color:var(--ink-2);font-size:14px;margin-top:4px">'+
      (xpToday >= S.goal ? "Цель выполнена. Всё, что сверху, — в запас." : "Сегодня набрано "+xpToday+" XP. Осталось "+(S.goal-xpToday)+".")+'</p>'+
    '<div class="pill-row" style="margin-top:10px">'+
      [10,30,50,100].map(function(g){ return '<button class="pill" data-goal="'+g+'" aria-pressed="'+(S.goal===g)+'">'+g+' XP</button>'; }).join("")+
    '</div></div></div>'+

  '<div class="tile-row">'+
    '<div class="tile"><b style="color:var(--gold)">'+(S.streak||1)+'</b><span>дней подряд</span></div>'+
    '<div class="tile"><b style="color:var(--info)">'+(S.xp||0)+'</b><span>всего XP</span></div>'+
    '<div class="tile"><b style="color:var(--brand)">'+cr+'</b><span>из '+maxCr+' звёзд</span></div>'+
    '<div class="tile"><b style="color:var(--ok)">'+learned+'</b><span>терминов освоено</span></div>'+
  '</div>'+

  '<div class="card"><h3 style="font-size:17px;margin-bottom:14px">Последние 7 дней</h3>'+
    '<div class="week">'+ days.map(function(d){
      return '<div class="d"><div class="b'+(d.v?"":" zero")+'" style="height:'+Math.max(4, Math.round(d.v/max*54))+'px" title="'+d.v+' XP"></div><small>'+d.n+'</small></div>';
    }).join("")+'</div></div>'+

  '<div class="card"><div class="speech">'+MASCOT.render("sanych",{mood:"idle"})+
    '<div class="bubble"><b>Сан Саныч:</b> «'+sanychLine()+'»</div></div></div>'+

  '<div class="card"><h3 style="font-size:17px;margin-bottom:6px">Настройки</h3>'+
    '<button class="chk" data-nohearts="toggle" aria-pressed="'+(!!S.noHearts)+'">'+
      '<span class="box">'+(S.noHearts?"✓":"")+'</span>'+
      '<span class="txt" style="text-decoration:none;color:var(--ink)">Учиться без жизней<br>'+
      '<small style="color:var(--ink-3);font-weight:600">Ошибка не выкидывает из урока. Полезно, когда разбираешь новую тему, а не проверяешь себя.</small></span>'+
    '</button>'+
    '<button class="chk" data-mute="toggle" aria-pressed="'+(!S.mute)+'">'+
      '<span class="box">'+(S.mute?"":"✓")+'</span>'+
      '<span class="txt" style="text-decoration:none;color:var(--ink)">Звук ответов<br>'+
      '<small style="color:var(--ink-3);font-weight:600">Короткие сигналы на верный и неверный ответ. Файлов нет — звук синтезируется на лету.</small></span>'+
    '</button>'+
    '<button class="chk" data-reset="1"><span class="box">✕</span>'+
      '<span class="txt" style="text-decoration:none;color:var(--no)">Сбросить весь прогресс</span></button>'+
  '</div>';
}
var SANYCH = [
 "Гадать не будем — сделай замер, потом приходи.",
 "Работает — не трогай. Особенно на закрытии месяца.",
 "Запрос в цикле по табличной части — и всё, приехали.",
 "Не лезь в типовой модуль. Сделай расширением.",
 "Остатки читаешь без блокировки? Готовься к минусу на складе.",
 "Отбор — в параметры виртуальной таблицы, а не в ГДЕ.",
 "Сначала на копии. Всегда сначала на копии."
];
function sanychLine(){ return SANYCH[(S.xp||0) % SANYCH.length]; }

/* ---------- СПРАВОЧНИК ---------- */
function vRef(){
  var tabs = [["arch","Архитектура"],["hood","Под капотом"],["road","План"],["lib","Ссылки"]];
  var h = '<div class="sec-h"><span class="eyebrow">Без игры и без жизней</span><h2>Справочник</h2>'+
    '<p>Сюда возвращаются, когда нужно не тренироваться, а прочитать.</p></div>'+
    '<div class="pill-row">'+ tabs.map(function(t){
      return '<button class="pill" data-ref="'+t[0]+'" aria-pressed="'+(refTab===t[0])+'">'+t[1]+'</button>';
    }).join("")+'</div>';

  if(refTab === "arch" || refTab === "hood"){
    var list = refTab === "arch" ? ARCH : HOOD;
    h += '<div class="card" style="padding:0 18px">'+ list.map(function(a){
      var open = openRef === a.id;
      return '<div class="acc-item">'+
        '<button class="acc-btn" data-open="'+a.id+'"><span class="sign">'+(open?"−":"+")+'</span>'+
        '<span>'+esc(a.t)+(a.sub?'<br><small style="color:var(--ink-3);font-weight:600;font-size:12.5px">'+esc(a.sub)+'</small>':'')+'</span></button>'+
        (open ? '<div class="acc-body">'+a.html+'</div>' : '')+
      '</div>';
    }).join("")+'</div>';
  }

  if(refTab === "road"){
    h += ROADMAP.map(function(st_, idx){
      var n = 0; st_.tasks.forEach(function(t,i){ if(S.road[st_.id+"."+i]) n++; });
      return '<div class="card">'+
        '<div style="display:flex;gap:13px;align-items:flex-start;margin-bottom:10px">'+
          '<span class="num" style="font-size:25px;font-weight:800;color:var(--brand);line-height:1">'+idx+'</span>'+
          '<div style="flex:1"><h3 style="font-size:18px">'+esc(st_.t)+'</h3>'+
          '<p style="font-size:13px;color:var(--ink-3);margin-top:2px">'+esc(st_.w)+' · '+n+' из '+st_.tasks.length+'</p></div></div>'+
        '<p style="font-size:14.5px;color:var(--ink-2);margin-bottom:10px">'+esc(st_.goal)+'</p>'+
        st_.tasks.map(function(t,i){
          var k = st_.id+"."+i, on = !!S.road[k];
          return '<button class="chk" data-road="'+k+'" aria-pressed="'+on+'"><span class="box">'+(on?"✓":"")+'</span><span class="txt">'+esc(t)+'</span></button>';
        }).join("")+
        '<div class="note" style="margin-top:12px"><b>Этап закрыт, когда:</b> '+esc(st_.done)+'</div>'+
      '</div>';
    }).join("");
  }

  if(refTab === "lib"){
    h += LIBRARY.map(function(sec){
      return '<div class="card"><h3 style="font-size:17px;margin-bottom:6px">'+esc(sec.cat)+'</h3>'+
        sec.items.map(function(it){
          return '<div class="lib-item"><a href="'+it.u+'" target="_blank" rel="noopener">'+esc(it.n)+'</a>'+
                 '<span>'+esc(it.d)+'</span></div>';
        }).join("")+'</div>';
    }).join("")+
    '<div class="card"><h3 style="font-size:16px;margin-bottom:8px">Оговорки</h3><ul class="tight" style="padding-left:20px;list-style:disc;display:flex;flex-direction:column;gap:7px;color:var(--ink-2);font-size:14px">'+
    '<li>Платформа в 2026 живёт двумя ветками: <b>8.3.27</b> (последняя в линейке 8.3, на ней большинство внедрений) и <b>8.5.x</b> (финальный релиз 8.5.1 — 25 декабря 2025). Версии 8.3.28 не будет.</li>'+
    '<li>Учиться практичнее на 8.3: под неё написаны книги, курсы и почти все рабочие базы.</li>'+
    '<li>Цены курсов и даты потоков собраны в августе 2026 и устаревают быстрее всего остального.</li>'+
    '</ul></div>';
  }
  return h;
}

/* ---------- РАЗБОР ОШИБОК ---------- */
function vPractice(){
  var n = S.mistakes.length;
  var learned = Object.keys(S.srs).filter(function(k){ return S.srs[k].b >= 4; }).length;
  var due = Object.keys(S.srs).filter(function(k){ return S.srs[k].b > 0 && S.srs[k].d <= Date.now(); }).length;
  return '<div class="sec-h"><span class="eyebrow">Повторение</span><h2>Разбор ошибок</h2>'+
    '<p>Всё, что ты не угадал, попадает сюда. Прогон возвращает жизни.</p></div>'+
    '<div class="tile-row">'+
      '<div class="tile"><b style="color:var(--no)">'+n+'</b><span>в разборе</span></div>'+
      '<div class="tile"><b style="color:var(--gold)">'+due+'</b><span>пора повторить</span></div>'+
      '<div class="tile"><b style="color:var(--ok)">'+learned+'</b><span>освоено</span></div>'+
    '</div>'+
    (n ? '<div class="card" style="display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center">'+
        MASCOT.render("nina",{mood:"idle"})+
        '<p style="font-size:15px;color:var(--ink-2);max-width:40ch">Соберём '+Math.min(12,n)+' упражнений из тех, где ты ошибся. Пройдёшь — жизни восстановятся полностью.</p>'+
        '<button class="btn primary big" data-mistakes="1">Начать разбор</button></div>'
      : '<div class="card empty">'+MASCOT.render("byte",{mood:"cheer",cls:"idle-bob"})+
        '<div><b style="font-size:17px;color:var(--ink)">Ошибок нет</b>'+
        '<p style="margin-top:6px">Либо ты идеален, либо ещё не начинал. Иди на путь и проходи уроки.</p></div>'+
        '<button class="btn primary" data-tab="path">На путь</button></div>');
}

/* ---------- ОБОЛОЧКА ---------- */
var TABS = [
  {id:"path", n:"Путь", ic:'<svg viewBox="0 0 24 24"><path d="M4 20V8a4 4 0 014-4h4a3 3 0 010 6H9a3 3 0 000 6h4a4 4 0 014 4"/></svg>'},
  {id:"practice", n:"Разбор", ic:ICON.bolt},
  {id:"iv", n:"Собес", ic:'<svg viewBox="0 0 24 24"><path d="M4 4h16v12H9l-5 4z"/><circle cx="9" cy="10" r="1.4" fill="#fff"/><circle cx="12" cy="10" r="1.4" fill="#fff"/><circle cx="15" cy="10" r="1.4" fill="#fff"/></svg>'},
  {id:"ref", n:"Справочник", ic:'<svg viewBox="0 0 24 24"><path d="M5 4h9a4 4 0 014 4v12H9a4 4 0 01-4-4z"/><path d="M14 4h5v16" fill="none" stroke="currentColor" stroke-width="2"/></svg>'},
  {id:"stats", n:"Профиль", ic:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0z"/></svg>'}
];

function renderHUD(){
  var hp = hearts();
  $("#hud").innerHTML = '<div class="hud-in">'+
    '<div class="brand">'+MASCOT.render("byte",{mood:"idle",frame:"head",cls:"idle-bob"})+'<b>Тренажёр <span>одинэсника</span></b></div>'+
    '<span class="chip-stat fire'+((S.streak||0)>0?"":" dim")+'">'+ICON.flame+(S.streak||1)+'</span>'+
    '<span class="chip-stat xp">'+ICON.bolt+(S.xp||0)+'</span>'+
    (S.noHearts ? '<span class="chip-stat hp inf">∞</span>'
                : '<span class="chip-stat hp'+(hp?"":" dim")+'">'+ICON.heart+hp+'</span>')+
  '</div>';
}
function renderTabs(){
  $("#tabs").innerHTML = '<div class="tabs-in">'+ TABS.map(function(t){
    var b = t.id === "practice" && S.mistakes.length ? '<span class="badge">'+S.mistakes.length+'</span>' : '';
    var cur = screen === t.id || (t.id === "iv" && (screen === "ivhome" || screen === "iv" || screen === "ivdone"));
    return '<button class="tab" data-tab="'+t.id+'" aria-current="'+cur+'">'+t.ic+b+'<span>'+t.n+'</span></button>';
  }).join("")+'</div>';
}

function render(){
  var lesson = $("#lesson"), main = $("#main"), hud = $("#hud"), tabs = $("#tabs");
  if(screen === "lesson" || screen === "done" || screen === "failed" || screen === "nohearts" ||
     screen === "iv" || screen === "ivdone"){
    lesson.innerHTML = screen === "lesson" ? vLesson()
                     : screen === "done" ? vDone()
                     : screen === "iv" ? vIvSession()
                     : screen === "ivdone" ? vIvDone()
                     : screen === "failed" ? vFailed() : vNoHearts();
    lesson.classList.remove("hidden");
    main.classList.add("hidden"); hud.classList.add("hidden"); tabs.classList.add("hidden");
    RIG.scan();
    return;
  }
  lesson.classList.add("hidden"); lesson.innerHTML = "";
  main.classList.remove("hidden"); hud.classList.remove("hidden"); tabs.classList.remove("hidden");
  var v = $("#view");
  v.innerHTML = screen === "path" ? vPath()
              : screen === "book" ? vBook()
              : screen === "practice" ? vPractice()
              : screen === "ivhome" ? vIvHome()
              : screen === "ref" ? vRef() : vStats();
  renderHUD(); renderTabs();
  RIG.scan();
}

/* ---------- СОБЫТИЯ ---------- */
document.addEventListener("click", function(e){
  var t = e.target.closest("button, a, [data-dianode]");
  if(!t) return;
  var A = function(n){ return t.getAttribute(n); };

  if(A("data-tab")){ screen = A("data-tab") === "iv" ? "ivhome" : A("data-tab"); render(); var mn = $("#main"); if(mn) mn.scrollTop = 0; try{ window.scrollTo(0,0); }catch(e){} return; }
  if(A("data-lesson") !== null && A("data-lesson") !== undefined){ startLesson(+A("data-lesson")); return; }
  if(A("data-quit")){ if(confirm("Не бросай на середине — прогресс этого подхода не сохранится. Точно выйти?")){ screen = "path"; LS = null; render(); } return; }
  if(A("data-check")){ checkAnswer(); return; }
  if(A("data-next")){ nextEx(); return; }
  if(A("data-skip")){ LS.pick = null; LS.checked = true; LS.correct = false;
    var ce = currentEx();
    if(ce && ce.type !== "recall" && S.mistakes.indexOf(ce.k) < 0) S.mistakes.unshift(ce.k);
    save(); render(); return; }
  if(A("data-back")){ screen = "path"; LS = null; render(); return; }
  if(A("data-mistakes")){ startMistakes(); return; }
  if(A("data-iv-start")){ ivStart(A("data-iv-start")); return; }
  if(A("data-iv-show")){ IVS.shown = true; render(); return; }
  if(A("data-iv-mark")){ ivRate(A("data-iv-mark")); return; }
  if(A("data-iv-quit")){ screen = "ivhome"; IVS = null; render(); return; }

  var p = A("data-pick");
  if(p !== null && p !== undefined && !LS.checked){ LS.pick = +p; render(); return; }

  var mm = A("data-match");
  if(mm){
    var ex = currentEx();
    if(!LS.matchPick){ LS.matchPick = mm; render(); return; }
    if(LS.matchPick === mm){ LS.matchPick = null; render(); return; }
    var a = LS.matchPick, b = mm;
    if(a[0] === b[0]){ LS.matchPick = mm; render(); return; }
    var l = a[0] === "l" ? a : b, r = a[0] === "r" ? a : b;
    var rBtn = document.querySelector('[data-match="'+r+'"]');
    if(rBtn && +rBtn.getAttribute("data-pair") === +l.slice(1)){
      LS.matched[l] = 1; LS.matched[r] = 1; LS.matchPick = null;
      if(Object.keys(LS.matched).length === ex.pairs.length*2){ render(); checkAnswer(); return; }
    } else {
      LS.matchPick = null;
      if(rBtn){ rBtn.classList.add("miss"); setTimeout(function(){ render(); }, 400); return; }
    }
    render(); return;
  }

  var bt = A("data-build");
  if(bt){ LS.built.push(bt); render(); return; }
  var ub = A("data-unbuild");
  if(ub !== null && ub !== undefined && !LS.checked){ LS.built.splice(+ub, 1); render(); return; }

  /* ---- материалы раздела ---- */
  if(A("data-bookopen")){
    bookUnit = A("data-bookopen"); bookNode = null; screen = "book";
    render();
    var mb = $("#main"); if(mb) mb.scrollTop = 0;
    try{ window.scrollTo(0, 0); }catch(e){}
    return;
  }
  if(A("data-bookclose")){ screen = "path"; bookUnit = null; bookNode = null; render(); return; }
  if(A("data-dianode")){
    bookNode = bookNode === A("data-dianode") ? null : A("data-dianode");
    render(); return;
  }
  if(A("data-bookcheck") !== null && A("data-bookcheck") !== undefined){
    var bc = BOOK[bookUnit].check, bp = +A("data-bookcheck");
    if(!S.bookChecked) S.bookChecked = {};
    S.bookChecked[bookUnit] = {pick: bp, ok: bp === bc.a};
    if(bp === bc.a) addXP(5);
    SFX[bp === bc.a ? "correct" : "wrong"]();
    save(); render(); return;
  }
  if(A("data-bookref")){
    var rid = A("data-bookref");
    screen = "ref"; refTab = rid.charAt(0) === "a" ? "arch" : "hood"; openRef = rid;
    render(); return;
  }
  if(A("data-open")){ openRef = openRef === A("data-open") ? "" : A("data-open"); render(); return; }
  if(A("data-ref")){ refTab = A("data-ref"); openRef = ""; render(); return; }
  if(A("data-road")){ var k = A("data-road"); S.road[k] = !S.road[k]; save(); render(); return; }
  if(A("data-goal")){ S.goal = +A("data-goal"); save(); render(); return; }
  if(A("data-nohearts")){
    S.noHearts = A("data-nohearts") === "toggle" ? !S.noHearts : true;
    if(S.noHearts) refillHearts();
    save();
    if(screen === "failed" || screen === "nohearts"){ screen = "path"; LS = null; }
    render(); return;
  }
  if(A("data-mute")){
    S.mute = !S.mute; save();
    if(!S.mute) SFX.correct();          /* сразу слышно, что включилось */
    render(); return;
  }
  if(A("data-reset")){
    if(!confirm("Обнулить весь прогресс: XP, серию, звёзды и отметки?")) return;
    S = {xp:0, byDay:{}, day:TODAY, streak:1, goal:30, hearts:5, heartAt:0, noHearts:false,
         crowns:{}, mistakes:[], srs:{}, road:{}, seenGreet:{}, runs:{}, mute:S.mute};
    save(); screen = "path"; render(); return;
  }
});

document.addEventListener("keydown", function(e){
  if(e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

  /* узлы схемы — это <g> с role="button": пробел и ввод должны их открывать */
  if((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-dianode]")){
    e.preventDefault();
    e.target.closest("[data-dianode]").dispatchEvent(new MouseEvent("click", {bubbles:true}));
    return;
  }

  if(screen !== "lesson" || !LS) return;
  var ex = currentEx(); if(!ex) return;
  if(e.key === "Enter"){
    e.preventDefault();
    if(LS.checked) nextEx();
    else {
      var cb = document.querySelector('[data-check]');
      if(cb && !cb.disabled) checkAnswer();
    }
    return;
  }
  if(!LS.checked && (ex.type === "choose" || ex.type === "recall")){
    var n = parseInt(e.key, 10);
    if(n >= 1 && n <= 4){
      var el = document.querySelector('[data-pick="'+(ex.type === "recall" ? (n===1?1:0) : n-1)+'"]');
      if(el) el.click();
    }
  }
});

/* ---------- СТАРТ ---------- */
/* пути персонажей лежат в одном скрытом <defs>, экземпляры ссылаются на них */
(function(){
  var host = document.createElement("div");
  host.innerHTML = MASCOT.defs();
  document.body.insertBefore(host.firstChild, document.body.firstChild);
})();
render();
