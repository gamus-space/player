'use strict';

class PlayerBase {
	files() {
		throw 'not implemented';
	}

	url_param(url) {
		return url.indexOf('#') < 0 ? null : Number(url.replace(/^.*\#/, ''));
	}
	shutdown() {
		throw 'not implemented';
	}
	open(url, songData, samplesData, ready) {
		throw 'not implemented';
	}
	play() {
		throw 'not implemented';
	}
	pause() {
		throw 'not implemented';
	}
	seek(v) {
	}

	get position() {
		return 0;
	}
	get duration() {
		return 0;
	}
	get status() {
		return [];
	}

	get volume() {
		return 0;
	}
	set volume(v) {
	}
	get stereoSeparation() {
		return 1;
	}
	set stereoSeparation(v) {
	}
	get loop() {
		return 0;
	}
	set loop(v) {
	}

	set stopped(v) {
	}
}

class ModPlayer extends PlayerBase {
	constructor() {
		super();
		this.loader = window.neoart.FileLoader();
		this.player = this.loader.player;
		this.ignoreStop = false;
	}
	files() {
		return /((^|\/)(bp|di|dw|gmc|mdat|mod|np2|np3|ntp|p4x|pp21|pru2|rh|rjp|sfx|xm)\.[^\/]+)|(\.(mod|xm|s3m))(#\d+)?$/i;
	}

	shutdown() {
		this.ignoreStop = true;
		this.player.stop();
		this.ignoreStop = false;
	}
	open(url, songData, samplesData, ready) {
		window.neoart.initialize();
		this.player.startingSong = this.url_param(url);
		this.ignoreStop = true;
		const result = this.loader.load(songData);
		this.ignoreStop = false;
		if (result) setTimeout(ready);
		return result;
	}
	play() {
		this.player.play();
	}
	pause() {
		this.player.pause();
	}
	seek(v) {
		this.player.seek(v * 1000);
	}

	get position() {
		return this.player.position / 1000;
	}
	get duration() {
		return this.player.duration / 1000;
	}
	get status() {
		return [this.player.formats()[this.player.version], this.loader.packer, this.player.title];
	}

	get volume() {
		return this.player.volume / 64;
	}
	set volume(v) {
		this.player.volume = v;
	}
	get stereoSeparation() {
		return this.player.stereoSeparation;
	}
	set stereoSeparation(v) {
		this.player.stereoSeparation = v;
	}
	get loop() {
		return this.player.loop;
	}
	set loop(v) {
		this.player.loop = v;
	}

	set stopped(v) {
		document.addEventListener("flodStop", () => {
			if (!this.ignoreStop) v();
		});
	}
}

class Opl3Player extends PlayerBase {
	constructor() {
		super();
		this._stopped = undefined;
	}

	preInit() {
		this.shutdown();
	}
	postInit(songData, ready) {
		this.player.on('position', position => {
			if (position < this.player.length)
				return;
			this.player.seek(0);
			if (!this.loop) {
				this.player.pause();
				setTimeout(() => { this._stopped?.(); }, 100);
			}
		});
		this.player.play(songData);
		this.player.pause();
		setTimeout(ready);
		return true;
	}
	shutdown() {
		this.player?.abort();
	}
	play() {
		this.player.play();
	}
	pause() {
		this.player.pause();
	}
	seek(v) {
		this.player.seek(v * 1000);
	}

	get position() {
		return this.player.position / 1000;
	}
	get duration() {
		return this.player.length / 1000;
	}
	get status() {
		return ["OPL3"];
	}

	get volume() {
		return this.player.volume / 8;
	}
	set volume(v) {
		this.player.volume = v * 8;
	}
	get stereoSeparation() {
		return this.player.stereoSeparation;
	}
	set stereoSeparation(v) {
		this.player.stereoSeparation = v;
	}
	get loop() {
		return this._loop;
	}
	set loop(v) {
		this._loop = v;
	}

	set stopped(v) {
		this._stopped = v;
	}
}

class ImfPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		const ext = this.files().exec(url)[1].toLowerCase();
		this.player = new OPL3.Player(OPL3.format.IMF, {
			prebuffer: 1000,
			rate: this.url_param(url) || { imf: 560, wlf: 700 }[ext],
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(imf|wlf)(#\d+)$/i;
	}
	get status() {
		return [...super.status, "IMF"];
	}
}

class MusPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.MUS, {
			prebuffer: 2000,
			rate: this.url_param(url) || 140,
			instruments: samplesData,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(mus)(#\d+)?$/i;
	}
	get status() {
		return [...super.status, "MUS"];
	}
}

class XmiPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.XMI, {
			prebuffer: 2000,
			instruments: samplesData,
			song: this.url_param(url) || 1,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(xmi)(#\d+)?$/i;
	}
	get status() {
		return [...super.status, "XMI"];
	}
}

class MidPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.MID, {
			prebuffer: 1000,
			instruments: samplesData,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(mff)$/i;
	}
	get status() {
		return [...super.status, "MID"];
	}
}

class LaaPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		if (String.fromCharCode.apply(null, new Uint8Array(songData.slice(0, 3))) !== 'ADL')
			return false;
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.LAA, {
			prebuffer: 2000,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(laa)$/i;
	}
	get status() {
		return [...super.status, "LAA"];
	}
}

class AdPlugPlayer extends PlayerBase {
	constructor() {
		super();
		this._stopped = () => {};
		this._loop = false;
		this._stereo = 1;
		this.ready = () => {};

		const onTrackReadyToPlay = () => { this.ready(); };
		const onTrackEnd = () => {
			this.seek(0);
			if (this._loop) {
				this.play();
			} else {
				this._stopped();
				this.shutdown();
			}
		}
		ScriptNodePlayer.createInstance(new AdPlugBackendAdapter(), '', [], false, () => {}, onTrackReadyToPlay, onTrackEnd);
		this.player = ScriptNodePlayer.getInstance();
	}
	files() {
		return /\.(adl|imf|laa|m|mdi|s3m|wlf)(#\d+)?$/i;
	}

	shutdown() {
		this.player.pause();
	}
	open(url, songData, samplesData, ready) {
		this.ready = ready;
		this.player.loadMusicFromURL(url.replace(/#.+$/, ''), {
			track: this.url_param(url) != null ? this.url_param(url) - 1 : null,
		}, () => {}, () => {});
		return true;
	}
	play() {
		this.player.play();
	}
	pause() {
		this.player.pause();
	}
	seek(v) {
		this.player.seekPlaybackPosition(v * 1000);
	}

	get position() {
		return this.player.getPlaybackPosition() / 1000;
	}
	get duration() {
		return this.player.getMaxPlaybackPosition() / 1000;
	}
	get status() {
		const info = this.player.getSongInfo();
		return [info.player, info.title].filter(v => !!v);
	}

	get volume() {
		return this.player.getVolume() / 2;
	}
	set volume(v) {
		this.player.setVolume(v * 2);
	}
	get stereoSeparation() {
		return this._stereo;
	}
	set stereoSeparation(v) {
		this._stereo = v;
		this.player.setPanning(-v);
	}
	get loop() {
		return this._loop;
	}
	set loop(v) {
		this._loop = v;
	}

	set stopped(v) {
		this._stopped = v;
	}
}

class MultiPlayer extends PlayerBase {
	constructor() {
		super();
		this.players = [new ModPlayer(), new ImfPlayer(), new MusPlayer(), new XmiPlayer(), new MidPlayer(), new LaaPlayer(), new AdPlugPlayer()];
		this.current = undefined;
	}
	files() {
		const re2str = re => /^\/(.*)\/\w?$/.exec(re.toString())[1];
		return new RegExp(this.players.map(({ files }) => re2str(files())).join('|'), 'i');
	}

	open(url, songData, samplesData, ready) {
		const newPlayer = this.players.find(player => player.files().test(url) && player.open(url, songData, samplesData, ready));
		if (newPlayer !== this.current) {
			this.current?.shutdown();
			this.current = newPlayer;
		}
		if (this.current) {
			this.current.loop = this.loop;
			this.current.stereoSeparation = this.stereoSeparation;
		}
		return !!this.current;
	}
	play() {
		this.current.play();
	}
	pause() {
		this.current.pause();
	}
	seek(v) {
		this.current.seek(v);
	}

	get position() {
		return this.current.position;
	}
	get duration() {
		return this.current.duration;
	}
	get status() {
		return this.current.status;
	}

	get volume() {
		return this.current.volume;
	}
	set volume(v) {
		this.current.volume = v;
	}
	get stereoSeparation() {
		return this._stereoSeparation;
	}
	set stereoSeparation(v) {
		this._stereoSeparation = v;
		if (this.current) this.current.stereoSeparation = v;
	}
	get loop() {
		return this._loop;
	}
	set loop(v) {
		this._loop = v;
		if (this.current) this.current.loop = v;
	}

	set stopped(v) {
		this.players.forEach(player => {
			player.stopped = v;
		});
	}
}

export { MultiPlayer as Player };
