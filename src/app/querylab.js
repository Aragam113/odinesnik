/* =====================================================================
   ТРЕНАЖЁР ЗАПРОСОВ
   Экран с теорией и четырьмя видами практики. Сами задания прогоняются
   через обычную механику урока: те же жизни, комбо, XP, разбор и звук.
   Поэтому здесь только сборка очереди и экран запуска.
   ===================================================================== */

var qlOpen = "";        /* какой раздел теории раскрыт */

/* задание тренажёра → упражнение урока */
function qlEx(t, i){
  if(t.kind === "make"){
    return {k:"ql-make|" + i, type:"build", q:t.task,
            tokens:t.tokens, extra:t.extra || [], set:!!t.set, w:t.w};
  }
  /* выбор варианта: пояснения к неверным едут вместе с вариантами */
  var opts = t.o.map(function(x, j){
    return {t:x, c: j === t.a ? 1 : 0, n: (t.on && t.on[j]) || ""};
  });
  return {k:"ql-" + t.kind + "|" + i, type:"choose", q:t.task,
          code:t.code || "", o:opts, a:t.a, w:t.w, hint:""};
}

function qlPool(kind){
  var out = [];
  QTASKS.forEach(function(t, i){ if(t.kind === kind) out.push(qlEx(t, i)); });
  return out;
}

function qlStart(kind){
  if(hearts() === 0 && !S.noHearts){ screen = "nohearts"; render(); return; }
  var k = QL_KINDS.filter(function(x){ return x.id === kind; })[0];
  if(!k) return;
  if(!S.runs) S.runs = {};
  var id = "ql-" + kind;
  S.runs[id] = (S.runs[id] || 0) + 1;
  var rnd = seed(id + "#" + S.runs[id] + "#" + crowns(id));
  /* варианты внутри задания тасуются, иначе верный всегда стоит первым */
  var list = shuffle(qlPool(kind), rnd).map(function(e){
    if(e.type !== "choose") return e;
    var o = shuffle(e.o, rnd), a = 0;
    for(var i = 0; i < o.length; i++) if(o[i].c) a = i;
    return {k:e.k, type:e.type, q:e.q, code:e.code, o:o, a:a, w:e.w, hint:e.hint};
  });
  LS = {
    idx: -1, sec: null, lesson: {id:id, t:k.t, kind:"ql"},
    queue: list, done: 0, total: list.length, wrong: 0, combo: 0, bestCombo: 0,
    pick: null, checked: false, correct: false, peeked: false,
    matched: {}, matchPick: null, built: [], startedAt: Date.now()
  };
  screen = "lesson"; render();
}

/* ---------- экран тренажёра ---------- */
function vQL(){
  var h = '<div class="sec-h"><span class="eyebrow">Отдельный тренажёр</span>' +
    '<h2>Запросы</h2>' +
    '<p>Половина работы одинэсника — запросы. Сначала короткая теория, ' +
    'потом четыре вида практики на одном и том же материале.</p></div>';

  /* теория */
  h += '<div class="card" style="padding:0 18px">' + QTHEORY.map(function(a){
    var open = qlOpen === a.id;
    return '<div class="acc-item">' +
      '<button class="acc-btn" data-qlopen="' + a.id + '"><span class="sign">' + (open ? "−" : "+") + '</span>' +
      '<span>' + esc(a.t) + '</span></button>' +
      (open ? '<div class="acc-body">' + a.html + '</div>' : '') +
    '</div>';
  }).join("") + '</div>';

  /* практика */
  h += '<div class="sec-h" style="margin-top:8px"><h2 style="font-size:20px">Практика</h2>' +
       '<p>Каждый блок — все задания своего вида вперемешку. Жизни, разбор и звук те же, что в уроке.</p></div>';

  h += QL_KINDS.map(function(k){
    var n = QTASKS.filter(function(t){ return t.kind === k.id; }).length;
    var cr = crowns("ql-" + k.id);
    return '<button class="card iv-stage" data-qlstart="' + k.id + '" ' +
      'style="width:100%;text-align:left;display:block;border-left:6px solid ' + k.c + '">' +
      '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px">' +
        '<div style="min-width:0"><h3 style="font-size:18px">' + esc(k.t) + '</h3>' +
        '<p style="font-size:14px;color:var(--ink-2);margin-top:4px">' + esc(k.sub) + '</p></div>' +
        '<span class="tag y">' + n + '</span>' +
      '</div>' +
      (cr ? '<p style="font-size:12.5px;color:var(--gold);margin-top:10px">' + repeat("★", cr) + '</p>'
          : '<p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">ещё не пройден</p>') +
    '</button>';
  }).join("");

  return h;
}
