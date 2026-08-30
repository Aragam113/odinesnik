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
  var h = '<p class="mode-intro">Половина работы одинэсника — запросы. Сначала короткая теория, ' +
    'потом четыре вида практики на одном и том же материале.</p>';

  /* теория; у раздела может быть одна или несколько интерактивных схем */
  h += '<div class="card" style="padding:0 18px">' + QTHEORY.map(function(a){
    var open = qlOpen === a.id;
    var body = "";
    if(open){
      body = a.html;
      (a.dia || []).forEach(function(d, di){
        var pre = "ql-" + a.id + "-" + di + "|";
        var sel = null;
        if(bookNode && bookNode.indexOf(pre) === 0){
          var nid = bookNode.slice(pre.length);
          if(d.say[nid]) sel = nid;
        }
        body += '<div class="ql-dia">' +
          '<h4>' + esc(d.t) + '</h4>' +
          '<p class="dia-hint">Нажми на любой блок — расскажу, что это и зачем.</p>' +
          '<div class="dia-wrap">' + bookDiagram(d, sel, pre) + '</div>' +
          '<div class="dia-say' + (sel ? " on" : "") + '">' +
            (sel ? '<b>' + esc((d.nodes.filter(function(n){ return n.id === sel; })[0] || {}).t) + '</b>' +
                   '<p>' + d.say[sel] + '</p>'
                 : '<p class="muted">Пока ничего не выбрано.</p>') +
          '</div></div>';
      });
      if(a.after) body += a.after;
    }
    return '<div class="acc-item">' +
      '<button class="acc-btn" data-qlopen="' + a.id + '"><span class="sign">' + (open ? "−" : "+") + '</span>' +
      '<span>' + esc(a.t) + '</span></button>' +
      (open ? '<div class="acc-body">' + body + '</div>' : '') +
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

/* =====================================================================
   ВКЛАДКА «ТРЕНИРОВКИ»
   Два режима под одним переключателем: тренажёр запросов и симуляция
   собеседования. Оба — тренировка на готовом материале, в отличие от
   пути, где материал проходится впервые.
   ===================================================================== */
/* режим живёт в состоянии, чтобы переживать перезагрузку */
function trainMode(){ return (S && S.trainMode) || "ql"; }

var TRAIN_MODES = [
  {id:"ql", t:"Запросы",       sub:"теория и практика",
   ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="12" cy="6" rx="7.5" ry="3"/>' +
      '<path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/>' +
      '<path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></svg>'},
  {id:"iv", t:"Собеседование", sub:"вопросы с интервью",
   ic:'<svg viewBox="0 0 24 24"><path d="M4 4h16v12H9l-5 4z"/>' +
      '<circle cx="9" cy="10" r="1.4" fill="#fff"/><circle cx="12" cy="10" r="1.4" fill="#fff"/>' +
      '<circle cx="15" cy="10" r="1.4" fill="#fff"/></svg>'}
];

function vTrain(){
  var mode = trainMode();
  var i = TRAIN_MODES.map(function(m){ return m.id; }).indexOf(mode);
  if(i < 0){ mode = "ql"; i = 0; }

  var sw = '<div class="switcher" role="tablist" aria-label="Режим тренировки" ' +
    'style="--n:' + TRAIN_MODES.length + ';--i:' + i + '">' +
    '<span class="switcher-ind" aria-hidden="true"></span>' +
    TRAIN_MODES.map(function(m, j){
      return '<button class="sw' + (j === i ? " on" : "") + '" role="tab" ' +
        'aria-selected="' + (j === i) + '" data-train="' + m.id + '">' +
        m.ic + '<span class="sw-t">' + esc(m.t) + '</span>' +
        '<span class="sw-s">' + esc(m.sub) + '</span></button>';
    }).join("") + '</div>';

  return sw + '<div class="train-body">' + (mode === "iv" ? vIvHome() : vQL()) + '</div>';
}
