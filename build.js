#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');
const PARTS_DIR = path.join(SRC_DIR, 'parts');
const PUBLIC_DIR = path.join(__dirname, 'public');
const SITE_URL = 'https://shkit-school.github.io';

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function parseFrontMatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) return { meta: {}, body: content };
    const metaRaw = match[1];
    const body = match[2];
    const meta = {};
    metaRaw.split('\n').forEach(line => {
        const m = line.match(/^(\w+):\s*(.*)$/);
        if (m) {
            let value = m[2].trim();
            value = value.replace(/^["']|["']$/g, '');
            meta[m[1]] = value;
        }
    });
    return { meta, body };
}

function replacePlaceholders(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
    });
}

function copyDir(src, dest) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src, { withFileTypes: true }).forEach(entry => {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });
}

function build() {
    console.log('Building SHKIT site...\n');

    const parts = {
        HEAD: readFile(path.join(PARTS_DIR, 'head.html')),
        HEADER: readFile(path.join(PARTS_DIR, 'header.html')),
        FOOTER: readFile(path.join(PARTS_DIR, 'footer.html')),
        METRIKA: readFile(path.join(PARTS_DIR, 'metrika.html'))
    };

    fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    console.log('Copying assets/...');
    copyDir(path.join(__dirname, 'assets'), path.join(PUBLIC_DIR, 'assets'));

    if (!fs.existsSync(PAGES_DIR)) {
        console.log('Folder src/pages/ is empty. Nothing to build.');
        return;
    }

    let count = 0;

    function processDir(dir, outputDir, urlPrefix) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        entries.forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.join(outputDir, entry.name);

            if (entry.isDirectory()) {
                fs.mkdirSync(relPath, { recursive: true });
                processDir(fullPath, relPath, urlPrefix + entry.name + '/');
            } else if (entry.name.endsWith('.html')) {
                const raw = readFile(fullPath);
                const { meta, body } = parseFrontMatter(raw);
                const canonical = SITE_URL + '/' + urlPrefix + entry.name;

                const vars = {
                    TITLE: meta.title || 'SHKIT',
                    DESCRIPTION: meta.description || '',
                    CANONICAL: canonical,
                    OG_TYPE: meta.og_type || 'website',
                    OG_TITLE: meta.og_title || meta.title || 'SHKIT',
                    OG_DESCRIPTION: meta.og_description || meta.description || '',
                    EXTRA_HEAD: meta.extra_head || '',
                    HEAD: parts.HEAD,
                    HEADER: parts.HEADER,
                    FOOTER: parts.FOOTER,
                    METRIKA: parts.METRIKA
                };

                let html = replacePlaceholders(body, vars);
                html = replacePlaceholders(html, vars);

                fs.writeFileSync(relPath, html, 'utf8');
                console.log('  Built: ' + urlPrefix + entry.name);
                count++;
            }
        });
    }

    processDir(PAGES_DIR, PUBLIC_DIR, '');

    console.log('\nDone! Built ' + count + ' pages in public/');
}

try {
    build();
} catch (err) {
    console.error('Build error:', err.message);
    process.exit(1);
}
