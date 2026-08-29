/* =====================================================================
   Разбор трассированных областей на смысловые части.
   Ничего не дорисовывается: глаза, брови и рот — это те же
   трассированные пути, просто вынутые в отдельные слои.
   Производные состояния (моргание, прищур, грусть) получаются
   трансформацией исходных путей, а не новым рисунком.
   ===================================================================== */
const fs = require('fs');
const T = require('./trace.js');

const K = T.CFG.scale;                       // обратный масштаб в исходные пиксели
const img = T.loadDownscaled(require('path').join(__dirname,'source.png'), K);
const { pal, idx } = T.quantize(img, T.CFG.tol, T.CFG.maxColors);
const bg = idx[0];

/* ---- все области с готовыми путями ---- */
const regions = [];
const BORDER = (c) => c.x0 === 0 || c.y0 === 0 || c.x1 === img.W - 1 || c.y1 === img.H - 1;
for (let p = 0; p < pal.length; p++) {
  for (const c of T.components(idx, img.W, img.H, p, T.CFG.minArea)) {
    /* Белки глаз почти белые и попадают в один цвет с фоном.
       Поэтому выбрасываем не цвет фона целиком, а только сами фоновые
       области: те, что касаются края кадра или занимают половину растра. */
    if (p === bg && (BORDER(c) || c.area > img.W * img.H * 0.2)) continue;
    const loops = T.contour(c, img.W, img.H)
      .filter(l => l.length >= 8)                      /* совсем мелкие дырки не рисуем */
      .map(l => T.rdp(l, T.CFG.rdp))
      .filter(l => l.length >= 3);
    if (!loops.length) continue;
    c.d = T.toPath(loops, K);
    c.fill = T.hex(pal[p]);
    c.lum = T.lum(pal[p]);
    c.col = pal[p];
    // геометрия в исходных координатах
    c.X0 = c.x0 * K; c.Y0 = c.y0 * K; c.X1 = (c.x1 + 1) * K; c.Y1 = (c.y1 + 1) * K;
    c.CX = (c.X0 + c.X1) / 2; c.CY = (c.Y0 + c.Y1) / 2;
    c.W = c.X1 - c.X0; c.H = c.Y1 - c.Y0;
    c.fillRatio = c.area / (c.w * c.h);      // насколько область «плотная» — кольца дают низкое значение
    regions.push(c);
  }
}

/* ---- деление на фигуры по колоночной проекции ---- */
const col = new Int32Array(img.W);
for (let y = 0; y < img.H; y++) for (let x = 0; x < img.W; x++) if (idx[y * img.W + x] !== bg) col[x]++;
const th = Math.max(2, img.H * 0.01);
let runs = [], st = -1;
for (let x = 0; x < img.W; x++) {
  if (col[x] > th && st < 0) st = x;
  else if (col[x] <= th && st >= 0) { runs.push([st, x - 1]); st = -1; }
}
if (st >= 0) runs.push([st, img.W - 1]);
runs = runs.filter(r => r[1] - r[0] > img.W * 0.05);

const NAMES = ['byte', 'nina', 'sanych'];
const figs = runs.map((r, i) => ({
  name: NAMES[i] || ('char' + i),
  x0: r[0] * K, x1: (r[1] + 1) * K,
  regions: []
}));
for (const c of regions) {
  const f = figs.find(f => c.CX >= f.x0 && c.CX <= f.x1);
  if (f) f.regions.push(c);
}

/* ---- вертикальные границы каждой фигуры ---- */
for (const f of figs) {
  f.y0 = Math.min(...f.regions.map(r => r.Y0));
  f.y1 = Math.max(...f.regions.map(r => r.Y1));
  f.cx = (f.x0 + f.x1) / 2;
  f.h = f.y1 - f.y0;
}

/* =====================================================================
   КЛАССИФИКАЦИЯ
   ===================================================================== */
