/* ===================== СОСТОЯНИЕ ===================== */
var KEY = "odinesnik.v2";
var S = {
  xp:0, byDay:{}, day:"", streak:0, goal:30,
  hearts:5, heartAt:0, noHearts:false,
  crowns:{}, mistakes:[], srs:{}, road:{}, seenGreet:{}, runs:{}
};
try{ var raw = localStorage.getItem(KEY); if(raw){ var p = JSON.parse(raw); for(var k in p) if(p.hasOwnProperty(k)) S[k] = p[k]; } }catch(e){}
/* перенос отметок дорожной карты из первой версии */
try{
  if(!Object.keys(S.road).length){
    var old = localStorage.getItem("odinesnik.v1");
    if(old){ var o = JSON.parse(old); if(o && o.road) S.road = o.road; }
  }
}catch(e){}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

var TODAY = new Date().toISOString().slice(0,10);
var YESTERDAY = new Date(Date.now()-864e5).toISOString().slice(0,10);
/* Серия держится на факте занятия. Duolingo меняла именно это правило:
   продление любым уроком, а не выполнением дневной цели, дало заметный рост удержания. */
(function(){
  if(S.day && S.day !== TODAY && S.day !== YESTERDAY) S.streak = 0;  /* пропуск дня — серия сгорела */
  save();
})();
function markActive(){
  if(S.day === TODAY) return;
  S.streak = (S.day === YESTERDAY) ? (S.streak||0)+1 : 1;
  S.day = TODAY; save();
}
function todayXP(){ return S.byDay[TODAY] || 0; }
function addXP(n){ S.xp = (S.xp||0)+n; S.byDay[TODAY] = todayXP()+n; save(); }

/* сердца восстанавливаются по одному раз в 20 минут */
var HEART_MS = 20*60*1000;
function hearts(){
  if(S.noHearts) return 5;
  if(S.hearts >= 5) return 5;
  var gained = Math.floor((Date.now() - (S.heartAt||0)) / HEART_MS);
  if(gained > 0){
    S.hearts = Math.min(5, S.hearts + gained);
    S.heartAt = S.hearts >= 5 ? 0 : Date.now();
    save();
  }
  return S.hearts;
}
function loseHeart(){
  if(S.noHearts) return 5;
  if(S.hearts >= 5) S.heartAt = Date.now();
  S.hearts = Math.max(0, S.hearts-1); save(); return S.hearts;
}
function refillHearts(){ S.hearts = 5; S.heartAt = 0; save(); }
function heartTimer(){
  if(S.noHearts || S.hearts >= 5) return "";
  var left = HEART_MS - ((Date.now() - (S.heartAt||Date.now())) % HEART_MS);
  var m = Math.floor(left/60000), s = Math.floor((left%60000)/1000);
  return m + ":" + (s<10?"0":"") + s;
}

/* ===================== КУРС И ЗАМКИ ===================== */
var COURSE = buildCourse();
var FLAT = [];
COURSE.forEach(function(sec){ sec.lessons.forEach(function(l){ FLAT.push({sec:sec, l:l}); }); });

function crowns(id){ return S.crowns[id] || 0; }
function unlocked(idx){
  if(idx === 0) return true;
  return crowns(FLAT[idx-1].l.id) > 0;
}
function currentIdx(){
  for(var i = 0; i < FLAT.length; i++) if(crowns(FLAT[i].l.id) === 0) return i;
  return FLAT.length-1;
}
function unitProgress(sec){
  var done = 0;
  sec.lessons.forEach(function(l){ if(crowns(l.id) > 0) done++; });
  return {done:done, total:sec.lessons.length};
}
function totalCrowns(){ var n = 0; FLAT.forEach(function(f){ n += crowns(f.l.id); }); return n; }

/* ===================== СЕССИЯ УРОКА ===================== */
var LS = null;

function startLesson(idx){
  var f = FLAT[idx];
  if(hearts() === 0 && !S.noHearts){ screen = "nohearts"; render(); return; }
  /* seed переставал меняться после третьей звезды — урок повторялся дословно.
     Теперь у каждого запуска свой номер, он же уходит в seed. */
  if(!S.runs) S.runs = {};
  S.runs[f.l.id] = (S.runs[f.l.id] || 0) + 1;
  var attempt = crowns(f.l.id) + "r" + S.runs[f.l.id];
  LS = {
    idx: idx, sec: f.sec, lesson: f.l,
    queue: makeLesson(f.sec.u, f.l, attempt, {srs: S.srs, mistakes: S.mistakes}),
    done: 0, total: 0, wrong: 0, combo: 0, bestCombo: 0,
    pick: null, checked: false, correct: false,
    matched: {}, matchPick: null, built: [], startedAt: Date.now()
  };
  LS.total = LS.queue.length;
  screen = "lesson"; render();
}
function currentEx(){ return LS && LS.queue.length ? LS.queue[0] : null; }

