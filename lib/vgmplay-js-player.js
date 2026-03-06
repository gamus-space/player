'use strict';

class VgmPlayPlayer {

	constructor(baseUrl) {
		this.baseUrl = `${baseUrl}/lib`;
		this.module = null;
		this.audioContext = null;
		this.workletNode = null;
		this.gainNode = null;
		this.paused = true;
		this.totalLength = 0;
		this.samplePosition = null;
		this._volume = 1;
		this.loop = false;
		this.mono = false;
		this.onStopped = () => {};
		import(`${this.baseUrl}/vgmplay-js.js`).then(module => {
			this.module = module.default;
		});
	}

	get currentPosition() {
		if (!this.audioContext) return 0;
		return this.samplePosition / this.audioContext.sampleRate;
	}
	get volume() {
		return this._volume;
	}
	set volume(v) {
		this._volume = v;
		if (this.gainNode) this.gainNode.gain.value = v;
	}

	async load(url_or_buffer) {
		this.initModule();
		await this.initAudioContext();
		try {
			this.module.FS.unlink('/file.vgm');
		} catch (err) { }
		const buffer = typeof url_or_buffer === 'string' ? await (await fetch(url_or_buffer)).arrayBuffer() : url_or_buffer;
		const array = new Uint8Array(buffer);
		this.module.FS.writeFile('/file.vgm', array);
		this.OpenVGMFile('/file.vgm');
		this.samplePosition = 0;
		this.paused = true;
		this.totalLength = this.GetTrackLength() / this.audioContext.sampleRate;
	}

	play() {
		if (!this.paused) return;
		this.paused = false;
		this.workletNode.port.postMessage({ type: 'start' });
		if (this.audioContext.state === 'suspended') {
			this.audioContext.resume();
		} else {
			this.PlayVGM();
		}
	}
	pause() {
		this.paused = true;
		this.workletNode.port.postMessage({ type: 'pause' });
		this.audioContext.suspend();
	}
	stop() {
		this.StopVGM();
		this.samplePosition = 0;
		this.workletNode.port.postMessage({ type: 'stop' });
	}
	seek(position) {
		this.samplePosition = position * this.audioContext.sampleRate;
		this.SeekVGM(2 /* PLAYPOS_TICK */, this.samplePosition);
	}

	initModule() {
		if (this.FillBuffer) return;
		this.FillBuffer = this.module.cwrap('FillBuffer2', 'void', ['number', 'number', 'number']);
		this.OpenVGMFile = this.module.cwrap('OpenVGMFile', 'number', ['string']);
		this.CloseVGMFile = this.module.cwrap('CloseVGMFile');
		this.PlayVGM = this.module.cwrap('PlayVGM');
		this.StopVGM = this.module.cwrap('StopVGM');
		this.VGMEnded = this.module.cwrap('VGMEnded');
		this.GetTrackLength = this.module.cwrap('GetTrackLength');
		this.SeekVGM = this.module.cwrap('Seek', 'number', ['number', 'number']);
		this.SetSampleRate = this.module.cwrap('SetSampleRate', 'number', ['number']);
		this.ShowTitle = this.module.cwrap('ShowTitle', 'string');
		this.GetChipInfoString = this.module.cwrap('GetChipInfoString', 'string');
		this.dataPtrs = [];
		this.dataPtrs[0] = this.module._malloc(16384 * 2);
		this.dataPtrs[1] = this.module._malloc(16384 * 2);
	}

	async initAudioContext() {
		if (this.audioContext) return;
		this.audioContext = new AudioContext();
		this.SetSampleRate(this.audioContext.sampleRate);

		await this.audioContext.audioWorklet.addModule(this.baseUrl + '/vgmplay-audio-processor.js');
		this.workletNode = new AudioWorkletNode(this.audioContext, 'vgmplay-processor', {
			outputChannelCount: [2],
		});
		this.workletNode.port.onmessage = (event) => {
			if (event.data.type === 'need-data') {
				this.feedBuffers();
			}
		};

		this.gainNode = this.audioContext.createGain();
		this.volume = this.volume;
		this.workletNode.connect(this.gainNode);
		this.gainNode.connect(this.audioContext.destination);
	}

	feedBuffers() {
		if (this.paused) return;
		const end = this.samplePosition >= this.GetTrackLength();
		if (!this.loop && (this.VGMEnded() || end)) {
			this.audioContext.suspend();
			this.SeekVGM(0, 0);
			this.samplePosition = 0;
			this.paused = true;
			this.onStopped();
			return;
		}
		if ((this.loop && this.VGMEnded()) || end) {
			this.SeekVGM(0, 0);
			this.samplePosition = 0;
			return;
		}

		const buffers = 1;
		for (let i = 0; i < buffers; i++) {
			const { left, right } = this.generateBuffer();
			this.workletNode.port.postMessage({
				type: 'buffer',
				left,
				right,
			}, [left.buffer, right.buffer]);
		}
	}

	generateBuffer() {
		const N = 2048;
		this.FillBuffer(this.dataPtrs[0], this.dataPtrs[1], N);
		const leftHeap = new Float32Array(this.module.HEAPU8.buffer, this.dataPtrs[0], N);
		const rightHeap = new Float32Array(this.module.HEAPU8.buffer, this.dataPtrs[1], N);
		const left = new Float32Array(leftHeap);
		const right = new Float32Array(rightHeap);
		if (this.mono) {
			for (let i = 0; i < N; i++) {
				const avg = (left[i] + right[i])/2;
				left[i] = avg;
				right[i] = avg;
			}
		}
		this.samplePosition += N;
		return { left, right };
	}

	getInfo() {
		const tagList = this.ShowTitle().split('|||');
		const tags = {};
		for (let i = 0; i < tagList.length; i += 2)
			tags[tagList[i]] = tagList[i+1];
		return [
			tags.TITLE,
			tags.ARTIST,
			tags.GAME,
			tags.DATE,
			tags.SYSTEM,
			tags.ENCODED_BY ? `encoded by ${tags.ENCODED_BY}` : '',
			this.GetChipInfoString(),
		].filter(Boolean);
	}

}
