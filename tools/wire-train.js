/* Объединяет «Запросы» и «Собес» в одну вкладку «Тренировки»
   с переключателем режима наверху. */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'app', 'app.js');
let s = fs.readFileSync(p, 'utf8');

if (s.indexOf('data-train') >= 0) { console.log('уже подключено'); process.exit(0); }

/* --- одна вкладка вместо двух --- */
const oldTabs =
  '  {id:"ql", n:"Запросы", ic:\'<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/></svg>\'},\n' +
  '  {id:"iv", n:"Собес", ic:\'<svg viewBox="0 0 24 24"><path d="M4 4h16v12H9l-5 4z"/><circle cx="9" cy="10" r="1.4" fill="#fff"/><circle cx="12" cy="10" r="1.4" fill="#fff"/><circle cx="15" cy="10" r="1.4" fill="#fff"/></svg>\'},\n';
if (s.indexOf(oldTabs) < 0) { console.log('не найдены вкладки'); process.exit(1); }
const newTab =
  '  {id:"train", n:"Тренировки", ic:\'<svg viewBox="0 0 24 24">' +
  '<path d="M2 12h2.5M19.5 12H22"/>' +
  '<rect x="4.5" y="8.5" width="3.5" height="7" rx="1.4"/>' +
  '<rect x="16" y="8.5" width="3.5" height="7" rx="1.4"/>' +
  '<rect x="8" y="10.6" width="8" height="2.8" rx="1.2"/></svg>\'},\n';
s = s.replace(oldTabs, newTab);

/* --- подсветка вкладки на всех экранах режима --- */
const oldCur = 'var cur = screen === t.id || (t.id === "iv" && (screen === "ivhome" || screen === "iv" || screen === "ivdone"));';
if (s.indexOf(oldCur) < 0) { console.log('не найдена подсветка'); process.exit(1); }
s = s.replace(oldCur,
  'var cur = screen === t.id ||\n' +
  '      (t.id === "train" && ["train", "ivhome", "iv", "ivdone", "ql"].indexOf(screen) >= 0);');

/* --- маршрут --- */
s = s.replace('              : screen === "ql" ? vQL()',
              '              : screen === "train" ? vTrain()');
s = s.replace('              : screen === "ivhome" ? vIvHome()\n', '');

/* --- переключение режима --- */
const hAnchor = '  if(A("data-qlopen")){';
if (s.indexOf(hAnchor) < 0) { console.log('не найден якорь'); process.exit(1); }
s = s.replace(hAnchor,
  '  if(A("data-train")){ trainMode = A("data-train"); save(); render(); return; }\n' + hAnchor);

/* --- возвраты ведут во вкладку тренировок --- */
s = s.replace('  if(A("data-iv-quit")){ screen = "ivhome"; IVS = null; render(); return; }',
              '  if(A("data-iv-quit")){ screen = "train"; IVS = null; render(); return; }');
s = s.split('screen = (LS && LS.lesson && LS.lesson.kind === "ql") ? "ql" : "path";')
     .join('screen = (LS && LS.lesson && LS.lesson.kind === "ql") ? "train" : "path";');

/* вкладка iv больше не существует: переводим старый переход */
s = s.replace('if(A("data-tab")){ screen = A("data-tab") === "iv" ? "ivhome" : A("data-tab");',
              'if(A("data-tab")){ screen = A("data-tab");');

fs.writeFileSync(p, s, 'utf8');
console.log('вкладка «Тренировки» подключена');
