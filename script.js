'use strict';

const ROOT_URL = document.getElementsByTagName('base')[0].href;
const ROOT_PATH = document.getElementsByTagName('base')[0].attributes.href.value;
const DATA_ROOT = location.hostname === 'localhost' ? '/scraper/data' : 'https://db.gamus.space';
const DOC_TITLE = document.title;

let status = {
	song: null, url: null, playing: false,
	loadingSong: null, loadingUrl: null, autoplay: null,
	playlistEntry: null, playlist: [],
};
let songs;
let games;

let details = { view: null };

const issues = [
	{ name: "The Player 4.1a issues", groups: [
		{ name: "clipped", songs: ["UnExoticA/Superfrog/p4x.intro_tune_5"] },
	]},
	{ name: "RichardJoseph issues", groups: [
		{ name: "silence", songs: ["UnExoticA/Chaos_Engine/rjp.ingame_2.zip"] },
		{ name: "not playing", songs: ["UnExoticA/Chaos_Engine/rjp.menu.zip"] },
	]},
];
const issuesMap = issues
	.map(issue => issue.groups.map(group => group.songs.map(song => ({ song, group: group.name, issue: issue.name }))).reduce((a, e) => [...a, ...e], []))
	.reduce((a, e) => [...a, ...e], [])
	.map(({ song, group, issue }) => [song, `${issue} - ${group}`])
	.reduce((res, [song, issue]) => ({ ...res, [song]: [...res[song] || [], issue] }), {});

function time(t) {
	t = t.toFixed(0);
	const sec = t % 60;
	const min = Math.floor(t/60);
	return `${min < 10 ? '0' : ''}${min}:${sec<10 ? '0' : ''}${sec}`;
}

function song2title({ game, song }) {
	return `${game}/${song}`;
}
function song2url({ song_link }) {
	return `${DATA_ROOT}/${song_link}`;
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
	const compat = /(^|\/)(bp|dw|gmc|mod|np2|np3|p4x|pp21|pru2|rh|rjp|sfx|xm)\.[^\/]+$/i;
	games = db;
	songs = db.reduce((flat, game) => [...flat, ...game.songs.map(song => ({ ...song, ...game, song_url: song2url(song) }))], []);
	$('#library').DataTable({
		data: songs.map(song => ({
			status: compat.test(song.song) ? '<i class="fas fa-stop"></i>' : '',
			song: song.song,
			song_label: song.song + (issuesMap[song.song_link] ? ` <i class="issue fas fa-exclamation-circle" title="${issuesMap[song.song_link].join(`\n`)}"></i>` : ""),
			composer: song.composer,
			game: song.game,
			platform: song.platform,
			song_link: song.song_link,
			song_url: song.song_url,
		})),
		columns: [
			{ name: "status", data: "status" },
			{ name: "game", data: "game", title: "Game" },
			{ name: "song", data: "song_label", title: "Song" },
			{ name: "composer", data: "composer", title: "Composer" },
			{ name: "platform", data: "platform", title: "Platform" },
		],
		order: [1, 'asc'],
		lengthMenu: [[10, 100, 1000, -1], [10, 100, 1000, "All"]],
		dom: 'f<"library_filters">lrtip',
		scrollY: 'calc(100vh - 16em)',
		scrollCollapse: true,
		paging: false,
	});
	$('.library_filters').text('Filter:').append([
		$('<select>', { id: 'filter_platform'}),
		$('<i>', { class: "fas fa-chevron-right" }),
		$('<select>', { id: 'filter_game'}),
		$('<i>', { id: 'filter_song_chevron', class: "fas fa-chevron-right" }),
		$('<select>', { id: 'filter_song'}),
	]);
	$('#filter_platform').on('change', filterChangePlatform);
	$('#filter_game').on('change', filterChangeGame);
	$('#filter_song').on('change', filterChangeSong);
	updateRoute(history.state);
	$('#stats_songs_total').text(songs.length);
	const supportedSongs = songs.filter(song => compat.test(song.song)).length;
	$('#stats_songs_supported').text(supportedSongs);
	$('#stats_bar .ui-slider-handle').text(Math.round(supportedSongs / songs.length * 100) + '%');
	$('#stats_bar').slider({ range: 'min', min: 0, value: supportedSongs, max: songs.length, disabled: true });
	const format = /(^|\/)(\w+)\.[^\/]+$/i;
	window.statByFormat = () => Object.fromEntries(Object.entries(
		db.reduce((flat, game) => [...flat, ...game.songs], [])
		.filter(song => !/\/songs\//.test(song.song_link))
		.map(song => format.exec(song.song)?.[2])
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
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().song_url === status.url);
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
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().song_url === status.url);
		row.data({ ...row.data(), status: '<i class="fas fa-play"></i>' });
	}

	if (status.song) {
		songAutoscroll.value = '>>> ' + [status.song, player.formats()[player.version], loader.packer, player.title].filter(s => s).join(' ~ ') + ' <<<';
		const volume = $('#volume2').length ? $('#volume2').slider('option', 'value') : $('#volume').val();
		player.volume = volume;
	} else
		songAutoscroll.value = '~ Pick a song ~';

	if (status.song) {
		const song = songs.find(song => song.song_url === status.url);
		$('#info_game').text(song.game);
		$('#info_platform').text(song.platform);
		$('#info_year').text(song.year);
		$('#info_song').text(song.song);
		$('#info_composer').text(song.composer);
		$('#info_size').text(Math.round(song.size / 1024));
		$('#info_source').text(song.source).attr('href', song.source_link);
		$('#info_developers').empty().append(...song.developers.map(developer => $('<li>', { text: developer })));
		$('#info_publishers').empty().append(...song.publishers.map(publisher => $('<li>', { text: publisher })));
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
	if (data.status === '')
		return;
	if (details.view === 'playlist') {
		addToPlaylist(data);
		return;
	}
	if (status.playlistEntry)
		$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
	const url = song2url(data);
	updateStatus({ song: null, url: null, playing: false, loadingSong: song2title(data), loadingUrl: url, autoplay: true, playlistEntry: null });
	loadMusicFromURL(url);
});
if (typeof $().slider === 'function') {
	const volume = localStorage.getItem('volume') ?? 1;
	$('#volume').replaceWith($('<div>', { id: 'volume2' }));
	$('#volume2').slider({ orientation: 'vertical', range: 'min', min: 0, value: volume, max: 1, step: 0.05 });
	$('#volume2').on('slide', (event, ui) => {
		const volume = ui.value;
		player.volume = volume;
		localStorage.setItem('volume', volume);
	});
} else {
	const volume = localStorage.getItem('volume') ?? 1;
	$('#volume').val(volume);
	$('#volume').toggleClass('silent', volume == 0);
	$('#volume').removeClass('hidden');
	$('#volume').on('change', event => {
		const volume = event.target.value;
		player.volume = volume;
		$('#volume').toggleClass('silent', volume == 0);
		localStorage.setItem('volume', volume);
	});
}

