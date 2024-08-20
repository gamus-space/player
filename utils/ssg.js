const fs = require('fs');
const path = require('path');
const process = require('process');

const DB_URL = 'https://db.gamus.space/index.json';

if (process.argv.length < 3) {
    console.error('usage: ssg.js dir');
    process.exit(1);
}
const [,, dir] = process.argv;

function customEncodeURIComponent(str) {
	return str.replace(/ /g, '_').replace(
		/[^/_\w():&"'\.,!\+\-]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
}

(async () => {
    const indexPath = path.join(dir, 'index.html');
    const index = fs.readFileSync(indexPath, 'utf-8');
    const db = await (await fetch(DB_URL)).json();

    db.forEach(({ platform, game, songs}) => {
        if (process.platform === 'win32' && game.match(/[:"]/))
            return;
        const content = `
            <script type="text/javascript">
                location = '/__' + location.pathname;
            </script>
            <h1>${game} ${platform} soundtrack</h1>
            <ul>
                ${songs.map(({ song, composer }) =>
                    `<li>${song} - ${composer}</li>\n`
                ).join('')}
            </ul>
        `;
        contentPath = path.join(dir, platform, game, 'index.html');
        try {
            fs.mkdirSync(path.join(dir, platform));
        } catch(e) {}
        try {
            fs.mkdirSync(path.join(dir, platform, game));
        } catch(e) {}
        fs.writeFileSync(contentPath, content, 'utf-8');
        console.log(`written: ${contentPath}`);
    });

    const inject = `
        <script type="text/javascript">
            history.replaceState(undefined, '', location.pathname.replace(/^\/__|\/$/g, ''));
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
