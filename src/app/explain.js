/* =====================================================================
   РАЗБОР ЗАДАНИЯ
   Модальное окно с верным ответом и объяснением, почему он верен —
   и почему неверны остальные варианты. Последнее и есть самое полезное:
   запомнить верный ответ можно и без понимания, а вот отличить его от
   правдоподобного соседа — уже нет.

   Для заданий из карточек разбор неверных вариантов собирается сам:
   каждый вариант помнит, из какой карточки он взят, и достаточно
   показать её определение. Для готовых банков разбор дописывается
   в данных полем on.
   ===================================================================== */

var exModal = null;    /* задание, чей разбор открыт */

function cardByTitle(t){
  for(var i = 0; i < CARDS.length; i++) if(CARDS[i].t === t) return CARDS[i];
  return null;
}

/* короткая справка по варианту: чем он на самом деле является */
function optNote(o, e){
  if(o.n) return o.n;                              /* дописано в данных */
  if(!o.s) return "";
  var c = cardByTitle(o.s);
  if(!c) return "";
  /* в вопросах «как это называется» вариант — сам термин */
  if(e.k.indexOf("c1|") === 0 || e.k.indexOf("c2|") === 0)
    return "<b>" + esc(c.t) + "</b> — " + esc(clipClause(c.d, 110, 150));
  /* в остальных вариант — чужое определение или чужой факт */
  return "это про <b>" + esc(c.t) + "</b>" + (c.tr ? " (" + esc(c.tr) + ")" : "");
}

function vExplain(){
  var e = exModal;
  if(!e) return "";
  var h = '<div class="modal-back" data-exclose="1"></div>' +
    '<div class="modal" role="dialog" aria-modal="true" aria-label="Разбор задания">' +
    '<div class="modal-top">' +
      '<span class="ex-type">' + esc(exLabel(e)) + '</span>' +
      '<button class="x" data-exclose="1" aria-label="Закрыть разбор">✕</button>' +
    '</div>' +
    '<div class="modal-body">' +
    '<h3 class="modal-q">' + esc(e.q) + '</h3>';

  if(e.code) h += '<pre class="code">' + hl(e.code) + '</pre>';

  /* ---- верный ответ ---- */
  if(e.type === "choose"){
    h += '<div class="ex-right"><span class="lbl">Верный ответ</span>' +
         '<p>' + esc(e.o[e.a].t) + '</p></div>';
  } else if(e.type === "match"){
    h += '<div class="ex-right"><span class="lbl">Верные пары</span><ul>' +
         e.pairs.map(function(p){
           return '<li><b>' + esc(p.l) + '</b> — ' + esc(p.r) + '</li>';
         }).join("") + '</ul></div>';
  } else if(e.type === "build"){
    h += '<div class="ex-right"><span class="lbl">' +
         (e.set ? "Нужный набор блоков" : "Верный порядок") + '</span>' +
         '<div class="build-line">' +
           e.tokens.map(function(t){ return '<span class="tok in">' + esc(t) + '</span>'; }).join("") +
         '</div></div>';
    if(e.extra && e.extra.length){
      h += '<div class="ex-wrong"><span class="lbl">Лишние блоки</span><div class="build-line">' +
           e.extra.map(function(t){ return '<span class="tok">' + esc(t) + '</span>'; }).join("") +
           '</div></div>';
    }
  } else if(e.type === "recall"){
    h += '<div class="ex-right"><span class="lbl">Эталонный ответ</span><p>' + esc(e.w) + '</p></div>';
  }

  /* ---- почему так ---- */
  if(e.type !== "recall" && e.w)
    h += '<div class="ex-why"><span class="lbl">Почему так</span><p>' + esc(e.w) + '</p></div>';

  /* ---- почему не остальные ---- */
  if(e.type === "choose"){
    var wrong = [];
    e.o.forEach(function(o, i){
      if(i === e.a) return;
      var note = optNote(o, e);
      wrong.push('<li><span class="wr">' + esc(o.t) + '</span>' +
                 (note ? '<em>' + note + '</em>' : '') + '</li>');
    });
    if(wrong.length)
      h += '<div class="ex-wrong"><span class="lbl">Почему не остальные</span><ul>' +
           wrong.join("") + '</ul></div>';
  }

  /* ---- куда смотреть дальше ---- */
  var terms = {};
  if(e.type === "choose") e.o.forEach(function(o){ if(o.s) terms[o.s] = 1; });
  if(e.type === "match") e.pairs.forEach(function(p){ terms[p.l] = 1; });
  var list = Object.keys(terms);
  if(list.length)
    h += '<div class="ex-see"><span class="lbl">Термины из задания</span><div class="pill-row">' +
         list.map(function(t){ return '<span class="pill" style="cursor:default">' + esc(t) + '</span>'; }).join("") +
         '</div></div>';

  return h + '</div><div class="modal-foot">' +
    '<button class="btn primary" data-exclose="1">Понятно</button></div></div>';
}
