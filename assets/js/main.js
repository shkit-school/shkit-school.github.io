/* ============================================================
   ШКИТ — интерактив: анимации, попапы, формы, лайтбокс
   Прогрессивное улучшение: без JS контент виден и доступен.
   ============================================================ */
(function () {
  'use strict';

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
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (e.target.closest('.nav') || e.target.closest('.burger')) return;
      setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 880 && nav.classList.contains('is-open')) setMenu(false);
    });
  }

  /* ---------- Скролл-анимации ---------- */
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
        var viewH = (en.rootBounds && en.rootBounds.height) || window.innerHeight;
        if (en.intersectionRatio >= 0.14 || en.boundingClientRect.height > viewH * 0.5) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: [0, 0.14], rootMargin: '0px 0px -40px 0px' });
    animTargets.forEach(function (el) { io.observe(el); });

    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 90;
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.classList.add('anim');
        child.style.transitionDelay = (i * step) + 'ms';
        io.observe(child);
      });
    });
  } else {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child) { child.classList.add('anim'); });
    });
    document.querySelectorAll(ANIM_SELECTOR).forEach(function (el) {
      el.classList.add('anim', 'is-in');
    });
  }

  var revealGuard = function () {
    if (document.hidden) return;
    setTimeout(function () {
      if (document.hidden) return;
      document.querySelectorAll('.anim:not(.is-in)').forEach(function (el) {
        el.classList.add('is-in');
      });
    }, 3000);
  };
  window.addEventListener('load', revealGuard);
  document.addEventListener('visibilitychange', revealGuard);

  /* ---------- Активный пункт меню ---------- */
  var navLinks = document.querySelectorAll('.nav a[href^="#"]');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.forEach(function (a) { a.classList.remove('is-active'); });
      link.classList.add('is-active');
    });
  });
  var logo = document.querySelector('.logo');
  if (logo) {
    logo.addEventListener('click', function () {
      navLinks.forEach(function (a) { a.classList.remove('is-active'); });
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
    if (closeBtn) requestAnimationFrame(function () { closeBtn.focus(); });
  }
  function closePopup(pop, restoreFocus) {
    pop.classList.remove('is-open');
    pop.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.popup-overlay.is-open') && !document.querySelector('.lightbox.is-open')) {
      document.body.style.overflow = '';
    }
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

  /* ---------- Ленивая загрузка карты ---------- */
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

/* ============================================================
   POPUP «Записаться» — форма с отправкой через Web3Forms
   ============================================================ */
(function () {
    'use strict';

    var ACCESS_KEY = '6ea50c59-bafc-42c5-aedd-4bc1ca88f6c4';
    var POPUP_ID = 'zapis-popup-global';

    function createPopup() {
        if (document.getElementById(POPUP_ID)) return;

        var overlay = document.createElement('div');
        overlay.className = 'zapis-popup-overlay';
        overlay.id = POPUP_ID;
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        overlay.innerHTML =
            '<div class="zapis-popup" role="document">' +
                '<div class="zapis-popup-head">' +
                    '<div>' +
                        '<h3>Оставить заявку</h3>' +
                        '<p>Заполните форму — мы свяжемся с вами</p>' +
                    '</div>' +
                    '<button class="zapis-popup-close" type="button" aria-label="Закрыть">✕</button>' +
                '</div>' +
                '<div class="zapis-popup-body">' +
                    '<form class="zapis-form" novalidate>' +
                        '<input type="hidden" name="access_key" value="' + ACCESS_KEY + '">' +
                        '<input type="hidden" name="subject" value="Заявка с сайта ШКИТ">' +
                        '<input type="hidden" name="from_name" value="ШКИТ — сайт">' +
                        '<input type="checkbox" name="botcheck" style="display:none !important" tabindex="-1" autocomplete="off">' +
                        '<div class="zapis-field">' +
                            '<label for="zapis-name">Имя *</label>' +
                            '<input type="text" id="zapis-name" name="name" required autocomplete="name" placeholder="Как к вам обращаться">' +
                            '<span class="zapis-err">Укажите имя</span>' +
                        '</div>' +
                        '<div class="zapis-field">' +
                            '<label for="zapis-phone">Телефон *</label>' +
                            '<input type="tel" id="zapis-phone" name="phone" required autocomplete="tel" placeholder="+7 (___) ___-__-__">' +
                            '<span class="zapis-err">Укажите телефон</span>' +
                        '</div>' +
                        '<div class="zapis-field">' +
                            '<label for="zapis-question">Вопрос или комментарий</label>' +
                            '<textarea id="zapis-question" name="question" rows="3" placeholder="Необязательно"></textarea>' +
                        '</div>' +
                        '<label class="zapis-consent">' +
                            '<input type="checkbox" name="consent" required>' +
                            '<span>Согласен на обработку персональных данных</span>' +
                        '</label>' +
                        '<button type="submit" class="btn zapis-submit">Отправить</button>' +
                        '<div class="zapis-fail"></div>' +
                    '</form>' +
                    '<div class="zapis-success">' +
                        '<div class="zapis-success-ico">✓</div>' +
                        '<h4>Спасибо!</h4>' +
                        '<p>Заявка отправлена в ШКИТ <span class="zapis-success-heart">❤️</span></p>' +
                        '<p>Мы свяжемся с вами в ближайшее время.</p>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closePopup();
        });

        overlay.querySelector('.zapis-popup-close')
            .addEventListener('click', closePopup);

        var phoneInput = overlay.querySelector('#zapis-phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function () {
                var caret = phoneInput.selectionStart;
                var digitsBefore = phoneInput.value.slice(0, caret).replace(/\D/g, '').length;
                var digits = phoneInput.value.replace(/\D/g, '');
                if (digits.startsWith('8')) digits = '7' + digits.slice(1);
                if (!digits.startsWith('7')) digits = '7' + digits;
                digits = digits.slice(0, 11);
                var d = digits.slice(1);
                var out = '+7';
                if (d.length > 0) out += ' (' + d.slice(0, 3);
                if (d.length > 3) out += ') ' + d.slice(3, 6);
                if (d.length > 6) out += '-' + d.slice(6, 8);
                if (d.length > 8) out += '-' + d.slice(8, 10);
                phoneInput.value = out;
                var seen = 0, pos = phoneInput.value.length;
                for (var i = 0; i < phoneInput.value.length; i++) {
                    if (/\d/.test(phoneInput.value[i])) {
                        seen++;
                        if (seen === digitsBefore) { pos = i + 1; break; }
                    }
                }
                if (digitsBefore === 0) pos = phoneInput.value.length;
                phoneInput.setSelectionRange(pos, pos);
            });
            phoneInput.addEventListener('focus', function () {
                if (!phoneInput.value) phoneInput.value = '+7 ';
            });
            phoneInput.addEventListener('blur', function () {
                if (phoneInput.value === '+7 ' || phoneInput.value === '+7') phoneInput.value = '';
            });
        }

        var form = overlay.querySelector('.zapis-form');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var ok = true;

                form.querySelectorAll('.zapis-field').forEach(function (field) {
                    var inp = field.querySelector('input,textarea');
                    if (!inp) return;
                    var bad = false;
                    if (inp.required && !inp.value.trim()) bad = true;
                    if (inp.type === 'tel' && inp.value && inp.value.replace(/\D/g, '').length < 11) bad = true;
                    field.classList.toggle('has-error', bad);
                    if (bad) ok = false;
                });

                var consent = form.querySelector('input[name="consent"]');
                var consentBad = consent && !consent.checked;
                form.classList.toggle('consent-missing', consentBad);
                if (consentBad) ok = false;

                if (!ok) return;

                var btn = form.querySelector('.zapis-submit');
                var btnLabel = btn ? btn.textContent : '';
                if (btn) { btn.disabled = true; btn.textContent = 'Отправляем…'; }

                var fail = form.querySelector('.zapis-fail');
                if (fail) fail.textContent = '';

                var data = new FormData(form);

                fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: data
                })
                    .then(function (r) { return r.json(); })
                    .then(function (res) {
                        if (!res || !res.success) throw new Error('Web3Forms error');
                        form.style.display = 'none';
                        var success = overlay.querySelector('.zapis-success');
                        if (success) success.style.display = 'block';
                    })
                    .catch(function (err) {
                        if (btn) { btn.disabled = false; btn.textContent = btnLabel; }
                        if (fail) fail.textContent = 'Не удалось отправить. Позвоните: +7 (919) 404-01-23';
                        console.error('ШКИТ: ошибка отправки —', err);
                    });
            });
        }
    }

    function openPopup() {
        createPopup();
        var popup = document.getElementById(POPUP_ID);
        popup.classList.add('is-open');
        popup.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closePopup() {
        var popup = document.getElementById(POPUP_ID);
        if (!popup) return;
        popup.classList.remove('is-open');
        popup.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePopup();
    });

    document.addEventListener('click', function (e) {
        var link = e.target.closest('a[href*="#zapis"]');
        if (!link) return;
        e.preventDefault();
        openPopup();
    });
})();

