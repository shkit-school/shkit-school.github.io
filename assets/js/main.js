/* ============================================================
   ШКИТ — интерактив: анимации, попапы, формы, лайтбокс
   Прогрессивное улучшение: без JS контент виден и доступен.
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     НАСТРОЙКА ОТПРАВКИ ЗАЯВОК В TELEGRAM
     ------------------------------------------------------------
     1. В Telegram напишите @BotFather → /newbot → получите токен.
     2. Добавьте бота в группу (или напишите ему лично) и отправьте
        туда любое сообщение.
     3. Откройте в браузере:
        https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates
        и найдите там "chat":{"id":...} — это TG_CHAT_ID.
        Для группы id будет отрицательным, например -1001234567890.
     4. Впишите оба значения ниже.

     ВНИМАНИЕ: токен виден всем в исходном коде страницы. Используйте
     отдельного бота, созданного только для заявок, и не давайте ему
     доступ к другим чатам. Пока поля пустые — формы работают в
     демо-режиме (показывают «Спасибо!», ничего не отправляя).
     ============================================================ */
  var TG_TOKEN = '';
  var TG_CHAT_ID = '';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Шапка: тень при прокрутке ---------- */
  var header = document.querySelector('.header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Мобильное меню ---------- */
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    var setMenu = function (open) {
      nav.classList.toggle('is-open', open);
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    burger.addEventListener('click', function () {
      setMenu(!nav.classList.contains('is-open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    /* клик мимо меню — закрыть */
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.target.closest('.nav') || e.target.closest('.burger')) return;
      setMenu(false);
    });
    /* Esc — закрыть и вернуть фокус на бургер */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    /* при переходе на десктопную ширину меню не должно «залипать» */
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880 && nav.classList.contains('is-open')) setMenu(false);
    });
  }

  /* ---------- Скролл-анимации (раздел 09 ТЗ) ---------- */
  /* Классы вешаются скриптом (прогрессивное улучшение),
     transform+opacity, появление один раз, порог ~14%. */
  var ANIM_SELECTOR = '.anim,[data-anim]';
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var animTargets = document.querySelectorAll(ANIM_SELECTOR);
    animTargets.forEach(function (el) {
      el.classList.add('anim');
      var delay = el.getAttribute('data-delay');
      if (delay) el.style.transitionDelay = delay + 'ms';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        /* блок выше половины экрана 14% может не набрать — тогда хватит любого пересечения */
        var viewH = (en.rootBounds && en.rootBounds.height) || window.innerHeight;
        if (en.intersectionRatio >= 0.14 || en.boundingClientRect.height > viewH * 0.5) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: [0, 0.14], rootMargin: '0px 0px -40px 0px' });
    animTargets.forEach(function (el) { io.observe(el); });

    /* Каскад (stagger) для групп однотипных элементов */
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.classList.add('anim');
        child.style.transitionDelay = (i * step) + 'ms';
        io.observe(child);
      });
    });
  } else {
    /* reduce-motion или старый браузер без IntersectionObserver:
       показываем всё сразу, иначе контент останется невидимым */
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child) { child.classList.add('anim'); });
    });
    document.querySelectorAll(ANIM_SELECTOR).forEach(function (el) {
      el.classList.add('anim', 'is-in');
    });
  }

  /* Страховка: контент важнее анимации. Если через 3 с не проявилось ничего —
     снимаем скрытие принудительно, чтобы страница не осталась пустой. */
  var revealGuard = function () {
    if (document.hidden) return;               /* во вкладке в фоне IO молчит — это норма */
    setTimeout(function () {
      if (document.hidden || document.querySelector('.anim.is-in')) return;
      document.querySelectorAll('.anim').forEach(function (el) { el.classList.add('is-in'); });
    }, 3000);
  };
  window.addEventListener('load', revealGuard);
  document.addEventListener('visibilitychange', revealGuard);

  /* ---------- Активный пункт меню при прокрутке ---------- */
  var navLinks = document.querySelectorAll('.nav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) {
      var id = a.getAttribute('href').slice(1);
      if (id) map[id] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('is-active'); });
          if (map[en.target.id]) map[en.target.id].classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  /* ---------- Попапы «Подробнее» ---------- */
  var lastFocused = null;
  function openPopup(id) {
    var pop = document.getElementById(id);
    if (!pop) return;
    lastFocused = document.activeElement;
    pop.classList.add('is-open');
    pop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var closeBtn = pop.querySelector('.popup-close');
    /* visibility анимируется — фокусируем на следующем кадре, когда элемент уже видим */
    if (closeBtn) requestAnimationFrame(function () { closeBtn.focus(); });
  }
  function closePopup(pop, restoreFocus) {
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.popup-overlay.is-open') && !document.querySelector('.lightbox.is-open')) {
      document.body.style.overflow = '';
    }
    /* при переходе к форме фокус не возвращаем — иначе страницу дёргает обратно к карточке */
    if (restoreFocus !== false && lastFocused) lastFocused.focus();
  }
  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-popup]');
    if (opener) {
      e.preventDefault();
      openPopup(opener.getAttribute('data-popup'));
      return;
    }
    if (e.target.classList.contains('popup-overlay') || e.target.closest('[data-close]')) {
      var pop = e.target.closest('.popup-overlay');
      if (pop) closePopup(pop);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('.popup-overlay.is-open');
      if (open) closePopup(open);
      if (typeof closeLightbox === 'function') closeLightbox();
    }
  });

  /* Фокус не должен уходить за пределы открытой модалки */
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var modal = document.querySelector('.popup-overlay.is-open .popup') ||
                document.querySelector('.lightbox.is-open');
    if (!modal) return;

    var nodes = Array.prototype.filter.call(modal.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
    });
    if (!nodes.length) return;

    var first = nodes[0];
    var last = nodes[nodes.length - 1];

    /* фокус вне модалки (например, ушёл в адресную строку и вернулся) — возвращаем */
    if (!modal.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Кнопки внутри попапа, ведущие к форме записи: закрыть попап и проскроллить */
  document.querySelectorAll('.popup [data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-goto');
      var pop = btn.closest('.popup-overlay');
      if (pop) closePopup(pop, false);
      setTimeout(function () {
        var el = document.querySelector(target);
        if (!el) return;
        el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        var first = el.querySelector('input:not([type="checkbox"]),textarea');
        if (first) first.focus({ preventScroll: true });
      }, 200);
    });
  });

  /* ---------- Маска телефона +7 (___) ___-__-__ ---------- */
  function maskPhone(input) {
    function format(digits) {
      var d = digits.slice(1); // всё, что после 7
      var out = '+7';
      if (d.length > 0) out += ' (' + d.slice(0, 3);
      if (d.length > 3) out += ') ' + d.slice(3, 6);
      if (d.length > 6) out += '-' + d.slice(6, 8);
      if (d.length > 8) out += '-' + d.slice(8, 10);
      return out;
    }
    input.addEventListener('input', function () {
      /* сколько цифр стояло левее каретки — по этому и вернём её на место */
      var caret = input.selectionStart;
      var digitsBefore = input.value.slice(0, caret).replace(/\D/g, '').length;

      var digits = input.value.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (!digits.startsWith('7')) digits = '7' + digits;
      digits = digits.slice(0, 11);

      input.value = format(digits);

      /* ищем позицию после N-й цифры в отформатированной строке */
      var seen = 0, pos = input.value.length;
      for (var i = 0; i < input.value.length; i++) {
        if (/\d/.test(input.value[i])) {
          seen++;
          if (seen === digitsBefore) { pos = i + 1; break; }
        }
      }
      if (digitsBefore === 0) pos = input.value.length;
      input.setSelectionRange(pos, pos);
    });
    input.addEventListener('focus', function () {
      if (!input.value) input.value = '+7 ';
    });
    input.addEventListener('blur', function () {
      if (input.value === '+7 ' || input.value === '+7') input.value = '';
    });
  }
  document.querySelectorAll('input[type="tel"]').forEach(maskPhone);

  /* ---------- Валидация и отправка форм ---------- */
  function setError(field, on) {
    field.classList.toggle('has-error', on);
    var inp = field.querySelector('input,textarea');
    if (inp) {
      inp.classList.toggle('invalid', on);
      inp.setAttribute('aria-invalid', on ? 'true' : 'false');
    }
  }

  /* экранируем то, что уйдёт в Telegram с parse_mode: HTML */
  function esc(s) {
    return String(s || '').trim()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function showSuccess(form) {
    form.classList.add('is-sent');
    var success = form.querySelector('.form-success');
    if (success) success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  }
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;

      form.querySelectorAll('.field').forEach(function (field) {
        var inp = field.querySelector('input,textarea');
        if (!inp) { setError(field, false); return; }
        var val = inp.value.trim();
        var bad = false;
        if (inp.required && !val) bad = true;
        // формат проверяем всегда, когда поле заполнено (даже необязательное)
        else if (val && inp.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) bad = true;
        else if (val && inp.type === 'tel' && inp.value.replace(/\D/g, '').length < 11) bad = true;
        setError(field, bad);
        if (bad) ok = false;
      });

      var consent = form.querySelector('.consent input[type="checkbox"]');
      if (consent) {
        var consentBad = !consent.checked;
        form.classList.toggle('consent-missing', consentBad);
        consent.setAttribute('aria-invalid', consentBad ? 'true' : 'false');
        if (consentBad) ok = false;
      }

      if (!ok) return;

      /* --- ПРИЁМ ЗАЯВОК ---
         Канал 1 (реализован здесь): Telegram-бот → чат школы.
         Канал 2 (НЕ реализован): дублирование на почту
           art-pashnin@yandex.ru и tshafir@yandex.ru.
         Отправить письмо из браузера без сервера нельзя — для этого
         нужен серверный обработчик или сервис форм. Сейчас заявки
         приходят ТОЛЬКО в Telegram. */

      var fail = form.querySelector('.form-fail');
      if (fail) fail.textContent = '';

      /* Токен не прописан — работаем как раньше, в демо-режиме */
      if (!TG_TOKEN || !TG_CHAT_ID) {
        showSuccess(form);
        return;
      }

      var fd = new FormData(form);
      var lines = [
        '<b>🎭 Заявка с сайта ШКИТ</b>',
        '',
        '<b>Имя:</b> ' + esc(fd.get('name')),
        '<b>Телефон:</b> ' + esc(fd.get('phone'))
      ];
      if (esc(fd.get('email'))) lines.push('<b>Почта:</b> ' + esc(fd.get('email')));
      if (esc(fd.get('question'))) lines.push('<b>Вопрос:</b> ' + esc(fd.get('question')));

      var btn = form.querySelector('button[type="submit"]');
      var btnLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

      fetch('https://api.telegram.org/bot' + TG_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text: lines.join('\n'),
          parse_mode: 'HTML'
        })
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.ok) throw new Error(res && res.description ? res.description : 'Telegram API error');
          showSuccess(form);
        })
        .catch(function (err) {
          if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
          if (fail) fail.textContent = 'Не удалось отправить заявку. Позвоните нам: +7 (919) 404-01-23';
          console.error('ШКИТ: ошибка отправки заявки —', err);
        });
    });
  });

  /* ---------- Лайтбокс галереи ---------- */
  var gallery = document.querySelector('.gallery');
  var lightbox = document.getElementById('lightbox');
  var lbImg, lbCount, items = [], current = 0;
  window.closeLightbox = function () {};

  if (gallery && lightbox) {
    lbImg = lightbox.querySelector('img');
    lbCount = lightbox.querySelector('.lb-count');
    items = Array.prototype.map.call(gallery.querySelectorAll('img'), function (img) {
      return { src: img.getAttribute('data-full') || img.src, alt: img.alt };
    });

    function show(i) {
      current = (i + items.length) % items.length;
      lbImg.src = items[current].src;
      lbImg.alt = items[current].alt;
      if (lbCount) lbCount.textContent = (current + 1) + ' / ' + items.length;
    }
    var lbLastFocused = null;
    function openLightbox(i) {
      show(i);
      lbLastFocused = document.activeElement;
      lightbox.classList.add('is-open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var lbClose = lightbox.querySelector('.lb-close');
      if (lbClose) requestAnimationFrame(function () { lbClose.focus(); });
    }
    window.closeLightbox = function () {
      if (!lightbox.classList.contains('is-open')) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      if (!document.querySelector('.popup-overlay.is-open')) document.body.style.overflow = '';
      if (lbLastFocused) lbLastFocused.focus();
    };

    gallery.querySelectorAll('figure').forEach(function (fig, i) {
      fig.addEventListener('click', function () { openLightbox(i); });
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
      });
    });
    lightbox.querySelector('.lb-close').addEventListener('click', window.closeLightbox);
    lightbox.querySelector('.lb-prev').addEventListener('click', function () { show(current - 1); });
    lightbox.querySelector('.lb-next').addEventListener('click', function () { show(current + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) window.closeLightbox(); });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  /* ---------- Ленивая загрузка карты (не блокирует старт) ---------- */
  var mapFrame = document.querySelector('iframe[data-src]');
  if (mapFrame) {
    var loadMap = function () {
      if (mapFrame.src) return;
      mapFrame.src = mapFrame.getAttribute('data-src');
    };
    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { loadMap(); mio.disconnect(); }
        });
      }, { rootMargin: '200px' });
      mio.observe(mapFrame);
    } else {
      loadMap();
    }
  }

  /* ---------- Год в футере ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
