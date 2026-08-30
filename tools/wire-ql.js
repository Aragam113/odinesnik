/* Разовая правка: вкладка, маршрут и обработчики тренажёра запросов. */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'app', 'app.js');
let s = fs.readFileSync(p, 'utf8');

if (s.indexOf('data-qlstart') >= 0) { console.log('уже подключено'); process.exit(0); }

/* --- вкладка между «Разбор» и «Собес» --- */
const tabAnchor = '  {id:"iv", n:"Собес",';
if (s.indexOf(tabAnchor) < 0) { console.log('не найден список вкладок'); process.exit(1); }
const qlTab = '  {id:"ql", n:"Запросы", ic:\'<svg viewBox="0 0 24 24">' +
  '<ellipse cx="12" cy="6" rx="7.5" ry="3"/>' +
  '<path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/>' +
  '<path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></svg>\'},\n';
s = s.replace(tabAnchor, qlTab + tabAnchor);

/* --- маршрут экрана --- */
const oldRoute = '              : screen === "book" ? vBook()';
if (s.indexOf(oldRoute) < 0) { console.log('не найден маршрут'); process.exit(1); }
s = s.replace(oldRoute, '              : screen === "ql" ? vQL()\n' + oldRoute);

/* --- обработчики --- */
const hAnchor = '  if(A("data-lesson") !== null && A("data-lesson") !== undefined){ startLesson(+A("data-lesson")); return; }';
if (s.indexOf(hAnchor) < 0) { console.log('не найден якорь обработчиков'); process.exit(1); }
const handlers =
  '  /* ---- тренажёр запросов ---- */\n' +
  '  if(A("data-qlopen")){ qlOpen = qlOpen === A("data-qlopen") ? "" : A("data-qlopen"); render(); return; }\n' +
  '  if(A("data-qlstart")){ qlStart(A("data-qlstart")); return; }\n';
s = s.replace(hAnchor, handlers + hAnchor);

/* --- выход из тренажёра возвращает к нему, а не на путь --- */
const backOld = '  if(A("data-back")){ screen = "path"; LS = null; render(); return; }';
if (s.indexOf(backOld) < 0) { console.log('не найден выход из урока'); process.exit(1); }
s = s.replace(backOld,
  '  if(A("data-back")){\n' +
  '    /* из тренажёра возвращаемся в тренажёр, а не на путь */\n' +
  '    screen = (LS && LS.lesson && LS.lesson.kind === "ql") ? "ql" : "path";\n' +
  '    LS = null; render(); return;\n' +
  '  }');

/* выход по крестику из урока тренажёра — туда же */
const quitOld = '  if(A("data-quit")){ if(confirm("Не бросай на середине — прогресс этого подхода не сохранится. Точно выйти?")){ screen = "path"; LS = null; render(); } return; }';
if (s.indexOf(quitOld) >= 0) {
  s = s.replace(quitOld,
    '  if(A("data-quit")){\n' +
    '    if(confirm("Не бросай на середине — прогресс этого подхода не сохранится. Точно выйти?")){\n' +
    '      screen = (LS && LS.lesson && LS.lesson.kind === "ql") ? "ql" : "path";\n' +
    '      LS = null; render();\n' +
    '    }\n' +
    '    return;\n' +
    '  }');
}

fs.writeFileSync(p, s, 'utf8');
console.log('тренажёр запросов подключён');
