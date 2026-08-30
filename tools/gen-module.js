/* Генерирует src/app/mascots-traced.js.
   Персонажи берутся из двух источников:
     — трассировка исходного растра (tools/source.png);
     — правленые в Figma наборы SVG (tools/figma/), по файлу на состояние.
   Пути лежат один раз в общем <defs>, экземпляры ссылаются через <use>. */
const fs = require('fs');
const path = require('path');
const { figs } = require('./build-traced.js');
const { importCharacter } = require('./figma-import.js');

/* у каждого персонажа своя папка: имена файлов из Figma совпадают */
const FG = (who, f) => path.join(__dirname, 'figma', who, f);

/* Правленые персонажи. Ключ состояния = имя файла, дальше настроения
   собираются из этих состояний по слоям. */
const FIGMA = {
  byte: {
    name: 'byte',
    ref: 'default',
    files: {
      default: FG('byte', 'Default.svg'), blink: FG('byte', 'Blink.svg'),
      cheer:   FG('byte', 'Cheer.svg'),   happy: FG('byte', 'Happy.svg'),
      sad:     FG('byte', 'Sad.svg')
    },
    /* body берётся из состояния, остальное — послойно */
    moods: {
      idle:    { body: 'default', brows: 'default', eyes: 'default', mouth: 'default' },
      blink:   { body: 'default', brows: 'default', eyes: 'blink',   mouth: 'default' },
      cheer:   { body: 'cheer',   brows: 'cheer',   eyes: 'cheer',   mouth: 'cheer'   },
      happy:   { body: 'default', brows: 'happy',   eyes: 'happy',   mouth: 'happy'   },
      sad:     { body: 'default', brows: 'sad',     eyes: 'sad',     mouth: 'sad'     },
      /* состояний ниже в файлах нет — выводятся трансформацией */
      think:   { body: 'default', brows: '@down',   eyes: '@squint', mouth: '@flat'   },
      wow:     { body: 'default', brows: 'happy',   eyes: 'happy',   mouth: '@o'      },
      neutral: { body: 'default', brows: 'default', eyes: 'default', mouth: '@flat'   }
    }
  },

  sanych: {
    name: 'sanych',
    ref: 'default',
    /* файла Sad для Саныча нет — грустное состояние выводится
       трансформацией нарисованных слоёв, своего рисунка не добавляем */
    files: {
      default: FG('sanych', 'Default.svg'), blink: FG('sanych', 'Blink.svg'),
      cheer:   FG('sanych', 'Cheer.svg'),   happy: FG('sanych', 'Happy.svg')
    },
    moods: {
      idle:    { body: 'default', brows: 'default', eyes: 'default', mouth: 'default' },
      blink:   { body: 'default', brows: 'default', eyes: 'blink',   mouth: 'default' },
      cheer:   { body: 'cheer',   brows: 'cheer',   eyes: 'cheer',   mouth: 'cheer'   },
      happy:   { body: 'default', brows: 'happy',   eyes: 'happy',   mouth: 'happy'   },
      sad:     { body: 'default', brows: '@worried', eyes: '@sad',   mouth: '@frown'  },
      /* Рот у Саныча — это усы: крупная серая фигура. Производные формы
         (@flat, @o) рисуются её цветом и размером и дают поперёк лица
         серую полосу или овал. Поэтому здесь только нарисованные рты. */
      think:   { body: 'default', brows: '@down',   eyes: '@squint', mouth: 'default' },
      wow:     { body: 'default', brows: 'happy',   eyes: '@wide',   mouth: 'cheer'   },
      neutral: { body: 'default', brows: 'default', eyes: 'default', mouth: 'default' }
    }
  },
  nina: {
    name: 'nina',
    ref: 'default',
    /* Нина нарисована генератором tools/draw-nina.js в том же стиле,
       что правленые в Figma Байт и Саныч: файла Sad нет, грусть
       выводится трансформацией нарисованных слоёв. */
    files: {
      default: FG('nina', 'Default.svg'), blink: FG('nina', 'Blink.svg'),
      cheer:   FG('nina', 'Cheer.svg'),   happy: FG('nina', 'Happy.svg'),
      sad:     FG('nina', 'Sad.svg')
    },
    moods: {
      idle:    { body: 'default', brows: 'default', eyes: 'default', mouth: 'default' },
      blink:   { body: 'default', brows: 'default', eyes: 'blink',   mouth: 'default' },
      cheer:   { body: 'default', brows: 'cheer',   eyes: 'cheer',   mouth: 'cheer'   },
      happy:   { body: 'default', brows: 'happy',   eyes: 'happy',   mouth: 'happy'   },
      /* очки живут в слое глаз, поэтому масштабирующие производные
         состояния к ним не применяем — искажают оправу */
      sad:     { body: 'default', brows: 'sad',     eyes: 'sad',     mouth: 'sad'     },
      think:   { body: 'default', brows: '@down',   eyes: 'default', mouth: 'default' },
      wow:     { body: 'default', brows: 'happy',   eyes: 'default', mouth: 'cheer'   },
      neutral: { body: 'default', brows: 'default', eyes: 'default', mouth: 'default' }
    }
  }
};

