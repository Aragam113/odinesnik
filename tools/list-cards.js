/* Показывает карточки по группам и отмечает, у каких уже есть fact. */
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, '..', 'src', 'data');
function loadAll(files, names) {
  const src = files.map(f => fs.readFileSync(path.join(D, f), 'utf8')).join('\n;\n');
  return new Function(src + '; return {' + names.map(n => n + ':' + n).join(',') + '};')();
}
const G = loadAll(['terms.js', 'terms-extra.js', 'terms-slang.js'], ['TERMS', 'TERMS2', 'TERMS3']);
const CARDS = G.TERMS.concat(G.TERMS2, G.TERMS3);
const by = {};
CARDS.forEach(c => { (by[c.g] = by[c.g] || []).push(c); });
Object.keys(by).sort().forEach(g => {
  const withFact = by[g].filter(c => c.fact).length;
  console.log('\n[' + g + '] всего ' + by[g].length + ', с фактом ' + withFact +
    (withFact >= 4 ? '  — вариант «что верно» работает' : '  — фактов мало, вариант не включится'));
  by[g].forEach(c => console.log('   ' + (c.fact ? '+' : ' ') + ' ' + c.t));
});
console.log('\nвсего карточек: ' + CARDS.length + ', с фактом: ' + CARDS.filter(c => c.fact).length);
