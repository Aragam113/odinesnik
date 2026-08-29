/* =====================================================================
   МАТЕРИАЛЫ РАЗДЕЛА («книжечка»)
   На каждый раздел пути — своя страница разбора: простая аналогия,
   интерактивная схема, пояснения и проверочный вопрос.

   Схемы описаны данными, а не размеченным SVG: узлы, стрелки и текст
   к каждому узлу. Так их можно править, не трогая разметку, и так они
   гарантированно совпадают с тем, что рассказано рядом.
   ===================================================================== */

var bookUnit = null;      /* id раздела, чьи материалы открыты */
var bookNode = null;      /* выбранный узел схемы */

/* ---------- отрисовка схемы ---------- */
function bookDiagram(d, sel, pre){
  pre = pre || "";
  var mid = "ah" + pre.replace(/[^0-9]/g, "");   /* свой маркер на схему: id должны быть уникальны */
  if(!d) return "";
  var pad = 10;
  var svg = '<svg class="dia" viewBox="0 0 ' + d.w + ' ' + d.h + '" role="img" ' +
    'aria-label="' + esc(d.alt || "Схема") + '">';

  /* стрелки рисуем первыми, чтобы они уходили под блоки */
  svg += '<defs><marker id="' + mid + '" viewBox="0 0 10 10" refX="9" refY="5" ' +
    'markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>';

  var at = {};
  d.nodes.forEach(function(n){ at[n.id] = n; });

  (d.links || []).forEach(function(l, i){
    var a = at[l.a], b = at[l.b];
    if(!a || !b) return;
    var ax, ay, bx, by;
    var horiz = Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) > Math.abs((a.y + a.h / 2) - (b.y + b.h / 2));
    if(horiz){
      var left = a.x < b.x;
      ax = left ? a.x + a.w : a.x;      ay = a.y + a.h / 2;
      bx = left ? b.x : b.x + b.w;      by = b.y + b.h / 2;
    } else {
      var up = a.y < b.y;
      ax = a.x + a.w / 2;               ay = up ? a.y + a.h : a.y;
      bx = b.x + b.w / 2;               by = up ? b.y : b.y + b.h;
    }
    if(l.dy){ ay += l.dy; by += l.dy; }
    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    var cls = "dia-link" + (l.back ? " back" : "");
    svg += '<line class="' + cls + '" x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by +
           '" marker-end="url(#' + mid + ')"/>';
    if(l.t){
      svg += '<text class="dia-lt" x="' + mx + '" y="' + (my + (horiz ? -7 : 0)) + '" ' +
             'text-anchor="middle">' + esc(l.t) + '</text>';
    }
  });

  d.nodes.forEach(function(n){
    var on = sel === n.id;
    svg += '<g class="dia-node' + (on ? " on" : "") + ' k-' + (n.c || "base") + '" ' +
      'tabindex="0" role="button" data-dianode="' + esc(pre + n.id) + '" ' +
      'aria-pressed="' + (on ? "true" : "false") + '">' +
      '<rect x="' + n.x + '" y="' + n.y + '" width="' + n.w + '" height="' + n.h + '" rx="12"/>' +
      '<text class="dia-t" x="' + (n.x + n.w / 2) + '" y="' + (n.y + (n.s ? n.h / 2 - 4 : n.h / 2 + 5)) + '" ' +
      'text-anchor="middle">' + esc(n.t) + '</text>';
    if(n.s) svg += '<text class="dia-s" x="' + (n.x + n.w / 2) + '" y="' + (n.y + n.h / 2 + 14) + '" ' +
      'text-anchor="middle">' + esc(n.s) + '</text>';
    svg += '</g>';
  });
  svg += '</svg>';
  return svg;
}

/* ---------- страница материалов ---------- */
function vBook(){
  var b = BOOK[bookUnit];
  var u = UNITS.filter(function(x){ return x.id === bookUnit; })[0];
  if(!b || !u) return '<p>Материалов пока нет.</p>';

  var h = '<div class="book" style="--u:' + u.c + '">' +
    '<button class="btn ghost sm" data-bookclose="1">← К пути</button>' +
    '<div class="book-head"><span class="unit-n">Материалы раздела</span>' +
      '<h2>' + esc(u.t) + '</h2><p>' + esc(u.sub) + '</p></div>';

  /* аналогия */
  h += '<div class="card pad analogy"><span class="tag y">на пальцах</span>' +
    '<h3>' + esc(b.analogy.t) + '</h3><p>' + b.analogy.html + '</p></div>';

  /* схема */
  /* Схем на раздел может быть несколько. Выбранный узел хранится с
     номером схемы («0|cli»), иначе одинаковые имена узлов в разных
     схемах подсвечивались бы одновременно. */
  var dias = b.dias || (b.dia ? [b.dia] : []);
  dias.forEach(function(d, di){
    var pre = di + "|";
    var sel = null;
    if(bookNode && bookNode.indexOf(pre) === 0){
      var id = bookNode.slice(pre.length);
      if(d.say[id]) sel = id;
    }
    h += '<div class="card pad">' +
      '<h3>' + esc(d.t) + '</h3>' +
      '<p class="dia-hint">Нажми на любой блок — расскажу, что это и зачем.</p>' +
      '<div class="dia-wrap">' + bookDiagram(d, sel, pre) + '</div>' +
      '<div class="dia-say' + (sel ? " on" : "") + '">' +
        (sel ? '<b>' + esc((d.nodes.filter(function(n){ return n.id === sel; })[0] || {}).t) + '</b>' +
               '<p>' + d.say[sel] + '</p>'
             : '<p class="muted">Пока ничего не выбрано.</p>') +
      '</div></div>';
  });

  /* пояснения */
  (b.blocks || []).forEach(function(bl){
    h += '<div class="card pad"><h3>' + esc(bl.t) + '</h3>' + bl.html + '</div>';
  });

  /* проверка понимания */
  if(b.check){
    var done = S.bookChecked && S.bookChecked[bookUnit];
    h += '<div class="card pad check-box"><span class="tag">проверь себя</span>' +
      '<h3>' + esc(b.check.q) + '</h3>' +
      '<div class="check-opts">' +
        b.check.o.map(function(o, i){
          var st = done ? (i === b.check.a ? " ok" : (done.pick === i ? " no" : "")) : "";
          return '<button class="opt' + st + '" data-bookcheck="' + i + '"' + (done ? " disabled" : "") +
                 '>' + esc(o) + '</button>';
        }).join("") +
      '</div>' +
      (done ? '<div class="explain">' + b.check.w + '</div>' : '') +
    '</div>';
  }

  /* куда идти дальше */
  if(b.see && b.see.length){
    h += '<div class="card pad"><h3>Подробнее в справочнике</h3><div class="chips">' +
      b.see.map(function(id){
        var s = ARCH.concat(HOOD).filter(function(x){ return x.id === id; })[0];
        return s ? '<button class="chip" data-bookref="' + id + '">' + esc(s.t) + '</button>' : "";
      }).join("") + '</div></div>';
  }

  if(b.src && b.src.length){
    h += '<div class="card pad src"><h3>Где читать первоисточник</h3>' +
      '<p class="muted">Разделы официальной документации по темам этой страницы. ' +
      'Доступ к ИТС — по подписке.</p><ul>' +
      b.src.map(function(s){ return '<li>' + esc(s) + '</li>'; }).join("") + '</ul></div>';
  }

  return h + '</div>';
}
