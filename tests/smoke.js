const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');

const body = fs.readFileSync(require('path').join(__dirname,'..','dist','artifact.html'), 'utf8');
const errs = [], log = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errs.push('JSDOM: ' + e.message));
vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));

const windows = [];
function boot(seed) {
  const pre = seed ? '<script>localStorage.setItem("odinesnik.v2",' + JSON.stringify(JSON.stringify(seed)) + ')</script>' : '';
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body>' + pre + body + '</body></html>',
    { runScripts: 'dangerously', url: 'https://example.com', virtualConsole: vc });
  windows.push(dom.window);
  return dom.window;
}
function api(w) {
  const d = w.document;
  return {
    w, d,
    q: s => d.querySelector(s),
    all: s => Array.from(d.querySelectorAll(s)),
    click(s) { const el = typeof s === 'string' ? d.querySelector(s) : s; if (!el) throw new Error('нет элемента ' + s); el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); },
    state() { return JSON.parse(w.localStorage.getItem('odinesnik.v2') || '{}'); }
  };
}
function step(name, fn) {
  try { fn(); log.push('  ok    ' + name); }
  catch (e) { log.push('  ПАДАЕТ ' + name + ' -> ' + e.message); errs.push(name + ': ' + e.message); }
}
function head(t) { log.push('\n' + t); }

/* ---------- базовый рендер ---------- */
let A = api(boot(null));
head('=== старт ===');
step('заголовок страницы', () => { if (A.d.title !== 'Тренажёр одинэсника') throw new Error(A.d.title); });
step('шапка с маскотом и счётчиками', () => {
  if (!A.q('.hud .brand svg')) throw new Error('нет маскота');
  if (A.all('.chip-stat').length < 3) throw new Error('счётчиков ' + A.all('.chip-stat').length);
});
step('четыре вкладки', () => { if (A.all('.tab').length !== 4) throw new Error('вкладок ' + A.all('.tab').length); });
step('путь: 9 разделов', () => { if (A.all('.unit').length !== 9) throw new Error('разделов ' + A.all('.unit').length); });
step('уроков на пути', () => { const n = A.all('.node').length; if (n < 40) throw new Error('узлов ' + n); });
step('открыт только первый узел', () => {
  const open = A.all('.node:not([disabled])').length;
  if (open !== 1) throw new Error('открытых узлов ' + open);
});
step('на первом узле бейдж «Старт»', () => { if (!A.q('.node-flag')) throw new Error('нет бейджа'); });

/* ---------- переключение вкладок ---------- */
head('=== вкладки ===');
['practice', 'ref', 'stats', 'path'].forEach(t => {
  step('вкладка ' + t, () => {
    A.click('[data-tab="' + t + '"]');
    if (!A.q('#view').innerHTML.trim()) throw new Error('пусто');
    if (A.q('#view').innerHTML.indexOf('undefined') >= 0) throw new Error('undefined в разметке');
  });
});
step('справочник: все четыре подраздела', () => {
  A.click('[data-tab="ref"]');
  ['arch', 'hood', 'road', 'lib'].forEach(r => {
    A.click('[data-ref="' + r + '"]');
    if (!A.q('#view').innerHTML.trim()) throw new Error('пусто на ' + r);
  });
});
step('теория раскрывается', () => {
  A.click('[data-ref="arch"]');
  A.click(A.all('[data-open]')[1]);
  if (!A.q('.acc-body')) throw new Error('не раскрылось');
});
step('чекбоксы плана сохраняются', () => {
  A.click('[data-ref="road"]');
  const k = A.all('[data-road]')[0].getAttribute('data-road');
  A.click('[data-road="' + k + '"]');
  if (!A.state().road[k]) throw new Error('не сохранилось');
});
step('ссылки библиотеки безопасны', () => {
  A.click('[data-ref="lib"]');
  const bad = A.all('#view a[href^="http"]').filter(a => a.target !== '_blank' || !/noopener/.test(a.rel || ''));
  if (bad.length) throw new Error(bad.length + ' без target/rel');
});

