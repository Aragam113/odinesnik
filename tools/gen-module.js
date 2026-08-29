/* Генерирует mascots-traced.js для тренажёра.
   Пути лежат один раз в общем <defs>, экземпляры ссылаются через <use>,
   поэтому десять персонажей на экране не десятикратно тяжелее одного. */
const fs = require('fs');
const { figs } = require('./build-traced.js');

const P = r => '<path fill="' + r.fill + '" fill-rule="evenodd" d="' + r.d + '"/>';
const defs = [];
const DATA = {};

for (const f of figs) {
  const n = f.name, g = f.eyeGeom;
  const p = f.parts;
  const id = s => n + '-' + s;

  defs.push('<g id="' + id('body') + '">' + p.body.map(P).join('') + '</g>');
  if (p.front.length) defs.push('<g id="' + id('front') + '">' + p.front.map(P).join('') + '</g>');

  /* глаз целиком: белок + зрачок + блик, по одному узлу на сторону */
  const side = (arr, e) => arr.filter(r => Math.abs(r.CX - e.cx) < e.rx * 1.7);
  (g || []).forEach((e, i) => {
    const parts = side(p.eyes, e).concat(side(p.pupils, e), side(p.sparks, e));
    defs.push('<g id="' + id('eye' + i) + '">' + parts.map(P).join('') + '</g>');
  });
  p.brows.forEach((r, i) => defs.push('<g id="' + id('brow' + i) + '">' + P(r) + '</g>'));
  if (p.mouth.length) defs.push('<g id="' + id('mouth') + '">' + p.mouth.map(P).join('') + '</g>');

  const pad = 14;
  const vbFull = [f.x0 - pad, f.y0 - pad, (f.x1 - f.x0) + pad * 2, (f.y1 - f.y0) + pad * 2].map(Math.round).join(' ');
  /* «портрет»: квадрат вокруг лица, центр — между глазами */
  const hx = g ? (g[0].cx + g[1].cx) / 2 : (f.x0 + f.x1) / 2;
  const hy = g ? g[0].cy : f.y0 + f.h * 0.3;
  const hs = f.h * 0.62;
  const vbHead = [hx - hs / 2, hy - hs * 0.56, hs, hs].map(Math.round).join(' ');

  DATA[n] = {
    vb: { full: vbFull, head: vbHead },
    eyes: g ? g.map(e => ({ cx: +e.cx.toFixed(1), cy: +e.cy.toFixed(1), rx: +e.rx.toFixed(1), ry: +e.ry.toFixed(1) })) : null,
    brows: p.brows.map(r => ({ cx: +r.CX.toFixed(1), cy: +r.CY.toFixed(1), left: r.CX < f.cx })),
    mouth: p.mouth.length ? { cx: +p.mouth[0].CX.toFixed(1), cy: +p.mouth[0].CY.toFixed(1),
                              w: +p.mouth[0].W.toFixed(1), h: +p.mouth[0].H.toFixed(1) } : null,
    hasFront: p.front.length > 0,
    skin: f.skin, ink: f.ink, mouthFill: f.mouthFill,
    lift: +(f.h * 0.022).toFixed(1)
  };
}

