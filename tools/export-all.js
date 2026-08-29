/* Экспорт SVG для правки в Figma.
   Источник — собранный модуль персонажей, поэтому файлы всегда совпадают
   с тем, что показывает тренажёр. Каждый файл самостоятельный: нужные
   группы из общего defs вкладываются внутрь. */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, '..', 'mascots');
const modFile = path.join(__dirname, '..', 'src', 'app', 'mascots-traced.js');
const code = fs.readFileSync(modFile, 'utf8');
const box = {};
new Function('out', code + '\nout.M = MASCOT; out.DEFS = MDEFS; out.DATA = MDATA;')(box);
const { M, DEFS, DATA } = box;

/* вырезаем из общего defs только те группы, на которые ссылается кусок разметки */
function groupById(id) {
  const at = DEFS.indexOf('<g id="' + id + '">');
  if (at < 0) return '';
  let i = at, depth = 0;
  const re = /<\/?g\b[^>]*>/g;
  re.lastIndex = at;
  let m;
  while ((m = re.exec(DEFS))) {
    if (m[0][1] !== '/') depth++; else depth--;
    if (depth === 0) return DEFS.slice(at, m.index + m[0].length);
  }
  return '';
}
function standalone(markup, viewBox, title) {
  const ids = [...new Set([...markup.matchAll(/href="#([^"]+)"/g)].map(m => m[1]))];
  const defs = ids.map(groupById).join('');
  const [, , w, h] = viewBox.split(/[\s,]+/);
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    'viewBox="' + viewBox + '" width="' + w + '" height="' + h + '">' +
    '<title>' + title + '</title>' +
    (defs ? '<defs>' + defs + '</defs>' : '') + markup + '</svg>';
}
function write(p, body) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body, 'utf8');
}

const MOODS = ['idle', 'blink', 'happy', 'cheer', 'sad', 'think', 'wow', 'neutral'];
const PARTS = {
  eyes:  ['open', 'blink', 'happy', 'sad', 'wide', 'squint'],
  brows: ['neutral', 'up', 'down', 'worried'],
  mouth: ['smile', 'big', 'open', 'flat', 'frown', 'o']
};

let n = 0;
for (const name of M.names) {
  const D = DATA[name];
  const vb = D.vb.full;
  const dir = path.join(ROOT, name);

  for (const mood of MOODS) {
    const svg = M.render(name, { mood });
    const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    write(path.join(dir, 'full', mood + '.svg'), standalone(inner, vb, name + ' · ' + mood));
    n++;
  }

  /* тело: у персонажа может быть несколько поз */
  const bodies = D.art && D.art.body ? [...new Set(Object.values(D.art.body))] : [null];
  for (const b of bodies) {
    const id = b ? name + '-body-' + b : name + '-body';
    write(path.join(dir, 'parts', 'body' + (b && bodies.length > 1 ? '-' + b : '') + '.svg'),
          standalone('<use href="#' + id + '"/>', vb, name + ' · тело' + (b ? ' · ' + b : '')));
    n++;
  }
  if (D.hasFront) {
    write(path.join(dir, 'parts', 'front.svg'),
          standalone('<use href="#' + name + '-front"/>', vb, name + ' · передний план'));
    n++;
  }

  /* слои: те, что нарисованы, плюс выводимые */
  for (const layer of Object.keys(PARTS)) {
    const drawn = D.art && D.art[layer] ? Object.keys(D.art[layer]) : [];
    const states = [...new Set(drawn.concat(PARTS[layer]))];
    for (const st of states) {
      const markup = M.part(name, layer, st);
      if (!markup) continue;
      write(path.join(dir, 'parts', layer + '-' + st + '.svg'), standalone(markup, vb, name + ' · ' + layer + ' · ' + st));
      n++;
    }
  }
}

/* сводные листы */
const CW = 300, CH = 360;
function sheet(file, rows, title) {
  let cells = '';
  rows.forEach((row, r) => row.items.forEach((it, c) => {
    const vb = DATA[row.name].vb.full.split(/[\s,]+/).map(Number);
    const sc = Math.min(CW / vb[2], CH / vb[3]) * 0.9;
    cells += '<g id="' + row.name + '-' + it.id + '" transform="translate(' + (c * CW) + ',' + (r * CH + 40) + ')">' +
      '<g transform="scale(' + sc.toFixed(4) + ') translate(' + (-vb[0]) + ',' + (-vb[1]) + ')">' + it.body + '</g>' +
      '<text x="' + (CW / 2) + '" y="' + (CH - 8) + '" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#8A867C">' +
      row.name + ' · ' + it.id + '</text></g>';
  }));
  const w = Math.max(...rows.map(r => r.items.length)) * CW;
  fs.writeFileSync(path.join(ROOT, file),
    '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + (rows.length * CH + 60) + '">' +
    '<rect width="100%" height="100%" fill="#FBF9F4"/><defs>' + DEFS + '</defs>' +
    '<text x="10" y="28" font-family="sans-serif" font-size="20" font-weight="700" fill="#2B2A26">' + title + '</text>' +
    cells + '</svg>', 'utf8');
}
sheet('faces-sheet.svg', M.names.map(name => ({
  name, items: MOODS.map(mo => ({ id: mo, body: M.render(name, { mood: mo }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') }))
})), 'Все настроения');

console.log('файлов записано:', n + 1);
console.log('в', ROOT);
