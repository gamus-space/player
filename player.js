'use strict';

class PlayerBase {
	files() {
		throw 'not implemented';
	}

	init(url) {
		throw 'not implemented';
	}
	shutdown() {
		throw 'not implemented';
	}
	open(buffer) {
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
	set startingSong(v) {
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

	init() {
		window.neoart.initialize();
	}
	shutdown() {
		this.ignoreStop = true;
		this.player.stop();
		this.ignoreStop = false;
	}
	open(buffer) {
		this.ignoreStop = true;
		const result = this.loader.load(buffer);
		this.ignoreStop = false;
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
	set startingSong(v) {
		this.player.startingSong = v;
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

	init() {
		this.shutdown();
	}
	postInit() {
		this.player.on('position', position => {
			if (position < this.player.length)
				return;
			this.player.seek(0);
			if (!this.loop) {
				this.player.pause();
				this._stopped?.();
			}
		});
	}
	shutdown() {
		this.player?.abort();
	}
	open(buffer) {
		this.player.play(buffer);
		this.player.pause();
		return true;
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
		return 1;
	}
	set stereoSeparation(v) {
		if (v < 1) {
			console.warn("OPL3 player does not support mono playback");
		}
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
	init() {
		super.init();
		this.player = new OPL3.Player(OPL3.format.IMF, { prebuffer: 1000 });
		this.postInit();
	}
	files() {
		return /\.imf$/;
	}
	get status() {
		return [...super.status, "IMF"];
	}
}

class MultiPlayer extends PlayerBase {
	constructor() {
		super();
		this.players = [new ModPlayer(), new ImfPlayer()];
		this.current = undefined;
	}
	files() {
		const re2str = re => /^\/(.*)\/\w?$/.exec(re.toString())[1];
		return new RegExp(this.players.map(({ files }) => re2str(files())).join('|'));
	}

	init(url) {
		const newPlayer = this.players.find(({ files }) => files().test(url));
		if (newPlayer !== this.current) {
			this.current?.shutdown();
			this.current = newPlayer;
		}
		this.current.init();
		this.current.loop = this.loop;
		this.current.stereoSeparation = this.stereoSeparation;
	}
	open(buffer) {
		return this.current.open(buffer);
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
	set startingSong(v) {
		this.current.startingSong = v;
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