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
      if (document.hidden || document.querySelector('.anim.is-in')) return;
      document.querySelectorAll('.anim').forEach(function (el) { el.classList.add('is-in'); });
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

  /* ---------- Попапы «Подробнее» (проекты для взрослых) ---------- */
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
   POPUP «Записаться» — простой попап с кнопкой
   - без iframe
   - кнопка ведёт на Яндекс.Форму в новой вкладке
   - работает одинаково на десктопе и мобильном
   ============================================================ */

(function () {
    'use strict';

    var FORM_URL = 'https://forms.yandex.ru/u/6a9a626c4936395e001c5ec1/';
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
                    '<p class="zapis-popup-text">Форма откроется в новой вкладке. Заполните её — и мы свяжемся с вами.</p>' +
                    '<a class="btn zapis-popup-btn" href="' + FORM_URL + '" target="_blank" rel="noopener">Заполнить форму →</a>' +
                    '<p class="zapis-popup-note">Или позвоните: <a href="tel:+79194040123">+7 (919) 404-01-23</a></p>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closePopup();
        });

        overlay.querySelector('.zapis-popup-close')
            .addEventListener('click', closePopup);
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
