'use strict';

const DATA_ROOT = location.hostname === 'localhost' ? '../scraper/data' : 'https://db.gamus.space';

let status = {
	song: null, playing: false,
	loadingSong: null, loadingUrl: null, autoplay: null,
	playlistEntry: null, playlist: [],
};
let songs;

let details = { view: null };

function time(t) {
	t = t.toFixed(0);
	const sec = t % 60;
	const min = Math.floor(t/60);
	return `${min < 10 ? '0' : ''}${min}:${sec<10 ? '0' : ''}${sec}`;
}

function path2title(path) {
	return path.replace(/^[^\/]+\//, '');
}
function path2url({ path, source} ) {
	return `${DATA_ROOT}/${source}/${path}`;
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

fetch(`${DATA_ROOT}/index.json`).then(response => response.json()).then(db => {
	const compat = /\/(di|gmc|med|mod|np2|np3|ntp|p4x|pp21|pru2|sfx|xm)\.[^\/]+$/i;
	songs = db.reduce((flat, game) => [...flat, ...game.songs.map(song => ({ ...song, game }))], []);
	$('#library').DataTable({
		data: songs.map(song => ({
			status: compat.test(song.path) ? '<i class="fas fa-stop"></i>' : '',
			title: path2title(song.path),
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
		lengthMenu: [[10, 100, 1000, -1], [10, 100, 1000, "All"]],
		dom: 'flrtip',
		scrollY: 'calc(100vh - 16em)',
		scrollCollapse: true,
		paging: false,
	});
	$('#stats_songs_total').text(songs.length);
	const supportedSongs = songs.filter(song => compat.test(song.path)).length;
	$('#stats_songs_supported').text(supportedSongs);
	$('#stats_bar .ui-slider-handle').text(Math.round(supportedSongs / songs.length * 100) + '%');
	$('#stats_bar').slider({ range: 'min', min: 0, value: supportedSongs, max: songs.length, disabled: true });
	const format = /\/(\w+)\.[^\/]+$/i;
	window.statByFormat = () => Object.fromEntries(Object.entries(
		db.reduce((flat, game) => [...flat, ...game.songs], [])
		.filter(song => !/\/songs\//.test(song.path))
		.map(song => format.exec(song.path)?.[1])
		.reduce((res, fmt) => ({ ...res, [fmt]: (res[fmt]||0)+1 }), {})
	).sort(((a, b) => b[1]-a[1])));
});

function updatePlaylistStatus() {
	$('#pos').text(status.playlistEntry ? `${status.playlistEntry}/${status.playlist.length}` : '');
	$('#previous').attr('disabled', !status.playlistEntry || status.playlistEntry === 1);
	$('#next').attr('disabled', !status.playlistEntry || status.playlistEntry === status.playlist.length);
}

function updateStatus(update) {
	if (update.playlist) {
		status.playlist = update.playlist;
		if (update.playlistEntry != null)
			status.playlistEntry = update.playlistEntry;
		$('#playlist_clear').attr('disabled', !status.playlist.length);
		updatePlaylistStatus();
		return;
	}

	if (status.song) {
		const table = $('#library').DataTable();
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().path === status.song);
		row.data({ ...row.data(), status: '<i class="fas fa-stop"></i>' });
	}

	status = { ...status, ...update };

	$('#playpause').attr('disabled', !status.song);
	$('#playpause i').attr('class', `fas fa-${status.playing ? 'pause' : 'play'}`)
	updatePlaylistStatus();
	if (!status.song)
		$('#time').text('00:00 / 00:00');

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
		$('#volume2').slider({ value: volume });
	} else
		songAutoscroll.value = '~ Pick a song ~';

	if (status.song) {
		const song = songs.find(song => song.path === status.song);
		$('#info_game').text(song.game.title);
		$('#info_platform').text(song.platform);
		$('#info_year').text(song.game.year);
		$('#info_song').text(path2title(song.path).replaceAll('/', ' / '));
		$('#info_composer').text(song.composer);
		$('#info_size').text(Math.round(song.size / 1024));
		$('#info_source').text(song.source);
		$('#info_developers').empty().append(...song.game.developers.map(developer => $('<li>', { text: developer })));
		$('#info_publishers').empty().append(...song.game.publishers.map(publisher => $('<li>', { text: publisher })));
		if (status.playing && details.view === null)
			setDetails('info');
	}
}

function setDetails(view) {
	details = { ...details, view };
	$('.details').addClass('details_hidden');
	$('.menu').addClass('hidden');
	if (details.view != null)
		$(`.details.${details.view}`).removeClass('details_hidden');
	else
		$('.menu').removeClass('hidden');
}

$('#library tbody').on('click', 'tr', event => {
	const data = $('#library').DataTable().row(event.currentTarget).data();
	const url = path2url(data);
	if (data.status === '')
		return;
	if (details.view === 'playlist') {
		$('#playlist').append(
			$('<li>', { text: `${data.game} - ${data.title}`, 'data-path': data.path, 'data-source': data.source }).append(
				$('<button>', { class: 'small' }).append($('<i>', { class: 'fas fa-times' }))
			)
		);
		updatePlaylist();
		return;
	}
	if (status.playlistEntry)
		$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
	updateStatus({ song: null, playing: false, loadingSong: data.path, loadingUrl: url, autoplay: true, playlistEntry: null});
	ScriptNodePlayer.getInstance().loadMusicFromURL(url, {}, () => {}, () => {});
});
if (typeof $().slider === 'function') {
	$('#volume').replaceWith($('<div>', { id: 'volume2' }));
	$('#volume2').slider({ orientation: 'vertical', range: 'min', min: 0, value: 1, max: 1, step: 0.05 });
	$('#volume2').on('slide', (event, ui) => {
		player.setVolume(ui.value);
	});
} else {
	$('#volume').removeClass('hidden');
	$('#volume').on('change', event => {
		const volume = event.target.value;
		player.setVolume(volume);
		$('#volume').toggleClass('silent', volume == 0);
	});
}

function onPlayerReady() {
}
function onTrackReadyToPlay() {
	updateStatus({ song: status.loadingSong, playing: status.autoplay, autoplay: null });
}
function onTrackEnd() {
	const p = ScriptNodePlayer.getInstance();
	status.autoplay = false;
	if (status.playlistEntry != null) {
		const next = status.playlistEntry === 0 ? null : status.playlist[status.playlistEntry];
		if (status.playlistEntry)
			$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
		if (next) {
			$(`#playlist li:nth-child(${status.playlistEntry+1})`).addClass('playing');
			updateStatus({ song: null, playing: false, loadingSong: next.path, loadingUrl: path2url(next), autoplay: true, playlistEntry: status.playlistEntry + 1 });
			p.loadMusicFromURL(path2url(next), {}, () => {}, () => {});
		} else
			updateStatus({ song: null, playing: false, playlistEntry: null });
		return;
	}
	p.loadMusicFromURL(status.loadingUrl, {}, () => {}, () => {});
	p.pause();
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

$('.show_details').on('click', event => {
	setDetails(event.currentTarget.attributes['data-details'].value);
});
$('.details > .hide').on('click', () => {
	setDetails(null);
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

$('#playlist').sortable({ axis: 'y', helper: 'clone' });
$('#playlist').on('click', 'li', event => {
	playPlaylist($(event.target).index()+1);
});
$('#playlist').on('click', 'button', event => {
	event.stopPropagation();
	const position = $(event.target).parents('li').index() + 1;
	const entry = position === status.playlistEntry ? 0: status.playlistEntry - (position < status.playlistEntry ? 1 : 0);
	$(event.target).parents('li').remove();
	updatePlaylist(entry);
});
$('#playlist_clear').on('click', () => {
	$('#playlist').empty();
	updatePlaylist(0);
});
let sortedPosition;
$('#playlist').on('sortstart', (event, ui) => {
	sortedPosition = ui.item.index() + 1;
});
$('#playlist').on('sortupdate', (event, ui) => {
	const newPosition = ui.item.index() + 1;
	const entry =
		sortedPosition === status.playlistEntry ? newPosition :
		sortedPosition < status.playlistEntry && newPosition >= status.playlistEntry ? status.playlistEntry - 1 :
		sortedPosition > status.playlistEntry && newPosition <= status.playlistEntry ? status.playlistEntry + 1 :
		null;
	updatePlaylist(entry);
});
$('#next').on('click', () => {
	playPlaylist(status.playlistEntry + 1);
});
$('#previous').on('click', () => {
	playPlaylist(status.playlistEntry - 1);
});

function updatePlaylist(playlistEntry) {
	const playlist = $('#playlist li').get().map(li => ({ path: $(li).attr('data-path'), source: $(li).attr('data-source') }));
	updateStatus({ playlist, playlistEntry });
}

function playPlaylist(playlistEntry) {
	const song = status.playlist[playlistEntry-1];
	if (!song)
		return;
	const url = path2url(song);
	if (status.playlistEntry)
		$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
	$(`#playlist li:nth-child(${playlistEntry})`).addClass('playing');
	updateStatus({ song: null, playing: false, loadingSong: song.path, loadingUrl: url, autoplay: true, playlistEntry });
	ScriptNodePlayer.getInstance().loadMusicFromURL(url, {}, () => {}, () => {});
}
