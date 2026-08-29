/* =====================================================================
   ПЕРСОНАЖИ: векторный рисунок с разборной мимикой.
   Растр не трассируется — он перерисован примитивами, потому что
   трассировка даёт безымянные пути, из которых нельзя вынуть глаза и рот.
   Каждый персонаж собран из трёх слоёв, подменяемых на лету:
   .m-brows, .m-eyes, .m-mouth. Всё остальное — статичная база.
   ===================================================================== */

var PAL = {
  byte:   {body:"#F5C518", dark:"#E3A417", limb:"#E9B01C", foot:"#E0AE2C",
           ink:"#262523", tongue:"#E05A47", white:"#FFFFFF"},
  nina:   {skin:"#F5D2A8", skinD:"#E8BC8E", hair:"#6B4630", hairL:"#8B5E42",
           cloth:"#C0603C", clothD:"#A94F2F", cream:"#F2E7D2", folder:"#E8D5A8",
           folderD:"#C9AE79", glass:"#7A8590", lip:"#A8593F", blush:"#E8A78A",
           foot:"#4A3728", ink:"#2B2A26", white:"#FFFFFF"},
  sanych: {skin:"#F0C89C", skinD:"#DDB183", hair:"#A8AEB4", hairL:"#C2C7CC",
           beard:"#B4BAC0", beardL:"#C8CDD2", cloth:"#2E3A47", clothD:"#232D38",
           mug:"#EFE7D6", coffee:"#4A3524", lip:"#7A6553", ink:"#2B2A26", white:"#FFFFFF"}
};

/* ------- мелкие помощники ------- */
function eyeBall(cx, cy, rx, ry, px, py, pr, P){
  return '<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="'+P.white+'"/>'+
         '<ellipse cx="'+(cx+px)+'" cy="'+(cy+py)+'" rx="'+pr+'" ry="'+(pr*1.16)+'" fill="'+P.ink+'"/>'+
         '<circle cx="'+(cx+px-pr*0.42)+'" cy="'+(cy+py-pr*0.62)+'" r="'+(pr*0.36)+'" fill="'+P.white+'"/>';
}
function arc(x1,y1,x2,y2,bend,color,w){
  var mx=(x1+x2)/2, my=(y1+y2)/2 + bend;
  return '<path d="M'+x1+' '+y1+' Q'+mx+' '+my+' '+x2+' '+y2+'" fill="none" stroke="'+color+
         '" stroke-width="'+w+'" stroke-linecap="round"/>';
}

/* =====================================================================
   БАЙТ
   ===================================================================== */
