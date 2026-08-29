/* =====================================================================
   Проверка качества заданий: нет ли статистических подсказок, по которым
   можно угадывать, не зная предмета, и достаточно ли перемешаны темы.
   Запуск: node tests/quality.js
   ===================================================================== */
const fs = require('fs');
const path = require('path');

/* берём исходники напрямую: генератор не зависит от DOM */
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const src = ['src/data/terms.js', 'src/data/theory.js', 'src/data/exercises.js',
             'src/data/terms-extra.js', 'src/data/terms-slang.js',
             'src/app/units.js', 'src/app/build-exercises.js', 'src/app/engine.js']
            .map(R).join('\n');
const box = {};
new Function('out', src +
  '\nvar CARDS = TERMS.concat(TERMS2, TERMS3);' +
  '\nout.o = {buildCourse:buildCourse, makeLesson:makeLesson, CARDS:CARDS, QUIZ:QUIZ, PHRASES:PHRASES};')(box);
const { buildCourse, makeLesson, CARDS } = box.o;

const course = buildCourse();
const lessons = [];
course.forEach(sec => sec.lessons.forEach(l => lessons.push({ u: sec.u, l })));

/* прогон с пустой историей (новичок) и с наполненной (курс уже идёт) */
const srsFull = {};
CARDS.forEach((c, i) => { if (i % 2 === 0) srsFull['c0|' + c.t] = { b: 1 + (i % 4), d: Date.now() - 864e5 }; });

function collect(srs) {
  const all = [];
  lessons.forEach(({ u, l }) => {
    for (let a = 0; a < 3; a++) all.push({ id: l.id, kind: l.kind, ex: makeLesson(u, l, a + 'r1', { srs }) });
  });
  return all;
}

const runs = { 'новичок': collect({}), 'курс идёт': collect(srsFull) };
const problems = [];
const num = n => (Math.round(n * 10) / 10);

for (const [label, data] of Object.entries(runs)) {
  console.log('\n=== ' + label + ' ===');

  /* --- подсказки в вариантах --- */
  const kinds = {};
  data.forEach(L => L.ex.forEach(e => {
    if (e.type !== 'choose') return;
    const k = e.k[0];
    const b = kinds[k] || (kinds[k] = { n: 0, longest: 0, pos: [0, 0, 0, 0], lenOk: 0, lenSum: 0, disSum: 0, disN: 0 });
    b.n++;
    const lens = e.o.map(o => o.t.length);
    const max = Math.max(...lens);
    if (lens[e.a] === max && lens.filter(l => l === max).length === 1) b.longest++;
    b.pos[e.a]++;
    const others = lens.filter((_, i) => i !== e.a);
    const med = others.slice().sort((x, y) => x - y)[Math.floor(others.length / 2)];
    b.lenSum += lens[e.a]; b.disSum += others.reduce((s, x) => s + x, 0); b.disN += others.length;
    if (lens[e.a] <= med * 1.45 && lens[e.a] >= med * 0.6) b.lenOk++;
  }));

  console.log('тип | N | «самый длинный» | база | позиция верного 0/1/2/3 | длина верн/дистр');
  for (const [k, b] of Object.entries(kinds)) {
    const opts = b.pos.filter(x => x > 0).length >= 3 ? 4 : 3;
    const basePct = 100 / (k === 'p' ? 3 : 4);
    const longestPct = b.longest / b.n * 100;
    const pos = b.pos.map(x => Math.round(x / b.n * 100));
    console.log('  ' + k + ' | ' + String(b.n).padStart(4) + ' | ' + String(num(longestPct)).padStart(5) + '%' +
      ' | ' + num(basePct) + '% | ' + pos.join('/') +
      ' | ' + num(b.lenSum / b.n) + '/' + num(b.disSum / b.disN));
    /* перекос позиции: доля любой позиции не должна превышать 45% */
    const maxPos = Math.max(...b.pos) / b.n * 100;
    if (maxPos > 45) problems.push(label + ': тип ' + k + ' — верный ответ на одной позиции в ' + num(maxPos) + '% случаев');
    if (longestPct > basePct + 22) problems.push(label + ': тип ' + k + ' — «самый длинный» выигрывает в ' + num(longestPct) + '% при базе ' + num(basePct) + '%');
  }

  /* --- разнообразие тем и типов --- */
  let oneTopic = 0, runs3 = 0, dupTerm = 0, typesSum = 0, topicsSum = 0;
  data.forEach(L => {
    const gs = L.ex.map(e => e.g || '?');
    const uniq = new Set(gs);
    topicsSum += uniq.size;
    typesSum += new Set(L.ex.map(e => e.type + (e.code ? '-code' : ''))).size;
    if (uniq.size <= 1) oneTopic++;
    for (let i = 2; i < gs.length; i++) if (gs[i] === gs[i - 1] && gs[i] === gs[i - 2]) runs3++;
    /* у пар ключ содержит первый термин пары — это не повтор задания */
    const terms = L.ex.filter(e => e.type === 'choose').map(e => (e.k || '').split('|')[1]).filter(Boolean);
    if (new Set(terms).size !== terms.length) dupTerm++;
  });
  const n = data.length;
  console.log('  тем на урок: ' + num(topicsSum / n) + ' | типов заданий на урок: ' + num(typesSum / n) +
    ' | однотемных: ' + num(oneTopic / n * 100) + '%' +
    ' | троек подряд одной темы: ' + runs3 +
    ' | уроков с повтором термина: ' + num(dupTerm / n * 100) + '%');

  if (oneTopic / n > 0.25) problems.push(label + ': однотемных уроков ' + num(oneTopic / n * 100) + '%');
  if (runs3 > 0) problems.push(label + ': ' + runs3 + ' случаев трёх заданий одной темы подряд');
  if (typesSum / n < 2.5) problems.push(label + ': типов заданий на урок всего ' + num(typesSum / n));
  if (dupTerm / n > 0.15) problems.push(label + ': уроков с повтором термина внутри себя ' + num(dupTerm / n * 100) + '%');
}

/* --- повторяемость: два запуска одного урока не должны совпадать --- */
const a = makeLesson(lessons[0].u, lessons[0].l, '3r1', { srs: {} }).map(e => e.k).join(',');
const b = makeLesson(lessons[0].u, lessons[0].l, '3r2', { srs: {} }).map(e => e.k).join(',');
console.log('\nповторный запуск урока даёт другой набор: ' + (a !== b ? 'да' : 'НЕТ'));
if (a === b) problems.push('повторный запуск урока даёт дословно тот же набор');

console.log('\n=== ИТОГ ===');
if (problems.length) { console.log('ПРОБЛЕМ: ' + problems.length); problems.forEach(p => console.log('  · ' + p)); process.exitCode = 1; }
else console.log('Подсказок не найдено, темы и типы перемешаны.');