function onTrackReadyToPlay() {
	updateStatus({ song: status.loadingSong, url: status.loadingUrl, playing: status.autoplay, autoplay: null });
}
function onTrackEnd() {
	if (status.playlistEntry != null) {
		const next = status.playlistEntry === 0 ? null : status.playlist[status.playlistEntry];
		if (status.playlistEntry)
			$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
		if (next) {
			$(`#playlist li:nth-child(${status.playlistEntry+1})`).addClass('playing');
			const nextUrl = song2url(next);
			updateStatus({ song: null, url: null, playing: false, loadingSong: next.song, loadingUrl: nextUrl, autoplay: true, playlistEntry: status.playlistEntry + 1 });
			loadMusicFromURL(nextUrl);
		} else
			updateStatus({ song: null, url: null, playing: false, playlistEntry: null });
		return;
	}
	updateStatus({ playing: false });
	$('#time').text(`${time(0)} / ${time(player.duration / 1000)}`);
}

$('#playpause').on('click', () => {
	if (!status.song)
		return;
	if (status.playing)
		player.pause();
	else
		player.play();
	updateStatus({ playing: !status.playing });
});

$('.show_details').on('click', event => {
	setDetails(event.currentTarget.attributes['data-details'].value);
});
$('.details .hide').on('click', () => {
	setDetails(null);
});
$('.details').on('transitionend', () => {
	$('#library').DataTable().columns.adjust();
});

