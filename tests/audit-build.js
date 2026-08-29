/* Конструкторы: дистрактор обязан быть ЛИШНИМ элементом, а не тем же
   элементом в другой формулировке. Иначе задание проверяет память на
   текст блока, а не порядок действий. */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'build-exercises.js'), 'utf8');
const BUILD = new Function(src + '; return BUILD;')();

const norm = s => s.toLowerCase().replace(/[^а-яёa-z0-9]+/g, ' ').trim();
const words = s => new Set(norm(s).split(' ').filter(Boolean));
const overlap = (a, b) => {
  const A = words(a), B = words(b);
  const inter = [...A].filter(w => B.has(w)).length;
  return inter / Math.min(A.size, B.size);
};

let bad = 0, dupTok = 0;
BUILD.forEach((b, i) => {
  (b.extra || []).forEach(e => {
    b.tokens.forEach(t => {
      const o = overlap(e, t);
      if (o >= 0.7) {
        bad++;
        console.log('· [' + i + '] ' + b.task);
        console.log('    лишний блок: ' + e);
        console.log('    похож на настоящий: ' + t + '   (совпадение ' + Math.round(o * 100) + '%)');
      }
    });
  });
  const seen = {};
  b.tokens.forEach(t => { seen[t] = (seen[t] || 0) + 1; });
  const dups = Object.keys(seen).filter(k => seen[k] > 1);
  if (dups.length) {
    dupTok++;
    console.log('· [' + i + '] ' + b.task);
    console.log('    блок нужен несколько раз: ' + dups.map(d => d + ' ×' + seen[d]).join(', '));
  }
});
console.log('\nконструкторов: ' + BUILD.length);
console.log('с неотличимым лишним блоком: ' + bad);
console.log('где один блок нужен дважды: ' + dupTok);
