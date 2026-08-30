/* Экраны модуля «Собеседование». */

function vIvHome(){
  var st = S.iv || {runs:0, best:0, asked:0};
  var total = IVBANK.length;
  var byStage = {};
  IVBANK.forEach(function(q){ byStage[q.s] = (byStage[q.s] || 0) + 1; });

  return '<div class="sec-h"><span class="eyebrow">Вопросы с реальных интервью</span>'+
    '<h2>Собеседование</h2>'+
    '<p>Банк собран из профессионального чата, где соискатели выкладывают вопросы сразу после интервью. '+
    'Имён и названий компаний в базе нет — только сами вопросы.</p></div>'+

  '<div class="tile-row">'+
    '<div class="tile"><b style="color:var(--info)">'+total+'</b><span>вопросов в банке</span></div>'+
    '<div class="tile"><b style="color:var(--gold)">'+(st.runs||0)+'</b><span>собесов пройдено</span></div>'+
    '<div class="tile"><b style="color:var(--ok)">'+(st.best||0)+'%</b><span>лучший результат</span></div>'+
  '</div>'+

  '<div class="card"><div class="speech">'+MASCOT.render("sanych",{mood:"idle"})+
    '<div class="bubble">Отвечай <b>вслух и целиком</b>, как перед живым человеком. Молчаливое «ну да, я это знаю» — '+
    'главный самообман: на интервью проверяют не узнавание, а умение объяснить.</div></div></div>'+

  IV_STAGES.map(function(s){
    var n = byStage[s.id] || 0;
    return '<button class="card iv-stage" data-iv-start="'+s.id+'" style="width:100%;text-align:left;display:block">'+
      '<div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px">'+
        '<div style="min-width:0"><h3 style="font-size:18px">'+esc(s.t)+'</h3>'+
        '<p style="font-size:14px;color:var(--ink-2);margin-top:4px">'+esc(s.sub)+'</p></div>'+
        '<span class="tag y">'+s.n+' вопросов</span>'+
      '</div>'+
      '<p style="font-size:12.5px;color:var(--ink-3);margin-top:10px">в банке '+n+' вопросов этой стадии</p>'+
    '</button>';
  }).join('');
}

function vIvSession(){
  var q = ivCurrent();
  if(!q) return '';
  var pct = Math.round(IVS.i / IVS.list.length * 100);
  var seeCards = (q.see || []).map(function(t){
    return '<span class="pill" style="cursor:default">'+esc(t)+'</span>';
  }).join('');

  var body;
  if(!IVS.shown){
    body = '<div class="recall-hint">Проговори ответ вслух целиком. Когда закончишь — открой, на что смотрит интервьюер.</div>'+
      '<div class="opts"><button class="opt" data-iv-show="1">'+
        '<span class="opt-k">→</span><span>Я ответил, показать разбор</span></button></div>';
  } else {
    /* Разбор: сначала эталон, потом пункты для самопроверки, потом карточки.
       У вопросов про опыт (t:"hr") эталона по существу быть не может —
       там разбирается, что именно проверяет интервьюер. */
    body = '<div class="recall-a">'+
        (q.a ? '<b>'+(q.t === "hr" ? "Что здесь проверяют" : "Эталонный ответ")+'</b>'+
               '<div class="iv-answer">'+q.a+'</div>' : '')+
        (q.k && q.k.length
          ? '<div class="iv-keys"><b>Должно прозвучать:</b><ul>'+
              q.k.map(function(x){ return '<li>'+x+'</li>'; }).join('')+
            '</ul></div>' : '')+
        (q.miss ? '<div class="iv-miss"><b>Частая ошибка:</b> '+q.miss+'</div>' : '')+
        (seeCards ? '<div class="iv-cards"><b>Карточки по теме:</b>'+
                    '<div class="pill-row" style="margin-top:8px">'+seeCards+'</div></div>'
                  : (q.a ? '' : '<b>Разбора пока нет</b> — вопрос из практики, отвечай своим опытом.'))+
      '</div>'+
      '<div class="ex-type" style="margin-top:6px">Оцени себя честно</div>'+
      '<div class="opts">'+ IV_MARKS.map(function(m){
        return '<button class="opt" data-iv-mark="'+m.id+'"><span class="opt-k">'+
          (m.id === "solid" ? "✓" : m.id === "shaky" ? "~" : "?")+'</span><span>'+esc(m.t)+'</span></button>';
      }).join('')+'</div>';
  }

  return '<div class="lesson">'+
    '<header class="lesson-top">'+
      '<button class="x" data-iv-quit="1" aria-label="Выйти">✕</button>'+
      '<div class="pbar"><i style="width:'+pct+'%"></i></div>'+
      '<span class="chip-stat dim" style="font-size:13px">'+(IVS.i+1)+' / '+IVS.list.length+'</span>'+
    '</header>'+
    '<div class="lesson-body"><div class="ex">'+
      '<span class="ex-type">'+esc(IVS.stage.t)+' · '+esc(ivTopic(q.g))+'</span>'+
      '<h2 class="ex-q">'+esc(q.q)+'</h2>'+
      body+
    '</div></div></div>';
}

function vIvDone(){
  var s = IVS;
  var verdict = s.score >= 80 ? "Готов к этой стадии"
              : s.score >= 55 ? "Пройдёшь, но с пробелами"
              : "Ещё рано, есть что подтянуть";
  return '<div class="finish">'+
    '<div class="finish-hero">'+MASCOT.render(s.score >= 80 ? "byte" : "sanych",
        {mood: s.score >= 80 ? "cheer" : s.score >= 55 ? "idle" : "sad", cls: s.score >= 80 ? "is-hop" : "idle-bob"})+'</div>'+
    '<h2>'+esc(verdict)+'</h2>'+
    '<p>Уверенно ответил на '+s.solid+' из '+s.marks.length+' вопросов.</p>'+
    '<div class="finish-stats">'+
      '<div class="ds xp"><b>'+s.score+'%</b><span>уверенность</span></div>'+
      '<div class="ds acc"><b>'+s.solid+'</b><span>твёрдых</span></div>'+
      '<div class="ds time"><b>'+Math.round((Date.now()-s.startedAt)/60000)+'м</b><span>время</span></div>'+
    '</div>'+
    '<div class="card" style="max-width:420px;width:100%;text-align:left">'+
      '<h3 style="font-size:16px;margin-bottom:12px">Где просело</h3>'+
      s.byTopic.map(function(t){
        var col = t.pct >= 80 ? 'var(--ok)' : t.pct >= 50 ? 'var(--gold)' : 'var(--no)';
        return '<div style="display:flex;flex-direction:column;gap:5px;margin-bottom:10px">'+
          '<div class="row" style="justify-content:space-between"><span style="font-size:13.5px;font-weight:700">'+
            esc(ivTopic(t.g))+'</span><span class="mono" style="font-size:12px;color:var(--ink-3)">'+t.pct+'% · '+t.n+' вопр.</span></div>'+
          '<div class="bar thin"><i style="width:'+t.pct+'%;background:'+col+'"></i></div></div>';
      }).join('')+
    '</div>'+
    '<div class="row" style="max-width:420px">'+
      '<button class="btn primary" data-tab="practice">Разобрать пробелы</button>'+
      '<button class="btn" data-iv-quit="1">К списку стадий</button>'+
    '</div>'+
  '</div>';
}
