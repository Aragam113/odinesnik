/* =====================================================================
   ПРОВЕРКА РАЗБОРОВ В МОДУЛЕ «СОБЕСЕДОВАНИЕ»
   Те же четыре критерия, приложенные к эталонным ответам:

   логичность      — ответ отвечает на заданный вопрос, а не рядом
   объективность   — у технического вопроса ответ проверяемый; у вопроса
                     про опыт разбор не выдумывает фактов о человеке
   целостность     — ответ самодостаточен и закончен
   тождественность — ответ конкретен: два разных вопроса не могут иметь
                     почти один и тот же ответ, иначе это вода
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'data', 'interview-bank.js');
const B = new Function(fs.readFileSync(p, 'utf8') + '; return IVBANK;')();

let problems = 0;
const bad = m => { problems++; console.log('  ! ' + m); };
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const cut = s => s.length > 70 ? s.slice(0, 70) + '…' : s;

const STOP = new Set(('что,как,для,чего,чем,это,при,где,какие,какой,какая,какое,есть,быть,надо,нужно,можно,также,если,когда,чтобы,этом,этой,этого,того,тому,так,там,его,ими,или,над,под,про,без,всё,все,она,оно,они,был,была,было,были,бывает,бывают,между,после,перед,через,своих,своей,своего,расскажите,расскажи,объясните,объясни,назовите,назови,приходилось,доводилось,работали,использовали').split(','));
const words = s => (String(s).toLowerCase().match(/[а-яёa-z][а-яёa-z0-9-]{2,}/g) || [])
  .filter(w => !STOP.has(w))
  .map(w => w.length > 5 ? w.slice(0, 5) : w);
const bag = s => new Set(words(s));

const withA = B.filter(q => q.a);
console.log('вопросов в банке: ' + B.length + ', с разбором: ' + withA.length +
            ' (' + Math.round(withA.length / B.length * 100) + '%)');
if (!withA.length) { console.log('\nразборов пока нет — проверять нечего'); process.exit(0); }

/* ---------- ЛОГИЧНОСТЬ ----------
   У технического вопроса ответ обязан говорить о том же предмете —
   меряем пересечение опорных слов.
   У вопроса про опыт разбор мета по устройству: он объясняет, что
   проверяет интервьюер, и повторять слова вопроса не должен. Для него
   критерий другой — разбор обязан назвать, что именно проверяют, и
   дать опору для ответа, а не общие ободрения. */
console.log('\n=== ЛОГИЧНОСТЬ: разбор отвечает на свой вопрос ===');
const PROBE = /(проверя|выясня|смотр[ия]|ждут|интересует|хотят понять|вопрос про)/i;
let weak = 0, weakHr = 0;
withA.forEach(q => {
  const txt = strip(q.a);
  if (q.t === 'hr') {
    if (!PROBE.test(txt)) {
      weakHr++;
      bad('разбор про опыт не говорит, что проверяют: ' + cut(q.q));
    }
    if (!q.k || q.k.length < 2) {
      weakHr++;
      bad('разбор про опыт без опор для ответа: ' + cut(q.q));
    }
    return;
  }
  const qb = bag(q.q);
  const ab = bag(txt + ' ' + (q.k || []).map(strip).join(' '));
  const shared = [...qb].filter(w => ab.has(w)).length;
  const need = qb.size <= 3 ? 1 : 2;
  if (shared < need) {
    weak++;
    bad('технический ответ не пересекается с вопросом: ' + cut(q.q) + '  →  ' + cut(txt));
  }
});
console.log('  технических разборов мимо вопроса: ' + weak);
console.log('  разборов про опыт без разбора сути: ' + weakHr);

