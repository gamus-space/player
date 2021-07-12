'use strict';

// display: 30 filename, 22 player
// vol
// seek

const DATA_ROOT = '../scraper/data';

let status = { song: null, playing: false };
let loadingSong = null;

fetch(`${DATA_ROOT}/db.json`).then(response => response.json()).then(db => {
	const compat = /\/(di|gmc|med|mod|np2|np3|ntp|p4x|pp21|pru2|sfx|xm)\.[^\/]+$/i;
	db.reduce((flat, game) => [...flat, ...game.songs], []).forEach(song => {
		$('#list').append(
			$('<li>', { class: compat.test(song.path) ? null : 'no' }).append(
				$('<a>', { text: song.path, href: `#${song.path}`, 'data-source': song.source }),
			),
		);
	});
});

function updateStatus(update) {
	if (status.song)
		$(`a:contains('${status.song}')`).parent('li').removeClass('playing');
	status = { ...status, ...update };
	$('#song').text(status.song || 'Pick a song!');
	$('#playpause').attr('disabled', !status.song);
	$('#playpause i').attr('class', `fas fa-${status.playing ? 'pause' : 'play'}`)
	if (status.song)
		$(`a:contains('${status.song}')`).parent('li').addClass('playing');

	if (status.song)
		console.log(ScriptNodePlayer.getInstance().getSongInfo());
	if (!status.song)
		$('#time').text('00:00 / 00:00');
}

$('#list').on('click', event => {
	if (event.target.nodeName != 'A') return;
	event.preventDefault();
	const song = event.target.innerText;
	const url = `${DATA_ROOT}/${event.target.attributes['data-source'].value}/${song}`;
	updateStatus({ song: null, playing: false });
	loadingSong = song;
	ScriptNodePlayer.getInstance().loadMusicFromURL(url, {}, () => {}, () => {});
});

function onPlayerReady() {
}
function onTrackReadyToPlay() {
	updateStatus({ song: loadingSong, playing: true });
}
function onTrackEnd() {
	updateStatus({ song: null, playing: false });
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
	function time(t) {
		t = t.toFixed(0);
		const sec = t % 60;
		return `${Math.floor(t/60)}:${sec<10 ? '0' : ''}${sec}`;
	}
	requestAnimationFrame(updateTime);
	if (timestamp - lastUpdate < 200 || !status.song)
		return;
	lastUpdate = timestamp;
	const p = ScriptNodePlayer.getInstance();
	$('#time').text(time(p.getPlaybackPosition() / 1000) + ' / ' + time(p.getMaxPlaybackPosition() / 1000));
}
updateTime();
