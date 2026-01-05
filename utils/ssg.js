'use strict';

import fs from 'fs';
import path from 'path';
import process from 'process';
import { customEncodeURIComponent } from '../src/common.js';

const DB_URL = 'https://db.gamus.space/index.json';
const ROOT_URL = 'https://gamus.space';

if (process.argv.length < 3) {
    console.error('usage: ssg.js dir');
    process.exit(1);
}
const [,, dir] = process.argv;

function XMLencodeURIComponent(component) {
    return encodeURIComponent(component.replace(/ /g, '_')).replace(
        /[']/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

function uniqByString(array, keyFn) {
    return Object.values(array.reduce((res, row) => ({ ...res, [keyFn(row)]: row }), {}));
}

(async () => {
    const indexPath = path.join(dir, 'index.html');
    const index = fs.readFileSync(indexPath, 'utf-8');
    const db = await (await fetch(DB_URL)).json();

    db.forEach(({ platform, game, songs, year, developers, publishers, source, source_link, links }) => {
        if (process.platform === 'win32' && game.match(/[:"]/))
            return;
        const content = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
            <title>GAMUS - ${game} ${platform} soundtrack</title>
            </head>
            <body>
            <script type="text/javascript">
                location = '/__' + location.pathname;
            </script>
            <h1>${game} soundtrack</h1>
            <h3>platform</h3>
            <p>${platform}</p>
            <h3>year</h3>
            <p>${year}</p>
            <h3>game developed by</h3>
            <ul>
              ${(developers ?? []).map(d => `<li>${d}</li>`).join('\n')}
            </ul>
            <h3>game published by</h3>
            <ul>
              ${(publishers ?? []).map(p => `<li>${p}</li>`).join('\n')}
            </ul>
            <h2>songs</h2>
            <ul>
                ${songs.map(({ song, composer }) =>
                    `<li>${song} - ${composer}</li>`
                ).join('\n')}
            </ul>
            <h3>from</h3>
            <a target="_blank" href="${source_link ?? '/'}">${source}</a>
            <h3>links</h3>
            <ul>
              ${(links ?? []).map(({ site, url }) =>
                `<li><a target="_blank" href="${url}">${site}</a></li>`
              ).join('\n')}
            </ul>
            </body>
            </html>
        `;
        try {
            fs.mkdirSync(path.join(dir, platform));
        } catch(e) {}
        const contentPath = path.join(dir, platform, customEncodeURIComponent(game), 'index.html');
        try {
            fs.mkdirSync(path.join(dir, platform, customEncodeURIComponent(game)));
        } catch(e) {}
        fs.writeFileSync(contentPath, content, 'utf-8');
        console.log(`written: ${contentPath}`);

        if (game !== customEncodeURIComponent(game) && !game.includes('/')) {
            const contentPath2 = path.join(dir, platform, game, 'index.html');
            try {
                fs.mkdirSync(path.join(dir, platform, game));
            } catch(e) {}
            fs.writeFileSync(contentPath2, content, 'utf-8');
            console.log(`written: ${contentPath2}`);
        }
    });

    const inject = `
        <script type="text/javascript">
            const path = location.pathname.replace(/^\\/__|\\/$/g, '');
            if (path !== location.pathname)
                history.replaceState(undefined, '', path);
        </script>

        <section id="pre_list">
            <script type="text/javascript">
                document.getElementById('pre_list').style.display = 'none';
            </script>
            <h1>game soundtrack</h1>
            <ul>
                ${db.map(({ game, platform }) =>
                    `<li><a href="${platform}/${customEncodeURIComponent(game)}/">${game} ${platform}</a></li>`
                ).join('\n')}
            </ul>
        </section>
    `;
    const newIndex = index.replace('<body>', `<body>${inject}`);
    fs.writeFileSync(indexPath, newIndex, 'utf-8');
    console.log(`injected: ${indexPath}`);

    const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${ROOT_URL}/</loc>
    <lastmod>${new Date().toISOString().substring(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
${uniqByString(db, ({ game, platform}) => `${game}/${platform}`).map(({ game, platform }) =>
`  <url>
    <loc>${ROOT_URL}/${platform}/${XMLencodeURIComponent(game)}/</loc>
    <changefreq>yearly</changefreq>
  </url>`
).join('\n')}
</urlset>`;
    const sitemapPath = path.join(dir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    console.log(`written: ${sitemapPath}`);

    const robots =
`User-Agent: *
Allow: /

Sitemap: ${ROOT_URL}/sitemap.xml
`;
    const robotsPath = path.join(dir, 'robots.txt');
    fs.writeFileSync(robotsPath, robots);
    console.log(`written: ${robotsPath}`);
})();