/* ============================================================
   КАСТОМНЫЙ ПЛЕЕР ВИДЕО
   ============================================================ */
(function () {
  'use strict';

  var wraps = document.querySelectorAll('[data-video-wrap]');

  wraps.forEach(function (wrap) {
    var video = wrap.querySelector('video');
    var playBtn = wrap.querySelector('.video-play');
    var pauseBtn = wrap.querySelector('.video-pause');

    if (!video || !playBtn || !pauseBtn) return;

    function play() { video.play(); }
    function pause() { video.pause(); }

    playBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      play();
    });

    pauseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      pause();
    });

    wrap.addEventListener('pointerdown', function (e) {
    // На мобильном — тап по видео не запускает
    if (window.matchMedia('(max-width: 768px)').matches) return;

    // На десктопе — клик по видео работает как раньше
    if (e.target.closest('.video-play') || e.target.closest('.video-pause')) return;
    if (e.target.closest('.video-progress')) return;
    e.preventDefault();
    if (video.paused) play();
    else pause();
});

    /* ===== Прогресс-бар ===== */
    var progress = wrap.querySelector('[data-progress]');
    var progressBar = wrap.querySelector('.video-progress-bar');

    if (progress && progressBar) {

      video.addEventListener('timeupdate', function () {
        if (!video.duration) return;
        var percent = (video.currentTime / video.duration) * 100;
        progressBar.style.width = percent + '%';
      });

      function seek(e) {
        e.preventDefault();
        var rect = progress.getBoundingClientRect();
        var x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
        var percent = Math.max(0, Math.min(1, x / rect.width));
        if (video.duration) {
          video.currentTime = percent * video.duration;
        }
      }

      progress.addEventListener('click', seek);

      var isDragging = false;
      progress.addEventListener('pointerdown', function (e) {
        isDragging = true;
        try { progress.setPointerCapture(e.pointerId); } catch (err) {}
        seek(e);
      });
      progress.addEventListener('pointermove', function (e) {
        if (!isDragging) return;
        seek(e);
      });
      progress.addEventListener('pointerup', function (e) {
        isDragging = false;
        try { progress.releasePointerCapture(e.pointerId); } catch (err) {}
      });
      progress.addEventListener('pointercancel', function () {
        isDragging = false;
      });

      video.addEventListener('ended', function () {
        progressBar.style.width = '0%';
      });
    }

    /* ===== Состояния ===== */
    video.addEventListener('play', function () {
      wrap.classList.add('is-playing');
      wrap.classList.remove('is-paused');
    });

    video.addEventListener('pause', function () {
      if (video.currentTime > 0 && !video.ended) {
        wrap.classList.add('is-paused');
      }
      wrap.classList.remove('is-playing');
    });

    video.addEventListener('ended', function () {
      wrap.classList.remove('is-playing');
      wrap.classList.remove('is-paused');
      video.currentTime = 0;
    });
  });
})();