var BYTE = {
  vb:{full:"0 0 200 200", head:"34 16 132 132"},
  base:function(P){
    return '<ellipse cx="100" cy="188" rx="54" ry="7" fill="#000" opacity=".10"/>'+
      '<ellipse cx="74" cy="168" rx="23" ry="13" fill="'+P.foot+'" transform="rotate(-14 74 168)"/>'+
      '<ellipse cx="126" cy="175" rx="23" ry="13" fill="'+P.foot+'" transform="rotate(11 126 175)"/>'+
      '<rect x="12" y="96" width="22" height="46" rx="11" fill="'+P.limb+'" transform="rotate(-30 23 119)"/>'+
      '<rect x="166" y="96" width="22" height="46" rx="11" fill="'+P.limb+'" transform="rotate(30 177 119)"/>'+
      '<rect x="95" y="20" width="9" height="26" rx="4.5" fill="'+P.limb+'"/>'+
      '<circle cx="99.5" cy="18" r="10" fill="'+P.ink+'"/>'+
      '<rect x="42" y="40" width="116" height="112" rx="33" fill="'+P.body+'"/>'+
      '<path d="M42 120 h116 v-1 a33 33 0 0 1-33 33 h-50 a33 33 0 0 1-33-33z" fill="'+P.dark+'"/>';
  },
  brows:function(s, P){
    var w = 9, c = P.ink;
    if(s === "up")      return arc(64,52,90,46,-4,c,w) + arc(110,46,136,52,-4,c,w);
    if(s === "down")    return arc(64,48,90,60,2,c,w)  + arc(110,60,136,48,2,c,w);
    if(s === "worried") return arc(64,62,90,50,-2,c,w) + arc(110,50,136,62,-2,c,w);
    return arc(64,59,90,51,-3,c,w) + arc(110,51,136,59,-3,c,w);          /* neutral */
  },
  eyes:function(s, P){
    var L = 78, R = 122, Y = 90;
    if(s === "blink")  return arc(L-14,Y,L+14,Y,4,P.ink,6) + arc(R-14,Y,R+14,Y,4,P.ink,6);
    if(s === "happy")  return arc(L-15,Y+6,L+15,Y+6,-17,P.ink,7) + arc(R-15,Y+6,R+15,Y+6,-17,P.ink,7);
    if(s === "sad")    return eyeBall(L,Y+3,16,17,0,4,8,P) + eyeBall(R,Y+3,16,17,0,4,8,P) +
                              '<path d="M'+(L-17)+' '+(Y-8)+' q17-11 34-2 v-12 h-34z" fill="'+P.body+'"/>'+
                              '<path d="M'+(R-17)+' '+(Y-10)+' q17-9 34 2 v-14 h-34z" fill="'+P.body+'"/>';
    if(s === "wide")   return eyeBall(L,Y,18,21,0,0,10.5,P) + eyeBall(R,Y,18,21,0,0,10.5,P);
    if(s === "squint") return eyeBall(L,Y,17,10,0,0,7.5,P) + eyeBall(R,Y,17,10,0,0,7.5,P);
    return eyeBall(L,Y,17,20,1,2,8.6,P) + eyeBall(R,Y,17,20,1,2,8.6,P);   /* open */
  },
  mouth:function(s, P, uid){
    if(s === "open" || s === "big"){
      var big = s === "big";
      var w = big ? 30 : 25, h = big ? 30 : 25;
      return '<defs><clipPath id="'+uid+'m"><path d="M'+(100-w)+' 112 h'+(2*w)+' a'+w+' '+h+' 0 0 1 -'+(2*w)+' 0z"/></clipPath></defs>'+
        '<path d="M'+(100-w)+' 112 h'+(2*w)+' a'+w+' '+h+' 0 0 1 -'+(2*w)+' 0z" fill="'+P.ink+'"/>'+
        '<ellipse cx="100" cy="'+(112+h*0.86)+'" rx="'+(w*0.56)+'" ry="'+(h*0.42)+'" fill="'+P.tongue+'" clip-path="url(#'+uid+'m)"/>';
    }
    if(s === "frown") return arc(84,128,116,128,-11,P.ink,6);
    if(s === "flat")  return arc(84,124,116,124,0,P.ink,6);
    if(s === "o")     return '<ellipse cx="100" cy="124" rx="13" ry="15" fill="'+P.ink+'"/>';
    return arc(82,118,118,118,13,P.ink,6);                                 /* smile */
  }
};

/* =====================================================================
   НИНА ПЕТРОВНА
   ===================================================================== */
