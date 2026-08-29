/* =====================================================================
   ТРАССИРОВЩИК: PNG → SVG
   1. уменьшение вдвое (усреднением) — сглаживает шум генератора
   2. квантование палитры с допуском по расстоянию в RGB
   3. связные области по каждому цвету
   4. обход границы (Moore-neighbor) → полигон
   5. упрощение Дугласа–Пекера
   6. заливки рисуются от больших к малым — дырки не нужны,
      мелкие области просто ложатся поверх крупных
   ===================================================================== */
const fs = require('fs');
const { PNG } = require('pngjs');

const CFG = {
  scale: 2,          // во сколько раз уменьшать перед трассировкой
  tol: 30,           // допуск слияния цветов (евклидово расстояние в RGB)
  minArea: 14,       // области мельче — выбрасываем (антиалиас, шум)
  rdp: 0.9,          // допуск упрощения контура, в пикселях уменьшенного растра
  maxColors: 40
};

/* ---------- 1. чтение и уменьшение ---------- */
function loadDownscaled(file, k) {
  const png = PNG.sync.read(fs.readFileSync(file));
  const W = Math.floor(png.width / k), H = Math.floor(png.height / k);
  const px = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const i = ((y * k + dy) * png.width + (x * k + dx)) * 4;
        r += png.data[i]; g += png.data[i + 1]; b += png.data[i + 2]; n++;
      }
      const o = (y * W + x) * 3;
      px[o] = r / n; px[o + 1] = g / n; px[o + 2] = b / n;
    }
  }
  return { W, H, px, ow: png.width, oh: png.height };
}

/* ---------- 2. палитра с допуском ---------- */
function quantize(img, tol, maxColors) {
  const { W, H, px } = img;
  const hist = new Map();
  for (let i = 0; i < W * H; i++) {
    // грубая корзина 5 бит на канал, чтобы гистограмма была компактной
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const e = hist.get(key);
    if (e) { e.n++; e.r += r; e.g += g; e.b += b; }
    else hist.set(key, { n: 1, r, g, b });
  }
  const bins = [...hist.values()].map(e => ({ n: e.n, r: e.r / e.n, g: e.g / e.n, b: e.b / e.n }))
    .sort((a, b) => b.n - a.n);

  const pal = [];
  for (const bin of bins) {
    if (pal.length >= maxColors) break;
    let near = null;
    for (const p of pal) {
      const d = Math.hypot(p.r - bin.r, p.g - bin.g, p.b - bin.b);
      if (d < tol) { near = p; break; }
    }
    if (near) { // прилипаем к существующему, уточняя его центр по весу
      const t = near.n + bin.n;
      near.r = (near.r * near.n + bin.r * bin.n) / t;
      near.g = (near.g * near.n + bin.g * bin.n) / t;
      near.b = (near.b * near.n + bin.b * bin.n) / t;
      near.n = t;
    } else pal.push({ r: bin.r, g: bin.g, b: bin.b, n: bin.n });
  }
  // карта пикселей на индексы палитры
  const idx = new Int16Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
    let best = 0, bd = Infinity;
    for (let p = 0; p < pal.length; p++) {
      const d = (pal[p].r - r) ** 2 + (pal[p].g - g) ** 2 + (pal[p].b - b) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    idx[i] = best;
  }
  return { pal, idx };
}

/* ---------- 3. связные области ---------- */
function components(idx, W, H, pIndex, minArea) {
  const seen = new Uint8Array(W * H);
  const out = [];
  const stack = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || idx[s] !== pIndex) continue;
    let sp = 0; stack[sp++] = s; seen[s] = 1;
    const cells = [];
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    while (sp) {
      const c = stack[--sp];
      cells.push(c);
      const x = c % W, y = (c - x) / W;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0     && !seen[c - 1] && idx[c - 1] === pIndex) { seen[c - 1] = 1; stack[sp++] = c - 1; }
      if (x < W - 1 && !seen[c + 1] && idx[c + 1] === pIndex) { seen[c + 1] = 1; stack[sp++] = c + 1; }
      if (y > 0     && !seen[c - W] && idx[c - W] === pIndex) { seen[c - W] = 1; stack[sp++] = c - W; }
      if (y < H - 1 && !seen[c + W] && idx[c + W] === pIndex) { seen[c + W] = 1; stack[sp++] = c + W; }
    }
    if (cells.length < minArea) continue;
    out.push({ p: pIndex, cells, area: cells.length, x0, y0, x1, y1,
               cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out;
}

/* ---------- 4. обход границы по «трещинам» между пикселями ----------
   Для каждой стороны пикселя, за которой нет области, кладём направленный
   отрезок вдоль границы. Отрезки сами складываются в замкнутые петли:
   конец одного совпадает с началом следующего. Обход пикселей по соседям
   (Moore) на вогнутых местах срывался и замыкал контур на третьем шаге. */
function contour(comp, W, H) {
  const set = new Set(comp.cells);
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && set.has(y * W + x);

  const next = new Map();                      // угол → список исходящих отрезков
  const key = (x, y) => x + ',' + y;
  const add = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    /* в одном углу может начинаться два отрезка (диагональное касание) —
       раньше второй терялся, и контур уходил в чужую петлю широким клином */
    if (next.has(k)) next.get(k).push([bx, by]); else next.set(k, [[bx, by]]);
  };

  for (const c of comp.cells) {
    const x = c % W, y = (c - x) / W;
    if (!inside(x, y - 1)) add(x + 1, y, x, y);         // верх — влево
    if (!inside(x, y + 1)) add(x, y + 1, x + 1, y + 1); // низ — вправо
    if (!inside(x - 1, y)) add(x, y, x, y + 1);         // левый бок — вниз
    if (!inside(x + 1, y)) add(x + 1, y + 1, x + 1, y); // правый бок — вверх
  }
  if (!next.size) return [];

  /* собираем ВСЕ петли: внешнюю и внутренние. Внутренние — это дырки,
     они нужны, иначе кольцо (волосы вокруг лица) зальётся целиком. */
  const loops = [];
  for (const startKey of [...next.keys()]) {
    while (next.has(startKey) && next.get(startKey).length) {
      const loop = [];
      let k = startKey, guard = 0;
      while (guard++ < 4 * (comp.w + comp.h) + comp.area * 2 + 64) {
        const outs = next.get(k);
        if (!outs || !outs.length) break;
        const [nx, ny] = outs.shift();
        const [x, y] = k.split(',').map(Number);
        loop.push([x, y]);
        k = key(nx, ny);
        if (k === startKey) break;
      }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  loops.sort((a, b) => b.length - a.length);
  return loops;
}

/* ---------- 5. упрощение ---------- */
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = -1, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps && idx > 0) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

function toPath(loops, k) {
  let d = '';
  for (const pts of loops) {
    if (pts.length < 3) continue;
    d += 'M' + (pts[0][0] * k).toFixed(1) + ' ' + (pts[0][1] * k).toFixed(1);
    for (let i = 1; i < pts.length; i++) d += 'L' + (pts[i][0] * k).toFixed(1) + ' ' + (pts[i][1] * k).toFixed(1);
    d += 'Z';
  }
  return d;
}

const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const lum = c => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

module.exports = { CFG, loadDownscaled, quantize, components, contour, rdp, toPath, hex, lum };
