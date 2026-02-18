'use strict';

import { customEncodeURIComponent } from './common.js';
import { invalidSongs, songIssues } from './db.js';
import { Player } from './player.js';

const ROOT_URL = document.getElementsByTagName('base')[0].href;
const ROOT_PATH = document.getElementsByTagName('base')[0].attributes.href.value;
const DATA_ROOT = location.hostname === 'localhost' ? '/scraper/data' : 'https://db.gamus.space';
const DOC_TITLE = document.title;
const SEEK_START_LIMIT = 2;

let status = {
	song: null, url: null, playing: false,
	loadingSong: null, loadingUrl: null, autoplay: null,
	playlistEntry: null, playlist: [],
	mono: null, repeat: null, random: null, availableSongs: null,
};
let songs, songsByUrl;
let games;

let details = { view: null };

const player = new Player();

function time(t) {
	t = t.toFixed(0);
	const sec = t % 60;
	const min = Math.floor(t/60);
	return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function randomInt(n) {
	return Math.floor(Math.random() * n);
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
		const mapping = { ' ': '!', '.': '.!', '#': '*' };
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
const songAutoscroll = new Autoscroll($('#song'), 31);

fetch(`${DATA_ROOT}/index.json`).then(response => response.json()).then(db => {
	const compat = player.files();
	games = db;
	const allSongs = db.flatMap(game => {
		const gallery = game.links?.flatMap(link => (link.gallery ?? []).map(image => ({ ...link, image })))
		return game.songs.map(song => ({
			...game,
			...song,
			song_url: song2url(song),
			gallery,
		}));
	});
	songsByUrl = Object.fromEntries(allSongs.map(song => [song.song_url, song]));
	songs = allSongs.filter(song => !invalidSongs.includes(song.song_link));

	const unmatchedInvalid = invalidSongs.filter(song_link => !songsByUrl[song2url({ song_link })]);
	if (unmatchedInvalid.length > 0)
		console.warn('unmatched invalid song filter', unmatchedInvalid);
	const unmatchedIssues = Object.keys(songIssues).filter(song_link => !songsByUrl[song2url({ song_link })]);
	if (unmatchedIssues.length > 0)
		console.warn('unmatched song issues filter', unmatchedIssues);

	$('#library').DataTable({
		data: songs.map(song => ({
			status: compat.test(song.song_link) ? '<i class="fas fa-stop"></i>' : '',
			song: song.song,
			song_label: song.song + (songIssues[song.song_link] ? ` <i class="issue fas fa-exclamation-circle" title="${songIssues[song.song_link].join(`\n`)}"></i>` : ""),
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
		dom: 'f<"library_filters">rtip',
		scrollY: 'calc(100vh - 16em)',
		scrollCollapse: true,
		paging: true,
		pageLength: 1000,
		language: {
			paginate: {
				previous: '<',
				next: '>',
			},
		},
	}).on('search.dt', (...a) => {
		updateStatus({ availableSongs: playableSongs().length > 0 });
	});
	new ResizeObserver(([{ target }]) => {
		setTimeout(() => {
			$(target).css('max-height', `calc(100vh - ${target.getBoundingClientRect().y + 60}px)`);
		});
	}).observe($('#library').parent().get(0));
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
	$('#pc_songs').text(songs.filter(({ platform }) => platform === 'PC').length);
	const amigaSongs = songs.filter(({ platform }) => platform === 'Amiga');
	const totalSongs = amigaSongs.length;
	const supportedSongs = amigaSongs.filter(song => compat.test(song.song_link)).length;
	$('.stats_bar .songs_total').text(totalSongs);
	$('.stats_bar .songs_supported').text(supportedSongs);
	$('.stats_bar .slider').attr('value', supportedSongs / totalSongs);
	$('.stats_bar .slider').attr('label', (supportedSongs / totalSongs * 100).toFixed(1) + '%');
	const formatPrefix = /(?:^|\/)(\w+)\.[^\/]+$/i;
	const formatSuffix = /\.(\w+)(?:#\d+)?$/i;
	window.statByFormat = () => Object.fromEntries(Object.entries(
		db.reduce((flat, game) => [...flat, ...game.songs.map(song => ({ ...song, source: game.source }))], [])
		.filter(song => !invalidSongs.includes(song.song_link))
		.filter(song => !/\/songs\//.test(song.song_link))
		.map(song => (song.source === "UnExoticA" ? formatPrefix : formatSuffix).exec(song.song_link)?.[1])
		.map(fmt => fmt?.toLowerCase())
		.reduce((res, fmt) => ({ ...res, [fmt]: (res[fmt]||0)+1 }), {})
	).sort(((a, b) => b[1]-a[1])));
});

function updatePlaylistStatus() {
	$('#pos').text(status.playlistEntry ? `${String(status.playlistEntry).padStart(String(status.playlist.length).length, '0')}/${status.playlist.length}` : '');
	$('#next').attr('disabled', (status.playlistEntry || !status.availableSongs) && (!status.playlistEntry || (status.playlistEntry === status.playlist.length && !status.random)));
	updatePreviousDisabled();
}
function updatePreviousDisabled() {
	$('#previous').attr('disabled', player.position <= SEEK_START_LIMIT && (((status.playlistEntry || !status.availableSongs) && (!status.playlistEntry || status.playlistEntry === 1)) || status.random));
}

function updateStatus(update) {
	if (update.availableSongs) {
		status.availableSongs = update.availableSongs;
		updatePlaylistStatus();
		return;
	}
	if (update.playlist) {
		status.playlist = update.playlist;
		if (update.playlistEntry != null)
			status.playlistEntry = update.playlistEntry;
		player.loop = status.playlistEntry ? false : status.repeat;
		$('#playlist_clear').attr('disabled', !status.playlist.length);
		updatePlaylistStatus();
		return;
	}

	if (status.song) {
		const table = $('#library').DataTable();
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().song_url === status.url);
		row.data({ ...row.data(), status: '<i class="fas fa-stop"></i>' });
	}

	if (update.random) update = { ...update, repeat: false };
	if (update.repeat) update = { ...update, random: false };
	status = { ...status, ...update };

	$('#playpause').attr('disabled', !status.song);
	$('#playpause i').attr('class', `fas fa-${status.playing ? 'pause' : 'play'}`)
	updatePlaylistStatus();
	if (!status.song) {
		$('#time').text('00:00 / 00:00');
		$('#time_slider').attr('value', 0);
		$('#time_slider').attr('readonly', '');
	}
	$('#mono').toggleClass('inactive', !status.mono);
	$('#random').toggleClass('inactive', !status.random);
	$('#repeat').toggleClass('inactive', !status.repeat);
	localStorage.setItem('mono', status.mono);
	localStorage.setItem('repeat', status.repeat);
	localStorage.setItem('random', status.random);
	player.loop = status.playlistEntry ? false : status.repeat;
	player.stereoSeparation = status.mono ? 0 : 1;

	if (status.song) {
		const table = $('#library').DataTable();
		const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().song_url === status.url);
		row.data({ ...row.data(), status: '<i class="fas fa-play"></i>' });
	}

	if (status.song) {
		songAutoscroll.value = '>>> ' + [status.song, ...player.status].filter(s => s).join(' ~ ') + ' <<<';
	} else
		songAutoscroll.value = '~ Pick a song ~';

	if (status.song) {
		const song = songs.find(song => song.song_url === status.url);
		$('#info_game').text(song.game);
		$('#info_platform').text(song.platform);
		$('#info_year').text(song.year);
		$('#info_song').text(song.song);
		$('#info_composer').text(song.composer);
		$('#info_size').text((song.size / 1024).toFixed(1));
		$('#info_source').text(song.source).attr('href', song.source_link ?? '');
		$('#info_developers').empty().append(...(song.developers || []).map(developer => $('<li>', { text: developer })));
		$('#info_publishers').empty().append(...(song.publishers || []).map(publisher => $('<li>', { text: publisher })));
		$('#title_links').toggle((song.links || []).length > 0);
		$('#info_links').empty().append(...(song.links || []).map(link => $('<li>').append($('<a>', { text: link.site, href: link.url, target: '_blank' }))));
		if (status.playing && details.view === null && !$('.center').hasClass('gallery'))
			setDetails('info');
		setGallery(song.gallery, song.game);
	}
}

let galleryStatus = {
	list: null,
	index: 0,
};
let galleryInterval;
function setGallery(gallery, game) {
	if (galleryStatus.list != null &&
		(gallery?.length ?? 0) === galleryStatus.list.length &&
		galleryStatus.list.every((item, i) => item === gallery[i]) &&
		(galleryStatus.list.length > 0 || galleryStatus.game === game)) return;

	galleryStatus = { list: gallery || [], index: 0, game };
	if (galleryInterval)
		clearInterval(galleryInterval);
	updateGallery();
	galleryInterval = setInterval(updateGallery, 15000);
}
function updateGallery() {
	const previous = $('.center .gallery .active');
	$('.center .gallery .image.passive')
		.removeClass('passive').addClass('active')
		.toggle(galleryStatus.list.length > 0)
		.css('background-image', `url("${galleryStatus.list[galleryStatus.index]?.image}")`);
	$('.center .gallery .game.passive')
		.removeClass('passive').addClass('active')
		.text(galleryStatus.list.length === 0 ? galleryStatus.game : '');
	previous.removeClass('active').addClass('passive');
	$('.center .gallery .count')
		.toggle(galleryStatus.list.length > 0)
		.find('.current').text(galleryStatus.index + 1).end()
		.find('.total').text(galleryStatus.list.length).end();
	$('.center .gallery .source')
		.toggle(galleryStatus.list.length > 0)
		.find('a')
			.attr('href', galleryStatus.list[galleryStatus.index]?.url ?? '#')
			.text(galleryStatus.list[galleryStatus.index]?.site ?? '?');
	galleryStatus.index = (galleryStatus.index + 1) % galleryStatus.list.length;
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
	playSong(data);
});
const volume = localStorage.getItem('volume') ?? 1;
$('#volume').attr('value', volume);
$('#volume').on('change', event => {
	const volume = event.detail.value;
	player.volume = volume;
	localStorage.setItem('volume', volume);
});
setTimeout(() => { player.volume = volume; });
$('#time_slider').on('change', event => {
	player.seek(event.detail.value * player.duration);
});
$('#repeat').on('click', () => {
	updateStatus({ repeat: !status.repeat });
});
$('#random').on('click', () => {
	updateStatus({ random: !status.random });
});
$('#mono').on('click', () => {
	updateStatus({ mono: !status.mono });
});

function playableSongs() {
	return $('#library').DataTable().rows({ search: 'applied' }).data().toArray().filter(({ status }) => status != '');
}

function playSong(data) {
	const url = song2url(data);
	updateStatus({ song: null, url: null, playing: false, loadingSong: song2title(data), loadingUrl: url, autoplay: true, playlistEntry: null });
	loadMusicFromURL(url);
}

function playRandomSong() {
	const songs = playableSongs();
	if (songs.length > 0) {
		playSong(songs[randomInt(songs.length)]);
		return true;
	}
	return false;
}

function readyToPlay() {
	updateStatus({ song: status.loadingSong, url: status.loadingUrl, playing: status.autoplay, autoplay: null });
}
function stopped() {
	if (playNext(true)) return;
	updateStatus({ playing: false });
	$('#time').text(`${time(0)} / ${time(player.duration)}`);
	$('#time_slider').attr('value', 0);
	$('#time_slider').attr('readonly', '');
	$('#previous i').removeClass('fa-backward').addClass('fa-step-backward');
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

$('.toggle_gallery').on('click', event => {
	$('.center').toggleClass('gallery');
	$(event.currentTarget)
		.attr('title', $('.center').hasClass('gallery') ? 'Library' : 'Gallery')
		.find('.fas')
			.toggleClass('fa-image', !$('.center').hasClass('gallery'))
			.toggleClass('fa-folder', $('.center').hasClass('gallery'));
	$('#playlist_add').attr('disabled', $('.center').hasClass('gallery'));
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
	$('#time').text(time(player.position) + ' / ' + time(player.duration));
	$('#time_slider').attr('value', player.position / player.duration);
	$('#time_slider').attr('readonly', null);
	if (player.position <= SEEK_START_LIMIT && $('#previous i').hasClass('fa-backward'))
		$('#previous i').removeClass('fa-backward').addClass('fa-step-backward');
	if (player.position > SEEK_START_LIMIT && $('#previous i').hasClass('fa-step-backward'))
		$('#previous i').removeClass('fa-step-backward').addClass('fa-backward');
	updatePreviousDisabled();
}
updateTime();

$('#playlist').on('dragged', event => {
	const sortedPosition = event.detail.oldIndex + 1;
	const newPosition = event.detail.newIndex + 1;
	if (sortedPosition === newPosition) { return; }
	const entry =
		sortedPosition === status.playlistEntry ? newPosition :
		sortedPosition < status.playlistEntry && newPosition >= status.playlistEntry ? status.playlistEntry - 1 :
		sortedPosition > status.playlistEntry && newPosition <= status.playlistEntry ? status.playlistEntry + 1 :
		null;
	updatePlaylist(entry);
});

$('#playlist').on('click', 'li', event => {
	playPlaylist($(event.target).index()+1);
});
$('#playlist').on('click', 'button', event => {
	event.stopPropagation();
	const position = $(event.target).parents('li').index() + 1;
	const entry = position === status.playlistEntry ? 0 : status.playlistEntry - (position < status.playlistEntry ? 1 : 0);
	$(event.target).parents('li').remove();
	updatePlaylist(entry);
});
$('#playlist_add').on('click', () => {
	playableSongs().forEach(addToPlaylist);
});
$('#playlist_clear').on('click', () => {
	$('#playlist').empty();
	updatePlaylist(0);
});

function playNext(autoPlay) {
	if (!status.playlistEntry) {
		if (status.random) {
			return playRandomSong();
		} else {
			const songs = playableSongs();
			if (songs.length === 0) return false;
			const i = songs.findIndex(song => song.song_url === status.url);
			if (autoPlay && (i < 0 || i === songs.length - 1)) return false;
			playSong(songs[i < songs.length-1 ? i+1 : 0]);
		}
		return true;
	}
	if (status.random) {
		for (let i = 0; i < status.playlist.length; i++) {
			if (playPlaylist(randomInt(status.playlist.length) + 1)) return true;
		}
		return false;
	} else {
		let i;
		for (i = status.playlistEntry + 1; i <= status.playlist.length; i++) {
			if (playPlaylist(i)) return true;
		}
		if (i > status.playlist.length && status.repeat) {
			for (i = 1; i <= status.playlist.length; i++) {
				if (playPlaylist(i)) return true;
			}
		}
		return false;
	}
}
$('#next').on('click', () => playNext(false));
$('#previous').on('click', () => {
	if (player.position > SEEK_START_LIMIT) {
		player.seek(0);
		return;
	}
	if (status.random) return;
	if (!status.playlistEntry) {
		const songs = playableSongs();
		if (songs.length === 0) return;
		const i = songs.findIndex(song => song.song_url === status.url);
		playSong(songs[i > 0 ? i-1 : songs.length-1]);
		return;
	}
	for (let i = status.playlistEntry - 1; i >= 1; i--) {
		if (playPlaylist(i)) break;
	}
});

function addToPlaylist(data) {
	$('#playlist').append(
		$('<li>', { text: `${data.game} - ${data.song}`, 'data-game': data.game, 'data-song': data.song, 'data-song-link': data.song_link}).append(
			$('<button>', { class: 'small' }).append($('<i>', { class: 'fas fa-times' }))
		)
	);
	updatePlaylist();
}

function updatePlaylist(playlistEntry) {
	const playlist = $('#playlist li').get().map(li => ({ game: $(li).attr('data-game'), song: $(li).attr('data-song'), song_link: $(li).attr('data-song-link') }));
	updateStatus({ playlist: playlist.map(e => ({ song: song2title(e), song_link: e.song_link })), playlistEntry });
	localStorage.setItem('playlist', JSON.stringify(playlist));
}

function playPlaylist(playlistEntry) {
	const entry = status.playlist[playlistEntry-1];
	if (!entry)
		return false;
	const url = song2url(entry);
	const table = $('#library').DataTable();
	const row = table.rows().nodes().toArray().map(node => table.row(node)).find(row => row.data().song_url === url);
	if (!row) {
		$(`#playlist li:nth-child(${playlistEntry})`).addClass('invalid');
		return false;
	}
	if (status.playlistEntry)
		$(`#playlist li:nth-child(${status.playlistEntry})`).removeClass('playing');
	$(`#playlist li:nth-child(${playlistEntry})`).addClass('playing');

	updateStatus({ song: null, url: null, playing: false, loadingSong: entry.song, loadingUrl: url, autoplay: true, playlistEntry });
	loadMusicFromURL(url);
	return true;
}

const filters = { platform: '', game: '', song: '' };

function setOptions(select, options, all) {
	select.empty().append(options.map(option => $('<option>', { value: option, text: option || all })));
}
function updateFiltersPlatform() {
	setOptions($('#filter_platform'), [''].concat([...new Set(games.map(game => game.platform))]), '(Platform)');
}
function updateFiltersGame() {
	const filtered = filters.platform != '' ? games.filter(game => game.platform === filters.platform) : games;
	setOptions($('#filter_game'), [''].concat([...new Set(filtered.map(game => game.game))]), '(Game)');
}
function updateFiltersSong() {
	const songs = games.filter(game => game.game === filters.game && (!filters.platform || game.platform === filters.platform)).map(game => game.songs).flat();
	setOptions($('#filter_song'), [''].concat(songs.map(song => song.song)), '(Song)');
}
function filterChangePlatform(event) {
	const platform = event.target.value;
	const games_ = games.filter(game => game.game === filters.game && (!platform || game.platform === platform));
	const song = games_.map(game => game.songs).flat().find(song => song.song === filters.song);
	enterState({ platform, game: games_[0]?.game, song: song?.song });
}
function filterChangeGame(event) {
	enterState({ platform: filters.platform, game: event.target.value });
}
function filterChangeSong(event) {
	enterState({ platform: filters.platform, game: filters.game, song: event.target.value });
}

function enterState(state) {
	const routePath = (root, segments) => `${root}${segments.map(s => customEncodeURIComponent(s)).join('/')}`;
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
	const customDecode = s => s.replace(/_/g, ' ');
	const segments = split(customDecode(stripPrefix(path, ROOT_PATH)), '/').map(s => decodeURIComponent(s));
	return { platform: segments[0], game: segments[1], song: segments[2] };
}
window.onpopstate = (event) => {
	updateRoute(event.state);
};

async function fetchFile(url) {
	const response = await fetch(url);
	if (!response.ok) {
		console.error(response);
		throw new Error('failed to fetch');
	}
	return response.arrayBuffer();
}

async function loadMusicFromURL(url) {
	const songData = await fetchFile(url);
	let samplesData;
	if (typeof songsByUrl[url]?.samples === 'string') {
		samplesData = await fetchFile(song2url({ song_link: songsByUrl[url].samples }));
	}
	if (songsByUrl[url]?.samples instanceof Array) {
		samplesData = await Promise.all(songsByUrl[url]?.samples.map(samples => fetchFile(song2url({ song_link: samples }))));
	}
	player.open(url, songData, samplesData, () => {
		player.play();
		readyToPlay();
	});
}

player.stopped = stopped;
updateStatus({
	mono: localStorage.getItem('mono') == 'true',
	repeat: localStorage.getItem('repeat') == 'true',
	random: localStorage.getItem('random') == 'true',
});

(localStorage.getItem('playlist') ? JSON.parse(localStorage.getItem('playlist')) : []).forEach(addToPlaylist);

if (localStorage.getItem('dismissNewVersion') != 'true') {
	setTimeout(() => {
		$('.overlay').fadeIn(1000);
	}, 1000);
}
$('.overlay .dialog .dismiss').on('click', () => {
	$('.overlay').fadeOut(1000);
});
$('.overlay .dialog .dismissPermanent').on('click', () => {
	$('.overlay').fadeOut(1000);
	localStorage.setItem('dismissNewVersion', true);
});

const campaign = null;
if (campaign)
	$('.campaign')
	  .css('display', '')
	  .attr('href', campaign.urls[randomInt(campaign.urls.length)])
	  .text(campaign.name);

class GSlider extends HTMLElement {
	static observedAttributes = ['value', 'label', 'snap-percent'];
	snapPercent = 0;

	connectedCallback() {
		this.direction = this.getAttribute('direction');
		switch (this.direction) {
		case 'left':
			this.opposite = 'right';
			this.offsetField = 'offsetX';
			this.dimensionField = 'clientWidth';
			this.reverseValue = false;
			break;
		case 'bottom':
			this.opposite = 'top';
			this.offsetField = 'offsetY';
			this.dimensionField = 'clientHeight';
			this.reverseValue = true;
			break;
		default:
			throw new Error(`unknown direction: ${this.direction}`);
		}

		this.attachShadow({ mode: "open" })
			.appendChild(document.getElementById("g-slider").content.cloneNode(true));
		this.setupChange();

		Object.entries(this.initAttrs ?? {}).forEach(([name, value]) => {
			this.attributeChangedCallback(name, null, value);
		});
	}

	setupChange() {
		let slide = false;
		const slideEvent = event => {
			if (this.getAttribute('readonly') != null) return;
			let value = event[this.offsetField] / event.target[this.dimensionField];
			if (this.reverseValue) value = 1 - value;
			if (value < this.snapPercent / 100) value = 0;
			if (value > 1 - this.snapPercent / 100) value = 1;
			this.updateValue(value);
			this.dispatchEvent(new CustomEvent('change', { detail: { value }}));
		}
		this.shadowRoot.addEventListener('mousedown', event => {
			slide = true;
			slideEvent(event);
			this.ownerDocument.addEventListener('mouseup', () => {
				slide = false;
			}, { once: true });
		});
		this.shadowRoot.addEventListener('mousemove', event => {
			if (!slide) return;
			slideEvent(event);
		});
	}

	attributeChangedCallback(name, _, value) {
		if (!this.shadowRoot) {
			this.initAttrs = { ...this.initAttrs, [name]: value };
			return;
		}
		switch (name) {
		case 'value':
			this.updateValue(value);
			break;
		case 'label':
			if (this.direction !== 'left') throw new Error(`no label for direction: ${this.direction}`);
			this.shadowRoot.querySelector('.label').textContent = value;
			break;
		case 'snap-percent':
			this.snapPercent = parseFloat(value);
			break;
		}
	}

	updateValue(value) {
		this.shadowRoot.querySelector('.slider').style[this.opposite] = ((1-value) * 100).toFixed(4) + '%';
		function setOrder(collection) {
			collection.toggle('before', value <= 0.5);
			collection.toggle('after', value > 0.5);
		}
		setOrder(this.shadowRoot.querySelector('.label').classList);
		setOrder(this.shadowRoot.querySelector('.label').part);
	}
}
customElements.define('g-slider', GSlider);

class GDragDrop extends HTMLOListElement {
	connectedCallback() {
		const scroller = this.closest(this.getAttribute('scroller'));
		this.style.position = 'relative';
		let dragged, oldIndex, scrolling = 0;
		this.addEventListener('mousedown', event => {
			if (event.target.localName !== 'li') return;
			dragged = event.target;
			dragged.classList.add('dragged');
			dragged.parentElement.style.userSelect = 'none';
			oldIndex = [...dragged.parentNode.children].indexOf(dragged);
			document.addEventListener('mouseup', () => {
				const newIndex = [...dragged.parentNode.children].indexOf(dragged);
				dragged.classList.remove('dragged');
				dragged.parentElement.style.userSelect = null;
				dragged = undefined;
				scrolling = 0;
				this.dispatchEvent(new CustomEvent('dragged', { detail: { oldIndex, newIndex }}));
			}, { once: true });
		});
		this.addEventListener('mousemove', event => {
			if (event.target.localName !== 'li') return;
			if (!dragged) return;
			const mouse = event.offsetY + event.target.offsetTop;
			if (dragged) {
				const scrollMargin = 0.1;
				scrolling = Math.min(mouse - scroller.scrollTop - scroller.clientHeight * scrollMargin, 0) +
					Math.max(mouse - scroller.scrollTop - scroller.clientHeight * (1-scrollMargin), 0);
			}
			if (dragged.nextSibling && mouse > dragged.nextSibling.offsetTop + dragged.nextSibling.offsetHeight / 2) {
				dragged.parentElement.insertBefore(dragged, dragged.nextSibling.nextSibling);
				return;
			}
			if (dragged.previousSibling && mouse < dragged.previousSibling.offsetTop + dragged.previousSibling.offsetHeight / 2) {
				dragged.parentElement.insertBefore(dragged, dragged.previousSibling);
				return;
			}
		});
		this.scrollInterval = setInterval(() => {
			if (scrolling) scroller.scrollBy({ top: 1 * scrolling, behavior: 'instant' });
		}, 20);
	}
	disconnectedCallback() {
		clearInterval(this.scrollInterval);
	}
}
customElements.define('g-dragdrop', GDragDrop, { extends: 'ol' });