var NINA = {
  vb:{full:"0 0 200 200", head:"44 8 112 112"},
  base:function(P){
    return '<ellipse cx="100" cy="190" rx="50" ry="6.5" fill="#000" opacity=".10"/>'+
      '<ellipse cx="80" cy="177" rx="17" ry="10" fill="'+P.foot+'"/>'+
      '<ellipse cx="122" cy="177" rx="17" ry="10" fill="'+P.foot+'"/>'+
      '<path d="M46 172 q2-52 54-52 t54 52z" fill="'+P.cloth+'"/>'+
      '<path d="M84 121 h32 l-16 20z" fill="'+P.cream+'"/>'+
      '<circle cx="100" cy="146" r="3.4" fill="'+P.clothD+'"/>'+
      '<circle cx="100" cy="160" r="3.4" fill="'+P.clothD+'"/>'+
      '<ellipse cx="47" cy="150" rx="11" ry="13" fill="'+P.cloth+'"/>'+
      '<ellipse cx="153" cy="150" rx="11" ry="13" fill="'+P.cloth+'"/>'+
      '<g transform="rotate(7 140 150)">'+
        '<rect x="120" y="126" width="38" height="46" rx="4" fill="'+P.folder+'"/>'+
        '<rect x="120" y="126" width="10" height="46" fill="'+P.folderD+'"/>'+
        '<rect x="136" y="140" width="16" height="3.4" rx="1.7" fill="'+P.folderD+'"/>'+
        '<rect x="136" y="150" width="16" height="3.4" rx="1.7" fill="'+P.folderD+'"/>'+
      '</g>'+
      '<ellipse cx="130" cy="160" rx="11" ry="12" fill="'+P.skin+'"/>'+
      /* уши */
      '<ellipse cx="55" cy="90" rx="9" ry="12" fill="'+P.skin+'"/>'+
      '<ellipse cx="145" cy="90" rx="9" ry="12" fill="'+P.skin+'"/>'+
      /* волосы сзади + пучок */
      '<circle cx="100" cy="30" r="20" fill="'+P.hair+'"/>'+
      '<path d="M100 14 a16 16 0 0 1 14 9 a17 17 0 0 0-24 4z" fill="'+P.hairL+'"/>'+
      '<path d="M56 96 q-3-58 44-58 t44 58 q4-22-8-34 q-14-14-36-14 t-36 14 q-12 12-8 34z" fill="'+P.hair+'"/>'+
      '<circle cx="100" cy="86" r="46" fill="'+P.skin+'"/>'+
      /* чёлка поверх лица */
      '<path d="M56 92 q0-50 44-50 t44 50 q-6-26-44-26 t-44 26z" fill="'+P.hair+'"/>'+
      '<path d="M62 60 q14-18 38-18 q-22 4-34 22z" fill="'+P.hairL+'"/>'+
      '<ellipse cx="72" cy="104" rx="8" ry="5" fill="'+P.blush+'" opacity=".45"/>'+
      '<ellipse cx="128" cy="104" rx="8" ry="5" fill="'+P.blush+'" opacity=".45"/>';
  },
  glasses:function(P){
    return '<g class="m-glass" fill="none" stroke="'+P.glass+'" stroke-width="3">'+
      '<circle cx="79" cy="92" r="19"/><circle cx="121" cy="92" r="19"/>'+
      '<path d="M98 92 h4"/><path d="M60 90 l-5-2"/><path d="M140 90 l5-2"/></g>';
  },
  brows:function(s, P){
    var w = 3.6, c = P.hair;
    if(s === "up")      return arc(66,66,92,63,-6,c,w) + arc(108,63,134,66,-6,c,w);
    if(s === "down")    return arc(66,64,92,71,1,c,w)  + arc(108,71,134,64,1,c,w);
    if(s === "worried") return arc(66,74,92,66,-2,c,w) + arc(108,66,134,74,-2,c,w);
    return arc(66,72,92,66,-5,c,w) + arc(108,66,134,72,-5,c,w);
  },
  eyes:function(s, P){
    var L = 79, R = 121, Y = 92;
    if(s === "blink")  return arc(L-11,Y,L+11,Y,4,P.ink,5) + arc(R-11,Y,R+11,Y,4,P.ink,5);
    if(s === "happy")  return arc(L-12,Y+5,L+12,Y+5,-14,P.ink,5.5) + arc(R-12,Y+5,R+12,Y+5,-14,P.ink,5.5);
    if(s === "sad")    return eyeBall(L,Y+2,12,14,0,3,6.5,P) + eyeBall(R,Y+2,12,14,0,3,6.5,P)+
                              '<path d="M'+(L-13)+' '+(Y-6)+' q13-9 26-1 v-10 h-26z" fill="'+P.skin+'"/>'+
                              '<path d="M'+(R-13)+' '+(Y-7)+' q13-8 26 1 v-11 h-26z" fill="'+P.skin+'"/>';
    if(s === "wide")   return eyeBall(L,Y,14,16,0,0,8,P) + eyeBall(R,Y,14,16,0,0,8,P);
    if(s === "squint") return eyeBall(L,Y,13,8,0,0,6,P) + eyeBall(R,Y,13,8,0,0,6,P);
    return eyeBall(L,Y,13,15,0,1,6.8,P) + eyeBall(R,Y,13,15,0,1,6.8,P);
  },
  mouth:function(s, P){
    if(s === "open" || s === "big")
      return '<path d="M88 118 h24 a12 13 0 0 1-24 0z" fill="'+P.lip+'"/>'+
             '<ellipse cx="100" cy="128" rx="7" ry="4" fill="#D98A78"/>';
    if(s === "frown") return arc(90,124,110,124,-7,P.lip,3.4);
    if(s === "flat")  return arc(90,121,110,121,0,P.lip,3.4);
    if(s === "o")     return '<ellipse cx="100" cy="121" rx="7" ry="8.5" fill="'+P.lip+'"/>';
    return arc(88,116,112,116,9,P.lip,3.4) +
           '<path d="M100 108 q3 3 0 5" fill="none" stroke="'+P.skinD+'" stroke-width="2.4" stroke-linecap="round"/>';
  }
};

/* =====================================================================
   САН САНЫЧ
   ===================================================================== */