const runtime = `/* =====================================================================
   ПЕРСОНАЖИ, ТРАССИРОВАННЫЕ ИЗ РАСТРА
   Пути получены обводкой цветовых областей исходной картинки
   (квантование палитры с допуском, связные области, контур по «трещинам»,
   упрощение Дугласа–Пекера). Разметка на глаза / брови / рот — по геометрии:
   белок = светлое кольцо в верхней зоне, зрачок = тёмное внутри него и т.д.
   Производные состояния мимики — трансформации тех же путей, не новый рисунок.
   ===================================================================== */
var MDATA = ${JSON.stringify(DATA)};
var MDEFS = ${JSON.stringify(defs.join(''))};

var MOODS = {
  idle:    {brows:"neutral", eyes:"open",   mouth:"smile"},
  blink:   {brows:"neutral", eyes:"blink",  mouth:"smile"},
  happy:   {brows:"up",      eyes:"happy",  mouth:"big"},
  cheer:   {brows:"up",      eyes:"happy",  mouth:"big"},
  sad:     {brows:"worried", eyes:"sad",    mouth:"frown"},
  think:   {brows:"down",    eyes:"squint", mouth:"flat"},
  wow:     {brows:"up",      eyes:"wide",   mouth:"o"},
  neutral: {brows:"neutral", eyes:"open",   mouth:"flat"}
};

function useTag(id, tf){ return '<use href="#' + id + '"' + (tf ? ' transform="' + tf + '"' : '') + '/>'; }
function scaleAt(cx, cy, sx, sy){
  return 'translate(' + cx + ' ' + cy + ') scale(' + sx + ' ' + sy + ') translate(' + (-cx) + ' ' + (-cy) + ')';
}

var MASCOT = {
  names: Object.keys(MDATA),
  moods: MOODS,
  mood: function(name, m){ return MOODS[m] || MOODS.idle; },
  defs: function(){
    return '<svg id="mascot-defs" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' +
           '<defs>' + MDEFS + '</defs></svg>';
  },
  part: function(name, layer, state){
    var D = MDATA[name];
    if(!D) return '';
    if(layer === "eyes"){
      if(!D.eyes) return '';
      var e0 = D.eyes[0], e1 = D.eyes[1] || D.eyes[0];
      var sw = Math.max(3, e0.ry * 0.30);
      var line = function(e, bend){
        return '<path fill="none" stroke="' + D.ink + '" stroke-width="' + sw.toFixed(1) +
          '" stroke-linecap="round" d="M' + (e.cx - e.rx * 0.95).toFixed(1) + ' ' + e.cy +
          ' Q' + e.cx + ' ' + (e.cy + bend).toFixed(1) + ' ' + (e.cx + e.rx * 0.95).toFixed(1) + ' ' + e.cy + '"/>';
      };
      var lid = function(e){
        var y = e.cy - e.ry * 0.58;
        return '<path fill="' + D.skin + '" d="M' + (e.cx - e.rx * 1.3).toFixed(1) + ' ' + y.toFixed(1) +
          ' q' + (e.rx * 1.3).toFixed(1) + ' ' + (-e.ry * 0.5).toFixed(1) + ' ' + (e.rx * 2.6).toFixed(1) + ' 0' +
          ' v' + (-e.ry * 1.5).toFixed(1) + ' h' + (-e.rx * 2.6).toFixed(1) + 'z"/>';
      };
      if(state === "blink")  return line(e0, e0.ry * 0.45) + line(e1, e1.ry * 0.45);
      if(state === "happy")  return line(e0, -e0.ry * 1.5) + line(e1, -e1.ry * 1.5);
      if(state === "wide")   return D.eyes.map(function(e, i){ return useTag(name + '-eye' + i, scaleAt(e.cx, e.cy, 1.16, 1.16)); }).join('');
      if(state === "squint") return D.eyes.map(function(e, i){ return useTag(name + '-eye' + i, scaleAt(e.cx, e.cy, 1, 0.45)); }).join('');
      if(state === "sad")    return D.eyes.map(function(e, i){ return useTag(name + '-eye' + i); }).join('') +
                                    D.eyes.map(lid).join('');
      return D.eyes.map(function(e, i){ return useTag(name + '-eye' + i); }).join('');
    }
    if(layer === "brows"){
      var tilt = state === "down" ? -9 : state === "worried" ? 11 : 0;
      var lift = state === "up" ? D.lift * 1.6 : state === "worried" ? D.lift * 0.3 : state === "down" ? -D.lift * 0.5 : 0;
      return D.brows.map(function(b, i){
        var side = b.left ? 1 : -1;
        var tf = (lift ? 'translate(0 ' + (-lift).toFixed(1) + ') ' : '') +
                 (tilt ? 'rotate(' + (tilt * side).toFixed(1) + ' ' + b.cx + ' ' + b.cy + ')' : '');
        return useTag(name + '-brow' + i, tf.trim());
      }).join('');
    }
    if(layer === "mouth"){
      var m = D.mouth;
      if(!m) return '';
      var msw = Math.max(3, m.h * 0.30);
      var curve = function(bend){
        return '<path fill="none" stroke="' + D.mouthFill + '" stroke-width="' + msw.toFixed(1) +
          '" stroke-linecap="round" d="M' + (m.cx - m.w * 0.42).toFixed(1) + ' ' + m.cy +
          ' Q' + m.cx + ' ' + (m.cy + bend).toFixed(1) + ' ' + (m.cx + m.w * 0.42).toFixed(1) + ' ' + m.cy + '"/>';
      };
      if(state === "flat")  return curve(0);
      if(state === "frown") return curve(-m.h * 0.55);
      if(state === "o")     return '<ellipse cx="' + m.cx + '" cy="' + m.cy + '" rx="' + (m.w * 0.26).toFixed(1) +
                                   '" ry="' + (m.h * 0.5).toFixed(1) + '" fill="' + D.mouthFill + '"/>';
      if(state === "big")   return useTag(name + '-mouth', scaleAt(m.cx, m.cy, 1.2, 1.2));
      return useTag(name + '-mouth');
    }
    return '';
  },
  render: function(name, opts){
    opts = opts || {};
    var D = MDATA[name];
    if(!D) return '';
    var m = typeof opts.mood === "string" ? (MOODS[opts.mood] || MOODS.idle) : (opts.mood || MOODS.idle);
    var vb = D.vb[opts.frame === "head" ? "head" : "full"];
    return '<svg class="mascot' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="' + vb +
      '" data-char="' + name + '" data-mood="' + (typeof opts.mood === "string" ? opts.mood : "idle") +
      '" role="img" aria-label="' + (opts.label || name) + '">' +
      useTag(name + '-body') +
      '<g class="m-brows">' + MASCOT.part(name, "brows", m.brows) + '</g>' +
      '<g class="m-eyes">'  + MASCOT.part(name, "eyes",  m.eyes)  + '</g>' +
      '<g class="m-mouth">' + MASCOT.part(name, "mouth", m.mouth) + '</g>' +
      (D.hasFront ? useTag(name + '-front') : '') +
    '</svg>';
  }
};
`;

/* ICON переносим из прежнего файла — он к персонажам не относится, но нужен интерфейсу */
const prev = fs.readFileSync('mascots2.js', 'utf8');
const icons = prev.slice(prev.indexOf('/* иконки узлов пути */'));

fs.writeFileSync('mascots-traced.js', runtime + '\n' + icons, 'utf8');
const kb = (fs.statSync('mascots-traced.js').size / 1024).toFixed(0);
console.log('mascots-traced.js:', kb + ' КБ');
console.log('  в defs путей:', defs.length, '| размер defs:', (defs.join('').length / 1024).toFixed(0) + ' КБ');
for (const n of Object.keys(DATA)) {
  console.log('  ' + n, 'глаз:', DATA[n].eyes ? DATA[n].eyes.length : 0,
              'бровей:', DATA[n].brows.length, 'рот:', DATA[n].mouth ? 'да' : 'нет',
              'портрет:', DATA[n].vb.head);
}
