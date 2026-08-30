/* Разбор плоского SVG из Figma: фигуры с заливкой и точными габаритами.
   Кривые сэмплируются, а не берутся по контрольным точкам, — иначе габарит
   завышается и мелкие детали (блик в зрачке) классифицируются неверно. */

function tokenizePath(d) {
  const out = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let m;
  while ((m = re.exec(d))) out.push(m[1] ? m[1] : parseFloat(m[2]));
  return out;
}

function samplePath(d, steps = 14) {
  const t = tokenizePath(d);
  const pts = [];
  let i = 0, cmd = 'M', x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0;
  const push = (a, b) => pts.push([a, b]);
  const cubic = (x0, y0, x1, y1, x2, y2, x3, y3) => {
    for (let s = 1; s <= steps; s++) {
      const u = s / steps, v = 1 - u;
      push(v*v*v*x0 + 3*v*v*u*x1 + 3*v*u*u*x2 + u*u*u*x3,
           v*v*v*y0 + 3*v*v*u*y1 + 3*v*u*u*y2 + u*u*u*y3);
    }
  };
  const quad = (x0, y0, x1, y1, x2, y2) => {
    for (let s = 1; s <= steps; s++) {
      const u = s / steps, v = 1 - u;
      push(v*v*x0 + 2*v*u*x1 + u*u*x2, v*v*y0 + 2*v*u*y1 + u*u*y2);
    }
  };
  const num = () => t[i++];
  while (i < t.length) {
    if (typeof t[i] === 'string') cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      const nx = num(), ny = num();
      x = rel ? x + nx : nx; y = rel ? y + ny : ny; sx = x; sy = y; push(x, y);
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      const nx = num(), ny = num(); x = rel ? x + nx : nx; y = rel ? y + ny : ny; push(x, y);
    } else if (C === 'H') { const nx = num(); x = rel ? x + nx : nx; push(x, y); }
    else if (C === 'V') { const ny = num(); y = rel ? y + ny : ny; push(x, y); }
    else if (C === 'C') {
      const a = num(), b = num(), c = num(), dd = num(), e = num(), f = num();
      const x1 = rel ? x + a : a, y1 = rel ? y + b : b;
      const x2 = rel ? x + c : c, y2 = rel ? y + dd : dd;
      const x3 = rel ? x + e : e, y3 = rel ? y + f : f;
      cubic(x, y, x1, y1, x2, y2, x3, y3); px = x2; py = y2; x = x3; y = y3;
    } else if (C === 'S') {
      const c = num(), dd = num(), e = num(), f = num();
      const x2 = rel ? x + c : c, y2 = rel ? y + dd : dd;
      const x3 = rel ? x + e : e, y3 = rel ? y + f : f;
      const x1 = 2 * x - px, y1 = 2 * y - py;
      cubic(x, y, x1, y1, x2, y2, x3, y3); px = x2; py = y2; x = x3; y = y3;
    } else if (C === 'Q') {
      const a = num(), b = num(), e = num(), f = num();
      const x1 = rel ? x + a : a, y1 = rel ? y + b : b;
      const x3 = rel ? x + e : e, y3 = rel ? y + f : f;
      quad(x, y, x1, y1, x3, y3); px = x1; py = y1; x = x3; y = y3;
    } else if (C === 'T') {
      const e = num(), f = num();
      const x3 = rel ? x + e : e, y3 = rel ? y + f : f;
      const x1 = 2 * x - px, y1 = 2 * y - py;
      quad(x, y, x1, y1, x3, y3); px = x1; py = y1; x = x3; y = y3;
    } else if (C === 'A') {
      const rx = num(), ry = num(); num(); num(); num();
      const e = num(), f = num();
      const x3 = rel ? x + e : e, y3 = rel ? y + f : f;
      /* дуга: габарит по концам плюс радиусы — для классификации хватает */
      push(Math.min(x, x3) - rx * 0.15, Math.min(y, y3) - ry * 0.15);
      push(Math.max(x, x3) + rx * 0.15, Math.max(y, y3) + ry * 0.15);
      push(x3, y3); x = x3; y = y3;
    } else if (C === 'Z') { x = sx; y = sy; push(x, y); }
    else { i++; }
  }
  return pts;
}

