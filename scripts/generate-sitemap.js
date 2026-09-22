#!/usr/bin/env node
/* ============================================================
   generate-sitemap.js — генерация sitemap.xml из posts.json
   - основные страницы: lastmod = сегодня
   - статьи: lastmod = updated || date
   - запускается вручную или через GitHub Actions
   ============================================================ */

'use strict';

const fs = require('fs');
const path = require('path');

// ===== Конфиг =====
const SITE_URL = 'https://shkit-school.github.io';
const POSTS_PATH = path.join(__dirname, '..', 'assets', 'data', 'posts.json');
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

// Основные страницы (не статьи)
const STATIC_PAGES = [
    { loc: '/',           changefreq: 'weekly',  priority: '1.0' },
    { loc: '/blog/',      changefreq: 'weekly',  priority: '0.8' },
    { loc: '/faq.html',   changefreq: 'monthly', priority: '0.7' },
    { loc: '/policy.html', changefreq: 'yearly',  priority: '0.3' }
];

// Настройки для статей
const POST_CHANGEFREQ = 'monthly';
const POST_PRIORITY = '0.7';

// ===== Утилиты =====
function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function urlBlock(loc, lastmod, changefreq, priority) {
    return [
        '  <url>',
        `    <loc>${escapeXml(SITE_URL + loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>'
    ].join('\n');
}

// ===== Основная логика =====
function generate() {
    // Читаем posts.json
    let posts;
    try {
        const raw = fs.readFileSync(POSTS_PATH, 'utf8');
        posts = JSON.parse(raw);
    } catch (err) {
        console.error('Не удалось прочитать posts.json:', err.message);
        process.exit(1);
    }

    if (!Array.isArray(posts)) {
        console.error('posts.json должен содержать массив.');
        process.exit(1);
    }

    // Сортируем по дате — свежие сверху (для читаемости)
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));

    const today = todayISO();
    const blocks = [];

    // Основные страницы
    STATIC_PAGES.forEach(page => {
        blocks.push(urlBlock(page.loc, today, page.changefreq, page.priority));
    });

    // Статьи
    posts.forEach(post => {
        if (!post.url || !post.date) {
            console.warn('Пропускаю статью без url или date:', post.id || post.title);
            return;
        }
        const loc = '/blog/' + post.url;
        const lastmod = post.updated || post.date;
        blocks.push(urlBlock(loc, lastmod, POST_CHANGEFREQ, POST_PRIORITY));
    });

    // Формируем XML
    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        '',
        blocks.join('\n\n'),
        '',
        '</urlset>',
        ''
    ].join('\n');

    // Записываем
    fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');
    console.log(`✅ sitemap.xml обновлён: ${blocks.length} URL`);
    console.log(`   Статей: ${posts.length}`);
    console.log(`   Основных страниц: ${STATIC_PAGES.length}`);
}

generate();
