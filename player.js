'use strict';

class PlayerBase {
	init() {
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
	status() {
		return [];
	}

	get volume() {
		return 0;
	}
	set volume(v) {
	}
	get stereoSeparation() {
		return 0;
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
		this.opening = false;
	}

	init() {
		window.neoart.initialize();
	}
	open(buffer) {
		this.opening = true;
		const result = this.loader.load(buffer);
		this.opening = false;
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
	status() {
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
			if (!this.opening) v();
		});
	}
}

export { ModPlayer as Player };
