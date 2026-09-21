/* ============================================================
   blog-featured.js — 3 свежих статьи на главной
   - читает /assets/data/posts.json
   - сортирует по дате (свежие сверху)
   - берёт 3 первых (или с featured: true, если включить опцию)
   - рендерит в #blog-track
   ============================================================ */

(function () {
  'use strict';

  // ===== Конфиг =====
  var CONFIG = {
    jsonUrl: '/assets/data/posts.json',
    count: 3,
    containerId: 'blog-track',
    onlyFeatured: false  // true — брать только с featured: true
  };

  // ===== Утилиты =====
  function formatDate(iso) {
    var d = new Date(iso);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + '.' + mm + '.' + d.getFullYear();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ===== HTML карточки =====
  function cardHtml(post) {
    return (
      '<article class="blog-card">' +
        '<a class="blog-card-link" href="blog/' + escapeHtml(post.url) + '" aria-label="' + escapeHtml(post.title) + '">' +
          '<img src="' + escapeHtml(post.image) + '" alt="' + escapeHtml(post.title) + '" loading="lazy">' +
          '<div class="blog-card-body">' +
            '<div class="blog-card-date">' + formatDate(post.date) + '</div>' +
            '<h3>' + escapeHtml(post.title) + '</h3>' +
            '<div class="blog-card-actions"><span class="read-link">Читать →</span></div>' +
          '</div>' +
        '</a>' +
      '</article>'
    );
  }

  // ===== Инициализация =====
  function init() {
    var track = document.getElementById(CONFIG.containerId);
    if (!track) return;

    fetch(CONFIG.jsonUrl, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (posts) {
        var list = posts.slice();

        if (CONFIG.onlyFeatured) {
          list = list.filter(function (p) { return p.featured === true; });
        }

        list.sort(function (a, b) {
          return new Date(b.date) - new Date(a.date);
        });

        var latest = list.slice(0, CONFIG.count);

        track.innerHTML = latest.map(cardHtml).join('');
      })
      .catch(function (err) {
        console.error('Ошибка загрузки постов для главной:', err);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
