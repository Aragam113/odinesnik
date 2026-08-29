/* Полный экспорт SVG для правки в Figma.
   Каждый файл самостоятельный: пути внутри, без ссылок на общий defs.
   Во всех файлах одного персонажа одинаковый viewBox — поэтому слои,
   отредактированные по отдельности, потом совпадут по координатам. */
const fs = require('fs'), path = require('path');
const { OUT, svg } = require('./emit.js');

const ROOT = process.argv[2] || 'C:/Users/fajar/Downloads/odinesnik-mascots';
const HEAD = '<?xml version="1.0" encoding="UTF-8"?>\n';
const names = Object.keys(OUT);
const MOODS = ['idle', 'blink', 'happy', 'cheer', 'sad', 'think', 'wow', 'neutral'];
const PARTS = {
  eyes:  ['open', 'blink', 'happy', 'sad', 'wide', 'squint'],
  brows: ['neutral', 'up', 'down', 'worried'],
  mouth: ['smile', 'big', 'open', 'flat', 'frown', 'o']
};

function write(p, body, vb, title) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const w = vb.split(' ')[2], h = vb.split(' ')[3];
  fs.writeFileSync(p,
    HEAD + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" width="' + w + '" height="' + h + '">' +
    '<title>' + title + '</title>' + body + '</svg>', 'utf8');
}

let n = 0;
for (const name of names) {
  const o = OUT[name];
  const vb = o.viewBox;
  const dir = path.join(ROOT, name);

  /* целые фигуры по настроениям */
  for (const mood of MOODS) {
    const inner = svg(name, mood).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    write(path.join(dir, 'full', mood + '.svg'), inner, vb, name + ' · ' + mood);
    n++;
  }
  /* отдельные слои */
  write(path.join(dir, 'parts', 'body.svg'), o.body, vb, name + ' · тело'); n++;
  if (o.front) { write(path.join(dir, 'parts', 'front.svg'), o.front, vb, name + ' · передний план'); n++; }
  for (const layer of Object.keys(PARTS)) {
    const src = o[layer];
    if (!src) continue;
    for (const st of PARTS[layer]) {
      if (!src[st]) continue;
      write(path.join(dir, 'parts', layer + '-' + st + '.svg'), src[st], vb, name + ' · ' + layer + ' · ' + st);
      n++;
    }
  }
}

/* сводные листы */
const CW = 260, CH = 340;
function sheet(file, rows, title) {
  let cells = '';
  rows.forEach((row, r) => row.items.forEach((it, c) => {
    const vb = OUT[row.name].viewBox.split(' ').map(Number);
    const sc = Math.min(CW / vb[2], CH / vb[3]);
    cells += '<g id="' + row.name + '-' + it.id + '" transform="translate(' + (c * CW) + ',' + (r * CH + 40) + ')">' +
      '<g transform="scale(' + sc.toFixed(4) + ') translate(' + (-vb[0]) + ',' + (-vb[1]) + ')">' + it.body + '</g>' +
      '<text x="' + (CW / 2) + '" y="' + (CH - 8) + '" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#8A867C">' +
      row.name + ' · ' + it.id + '</text></g>';
  }));
  const w = Math.max(...rows.map(r => r.items.length)) * CW;
  fs.writeFileSync(path.join(ROOT, file),
    HEAD + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + (rows.length * CH + 60) + '">' +
    '<rect width="100%" height="100%" fill="#FBF9F4"/>' +
    '<text x="10" y="28" font-family="sans-serif" font-size="20" font-weight="700" fill="#2B2A26">' + title + '</text>' +
    cells + '</svg>', 'utf8');
}
sheet('faces-sheet.svg',
  names.map(name => ({ name, items: MOODS.map(m => ({ id: m, body: svg(name, m).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') })) })),
  'Все настроения');
sheet('layers.svg',
  names.map(name => ({ name, items: [
    { id: 'тело', body: OUT[name].body },
    { id: 'брови', body: OUT[name].brows ? OUT[name].brows.neutral : '' },
    { id: 'глаза', body: OUT[name].eyes ? OUT[name].eyes.open : '' },
    { id: 'рот', body: OUT[name].mouth ? OUT[name].mouth.smile : '' },
    { id: 'перёд', body: OUT[name].front || '' }
  ] })),
  'Разобранные слои');

/* памятка для правки */
fs.writeFileSync(path.join(ROOT, 'README.md'),
`# Персонажи тренажёра — исходники для правки

Все файлы получены **трассировкой** исходного PNG: квантование палитры с допуском,
связные области по цветам, обход границы, упрощение контуров. Ничего не рисовалось от руки,
кроме состояний, которых в исходной картинке физически нет (моргание, дуга радости, веко грусти).

## Как устроено

\`\`\`
byte/  nina/  sanych/
  full/     — целая фигура в каждом настроении (8 файлов)
  parts/    — отдельные слои: тело, брови, глаза, рот, передний план
faces-sheet.svg — все настроения одним листом
layers.svg      — слои по отдельности одним листом
\`\`\`

## Важное правило

**У всех файлов одного персонажа одинаковый \`viewBox\`.** Не меняй его и не обрезай холст —
именно по нему слои совмещаются обратно. В Figma это «Frame» фиксированного размера:
двигай содержимое внутри, но не сам фрейм.

| персонаж | viewBox |
|---|---|
${names.map(n => '| ' + n + ' | `' + OUT[n].viewBox + '` |').join('\n')}

## Что можно править

- **parts/eyes-*.svg** — форма глаз в каждом состоянии
- **parts/brows-*.svg** — брови
- **parts/mouth-*.svg** — рот
- **parts/body.svg** — тело, волосы, одежда
- **parts/front.svg** — то, что поверх лица (оправа очков)

## Что вернуть

Достаточно правленых файлов из \`parts/\` — я пересоберу из них все настроения и вставлю в тренажёр.
Если правишь целую фигуру из \`full/\`, скажи какую, я разберу её обратно на слои.

Имена файлов менять не надо — по ним идёт сборка.

## Состояния

- **глаза**: open, blink, happy, sad, wide, squint
- **брови**: neutral, up, down, worried
- **рот**: smile, big, open, flat, frown, o

Настроение — это комбинация трёх слоёв:

| настроение | брови | глаза | рот |
|---|---|---|---|
| idle | neutral | open | smile |
| blink | neutral | blink | smile |
| happy / cheer | up | happy | big |
| sad | worried | sad | frown |
| think | down | squint | flat |
| wow | up | wide | o |
| neutral | neutral | open | flat |
`, 'utf8');

console.log('файлов записано:', n + 2);
console.log('в', ROOT);
