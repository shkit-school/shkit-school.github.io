/* ============================================================
   afisha.js — рендер афиши из /assets/data/afisha.json
   - сортировка по дате (ближайшая слева)
   - прошедшие события скрываются
   ============================================================ */

(function () {
  'use strict';

  var CONFIG = {
    jsonUrl: '/assets/data/afisha.json',
    containerId: 'afisha-grid',
    maxItems: 3
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function cardHtml(event) {
    var shortHtml = escapeHtml(event.short).replace(
      /&laquo;([^&]+)&raquo;/g,
      '<strong style="color:var(--coral-ink);">«$1»</strong>'
    );

    return (
      '<article class="event">' +
        '<div class="event-poster">' +
          '<span class="event-date">' +
            '<span class="d">' + escapeHtml(event.day) + '</span>' +
            '<span class="m">' + escapeHtml(event.month) + '</span>' +
          '</span>' +
          '<img src="' + escapeHtml(event.image) + '" alt="' + escapeHtml(event.title) + ' — ШКИТ" loading="lazy">' +
        '</div>' +
        '<div class="event-body">' +
          '<h3>' +
            '<span style="font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--coral-ink);display:block;">' +
              escapeHtml(event.type) +
            '</span> ' +
            escapeHtml(event.title) +
          '</h3>' +
          '<div class="e-meta">' + escapeHtml(event.dateLabel || '') + ', ' +
            escapeHtml(event.place) + ', ' + escapeHtml(event.time) + '</div>' +
          '<div class="e-short">' + shortHtml + '</div>' +
          '<a class="btn btn--sm btn--block" href="' + escapeHtml(event.link) + '" target="_blank" rel="noopener">' +
            escapeHtml(event.buttonText || 'Купить билет') +
          '</a>' +
        '</div>' +
      '</article>'
    );
  }

  function render(events) {
    var grid = document.getElementById(CONFIG.containerId);
    if (!grid) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var upcoming = events
      .filter(function (e) {
        var d = new Date(e.date);
        return d >= today;
      })
      .sort(function (a, b) {
        return new Date(a.date) - new Date(b.date);
      })
      .slice(0, CONFIG.maxItems);

    if (!upcoming.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:40px 0">Скоро здесь появятся новые события.</p>';
      return;
    }

    grid.innerHTML = upcoming.map(cardHtml).join('');
  }

  function init() {
    var grid = document.getElementById(CONFIG.containerId);
    if (!grid) return;

    fetch(CONFIG.jsonUrl, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        console.error('Ошибка загрузки афиши:', err);
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:40px 0">Не удалось загрузить афишу. Обновите страницу или загляните позже.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
