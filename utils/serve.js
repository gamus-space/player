const express = require('express');
const opn = require('opn');
const path = require('path');
const process = require('process');

const app = express();

app.use(express.static('..'));

app.get('*', function(req, res){
	res.sendFile(`${process.cwd()}/index.html`);
});

const server = app.listen(parseInt(process.argv[2], 10) || 0, () => {
	const url = `http://localhost:${server.address().port}/${path.basename(process.cwd())}`;
	console.log(`Listening at ${url} ...`);
	opn(url);
});