const report = [];
for (const f of figs) {
  const rs = f.regions;
  const faceTop = f.y0, faceBand = f.y0 + f.h * 0.62;   // мимика живёт в верхней части фигуры

  /* --- белки: светлые компактные пятна в верхней зоне, парой --- */
  const whiteCand = rs.filter(r =>
    r.lum > 225 && r.CY < faceBand && r.CY > faceTop &&
    r.W > f.h * 0.03 && r.W < f.h * 0.22 &&
    r.H > f.h * 0.03 && r.H < f.h * 0.24 &&
    /* белок — кольцо вокруг зрачка, поэтому плотность около 0.45, а не 0.79 */
    r.fillRatio > 0.34
  ).sort((a, b) => b.area - a.area);

  let eyes = [];
  outer:
  for (let i = 0; i < whiteCand.length; i++)
    for (let j = i + 1; j < whiteCand.length; j++) {
      const a = whiteCand[i], b = whiteCand[j];
      if (Math.abs(a.CY - b.CY) < f.h * 0.05 &&           // на одной высоте
          Math.abs(a.area - b.area) / Math.max(a.area, b.area) < 0.6 &&
          Math.abs(a.CX - b.CX) > f.h * 0.05) {           // и разнесены по горизонтали
        eyes = [a, b].sort((p, q) => p.CX - q.CX);
        break outer;
      }
    }

  /* --- зрачки: тёмные внутри белков --- */
  const inside = (r, box, pad = 4) =>
    r.CX > box.X0 - pad && r.CX < box.X1 + pad && r.CY > box.Y0 - pad && r.CY < box.Y1 + pad;
  const pupils = eyes.length ? rs.filter(r => r.lum < 110 && eyes.some(e => inside(r, e))) : [];
  /* --- блики: светлые внутри зрачков --- */
  const sparks = pupils.length ? rs.filter(r => r.lum > 200 && pupils.some(p => inside(r, p, 2))) : [];

  /* --- брови: тёмные вытянутые над глазами --- */
  const eyeTop = eyes.length ? Math.min(...eyes.map(e => e.Y0)) : faceTop;
  const brows = eyes.length ? rs.filter(r =>
    r !== eyes[0] && r !== eyes[1] &&
    pupils.indexOf(r) < 0 && sparks.indexOf(r) < 0 &&
    r.Y1 <= eyeTop + f.h * 0.02 && r.Y1 > eyeTop - f.h * 0.16 &&
    r.W > r.H * 1.4 && r.W > f.h * 0.04 && r.W < f.h * 0.30 &&
    r.lum < 190
  ) : [];

  /* --- рот: ниже глаз, около центральной оси --- */
  const eyeBot = eyes.length ? Math.max(...eyes.map(e => e.Y1)) : faceTop;
  const mouthZone = rs.filter(r =>
    eyes.indexOf(r) < 0 && pupils.indexOf(r) < 0 && sparks.indexOf(r) < 0 && brows.indexOf(r) < 0 &&
    r.Y0 > eyeBot && r.CY < eyeBot + f.h * 0.22 &&
    Math.abs(r.CX - f.cx) < f.h * 0.10 &&
    r.W > f.h * 0.03 && r.W < f.h * 0.30 && r.H < f.h * 0.14
  ).sort((a, b) => b.area - a.area);
  /* рот = самая крупная область зоны плюс всё, что лежит внутри её рамки (язык, губы) */
  const mouth = [];
  if (mouthZone.length) {
    const m0 = mouthZone[0];
    mouth.push(m0);
    for (const r of mouthZone) if (r !== m0 && inside(r, m0, 2)) mouth.push(r);
  }

  /* --- передний план: то, что перекрывает глаза, но глазами не является (оправа) --- */
  const front = eyes.length ? rs.filter(r =>
    eyes.indexOf(r) < 0 && pupils.indexOf(r) < 0 && sparks.indexOf(r) < 0 &&
    brows.indexOf(r) < 0 && mouth.indexOf(r) < 0 &&
    eyes.some(e => !(r.X1 < e.X0 || r.X0 > e.X1 || r.Y1 < e.Y0 || r.Y0 > e.Y1)) &&
    r.fillRatio < 0.55
  ) : [];

  const used = new Set([...eyes, ...pupils, ...sparks, ...brows, ...mouth, ...front]);
  const body = rs.filter(r => !used.has(r)).sort((a, b) => b.area - a.area);

  f.parts = { body, brows, eyes, pupils, sparks, mouth, front };
  report.push({
    фигура: f.name, областей: rs.length, тело: body.length, брови: brows.length,
    белки: eyes.length, зрачки: pupils.length, блики: sparks.length,
    рот: mouth.length, оправа: front.length
  });

  /* геометрия глаз — нужна для производных состояний */
  if (eyes.length === 2) {
    f.eyeGeom = eyes.map((e, i) => ({
      cx: e.CX, cy: e.CY, rx: e.W / 2, ry: e.H / 2,
      pupil: pupils.find(p => inside(p, e)) || null
    }));
  }
  /* цвет лица рядом с глазом — им «прикрываем» глаз для грустного века */
  if (eyes.length) {
    const e = eyes[0];
    const sx = Math.round((e.X0 - e.W * 0.5) / K), sy = Math.round(e.CY / K);
    const pi = idx[Math.max(0, Math.min(img.W * img.H - 1, sy * img.W + sx))];
    f.skin = T.hex(pal[pi]);
  }
  const inkR = [...(f.parts.pupils.length ? f.parts.pupils : f.parts.body)].sort((a, b) => a.lum - b.lum)[0];
  f.ink = inkR ? inkR.fill : '#222';
  f.mouthFill = mouth.length ? mouth[0].fill : f.ink;
}

console.table(report);
module.exports = { figs, img, K };
