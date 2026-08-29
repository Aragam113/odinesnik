/* Оборачивает файл артефакта так же, как это делает вьюер:
   doctype + head с charset/viewport + сброс стилей + body.
   Дополнительно вставляет замеры переполнения по горизонтали. */
const fs = require('fs');
const body = fs.readFileSync(require('path').join(__dirname,'..','dist','artifact.html'), 'utf8');
const theme = process.argv[2] || '';          // '', 'light', 'dark'
const goTo = process.argv[3] || '';           // имя вкладки или сценарий
const outFile = process.argv[4] || 'preview.html';

const measure = `
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var de = document.documentElement;
    var over = [];
    document.querySelectorAll('*').forEach(function(el){
      var r = el.getBoundingClientRect();
      if(r.width > 0 && (r.right > de.clientWidth + 1 || r.left < -1)){
        over.push(el.tagName + '.' + (el.className||'').toString().slice(0,40) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']');
      }
    });
    var box = document.createElement('div');
    box.id = 'MEASURE';
    box.style.cssText = 'position:fixed;left:0;bottom:0;z-index:9999;background:#000;color:#0f0;font:11px monospace;padding:4px;max-width:100%;display:none';
    box.textContent = 'viewport=' + de.clientWidth + ' scrollW=' + de.scrollWidth +
      ' overflow=' + (de.scrollWidth - de.clientWidth) + ' || ' + (over.length ? over.slice(0,14).join(' | ') : 'нет вылезающих');
    document.body.appendChild(box);
  }, 300);
});
</script>`;

const nav = goTo ? `
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var go = ${JSON.stringify(goTo)};
    if(go.indexOf('tab:') === 0){
      var b = document.querySelector('[data-tab="' + go.slice(4) + '"]'); if(b) b.click();
    }
    if(go === 'lesson'){ var n = document.querySelector('[data-lesson]'); if(n) n.click(); }

    /* Автопрохождение урока. Запоминает верные ответы, увиденные в разборе,
       поэтому повторно поставленные в очередь ошибки на втором заходе решаются. */
    if(go === 'fb-ok' || go === 'fb-no' || go === 'done'){
      var start = document.querySelector('[data-lesson]'); if(start) start.click();
      var known = {}, guard = 0;
      var loop = setInterval(function(){
        guard++;
        if(guard > 400){ clearInterval(loop); return; }

        if(document.querySelector('.finish')){ clearInterval(loop); return; }

        var fbOk = document.querySelector('.fb.ok'), fbNo = document.querySelector('.fb.no');
        if(fbOk || fbNo){
          var q = (document.querySelector('.ex-q')||{}).textContent || '';
          var right = document.querySelector('.opt.ok');
          if(right) known[q] = right.textContent.replace(/^\\s*\\d+\\s*/, '').trim();
          if(go === 'fb-ok' && fbOk){ clearInterval(loop); return; }
          if(go === 'fb-no' && fbNo){ clearInterval(loop); return; }
          document.querySelector('[data-next]').click();
          return;
        }

        var qt = (document.querySelector('.ex-q')||{}).textContent || '';
        var opts = Array.prototype.slice.call(document.querySelectorAll('.opt[data-pick]'));
        if(opts.length){
          var target = opts[0];
          if(known[qt]){
            opts.forEach(function(o){
              if(o.textContent.replace(/^\\s*\\d+\\s*/, '').trim() === known[qt]) target = o;
            });
          }
          target.click();
          var ch = document.querySelector('[data-check]');
          if(ch && !ch.disabled) ch.click();
          return;
        }
        var lefts = document.querySelectorAll('[data-match^="l"]:not(:disabled)');
        if(lefts.length){
          var li = lefts[0].getAttribute('data-match');
          lefts[0].click();
          /* после клика разметка перерисовывается — правый элемент ищем заново */
          var rr = document.querySelector('[data-match^="r"][data-pair="' + li.slice(1) + '"]:not(:disabled)');
          if(rr) rr.click();
          return;
        }
        var sk = document.querySelector('[data-skip]'); if(sk){ sk.click(); return; }
        clearInterval(loop);
      }, 30);
    }

    /* экраны с конкретным типом упражнения */
    if(go === 'match' || go === 'build'){
      var st2 = document.querySelectorAll('[data-lesson]');
      var idx = 0, tries = 0;
      var hunt = setInterval(function(){
        tries++;
        if(tries > 300){ clearInterval(hunt); return; }
        if(document.querySelector('[data-' + go + ']')){ clearInterval(hunt); return; }
        if(!document.querySelector('.lesson')){ if(st2[idx]) st2[idx].click(); return; }
        var nx = document.querySelector('[data-next]'); if(nx){ nx.click(); return; }
        var sk3 = document.querySelector('[data-skip]'); if(sk3){ sk3.click(); return; }
      }, 30);
    }
  }, 250);
});
</script>` : '';

const seedLS = process.env.SEED_LS ? '<script>try{localStorage.setItem("odinesnik.v2", ' +
  JSON.stringify(process.env.SEED_LS) + ')}catch(e){}</script>' : '';

const html = '<!doctype html><html' + (theme ? ' data-theme="' + theme + '"' : '') + '>' +
  '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<style>:root{color-scheme:light dark}body{margin:0;font:14px system-ui;background:#fff}' +
  'img{max-width:100%}[hidden]{display:none!important}</style></head><body>' +
  seedLS + body + measure + nav + '</body></html>';

fs.writeFileSync(outFile, html, 'utf8');
console.log('обёрнуто →', outFile, theme ? '(тема: ' + theme + ')' : '(тема системная)');