var SANYCH = {
  vb:{full:"0 0 200 200", head:"44 8 112 112"},
  base:function(P){
    return '<ellipse cx="100" cy="190" rx="52" ry="6.5" fill="#000" opacity=".10"/>'+
      '<ellipse cx="80" cy="177" rx="18" ry="10" fill="'+P.cloth+'"/>'+
      '<ellipse cx="122" cy="177" rx="18" ry="10" fill="'+P.cloth+'"/>'+
      '<path d="M44 172 q2-54 56-54 t56 54z" fill="'+P.cloth+'"/>'+
      '<path d="M44 172 q2-54 56-54 v54z" fill="'+P.clothD+'" opacity=".45"/>'+
      '<path d="M68 120 q32 22 64 0 q-8 16-32 16 t-32-16z" fill="'+P.clothD+'"/>'+
      '<ellipse cx="45" cy="152" rx="11" ry="13" fill="'+P.cloth+'"/>'+
      '<ellipse cx="155" cy="152" rx="11" ry="13" fill="'+P.cloth+'"/>'+
      '<g transform="rotate(-5 128 150)">'+
        '<rect x="112" y="136" width="34" height="30" rx="4" fill="'+P.mug+'"/>'+
        '<path d="M146 143 q11 7 0 14" fill="none" stroke="'+P.mug+'" stroke-width="5"/>'+
        '<ellipse cx="129" cy="139" rx="15" ry="4.4" fill="'+P.coffee+'"/>'+
      '</g>'+
      '<ellipse cx="112" cy="158" rx="11" ry="12" fill="'+P.skin+'"/>'+
      '<ellipse cx="55" cy="90" rx="9" ry="12" fill="'+P.skin+'"/>'+
      '<ellipse cx="145" cy="90" rx="9" ry="12" fill="'+P.skin+'"/>'+
      /* волосы: шапка с зачёсом */
      '<path d="M54 88 q-2-52 46-52 t46 52 q2-30-14-40 q-14-9-32-9 t-32 9 q-16 10-14 40z" fill="'+P.hair+'"/>'+
      '<circle cx="100" cy="84" r="46" fill="'+P.skin+'"/>'+
      '<path d="M54 84 q0-48 46-48 t46 48 q-4-30-46-30 t-46 30z" fill="'+P.hair+'"/>'+
      '<path d="M60 62 q16-20 40-20 q-24 6-34 24z" fill="'+P.hairL+'"/>'+
      /* борода: подбородок и щёки ниже глаз */
      '<path d="M58 96 q6 38 42 38 t42-38 q-6 22-42 22 t-42-22z" fill="'+P.beard+'"/>'+
      '<path d="M58 96 q4 26 22 34 q-14-14-16-34z" fill="'+P.beardL+'"/>';
  },
  brows:function(s, P){
    var w = 8, c = P.hair;
    if(s === "up")      return arc(62,60,92,55,-5,c,w) + arc(108,55,138,60,-5,c,w);
    if(s === "down")    return arc(62,58,92,68,2,c,w)  + arc(108,68,138,58,2,c,w);
    if(s === "worried") return arc(62,70,92,60,-3,c,w) + arc(108,60,138,70,-3,c,w);
    return arc(62,64,92,62,-2,c,w) + arc(108,62,138,64,-2,c,w);
  },
  eyes:function(s, P){
    var L = 80, R = 120, Y = 88;
    /* фирменная деталь: тяжёлое верхнее веко */
    function lid(cx, tilt){
      return '<path d="M'+(cx-15)+' '+(Y-4+tilt)+' q15-10 30-'+(4+tilt)+' v-12 h-30z" fill="'+P.skin+'"/>'+
             arc(cx-15, Y-4+tilt, cx+15, Y-tilt, -3, P.skinD, 2.2);
    }
    if(s === "blink")  return arc(L-13,Y,L+13,Y,4,P.ink,5.5) + arc(R-13,Y,R+13,Y,4,P.ink,5.5);
    if(s === "happy")  return arc(L-14,Y+5,L+14,Y+5,-15,P.ink,6) + arc(R-14,Y+5,R+14,Y+5,-15,P.ink,6);
    if(s === "sad")    return eyeBall(L,Y+2,14,15,0,3,7,P) + eyeBall(R,Y+2,14,15,0,3,7,P) + lid(L,4) + lid(R,4);
    if(s === "wide")   return eyeBall(L,Y,15,17,0,0,8.5,P) + eyeBall(R,Y,15,17,0,0,8.5,P);
    if(s === "squint") return eyeBall(L,Y,14,8,0,0,6.5,P) + eyeBall(R,Y,14,8,0,0,6.5,P);
    return eyeBall(L,Y,14,16,0,1,7.4,P) + eyeBall(R,Y,14,16,0,1,7.4,P) + lid(L,0) + lid(R,0);
  },
  mouth:function(s, P){
    var must = '<path d="M78 108 q22-9 44 0 q-22 8-44 0z" fill="'+P.beardL+'"/>';
    if(s === "open" || s === "big")
      return must + '<ellipse cx="100" cy="122" rx="12" ry="9" fill="'+P.lip+'"/>';
    if(s === "smile") return must + arc(88,118,112,118,7,P.lip,3.6);
    if(s === "flat")  return must + arc(88,119,112,119,0,P.lip,3.6);
    if(s === "o")     return must + '<ellipse cx="100" cy="121" rx="7" ry="9" fill="'+P.lip+'"/>';
    return must + arc(88,122,112,122,-8,P.lip,3.6);                        /* frown — базовое */
  }
};

