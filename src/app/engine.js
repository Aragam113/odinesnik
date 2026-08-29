/* ================= ГЕНЕРАТОР УПРАЖНЕНИЙ =================
   Из 169 карточек, 30 фраз, 20 задач и 12 сборок собирается
   несколько сотен упражнений шести типов. Дистракторы берутся
   из соседних карточек той же группы — поэтому они правдоподобны.  */

function seed(s){ var h = 2166136261; for(var i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return function(){ h += 0x6D2B79F5; var t = h; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0)/4294967296; }; }
function shuffle(a, rnd){ a = a.slice(); for(var i=a.length-1;i>0;i--){ var j = Math.floor((rnd?rnd():Math.random())*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function pick(arr, n, rnd){ return shuffle(arr, rnd).slice(0, n); }
function clip(s, n){
  if(s.length <= n) return s;
  var cut = s.slice(0, n);
  var sp = cut.lastIndexOf(" ");
  if(sp > n * 0.55) cut = cut.slice(0, sp);        /* режем по границе слова, а не посреди */
  return cut.replace(/[\s,.;:—–-]+$/, "") + "…";
}

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
/* Готовые банки (QUIZ, PHRASES, CLOZE) хранят верный ответ первым.
   Без перемешивания он всегда оказывался на позиции 0 — задание решалось
   без чтения. Здесь варианты тасуются и индекс верного пересчитывается. */
function exFromBank(key, q, code, texts, correctIdx, why, hint, rnd){
  var opts = shuffle(texts.map(function(t, i){ return {t:t, c: i === correctIdx ? 1 : 0}; }), rnd);
  var a = 0;
  for(var i = 0; i < opts.length; i++) if(opts[i].c) a = i;
  return {k:key, type:"choose", q:q, code:code||"", o:opts, a:a, w:why, hint:hint||""};
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
    pairs: four.map(function(c){ return {l:c.t, r:clip(c.d, 52)}; }),
    w:"Пары: " + four.map(function(c){ return c.t + " — " + clip(c.d, 60); }).join(" · ")};
}

/* --- сборка запроса из блоков --- */
function genBuild(b){
  return {k:"b|"+b.task, type:"build", q:b.task, tokens:b.tokens, extra:b.extra||[],
          set:!!b.set, w:b.w};
}

/* --- готовые задачи и фразы --- */
function genQuiz(q, i, rnd){
  return exFromBank("q|"+i, q.q, q.code||"", q.o, q.a, q.w, "", rnd);
}
function genPhrase(p, i, rnd){
  return exFromBank("p|"+i, "Что имеет в виду собеседник?", "", p.o, p.a, p.w, p.p, rnd);
}
function genCloze(c, i, rnd){
  return exFromBank("z|"+i, c.q, c.code, c.o, c.a, c.w, "", rnd);
}
/* вопрос с реального собеседования как задание «расскажи вслух» */
function genIvRecall(q, i){
  return {k:"iv|"+i, type:"recall", q:q.q,
          w: (q.see && q.see.length)
             ? "Спрашивают на реальных интервью. К этому вопросу относятся карточки: " + q.see.join(", ") + "."
             : "Вопрос из живой практики — отвечай своим опытом, готового определения тут нет.",
          meta:q.s};
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

/* ================= СБОРКА УРОКА =================
   Урок собирается в момент открытия из всей базы знаний, а не из
   фиксированного пула. Состав: новые карточки раздела + повторение
   уже виденного из любых тем + прикладная задача + пары.
   Порядок перемешивается так, чтобы подряд не шло больше двух
   заданий одной темы — смешанная практика даёт худший результат
   в моменте, но заметно лучший перенос (Rohrer & Taylor, 2007).
   ================================================================= */

/* какие карточки ученик уже видел: ключи упражнений вида "c0|Термин" */
function seenTitles(srs){
  var set = {};
  for(var k in srs){ if(srs.hasOwnProperty(k)){ var t = k.split("|")[1]; if(t) set[t] = srs[k]; } }
  return set;
}

/* карточки на повторение: сперва просроченные, потом просто знакомые,
   и по возможности из других тем, чем ядро урока */
function pickReview(exclude, n, rnd, srs, coreGroups){
  var seen = seenTitles(srs), now = Date.now();
  var ex = {}; exclude.forEach(function(c){ ex[c.t] = 1; });
  var due = [], known = [];
  CARDS.forEach(function(c){
    if(ex[c.t]) return;
    var s = seen[c.t];
    if(!s) return;
    (s.d && s.d <= now ? due : known).push(c);
  });
  var other = function(list){ return list.filter(function(c){ return coreGroups.indexOf(c.g) < 0; }); };
  var out = pick(other(due), n, rnd);
  if(out.length < n) out = out.concat(pick(due.filter(function(c){ return out.indexOf(c) < 0; }), n - out.length, rnd));
  if(out.length < n) out = out.concat(pick(other(known), n - out.length, rnd));
  if(out.length < n) out = out.concat(pick(known.filter(function(c){ return out.indexOf(c) < 0; }), n - out.length, rnd));
  /* У новичка истории ещё нет. Чтобы урок не был однотемным, добираем
     карточки из других тем — они пойдут как первое знакомство. */
  if(out.length < n){
    var fresh = CARDS.filter(function(c){
      return !ex[c.t] && out.indexOf(c) < 0 && coreGroups.indexOf(c.g) < 0 && c.lvl <= 2;
    });
    out = out.concat(pick(fresh, n - out.length, rnd));
  }
  return out;
}

/* вариант задания зависит от того, впервые ли ученик видит термин:
   первое знакомство — узнавание, дальше — воспроизведение и применение */
function variantFor(card, srs, rnd){
  var s = seenTitles(srs)[card.t];
  if(!s) return 0;                       // впервые: определение по термину
  var box = s.b || 0;
  var pool = box >= 3 ? [2, 3, 1] : [1, 2, 3];
  return pool[Math.floor(rnd() * pool.length)];
}

/* перемешивание с ограничением: не больше двух подряд из одной темы */
function interleave(items, rnd){
  /* Раскладываем по темам и всегда берём из самой многочисленной,
     отличной от предыдущей. Жадный проход по списку оставлял хвост
     из заданий одной темы и давал тройки подряд. */
  var buckets = {}, order = [];
  shuffle(items, rnd).forEach(function(it){
    var g = it.g || "?";
    if(!buckets[g]){ buckets[g] = []; order.push(g); }
    buckets[g].push(it);
  });
  var out = [], last = null;
  while(true){
    var keys = order.filter(function(k){ return buckets[k].length; });
    if(!keys.length) break;
    keys.sort(function(a, b){ return buckets[b].length - buckets[a].length; });
    var key = null;
    for(var i = 0; i < keys.length; i++) if(keys[i] !== last){ key = keys[i]; break; }
    if(!key) key = keys[0];              /* остались задания только одной темы */
    last = key;
    out.push(buckets[key].shift());
  }
  return out;
}

/* прикладные задачи раздела, без повторов внутри урока */
function appliedFor(unit, lesson, rnd, used){
  var out = [];
  var qs = QUIZ.map(function(q, i){ return {q:q, i:i}; })
               .filter(function(x){ return unit.quizG.indexOf(x.q.g) >= 0 && !used["q|" + x.i]; });
  if(qs.length){ var q = pick(qs, 1, rnd)[0]; out.push(genQuiz(q.q, q.i, rnd)); used["q|" + q.i] = 1; }
  /* сборка кода и пропуск в коде — отдельные типы обработки материала,
     поэтому подмешиваются во все уроки, а не только в проверочные */
  var topics = unit.quizG.concat(unit.groups);
  var bs = BUILD.filter(function(b){ return topics.indexOf(b.g) >= 0; });
  var cz = CLOZE.map(function(c, i){ return {c:c, i:i}; })
                .filter(function(x){ return topics.indexOf(x.c.g) >= 0 && !used["z|" + x.i]; });
  if(!bs.length && !cz.length){                       /* у раздела нет своих — берём любые */
    bs = BUILD; cz = CLOZE.map(function(c, i){ return {c:c, i:i}; }).filter(function(x){ return !used["z|" + x.i]; });
  }
  if(bs.length && (rnd() < 0.5 || !cz.length)) out.push(genBuild(pick(bs, 1, rnd)[0]));
  else if(cz.length){ var z = pick(cz, 1, rnd)[0]; out.push(genCloze(CLOZE[z.i], z.i, rnd)); used["z|" + z.i] = 1; }
  return out;
}

function tag(ex, g){ ex.g = g; return ex; }

function makeLesson(unit, lesson, attempt, ctx){
  var rnd = seed(lesson.id + "#" + attempt);
  ctx = ctx || {};
  var srs = ctx.srs || {};
  var used = {};
  var ex = [];

  if(lesson.kind === "boss"){
    var qs = INTERVIEW.map(function(q, i){ return {q:q, i:i}; }).filter(function(x){ return x.q.lvl === lesson.lvl; });
    pick(qs, Math.min(8, qs.length), rnd).forEach(function(x){ ex.push(tag(genInterview(x.q, x.i), x.q.g)); });
    return interleave(ex, rnd);
  }

  var core = lesson.kind === "check" ? pick(lesson.cards, Math.min(6, lesson.cards.length), rnd)
                                     : (lesson.cards || []);
  var coreGroups = [];
  core.forEach(function(c){ if(coreGroups.indexOf(c.g) < 0) coreGroups.push(c.g); });

  /* ядро: по одному заданию на карточку, вариант — по степени знакомства */
  core.forEach(function(c){ ex.push(tag(genFromCard(c, CARDS, variantFor(c, srs, rnd), rnd), c.g)); });

  /* фразы сленга — свой тип задания */
  if(lesson.kind === "slang"){
    for(var i = lesson.from; i < lesson.to; i++) ex.push(tag(genPhrase(PHRASES[i], i, rnd), "сленг"));
  }

  /* Сколько нужно повторения, чтобы разбавить самую массивную тему урока:
     чтобы N заданий одной темы не шли подряд, нужно хотя бы N-1 чужих. */
  var counts = {}, domin = 0;
  ex.forEach(function(x){ counts[x.g] = (counts[x.g] || 0) + 1; if(counts[x.g] > domin) domin = counts[x.g]; });
  var otherN = ex.length - domin;
  var reviewN = Math.max(lesson.kind === "check" ? 4 : 3,
                         Math.min(7, domin - 1 - otherN));
  var review = pickReview(core, reviewN, rnd, srs, coreGroups);
  review.forEach(function(c){ ex.push(tag(genFromCard(c, CARDS, variantFor(c, srs, rnd), rnd), c.g)); });

  /* прикладное */
  appliedFor(unit, lesson, rnd, used).forEach(function(x){ ex.push(tag(x, unit.quizG[0] || coreGroups[0])); });
  if(lesson.kind === "check"){
    appliedFor(unit, lesson, rnd, used).forEach(function(x){ ex.push(tag(x, unit.quizG[0] || coreGroups[0])); });
  }

  /* один вопрос с реального собеседования — в проверочных уроках */
  if(lesson.kind === "check" && typeof IVBANK !== "undefined"){
    var topics = unit.quizG.concat(unit.groups);
    var ivs = IVBANK.map(function(q, i){ return {q:q, i:i}; })
                    .filter(function(x){ return topics.indexOf(x.q.g) >= 0; });
    if(ivs.length){ var iv = pick(ivs, 1, rnd)[0]; ex.push(tag(genIvRecall(iv.q, iv.i), iv.q.g)); }
  }

  /* пары: намеренно смешиваем ядро с повторением, чтобы столкнуть темы */
  var pairPool = core.concat(review);
  if(pairPool.length >= 4) ex.push(tag(genMatch(pick(pairPool, 4, rnd), rnd), "пары"));

  return interleave(ex, rnd);
}
