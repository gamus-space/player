const N = 3;
const delta = Math.PI/6;

const paths = [];
lines = [];
for (let i = -N; i <= N; i++) {
	for (let j = -N; j <= N; j++) {
		const th = i * delta;
		const ph = j * delta;
		const [x, y, z] = [Math.sin(th)*Math.cos(ph), Math.sin(th)*Math.sin(ph), Math.sign(th)*Math.cos(th)]
		lines[i+N] ??= [];
		lines[i+N][j+N] = [y.toFixed(4), z.toFixed(4)];
	}
}

for (let i = -N; i <= N; i++) {
	let path = "";
	for (let j = -N; j <= N; j++)
		path += `${path === '' ? 'M' : 'L'} ${lines[i+N][j+N][0]} ${lines[i+N][j+N][1]} `;
	paths.push(path);
}

for (let j = -N; j <= N; j++) {
	let path = "M 0 1";
	for (let i = 1; i <= N; i++)
		path += `${path === '' ? 'M' : 'L'} ${lines[i+N][j+N][0]} ${lines[i+N][j+N][1]} `;
	paths.push(path);
	path = "";
	for (let i = -N; i <= -1; i++)
		path += `${path === '' ? 'M' : 'L'} ${lines[i+N][j+N][0]} ${lines[i+N][j+N][1]} `;
	paths.push(path + 'L 0 -1');
}

console.log(`
<svg width="64" height="64" viewBox="-1.5 -1.5 3 3" xmlns="http://www.w3.org/2000/svg">
<g transform="rotate(15)">
${(lines.flat(1) && []).map(([x, y]) => `  <circle cx="${x}" cy="${y}" r="0.05" fill="red" />\n`).join('')}
${paths.map(path => `  <path d="${path}" fill="transparent" stroke="black" stroke-width="0.09" />\n`).join('')}
</g>
</svg>
`);