let lastUpdate = 0;
function updateTime(timestamp) {
	requestAnimationFrame(updateTime);
	if (timestamp - lastUpdate < 200 || !status.song || !status.playing)
		return;
	lastUpdate = timestamp;
	$('#time').text(time(player.position / 1000) + ' / ' + time(player.duration / 1000));
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
$('#playlist_add').on('click', () => {
	const table = $('#library').DataTable();
	table.rows({ search: 'applied' }).data().toArray().filter(({ status }) => status != '').forEach(addToPlaylist);
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
	if (!status.playlistEntry) return;
	playPlaylist(status.playlistEntry + 1);
});
$('#previous').on('click', () => {
	if (!status.playlistEntry) return;
	playPlaylist(status.playlistEntry - 1);
});

function addToPlaylist(data) {
	$('#playlist').append(
		$('<li>', { text: `${data.game} - ${data.song}`, 'data-game': data.game, 'data-song': data.song, 'data-song-link': data.song_link}).append(
			$('<button>', { class: 'small' }).append($('<i>', { class: 'fas fa-times' }))
		)
	);
	updatePlaylist();
}

(localStorage.getItem('playlist') ? JSON.parse(localStorage.getItem('playlist')) : []).forEach(addToPlaylist);

function updatePlaylist(playlistEntry) {
	const playlist = $('#playlist li').get().map(li => ({ game: $(li).attr('data-game'), song: $(li).attr('data-song'), song_link: $(li).attr('data-song-link') }));
	updateStatus({ playlist: playlist.map(e => ({ song: song2title(e), song_link: e.song_link })), playlistEntry });
	localStorage.setItem('playlist', JSON.stringify(playlist));
}

function playPlaylist(playlistEntry) {
	const entry = status.playlist[playlistEntry-1];
	if (!entry)
		return;
	if (status.playlistEntry)
		$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
	$(`#playlist li:nth-child(${playlistEntry})`).addClass('playing');
	const url = song2url(entry);
	updateStatus({ song: null, url: null, playing: false, loadingSong: entry.song, loadingUrl: url, autoplay: true, playlistEntry });
	loadMusicFromURL(url);
}

const filters = { platform: '', game: '', song: '' };

function setOptions(select, options, all) {
	select.empty().append(options.map(option => $('<option>', { value: option, text: option || all })));
}
function updateFiltersPlatform() {
	setOptions($('#filter_platform'), ['', 'Amiga'], '(Platform)');
}
function updateFiltersGame() {
	setOptions($('#filter_game'), [''].concat(games.map(game => game.game)), '(Game)');
}
function updateFiltersSong() {
	const songs = games.find(game => game.game === filters.game)?.songs || [];
	setOptions($('#filter_song'), [''].concat(songs.map(song => song.song)), '(Song)');
}
function filterChangePlatform(event) {
	enterState({ platform: event.target.value });
}
function filterChangeGame(event) {
	enterState({ platform: filters.platform, game: event.target.value });
}
function filterChangeSong(event) {
	enterState({ platform: filters.platform, game: filters.game, song: event.target.value });
}
function enterState(state) {
	const routePath = (root, segments) => `${root}${segments.map(s => encodeURIComponent(s)).join('/')}`;
	const segments = [state.platform, state.game, state.song].filter(s => s != null);
	history.pushState(state, '', routePath(ROOT_URL, segments));
	updateRoute(history.state);
}
function updateRoute(state) {
	state ||= initRoute(location.pathname);
	filters.platform = state?.platform || '';
	filters.game = state?.game || '';
	filters.song = state?.song || '';
	updateFiltersPlatform();
	updateFiltersGame();
	updateFiltersSong();
	$('#filter_platform').val(filters.platform);
	$('#filter_game').val(filters.game);
	$('#filter_song').val(filters.song);
	$('#filter_platform').toggleClass('active', filters.platform !== '');
	$('#filter_game').toggleClass('active', filters.game !== '');
	$('#filter_song').toggleClass('active', filters.song !== '');
	$('#filter_song, #filter_song_chevron').css('display', filters.game !== '' ? 'initial' : 'none');
	const table = $('#library').DataTable();
	table.column('platform:name').search(filters.platform && `^${$.fn.dataTable.util.escapeRegex(filters.platform)}$`, true, false).draw();
	table.column('game:name').search(filters.game && `^${$.fn.dataTable.util.escapeRegex(filters.game)}$`, true, false).draw();
	table.column('song:name').search(filters.song && `^${$.fn.dataTable.util.escapeRegex(filters.song)}($| )`, true, false).draw();
	document.title = [filters.platform, filters.game, filters.song, DOC_TITLE].filter(s => s !== '').join(' - ');
}
function initRoute(path) {
	const stripPrefix = (s, p) => s.startsWith(p) ? s.slice(p.length) : s;
	const split = (s, d) => s === '' ? [] : s.split(d);
	const segments = split(stripPrefix(path, ROOT_PATH), '/').map(s => decodeURIComponent(s));
	return { platform: segments[0], game: segments[1], song: segments[2] };
}
window.onpopstate = (event) => {
	updateRoute(event.state);
};

let unloading = false;
function loadMusicFromURL(url) {
	const xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	xhr.onreadystatechange = () => {
		unloading = true;
		if (!loader.load(xhr.response)) return;
		unloading = false;
		player.play();
		onTrackReadyToPlay();
	};
	xhr.send();
}

const loader = window.neoart.FileLoader();
const player = loader.player;
document.addEventListener("flodStop", () => { if (!unloading) onTrackEnd(); });
updateStatus({});
