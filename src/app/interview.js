/* =====================================================================
   МОДУЛЬ «СОБЕСЕДОВАНИЕ»
   Симуляция интервью по банку реальных вопросов: стадия, пул вопросов
   вперемешку по темам, самооценка после каждого ответа и разбор в конце
   с указанием, какие карточки повторить.
   ===================================================================== */

var IV_STAGES = [
  {id:"Скрининг",    t:"Скрининг",     sub:"Разговор с рекрутером: опыт, ожидания, формальности", n:8},
  {id:"Техскрининг", t:"Техскрининг",  sub:"Первый технический фильтр — быстрые вопросы по верхам", n:10},
  {id:"Техничка",    t:"Техничка",     sub:"Полноценное техническое интервью с разработчиком", n:14}
];
var IV_MARKS = [
  {id:"solid", t:"Ответил уверенно",  c:"ok",   v:2},
  {id:"shaky", t:"Плавал",            c:"",     v:1},
  {id:"none",  t:"Не знаю",           c:"no",   v:0}
];

var IVS = null;   /* текущая сессия */

function ivPool(stage){
  return IVBANK.filter(function(q){ return q.s === stage; });
}

/* вопросы берём вперемешку по темам, чтобы собес не шёл блоками */
function ivPick(stage, n, rnd){
  var pool = ivPool(stage);
  if(pool.length < n) pool = IVBANK.slice();
  var byTopic = {}, order = [];
  shuffle(pool, rnd).forEach(function(q){
    if(!byTopic[q.g]){ byTopic[q.g] = []; order.push(q.g); }
    byTopic[q.g].push(q);
  });
  order = shuffle(order, rnd);
  var out = [], guard = 0;
  while(out.length < n && guard++ < n * 20){
    var moved = false;
    for(var i = 0; i < order.length && out.length < n; i++){
      var b = byTopic[order[i]];
      if(b && b.length){ out.push(b.shift()); moved = true; }
    }
    if(!moved) break;
  }
  return out;
}

function ivStart(stageId){
  var st = IV_STAGES.filter(function(s){ return s.id === stageId; })[0] || IV_STAGES[0];
  var rnd = seed(stageId + "#" + Date.now());
  IVS = {
    stage: st, list: ivPick(st.id, st.n, rnd), i: 0,
    shown: false, marks: [], startedAt: Date.now()
  };
  screen = "iv"; render();
}

function ivCurrent(){ return IVS && IVS.list[IVS.i]; }

function ivRate(markId){
  var q = ivCurrent(); if(!q) return;
  var m = IV_MARKS.filter(function(x){ return x.id === markId; })[0];
  IVS.marks.push({q:q, m:m});
  /* то, что не далось, отправляем в разбор ошибок через связанные карточки */
  if(m.v < 2 && q.see){
    q.see.forEach(function(t){
      var key = "c0|" + t;
      if(S.mistakes.indexOf(key) < 0) S.mistakes.unshift(key);
    });
    S.mistakes = S.mistakes.slice(0, 60);
  }
  IVS.i++; IVS.shown = false;
  if(IVS.i >= IVS.list.length) ivFinish(); else { save(); render(); }
}

function ivFinish(){
  var solid = IVS.marks.filter(function(x){ return x.m.v === 2; }).length;
  IVS.score = Math.round(IVS.marks.reduce(function(a, x){ return a + x.m.v; }, 0) / (IVS.marks.length * 2) * 100);
  IVS.solid = solid;
  /* сводка по темам */
  var t = {};
  IVS.marks.forEach(function(x){
    var g = x.q.g;
    if(!t[g]) t[g] = {n:0, v:0};
    t[g].n++; t[g].v += x.m.v;
  });
  IVS.byTopic = Object.keys(t).map(function(g){
    return {g:g, n:t[g].n, pct: Math.round(t[g].v / (t[g].n * 2) * 100)};
  }).sort(function(a, b){ return a.pct - b.pct; });

  if(!S.iv) S.iv = {runs:0, best:0, asked:0};
  S.iv.runs++; S.iv.asked += IVS.marks.length;
  if(IVS.score > (S.iv.best || 0)) S.iv.best = IVS.score;
  addXP(10 + Math.round(IVS.score / 10));
  markActive();
  save();
  screen = "ivdone"; render();
}

var IV_TOPIC_NAME = {
  "запросы":"Запросы и СКД", "мета":"Метаданные", "язык":"Язык и формы",
  "нагрузка":"Блокировки и нагрузка", "типовые":"Типовые и БСП",
  "интеграции":"Интеграции", "инфра":"Инструменты и СУБД", "учёт":"Учёт",
  "опыт":"Опыт и мотивация", "общее":"Разное"
};
var ivTopic = function(g){ return IV_TOPIC_NAME[g] || g; };
