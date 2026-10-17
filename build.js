function build() {
    console.log('Building SHKIT site...\n');

    // 1. Читаем общие части
    const parts = {
        HEAD: readFile(path.join(PARTS_DIR, 'head.html')),
        HEADER: readFile(path.join(PARTS_DIR, 'header.html')),
        FOOTER: readFile(path.join(PARTS_DIR, 'footer.html')),
        METRIKA: readFile(path.join(PARTS_DIR, 'metrika.html'))
    };

    // 2. Создаём public/, если нет
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });

    // 3. Копируем assets/ (стили, скрипты, картинки)
    console.log('Copying assets/...');
    copyDir(path.join(__dirname, 'assets'), path.join(PUBLIC_DIR, 'assets'));

    // 4. Обрабатываем страницы — рекурсивно
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
                // Рекурсивно обходим подпапки
                fs.mkdirSync(relPath, { recursive: true });
                processDir(fullPath, relPath, urlPrefix + entry.name + '/');
            } else if (entry.name.endsWith('.html')) {
                // Обрабатываем HTML-файл
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