const P = r => '<path fill="' + r.fill + '" fill-rule="evenodd" d="' + r.d + '"/>';
const defs = [];
const DATA = {};

for (const f of figs) {
  const n = f.name;
  if (FIGMA[n]) {
    const imp = importCharacter(FIGMA[n]);
    imp.defs.forEach(d => defs.push(d));
    DATA[n] = imp.data;
    console.log('  ' + n + ': из Figma');
    console.table(imp.report);
    continue;
  }

  const g = f.eyeGeom, p = f.parts, id = s => n + '-' + s;
  defs.push('<g id="' + id('body') + '">' + p.body.map(P).join('') + '</g>');
  if (p.front.length) defs.push('<g id="' + id('front') + '">' + p.front.map(P).join('') + '</g>');
  const side = (arr, e) => arr.filter(r => Math.abs(r.CX - e.cx) < e.rx * 1.7);
  (g || []).forEach((e, i) => {
    const parts = side(p.eyes, e).concat(side(p.pupils, e), side(p.sparks, e));
    defs.push('<g id="' + id('eye' + i) + '">' + parts.map(P).join('') + '</g>');
  });
  p.brows.forEach((r, i) => defs.push('<g id="' + id('brow' + i) + '">' + P(r) + '</g>'));
  if (p.mouth.length) defs.push('<g id="' + id('mouth') + '">' + p.mouth.map(P).join('') + '</g>');

  const pad = 14;
  const vbFull = [f.x0 - pad, f.y0 - pad, (f.x1 - f.x0) + pad * 2, (f.y1 - f.y0) + pad * 2].map(Math.round).join(' ');
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
   ПЕРСОНАЖИ
   Нина и Сан Саныч получены обводкой цветовых областей исходного растра
   (квантование палитры с допуском, связные области, контур по «трещинам»,
   упрощение Дугласа–Пекера), разметка на глаза / брови / рот — по геометрии.
   Байт нарисован вручную в Figma: по файлу на состояние, слои вынуты той же
   разметкой. Состояния, которых в файлах нет, выводятся трансформацией
   исходных слоёв — своего рисунка не добавляется.
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
  /* набор слоёв для настроения: у персонажа может быть свой */
  mood: function(name, m){
    var D = MDATA[name] || {};
    if(D.moods && D.moods[m]) return D.moods[m];
    if(D.moods && D.moods.idle && !MOODS[m]) return D.moods.idle;
    return MOODS[m] || MOODS.idle;
  },
  /* какое тело показывать для настроения */
  bodyId: function(name, m){
    var D = MDATA[name]; if(!D) return null;
    var set = MASCOT.mood(name, m);
    if(D.art && D.art.body){
      var key = D.art.body[set.body || 'default'] || D.art.body['default'];
      if(key) return name + '-body-' + key;
    }
    return name + '-body';
  },
  part: function(name, layer, state){
    var D = MDATA[name];
    if(!D || !state) return '';
    /* нарисованное состояние важнее выведенного трансформацией */
    if(state.charAt(0) !== '@' && D.art && D.art[layer] && D.art[layer][state])
      return useTag(name + '-' + layer + '-' + D.art[layer][state]);
    var st = state.charAt(0) === '@' ? state.slice(1) : state;
    var refKey = D.art && D.art[layer] ? (D.art[layer]['default'] || D.art[layer]['open'] || D.art[layer]['smile'] || D.art[layer]['neutral']) : null;
    var refId = refKey ? (name + '-' + layer + '-' + refKey) : null;

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
      var mid = (e0.cx + e1.cx) / 2;
      var whole = function(tf){
        if(refId) return useTag(refId, tf);
        return D.eyes.map(function(e, i){ return useTag(name + '-eye' + i, tf); }).join('');
      };
      if(st === "blink")  return line(e0, e0.ry * 0.45) + line(e1, e1.ry * 0.45);
      if(st === "happy")  return line(e0, -e0.ry * 1.5) + line(e1, -e1.ry * 1.5);
      if(st === "wide")   return whole(scaleAt(mid, e0.cy, 1.14, 1.14));
      if(st === "squint") return whole(scaleAt(mid, e0.cy, 1, 0.45));
      if(st === "sad")    return whole('') + D.eyes.map(lid).join('');
      return whole('');
    }
    if(layer === "brows"){
      var tilt = st === "down" ? -9 : st === "worried" ? 11 : 0;
      var lift = st === "up" ? D.lift * 1.6 : st === "worried" ? D.lift * 0.3 : st === "down" ? -D.lift * 0.5 : 0;
      if(refId){
        var mv = (lift ? 'translate(0 ' + (-lift).toFixed(1) + ')' : '');
        return useTag(refId, mv);
      }
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
      if(st === "flat")  return curve(0);
      if(st === "frown") return curve(-m.h * 0.55);
      if(st === "o")     return '<ellipse cx="' + m.cx + '" cy="' + m.cy + '" rx="' + (m.w * 0.26).toFixed(1) +
                                '" ry="' + (m.h * 0.5).toFixed(1) + '" fill="' + D.mouthFill + '"/>';
      if(st === "big")   return refId ? useTag(refId, scaleAt(m.cx, m.cy, 1.2, 1.2))
                                      : useTag(name + '-mouth', scaleAt(m.cx, m.cy, 1.2, 1.2));
      return refId ? useTag(refId) : useTag(name + '-mouth');
    }
    return '';
  },
  defs: function(){
    return '<svg id="mascot-defs" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' +
           '<defs>' + MDEFS + '</defs></svg>';
  },
  render: function(name, opts){
    opts = opts || {};
    var D = MDATA[name];
    if(!D) return '';
    var moodName = typeof opts.mood === "string" ? opts.mood : "idle";
    var m = typeof opts.mood === "string" ? MASCOT.mood(name, opts.mood) : (opts.mood || MOODS.idle);
    var head = opts.frame === "head";
    var vb = D.vb[head ? "head" : "full"];
    /* Портрет обязан обрезаться рамкой: у svg по умолчанию overflow visible,
       и у ростовых персонажей ниже головы дорисовывалось всё туловище. */
    return '<svg class="mascot' + (head ? ' is-head' : '') + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="' + vb +
      '" data-char="' + name + '" data-mood="' + moodName +
      '" role="img" aria-label="' + (opts.label || name) + '">' +
      '<use class="m-body" href="#' + MASCOT.bodyId(name, moodName) + '"/>' +
      '<g class="m-brows">' + MASCOT.part(name, "brows", m.brows) + '</g>' +
      '<g class="m-eyes">'  + MASCOT.part(name, "eyes",  m.eyes)  + '</g>' +
      '<g class="m-mouth">' + MASCOT.part(name, "mouth", m.mouth) + '</g>' +
      (D.hasFront ? useTag(name + '-front') : '') +
    '</svg>';
  }
};
`;

const icons = fs.readFileSync(path.join(__dirname, 'icons-source.js'), 'utf8');
const iconPart = icons.slice(icons.indexOf('/* иконки узлов пути */'));

const outFile = path.join(__dirname, '..', 'src', 'app', 'mascots-traced.js');
fs.writeFileSync(outFile, runtime + '\n' + iconPart, 'utf8');
console.log('\nsrc/app/mascots-traced.js:', (fs.statSync(outFile).size / 1024).toFixed(0) + ' КБ');
console.log('  групп в defs:', defs.length, '| размер defs:', (defs.join('').length / 1024).toFixed(0) + ' КБ');
for (const n of Object.keys(DATA)) {
  const a = DATA[n].art;
  console.log('  ' + n + ' — портрет ' + DATA[n].vb.head +
    (a ? ' | состояний: тело ' + Object.keys(a.body).length + ', глаза ' + Object.keys(a.eyes).length +
         ', брови ' + Object.keys(a.brows).length + ', рот ' + Object.keys(a.mouth).length : ''));
}
