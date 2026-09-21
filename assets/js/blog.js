/* ============================================================
   blog.js — рендер статей блога из /assets/data/posts.json
   - сортировка по дате (свежие сверху)
   - фильтр по категориям (мультивыбор — точное совпадение)
   - пагинация: шаг 9, «Показать все» после 3 кликов
   - URL-параметры: ?cat=parents&page=2
   - skeleton-загрузка
   ============================================================ */

(function () {
  'use strict';

  // ===== Конфиг =====
  var CONFIG = {
    jsonUrl: '/assets/data/posts.json',
    step: 9,
    afterClicksShowAll: 3,
    skeletonCount: 9
  };

  // ===== Состояние =====
  var state = {
    all: [],
    filtered: [],
    visibleCount: CONFIG.step,
    activeFilter: 'all',
    clicks: 0
  };

  // ===== Утилиты =====
  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setQuery(params) {
    var url = new URL(window.location.href);
    Object.keys(params).forEach(function (k) {
      if (params[k] === null || params[k] === '') {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, params[k]);
      }
    });
    history.replaceState(null, '', url.toString());
  }

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

  // ===== Скелетоны =====
  function renderSkeletons(grid) {
    var html = '';
    for (var i = 0; i < CONFIG.skeletonCount; i++) {
      html +=
        '<article class="blog-card blog-card--skeleton">' +
        '<div class="blog-card-skeleton-img"></div>' +
        '<div class="blog-card-body">' +
        '<div class="blog-card-skeleton-line blog-card-skeleton-line--short"></div>' +
        '<div class="blog-card-skeleton-line"></div>' +
        '</div>' +
        '</article>';
    }
    grid.innerHTML = html;
  }

  // ===== HTML карточки =====
  function cardHtml(post) {
    var cats = (post.category || []).join(' ');
    return (
      '<article class="blog-card" data-category="' + escapeHtml(cats) + '" data-date="' + escapeHtml(post.date) + '">' +
        '<a class="blog-card-link" href="' + escapeHtml(post.url) + '" aria-label="' + escapeHtml(post.title) + '">' +
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

  // ===== Фильтрация =====
  function applyFilter() {
    var f = state.activeFilter;
    state.filtered = state.all.filter(function (post) {
      if (f === 'all') return true;
      return (post.category || []).indexOf(f) !== -1;
    });
  }

  // ===== Рендер сетки =====
  function renderGrid() {
    var grid = document.getElementById('blog-grid');
    if (!grid) return;
    var list = state.filtered.slice(0, state.visibleCount);
    if (list.length === 0) {
      grid.innerHTML =
        '<p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:40px 0">' +
        'В этой категории пока нет статей.' +
        '</p>';
      return;
    }
    grid.innerHTML = list.map(cardHtml).join('');
  }

  // ===== Кнопка и счётчик =====
  function renderButton() {
    var btn = document.getElementById('blog-more-btn');
    var counter = document.getElementById('blog-counter');
    if (!btn) return;

    var total = state.filtered.length;
    var visible = Math.min(state.visibleCount, total);

    if (counter) {
      counter.textContent = total > 0
        ? 'Показано ' + visible + ' из ' + total
        : '';
    }

    if (visible >= total) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = '';
    var remaining = total - visible;

    if (state.clicks >= CONFIG.afterClicksShowAll) {
      btn.textContent = 'Показать все ' + total;
    } else {
      btn.textContent = 'Показать ещё ' + Math.min(CONFIG.step, remaining);
    }
  }

  // ===== Активный фильтр =====
  function renderFilters() {
    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.filter === state.activeFilter);
    });
  }

  // ===== Обновление =====
  function update() {
    applyFilter();
    renderGrid();
    renderButton();
    renderFilters();
  }

  // ===== Клик «Показать ещё» =====
  function onMoreClick() {
    var total = state.filtered.length;
    state.clicks++;
    if (state.clicks >= CONFIG.afterClicksShowAll) {
      state.visibleCount = total;
    } else {
      state.visibleCount = Math.min(state.visibleCount + CONFIG.step, total);
    }
    renderGrid();
    renderButton();
  }

  // ===== Клик по фильтру =====
  function onFilterClick(e) {
    var f = e.currentTarget.dataset.filter;
    if (f === state.activeFilter) return;
    state.activeFilter = f;
    state.visibleCount = CONFIG.step;
    state.clicks = 0;
    setQuery({ cat: f === 'all' ? null : f, page: null });
    update();
  }

  // ===== Загрузка JSON =====
  function loadPosts() {
    var grid = document.getElementById('blog-grid');
    if (grid) renderSkeletons(grid);

    fetch(CONFIG.jsonUrl, { cache: 'no-cache' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (posts) {
        state.all = posts.sort(function (a, b) {
          return new Date(b.date) - new Date(a.date);
        });

        var cat = qs('cat');
        var page = parseInt(qs('page') || '1', 10);

        if (cat && ['parents', 'teens', 'adults'].indexOf(cat) !== -1) {
          state.activeFilter = cat;
        }
        if (page > 1) {
          state.visibleCount = CONFIG.step * page;
          state.clicks = page - 1;
        }

        update();
      })
      .catch(function (err) {
        console.error('Ошибка загрузки posts.json:', err);
        if (grid) {
          grid.innerHTML =
            '<p style="grid-column:1/-1;text-align:center;color:var(--grey);padding:40px 0">' +
            'Не удалось загрузить статьи. Обновите страницу или загляните позже.' +
            '</p>';
        }
      });
  }

  // ===== Инициализация =====
  function init() {
    var btn = document.getElementById('blog-more-btn');
    if (btn) btn.addEventListener('click', onMoreClick);

    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.addEventListener('click', onFilterClick);
    });

    loadPosts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
