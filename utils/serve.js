import express from 'express';
import opn from 'opn';
import path from 'path';
import process from 'process';

const app = express();

app.use(express.static('..'));

app.use((req, res, next) => {
	res.status(404);
	res.sendFile(`${process.cwd()}/index.html`);
});

const server = app.listen(parseInt(process.argv[2], 10) || 0, () => {
	const url = `http://localhost:${server.address().port}/${path.basename(process.cwd())}`;
	console.log(`Listening at ${url} ...`);
	opn(url);
});
