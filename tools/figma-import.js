/* =====================================================================
   Импорт персонажа из набора SVG, выгруженных из Figma по одному на состояние.
   Все файлы обязаны иметь один viewBox — тогда совмещать ничего не нужно.
   Слои (брови / глаза / рот) выделяются по геометрии лица, опорная
   геометрия берётся из состояния по умолчанию. Одинаковые слои и тела
   между состояниями схлопываются в одну запись.
   ===================================================================== */
const fs = require('fs');
const { parseShapes, lum } = require('./svgparse.js');

function importCharacter(cfg) {
  const name = cfg.name;
  const keys = Object.keys(cfg.files);
  const raw = {}, vbs = new Set();
  for (const k of keys) {
    const src = fs.readFileSync(cfg.files[k], 'utf8');
    const vb = (src.match(/viewBox="([^"]+)"/) || [])[1];
    if (vb) vbs.add(vb);
    raw[k] = parseShapes(src);
  }
  if (vbs.size > 1) throw new Error(name + ': файлы с разным viewBox — ' + [...vbs].join(' / '));
  const viewBox = [...vbs][0];
  const [vx, vy, vw, vh] = viewBox.split(/[\s,]+/).map(Number);

  /* ---- опорная геометрия ---- */
  const refKey = cfg.ref || keys[0];
  const ref = raw[refKey];
  const plate = ref.filter(s => lum(s.fill) > 120 && lum(s.fill) < 228).sort((a, b) => b.area - a.area)[0];
  const whites = ref.filter(s => lum(s.fill) > 228).sort((a, b) => b.area - a.area)
                    .slice(0, 2).sort((a, b) => a.bb.cx - b.bb.cx);
  if (!plate) throw new Error(name + ': не найден корпус');
  if (whites.length !== 2) throw new Error(name + ': в опорном состоянии нет пары белков');

  const eyeTop = Math.min(...whites.map(s => s.bb.y0));
  const eyeBot = Math.max(...whites.map(s => s.bb.y1));
  const headH = plate.bb.h, axis = plate.bb.cx;
  const BROW_TOP = eyeTop - headH * 0.34;
  const MOUTH_BOT = eyeBot + headH * 0.42;

  function split(shapes) {
    const o = { brows: [], eyes: [], mouth: [], body: [] };
    for (const s of shapes) {
      const b = s.bb;
      const inHead = b.cy > BROW_TOP && b.cy < MOUTH_BOT;
      const nearAxis = Math.abs(b.cx - axis) < plate.bb.w * 0.42;
      const tooBig = s.area > plate.area * 0.15;      // пластина головы — часть тела
      if (!inHead || !nearAxis || tooBig) { o.body.push(s); continue; }
      if (b.cy < eyeTop - 2) o.brows.push(s);
      else if (b.cy <= eyeBot + 4) o.eyes.push(s);
      else o.mouth.push(s);
    }
    return o;
  }
  const parts = {};
  for (const k of keys) parts[k] = split(raw[k]);

  /* ---- схлопывание одинакового содержимого ---- */
  const defs = [], byContent = new Map(), art = { body: {}, eyes: {}, brows: {}, mouth: {} };
  function put(layer, key, shapes) {
    if (!shapes.length) return null;
    const content = shapes.map(s => s.src).join('');
    if (byContent.has(content)) { art[layer][key] = byContent.get(content); return byContent.get(content); }
    const id = name + '-' + layer + '-' + key;
    defs.push('<g id="' + id + '">' + content + '</g>');
    byContent.set(content, key);
    art[layer][key] = key;
    return key;
  }
  for (const k of keys) {
    put('body', k, parts[k].body);
    put('brows', k, parts[k].brows);
    put('eyes', k, parts[k].eyes);
    put('mouth', k, parts[k].mouth);
  }

  /* ---- геометрия для производных состояний ---- */
  const g = (bb) => ({ cx: +bb.cx.toFixed(1), cy: +bb.cy.toFixed(1),
                       rx: +(bb.w / 2).toFixed(1), ry: +(bb.h / 2).toFixed(1),
                       w: +bb.w.toFixed(1), h: +bb.h.toFixed(1) });
  const eyeGeom = whites.map(s => g(s.bb));
  const browGeom = parts[refKey].brows.map(s => {
    const q = g(s.bb); return { cx: q.cx, cy: q.cy, left: s.bb.cx < axis };
  });
  const mouthShape = parts[refKey].mouth.slice().sort((a, b) => b.area - a.area)[0];
  const dark = ref.filter(s => lum(s.fill) < 90).sort((a, b) => lum(a.fill) - lum(b.fill))[0];
  const headPlate = parts[refKey].body.filter(s => lum(s.fill) > 150).sort((a, b) => b.area - a.area)[0];

  const hx = (eyeGeom[0].cx + eyeGeom[1].cx) / 2;
  const hs = Math.round(vh * 0.62);

  return {
    defs,
    data: {
      vb: {
        full: viewBox,
        head: [Math.round(hx - hs / 2), Math.round(eyeGeom[0].cy - hs * 0.56), hs, hs].join(' ')
      },
      eyes: eyeGeom, brows: browGeom,
      mouth: mouthShape ? g(mouthShape.bb) : null,
      hasFront: false,
      skin: headPlate ? headPlate.fill : '#f4a703',
      ink: dark ? dark.fill : '#27241d',
      mouthFill: mouthShape ? mouthShape.fill : '#27241d',
      lift: +(vh * 0.022).toFixed(1),
      art, moods: cfg.moods
    },
    report: keys.map(k => ({
      состояние: k, тело: parts[k].body.length, брови: parts[k].brows.length,
      глаза: parts[k].eyes.length, рот: parts[k].mouth.length,
      'тело своё': art.body[k] === k
    }))
  };
}

module.exports = { importCharacter };