/* ---------- ОБЪЕКТИВНОСТЬ ---------- */
console.log('\n=== ОБЪЕКТИВНОСТЬ ===');
const NW = '[^а-яёА-ЯЁa-zA-Z0-9]';
const MARKET = new RegExp('(^|' + NW + ')(ставк[аиуе]|дорож[еа]|деньги|денег|зарплат[аыуе]|платят|ваканси|рынок|рынке|каста|дефицит|ценят|спрос|вилк|сеньор|мидл)', 'i');
/* разбор HR-вопроса не должен утверждать факты о человеке */
const INVENT = /(вы|ты)\s+(работал|делал|внедрял|занимал|провел|провёл|имеет|имеешь)/i;
let subj = 0, invent = 0;
withA.forEach(q => {
  const txt = strip(q.a);
  if (q.t !== 'hr' && MARKET.test(txt)) {
    subj++; bad('технический ответ говорит про рынок: ' + cut(q.q) + '  →  ' + cut(txt));
  }
  if (q.t === 'hr' && INVENT.test(txt)) {
    invent++; bad('разбор приписывает человеку опыт: ' + cut(q.q) + '  →  ' + cut(txt));
  }
});
console.log('  технических ответов про рынок: ' + subj);
console.log('  разборов, выдумывающих опыт: ' + invent);
console.log('  вопросов, помеченных как «про опыт»: ' + B.filter(q => q.t === 'hr').length);

/* ---------- ЦЕЛОСТНОСТЬ ---------- */
console.log('\n=== ЦЕЛОСТНОСТЬ ===');
const DANG = ['не','ни','без','только','кроме','вместо','а','но','и','или','как','чем','что','чтобы','то','при','для','из','по','с','в','на','к','о','от','до','же'];
let broken = 0;
withA.forEach(q => {
  const txt = strip(q.a);
  if (txt.length < 60) { broken++; bad('слишком короткий разбор (' + txt.length + '): ' + cut(q.q)); return; }
  if (txt.length > 700) { broken++; bad('разбор длиннее 700 знаков: ' + cut(q.q)); return; }
  if (!/[.!?»]$/.test(txt)) { broken++; bad('разбор не закончен точкой: ' + cut(txt)); return; }
  const last = txt.replace(/[.!?»\s]+$/, '').split(' ').pop().toLowerCase().replace(/[^а-яёa-z]/g, '');
  if (DANG.indexOf(last) >= 0) { broken++; bad('разбор обрывается на «' + last + '»: ' + cut(q.q)); }
  (q.k || []).forEach(k => {
    const kt = strip(k);
    if (kt.length < 12) { broken++; bad('пункт самопроверки слишком короткий: «' + kt + '» у ' + cut(q.q)); }
  });
});
console.log('  повреждённых разборов: ' + broken);

/* ---------- ТОЖДЕСТВЕННОСТЬ ---------- */
console.log('\n=== ТОЖДЕСТВЕННОСТЬ: ответ конкретен, а не общий ===');
const abags = withA.map(q => bag(strip(q.a)));
let dup = 0;
for (let i = 0; i < withA.length; i++) {
  for (let j = i + 1; j < withA.length; j++) {
    const A = abags[i], C = abags[j];
    if (A.size < 4 || C.size < 4) continue;
    const inter = [...A].filter(w => C.has(w)).length;
    const s = inter / Math.min(A.size, C.size);
    if (s >= 0.8) {
      /* близкие ответы допустимы только у близких вопросов */
      const qs = [...bag(withA[i].q)].filter(w => bag(withA[j].q).has(w)).length /
                 Math.max(1, Math.min(bag(withA[i].q).size, bag(withA[j].q).size));
      if (qs < 0.5) {
        dup++;
        bad('почти один ответ на разные вопросы (' + Math.round(s * 100) + '%):\n      ' +
            cut(withA[i].q) + '\n      ' + cut(withA[j].q));
      }
    }
  }
}
console.log('  подозрительно одинаковых ответов: ' + dup);

console.log('\n=== ИТОГ ===');
console.log(problems ? 'ЗАМЕЧАНИЙ: ' + problems : 'Замечаний нет.');
process.exit(problems ? 1 : 0);