/* =====================================================================
   СБОРКА И ПРЕСЕТЫ
   ===================================================================== */
var CHARS = {byte:BYTE, nina:NINA, sanych:SANYCH};

/* пресет = набор из трёх слоёв. Именно так устроен стейт-машинный подход:
   состояние меняет не картинку целиком, а отдельные части лица. */
var MOODS = {
  idle:     {brows:"neutral", eyes:"open",   mouth:"smile"},
  blink:    {brows:"neutral", eyes:"blink",  mouth:"smile"},
  happy:    {brows:"up",      eyes:"happy",  mouth:"open"},
  cheer:    {brows:"up",      eyes:"happy",  mouth:"big"},
  sad:      {brows:"worried", eyes:"sad",    mouth:"frown"},
  think:    {brows:"down",    eyes:"squint", mouth:"flat"},
  wow:      {brows:"up",      eyes:"wide",   mouth:"o"},
  neutral:  {brows:"neutral", eyes:"open",   mouth:"flat"}
};
/* у Саныча покой — скептический прищур, это его характер */
var MOOD_OVERRIDE = {sanych:{idle:{brows:"neutral", eyes:"open", mouth:"frown"}}};

var MASCOT = {
  _n: 0,
  moods: MOODS,
  names: ["byte","nina","sanych"],
  mood: function(name, mood){
    var m = (MOOD_OVERRIDE[name] && MOOD_OVERRIDE[name][mood]) || MOODS[mood] || MOODS.idle;
    return m;
  },
  /* части — нужны движку, он подменяет их без перерисовки всей фигуры */
  part: function(name, layer, state, uid){
    var C = CHARS[name], P = PAL[name];
    return C[layer](state, P, uid || ("u" + (++MASCOT._n)));
  },
  render: function(name, opts){
    opts = opts || {};
    var C = CHARS[name], P = PAL[name];
    var mood = typeof opts.mood === "string" ? MASCOT.mood(name, opts.mood) : (opts.mood || MOODS.idle);
    var uid = "m" + (++MASCOT._n);
    var frame = C.vb[opts.frame === "head" ? "head" : "full"];
    return '<svg class="mascot' + (opts.cls ? " " + opts.cls : "") + '" viewBox="' + frame +
      '" data-char="' + name + '" role="img" aria-label="' + (opts.label || name) + '">' +
      '<g class="m-body">' + C.base(P) + '</g>' +
      '<g class="m-face">' +
        '<g class="m-brows">' + C.brows(mood.brows, P) + '</g>' +
        '<g class="m-eyes">'  + C.eyes(mood.eyes, P) + '</g>' +
        '<g class="m-mouth">' + C.mouth(mood.mouth, P, uid) + '</g>' +
      '</g>' +
      (C.glasses ? C.glasses(P) : "") +
    '</svg>';
  }
};


/* иконки узлов пути */
var ICON = {
  star:'<svg viewBox="0 0 24 24"><path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  boss:'<svg viewBox="0 0 24 24"><path d="M4 17h16l1.2-9-5 3.2L12 4.5 7.8 11.2l-5-3.2z"/></svg>',
  chat:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9.5L5 19.5V16H4z"/></svg>',
  lock:'<svg viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0110 0v2h1.2v10H5.8V10zm2.6 0h4.8V8a2.4 2.4 0 00-4.8 0z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path d="M12 20.4l-1.5-1.35C5.2 14.3 2 11.4 2 7.9 2 5.1 4.2 3 7 3c1.6 0 3.1.74 4 1.9C11.9 3.74 13.4 3 15 3c2.8 0 5 2.1 5 4.9 0 3.5-3.2 6.4-8.5 11.15z"/></svg>',
  flame:'<svg viewBox="0 0 24 24"><path d="M12 2c1.5 4-2.5 5.5-2.5 9A2.5 2.5 0 0012 13.5 2.5 2.5 0 0014.5 11c0-1-.5-2-.5-2 2 1.5 3.5 3.6 3.5 6a5.5 5.5 0 01-11 0c0-4.5 4-7 5.5-13z"/></svg>',
  bolt:'<svg viewBox="0 0 24 24"><path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/></svg>'
};
