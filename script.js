'use strict';

const DATA_ROOT = '../scraper/data';

let status = { song: null, playing: false, loadingSong: null, loadingUrl: null };

function time(t) {
	t = t.toFixed(0);
	const sec = t % 60;
	const min = Math.floor(t/60);
	return `${min < 10 ? '0' : ''}${min}:${sec<10 ? '0' : ''}${sec}`;
}

class Autoscroll {
	constructor(el, len) {
		this._element = el;
		this._length = len;
		this._delay = 1000;
	}
	get value() {
		return this._value;
	}
	set value(v) {
		const mapping = { ' ': '!', '.': '.!' };
		if (v.length < this._length)
			v = ' '.repeat((this._length - v.length)/2) + v;
		this._chars = v.split('').map(v => mapping[v] || v);
		this._scroll = -1;
		this.tick();
		clearInterval(this._interval);
		if (v.length > this._length)
			this._interval = setInterval(this.tick.bind(this), this._delay);
		else
			this._interval = null;
	}
	tick() {
		if (this._scroll + this._length < this._chars.length)
			this._scroll++;
		else
			this._scroll = 0;
		this._element.text(this._chars.slice(this._scroll, this._scroll + this._length).join(''));
	}
}
const songAutoscroll = new Autoscroll($('#song'), 24);

fetch(`${DATA_ROOT}/db.json`).then(response => response.json()).then(db => {
	const compat = /\/(di|gmc|med|mod|np2|np3|ntp|p4x|pp21|pru2|sfx|xm)\.[^\/]+$/i;
	const songs = db.reduce((flat, game) => [...flat, ...game.songs.map(song => ({ ...song, game }))], []);
	$('#library').DataTable({
		data: songs.map(song => ({
			status: compat.test(song.path) ? '<i class="fas fa-stop"></i>' : '',
			title: song.path.replace(/^[^\/]+\//, ''),
			composer: song.composer,
			game: song.game.title,
			platform: song.platform,
			path: song.path,
			source: song.source,
		})),
		columns: [
			{ data: "status" },
			{ data: "game", title: "Game" },
			{ data: "title", title: "Song" },
			{ data: "composer", title: "Composer" },
			{ data: "platform", title: "Platform" },
		],
		order: [1, 'asc'],
		dom: 'lfrtip',
	});
	const format = /\/(\w+)\.[^\/]+$/i;
	window.statByFormat = () => Object.fromEntries(Object.entries(
		db.reduce((flat, game) => [...flat, ...game.songs], [])
		.filter(song => !/\/songs\//.test(song.path))
		.map(song => format.exec(song.path)?.[1])
		.reduce((res, fmt) => ({ ...res, [fmt]: (res[fmt]||0)+1 }), {})
	).sort(((a, b) => b[1]-a[1])));
});

function updateStatus(update) {
	if (status.song) {
		const table = $('#library').DataTable();
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().path === status.song);
		row.data({ ...row.data(), status: '<i class="fas fa-stop"></i>' });
	}
	status = { ...status, ...update };
	$('#playpause').attr('disabled', !status.song);
	$('#playpause i').attr('class', `fas fa-${status.playing ? 'pause' : 'play'}`)
	if (status.song) {
		const table = $('#library').DataTable();
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().path === status.song);
		row.data({ ...row.data(), status: '<i class="fas fa-play"></i>' });
	}

	if (status.song) {
		const info = ScriptNodePlayer.getInstance().getSongInfo();
		songAutoscroll.value = '>>> ' + [status.song, info?.player, info?.title].map(s => s).join(' ~ ') + ' <<<';
		const volume = player.getVolume();
		$('#volume').val(volume);
		$('#volume').toggleClass('silent', volume == 0);
	} else
		songAutoscroll.value = '~ Pick a song ~';
	if (!status.song)
		$('#time').text('00:00 / 00:00');
}

$('#library tbody').on('click', 'tr', event => {
	const data = $('#library').DataTable().row(event.currentTarget).data();
	const url = `${DATA_ROOT}/${data.source}/${data.path}`;
	updateStatus({ song: null, playing: false, loadingSong: data.path, loadingUrl: url });
	ScriptNodePlayer.getInstance().loadMusicFromURL(url, {}, () => {}, () => {});
});
$('#volume').on('change', event => {
	const volume = event.target.value;
	player.setVolume(volume);
	$('#volume').toggleClass('silent', volume == 0);
});

function onPlayerReady() {
}
function onTrackReadyToPlay() {
	updateStatus({ song: status.loadingSong, playing: true });
}
function onTrackEnd() {
	// updateStatus({ song: null, playing: false });
	const p = ScriptNodePlayer.getInstance();
	p.loadMusicFromURL(status.loadingUrl, {}, () => {}, () => {});
	p.pause();
	updateStatus({ playing: false });
	$('#time').text(`${time(0)} / ${time(p.getMaxPlaybackPosition() / 1000)}`);
}

$('#playpause').on('click', () => {
	if (!status.song)
		return;
	if (status.playing)
		ScriptNodePlayer.getInstance().pause();
	else
		ScriptNodePlayer.getInstance().play();
	updateStatus({ playing: !status.playing });
});

ScriptNodePlayer.createInstance(new XMPBackendAdapter(), '', [], false, onPlayerReady, onTrackReadyToPlay, onTrackEnd);
updateStatus({});

let lastUpdate = 0;
function updateTime(timestamp) {
	requestAnimationFrame(updateTime);
	if (timestamp - lastUpdate < 200 || !status.song || !status.playing)
		return;
	lastUpdate = timestamp;
	const p = ScriptNodePlayer.getInstance();
	$('#time').text(time(p.getPlaybackPosition() / 1000) + ' / ' + time(p.getMaxPlaybackPosition() / 1000));
}
updateTime();
