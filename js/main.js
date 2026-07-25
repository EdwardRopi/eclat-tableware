/* ═══════════════════════════════════════════
   ÉCLAT — интерактив
   ═══════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ─────────────────────────────────────────
     1. Разбивка заголовков
     ───────────────────────────────────────── */
  function splitChars(el) {
    if (!el) return;
    var words = el.textContent.trim().split(/\s+/);
    var html = '';
    var i = 0;

    words.forEach(function (w, wi) {
      // слово — неразрывный блок, иначе строка рвётся по слогам
      html += '<span class="wd">';
      for (var n = 0; n < w.length; n++) {
        html += '<span class="ch" style="--d:' + (i++) + '">' + w[n] + '</span>';
      }
      html += '</span>';
      if (wi < words.length - 1) {
        html += '<span class="ch ch--space" style="--d:' + (i++) + '"> </span>';
      }
    });

    el.innerHTML = html;
  }

  function splitLines(el) {
    // исходный текст запоминаем: повторная разбивка уже разбитого
    // элемента склеивала бы слова на стыке строк
    if (!el.dataset.src) {
      el.dataset.src = el.textContent.trim().replace(/\s+/g, ' ');
    }
    var words = el.dataset.src.split(' ');
    el.innerHTML = words.map(function (w) {
      return '<span class="w" style="display:inline-block">' + w + '</span>';
    }).join(' ');

    var spans = $$('.w', el);
    var lines = [];
    var cur = null;
    var top = null;
    spans.forEach(function (s) {
      var t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { top = t; cur = []; lines.push(cur); }
      cur.push(s.textContent);
    });

    el.innerHTML = lines.map(function (ln, idx) {
      return '<span class="ln"><i style="--d:' + idx + '">' + ln.join(' ') + '</i></span>';
    }).join('');
  }

  splitChars($('#heroTitle'));
  $$('[data-split]').forEach(splitLines);

  // при смене ширины строки пересобираем
  var splitTimer;
  window.addEventListener('resize', function () {
    clearTimeout(splitTimer);
    splitTimer = setTimeout(function () {
      $$('[data-split]').forEach(function (el) {
        var wasIn = el.classList.contains('is-in');
        splitLines(el);
        if (wasIn) el.classList.add('is-in');
      });
    }, 220);
  });

  /* ─────────────────────────────────────────
     2. Прелоадер
     ───────────────────────────────────────── */
  (function preload() {
    var box  = $('#preloader');
    var fill = $('#preloaderFill');
    var num  = $('#preloaderNum');
    if (!box) return;

    document.body.classList.add('is-locked');

    var imgs = $$('img');
    var total = imgs.length || 1;
    var done = 0;
    var shown = 0;
    var finished = false;

    imgs.forEach(function (img) {
      if (img.complete) { done++; return; }
      var tick = function () { done++; };
      img.addEventListener('load', tick, { once: true });
      img.addEventListener('error', tick, { once: true });
    });

    var started = Date.now();

    function frame() {
      var byImg  = done / total;
      var byTime = (Date.now() - started) / 2600;   // страховка от «зависшей» картинки
      var target = clamp(Math.max(byImg, byTime), 0, 1) * 100;

      shown += (target - shown) * 0.08;
      if (target >= 99.5 && shown > 98.5) shown = 100;

      fill.style.width = shown + '%';
      num.textContent = Math.round(shown);

      if (shown >= 99.9 && !finished) { finish(); return; }
      requestAnimationFrame(frame);
    }

    function finish() {
      finished = true;
      setTimeout(function () {
        box.classList.add('is-done');
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-ready');
        $$('[data-split]').forEach(function (el) { splitLines(el); });
        onScroll();
      }, 260);
    }

    requestAnimationFrame(frame);
  }());

  /* ─────────────────────────────────────────
     3. Курсор
     ───────────────────────────────────────── */
  (function cursor() {
    if (reduced || !window.matchMedia('(pointer:fine)').matches) return;

    var dot  = $('#cursorDot');
    var ring = $('#cursorRing');
    var mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      document.body.classList.add('has-cursor');
      dot.style.transform = 'translate(' + (mx - 2.5) + 'px,' + (my - 2.5) + 'px)';
    });

    document.addEventListener('mouseleave', function () {
      document.body.classList.remove('has-cursor');
    });

    (function loop() {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      var r = ring.offsetWidth / 2;
      ring.style.transform = 'translate(' + (rx - r) + 'px,' + (ry - r) + 'px)';
      requestAnimationFrame(loop);
    }());

    document.addEventListener('mouseover', function (e) {
      if (e.target.closest('[data-cursor], a, button')) ring.classList.add('is-big');
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('[data-cursor], a, button')) ring.classList.remove('is-big');
    });
  }());

  /* ─────────────────────────────────────────
     4. Появление при прокрутке
     ───────────────────────────────────────── */
  (function reveal() {
    var targets = $$('[data-reveal], [data-split], .step');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  }());

  /* ─────────────────────────────────────────
     5. Счётчики
     ───────────────────────────────────────── */
  (function counters() {
    var nums = $$('[data-count]');
    if (!nums.length || !('IntersectionObserver' in window)) {
      nums.forEach(function (n) { n.textContent = n.dataset.count; });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        run(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.5 });

    nums.forEach(function (n) { io.observe(n); });

    function run(el) {
      var end = parseInt(el.dataset.count, 10);
      if (reduced) { el.textContent = end; return; }
      var dur = 1500;
      var t0 = null;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = clamp((ts - t0) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
  }());

  /* ─────────────────────────────────────────
     6. Прокрутка: шапка, полоса, параллакс,
        горизонтальные коллекции, «наверх»
     ───────────────────────────────────────── */
  var header  = $('#header');
  var bar     = $('#scrollBar');
  var toTop   = $('#toTop');
  var colSec  = $('.collections');
  var colTrk  = $('#colTrack');
  var colRail = $('#colRail');
  var heroMedia = $('#heroMedia');
  var parallaxEls = $$('[data-parallax]');

  var lastY = 0;
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset;
    var vh = window.innerHeight;
    var docH = document.documentElement.scrollHeight - vh;

    // полоса прогресса
    if (bar) bar.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';

    // шапка
    if (header) {
      header.classList.toggle('is-solid', y > 40);
      var hidden = y > lastY && y > 320;
      header.classList.toggle('is-hidden', hidden && !$('#nav').classList.contains('is-open'));
    }

    // кнопка наверх
    if (toTop) toTop.classList.toggle('is-on', y > vh * 0.9);

    if (!reduced) {
      // параллакс-блоки
      parallaxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var f = parseFloat(el.dataset.parallax) || 0.1;
        var off = (r.top + r.height / 2 - vh / 2) * f;
        el.style.transform = 'translate3d(0,' + off.toFixed(2) + 'px,0)';
      });

      // лёгкий сдвиг героя
      if (heroMedia && y < vh * 1.2) {
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(2) + 'px,0)';
      }
    }

    // горизонтальная лента коллекций
    if (colSec && colTrk) {
      if (window.innerWidth > 860 && !reduced) {
        var rect = colSec.getBoundingClientRect();
        var span = colSec.offsetHeight - vh;
        var p = span > 0 ? clamp(-rect.top / span, 0, 1) : 0;
        var dist = Math.max(0, colTrk.scrollWidth - window.innerWidth);
        colTrk.style.transform = 'translate3d(' + (-p * dist).toFixed(2) + 'px,0,0)';
        if (colRail) colRail.style.width = (p * 100).toFixed(1) + '%';
      } else {
        colTrk.style.transform = '';
      }
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ─────────────────────────────────────────
     7. Параллакс героя от мыши
     ───────────────────────────────────────── */
  (function heroMouse() {
    if (reduced || !window.matchMedia('(pointer:fine)').matches) return;
    var hero = $('#hero');
    var title = $('#heroTitle');
    if (!hero) return;

    hero.addEventListener('mousemove', function (e) {
      var cx = (e.clientX / window.innerWidth - 0.5);
      var cy = (e.clientY / window.innerHeight - 0.5);
      if (title) {
        title.style.transform = 'translate3d(' + (cx * -14).toFixed(1) + 'px,' + (cy * -8).toFixed(1) + 'px,0)';
      }
    });
    hero.addEventListener('mouseleave', function () {
      if (title) title.style.transform = '';
    });
  }());

  /* ─────────────────────────────────────────
     8. Наклон карточек каталога
     ───────────────────────────────────────── */
  (function tilt() {
    if (reduced || !window.matchMedia('(pointer:fine)').matches) return;

    $$('[data-tilt]').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(900px) rotateY(' + (px * 5).toFixed(2) + 'deg) rotateX(' +
          (-py * 5).toFixed(2) + 'deg) translateY(-6px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }());

  /* ─────────────────────────────────────────
     9. Отзывы
     ───────────────────────────────────────── */
  (function quotes() {
    var wrap = $('#quotes');
    var dots = $('#quoteDots');
    if (!wrap) return;

    var items = $$('.quote', wrap);
    var idx = 0;
    var timer;

    // цитаты позиционированы абсолютно — контейнер надо подпереть
    // высотой самой длинной, иначе она вылезает на соседнюю секцию
    function fitHeight() {
      wrap.style.minHeight = '0px';
      var tallest = 0;
      items.forEach(function (q) {
        var was = q.classList.contains('is-on');
        q.classList.add('is-on');
        q.style.position = 'static';
        tallest = Math.max(tallest, q.offsetHeight);
        q.style.position = '';
        if (!was) q.classList.remove('is-on');
      });
      wrap.style.minHeight = Math.ceil(tallest) + 'px';
    }

    fitHeight();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeight);
    var fitTimer;
    window.addEventListener('resize', function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(fitHeight, 220);
    });

    items.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Отзыв ' + (i + 1));
      if (i === 0) b.classList.add('is-on');
      b.addEventListener('click', function () { go(i); restart(); });
      dots.appendChild(b);
    });

    var btns = $$('button', dots);

    function go(n) {
      idx = (n + items.length) % items.length;
      items.forEach(function (q, i) { q.classList.toggle('is-on', i === idx); });
      btns.forEach(function (b, i) { b.classList.toggle('is-on', i === idx); });
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(function () { go(idx + 1); }, 6500);
    }
    restart();
  }());

  /* ─────────────────────────────────────────
     10. Меню, якоря, форма
     ───────────────────────────────────────── */
  (function menu() {
    var burger = $('#burger');
    var nav = $('#nav');
    if (!burger) return;

    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      document.body.classList.toggle('is-locked', open);
    });

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        document.body.classList.remove('is-locked');
      });
    });
  }());

  (function toTopBtn() {
    var b = $('#toTop');
    if (!b) return;
    b.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }());

  (function form() {
    var f = $('#form');
    if (!f) return;
    var input = $('#email');
    var note = $('#formNote');

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

      input.classList.toggle('is-bad', !ok);
      if (!ok) {
        note.textContent = 'Проверьте адрес — кажется, в нём опечатка.';
        return;
      }
      note.textContent = 'Готово. Подборка уедет на ' + v + ' в течение дня.';
      input.value = '';
    });
  }());

}());