function attrs(tag) {
  const a = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) a[m[1]] = m[2];
  return a;
}
function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/* полигональная площадь — отличает кольцо (белок) от сплошного пятна */
function polyArea(pts) {
  let s = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++)
    s += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
  return Math.abs(s / 2);
}

function parseShapes(svg) {
  const shapes = [];
  for (const m of svg.matchAll(/<(path|circle|ellipse|rect)\b([^>]*)\/?>/g)) {
    const kind = m[1], a = attrs(m[0]);
    let fill = (a.fill || '').toLowerCase();
    const stroke = (a.stroke || '').toLowerCase();
    const sw = +a.strokewidth || +a['stroke-width'] || 0;
    /* Часть фигур из Figma нарисована обводкой, а не заливкой: брови
       Саныча — это две линии stroke-width 12 без fill. Раньше такие
       элементы выбрасывались целиком, и слой бровей оказывался пуст. */
    const strokeOnly = (!fill || fill === 'none') && stroke && stroke !== 'none';
    if (strokeOnly) fill = stroke;                       // цвет для классификации берём от обводки
    if (!fill || fill === 'none') continue;              // рамка выделения из Figma — без заливки
    let pts;
    if (kind === 'path') pts = samplePath(a.d || '');
    else if (kind === 'circle') {
      const cx = +a.cx, cy = +a.cy, r = +a.r;
      pts = []; for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
    } else if (kind === 'ellipse') {
      const cx = +a.cx, cy = +a.cy, rx = +a.rx, ry = +a.ry;
      pts = []; for (let k = 0; k < 24; k++) { const t = k / 24 * Math.PI * 2; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]); }
    } else {
      const x = +a.x || 0, y = +a.y || 0, w = +a.width, h = +a.height;
      pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    }
    if (!pts.length) continue;
    let bb = bbox(pts);
    /* у обводки видимая площадь задаётся толщиной линии, а не контуром:
       открытый путь сам по себе имеет нулевую высоту */
    let area = polyArea(pts);
    if (strokeOnly && sw) {
      const half = sw / 2;
      bb = { x0: bb.x0 - half, y0: bb.y0 - half, x1: bb.x1 + half, y1: bb.y1 + half,
             w: bb.w + sw, h: bb.h + sw, cx: bb.cx, cy: bb.cy };
      let len = 0;
      for (let k = 1; k < pts.length; k++)
        len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      area = Math.max(area, len * sw);
    }
    if (!isFinite(bb.x0) || bb.w <= 0 || bb.h <= 0) continue;
    shapes.push({ kind, src: m[0], fill, bb, area,
                  stroke: strokeOnly ? stroke : null,
                  strokeWidth: strokeOnly ? sw : 0,
                  linecap: strokeOnly ? (a['stroke-linecap'] || a.strokelinecap || 'butt') : null,
                  dense: area / Math.max(1, bb.w * bb.h) });
  }
  return shapes;
}

/* Figma пишет часть заливок словом, а не кодом: «white» вместо #ffffff.
   Без этого яркость получалась NaN, и белки глаз не находились вовсе. */
const NAMED = {
  white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000',
  blue: '#0000ff', gray: '#808080', grey: '#808080', silver: '#c0c0c0',
  yellow: '#ffff00', orange: '#ffa500', none: '#000000'
};
const lum = raw => {
  const hex = NAMED[String(raw).trim().toLowerCase()] || String(raw);
  const c = hex.replace('#', '');
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(c)) return 0;
  const v = c.length === 3 ? c.split('').map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

module.exports = { parseShapes, samplePath, bbox, lum };
