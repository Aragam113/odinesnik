/* Сборка SVG из размеченных областей + производные состояния мимики. */
const fs = require('fs');
const { figs } = require('./build-traced.js');

const P = (r, cls) => '<path' + (cls ? ' class="' + cls + '"' : '') +
  ' fill="' + r.fill + '" fill-rule="evenodd" d="' + r.d + '"/>';
const grp = (cls, inner) => '<g class="' + cls + '">' + inner + '</g>';

function viewBox(f, pad) {
  pad = pad == null ? 14 : pad;
  const x0 = f.x0 - pad, y0 = f.y0 - pad;
  const w = (f.x1 - f.x0) + pad * 2, h = (f.y1 - f.y0) + pad * 2;
  return { s: [x0, y0, w, h].map(v => Math.round(v)).join(' '), x0, y0, w, h };
}

/* --- производные состояния: трансформации исходных путей, а не новый рисунок --- */
function eyeStates(f) {
  const g = f.eyeGeom;
  if (!g) return null;
  const open = grp('m-eyes-open',
    f.parts.eyes.map(r => P(r)).join('') +
    f.parts.pupils.map(r => P(r)).join('') +
    f.parts.sparks.map(r => P(r)).join(''));

  const tf = (e, s) => 'translate(' + e.cx.toFixed(1) + ' ' + e.cy.toFixed(1) + ') scale(' + s + ') translate(' + (-e.cx).toFixed(1) + ' ' + (-e.cy).toFixed(1) + ')';
  const eyeGroup = (e) => {
    const own = (arr) => arr.filter(r => Math.abs(r.CX - e.cx) < e.rx * 1.6);
    return own(f.parts.eyes).map(r => P(r)).join('') +
           own(f.parts.pupils).map(r => P(r)).join('') +
           own(f.parts.sparks).map(r => P(r)).join('');
  };
  const per = (s) => g.map(e => '<g transform="' + tf(e, s) + '">' + eyeGroup(e) + '</g>').join('');

  const lidPath = (e, drop) => {
    const y = e.cy - e.ry * (1 - drop);
    return '<path fill="' + f.skin + '" d="M' + (e.cx - e.rx * 1.25) + ' ' + y +
      ' q' + (e.rx * 1.25) + ' ' + (-e.ry * 0.55) + ' ' + (e.rx * 2.5) + ' 0' +
      ' v' + (-e.ry * 1.4) + ' h' + (-e.rx * 2.5) + 'z"/>';
  };
  const line = (e, bend, w) =>
    '<path fill="none" stroke="' + f.ink + '" stroke-width="' + w + '" stroke-linecap="round" d="M' +
    (e.cx - e.rx * 0.95) + ' ' + e.cy + ' Q' + e.cx + ' ' + (e.cy + bend) + ' ' + (e.cx + e.rx * 0.95) + ' ' + e.cy + '"/>';

  const strokeW = Math.max(4, g[0].ry * 0.30);
  return {
    open,
    blink:  grp('m-eyes-blink',  g.map(e => line(e, e.ry * 0.45, strokeW)).join('')),
    happy:  grp('m-eyes-happy',  g.map(e => line(e, -e.ry * 1.5, strokeW)).join('')),
    sad:    grp('m-eyes-sad',    per(1) + g.map(e => lidPath(e, 0.42)).join('')),
    wide:   grp('m-eyes-wide',   per(1.16)),
    squint: grp('m-eyes-squint', '<g transform="translate(0 0)">' +
              g.map(e => '<g transform="translate(' + e.cx.toFixed(1) + ' ' + e.cy.toFixed(1) +
                ') scale(1 0.45) translate(' + (-e.cx).toFixed(1) + ' ' + (-e.cy).toFixed(1) + ')">' +
                eyeGroup(e) + '</g>').join('') + '</g>')
  };
}

function browStates(f) {
  const bs = f.parts.brows;
  if (!bs.length) return null;
  const inner = bs.map(r => P(r)).join('');
  const cx = f.cx, dy = f.h * 0.022;
  const mirrorTilt = (deg, lift) => bs.map(r => {
    const side = r.CX < cx ? 1 : -1;
    return '<g transform="translate(0 ' + (-lift).toFixed(1) + ') rotate(' + (deg * side).toFixed(1) +
      ' ' + r.CX.toFixed(1) + ' ' + r.CY.toFixed(1) + ')">' + P(r) + '</g>';
  }).join('');
  return {
    neutral: grp('m-brows-neutral', inner),
    up:      grp('m-brows-up',      mirrorTilt(0, dy * 1.6)),
    down:    grp('m-brows-down',    mirrorTilt(-9, -dy * 0.5)),
    worried: grp('m-brows-worried', mirrorTilt(11, dy * 0.3))
  };
}

