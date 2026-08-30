/* Разовая правка: показ модалки разбора и обработчики. */
const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'src', 'app', 'app.js');
let s = fs.readFileSync(p, 'utf8');

if (s.indexOf('data-explain') >= 0) { console.log('уже подключено'); process.exit(0); }

/* --- отрисовка поверх экрана урока --- */
const oldLesson =
  '    lesson.innerHTML = screen === "lesson" ? vLesson()';
if (s.indexOf(oldLesson) < 0) { console.log('не найден блок урока'); process.exit(1); }
s = s.replace(oldLesson, '    var extra = exModal ? vExplain() : "";\n' + oldLesson);

/* дописываем модалку к разметке урока после присваивания */
const anchor = '                     : screen === "failed" ? vFailed() : vNoHearts();';
if (s.indexOf(anchor) < 0) { console.log('не найден конец выбора экрана'); process.exit(1); }
s = s.replace(anchor, anchor + '\n    lesson.innerHTML += extra;');

/* --- обработчики --- */
const hAnchor = '  if(A("data-next")){ nextEx(); return; }';
if (s.indexOf(hAnchor) < 0) { console.log('не найден якорь обработчиков'); process.exit(1); }
const handlers =
  '  /* ---- разбор задания ---- */\n' +
  '  if(A("data-explain")){ exModal = currentEx(); render(); return; }\n' +
  '  if(A("data-exclose")){ exModal = null; render(); return; }\n';
s = s.replace(hAnchor, handlers + hAnchor);

/* закрытие по Escape */
const kAnchor = 'document.addEventListener("keydown", function(e){\n  if(e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;';
if (s.indexOf(kAnchor) < 0) { console.log('не найден обработчик клавиш'); process.exit(1); }
s = s.replace(kAnchor, kAnchor +
  '\n\n  if(e.key === "Escape" && exModal){ exModal = null; render(); return; }\n' +
  '  if(exModal) return;                    /* пока открыт разбор, урок клавиши не слушает */');

fs.writeFileSync(p, s, 'utf8');
console.log('модалка разбора подключена');
