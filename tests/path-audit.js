/* =====================================================================
   АУДИТ ПУТИ
   Ищем то, что удлиняет дорогу, не добавляя знания:
     — задания, решаемые подбором слова, без понимания;
     — повторы одной карточки по всему пути;
     — уроки, где нечему учиться.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const files = [
  'src/data/terms.js', 'src/data/theory.js', 'src/data/exercises.js',
  'src/data/terms-extra.js', 'src/data/terms-slang.js', 'src/data/interview-bank.js',
  'src/data/book.js', 'src/data/query-lab.js',
  'src/app/units.js', 'src/app/build-exercises.js', 'src/app/engine.js'
].map(f => fs.readFileSync(path.join(R, f), 'utf8')).join('\n;\n');

const G = new Function(files +
  '; var CARDS = TERMS.concat(TERMS2, TERMS3);' +
  ' return {CARDS:CARDS, UNITS:UNITS, buildCourse:buildCourse, makeLesson:makeLesson, seed:seed};')();

const COURSE = G.buildCourse();
let lessons = 0, slots = 0;
const perUnit = [];
COURSE.forEach(sec => {
  let n = 0, ex = 0;
  sec.lessons.forEach(l => {
    lessons++; n++;
    const q = G.makeLesson(sec.u, l, 0, {srs: {}, mistakes: []});
    slots += q.length; ex += q.length;
  });
  perUnit.push({ u: sec.u.t, lessons: n, ex: ex });
});

console.log('=== РАЗМЕР ПУТИ ===');
perUnit.forEach(p => console.log('  ' + p.u.padEnd(22) + ' уроков ' + String(p.lessons).padStart(2) +
                                 ', заданий ' + String(p.ex).padStart(3)));
console.log('  ИТОГО: уроков ' + lessons + ', заданий за один проход ' + slots +
            ', карточек ' + G.CARDS.length);
console.log('  при трёх звёздах за урок это ' + (lessons * 3) + ' подходов');

/* ---------- сколько раз встречается одна карточка ---------- */
const hits = {};
COURSE.forEach(sec => sec.lessons.forEach(l => {
  G.makeLesson(sec.u, l, 0, {srs: {}, mistakes: []}).forEach(e => {
    const m = /^c[0-3]\|(.+)$/.exec(e.k);
    if (m) hits[m[1]] = (hits[m[1]] || 0) + 1;
  });
}));
const counts = Object.keys(hits).map(k => hits[k]);
const avg = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
console.log('\n=== ПОВТОРЫ КАРТОЧКИ ЗА ОДИН ПРОХОД ===');
console.log('  среднее ' + avg.toFixed(2) + ', максимум ' + Math.max(...counts));
const often = Object.keys(hits).filter(k => hits[k] >= 4).sort((a, b) => hits[b] - hits[a]);
console.log('  четыре и больше раз: ' + often.length + (often.length ? ' — ' + often.slice(0, 10).join(', ') : ''));

/* ---------- задания, решаемые подбором слова ----------
   Если в вопросе или подсказке есть заметное слово, которое встречается
   только в верном варианте, отвечать можно не понимая. */
const STOP = new Set(('это,что,как,для,при,над,под,или,его,она,они,был,были,есть,быть,надо,нужно,можно,также,если,когда,чтобы,этом,этой,этого,того,тому,так,там,всё,все,два,две,три,один,одна,одно').split(','));
const words = s => [...new Set((String(s).toLowerCase().match(/[а-яёa-z][а-яёa-z0-9-]{4,}/g) || []))]
  .filter(w => !STOP.has(w));

let easy = 0, total = 0;
const easyByVariant = {};
const sample = [];
COURSE.forEach(sec => sec.lessons.forEach(l => {
  G.makeLesson(sec.u, l, 0, {srs: {}, mistakes: []}).forEach(e => {
    if (e.type !== 'choose') return;
    total++;
    const stem = words(e.q + ' ' + (e.hint || ''));
    const right = new Set(words(e.o[e.a].t));
    const wrongAll = new Set();
    e.o.forEach((o, i) => { if (i !== e.a) words(o.t).forEach(w => wrongAll.add(w)); });
    /* слово из вопроса, которое есть только в верном ответе */
    const giveaway = stem.filter(w => right.has(w) && !wrongAll.has(w));
    if (giveaway.length) {
      easy++;
      const v = (e.k.match(/^([a-z]\d?)\|/) || [])[1] || '?';
      easyByVariant[v] = (easyByVariant[v] || 0) + 1;
      if (sample.length < 12) sample.push({ q: e.q, hint: e.hint, right: e.o[e.a].t, w: giveaway.slice(0, 3) });
    }
  });
}));
console.log('\n=== РЕШАЕТСЯ ПОДБОРОМ СЛОВА ===');
console.log('  ' + easy + ' из ' + total + ' заданий с выбором (' + Math.round(easy / total * 100) + '%)');
console.log('  по видам вопроса: ' + JSON.stringify(easyByVariant));
console.log('  примеры:');
sample.forEach(s => {
  console.log('    · ' + s.q.slice(0, 62) + (s.hint ? '  [' + String(s.hint).slice(0, 40) + ']' : ''));
  console.log('      верный: ' + s.right.slice(0, 70));
  console.log('      выдаёт слово: ' + s.w.join(', '));
});

/* ---------- дословные повторы одного и того же вопроса ---------- */
const keyHits = {};
COURSE.forEach(sec => sec.lessons.forEach(l => {
  G.makeLesson(sec.u, l, 0, { srs: {}, mistakes: [] }).forEach(e => {
    keyHits[e.k] = (keyHits[e.k] || 0) + 1;
  });
}));
const keys = Object.keys(keyHits);
const dup = keys.filter(k => keyHits[k] > 1).sort((a, b) => keyHits[b] - keyHits[a]);
const dupSlots = dup.reduce((a, k) => a + keyHits[k] - 1, 0);
console.log('\n=== ОДИН И ТОТ ЖЕ ВОПРОС ДВАЖДЫ ===');
console.log('  различных вопросов: ' + keys.length);
console.log('  повторяются: ' + dup.length + ', лишних показов: ' + dupSlots +
            ' (' + Math.round(dupSlots / slots * 100) + '% пути)');
console.log('  чаще всего: ' + dup.slice(0, 8).map(k => k + '×' + keyHits[k]).join(', '));
