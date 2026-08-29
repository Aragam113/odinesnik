/* Разовая правка: маршрут экрана материалов и обработчики нажатий. */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'app', 'app.js');
let s = fs.readFileSync(p, 'utf8');

if (s.indexOf('data-bookopen') >= 0) { console.log('уже подключено'); process.exit(0); }

const oldRoute =
  '  v.innerHTML = screen === "path" ? vPath()\n' +
  '              : screen === "practice" ? vPractice()\n' +
  '              : screen === "ivhome" ? vIvHome()\n' +
  '              : screen === "ref" ? vRef() : vStats();';
const newRoute =
  '  v.innerHTML = screen === "path" ? vPath()\n' +
  '              : screen === "book" ? vBook()\n' +
  '              : screen === "practice" ? vPractice()\n' +
  '              : screen === "ivhome" ? vIvHome()\n' +
  '              : screen === "ref" ? vRef() : vStats();';
if (s.indexOf(oldRoute) < 0) { console.log('не найден маршрут'); process.exit(1); }
s = s.replace(oldRoute, newRoute);

const anchor = '  if(A("data-open")){';
const handlers =
  '  /* ---- материалы раздела ---- */\n' +
  '  if(A("data-bookopen")){\n' +
  '    bookUnit = A("data-bookopen"); bookNode = null; screen = "book";\n' +
  '    render();\n' +
  '    var mb = $("#main"); if(mb) mb.scrollTop = 0;\n' +
  '    try{ window.scrollTo(0, 0); }catch(e){}\n' +
  '    return;\n' +
  '  }\n' +
  '  if(A("data-bookclose")){ screen = "path"; bookUnit = null; bookNode = null; render(); return; }\n' +
  '  if(A("data-dianode")){\n' +
  '    bookNode = bookNode === A("data-dianode") ? null : A("data-dianode");\n' +
  '    render(); return;\n' +
  '  }\n' +
  '  if(A("data-bookcheck") !== null && A("data-bookcheck") !== undefined){\n' +
  '    var bc = BOOK[bookUnit].check, bp = +A("data-bookcheck");\n' +
  '    if(!S.bookChecked) S.bookChecked = {};\n' +
  '    S.bookChecked[bookUnit] = {pick: bp, ok: bp === bc.a};\n' +
  '    if(bp === bc.a) addXP(5);\n' +
  '    SFX[bp === bc.a ? "correct" : "wrong"]();\n' +
  '    save(); render(); return;\n' +
  '  }\n' +
  '  if(A("data-bookref")){\n' +
  '    var rid = A("data-bookref");\n' +
  '    screen = "ref"; refTab = rid.charAt(0) === "a" ? "arch" : "hood"; openRef = rid;\n' +
  '    render(); return;\n' +
  '  }\n';
if (s.indexOf(anchor) < 0) { console.log('не найден якорь'); process.exit(1); }
s = s.replace(anchor, handlers + anchor);

fs.writeFileSync(p, s, 'utf8');
console.log('route and handlers wired');
