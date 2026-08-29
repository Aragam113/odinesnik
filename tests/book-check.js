/* =====================================================================
   ФАЗА ПРОВЕРКИ МАТЕРИАЛОВ
   Первоисточники (its.1c.ru, releases.1c.ru) закрыты подпиской, поэтому
   здесь сверка внутренняя: утверждения книжечек не должны расходиться
   с карточками и теорией, которые уже выверены, и должны покрывать
   темы своего раздела.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const D = path.join(R, 'src', 'data');
const A = path.join(R, 'src', 'app');

const src = ['terms.js', 'terms-extra.js', 'terms-slang.js', 'theory.js', 'book.js']
  .map(f => fs.readFileSync(path.join(D, f), 'utf8'))
  .concat([fs.readFileSync(path.join(A, 'units.js'), 'utf8')])
  .join('\n;\n');
const G = new Function(src + '; return {TERMS,TERMS2,TERMS3,ARCH,HOOD,BOOK,UNITS};')();
const CARDS = G.TERMS.concat(G.TERMS2, G.TERMS3);

let problems = 0;
const bad = m => { problems++; console.log('  ! ' + m); };
const strip = h => String(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- 1. полнота: у каждого раздела свои материалы ---------- */
console.log('=== ПОЛНОТА ===');
G.UNITS.forEach(u => {
  const b = G.BOOK[u.id];
  if (!b) return bad('раздел ' + u.id + ' «' + u.t + '» без материалов');
  if (!b.analogy || !b.analogy.html) bad(u.id + ': нет аналогии');
  if (!b.dia) bad(u.id + ': нет схемы');
  if (!b.check) bad(u.id + ': нет вопроса на понимание');
  if (!b.blocks || b.blocks.length < 2) bad(u.id + ': меньше двух пояснений');
});
console.log('  разделов: ' + G.UNITS.length + ', с материалами: ' + Object.keys(G.BOOK).length);

