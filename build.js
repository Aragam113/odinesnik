/* =====================================================================
   Сборка. Из исходников получаются два файла:
     index.html          — самостоятельная страница для хостинга
     dist/artifact.html  — то же тело без <head>, для публикации артефактом
   Прогресс нигде не отправляется на сервер: всё в localStorage браузера.
   ===================================================================== */
const fs = require('fs');
const path = require('path');

const R = __dirname;
const read = (...p) => fs.readFileSync(path.join(R, ...p), 'utf8');

/* порядок важен: TERMS2/TERMS3 дополняют TERMS, LIBRARY дописывается в terms-slang */
const DATA = ['terms.js', 'theory.js', 'exercises.js', 'terms-extra.js', 'terms-slang.js', 'interview-bank.js', 'book.js'];
const APP  = ['sfx.js', 'engine.js', 'runner.js', 'interview.js', 'book.js', 'views.js', 'interview-views.js', 'app.js'];

const helpers = `
/* ---------- утилиты ---------- */
var $ = function(s){ return document.querySelector(s); };
var esc = function(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
var CARDS = TERMS.concat(TERMS2, TERMS3);

var KW = {};
"ВЫБРАТЬ,РАЗРЕШЕННЫЕ,ПЕРВЫЕ,РАЗЛИЧНЫЕ,ИЗ,ГДЕ,КАК,ПО,ЛЕВОЕ,ПРАВОЕ,ПОЛНОЕ,ВНУТРЕННЕЕ,СОЕДИНЕНИЕ,СГРУППИРОВАТЬ,УПОРЯДОЧИТЬ,ИТОГИ,ОБЩИЕ,ПОМЕСТИТЬ,ИНДЕКСИРОВАТЬ,ОБЪЕДИНИТЬ,ВСЕ,ИМЕЮЩИЕ,ЕСТЬ,NULL,И,ИЛИ,НЕ,В,ИЕРАРХИИ,ЗНАЧЕНИЕ,ВОЗР,УБЫВ,Процедура,Функция,КонецПроцедуры,КонецФункции,Если,Тогда,ИначеЕсли,Иначе,КонецЕсли,Цикл,КонецЦикла,Для,Каждого,Новый,Возврат,Истина,Ложь,ЛОЖЬ,Неопределено,Перем,Попытка,Исключение,КонецПопытки"
 .split(",").forEach(function(w){ KW[w]=1; });
var FNW = {};
"ЕСТЬNULL,ВЫРАЗИТЬ,Остатки,Обороты,ОстаткиИОбороты,СрезПоследних,СрезПервых,СУММА,КОЛИЧЕСТВО,МАКСИМУМ,МИНИМУМ,СРЕДНЕЕ,ПОДСТРОКА,ДАТАВРЕМЯ"
 .split(",").forEach(function(w){ FNW[w]=1; });
var DIR = {НаКлиенте:1,НаСервере:1,НаСервереБезКонтекста:1,НаКлиентеНаСервереБезКонтекста:1,Вместо:1,После:1,Перед:1};

function hl(code){
  return esc(code).replace(/(\\/\\/[^\\n]*)|("[^"]*")|(&amp;[A-Za-zА-Яа-яЁё_][A-Za-zА-Яа-яЁё0-9_]*)|([A-Za-zА-Яа-яЁё_][A-Za-zА-Яа-яЁё0-9_]*)/g,
  function(mm, cm, str, amp, id){
    if(cm) return '<span class="cm">'+cm+'</span>';
    if(str) return '<span class="str">'+str+'</span>';
    if(amp){ var w = amp.slice(5); return '<span class="'+(DIR[w]?"fn":"n")+'">'+amp+'</span>'; }
    if(id){
      if(KW[id]) return '<span class="kw">'+id+'</span>';
      if(FNW[id]) return '<span class="fn">'+id+'</span>';
    }
    return mm;
  });
}
`;

const TITLE = 'Тренажёр одинэсника';
const DESC  = 'Тренажёр для входа в 1С-разработку с нуля: путь из уроков, термины, живой сленг, ' +
              'практикум по запросам и вопросы с собеседований. Прогресс хранится в браузере.';

const styleBlock =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Unbounded:wght@700;800&family=JetBrains+Mono:wght@400;500;700&display=swap">\n' +
  '<style>\n' + read('src/app/style.css') + '\n</style>';

const markup = `
<div class="app">
  <header class="hud" id="hud"></header>
  <main class="main" id="main"><div class="wrap" id="view"></div></main>
  <nav class="tabs" id="tabs"></nav>
</div>
<div class="lesson-host hidden" id="lesson"></div>
`;

const scripts =
  DATA.map(f => '<script>\n' + read('src/data', f) + '\n</script>').join('\n') + '\n' +
  '<script>\n' + read('src/app/units.js') + '\n' + read('src/app/build-exercises.js') + '\n</script>\n' +
  '<script>\n' + read('src/app/mascots-traced.js') + '\n' + read('src/app/rig.js') + '\n</script>\n' +
  '<script>\n(function(){\n"use strict";\n' + helpers + '\n' +
  APP.map(f => read('src/app', f)).join('\n') + '\n})();\n</script>';

/* ---------- тело для артефакта: <title> внутри, <head> добавит вьюер ---------- */
const artifactBody = '<title>' + TITLE + '</title>\n' + styleBlock + '\n' + markup + '\n' + scripts + '\n';
fs.mkdirSync(path.join(R, 'dist'), { recursive: true });
fs.writeFileSync(path.join(R, 'dist/artifact.html'), artifactBody, 'utf8');

/* ---------- самостоятельная страница для хостинга ---------- */
const favicon = encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="#FFC800"/>' +
  '<text x="32" y="44" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="30" fill="#2B2A26">1С</text></svg>');

const standalone = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#FBF9F4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#16150F" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,${favicon}">
<style>
  :root{color-scheme:light dark}
  html,body{margin:0}
  img{max-width:100%}
  [hidden]{display:none!important}
</style>
${styleBlock}
</head>
<body>
${markup}
${scripts}
</body>
</html>
`;
fs.writeFileSync(path.join(R, 'index.html'), standalone, 'utf8');

const kb = f => (fs.statSync(path.join(R, f)).size / 1024).toFixed(0) + ' КБ';
console.log('index.html         ', kb('index.html'), '  — для хостинга');
console.log('dist/artifact.html ', kb('dist/artifact.html'), '  — для публикации артефактом');