function mouthStates(f) {
  const ms = f.parts.mouth;
  if (!ms.length) return null;
  const base = ms[0];
  const cx = base.CX, cy = base.CY, w = base.W, h = base.H;
  const fill = f.mouthFill;
  const stroke = (bend, sw) =>
    '<path fill="none" stroke="' + fill + '" stroke-width="' + sw.toFixed(1) + '" stroke-linecap="round" d="M' +
    (cx - w * 0.42).toFixed(1) + ' ' + cy.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + (cy + bend).toFixed(1) + ' ' +
    (cx + w * 0.42).toFixed(1) + ' ' + cy.toFixed(1) + '"/>';
  const sw = Math.max(4, h * 0.30);
  const sc = (s) => '<g transform="translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') scale(' + s +
    ') translate(' + (-cx).toFixed(1) + ' ' + (-cy).toFixed(1) + ')">' + ms.map(r => P(r)).join('') + '</g>';
  return {
    smile: grp('m-mouth-smile', ms.map(r => P(r)).join('')),
    big:   grp('m-mouth-big',   sc(1.22)),
    open:  grp('m-mouth-open',  sc(1.0)),
    flat:  grp('m-mouth-flat',  stroke(0, sw)),
    frown: grp('m-mouth-frown', stroke(-h * 0.55, sw)),
    o:     grp('m-mouth-o',     '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) +
             '" rx="' + (w * 0.26).toFixed(1) + '" ry="' + (h * 0.5).toFixed(1) + '" fill="' + fill + '"/>')
  };
}

/* --- итоговая структура --- */
const OUT = {};
for (const f of figs) {
  const vb = viewBox(f);
  const eyes = eyeStates(f), brows = browStates(f), mouth = mouthStates(f);
  OUT[f.name] = {
    viewBox: vb.s,
    head: [Math.round(f.x0 - 10), Math.round(f.y0 - 10),
           Math.round((f.x1 - f.x0) + 20), Math.round((f.x1 - f.x0) + 20)].join(' '),
    body: f.parts.body.map(r => P(r)).join('') ,
    front: f.parts.front.map(r => P(r)).join(''),
    eyes, brows, mouth,
    skin: f.skin, ink: f.ink,
    stats: {
      областей: f.regions.length, тело: f.parts.body.length, брови: f.parts.brows.length,
      белки: f.parts.eyes.length, зрачки: f.parts.pupils.length,
      блики: f.parts.sparks.length, рот: f.parts.mouth.length, перед: f.parts.front.length
    }
  };
}

function svg(name, mood) {
  const o = OUT[name];
  const m = { idle:['neutral','open','smile'], blink:['neutral','blink','smile'],
              happy:['up','happy','big'], cheer:['up','happy','big'],
              sad:['worried','sad','frown'], think:['down','squint','flat'],
              wow:['up','wide','o'], neutral:['neutral','open','flat'] }[mood || 'idle'];
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + o.viewBox + '" class="mascot" data-char="' + name + '">' +
    grp('m-body', o.body) +
    grp('m-brows', o.brows ? o.brows[m[0]] : '') +
    grp('m-eyes',  o.eyes  ? o.eyes[m[1]]  : '') +
    grp('m-mouth', o.mouth ? o.mouth[m[2]] : '') +
    grp('m-front', o.front) +
  '</svg>';
}

module.exports = { OUT, svg, figs };

if (require.main === module) {
  const moods = ['idle','blink','happy','cheer','sad','think','wow','neutral'];
  let cells = '';
  for (const n of Object.keys(OUT)) {
    cells += '<tr><th>' + n + '</th>';
    for (const mo of moods) cells += '<td><div class="c">' + svg(n, mo) + '</div><small>' + mo + '</small></td>';
    cells += '</tr>';
  }
  fs.writeFileSync(require('path').join(__dirname,'traced-sheet.html'),
    '<!doctype html><meta charset=utf-8><style>body{margin:0;padding:12px;background:#FBF9F4;font:600 11px system-ui}' +
    'table{border-collapse:collapse}th{text-align:right;padding-right:8px;font-size:12px;color:#6B6A64}' +
    'td{padding:2px;text-align:center}.c{width:112px;height:112px;background:#fff;border:2px solid #E4E0D6;border-radius:12px;display:grid;place-items:center}' +
    'svg{width:100%;height:100%}small{color:#A5A198}</style><table>' + cells + '</table>', 'utf8');
  console.log('traced-sheet.html готов');
  for (const n of Object.keys(OUT)) console.log(n, JSON.stringify(OUT[n].stats), 'viewBox', OUT[n].viewBox);
}