/* ---------- 2. схемы: связность и попадание в холст ---------- */
console.log('\n=== СХЕМЫ ===');
let nodes = 0, links = 0;
Object.keys(G.BOOK).forEach(id => {
  const d = G.BOOK[id].dia; if (!d) return;
  const ids = {};
  d.nodes.forEach(n => {
    nodes++;
    if (ids[n.id]) bad(id + ': повторяющийся узел ' + n.id);
    ids[n.id] = 1;
    if (n.x < 0 || n.y < 0 || n.x + n.w > d.w || n.y + n.h > d.h)
      bad(id + ': узел ' + n.id + ' выходит за холст ' + d.w + '×' + d.h);
    if (!d.say[n.id]) bad(id + ': у узла ' + n.id + ' нет пояснения');
  });
  Object.keys(d.say).forEach(k => { if (!ids[k]) bad(id + ': пояснение к несуществующему узлу ' + k); });
  (d.links || []).forEach(l => {
    links++;
    if (!ids[l.a] || !ids[l.b]) bad(id + ': стрелка ' + l.a + '→' + l.b + ' ведёт в никуда');
  });
  /* каждый узел должен быть хоть с чем-то связан, иначе схема разваливается */
  const touched = {};
  (d.links || []).forEach(l => { touched[l.a] = 1; touched[l.b] = 1; });
  d.nodes.forEach(n => { if (!touched[n.id]) bad(id + ': узел ' + n.id + ' ни с чем не связан'); });
  /* пересечение прямоугольников — блоки не должны наезжать друг на друга */
  for (let i = 0; i < d.nodes.length; i++) for (let j = i + 1; j < d.nodes.length; j++) {
    const a = d.nodes[i], b = d.nodes[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
      bad(id + ': блоки ' + a.id + ' и ' + b.id + ' накладываются');
  }
});
console.log('  узлов: ' + nodes + ', стрелок: ' + links);

/* ---------- 3. вопросы: верный ответ должен быть один и осмысленный ---------- */
console.log('\n=== ВОПРОСЫ НА ПОНИМАНИЕ ===');
Object.keys(G.BOOK).forEach(id => {
  const c = G.BOOK[id].check; if (!c) return;
  if (c.o.length < 3) bad(id + ': меньше трёх вариантов');
  if (c.a < 0 || c.a >= c.o.length) bad(id + ': индекс верного ответа вне списка');
  if (new Set(c.o).size !== c.o.length) bad(id + ': повторяющиеся варианты');
  /* верный ответ не должен быть заметно длиннее прочих — это подсказка */
  const right = c.o[c.a].length;
  const others = c.o.filter((_, i) => i !== c.a).map(s => s.length);
  const maxOther = Math.max.apply(null, others);
  if (right > maxOther * 1.6)
    bad(id + ': верный ответ длиннее самого длинного неверного в ' +
        (right / maxOther).toFixed(1) + ' раза — решается по длине');
  if (!c.w || strip(c.w).length < 60) bad(id + ': разбор слишком короткий');
});

/* ---------- 4. ссылки в справочник ведут в существующие разделы ---------- */
console.log('\n=== ССЫЛКИ В СПРАВОЧНИК ===');
const refIds = {};
G.ARCH.concat(G.HOOD).forEach(x => { refIds[x.id] = 1; });
Object.keys(G.BOOK).forEach(id => {
  (G.BOOK[id].see || []).forEach(r => { if (!refIds[r]) bad(id + ': ссылка на несуществующий раздел ' + r); });
});

/* ---------- 5. сверка с карточками: нет ли расхождений в терминах ---------- */
console.log('\n=== СВЕРКА С КАРТОЧКАМИ ===');
/* утверждения, которые заявлены и в книжечке, и в карточке: смотрим,
   не противоречат ли они друг другу по ключевым словам-маркерам */
const CLAIMS = [
  {term:'Тонкий клиент',  must:/не работает с базой напрямую|через сервер/i,
   book:/(с базой напрямую|обратиться к базе отсюда нельзя)/i},
  {term:'Управляемые блокировки', must:/БлокировкаДанных/i, book:/БлокировкаДанных/i},
  {term:'Виртуальная таблица', must:/физически (нет|не существует)/i, book:/не существуют физически|таблицы нет/i},
  {term:'Расширение конфигурации', must:/не снимая (её )?с поддержки/i, book:/не снимая|остаётся на поддержке/i},
  {term:'Модуль объекта', must:/при любой записи|из обмена/i, book:/при любой записи/i}
];
CLAIMS.forEach(c => {
  const card = CARDS.filter(x => x.t === c.term)[0];
  if (!card) return bad('нет карточки «' + c.term + '» для сверки');
  const cardText = card.d + ' ' + (card.fact || '') + ' ' + (card.live || '');
  if (!c.must.test(cardText)) bad('карточка «' + c.term + '» больше не содержит опорного утверждения');
  const all = Object.keys(G.BOOK).map(id => {
    const b = G.BOOK[id];
    return strip(b.analogy.html) + ' ' + (b.dia ? Object.keys(b.dia.say).map(k => strip(b.dia.say[k])).join(' ') : '') +
           ' ' + (b.blocks || []).map(x => strip(x.html)).join(' ');
  }).join(' ');
  if (!c.book.test(all)) bad('материалы не повторяют утверждение про «' + c.term + '» — расхождение с карточкой');
});

/* ---------- 6. темы раздела покрыты материалами ---------- */
console.log('\n=== ПОКРЫТИЕ ТЕМ РАЗДЕЛА ===');
G.UNITS.forEach(u => {
  const b = G.BOOK[u.id]; if (!b || !u.groups.length) return;
  const text = (strip(b.analogy.html) + ' ' + (b.dia ? b.dia.t + ' ' + Object.keys(b.dia.say).map(k => strip(b.dia.say[k])).join(' ') : '') +
                ' ' + (b.blocks || []).map(x => x.t + ' ' + strip(x.html)).join(' ')).toLowerCase();
  const grpCards = CARDS.filter(c => u.groups.indexOf(c.g) >= 0);
  const hit = grpCards.filter(c => text.indexOf(c.t.toLowerCase()) >= 0).length;
  const pct = Math.round(hit / grpCards.length * 100);
  console.log('  ' + u.id + ' ' + u.t + ': упомянуто ' + hit + ' из ' + grpCards.length + ' терминов группы (' + pct + '%)');
  if (pct < 10) bad(u.id + ': материалы почти не пересекаются с карточками раздела');
});

console.log('\n=== ИТОГ ===');
console.log(problems ? 'ЗАМЕЧАНИЙ: ' + problems : 'Замечаний нет.');
process.exit(problems ? 1 : 0);
