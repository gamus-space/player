'use strict';

import fs from 'fs';
import path from 'path';
import process from 'process';
import { customEncodeURIComponent } from '../src/common.js';

const DB_URL = 'https://db.gamus.space/index.json';

if (process.argv.length < 3) {
    console.error('usage: ssg.js dir');
    process.exit(1);
}
const [,, dir] = process.argv;

(async () => {
    const indexPath = path.join(dir, 'index.html');
    const index = fs.readFileSync(indexPath, 'utf-8');
    const db = await (await fetch(DB_URL)).json();

    db.forEach(({ platform, game, songs}) => {
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
            <h1>${game} ${platform} soundtrack</h1>
            <ul>
                ${songs.map(({ song, composer }) =>
                    `<li>${song} - ${composer}</li>\n`
                ).join('')}
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

        if (game !== customEncodeURIComponent(game)) {
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
            history.replaceState(undefined, '', location.pathname.replace(/^\\/__|\\/$/g, ''));
        </script>

        <section id="pre_list">
            <script type="text/javascript">
                document.getElementById('pre_list').style.display = 'none';
            </script>
            <h1>game soundtrack</h1>
            <ul>
                ${db.map(({ game, platform }) =>
                    `<li><a href="${platform}/${customEncodeURIComponent(game)}">${game} ${platform}</a></li>\n`
                ).join('')}
            </ul>
        </section>
    `;
    const newIndex = index.replace('<body>', `<body>${inject}`);
    fs.writeFileSync(indexPath, newIndex, 'utf-8');
    console.log(`injected: ${indexPath}`);
})();