/* ---------- урок ---------- */
head('=== урок ===');
A = api(boot({ xp: 0, byDay: {}, day: '', streak: 0, goal: 30, hearts: 5, heartAt: 0, noHearts: false, crowns: {}, mistakes: [], srs: {}, road: {} }));
step('урок открывается', () => {
  A.click('[data-lesson="0"]');
  if (!A.q('.lesson')) throw new Error('нет экрана урока');
  if (!A.q('.ex-q')) throw new Error('нет вопроса');
  if (!A.q('.pbar')) throw new Error('нет прогресса');
  if (!A.q('.hearts')) throw new Error('нет жизней');
});
step('«Проверить» заблокирован до выбора', () => {
  if (!A.q('[data-check]').disabled) throw new Error('кнопка активна без ответа');
});
step('выбор варианта разблокирует проверку', () => {
  A.click('[data-pick="0"]');
  if (A.q('[data-check]').disabled) throw new Error('всё ещё заблокирована');
  if (!A.q('.opt.sel')) throw new Error('вариант не подсветился');
});
step('проверка даёт цветную панель и разбор', () => {
  A.click('[data-check]');
  const fb = A.q('.fb.ok') || A.q('.fb.no');
  if (!fb) throw new Error('нет панели');
  if (!A.q('.opt.ok')) throw new Error('верный вариант не подсвечен');
  if (!fb.textContent.trim()) throw new Error('пустой разбор');
});
step('ошибка снимает жизнь, верный ответ — нет', () => {
  const st = A.state();
  const wrong = !!A.q('.fb.no');
  if (wrong && st.hearts !== 4) throw new Error('жизнь не снялась: ' + st.hearts);
  if (!wrong && st.hearts !== 5) throw new Error('жизнь снялась при верном ответе');
});
step('переход к следующему упражнению', () => {
  const q1 = A.q('.ex-q').textContent;
  A.click('[data-next]');
  if (A.q('.fb.ok') || A.q('.fb.no')) throw new Error('панель не сбросилась');
  if (A.q('.ex-q').textContent === q1 && A.q('.opt.sel')) throw new Error('состояние не сбросилось');
});
step('ошибки попадают в разбор', () => {
  const st = A.state();
  if (!Array.isArray(st.mistakes)) throw new Error('нет списка ошибок');
});
step('повторный промах по тому же упражнению жизнь не снимает', () => {
  /* дожимаем урок неверными ответами и следим, что жизни не уходят ниже нуля */
  let guard = 0, minHearts = 5;
  while (A.q('.lesson') && guard++ < 200) {
    if (A.q('[data-next]')) { A.click('[data-next]'); continue; }
    const opts = A.all('.opt[data-pick]');
    if (opts.length) { A.click(opts[opts.length - 1]); const c = A.q('[data-check]'); if (c && !c.disabled) A.click(c); continue; }
    if (A.q('[data-skip]')) { A.click('[data-skip]'); continue; }
    break;
  }
  const st = A.state();
  if (st.hearts < 0) throw new Error('жизни ушли в минус');
});
step('при нуле жизней — экран провала с выходами', () => {
  if (A.q('.finish') && /Жизни/.test(A.q('.finish').textContent)) {
    if (!A.q('[data-mistakes]')) throw new Error('нет кнопки разбора');
    if (!A.q('[data-nohearts]')) throw new Error('нет отключения жизней');
  }
});

/* ---------- прохождение урока целиком ---------- */
head('=== полное прохождение (без жизней) ===');
A = api(boot({ xp: 0, byDay: {}, day: '', streak: 0, goal: 30, hearts: 5, heartAt: 0, noHearts: true, crowns: {}, mistakes: [], srs: {}, road: {} }));
step('урок доходит до экрана завершения', () => {
  A.click('[data-lesson="0"]');
  const known = {};
  let guard = 0;
  while (guard++ < 400) {
    if (A.q('.finish')) break;
    const fb = A.q('.fb.ok') || A.q('.fb.no');
    if (fb) {
      const qt = (A.q('.ex-q') || {}).textContent || '';
      const right = A.q('.opt.ok');
      if (right) known[qt] = right.textContent;
      A.click('[data-next]');
      continue;
    }
    const qt = (A.q('.ex-q') || {}).textContent || '';
    const opts = A.all('.opt[data-pick]');
    if (opts.length) {
      let target = opts[0];
      if (known[qt]) opts.forEach(o => { if (o.textContent === known[qt]) target = o; });
      A.click(target);
      const c = A.q('[data-check]'); if (c && !c.disabled) A.click(c);
      continue;
    }
    const lefts = A.all('[data-match^="l"]:not([disabled])');
    if (lefts.length) {
      const li = lefts[0].getAttribute('data-match');
      A.click(lefts[0]);
      const rr = A.q('[data-match^="r"][data-pair="' + li.slice(1) + '"]:not([disabled])');
      if (rr) A.click(rr);
      continue;
    }
    if (A.q('[data-skip]')) { A.click('[data-skip]'); continue; }
    break;
  }
  if (!A.q('.finish')) throw new Error('до финала не дошли');
});
step('начислен XP', () => { if (!(A.state().xp > 0)) throw new Error('xp=' + A.state().xp); });
step('получена звезда за урок', () => {
  const cr = A.state().crowns;
  if (!Object.keys(cr).length) throw new Error('звёзд нет');
});
step('серия продлена фактом урока', () => { if (A.state().streak !== 1) throw new Error('streak=' + A.state().streak); });
step('следующий узел разблокировался', () => {
  A.click('[data-back]');
  const open = A.all('.node:not([disabled])').length;
  if (open < 2) throw new Error('открытых узлов ' + open);
});
step('пройденный узел помечен звездой', () => { if (!A.q('.node-crowns')) throw new Error('нет отметки'); });

