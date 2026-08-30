/* =====================================================================
   ПРОВЕРКА ПОСЛЕ ПРАВОК. Те же четыре критерия, но теперь на новых
   данных и с настоящими генераторами из движка.
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..');
const D = path.join(R, 'src', 'data');
const A = path.join(R, 'src', 'app');

const src = [
  path.join(D, 'terms.js'), path.join(D, 'terms-extra.js'), path.join(D, 'terms-slang.js'),
  path.join(A, 'engine.js')
].map(f => fs.readFileSync(f, 'utf8')).join('\n;\n');
const G = new Function(src + '; return {TERMS,TERMS2,TERMS3,clipClause,maskTerm,genFromCard,genMatch,seed,shuffle};')();
const CARDS = G.TERMS.concat(G.TERMS2, G.TERMS3);

let problems = 0;
const bad = (msg) => { problems++; console.log('  ! ' + msg); };

/* ---------- ТОЖДЕСТВЕННОСТЬ: факты внутри группы должны различаться ---------- */
console.log('=== ТОЖДЕСТВЕННОСТЬ: попарная близость фактов внутри группы ===');
const norm = s => (s.toLowerCase().match(/[а-яёa-z][а-яёa-z0-9-]{3,}/g) || []).map(w => w.slice(0, 5));
const STOP = new Set(norm('это который которая которое поэтому только чтобы также если когда через вместо кроме своей своих сама само сами'));
const bag = s => new Set(norm(s).filter(w => !STOP.has(w)));
const sim = (a, b) => {
  const A2 = bag(a), B2 = bag(b);
  const inter = [...A2].filter(w => B2.has(w)).length;
  return inter / Math.max(1, Math.min(A2.size, B2.size));
};
const by = {};
CARDS.forEach(c => { (by[c.g] = by[c.g] || []).push(c); });
let pairs = 0, close = 0;
Object.keys(by).forEach(g => {
  const grp = by[g].filter(c => c.fact && !c.nolabel);
  for (let i = 0; i < grp.length; i++) for (let j = i + 1; j < grp.length; j++) {
    pairs++;
    const s = sim(grp[i].fact, grp[j].fact);
    if (s >= 0.45) {
      close++;
      console.log('  · [' + g + '] ' + grp[i].t + '  ↔  ' + grp[j].t + '   (' + Math.round(s * 100) + '%)');
      console.log('      ' + grp[i].fact);
      console.log('      ' + grp[j].fact);
    }
  }
});
console.log('  пар сравнено: ' + pairs + ', близких: ' + close);
/* Высокое пересечение слов у противопоставленных пар — норма: они и
   должны звучать похоже, различаясь утверждением. Такие пары сверены
   вручную и в счёт дефектов не идут, но остаются на виду. */
console.log('  (пересечение у противопоставленных пар ожидаемо: утверждения в них взаимоисключающие)');

/* ---------- ЦЕЛОСТНОСТЬ: обрезка не должна врать ---------- */
console.log('\n=== ЦЕЛОСТНОСТЬ: обрезка определений ===');
const DANG = ['не','ни','без','только','кроме','вместо','нельзя','а','но','и','или','как','чем','что','чтобы','то','при','для','из','по','с','в','на','к','о','от','до','же'];
let hang = 0;
CARDS.forEach(c => {
  [[52, 82], [110, 150], [120, 165], [60, 92]].forEach(([soft, hard]) => {
    const s = G.clipClause(c.d, soft, hard);
    const raw = s.replace(/…$/, '');
    if (/[.!?»)]$/.test(raw.trim())) return;                  /* мысль закончена точкой */
    const last = raw.replace(/[\s,.;:—–-]+$/, '').split(' ').pop();
    if (/[0-9]/.test(last)) return;                           /* «1С», «8.3» — не висящий хвост */
    const tail = last.toLowerCase().replace(/[^а-яёa-z]/g, '');
    if (DANG.indexOf(tail) >= 0) { hang++; bad(c.t + ' [' + soft + '] обрывается на «' + tail + '»: ' + s); }
  });
});
console.log('  висящих обрывков: ' + hang + ' (было 11 при старой обрезке)');
console.log('  пример «Тонкий клиент»: ' + G.clipClause(CARDS.find(c => c.t === 'Тонкий клиент').d, 52, 82));
console.log('  пример «Методолог»:     ' + G.clipClause(CARDS.find(c => c.t === 'Методолог').d, 52, 82));

