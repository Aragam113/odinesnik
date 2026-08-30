/* Сколько в банке РАЗНЫХ вопросов: собеседования повторяются, и один
   эталонный ответ может закрывать целую группу похожих формулировок. */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'data', 'interview-bank.js');
const B = new Function(fs.readFileSync(p, 'utf8') + '; return IVBANK;')();

const STOP = new Set(('что,как,для,чего,чем,это,при,где,какие,какой,какая,какое,есть,быть,надо,нужно,можно,ли,вы,ты,из,по,на,в,с,и,а,но,или,не,ни,до,от,за,об,о,к,у,же,бы,вот,там,тут,том,тем,так,вам,вас,мне,меня,себя,свой,своя,своё,свои,расскажи,расскажите,объясни,объясните,знаете,знаешь,работали,приходилось,доводилось,использовали,делали,назови,назовите,перечисли,перечислите,опиши,опишите').split(','));
const norm = s => (s.toLowerCase().match(/[а-яёa-z0-9][а-яёa-z0-9-]*/g) || [])
  .filter(w => w.length > 2 && !STOP.has(w))
  .map(w => w.length > 5 ? w.slice(0, 5) : w);

const bags = B.map(q => new Set(norm(q.q)));
const sim = (a, b) => {
  const inter = [...a].filter(w => b.has(w)).length;
  return inter / Math.max(1, Math.min(a.size, b.size));
};

/* кластеризация «в лоб»: 714 элементов — 255 тысяч сравнений, это мгновенно */
const cluster = new Array(B.length).fill(-1);
let cn = 0;
const clusters = [];
for (let i = 0; i < B.length; i++) {
  if (cluster[i] >= 0) continue;
  const members = [i];
  cluster[i] = cn;
  for (let j = i + 1; j < B.length; j++) {
    if (cluster[j] >= 0) continue;
    if (bags[i].size < 2 || bags[j].size < 2) continue;
    if (sim(bags[i], bags[j]) >= 0.72) { cluster[j] = cn; members.push(j); }
  }
  clusters.push(members);
  cn++;
}

const multi = clusters.filter(c => c.length > 1).sort((a, b) => b.length - a.length);
console.log('вопросов в банке: ' + B.length);
console.log('групп после склейки похожих: ' + clusters.length);
console.log('групп с повторами: ' + multi.length +
            ', в них вопросов: ' + multi.reduce((s, c) => s + c.length, 0));
console.log('\nсамые крупные группы:');
multi.slice(0, 14).forEach(c => {
  console.log('  [' + c.length + '] ' + B[c[0]].q);
  c.slice(1, 3).forEach(i => console.log('        ≈ ' + B[i].q));
});

console.log('\nбез связанных карточек: ' + B.filter(q => !q.see || !q.see.length).length);
console.log('\nпримеры вопросов без карточек:');
B.filter(q => !q.see || !q.see.length).slice(0, 12).forEach(q =>
  console.log('  [' + q.s + '/' + q.g + '] ' + q.q));

/* распределение длины — очень короткие вопросы часто вырваны из контекста */
const short = B.filter(q => q.q.length < 25);
console.log('\nподозрительно коротких (<25 знаков): ' + short.length);
short.slice(0, 10).forEach(q => console.log('  · ' + q.q));