function checkAnswer(){
  var e = currentEx(); if(!e || LS.checked) return;
  var ok = false;
  if(e.type === "choose") ok = LS.pick !== null && e.o[LS.pick] && !!e.o[LS.pick].c;
  else if(e.type === "build"){
    var sortJoin = function(a){ return a.slice().sort().join(""); };
    var sameSet = sortJoin(LS.built) === sortJoin(e.tokens);
    ok = e.set ? sameSet : LS.built.join(" ") === e.tokens.join(" ");
    /* подсказка по существу: состав верный, но порядок другой */
    LS.buildHint = (!ok && sameSet) ? "Блоки выбраны верно, но порядок другой." :
                   (!ok && LS.built.length !== e.tokens.length) ? "Блоков должно быть " + e.tokens.length + "." : "";
  }
  else if(e.type === "match") ok = Object.keys(LS.matched).length === e.pairs.length*2;
  else if(e.type === "recall") ok = LS.pick === 1;

  LS.checked = true; LS.correct = ok;
  if(ok){
    LS.combo++; LS.bestCombo = Math.max(LS.bestCombo, LS.combo);
    if(LS.combo > 0 && LS.combo % 5 === 0 && !S.noHearts && S.hearts < 5){
      S.hearts++; LS.gainedHeart = true; save();
    }
    if(e.type !== "recall"){
      var s = S.srs[e.k] || {b:0};
      s.b = Math.min(5, (s.b||0)+1); s.d = Date.now() + [0,1,3,8,21,45][s.b]*864e5;
      S.srs[e.k] = s;
      var mi = S.mistakes.indexOf(e.k);
      if(mi >= 0) S.mistakes.splice(mi, 1);
    }
  } else {
    LS.combo = 0; LS.wrong++;
    if(e.type !== "recall"){
      var repeat = LS.seen && LS.seen[e.k];
      if(S.mistakes.indexOf(e.k) < 0) S.mistakes.unshift(e.k);
      S.mistakes = S.mistakes.slice(0, 60);
      S.srs[e.k] = {b:0, d:Date.now()};
      if(!repeat) loseHeart();     /* разбор ошибки внутри урока — бесплатно */
    }
  }
  if(!LS.seen) LS.seen = {};
  LS.seen[e.k] = 1;
  save(); render();
  RIG.playAll(ok ? "correct" : "wrong", document.getElementById("lesson"));
}

function nextEx(){
  var e = LS.queue.shift();
  /* Ошибку прогоняем ещё раз, но не больше двух возвратов на задание:
     иначе упражнение, которое не даётся, крутится в уроке бесконечно. */
  if(!LS.requeued) LS.requeued = {};
  var back = LS.requeued[e.k] || 0;
  if(!LS.correct && e.type !== "recall" && back < 2){ LS.requeued[e.k] = back + 1; LS.queue.push(e); }
  else LS.done++;
  LS.pick = null; LS.checked = false; LS.correct = false;
  LS.matched = {}; LS.matchPick = null; LS.built = []; LS.buildHint = "";
  if(!S.noHearts && hearts() === 0){ screen = "failed"; render(); return; }
  if(!LS.queue.length){ finishLesson(); return; }
  render();
}

function finishLesson(){
  var id = LS.lesson.id;
  if(LS.lesson.kind === "mistakes"){
    refillHearts();                       /* разбор ошибок возвращает жизни */
  } else {
    S.crowns[id] = Math.min(3, crowns(id) + 1);
  }
  markActive();
  var base = (LS.lesson.kind === "check" || LS.lesson.kind === "boss") ? 30 : 20;
  LS.perfect = LS.wrong === 0;
  LS.comboBonus = Math.min(5, Math.floor(LS.bestCombo / 2));   /* комбо-бонус, потолок +5 */
  LS.earned = base + LS.comboBonus + (LS.perfect ? 5 : 0);
  addXP(LS.earned);
  save();
  screen = "done"; render();
}

/* ===================== РАЗБОР ОШИБОК ===================== */
function mistakeLesson(){
  var pool = [];
  COURSE.forEach(function(sec){ sec.lessons.forEach(function(l){
    if(l.kind === "boss") return;
    for(var a = 0; a < 2; a++){
      makeLesson(sec.u, l, a, {srs: S.srs}).forEach(function(e){ if(S.mistakes.indexOf(e.k) >= 0) pool.push(e); });
    }
  }); });
  var seen = {}, out = [];
  pool.forEach(function(e){ if(!seen[e.k]){ seen[e.k] = 1; out.push(e); } });
  return out.slice(0, 12);
}
function startMistakes(){
  var ex = mistakeLesson();
  if(!ex.length) return;
  LS = {idx:-1, sec:null, lesson:{id:"mistakes", t:"Разбор ошибок", kind:"mistakes"},
        queue:ex, done:0, total:ex.length, wrong:0, combo:0, bestCombo:0,
        pick:null, checked:false, correct:false, matched:{}, matchPick:null, built:[], startedAt:Date.now()};
  screen = "lesson"; render();
}