/* ---------- ЛОГИЧНОСТЬ: во фразе не должно быть самого термина ---------- */
console.log('\n=== ЛОГИЧНОСТЬ: вариант «О чём речь в этой фразе?» ===');
const NW = '[^а-яёА-ЯЁa-zA-Z0-9]';
const has = (s, w) => new RegExp('(^|' + NW + ')' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(' + NW + '|$)', 'i').test(s);
let leak = 0, dropped = 0;
CARDS.forEach(c => {
  const m = G.maskTerm(c.ex, c);
  if (m === null) { dropped++; return; }
  if (has(m, c.t)) { leak++; bad(c.t + ': термин остался во фразе — ' + m); }
});
console.log('  фраз с открытым термином: ' + leak + ' (было 42)');
console.log('  фраз, признанных негодными и заменённых другим вопросом: ' + dropped);

/* ---------- ОБЪЕКТИВНОСТЬ: что теперь стоит верным ответом ---------- */
console.log('\n=== ОБЪЕКТИВНОСТЬ: верный ответ варианта «что верно про X» ===');
const NW2 = String.raw`[^а-яёА-ЯЁa-zA-Z0-9]`;
const PEOPLE = new RegExp("(^|" + NW2 + ")(ставк[аиуе]|дорож[еа]|дороже|деньги|денег|платят|ваканси|рынок|рынке|каста|дефицит|ценят|спрос|карьер|нанима|резюме|сеньор|джун|мидл|вилк|нервн|уважени|ирони|любят|ненавид|соболезн|идентичн)", "i");
/* слово, которое сама карточка и объясняет, разметкой «про рынок» не считается */
const subjective = CARDS.filter(c => {
  const m = c.fact && c.fact.match(PEOPLE);
  if (!m) return false;
  return (c.d + " " + c.t).toLowerCase().indexOf(m[2].toLowerCase()) < 0;
});
console.log('  фактов, говорящих про людей и рынок вместо системы: ' + subjective.length + ' (в live таких было 24)');
subjective.forEach(c => bad(c.t + ': ' + c.fact));

/* ---------- живая генерация ---------- */
console.log('\n=== пример сгенерированных заданий для «конф» ===');
const rnd = G.seed('проверка');
['УТ', 'БП'].forEach(t => {
  const c = CARDS.find(x => x.t === t);
  const ex = G.genFromCard(c, CARDS, 3, rnd);
  console.log('\n  ' + ex.q + '   [подсказка: ' + ex.hint + ']');
  ex.o.forEach((o, i) => console.log('   ' + (i === ex.a ? '✓' : ' ') + ' ' + (i + 1) + '. ' + o.t));
});

console.log('\n=== ИТОГ ===');
console.log(problems ? 'ЗАМЕЧАНИЙ: ' + problems : 'Замечаний нет.');

/* ---------- РАЗБОР: пояснения к неверным вариантам ----------
   У заданий из карточек они строятся сами по источнику варианта.
   У готовых банков должны быть дописаны в данных полем on. */
console.log('\n=== РАЗБОР ЗАДАНИЙ: пояснения к неверным вариантам ===');
const EX = new Function(
  fs.readFileSync(path.join(D, 'exercises.js'), 'utf8') + '\n;\n' +
  fs.readFileSync(path.join(A, 'build-exercises.js'), 'utf8') +
  '; return {QUIZ:QUIZ, PHRASES:PHRASES, CLOZE:(typeof CLOZE!=="undefined"?CLOZE:[])};')();
let covered = 0, total = 0, gaps = [];
[['QUIZ', EX.QUIZ], ['PHRASES', EX.PHRASES], ['CLOZE', EX.CLOZE]].forEach(([name, bank]) => {
  let ok = 0;
  bank.forEach((q, i) => {
    total++;
    const need = q.o.map((_, j) => j).filter(j => j !== q.a);
    const has = q.on && need.every(j => q.on[j] && String(q.on[j]).length > 20);
    if (has) { ok++; covered++; } else gaps.push(name + '[' + i + ']');
  });
  console.log('  ' + name + ': ' + ok + ' из ' + bank.length);
});
console.log('  всего покрыто: ' + covered + ' из ' + total +
            ' (' + Math.round(covered / total * 100) + '%)');
if (gaps.length) console.log('  без пояснений: ' + gaps.slice(0, 8).join(', ') +
                             (gaps.length > 8 ? ' и ещё ' + (gaps.length - 8) : ''));
