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
		return /((^|\/)(bd|bp|di|dw|fred|gmc|hip|hipc|jcb|mdat|mii|mod|np2|np3|ntp|p4x|p6x|p60|pha|pp21|pru2|prun|rh|rjp|soc|sog|sfx|xm)\.[^\/]+)|(\.(dum|mod|xm|s3m)(.zip)?)(#\d+)?$/i;
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
		const result = this.loader.load(songData, samplesData);
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
		return [this.player.formats()[this.player.version], this.loader.packer, this.player.title, 'FLOD'];
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
		return ["IMF", ...super.status];
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
		return ["MUS", ...super.status];
	}
}

class XmiPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.XMI, {
			prebuffer: 1000,
			instruments: samplesData,
			song: this.url_param(url) || 1,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(xmi)(#\d+)?$/i;
	}
	get status() {
		return ["XMI", ...super.status];
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
		return /\.(mff|mid|rmi)$/i;
	}
	get status() {
		return ["MID", ...super.status];
	}
}

class KlmPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.KLM, {
			prebuffer: 2000,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(klm)$/i;
	}
	get status() {
		return ["KLM", ...super.status];
	}
}

class HmpPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.HMP, {
			prebuffer: 1000,
			instruments: samplesData,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(hmp)$/i;
	}
	get status() {
		return ["HMP", ...super.status];
	}
}

class HmiPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.HMI, {
			prebuffer: 1000,
			instruments: samplesData,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(hmi)$/i;
	}
	get status() {
		return ["HMI", ...super.status];
	}
}

class AdlPlayer extends Opl3Player {
	constructor() {
		super();
	}
	open(url, songData, samplesData, ready) {
		this.preInit();
		this.player = new OPL3.Player(OPL3.format.ADL, {
			prebuffer: 2000,
		});
		return this.postInit(songData, ready);
	}
	files() {
		return /\.(adl)$/i;
	}
	get status() {
		return ["ADL (Coktel Vision)", ...super.status];
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
		return ["LAA", ...super.status];
	}
}

class AdPlugPlayer extends PlayerBase {
	constructor() {
		super();
		this._stopped = () => {};
		this._loop = false;
		this._stereo = 1;
		this.ready = () => {};

		const onTrackReadyToPlay = () => { setTimeout(() => { this.ready(); }); };
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
		return /\.(adl|agd|cmf|imf|laa|m|mdi|s3m|sdb|wlf)(#\d+)?$/i;
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
		return [info.player, info.title, 'AdPlug'].filter(v => !!v);
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

class OpenMptPlayer extends PlayerBase {
	constructor() {
		super();
		this.player = new ChiptuneJsPlayer(new ChiptuneJsConfig(0, 100, 0));
		this.ended = true;
		this._duration = 0;
		this.songData = undefined;
		this._loop = false;
		this._stereoSeparation = 1;
		this._volume = 1;
	}
	files() {
		return /((^|\/)(med)\.[^\/]+)|(\.(med))(#\d+)?$/i;
	}

	shutdown() {
		this.player.stop();
	}
	open(url, songData, samplesData, ready) {
		this.player.play(songData);
		this.player.togglePause();
		this.ended = false;
		this._duration = this.player.duration();
		this.songData = songData;
		const result = true;
		if (result) setTimeout(ready);
		return result;
	}
	play() {
		if (this.ended) {
			this.player.play(this.songData);
			this.ended = false;
		} else {
			this.player.togglePause();
		}
	}
	pause() {
		this.player.togglePause();
	}
	seek(v) {
		this.player.setCurrentTime(v);
	}

	get position() {
		return this.ended ? 0 : this.player.getCurrentTime() % this._duration;
	}
	get duration() {
		return this._duration;
	}
	get status() {
		if (this.ended) { return []; }
		const meta = this.player.metadata();
		return [meta.type_long, meta.tracker, 'OpenMPT'];
	}

	get volume() {
		return this._volume;
	}
	set volume(v) {
		this._volume = v;
		this.player.setMasterGain(Math.log(Math.max(v, 0.01)) * 2000);
	}
	get stereoSeparation() {
		return this._stereoSeparation;
	}
	set stereoSeparation(v) {
		this._stereoSeparation = v;
		this.player.setStereoSeparation(v * 100);
	}
	get loop() {
		return this._loop;
	}
	set loop(v) {
		this._loop = v;
		this.player.setRepeatCount(v ? -1 : 0);
	}

	set stopped(v) {
		this.player.onEnded(() => {
			this.ended = true;
			v();
		});
	}
}

class MultiPlayer extends PlayerBase {
	constructor() {
		super();
		this.players = [
			new ModPlayer(),
			new ImfPlayer(), new MusPlayer(), new XmiPlayer(), new MidPlayer(), new KlmPlayer(), new HmpPlayer(), new HmiPlayer(), new AdlPlayer(), new LaaPlayer(),
			new AdPlugPlayer(),
			new OpenMptPlayer(),
		];
		this.current = undefined;

		this._volume = 1;
		this._stereoSeparation = 1;
		this._loop = false;
		Object.seal(this);
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
			this.current.volume = this.volume;
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
		return this.current?.position ?? 0;
	}
	get duration() {
		return this.current?.duration ?? 0;
	}
	get status() {
		return this.current.status;
	}

	get volume() {
		return this._volume;
	}
	set volume(v) {
		this._volume = v;
		if (this.current) this.current.volume = v;
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
