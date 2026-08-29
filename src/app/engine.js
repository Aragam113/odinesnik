/* ================= ГЕНЕРАТОР УПРАЖНЕНИЙ =================
   Из 169 карточек, 30 фраз, 20 задач и 12 сборок собирается
   несколько сотен упражнений шести типов. Дистракторы берутся
   из соседних карточек той же группы — поэтому они правдоподобны.  */

function seed(s){ var h = 2166136261; for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return function(){ h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296; }; }
function shuffle(a, rnd){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j = Math.floor((rnd?rnd():Math.random())*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function pick(arr, n, rnd){ return shuffle(arr, rnd).slice(0, n); }
function clip(s, n){ return s.length > n ? s.slice(0, n).replace(/[\s,.;:—-]+$/,"") + "…" : s; }

/* дистракторы: сначала из той же группы, потом из любых */
function others(card, pool, n, rnd){
  var same = pool.filter(function(c){ return c !== card && c.g === card.g; });
  var rest = pool.filter(function(c){ return c !== card && c.g !== card.g; });
  var out = pick(same, n, rnd);
  if(out.length < n) out = out.concat(pick(rest, n - out.length, rnd));
  return out;
}

function exChoose(key, q, code, options, correctIdx, why, hint){
  return {k:key, type:"choose", q:q, code:code||"", o:options, a:correctIdx, w:why, hint:hint||""};
}

/* --- из карточки термина --- */
function genFromCard(card, pool, variant, rnd){
  var d = others(card, pool, 3, rnd);
  if(variant === 0){
    var opts = shuffle([{t:clip(card.d,150), c:1}].concat(d.map(function(x){ return {t:clip(x.d,150), c:0}; })), rnd);
    return exChoose("c0|"+card.t, "Что такое «" + card.t + "»?", "", opts, opts.findIndex(function(o){return o.c;}), card.live, card.tr);
  }
  if(variant === 1){
    var opts1 = shuffle([{t:card.t, c:1}].concat(d.map(function(x){ return {t:x.t, c:0}; })), rnd);
    return exChoose("c1|"+card.t, "Как это называется?", "", opts1, opts1.findIndex(function(o){return o.c;}), card.t + " — " + card.d, clip(card.d, 160));
  }
  if(variant === 2){
    var opts2 = shuffle([{t:card.t, c:1}].concat(d.map(function(x){ return {t:x.t, c:0}; })), rnd);
    return exChoose("c2|"+card.t, "О чём речь в этой фразе?", "", opts2, opts2.findIndex(function(o){return o.c;}), card.live, card.ex);
  }
  var opts3 = shuffle([{t:clip(card.live,150), c:1}].concat(d.map(function(x){ return {t:clip(x.live,150), c:0}; })), rnd);
  return exChoose("c3|"+card.t, "«" + card.t + "» — что это значит на практике?", "", opts3, opts3.findIndex(function(o){return o.c;}), card.d + " " + card.ex, card.tr);
}

/* --- сопоставление пар --- */
function genMatch(cards, rnd){
  var four = cards.slice(0, 4);
  return {k:"m|"+four.map(function(c){return c.t;}).join("|"), type:"match",
    q:"Собери пары: термин и его значение",
    pairs: four.map(function(c){ return {l:c.t, r:clip(c.d, 46)}; }),
    w:"Пары: " + four.map(function(c){ return c.t + " — " + clip(c.d, 60); }).join(" · ")};
}

/* --- сборка запроса из блоков --- */
function genBuild(b){
  return {k:"b|"+b.task, type:"build", q:b.task, tokens:b.tokens, extra:b.extra||[], w:b.w};
}

/* --- готовые задачи и фразы --- */
function genQuiz(q, i){
  return exChoose("q|"+i, q.q, q.code||"", q.o.map(function(o,j){ return {t:o, c: j===q.a ? 1 : 0}; }), q.a, q.w);
}
function genPhrase(p, i){
  return exChoose("p|"+i, "Что имеет в виду собеседник?", "", p.o.map(function(o,j){ return {t:o, c: j===p.a ? 1:0}; }), p.a, p.w, p.p);
}
function genCloze(c, i){
  return exChoose("z|"+i, c.q, c.code, c.o.map(function(o,j){ return {t:o, c: j===c.a?1:0}; }), c.a, c.w);
}
function genInterview(q, i){
  return {k:"i|"+i, type:"recall", q:q.q, w:q.a, meta:q.lvl + " · " + q.g};
}

/* ================= НАРЕЗКА КУРСА =================
   Юнит → уроки по 5 карточек. Последний урок юнита — проверка. */
function buildCourse(){
  var course = [];
  UNITS.forEach(function(u){
    var cards = CARDS.filter(function(c){ return u.groups.indexOf(c.g) >= 0 && c.lvl >= u.lvl[0] && c.lvl <= u.lvl[1]; });
    cards.sort(function(a,b){ return a.lvl - b.lvl; });
    var quizzes = QUIZ.map(function(q,i){ return {q:q, i:i}; }).filter(function(x){ return u.quizG.indexOf(x.q.g) >= 0; });
    var lessons = [];

    if(u.boss){
      ["junior","middle","senior"].forEach(function(lvl, i){
        lessons.push({id:u.id+".L"+i, t:lvl === "junior" ? "Junior" : lvl === "middle" ? "Middle" : "Senior",
                      kind:"boss", lvl:lvl});
      });
    } else if(u.slang){
      /* сленг: все карточки группы режем по 5, фразы распределяем поровну */
      var n = Math.max(1, Math.ceil(cards.length / 5));
      var per = PHRASES.length / n;
      for(var s = 0; s < n; s++){
        lessons.push({id:u.id+".L"+s, t:"Урок "+(s+1),
                      kind:"slang",
                      from:Math.round(s*per), to:Math.round((s+1)*per),
                      cards:cards.slice(s*5, s*5+5)});
      }
      lessons.push({id:u.id+".LX", t:"Проверка", kind:"check", cards:cards, quiz:[], build:false});
    } else {
      for(var i2 = 0; i2 < cards.length; i2 += 5){
        var chunk = cards.slice(i2, i2+5);
        /* хвост короче трёх карточек не делаем отдельным уроком — он скучный */
        if(chunk.length < 3 && lessons.length){
          lessons[lessons.length-1].cards = lessons[lessons.length-1].cards.concat(chunk);
          break;
        }
        lessons.push({id:u.id+".L"+(i2/5), t:"Урок "+(lessons.length+1), kind:"cards", cards:chunk,
                      quiz: quizzes.length ? [quizzes[(i2/5) % quizzes.length]] : []});
      }
      lessons.push({id:u.id+".LX", t:"Проверка", kind:"check", cards:cards, quiz:quizzes, build:!!u.build});
    }
    course.push({u:u, lessons:lessons});
  });
  return course;
}

/* ================= СБОРКА УРОКА ================= */
function makeLesson(unit, lesson, attempt){
  var rnd = seed(lesson.id + "#" + (attempt||0));
  var ex = [];

  if(lesson.kind === "boss"){
    var qs = INTERVIEW.map(function(q,i){ return {q:q,i:i}; }).filter(function(x){ return x.q.lvl === lesson.lvl; });
    pick(qs, Math.min(8, qs.length), rnd).forEach(function(x){ ex.push(genInterview(x.q, x.i)); });
    return ex;
  }

  if(lesson.kind === "slang"){
    for(var i = lesson.from; i < lesson.to; i++) ex.push(genPhrase(PHRASES[i], i));
    (lesson.cards||[]).forEach(function(c, j){ ex.push(genFromCard(c, CARDS, j % 4, rnd)); });
    return shuffle(ex, rnd);
  }

  if(lesson.kind === "check"){
    var pool = lesson.cards;
    pick(pool, Math.min(6, pool.length), rnd).forEach(function(c, j){ ex.push(genFromCard(c, CARDS, (j+1) % 4, rnd)); });
    if(pool.length >= 4) ex.push(genMatch(pick(pool, 4, rnd), rnd));
    (lesson.quiz||[]).slice(0, 3).forEach(function(x){ ex.push(genQuiz(x.q, x.i)); });
    if(lesson.build){
      var bs = BUILD.filter(function(b){ return unit.quizG.indexOf(b.g) >= 0 || unit.groups.indexOf(b.g) >= 0; });
      if(bs.length) ex.push(genBuild(pick(bs, 1, rnd)[0]));
      var cz = CLOZE.filter(function(c){ return unit.quizG.indexOf(c.g) >= 0 || unit.groups.indexOf(c.g) >= 0; });
      if(cz.length){ var ci = CLOZE.indexOf(pick(cz, 1, rnd)[0]); ex.push(genCloze(CLOZE[ci], ci)); }
    }
    return shuffle(ex, rnd);
  }

  /* обычный урок: каждая карточка даёт упражнение, плюс пары и задача */
  lesson.cards.forEach(function(c, j){ ex.push(genFromCard(c, CARDS, j % 4, rnd)); });
  if(lesson.cards.length >= 4) ex.push(genMatch(pick(lesson.cards, 4, rnd), rnd));
  (lesson.quiz||[]).forEach(function(x){ ex.push(genQuiz(x.q, x.i)); });
  lesson.cards.slice(0, 2).forEach(function(c, j){ ex.push(genFromCard(c, CARDS, (j+2) % 4, rnd)); });
  return shuffle(ex, rnd);
}