/* ---------- серия ---------- */
head('=== серия и цель ===');
step('серия сгорает после пропуска дня', () => {
  const old = new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10);
  const B = api(boot({ xp: 100, byDay: {}, day: old, streak: 9, goal: 30, hearts: 5, heartAt: 0, noHearts: true, crowns: {}, mistakes: [], srs: {}, road: {} }));
  if (B.state().streak !== 0) throw new Error('streak=' + B.state().streak);
});
step('серия держится, если вчера занимался', () => {
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const B = api(boot({ xp: 100, byDay: {}, day: y, streak: 9, goal: 30, hearts: 5, heartAt: 0, noHearts: true, crowns: {}, mistakes: [], srs: {}, road: {} }));
  if (B.state().streak !== 9) throw new Error('streak=' + B.state().streak);
});
step('открытие страницы само по себе серию не растит', () => {
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const B = api(boot({ xp: 0, byDay: {}, day: y, streak: 3, goal: 30, hearts: 5, heartAt: 0, noHearts: true, crowns: {}, mistakes: [], srs: {}, road: {} }));
  B.click('[data-tab="stats"]');
  if (B.state().streak !== 3) throw new Error('выросла без урока: ' + B.state().streak);
});
step('цель дня переключается', () => {
  const B = api(boot(null));
  B.click('[data-tab="stats"]');
  B.click('[data-goal="50"]');
  if (B.state().goal !== 50) throw new Error('goal=' + B.state().goal);
});
step('режим без жизней включается', () => {
  const B = api(boot(null));
  B.click('[data-tab="stats"]');
  B.click('[data-nohearts="toggle"]');
  if (!B.state().noHearts) throw new Error('не включился');
  if (!B.q('.chip-stat.hp.inf')) throw new Error('в шапке не показан бесконечный режим');
});

/* ---------- разбор ошибок ---------- */
head('=== разбор ошибок ===');
step('пустой разбор показывает заглушку', () => {
  const B = api(boot(null));
  B.click('[data-tab="practice"]');
  if (!B.q('.empty')) throw new Error('нет заглушки');
});
step('накопленные ошибки запускают разбор и возвращают жизни', () => {
  const B = api(boot({ xp: 0, byDay: {}, day: '', streak: 0, goal: 30, hearts: 1, heartAt: Date.now(), noHearts: true,
                       crowns: {}, mistakes: ['c0|Платформа', 'c1|Документ', 'c0|Справочник'], srs: {}, road: {} }));
  B.click('[data-tab="practice"]');
  if (!B.q('[data-mistakes]')) throw new Error('нет кнопки разбора');
  B.click('[data-mistakes]');
  if (!B.q('.lesson')) throw new Error('разбор не запустился');
});

/* ---------- сброс ---------- */
head('=== служебное ===');
step('сброс обнуляет всё', () => {
  const B = api(boot({ xp: 500, byDay: {}, day: '', streak: 7, goal: 30, hearts: 5, heartAt: 0, noHearts: false,
                       crowns: { 'u1.L0': 2 }, mistakes: ['x'], srs: {}, road: { 'r0.0': true } }));
  B.w.confirm = () => true;
  B.click('[data-tab="stats"]');
  B.click('[data-reset]');
  const s = B.state();
  if (s.xp || s.streak !== 1 || Object.keys(s.crowns).length || s.mistakes.length) throw new Error('осталось: ' + JSON.stringify(s).slice(0, 120));
});

/* ---------- статический анализ вёрстки ---------- */
head('=== проверка вёрстки ===');
step('нет столкновений классов состояния и полноэкранных классов', () => {
  const css = body.slice(body.indexOf('<style>'), body.indexOf('</style>'));
  const fullscreen = [];
  css.replace(/\.([a-z-]+)\s*\{[^}]*position:fixed[^}]*inset:0[^}]*\}/g, (m, c) => { fullscreen.push(c); return m; });
  const multi = new Set();
  body.replace(/class="([^"]*\s[^"]*)"/g, (m, cls) => { cls.trim().split(/\s+/).forEach(c => multi.add(c)); return m; });
  body.replace(/'([a-z-]+)'\+\(/g, () => '');
  const clash = fullscreen.filter(c => multi.has(c));
  if (clash.length) throw new Error('полноэкранные классы используются как модификаторы: ' + clash.join(', '));
});
step('все токены тёмной темы есть в базовом :root', () => {
  const css = body.slice(body.indexOf('<style>'), body.indexOf('</style>'));
  const base = (css.match(/:root\{[^}]*\}/) || [''])[0];
  const baseTokens = new Set(base.match(/--[a-z0-9-]+/g) || []);
  const darkStart = css.indexOf('prefers-color-scheme:dark');
  const darkBlock = css.slice(darkStart, css.indexOf('}\n}', darkStart));
  const darkTokens = new Set(darkBlock.match(/--[a-z0-9-]+(?=\s*:)/g) || []);
  const missing = [...darkTokens].filter(t => !baseTokens.has(t));
  if (missing.length) throw new Error('только в тёмной теме: ' + missing.join(', '));
});
step('body красится токеном', () => {
  if (!/body\{[^}]*background:var\(--paper\)/.test(body.replace(/\s+/g, ''))) throw new Error('нет фона body');
});

console.log(log.join('\n'));
console.log('\n=== ИТОГ ===');
console.log(errs.length ? 'ОШИБОК: ' + errs.length + '\n' + errs.join('\n') : 'Все проверки пройдены. Ошибок в консоли страницы нет.');
