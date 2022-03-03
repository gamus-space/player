/*
  FLOD 7.0
  2017/02/15
  Christian Corti
  NEOART Costa Rica

  2022
  krzykos
*/

const Filter = Object.freeze(Object.create(null, {
  "0": { value:"disabled" }, disabled: { value:0, enumerable:true },
  "3": { value:"enabled"  }, enabled : { value:3, enumerable:true },
  "6": { value:"auto"     }, auto    : { value:6, enumerable:true }
}));

const Model = Object.freeze(Object.create(null, {
  "0": { value:"a1200" }, a1200: { value:0, enumerable:true },
  "1": { value:"a500"  }, a500 : { value:1, enumerable:true }
}));

const Quality = Object.freeze(Object.create(null, {
  "0": { value:"low"  }, low : { value:0, enumerable:true },
  "1": { value:"high" }, high: { value:1, enumerable:true }
}));

(function() {
"use strict";

  if (!window.neoart) {
    window.neoart = Object.create(null);
  }

  window.neoart.Trackers = Object.create(null);

  class Player {
    constructor() {
      var i, obj;

      for (i = 0; i < 64; i++) {
        obj = Object.create(null);
        obj.position = 0;
        obj.notes = new Uint16Array(4);
        obj.samples = new Uint8Array(4);
        obj.volumes = new Uint8Array(4);
        cache[i] = obj;
      }
    };

    get analyser() { return analyser; };
    set analyser(value) {
      disconnect();

      if (Array.isArray(value)) {
        analyser = value;
      } else if (!value) {
        analyser = [];
      } else if (typeof value.about !== "function") {
        analyser.push(value);
      }

      connect();
    };

    get bufferSize() { return buffer; };
    set bufferSize(value) {
      value = parseInt(value);

      if (Number.isInteger(value)) {
        value = Math.pow(2, Math.round(Math.log(value) / Math.log(2)));
        buffer = range(value, 256, 16384);
      }
    };

    get channels() { return channels; };

    get cache() {
      var pos = readPos;
      var obj = cache[pos];
      var delta = obj.position - audio.currentTime;

      if (delta > synctime) {
        if (--pos < 0) { pos = 0; }
        return cache[pos];
      } else {
        readPos = (++readPos & 63);
      }

      return obj;
    };

    get cia() { return cia; };
    set cia(value) {
      value = (value) ? true : false;

      if (value != cia) {
        cia = value;
        if (tracker && !skip) { tracker.calculate(); }
      }
    };

    get currentSong() { return current + 1; };
    set currentSong(value) {
      value = parseInt(value);

      if (Number.isInteger(value)) {
        value = range(value, 1, total);

        if (--value != current) {
          current = value;
          disconnect();
          tracker.initialize();
          connect();
        }
      }
    };

    get duration() { return song.duration; };

    get filter() { return filter; };
    set filter(value) {
      if (value in Filter) {
        filter = value;
        if (mixer) { mixer.filter = 0; }
      }
    };

    get loop() { return loop; };
    set loop(value) {
      loop = (value) ? true : false;
    };

    get maxver() { return maxver; };

    get minver() { return minver; };

    get model() { return model; };
    set model(value) {
      if (value in Model) {
        model = value;
      }
    };

    get ntsc() { return ntsc; };
    set ntsc(value) {
      value = (value) ? true : false;

      if (value != ntsc) {
        ntsc = value;
        if (tracker && !skip) { tracker.calculate(); }
      }
    };

    get paused() { return paused; };

    get position() { return (position / rate) >> 0; };

    get quality() { return quality; };
    set quality(value) {
      if (value in Quality) {
        quality = value;
      }
    };

    get record() { return record; };
    set record(value) {
      record = (value) ? true : false;
    };

    get skipDuration() { return skip; };
    set skipDuration(value) {
      skip = (value) ? true : false;
    };

    get startingSong() { return starting + 1; };
    set startingSong(value) {
      if (isNumeric(value)) {
        starting = value - 1;
      } else {
        starting = value;
      }
    };

    get stereoSeparation() { return stereo; };
    set stereoSeparation(value) {
      if (isNumeric(value)) {
        stereo = range(value);
      }
    };

    get title() { return song.title; };

    get totalSongs() { return total; };

    get version() { return version - minver; };
    set version(value) {
      if (tracker) {
        //value = parseInt(value);
        value = minver + parseInt(value);

        if (Number.isInteger(value)) {
          value = range(value, minver, maxver);

          if (value != version) {
            disconnect();
            version = value;
            tracker.initialize();
            connect();
          }
        }
      }
    };

    get volume() { return volume; };
    set volume(value) {
      if (isNumeric(value)) {
        volume = Math.round(range(value) * 64);
      }
    };

    get waveform() {
      var head = 44;
      var size = wave.length << 1;
      var file = new ByteArray(head + size, true);
      var data = new Int16Array(file.buffer, head);

      file.writeUTF8("RIFF");
      file.int = head + size;
      file.writeUTF8("WAVEfmt ");
      file.int = 16;
      file.short = 1;
      file.short = 2;
      file.int = audio.sampleRate;
      file.int = audio.sampleRate << 2;
      file.short = 4;
      file.short = 16;
      file.writeUTF8("data");
      file.int = size;

      data.set(wave);

      file.position = 0;
      wave.length = 0;
      return file.buffer;
    };

    about() {
      console.info("FLOD 7.0\n2017/02/15\nChristian Corti\nNEOART Costa Rica");
    };

    formats() {
      return ID.slice(minver, maxver + 1);
    };
/*
    format(value) {
      value = parseInt(value);

      if (Number.isInteger(value)) {
        value = range(value, minver, maxver);
      } else {
        value = version;
      }

      return ID[value];
    };
*/
    isMuted(index) {
      index = parseInt(index);

      if (Number.isInteger(index)) {
        if (index >= 0 && index < channels) {
          return Boolean(muted[index]);
        }
      } else {
        return mute;
      }

      return false;
    };

    load(stream, extra) {
      if (tracker) {
        if (extra) {
          if (extra instanceof ByteArray === false) {
            extra = new ByteArray(extra);
          }
        }

        if (stream) {
          this.stop();

          if (stream instanceof ByteArray === false) {
            stream = new ByteArray(stream);
          }

          return tracker.load(stream, extra);
        }
      }

      return false;
    };

    mute(index) {
      index = parseInt(index);

      if (Number.isInteger(index)) {
        if (index >= 0 && index < channels) {
          muted[index] ^= 1;

          if (mixer) {
            mixer.output[index].mute ^= 1;
          }
        }
      } else {
        mute ^= 1;
      }
    };

    play() {
      if (version) {
        if (paused) {
          paused = false;
          connect();
          dispatch("flodResume");
        } else {
          create();
          dispatch("flodPlay");
        }

        return true;
      }

      return false;
    };

    pause() {
      if (!paused) {
        disconnect();
        paused = true;
        dispatch("flodPause");
      }
    };

    stop() {
      if (node) {
        disconnect();
        node.onaudioprocess = null;
        node = null;

        paused = false;
        dispatch("flodStop");
        tracker.initialize();
      }
    };

    seek(time) {
      if (version) {
        time = (time * rate) >> 0;
        disconnect();

        if (time < position) {
          tracker.initialize();
        }

        do {
          mixer.process();
        } while (time > position);

        connect();
        return this.position;
      }

      return 0;
    };
  }

  function dispatch(event) {
    document.dispatchEvent(new Event(event, {bubbles:false, cancelable:false}));
  }

  function create() {
    node = audio.createScriptProcessor(buffer);

    if (quality === Quality.low || !mixer.accurate) {
      node.onaudioprocess = mixer.fast.bind(mixer);
    } else {
      node.onaudioprocess = mixer.accurate.bind(mixer);
    }

    connect();
    window.requestAnimationFrame(sync);
  }

  function connect() {
    if (!node || paused) { return; }

    for (var i = 0, l = analyser.length; i < l; i++) {
      analyser[i].connect(node);
    }

    node.connect(audio.destination);
  }

  function disconnect() {
    if (!node || paused) { return; }

    for (var i = 0, l = analyser.length; i < l; i++) {
      analyser[i].disconnect();
    }

    node.disconnect();
    playtime = 999;
  }

  function sync() {
    if ((playtime - audio.currentTime) <= synctime) {
      dispatch("flodSync");
    } else {
      window.requestAnimationFrame(sync);
    }
  }

  class Mixer {
    constructor() {
      this.finished = 0;
      this.output   = [];
      this.process  = null;
      this.remains  = 0;
      this.tickleft = 0;
      this.ticksize = 0;
    };

    get complete() { return this.finished; };
    set complete(value) {
      this.finished = (value ^= loop);

      if (!this.finished) {
        tracker.replay();
      }
    };

    initialize() {
      var chan = this.output[0];

      this.finished = 0;
      this.remains  = 0;
      this.tickleft = 0;

      do {
        chan.initialize();
      } while (chan = chan.next);
    };

    reset() {
      var chan = this.output[0];

      if (chan) {
        do {
          chan.mute = 0;
        } while (chan = chan.next);
      }
    };
  }

  class Tracker {
    constructor(type) {
      if (!(mixer instanceof type)) {
        mixer = new type();
      }

      ID.length = 1;

      this.backup   = 0;
      this.complete = 0;
      this.endian   = false;
      this.list     = [song];
      this.played   = [];
      this.samples  = [];
      this.speed    = 0;
      this.tempo    = 0;
      this.tick     = 0;
      this.voices   = [];
    };

    calculate(single) {
      if (version) {
        var c = current;
        var l = loop;
        var t = (single) ? 0 : total;

        loop = false;
        disconnect();

        do {
          this.initialize();

          do {
            mixer.process();
          } while (!mixer.complete);

          song.duration = (position / rate) >> 0;
        } while (++current < t);

        current = c;
        loop = l;

        this.initialize();
        connect();
      }
    };

    compare(a, b) {
      return b.duration - a.duration;
    };

    createVoices() {
      channels = 4;

      this.voices[0] = new Voice(0);
      this.voices[0].next = this.voices[1] = new Voice(1);
      this.voices[1].next = this.voices[2] = new Voice(2);
      this.voices[2].next = this.voices[3] = new Voice(3);
    };

    initialize() {
      song = this.list[current];
      position = 0;

      this.backup = 0;
      this.complete = 0;
      this.played.length = 0;
      this.tick = 0;

      mixer.initialize();
    };

    load(stream, extra) {
      mixer.reset();

      this.list.length = 1;
      song = this.list[0];
      song.initialize();

      minver = -1;
      maxver = -1;
      version = 0;
      variant = 0;

      if (extra) {
        extra.endian = this.endian;
        extra.position = 0;
      }

      stream.endian = this.endian;
      stream.position = 0;
      stream = this.parse(stream, extra) || stream;

      if (version) {
        mixer.setup(stream);

        if (minver < 0) {
          minver = version;
          maxver = version;
        }

        current = starting || 0;
        total = this.list.length;

        if (!skip) {
          this.calculate();
          if (starting == null) {
            this.list.sort(this.compare);
            song = this.list[0];
          }
        }

        this.initialize();
        dispatch("flodLoadComplete");
        return true;
      }

      dispatch("flodLoadFailed");
      return false;
    };

    replay() {
      this.complete = this.backup;
      this.played.length = 0;

      dispatch("flodLoop");
    };
  }

  class Song {
    constructor(song = null) {
      this.initialize(song);
    };

    initialize(song = null) {
      this.name     = song?.name || "";
      this.start    = song?.start || 0;
      this.length   = song?.length || 0;
      this.duration = song?.duration || 0;
      this.delay    = song?.delay || 0;
      this.speed    = song?.speed || 0;
      this.restart  = song?.restart || 0;
      this.tracks   = song?.tracks || [];
    };

    get title() { return this.name; };
    set title(value) {
      var asc, i, l;
      this.name = "";

      for (i = 0, l = value.length; i < l; i++) {
        asc = value.charCodeAt(i);

        if (asc > 31 && asc < 127) {
          this.name += value.charAt(i);
        }
      }

      this.name = this.name.trim();
    };
  }

  const PERIODS = new Int16Array(1024);
  const PERIOD_PT_MIN = 113;
  const PERIOD_PT_MAX = 856;

  function periods(format, version = 0) {
    var t = PERIODS;
    var i, j, r, x, y;

    switch (format) {
      case "chiptracker":
        base(36);

        for (i = 36; i < 48; i++) {
          r = t[i];
          t[i-36] = r * 8;
          t[i-24] = r * 4;
          t[i-12] = r * 2;
        }
        break;
      case "delta":
        base(37);
        t[48]--;
        t.fill(113, 73, 85);

        for (i = 37; i < 49; i++) {
          r = t[i];
          t[i - 36] = r * 8;
          t[i - 24] = r * 4;
          t[i - 12] = r * 2;
        }

        if (version == 1) {
          t.copyWithin(34, 35, 73);
          t[84] = 0;
        }
        break;
      case "fasttracker":
        base(12, 5, true);
        x = 0;
        y = 488;

        for (i = 0; i < 8; i++) {
          for (j = 0; j < 12; j++) {
            t[x] = t[x + 12] * 2;
            t[y] = t[y + 12] * 2;
            t[x + 48] = t[++x + 35] >> 1;
            t[y + 48] = t[++y + 35] >> 1;
          }

          x += 49;
          y += 49;
        }
        break;
      case "jhippel":
      case "futcomp":
        base(12);
        t.fill(113, 48, 60);

        for (i = 12; i < 24; i++) {
          r = t[i];
          t[i - 12] = r * 2;
          t[i + 48] = r * 4;
          t[i + 60] = r * 8;
        }

        if (version == 14) {
          t.copyWithin(72, 0, 60);
        }
        break;
      case "protracker":
        base(0, 3, true);
        break;
      case "soundfx":
        base(4);
        t[66] = -1;
        t.fill(113, 40, 66);

        for (i = 12; i < 16; i++) {
          r = t[i];
          t[i - 12] = r * 2;
        }
        break;
      case "soundmon":
        base(36);
        t[38] -= 2;
        t[40] += 2;
        t[43] += 2;
        t[44] += 2;
        t[47]--;

        for (i = 36; i < 48; i++) {
          r = t[i]
          t[i-36] = r * 8;
          t[i-24] = r * 4;
          t[i-12] = r * 2;
          t[i+12] = Math.ceil(r / 2);
          t[i+24] = Math.ceil(r / 4);
          t[i+36] = Math.ceil(r / 8);
        }
        break;
      default:
        base();
        break;
    }
  }

  function base(o = 0, octaves = 3, fine = false) {
    const ratio = 0.99888005173;
    const semi  = 0.94387431268;
    const tune  = 0.99280572049;

    var t = PERIODS;
    var n = 856;
    var r = n * ratio;
    var s = (octaves * 12) + 1;
    var x = o;
    var y = o + (s * 8);
    var l = (fine) ? 8 : 1;
    var i, j;

    t.fill(0);

    for (i = 0; i < l; i++) {
      for (j = 0; j < 36; j++) {
        t[x++] = t[++y] = r + 0.5;
        r *= semi;
      }

      t[y - 36] = (n / semi) + 0.5;
      t[x++] = 0;
      t[y++] = 0;

      x += (o * 2);
      y += (o * 2);
      r = (n *= tune);
    }

    l = o + 9;
    y = o + (s * 8) + 1;

    for (x = o; x < l; x++, y++) {
      t[x] = t[x + 12] * 2;
      t[y] = t[y + 12] * 2;
    }

    if (fine) {
      t[o +  s       +  4]--;
      t[o +  s       + 22]++;
      t[o +  s       + 24]++;
      t[o + (s *  2) + 23]++;
      t[o + (s *  4) +  9]++;
      t[o + (s *  7) + 24]++;
      t[o + (s *  9) +  6]--;
      t[o + (s *  9) + 26]--;
      t[o + (s * 12) + 34]--;
    } else {
      t.fill(0, o + s);
    }
  }

  class Amiga extends Mixer {
    constructor() {
      super();
      quality = Quality.low;

      this.analog  = new AmigaFilter();
      this.clock   = 0.0;
      this.loopLen = 4;
      this.master  = 64;
      this.modbuf  = new Uint16Array(buffer);

      this.output[0] = new AmigaChannel(0);
      this.output[0].next = this.output[1] = new AmigaChannel(1);
      this.output[1].next = this.output[2] = new AmigaChannel(2);
      this.output[2].next = this.output[3] = new AmigaChannel(3);
      this.output[3].next = null;
    };

    set filter(value) {
      this.analog.state = filter & (value + 1);
    };

    get volume() { return this.master; };
    set volume(value) {
      if (value < 0) {
        value = 0;
      } else if (value > 64) {
        value = 64;
      }

      this.master = value;
    };

    setup(stream) {
      var i = this.output.length;

      this.buffer = stream;
      this.memory = new Int8Array(stream.buffer);

      //does not work with modules with multiple songs that have different number of channels
      this.output.length = channels;

      for (; i < channels; i++) {
        this.output[i] = this.output[i - 1].next = new AmigaChannel(i);
      }

      if (this.modbuf.length <= buffer) {
        this.modbuf = new Uint16Array(buffer);
      }
    };

    initialize() {
      super.initialize();
      this.master = 64;

      if (ntsc) {
        this.clock = 3579545 / audio.sampleRate;
        this.ticksize = (audio.sampleRate / 60) >> 0;
      } else {
        this.clock = 3546895 / audio.sampleRate;
        this.ticksize = (audio.sampleRate / 50) >> 0;
      }

      for (var i = 0; i < channels;) {
        this.output[i].mute = muted[i];
        this.output[i].next = this.output[++i];
      }

      //this.output[channels - 1].next = null;

      this.analog.initialize();
      this.analog.state = filter;

      readPos = writePos = 0;
    };

    fast(e) {
      var mixed = 0, mixPos = 0, size = buffer;
      var chan, i, lbuf, lvol, master, muted, mixLen, obj, pos, rbuf, rvol, speed, toMix, v;

      playtime = pos = e.playbackTime;

      if (this.finished) {
        if (!this.remains) {
          player.stop();
          return;
        }

        size = this.remains;
      }

      lbuf = e.outputBuffer.getChannelData(0);
      lbuf.fill(0);

      rbuf = e.outputBuffer.getChannelData(1);
      rbuf.fill(0);

      master = (this.master * volume) / 1048576;

      do {
        if (!this.tickleft) {
          obj = cache[writePos];
          obj.position = pos;
          obj.notes.fill(0);
          obj.samples.fill(0);

          this.process();
          this.tickleft = this.ticksize;

          for (i = 0; i < channels; i++) {
            obj.volumes[i] = this.output[i].audvol;
          }

          writePos = (++writePos & 63);
          pos += (this.ticksize / audio.sampleRate);

          if (this.finished) {
            this.remains = 0;
            size = mixed + this.ticksize;

            if (size > buffer) {
              this.remains = size - buffer;
              size = buffer;
            }
          }
        }

        toMix = this.tickleft;
        if ((mixed + toMix) >= size) { toMix = size - mixed; }
        mixLen = mixPos + toMix;

        chan = this.output[0];

        do {
          if (chan.audena) {
            muted = chan.mute | mute;
            speed = chan.audper / this.clock;

            if (muted) {
              chan.audatl = 0.0;
              chan.audatr = 0.0;
            } else {
              v = chan.audvol * master;
              i = chan.panning * stereo;
              lvol = v * (1 - i);
              rvol = v * (1 + i);
            }

            for (i = mixPos; i < mixLen; i++) {
              if (chan.delay) {
                chan.delay--;
                continue;
              }

              if (speed) {
                if (--chan.timer < 1.0) {
                  if (!muted) {
                    v = this.memory[chan.audloc] * 0.0078125;
                    if (isNaN(v)) {
                      v = 0;
                    }
                    chan.audatl = v * lvol;
                    chan.audatr = v * rvol;
                  }

                  chan.audloc++;
                  chan.timer += speed;

                  if (chan.timer < 0) {
                    chan.timer = speed;
                    chan.audloc++;
                  }

                  if (chan.audloc >= chan.audlen) {
                    if (chan.audlen > 0) {
                      chan.loopcount++;
                    }
                    chan.audloc = chan.pointer;
                    chan.audlen = chan.pointer + chan.length;
                  }
                }
              }

              lbuf[i] += chan.audatl;
              rbuf[i] += chan.audatr;
            }
          } else {
            for (i = mixPos; i < mixLen; i++) {
              lbuf[i] += chan.audatl;
              rbuf[i] += chan.audatr;
            }
          }
        } while (chan = chan.next);

        mixPos = mixLen;
        mixed += toMix;
        this.tickleft -= toMix;
      } while (mixed < size);

      if (this.analog.active) {
        this.analog.process(lbuf, rbuf);
      }

      if (record) {
        for (i = 0; i < size; i++) {
          lvol = lbuf[i];
          rvol = rbuf[i];

          wave.push(lvol * 32768);
          wave.push(rvol * 32768);
        }
      }
    };

    accurate(e) {
      var mixed = 0, mixPos = 0, size = buffer, v2 = 0;
      var chan, i, lbuf, lvol, master, muted, mixLen, obj, pos, rbuf, rvol, speed, toMix, v1, v3;

      playtime = pos = e.playbackTime;

      if (this.finished) {
        if (!this.remains) {
          player.stop();
          return;
        }

        size = this.remains;
      }

      lbuf = e.outputBuffer.getChannelData(0);
      lbuf.fill(0);

      rbuf = e.outputBuffer.getChannelData(1);
      rbuf.fill(0);

      master = (this.master * volume) / 1048576;

      do {
        if (!this.tickleft) {
          obj = cache[writePos];
          obj.position = pos;
          obj.notes.fill(0);
          obj.samples.fill(0);

          this.process();
          this.tickleft = this.ticksize;

          for (i = 0; i < channels; i++) {
            obj.volumes[i] = this.output[i].audvol;
          }

          writePos = (++writePos & 63);
          pos += (this.ticksize / audio.sampleRate);

          if (this.finished) {
            this.remains = 0;
            size = mixed + this.ticksize;

            if (size > buffer) {
              this.remains = size - buffer;
              size = buffer;
            }
          }
        }

        toMix = this.tickleft;
        if ((mixed + toMix) >= size) { toMix = size - mixed; }
        mixLen = mixPos + toMix;

        chan = this.output[0];

        do {
          if (chan.audena) {
            muted = chan.mute | mute;

            for (i = mixPos; i < mixLen; i++) {
              if (chan.delay) {
                chan.delay--;
                continue;
              }

              if (chan.modper || (chan.modall && chan.modstp)) {
                chan.audper = this.modbuf[i];
              }

              speed = chan.audper / this.clock;

              if (speed) {
                if (muted) {
                  chan.audatl = 0.0;
                  chan.audatr = 0.0;
                } else {
                  if (chan.modvol || (chan.modall && !chan.modstp)) {
                    chan.audvol = this.modbuf[i] & 127;
                  }

                  v1 = chan.audvol * master;
                  v3 = chan.panning * stereo;
                  lvol = v1 * (1 - v3);
                  rvol = v1 * (1 + v3);
                }

                if (--chan.timer < 1.0) {
                  if (chan.modena) {
                    if (chan.next && !chan.modstp) {
                      v2 = (this.memory[chan.audloc++] << 8) | (this.memory[chan.audloc++] & 0xff);
                    }

                    chan.audatl = 0.0;
                    chan.audatr = 0.0;
                  } else if (!muted) {
                    v1 = this.memory[chan.audloc++] * 0.0078125;
                    chan.audatl = v1 * lvol;
                    chan.audatr = v1 * rvol;
                  }

                  chan.timer += speed;
                  chan.modstp = !chan.modstp;

                  if (chan.timer < 0) {
                    chan.timer = speed;
                    chan.audloc++;
                  }

                  if (chan.audloc >= chan.audlen) {
                    if (chan.audlen > 0) {
                      chan.loopcount++;
                    }
                    chan.audloc = chan.pointer;
                    chan.audlen = chan.pointer + chan.length;
                  }
                }
              }

              this.modbuf[i] = v2;

              lbuf[i] += chan.audatl;
              rbuf[i] += chan.audatr;
            }
          } else {
            for (i = mixPos; i < mixLen; i++) {
              lbuf[i] += chan.audatl;
              rbuf[i] += chan.audatr;
            }
          }
        } while (chan = chan.next);

        mixPos = mixLen;
        mixed += toMix;
        this.tickleft -= toMix;
      } while (mixed < size);

      if (this.analog.active) {
        this.analog.process(lbuf, rbuf);
      }

      if (record) {
        for (i = 0; i < size; i++) {
          lvol = lbuf[i];
          rvol = rbuf[i];

          wave.push(lvol * 32768);
          wave.push(rvol * 32768);
        }
      }
    };
  }

  class AmigaChannel {
    constructor(index) {
      this.index = index;
      this.mute  = 0;
      this.next  = null;

      this.separation = (++index & 2) ? 1.0 : -1.0;
      this.initialize();

      return Object.seal(this);
    };

    get enabled() { return this.audena; };
    set enabled(value) {
      if (value != this.audena) {
        this.audena = value;
        this.audloc = this.pointer;
        this.audlen = this.pointer + this.length;
        this.intvol = this.audvol;

        this.timer = 1.0;
        if (value) { this.delay += 2; }
      }
    };

    get panning() { return this.separation; };
    set panning(value) {
      if (value < 0.0) {
        value = -1.0;
      } else {
        value = 1.0;
      }

      this.separation = value;
    };

    set modulation(value) {
      this.modena = value;
      if (!this.next) { return; }

      if (value == 3) {
        this.next.modall = 1;
      } else if (value) {
        this.next.modvol = value & 1;
        this.next.modper = value & 2;
      } else {
        this.next.modall = 0;
        this.next.modvol = 0;
        this.next.modper = 0;
      }
    };

    set period(value) {
      if (value < 0) {
        value = 0;
      } else if (value > 65535) {
        value -= 65536;
      }

      this.audper = value;
    };

    get volume() { return this.audvol; };
    set volume(value) {
      if (value < 0) {
        value = 0;
      } else if (value > 64) {
        value = 64;
      }

      this.audvol = value;
    };

    initialize() {
      this.delay   = 0;
      this.pointer = 0;
      this.length  = 0;
      this.timer   = 0.0;
      this.loopcount = 0;

      this.modena = 0;
      this.modvol = 0;
      this.modper = 0;
      this.modall = 0;
      this.modstp = 0;
      this.intvol = 0;

      this.audena = 0;
      this.audloc = 0;
      this.audlen = 0;
      this.audper = 0;
      this.audvol = 0;
      this.audatl = 0.0;
      this.audatr = 0.0;
    };

    reset() {
      this.audatl = 0.0;
      this.audatr = 0.0;
    };
  }

  class AmigaFilter {
    constructor() {
      this.state = 0;
      this.initialize();
    };

    initialize() {
      this.l0 = this.r0 = 0.0;
      this.l1 = this.r1 = 0.0;
      this.l2 = this.r2 = 0.0;
      this.l3 = this.r3 = 0.0;
      this.l4 = this.r4 = 0.0;
    };

    get active() { return model | this.state; };

    process(lbuf, rbuf) {
      const fl = 0.5213345843532200;
      const p0 = 0.4860348337215757;
      const p1 = 0.9314955486749749;

      var d = 1.0 - p0;
      var i, l, r;

      for (i = 0; i < buffer; i++) {
        l = lbuf[i];
        r = rbuf[i];

        if (model) {
          this.l0 = p0 * l + d * this.l0;
          this.r0 = p0 * r + d * this.r0;

          d = 1.0 - p1;
          l = this.l1 = p1 * this.l0 + d * this.l1;
          r = this.r1 = p1 * this.r0 + d * this.r1;
        }

        if (this.state) {
          d = 1.0 - fl;
          this.l2 = fl * l + d * this.l2;
          this.r2 = fl * r + d * this.r2;
          this.l3 = fl * this.l2 + d * this.l3;
          this.r3 = fl * this.r2 + d * this.r3;

          l = this.l4 = fl * this.l3 + d * this.l4;
          r = this.r4 = fl * this.r3 + d * this.r4;
        }

        if (l < -1.0) {
          l = -1.0;
        } else if (l > 1.0) {
          l = 1.0;
        }

        if (r < -1.0) {
          r = -1.0;
        } else if (r > 1.0) {
          r = 1.0;
        }

        lbuf[i] = l;
        rbuf[i] = r;
      }
    };
  }

  class Row {
    constructor() {
      this.step   = 0;
      this.note   = 0;
      this.sample = 0;
      this.effect = 0;
      this.param  = 0;
    };
  }

  class Sample {
    constructor() {
      this.name     = "";
      this.pointer  = 0;
      this.length   = 4;
      this.loopPtr  = 0;
      this.repeat   = 4;
      this.volume   = 0;
      this.finetune = 0;
      this.relative = 0;
    };
  }

  class Step {
    constructor() {
      this.pattern   = 0;
      this.transpose = 0;
      this.soundtran = 0;
    };
  }

  class Voice {
    constructor(index) {
      this.index = index;
      this.next  = null;
      this.initialize();
    };

    initialize() {
      this.channel      = null;
      this.sample       = null;
      this.enabled      = 0;
      this.loopCtr      = 0;
      this.loopPos      = -1;
      this.step         = 0;
      this.period       = 0;
      this.last         = 0;
      this.effect       = 0;
      this.param        = 0;
      this.volume       = 0;
      this.slide        = 0;
      this.pointer      = 0;
      this.length       = 0;
      this.loopPtr      = 0;
      this.repeat       = 0;
      this.finetune     = 0;
      this.offset       = 0;
      this.portaDir     = 0;
      this.portaPeriod  = 0;
      this.portaSpeed   = 0;
      this.glissando    = 0;
      this.tremoloParam = 0;
      this.tremoloPos   = 0;
      this.tremoloWave  = 0;
      this.vibratoParam = 0;
      this.vibratoPos   = 0;
      this.vibratoWave  = 0;
      this.funkPos      = 0;
      this.funkSpeed    = 0;
      this.funkWave     = 0;
    };
  }

  class Soundblaster extends Mixer {
    setup() {
      var i;

      if (this.output.length != channels) {
        this.output.length = channels;
        this.output[0] = new SBChannel();
        this.output[0].mute = muted[0];

        for (i = 1; i < channels; i++) {
          this.output[i] = this.output[i - 1].next = new SBChannel();
          this.output[i].mute = muted[i];
        }
      } else {
        for (i = 0; i < channels; i++) {
          this.output[i].mute = muted[i];
        }
      }
    };

    initialize() {
      super.initialize();
      this.ticksize = ((audio.sampleRate * 2.5) / tracker.tempo) >> 0;
    };

    fast(e) {
      var mixed = 0, mixPos = 0, size = buffer;
      var b, chan, i, lbuf, lvol, mixLen, rbuf, rvol, s, toMix, v;

      if (this.finished) {
        if (!this.remains) {
          player.stop();
          return;
        }

        size = this.remains;
      }

      lbuf = e.outputBuffer.getChannelData(0);
      lbuf.fill(0);

      rbuf = e.outputBuffer.getChannelData(1);
      rbuf.fill(0);

      do {
        if (!this.tickleft) {
          this.process();
          tracker.fast();
          this.tickleft = this.ticksize;

          if (this.finished) {
            this.remains = 0;
            size = mixed + this.ticksize;

            if (size > buffer) {
              this.remains = size - buffer;
              size = buffer;
            }
          }
        }

        toMix = this.tickleft;
        if ((mixed + toMix) >= size) { toMix = size - mixed; }
        mixLen = mixPos + toMix;

        chan = this.output[0];

        do {
          if (!chan.enabled) { continue; }
          s = chan.sample;
          b = s.data;

          for (i = mixPos; i < mixLen; i++) {
            if (chan.index != chan.pointer) {
              if (chan.index >= chan.length) {
                if (s.loopMode) {
                  chan.pointer = s.loopStart + (chan.index - chan.length);
                  chan.length = s.length;

                  if (s.loopMode == 2) {
                    if (chan.dir) {
                      chan.dir = 0;
                    } else {
                      chan.dir = s.length + s.loopStart - 1;
                    }
                  }
                } else {
                  chan.enabled = 0;
                  break;
                }
              } else {
                chan.pointer = chan.index;
              }

              if (chan.mute) {
                chan.ldata = 0.0;
                chan.rdata = 0.0;
              } else {
                if (chan.dir) {
                  v = b[chan.dir - chan.pointer];
                } else {
                  v = b[chan.pointer];
                }

                chan.ldata = v * chan.lvol;
                chan.rdata = v * chan.rvol;
              }
            }

            chan.index = chan.pointer + chan.delta;
            chan.fraction += chan.speed;

            if (chan.fraction >= 1.0) {
              chan.index++;
              chan.fraction--;
            }

            lbuf[i] += chan.ldata;
            rbuf[i] += chan.rdata;
          }
        } while (chan = chan.next);

        mixPos = mixLen;
        mixed += toMix;
        this.tickleft -= toMix;
      } while (mixed < size);

      if (record) {
        for (i = 0; i < size; i++) {
          lvol = lbuf[i];
          rvol = rbuf[i];

          wave.push(lvol * 32768);
          wave.push(rvol * 32768);
        }
      }
    };

    accurate(e) {
      var mixed = 0, mixPos = 0, size = buffer;
      var b1, b2, chan, delta, i, lbuf, lvol, mixLen, rbuf, rvol, s1, s2, toMix, v1, v2;

      if (this.finished) {
        if (!this.remains) {
          player.stop();
          return;
        }

        size = this.remains;
      }

      lbuf = e.outputBuffer.getChannelData(0);
      lbuf.fill(0);

      rbuf = e.outputBuffer.getChannelData(1);
      rbuf.fill(0);

      do {
        if (!this.tickleft) {
          this.process();
          tracker.accurate();
          this.tickleft = this.ticksize;

          if (this.finished) {
            this.remains = 0;
            size = mixed + this.ticksize;

            if (size > buffer) {
              this.remains = size - buffer;
              size = buffer;
            }
          }
        }

        toMix = this.tickleft;
        if ((mixed + toMix) >= size) { toMix = size - mixed; }
        mixLen = mixPos + toMix;

        chan = this.output[0];

        do {
          if (!chan.enabled) { continue; }
          s1 = chan.sample;
          b1 = s1.data;
          s2 = chan.oldSample;
          b2 = (s2) ? s2.data : null;

          for (i = mixPos; i < mixLen; i++) {
            if (chan.mute) {
              v1 = 0.0;
            } else {
              v1 = b1[chan.pointer] || 0;
              v1 += (b1[chan.pointer + chan.dir] - v1) * chan.fraction || 0;
            }

            chan.fraction += chan.speed;

            if (chan.fraction >= 1.0) {
              delta = chan.fraction >> 0;
              chan.fraction -= delta;

              if (chan.dir > 0) {
                chan.pointer += delta;

                if (chan.pointer > chan.length) {
                  chan.fraction += (chan.pointer - chan.length);
                  chan.pointer = chan.length;
                }
              } else {
                chan.pointer -= delta;

                if (chan.pointer < chan.length) {
                  chan.fraction += (chan.length - chan.pointer);
                  chan.pointer = chan.length;
                }
              }
            }

            if (chan.mixCounter) {
              if (s2) {
                if (chan.mute) {
                  v2 = 0.0;
                } else {
                  v2 = b2[chan.oldPointer] || 0;
                  v2 += (b2[chan.oldPointer + chan.oldDir] - v2) * chan.oldFraction || 0;
                }

                chan.oldFraction += chan.oldSpeed;

                if (chan.oldFraction >= 1.0) {
                  delta = chan.oldFraction >> 0;
                  chan.oldFraction -= delta;

                  if (chan.oldDir > 0) {
                    chan.oldPointer += delta;

                    if (chan.oldPointer > chan.oldLength) {
                      chan.oldFraction += (chan.oldPointer - chan.oldLength);
                      chan.oldPointer = chan.oldLength;
                    }
                  } else {
                    chan.oldPointer -= delta;

                    if (chan.oldPointer < chan.oldLength) {
                      chan.oldFraction += (chan.oldLength - chan.oldPointer);
                      chan.oldPointer = chan.oldLength;
                    }
                  }
                }

                if (chan.oldPointer == chan.oldLength) {
                  if (s2.loopMode) {
                    if (s2.loopMode == 1) {
                      chan.oldPointer = s2.loopStart;
                      chan.oldLength = s2.length;
                    } else {
                      if (chan.oldDir > 0) {
                        chan.oldPointer = s2.length - 1;
                        chan.oldLength = s2.loopStart;
                        chan.oldDir = -1;
                      } else {
                        chan.oldPointer = s2.loopStart;
                        chan.oldLength = s2.length;
                        chan.oldDir = 1;
                        chan.oldFraction -= 1;
                      }
                    }
                  } else {
                    s2 = null;
                    chan.oldPointer = -1;
                  }
                }

                lbuf[i] += ((v1 * chan.lmixRampU) + (v2 * chan.lmixRampD));
                rbuf[i] += ((v1 * chan.rmixRampU) + (v2 * chan.rmixRampD));

                chan.lmixRampD -= chan.lmixDeltaD;
                chan.rmixRampD -= chan.rmixDeltaD;
              } else {
                lbuf[i] += (v1 * chan.lmixRampU);
                rbuf[i] += (v1 * chan.rmixRampU);
              }

              chan.lmixRampU += chan.lmixDeltaU;
              chan.rmixRampU += chan.rmixDeltaU;
              chan.mixCounter--;
            } else {
              lbuf[i] += (v1 * chan.lvol);
              rbuf[i] += (v1 * chan.rvol);

              if (chan.volCounter) {
                chan.lvol += chan.lvolDelta;
                chan.rvol += chan.rvolDelta;
                chan.volCounter--;
              } else if (chan.panCounter) {
                chan.lpan += chan.lpanDelta;
                chan.rpan += chan.rpanDelta;
                chan.panCounter--;

                chan.lvol = chan.volume * chan.lpan;
                chan.rvol = chan.volume * chan.rpan;
              }
            }

            if (chan.pointer == chan.length) {
              if (s1.loopMode) {
                if (s1.loopMode == 1) {
                  chan.pointer = s1.loopStart;
                  chan.length = s1.length;
                } else {
                  if (chan.dir > 0) {
                    chan.pointer = s1.length - 1;
                    chan.length = s1.loopStart;
                    chan.dir = -1;
                  } else {
                    chan.pointer = s1.loopStart;
                    chan.length = s1.length;
                    chan.dir = 1;
                    chan.fraction -= 1;
                  }
                }
              } else {
                chan.enabled = 0;
                break;
              }
            }
          }
        } while (chan = chan.next);

        mixPos = mixLen;
        mixed += toMix;
        this.tickleft -= toMix;
      } while (mixed < size);

      if (record) {
        for (i = 0; i < size; i++) {
          lvol = lbuf[i];
          rvol = rbuf[i];

          wave.push(lvol * 32768);
          wave.push(rvol * 32768);
        }
      }
    };
  }

  class SBChannel {
    constructor() {
      this.mute = 0;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.enabled     = 0;
      this.sample      = null;
      this.length      = 0;
      this.index       = 0;
      this.pointer     = 0;
      this.delta       = 0;
      this.fraction    = 0.0;
      this.speed       = 0.0;
      this.dir         = 0;
      this.oldSample   = null;
      this.oldLength   = 0;
      this.oldPointer  = 0;
      this.oldFraction = 0.0;
      this.oldSpeed    = 0;
      this.oldDir      = 0;
      this.volume      = 0.0;
      this.lvol        = 0.0;
      this.rvol        = 0.0;
      this.panning     = 128;
      this.lpan        = 0.5;
      this.rpan        = 0.5;
      this.ldata       = 0.0;
      this.rdata       = 0.0;
      this.mixCounter  = 0;
      this.lmixRampU   = 0.0;
      this.lmixDeltaU  = 0.0;
      this.rmixRampU   = 0.0;
      this.rmixDeltaU  = 0.0;
      this.lmixRampD   = 0.0;
      this.lmixDeltaD  = 0.0;
      this.rmixRampD   = 0.0;
      this.rmixDeltaD  = 0.0;
      this.volCounter  = 0;
      this.lvolDelta   = 0.0;
      this.rvolDelta   = 0.0;
      this.panCounter  = 0;
      this.lpanDelta   = 0.0;
      this.rpanDelta   = 0.0;
    };
  }

  class SBSample {
    constructor() {
      this.name      = "";
      this.bits      = 8;
      this.relative  = 0;
      this.finetune  = 0;
      this.panning   = 0;
      this.volume    = 0;
      this.length    = 0;
      this.data      = null;
      this.loopMode  = 0;
      this.loopStart = 0
      this.loopLen   = 0;
    };

    store(stream) {
      var delta = 0, len = this.length;
      var i, pos, total, value;

      if (!this.loopLen) {
        this.loopMode = 0;
      } else if (this.loopMode) {
        len = this.loopStart + this.loopLen;
      }

      pos = stream.position;
      this.data = new Float32Array(len + 1);

      if (this.bits == 8) {
        total = pos + len;
        if (total > stream.length) { len = stream.length - pos; }

        for (i = 0; i < len; i++) {
          value = stream.byte + delta;

          if (value < -128) {
            value += 256;
          } else if (value > 127) {
            value -= 256;
          }

          delta = value;
          this.data[i] = value * 0.0078125;
        }
      } else {
        total = pos + (len << 1);
        if (total > stream.length) { len = (stream.length - pos) >> 1; }

        for (i = 0; i < len; i++) {
          value = stream.short + delta;

          if (value < -32768) {
            value += 65536;
          } else if (value > 32767) {
            value -= 65536;
          }

          delta = value;
          this.data[i] = value * 0.00003051758;
        }
      }

      total = pos + this.length;

      if (this.loopMode) {
        this.length = this.loopStart + this.loopLen;

        if (this.loopMode == 1) {
          this.data[len] = this.data[this.loopStart];
        } else {
          this.data[len] = this.data[len - 1];
        }
      } else {
        this.data[this.length] = 0.0;
      }

      if (len != this.length) {
        this.data.fill(this.data[len - 1], len, this.length);
      }

      if (total > stream.length) { total = stream.length; }
      stream.position = total;
    };
  }

  const ULTIMATE_SOUNDTRACKER = 1;
  const TJC_SOUNDTRACKER2     = 2;
  const DOC_SOUNDTRACKER4     = 3;
  const MASTER_SOUNDTRACKER   = 4;
  const DOC_SOUNDTRACKER9     = 5;
  const DOC_SOUNDTRACKER20    = 6;
  const SOUNDTRACKER23        = 7;
  const NOISETRACKER10        = 8;
  const NOISETRACKER11        = 9;
  const PROTRACKER10          = 10;
  const NOISETRACKER20        = 11;
  const STARTREKKER           = 12;
  const PROTRACKER10C         = 13;
  const PROTRACKER20          = 14;
  const PROTRACKER30          = 15;
  const FASTTRACKER           = 16;

  const FUNKREP = new Uint8Array([0,5,6,7,8,10,11,13,16,19,22,26,32,43,64,128]);

  class Soundtracker extends Tracker {
    constructor() {
      super(Amiga);

      this.breakPos     = 0;
      this.jumpFlag     = 0;
      this.minPeriod    = 0;
      this.maxPeriod    = 0;
      this.octaves      = 0;
      this.patterns     = [];
      this.patternBreak = 0;
      this.patternDelay = 0;
      this.patternLen   = 0;
      this.patternPos   = 0;
      this.restart      = 0;
      this.track        = [];
      this.trackPos     = 0;
      this.trackPositions = [];
      this.vibratoDepth = 0;

      ID.push(
        "Ultimate Soundtracker",
        "TJC Soundtracker 2",
        "DOC Soundtracker 4",
        "Master Soundtracker",
        "DOC Soundtracker 9",
        "DOC Soundtracker 2.0",
        "Soundtracker 2.3",
        "NoiseTracker 1.0",
        "NoiseTracker 1.1",
        "ProTracker 1.0",
        "NoiseTracker 2.0",
        "StarTrekker",
        "ProTracker 1.0c",
        "ProTracker 2.0",
        "ProTracker 3.0",
        "FastTracker"
      );

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      song = this.list[0];
      if (!this.list || this.list.length != song.length) {
        this.list.length = song.length;
        for (let i = 0; i < this.list.length; i++) {
          this.list[i] = new Song(song);
          this.list[i].start = i;
          this.list[i].restart = i;
        }
      }
      total = this.list.length;
      song = this.list[current];

      if (version == ULTIMATE_SOUNDTRACKER) {
        if (ntsc) {
          mixer.ticksize = ((240 - this.tempo) * (0.0001704127110 * audio.sampleRate)) >> 0;
        } else {
          mixer.ticksize = ((240 - this.tempo) * (0.0001719813992 * audio.sampleRate)) >> 0;
        }
      }

      if (version > PROTRACKER10 && version != PROTRACKER10C) {
        this.vibratoDepth = 7;
      } else {
        this.vibratoDepth = 6;
      }

      if (version == NOISETRACKER11 || version == NOISETRACKER20 || version == STARTREKKER) {
        this.restart = song.restart;
      } else {
        this.restart = 0;
      }

      if (version == FASTTRACKER && this.octaves != 61) {
        this.octaves = 61;
        periods("fasttracker");
      } else if (this.octaves != 37) {
        this.octaves = 37;
        periods("protracker");
      }

      this.minPeriod = PERIODS[this.octaves - 2];
      this.maxPeriod = PERIODS[0];

      if (version < SOUNDTRACKER23) {
        mixer.process = this.soundtracker.bind(this);
      } else if (version == PROTRACKER10 || version > STARTREKKER) {
        mixer.process = this.protracker.bind(this);
      } else {
        mixer.process = this.noisetracker.bind(this);
      }

      if (version >= NOISETRACKER10) { this.tempo = 125; }

      this.breakPos     = 0;
      this.jumpFlag     = 0;
      this.patternBreak = 0;
      this.patternDelay = 0;
      this.patternPos   = 0;
      this.speed        = 6;
      this.trackPos     = song.start;
      this.trackPositions = [];

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var i, id, keep, row, sample, value;

      channels = 4;
      cia = false;

      if (stream.length < 2106) {
        return this.parse15(stream);
      }

      stream.position = 1080;
      id = stream.readUTF8(4);
      version = NOISETRACKER10;

      if (id != "M.K." && id != "M!K!") {
        if (id == "FLT4") {
          version = STARTREKKER;
        } else if (id.indexOf("CH") > 0) {
          value = parseInt(id);

          if (value < 2 || value > 32) {
            version = 0;
            return;
          }

          cia = true;
          channels = value;
          version = FASTTRACKER;
        } else {
          version = 0;
          if (id == "FEST") { return; }
          this.parse15(stream);
          return;
        }
      }

      this.patternLen = channels << 6;
      stream.position = 950;
      song.length = stream.ubyte;
      keep = stream.ubyte;

      if (keep == 0x7f) {
        if (version < FASTTRACKER) { version = PROTRACKER10C; }
      } else if (keep != 0x78) {
        if (version < STARTREKKER) { version = NOISETRACKER11; }
        song.restart = keep;
      }

      stream.position = 0;
      song.title = stream.readUTF8(20);
      stream.position = 42;
      this.samples.length = 32;

      for (i = 1; i < 32; i++) {
        value = stream.ushort;

        if (!value) {
          this.samples[i] = null;
          stream.position += 28;
          continue;
        }

        stream.position -= 24;
        sample = new Sample();
        sample.name = stream.readUTF8(22);
        sample.length = value << 1;

        stream.position += 2;
        sample.finetune = stream.ubyte;
        sample.volume   = stream.ubyte;
        sample.loopPtr  = stream.ushort << 1;
        sample.repeat   = stream.ushort << 1;

        if ((sample.loopPtr + sample.repeat) > sample.length) {
          if (version < FASTTRACKER) { version = SOUNDTRACKER23; }
        }

        stream.position += 22;
        this.samples[i] = sample;
      }

      stream.position = 952;

      for (i = 0; i < 128; i++) {
        value = stream.ubyte * this.patternLen;
        if (value > higher) { higher = value; }
        this.track[i] = value;
      }

      stream.position = 1084;
      higher += this.patternLen;
      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        row = new Row();
        row.step = value = stream.uint;

        row.note   = (value >> 16) & 0x0fff;
        if (row.note && (row.note < PERIOD_PT_MIN || row.note > PERIOD_PT_MAX)) {
          version = FASTTRACKER;
        }
        row.effect = (value >>  8) & 0x0f;
        row.sample = (value >> 24) & 0xf0 | (value >> 12) & 0x0f;
        row.param  = value & 0xff;

        if (row.sample > 31) { row.sample = 0; }

        if (version < NOISETRACKER20) {
          if (row.effect == 5 || row.effect == 6) { version = NOISETRACKER20; }
        }

        if (version != STARTREKKER && version < PROTRACKER10C) {
          if ((row.effect > 6 && row.effect < 10) || (row.effect == 14 && ((row.param & 0x0f) > 1))) {
            if (keep == 0x78) {
              version = PROTRACKER10;
            } else {
              version = PROTRACKER10C;
            }
          }
        }

        if (row.effect == 15 && row.param > 31) {
          cia = true;
          if (version < PROTRACKER10C) { version = PROTRACKER10C; }
        }

        this.patterns[i] = row;
      }

      keep = stream.position;
      stream.fill(0, 0, mixer.loopLen);

      for (i = 1; i < 32; i++) {
        sample = this.samples[i];
        if (!sample) { continue; }

        if (version == NOISETRACKER11 && sample.name.indexOf("2.0") > -1) {
          version = NOISETRACKER20;
        }

        sample.pointer = keep;
        keep += sample.length;
        value = (sample.length < 4) ? sample.length : 4;
        stream.fill(0, sample.pointer, value);

        if (sample.loopPtr || sample.repeat > 2) {
          if (version == SOUNDTRACKER23) {
            sample.pointer += (sample.loopPtr >> 1);
            sample.loopPtr = sample.pointer;
            sample.length = sample.repeat;
          } else {
            sample.length = sample.loopPtr + sample.repeat;
            sample.loopPtr += sample.pointer;
          }
        }
      }

      if (version == FASTTRACKER) {
        minver = FASTTRACKER;
      } else {
        minver = NOISETRACKER10;
      }

      maxver = FASTTRACKER;
      this.loaded(stream);
    };

    parse15(stream) {
      var higher = 0;
      var score = 0;
      var i, len, row, sample, value;

      if (stream.length < 1628) { return; }

      stream.position = 60;
      if (stream.readUTF8(4) == "SONG") { return; }

      stream.position = 0;
      song.title = stream.readUTF8(20);
      score += this.isLegal(song.title);

      version = ULTIMATE_SOUNDTRACKER;
      stream.position = 42;
      this.samples.length = 16;

      for (i = 1; i < 16; i++) {
        value = stream.ushort;

        if (!value) {
          this.samples[i] = null;
          stream.position += 28;
          continue;
        }

        stream.position -= 24;
        sample = new Sample();
        sample.name = stream.readUTF8(22);
        score += this.isLegal(sample.name);
        sample.length = value << 1;

        stream.position += 3;
        sample.volume = stream.ubyte;

        if (sample.volume > 64) {
          version = 0;
          return;
        }

        sample.loopPtr = stream.ushort;
        sample.repeat = stream.ushort << 1;

        if (sample.length > 9999) { version = MASTER_SOUNDTRACKER; }

        stream.position += 22;
        this.samples[i] = sample;
      }

      stream.position = 470;
      song.length = stream.ubyte;
      this.tempo = stream.ubyte;

      for (i = 0; i < 128; i++) {
        //value = stream.ubyte << 8;
        value = stream.byte << 8;
        if (value > 16128) { score--; }
        if (value > higher) { higher = value; }
        this.track[i] = value;
      }

      stream.position = 600;
      higher += 256;

      if ((stream.position + (higher << 2)) > stream.length) {
        version = 0;
        return;
      }

      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        row = new Row();
        row.note   = stream.ushort;
        value      = stream.ubyte;
        row.param  = stream.ubyte;
        row.effect = value & 0x0f;
        row.sample = value >> 4;

        //if (row.effect > 2 && row.effect < 11) { score--; }

        if (row.note) {
          if (row.note < 113 || row.note > 856) {
            score--;
          }
        }

        if (row.sample > 15) {
          score--;
          row.sample = 0;
        }

        if (version < TJC_SOUNDTRACKER2) {
          if (row.param && !row.effect) { version = TJC_SOUNDTRACKER2; }
        }

        if (version < DOC_SOUNDTRACKER4 && row.effect > 2) { version = TJC_SOUNDTRACKER2; }

        if (version < MASTER_SOUNDTRACKER && row.effect == 15) { version = DOC_SOUNDTRACKER4; }

        if (row.effect == 11) { version = DOC_SOUNDTRACKER20; }

        this.patterns[i] = row;
      }

      if (score < 1) {
        version = 0;
        return;
      }

      len = stream.position;
      stream.fill(0, 0, 4);

      for (i = 1; i < 16; i++) {
        sample = this.samples[i];
        if (!sample) { continue; }

        if (len >= stream.length) {
          sample.pointer = 0;
          continue;
        }

        sample.pointer = len;
        len += sample.length;
        value = (sample.length < 4) ? sample.length : 4;
        stream.fill(0, sample.pointer, value);

        if (sample.loopPtr) {
          if ((sample.loopPtr + sample.repeat) > sample.length) {
            score--;
            value = sample.length - sample.repeat;
            if (value < 0) { value = sample.length; }

            if (value) {
              sample.loopPtr = value;
            } else {
              sample.repeat -= sample.loopPtr;
            }
          }

          sample.length = sample.repeat;
          sample.loopPtr += sample.pointer;
          sample.pointer = sample.loopPtr;
        } else if (sample.repeat != 2) {
          sample.loopPtr = sample.pointer;
          sample.repeat = sample.length;
        }
      }

      //if (score < 1) {
      //  version = 0;
      //} else {
        minver = ULTIMATE_SOUNDTRACKER;
        maxver = DOC_SOUNDTRACKER20;
        this.loaded(stream);
      //}
    };

    loaded(stream) {
      var len = this.samples.length;
      var i, sample;

      sample = new Sample();
      this.samples[0] = null;

      for (i = 0; i < len; i++) {
        if (!this.samples[i]) { this.samples[i] = sample; }
      }

      if (!this.voices || this.voices.length != channels) {
        this.voices.length = channels;
        this.voices[0] = new Voice(0);

        for (i = 1; i < channels; i++) {
          this.voices[i] = this.voices[i - 1].next = new Voice(i);
        }
      }
    };

    soundtracker() {
      var voice = this.voices[0];
      var chan, row, sample, slide, value;

      if (this.trackPositions[this.trackPos] == null) {
        this.trackPositions[this.trackPos] = position;
      }

      if (!this.tick) {
        value = this.track[this.trackPos] + this.patternPos;

        do {
          chan = voice.channel;
          voice.enabled = 0;

          row = this.patterns[value + voice.index];
          voice.period = row.note;
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.sample) {
            sample = this.samples[row.sample];
            if (!sample) { sample = this.samples[0]; }

            voice.sample = sample;
            voice.volume = sample.volume;

            if (voice.effect == 12 && ((version ^ 4) < 2)) {                  // set volume, MST and DOC9 only
              chan.volume = voice.param;
            } else {
              chan.volume = sample.volume;
            }

            cache[writePos].samples[voice.index] = 1;
          } else {
            sample = voice.sample;
          }

          if (row.note) {
            voice.enabled = 1;
            voice.last = voice.period;

            chan.enabled = 0;
            chan.pointer = sample.pointer;
            chan.length = sample.length;
            chan.period = voice.period;

            cache[writePos].notes[voice.index] = row.note;
          }

          if (voice.enabled) { chan.enabled = 1; }
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;

          if ((version ^ 2) < 2) {
            if (voice.effect == 14) {                                         // volume auto slide, TJC2 and DOC4 only
              voice.slide = voice.param;
            } else {
              if (voice.effect == 12) {
                chan.volume = voice.param;
              } else if (voice.effect == 15 && version == DOC_SOUNDTRACKER4) {
                voice.param &= 0x0f;
                if (voice.param) { this.speed = voice.param; }
              } else if (!voice.param) {
                voice.slide = 0;
              }
            }
          }

          if (version < DOC_SOUNDTRACKER20 && version != DOC_SOUNDTRACKER4) { continue; }

          switch (row.effect) {
            case 11:  // position jump
              this.trackPos = (voice.param - 1) & 127;
              this.jumpFlag ^= 1;
              break;
            case 12:  // set volume
              chan.volume = voice.param;
              break;
            case 13:  // pattern break
              this.jumpFlag = 1;
              break;
            case 14:  // set filter
              mixer.filter = voice.param;
              break;
            case 15:  // set speed
              if (version != DOC_SOUNDTRACKER20)
                voice.param &= 0x0f;
              if (voice.param) { this.speed = voice.param; }
              break;
          }
        } while (voice = voice.next);
      } else {
        do {
          if (!voice.param) { continue; }
          chan = voice.channel;

          if (version == ULTIMATE_SOUNDTRACKER) {
            if (voice.effect == 1) {
              this.arpeggio(voice);
            } else if (voice.effect == 2) {
              value = voice.param >> 4;

              if (value) {
                voice.period += value;
              } else {
                voice.period -= (voice.param & 0x0f);
              }

              chan.period = voice.period;
            }
            continue;
          }

          switch (voice.effect) {
            case 0:   // arpeggio
              this.arpeggio(voice);
              break;
            case 1:   // portamento up
              value = voice.param;
              if ((version ^ 4) < 2) { value &= 0x0f; }                       // MST and DOC9 only
              voice.last -= value;

              if (voice.last < 113) { voice.last = 113; }
              chan.period = voice.last;
              break;
            case 2:   // portamento down
              value = voice.param;
              if ((version ^ 4) < 2) { value &= 0x0f; }                       // MST and DOC9 only
              voice.last += value;

              if (voice.last > 856) { voice.last = 856; }
              chan.period = voice.last;
              break;
          }

          if (version == DOC_SOUNDTRACKER20) { continue; }

          if (voice.slide && ((version ^ 2) < 2)) {                           // volume auto slide, TJC2 and DOC4 only
            slide = voice.slide;
          }

          if (voice.effect == 13 && version != DOC_SOUNDTRACKER9) {           // volume slide, all but DOC9
            slide = voice.param;
          }

          if (slide) {
            value = slide >> 4;

            if (value) {
              voice.volume += value;
            } else {
              voice.volume -= (slide & 0x0f);
            }

            if (voice.volume < 0) {
              voice.volume = 0;
            } else if (voice.volume > 64) {
              voice.volume = 64;
            }

            chan.volume = voice.volume;
            slide = 0;
          }

          if ((version ^ 4) >= 2) { continue; }

          switch (voice.effect) {                                             // MST and DOC9 only effects
            case 12:  // set volume
              chan.volume = voice.param;
              break;
            case 14:  // set filter
              mixer.filter = voice.param;
              break;
            case 15:  // set speed
              voice.param &= 0x0f;

              if (voice.param && voice.param > this.tick) {
                this.speed = voice.param;
              }
              break;
          }
        } while (voice = voice.next);
      }

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos += 4;

        if (this.patternPos == 256 || this.jumpFlag) {
          this.trackPos = (++this.trackPos & 127);

          if (this.played[this.trackPos] || (this.trackPositions[this.trackPos] || position) < position) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.jumpFlag = 0;
          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };

    noisetracker() {
      var voice = this.voices[0];
      var chan, i, row, sample, slide, value;

      if (this.trackPositions[this.trackPos] == null) {
        this.trackPositions[this.trackPos] = position;
      }

      if (!this.tick) {
        value = this.track[this.trackPos] + this.patternPos;

        do {
          chan = voice.channel;
          voice.enabled = 0;

          row = this.patterns[value + voice.index];
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.sample) {
            sample = voice.sample = this.samples[row.sample];
            chan.volume = voice.volume = sample.volume;

            cache[writePos].samples[voice.index] = 1;
          } else {
            sample = voice.sample;
          }

          if (row.note) {
            if (voice.effect == 3 || voice.effect == 5) {
              if (row.note < voice.period) {
                voice.portaDir = 1;
                voice.portaPeriod = row.note;
              } else if (row.note > voice.period) {
                voice.portaDir = 0;
                voice.portaPeriod = row.note;
              } else {
                voice.portaPeriod = 0;
              }
            } else {
              voice.enabled = 1;
              voice.period = row.note;
              voice.vibratoPos = 0;

              chan.enabled = 0;
              chan.pointer = sample.pointer;
              chan.length = sample.length;
              chan.period = voice.period;

              cache[writePos].notes[voice.index] = voice.period;
            }
          }

          if (voice.enabled) { chan.enabled = 1; }
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;

          switch (voice.effect) {
            case 11:  // position jump
              this.trackPos = (voice.param - 1) & 127;
              this.jumpFlag ^= 1;
              break;
            case 12:  // set volume
              chan.volume = voice.param;

              if (version >= NOISETRACKER20) {
                voice.volume = voice.param;
              }
              break;
            case 13:  // pattern break
              this.jumpFlag ^= 1;
              break;
            case 14:  // set filter
              mixer.filter = voice.param;
              break;
            case 15:  // set speed
              if (voice.param < 1) {
                this.speed = 1;
              } else if (voice.param > 31) {
                this.speed = 31;
              } else {
                this.speed = voice.param;
              }
              break;
          }
        } while (voice = voice.next);
      } else {
        do {
          chan = voice.channel;

          if (!voice.effect && !voice.param) {
            chan.period = voice.period;
            continue;
          }

          switch (voice.effect) {
            case 0:   // arpeggio
              value = this.tick % 3;

              if (!value) {
                chan.period = voice.period;
                continue;
              }

              if (value == 1) {
                value = voice.param >> 4;
              } else {
                value = voice.param & 0x0f;
              }

              i = 0;
              while (PERIODS[i] > voice.period) { i++; }
              value += i;

              if (value < 37) {
                chan.period = PERIODS[value];
              }
              break;
            case 1:   // portamento up
              voice.period -= voice.param;
              if (voice.period < 113) { voice.period = 113; }
              chan.period = voice.period;
              break;
            case 2:   // portamento down
              voice.period += voice.param;
              if (voice.period > 856) { voice.period = 856; }
              chan.period = voice.period;
              break;
            case 3:   // tone portamento
            case 5:   // tone portamento + volume slide
              if (voice.effect == 5) {
                slide = 1;
              } else if (voice.param) {
                voice.portaSpeed = voice.param;
                voice.param = 0;
              }

              if (!voice.portaPeriod) { break; }

              if (voice.portaDir) {
                voice.period -= voice.portaSpeed;

                if (voice.period <= voice.portaPeriod) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              } else {
                voice.period += voice.portaSpeed;

                if (voice.period >= voice.portaPeriod) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              }

              chan.period = voice.period;
              break;
            case 4:   // vibrato
            case 6:   // vibrato + volume slide
              if (voice.effect == 6) {
                slide = 1;
              } else if (voice.param) {
                voice.vibratoParam = voice.param;
              }

              value = (voice.vibratoPos >> 2) & 31;
              value = ((voice.vibratoParam & 0x0f) * VIBRATO[value]) >> this.vibratoDepth;

              if (voice.vibratoPos > 127) {
                chan.period = voice.period - value;
              } else {
                chan.period = voice.period + value;
              }

              value = (voice.vibratoParam >> 2) & 60;
              voice.vibratoPos = (voice.vibratoPos + value) & 255;
              break;
            case 10:  // volume slide
              slide = 1;
              break;
          }

          if (slide) {
            value = voice.param >> 4;

            if (value) {
              voice.volume += value;
            } else {
              voice.volume -= (voice.param & 0x0f);
            }

            if (voice.volume < 0) {
              voice.volume = 0;
            } else if (voice.volume > 64) {
              voice.volume = 64;
            }

            chan.volume = voice.volume;
            slide = 0;
          }
        } while (voice = voice.next);
      }

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos += 4;

        if (this.patternPos == 256 || this.jumpFlag) {
          this.trackPos = (++this.trackPos & 127);

          if (this.played[this.trackPos] || (this.trackPositions[this.trackPos] || position) < position) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.jumpFlag = 0;
          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = song.restart;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };

    protracker() {
      var voice = this.voices[0];
      var chan, i, pos, row, sample, value;

      if (this.trackPositions[this.trackPos] == null) {
        this.trackPositions[this.trackPos] = position;
      }

      if (!this.tick) {
        if (this.patternDelay) {
          this.standardFx();
        } else {
          pos = this.track[this.trackPos] + this.patternPos;

          do {
            chan = voice.channel;
            voice.enabled = 0;

            if (!voice.step) { chan.period = voice.period; }

            row = this.patterns[pos + voice.index];
            voice.step = row.step;
            voice.effect = row.effect;
            voice.param = row.param;

            if (row.sample) {
              sample = voice.sample = this.samples[row.sample];

              voice.pointer  = sample.pointer;
              voice.length   = sample.length;
              voice.loopPtr  = sample.loopPtr;
              voice.funkWave = sample.loopPtr;
              voice.repeat   = sample.repeat;
              voice.finetune = sample.finetune;
              voice.volume   = sample.volume;

              chan.volume = sample.volume;

              cache[writePos].samples[voice.index] = 1;
            } else {
              sample = voice.sample;
            }

            if (!row.note) {
              this.moreFx(voice);
              continue;
            } else {
              if ((voice.step & 0x0ff0) == 0x0e50) {
                voice.finetune = voice.param & 0x0f;
              } else if (voice.effect == 3 || voice.effect == 5) {
                i = voice.finetune * this.octaves;
                value = i + this.octaves;

                for (; i < value; i++) {
                  if (row.note >= PERIODS[i]) { break; }
                }

                value = voice.finetune & 8;
                if (value && i != 0) { i--; }

                voice.portaPeriod = PERIODS[i];
                voice.portaDir = (row.note > voice.period) ? 0 : 1;

                if (voice.period == voice.portaPeriod) {
                  voice.portaPeriod = 0;
                }

                this.moreFx(voice);
                continue;
              } else if (voice.effect == 9) {
                this.moreFx(voice);
              }
            }

            for (i = 0; i < this.octaves; i++) {
              if (row.note >= PERIODS[i]) { break; }
            }

            voice.period = PERIODS[(voice.finetune * this.octaves) + i];

            if ((voice.step & 0x0ff0) == 0x0ed0) {
              if (voice.funkSpeed) { this.updateFunk(voice); }

              this.extendedFx(voice);
              continue;
            }

            if (voice.vibratoWave < 4) { voice.vibratoPos = 0; }
            if (voice.tremoloWave < 4) { voice.tremoloPos = 0; }

            chan.enabled = 0;
            chan.pointer = voice.pointer;
            chan.length = voice.length;
            chan.period = voice.period;

            cache[writePos].notes[voice.index] = voice.period;

            voice.enabled = 1;
            this.moreFx(voice);
          } while (voice = voice.next);

          voice = this.voices[0];

          do {
            chan = voice.channel;
            if (voice.enabled) { chan.enabled = 1; }

            chan.pointer = voice.loopPtr;
            chan.length = voice.repeat;
          } while (voice = voice.next);
        }
      } else {
        this.standardFx();
      }

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos += channels;

        if (this.patternDelay) {
          if (--this.patternDelay) {
            this.patternPos -= channels;
          }
        }

        if (this.patternBreak) {
          this.patternBreak = 0;
          this.patternPos = this.breakPos;
          this.breakPos = 0;
        }

        if (this.patternPos == this.patternLen || this.jumpFlag) {
          this.trackPos = (++this.trackPos & 127);
          value = this.breakPos + 1;

          if (this.played[this.trackPos] == value || (this.trackPositions[this.trackPos] || position) < position) {
            if (this.breakPos <= this.patternPos) {
              mixer.complete = 1;
            }
          } else {
            this.played[this.trackPos] = value;
          }

          this.patternPos = this.breakPos;
          this.breakPos = 0;
          this.jumpFlag = 0;

          if (this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };

    standardFx() {
      var voice = this.voices[0];
      var chan, i, pos, slide, value, wave;

      do {
        chan = voice.channel;
        if (voice.funkSpeed) { this.updateFunk(voice); }

        if (!(voice.step & 0x0fff)) {
          chan.period = voice.period;
          continue;
        }

        switch (voice.effect) {
          case 0:   // arpeggio
            value = this.tick % 3;

            if (!value) {
              chan.period = voice.period;
              continue;
            }

            if (value == 1) {
              value = voice.param >> 4;
            } else {
              value = voice.param & 0x0f;
            }

            i = voice.finetune * this.octaves;
            pos = i + this.octaves;

            for (; i < pos; i++) {
              if (voice.period >= PERIODS[i]) {
                chan.period = PERIODS[i + value];
                break;
              }
            }
            break;
          case 1:   // portamento up
            voice.period -= voice.param;
            if (voice.period < this.minPeriod) { voice.period = this.minPeriod; }
            chan.period = voice.period;
            break;
          case 2:   // portamento down
            voice.period += voice.param;
            if (voice.period > this.maxPeriod) { voice.period = this.maxPeriod; }
            chan.period = voice.period;
            break;
          case 3:   // tone portamento
          case 5:   // tone portamento + volume slide
            if (voice.effect == 5) {
              slide = 1;
            } else if (voice.param) {
              voice.portaSpeed = voice.param;
              voice.param = 0;
            }

            if (!voice.portaPeriod) { break; }

            if (voice.portaDir) {
              voice.period -= voice.portaSpeed;

              if (voice.period <= voice.portaPeriod) {
                voice.period = voice.portaPeriod;
                voice.portaPeriod = 0;
              }
            } else {
              voice.period += voice.portaSpeed;

              if (voice.period >= voice.portaPeriod) {
                voice.period = voice.portaPeriod;
                voice.portaPeriod = 0;
              }
            }

            if (voice.glissando) {
              i = voice.finetune * this.octaves;
              pos = i + this.octaves;

              for (; i <= pos; i++) {
                if (voice.period >= PERIODS[i]) { break; }
              }

              if (i == pos) { i -= 2; }
              chan.period = PERIODS[i];
            } else {
              chan.period = voice.period;
            }
            break;
          case 4:   // vibrato
          case 6:   // vibrato + volume slide
            if (voice.effect == 6) {
              slide = 1;
            } else if (voice.param) {
              value = voice.param & 0x0f;
              if (value) { voice.vibratoParam = (voice.vibratoParam & 0xf0) | value; }

              value = voice.param & 0xf0;
              if (value) { voice.vibratoParam = (voice.vibratoParam & 0x0f) | value; }
            }

            pos = (voice.vibratoPos >> 2) & 31;
            wave = voice.vibratoWave & 3;

            if (wave) {
              value = 255;
              pos <<= 3;

              if (wave == 1) {
                if (voice.vibratoPos > 127) {
                  value -= pos;
                } else {
                  value = pos;
                }
              }
            } else {
              value = VIBRATO[pos];
            }

            value = ((voice.vibratoParam & 0x0f) * value) >> this.vibratoDepth;

            if (voice.vibratoPos > 127) {
              chan.period = voice.period - value;
            } else {
              chan.period = voice.period + value;
            }

            value = (voice.vibratoParam >> 2) & 60;
            voice.vibratoPos = (voice.vibratoPos + value) & 255;
            break;
          case 7:   // tremolo
            chan.period = voice.period;

            if (voice.param) {
              value = voice.param & 0x0f;
              if (value) { voice.tremoloParam = (voice.tremoloParam & 0xf0) | value; }

              value = voice.param & 0xf0;
              if (value) { voice.tremoloParam = (voice.tremoloParam & 0x0f) | value; }
            }

            pos = (voice.tremoloPos >> 2) & 31;
            wave = voice.tremoloWave & 3;

            if (wave) {
              value = 255;
              pos <<= 3;

              if (wave == 1) {
                if (voice.tremoloPos > 127) {
                  value -= pos;
                } else {
                  value = pos;
                }
              }
            } else {
              value = VIBRATO[pos];
            }

            value = ((voice.tremoloParam & 0x0f) * value) >> 6;

            if (voice.tremoloPos > 127) {
              chan.volume = voice.volume - value;
            } else {
              chan.volume = voice.volume + value;
            }

            value = (voice.tremoloParam >> 2) & 60;
            voice.tremoloPos = (voice.tremoloPos + value) & 255;
            break;
          case 8:   // set panning
            if (version == FASTTRACKER) {
              console.info("Standard effect 8xx not supported.");
            }
            break;
          case 10:  // volume slide
            chan.period = voice.period;
            slide = 1;
            break;
          case 14:  // extended effects
            this.extendedFx(voice);
            break;
          default:
            chan.period = voice.period;
            break;
        }

        if (slide) {
          value = voice.param >> 4;

          if (value) {
            voice.volume += value;
          } else {
            voice.volume -= (voice.param & 0x0f);
          }

          if (voice.volume < 0) {
            voice.volume = 0;
          } else if (voice.volume > 64) {
            voice.volume = 64;
          }

          chan.volume = voice.volume;
          slide = 0;
        }
      } while (voice = voice.next);
    };

    moreFx(voice) {
      var value;

      if (voice.funkSpeed) { this.updateFunk(voice); }

      switch (voice.effect) {
        case 9:   // sample offset
          if (voice.param) { voice.offset = voice.param; }
          value = voice.offset << 8;

          if (version > PROTRACKER20) {
            if (value >= voice.sample.length) {
              voice.length = 4;
            } else {
              voice.pointer = voice.sample.pointer + value;
              voice.length = voice.sample.length - value;
            }
          } else {
            if (value >= voice.length) {
              voice.length = 4;
            } else {
              voice.pointer += value;
              voice.length -= value;
            }
          }
          break;
        case 11:  // position jump
          this.trackPos = (voice.param - 1) & 127;
          this.breakPos = 0;
          this.jumpFlag = 1;
          break;
        case 12:  // set volume
          voice.volume = voice.param;
          if (voice.volume > 64) { voice.volume = 64; }
          voice.channel.volume = voice.volume;
          break;
        case 13:  // pattern break
          this.breakPos = ((voice.param >> 4) * 10) + (voice.param & 0x0f);

          if (this.breakPos > 63) {
            this.breakPos = 0;
          } else {
            this.breakPos <<= 2;
          }

          this.jumpFlag = 1;
          break;
        case 14:  // extended effects
          this.extendedFx(voice);
          break;
        case 15:  // set speed
          if (!voice.param) {
            this.trackPos = 0;
            this.patternPos = 0;
            mixer.complete = 1;
            return;
          }

          if (cia) {
            if (voice.param < 32) {
              this.speed = voice.param;
            } else {
              mixer.ticksize = ((audio.sampleRate * 2.5) / voice.param) >> 0;
            }
          } else {
            this.speed = voice.param;
          }
          break;
        default:
          voice.channel.period = voice.period;
          break;
      }
    };

    extendedFx(voice) {
      var chan = voice.channel;
      var effect = voice.param >> 4;
      var param = voice.param & 0x0f;
      var i, len;

      switch (effect) {
        case 0:   // set filter
          mixer.filter = param;
          break;
        case 1:   // fine portamento up
          if (this.tick) { return; }
          voice.period -= param;
          if (voice.period < this.minPeriod) { voice.period = this.minPeriod; }
          chan.period = voice.period;
          break;
        case 2:   // fine portamento down
          if (this.tick) { return; }
          voice.period += param;
          if (voice.period > this.maxPeriod) { voice.period = this.maxPeriod; }
          chan.period = voice.period;
          break;
        case 3:   // glissando control
          voice.glissando = param;
          break;
        case 4:   // vibrato control
          voice.vibratoWave = param;
          break;
        case 5:   // set finetune
          voice.finetune = param;
          break;
        case 6:   // pattern loop
          if (this.tick) { return; }

          if (param) {
            if (voice.loopPos < 0) { break; }

            if (voice.loopCtr) {
              voice.loopCtr--;
            } else {
              voice.loopCtr = param;
            }

            if (voice.loopCtr) {
              this.breakPos = voice.loopPos;
              this.patternBreak = 1;
            } else {
              voice.loopPos = -1;
            }
          } else {
            voice.loopPos = this.patternPos;
          }
          break;
        case 7:   // tremolo control
          voice.tremoloWave = param;
          break;
        case 8:   // karplus strong, PT20 only
          if (version == PROTRACKER20) {
            len = voice.length - 2;

            for (i = voice.loopPtr; i < len;) {
              mixer.memory[i] = (mixer.memory[i] + mixer.memory[++i]) >> 1;
            }

            mixer.memory[++i] = (mixer.memory[i] + mixer.memory[0]) >> 1;
          } else {
            console.info("Extended effect E8x not supported.");
          }
          break;
        case 9:   // retrig note
          if (this.tick || !param || !voice.period) { return; }
          if (this.tick % param) { return; }

          chan.enabled = 0;
          chan.delay = 30;
          chan.pointer = voice.pointer;
          chan.length = voice.length;

          chan.enabled = 1;
          chan.pointer = voice.loopPtr;
          chan.length = voice.repeat;
          chan.period = voice.period;

          cache[writePos].notes[voice.index] = voice.period;
          break;
        case 10:  // fine volume up
          if (this.tick) { return; }
          voice.volume += param;
          if (voice.volume > 64) { voice.volume = 64; }
          chan.volume = voice.volume;
          break;
        case 11:  // fine volume down
          if (this.tick) { return; }
          voice.volume -= param;
          if (voice.volume < 0) { voice.volume = 0; }
          chan.volume = voice.volume;
          break;
        case 12:  // note cut
          if (this.tick == param) {
            chan.volume = voice.volume = 0;
          }
          break;
        case 13:  // note delay
          if (this.tick != param || !voice.period) { return; }

          chan.enabled = 0;
          chan.delay = 30;
          chan.pointer = voice.pointer;
          chan.length = voice.length;

          chan.enabled = 1;
          chan.pointer = voice.loopPtr;
          chan.length = voice.repeat;
          chan.period = voice.period;

          cache[writePos].notes[voice.index] = voice.period;
          break;
        case 14:  // pattern delay
          if (this.tick || this.patternDelay) { return; }
          this.patternDelay = param + 1;
          break;
        case 15:  // funk repeat or invert loop
          if (this.tick) { return; }
          voice.funkSpeed = param;
          if (param) { this.updateFunk(voice); }
          break;
      }
    };

    arpeggio(voice) {
      var i = 0;
      var param;

      switch (this.tick) {
        case 1:
        case 4:
          param = voice.param >> 4;
          break;
        case 2:
        case 5:
          param = voice.param & 0x0f;
          break;
        case 3:
          voice.channel.period = voice.last;
          return;
        default:
          return;
      }

      while (PERIODS[i] > voice.last) { i++; }
      param += i;

      if (param < 37) {
        voice.channel.period = PERIODS[param];
      }
    };

    updateFunk(voice) {
      var value = FUNKREP[voice.funkSpeed];
      var p1, p2;

      if ((voice.funkPos += value) < 128) { return; }
      voice.funkPos = 0;

      if (version == PROTRACKER10) {
        p1 = voice.pointer + (voice.sample.length - voice.repeat);
        p2 = voice.funkWave + voice.repeat;

        if (p2 > p1) {
          p2 = voice.loopPtr;
          voice.channel.length = voice.repeat;
        }

        voice.channel.pointer = voice.funkWave = p2;
      } else {
        p1 = voice.loopPtr + voice.repeat;
        p2 = voice.funkWave + 1;
        if (p2 >= p1) { p2 = voice.loopPtr; }

        mixer.memory[p2] = ~mixer.memory[p2];
        voice.funkWave = p2;
      }
    };

    isLegal(text) {
      var code, i, len = text.length;
      if (!len) { return 0; }

      for (i = 0; i < len; i++) {
        code = text.charCodeAt(i);
        if (code && (code < 32 || code > 127)) { return 0; }
      }

      return 1;
    };

    replay() {
      position = this.trackPositions[this.trackPos] || 0;
      super.replay();
    };
  }

  window.neoart.Trackers.Soundtracker = function() {
    tracker = new Soundtracker();
    return player;
  }

  const CHIPTRACKER    = 1;
  const SOUNDTRACKER26 = 2;

  class ChipTracker extends Tracker {
    constructor() {
      super(Amiga);

      this.alternate  = new Uint8Array(2);
      this.jumpFlag   = 0;
      this.patterns   = [];
      this.patternPos = 0;
      this.track      = [];
      this.trackPos   = 0;
      this.trackPositions = [];

      ID.push("ChipTracker", "Soundtracker 2.6");

      this.createVoices();
      this.samples.length = 32;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      song = this.list[0];
      if (!this.list || this.list.length != song.length >> 2) {
        this.list.length = song.length >> 2;
        for (let i = 0; i < this.list.length; i++) {
          this.list[i] = new Song(song);
          this.list[i].start = i << 2;
          this.list[i].restart = i << 2;
        }
      }
      total = this.list.length;
      song = this.list[current];

      this.jumpFlag   = 0;
      this.patternPos = 0;
      this.trackPos   = song.start;
      this.trackPositions = [];

      if (version == CHIPTRACKER) {
        this.speed = 6;
      } else {
        this.speed = 0;
        this.alternate.fill(6);
      }

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var i, len, row, sample, step, value;

      if (stream.length < 1728) { return; }
      stream.position = 952;

      if (stream.readUTF8(4) == "KRIS") {
        periods("chiptracker");
        version = CHIPTRACKER;
        mixer.process = this.chiptracker.bind(this);

        stream.position = 0;
        song.title = stream.readUTF8(22);
        stream.position = 44;
      } else {
        stream.position = 1464;
        if (stream.readUTF8(3) != "MTN") { return; }

        periods();
        version = SOUNDTRACKER26;
        mixer.process = this.soundtracker.bind(this);

        stream.position = 0;
        song.title = stream.readUTF8(20);
        stream.position = 42;
      }

      for (i = 1; i < 32; i++) {
        value = stream.ushort;

        if (!value) {
          this.samples[i] = null;
          stream.position += 28;
          continue;
        }

        stream.position -= 24;

        if (version == CHIPTRACKER) {
          higher = stream.byte;

          if (!higher) {
            this.samples[i] = null;
            stream.position += 51;
            continue;
          }

          stream.position--;
        }

        sample = new Sample();
        sample.name = stream.readUTF8(22);
        sample.length = value << 1;

        stream.position += 3;
        sample.volume  = stream.ubyte;
        sample.loopPtr = stream.ushort;
        sample.repeat  = stream.ushort << 1;

        stream.position += 22;
        this.samples[i] = sample;
      }

      if (version == CHIPTRACKER) {
        stream.position = 956;

        len = stream.ubyte << 2;
        this.track.length = len;

        song.length = len;
        song.restart = stream.ubyte;

        for (i = 0; i < len; i++) {
          value = stream.ubyte << 6;
          if (value > higher) { higher = value; }

          step = new Step();
          step.pattern = value;
          step.transpose = stream.byte;
          this.track[i] = step;
        }

        stream.position = 1982;
        stream.position = 1984 + (stream.byte << 6);
        higher += 64;
      } else {
        stream.position = 950;
        song.length = stream.byte << 2;

        higher = stream.ubyte << 6;

        for (i = 0; i < 512; i++) {
          step = new Step();
          step.pattern = stream.ubyte << 6;
          this.track[i] = step;
        }

        stream.position = 1468;
      }

      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        row = new Row();

        if (version == CHIPTRACKER) {
          row.note   = stream.ubyte >> 1;
          row.sample = stream.ubyte;
          row.effect = stream.ubyte;
          row.param  = stream.ubyte;
        } else {
          value = stream.uint;
          row.note   = (value >> 16) & 0x0fff;
          row.effect = (value >>  8) & 0x0f;
          row.sample = (value >> 24) & 0xf0 | (value >> 12) & 0x0f;
          row.param  = value & 0xff;
        }

        if (row.sample > 31 || !this.samples[row.sample]) {
          row.sample = 0;
        }

        this.patterns[i] = row;
      }

      len = stream.position;
      stream.fill(0, 0, mixer.loopLen);

      for (i = 1; i < 32; i++) {
        sample = this.samples[i];
        if (!sample) { continue; }

        sample.pointer = len;
        len += sample.length;

        if (version == CHIPTRACKER) {
          if (sample.repeat == 2) {
            sample.loopPtr = 0;
            sample.repeat  = 4;
          } else {
            sample.loopPtr += sample.pointer;
          }
        } else {
          stream.fill(0, sample.pointer, 4);

          if (sample.loopPtr || sample.repeat != 2) {
            sample.loopPtr <<= 1;
            sample.length = sample.loopPtr + sample.repeat;
            sample.loopPtr += sample.pointer;
          } else {
            sample.loopPtr = sample.pointer;
          }
        }
      }

      this.samples[0] = new Sample();
    };

    chiptracker() {
      var voice = this.voices[0];
      var chan, pos, row, sample, step, value;

      if (this.trackPositions[this.trackPos] == null) {
        this.trackPositions[this.trackPos] = position;
      }

      if (!this.tick) {
        pos = this.trackPos;

        do {
          chan = voice.channel;
          voice.enabled = 0;
          step = this.track[pos + voice.index];

          row = this.patterns[step.pattern + this.patternPos];
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.sample) {
            sample = voice.sample = this.samples[row.sample];
            voice.volume = sample.volume;
          } else {
            sample = voice.sample;
          }

          chan.volume = voice.volume;

          if (row.note != 0x54) {
            voice.last = row.note + step.transpose;
            if (voice.last < 0) { voice.last += 256; }
            voice.last &= 0xff;

            value = PERIODS[voice.last];

            if (row.effect == 3) {
              if (value != voice.period) {
                voice.portaPeriod = value;
                voice.portaDir = (voice.period < value) ? 1 : 0;
              } else {
                voice.portaPeriod = 0;
              }
            } else {
              voice.enabled = 1;
              voice.period = value;
              voice.vibratoPos = 0;

              chan.enabled = 0;
              chan.pointer = sample.pointer;
              chan.length = sample.length;
              chan.period = value;

              cache[writePos].notes[voice.index] = value;
            }
          }

          switch (voice.effect) {
            case 11:  // position jump
              this.trackPos = (voice.param << 2) - 4;
              this.jumpFlag = 1;
              break;
            case 12:  // set volume
              chan.volume = voice.volume = voice.param;
              break;
            case 13:  // pattern break
              this.jumpFlag = 1;
              break;
            case 14:  // set filter
              mixer.filter = voice.param;
              break;
            case 15:  // set speed
              if (voice.param) { this.speed = voice.param; }
              break;
          }

          if (voice.enabled) { chan.enabled = 1; }
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
        } while (voice = voice.next);
      } else {
        do {
          chan = voice.channel;

          switch (voice.effect) {
            case 0:   // arpeggio
              if (!voice.param) { continue; }
              value = this.tick % 3;
              if (!value) { continue; }

              if (value == 1) {
                value = voice.param >> 4;
              } else {
                value = voice.param & 0x0f;
              }

              value += voice.last;
              voice.period = PERIODS[value];
              chan.period = voice.period;
              break;
            case 1:   // portamento up
              voice.period -= voice.param;
              if (voice.period < 113) { voice.period = 113; }
              chan.period = voice.period;
              break;
            case 2:   // portamento down
              voice.period += voice.param;
              if (voice.period > 856) { voice.period = (voice.period & 0xf000) | 856; }
              chan.period = voice.period;
              break;
            case 3:   // tone portamento
              if (voice.param) {
                voice.portaSpeed = voice.param;
                voice.param = 0;
              }

              if (!voice.portaPeriod) { break; }

              if (voice.portaDir) {
                voice.period -= voice.portaSpeed;

                if (voice.portaPeriod >= voice.period) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              } else {
                voice.period += voice.portaSpeed;

                if (voice.portaPeriod <= voice.period) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              }

              chan.period = voice.period;
              break;
            case 4:   // vibrato
              if (voice.param) {
                voice.vibratoParam = voice.param;
              }

              value = VIBRATO[(voice.vibratoPos >> 2) & 31];
              value = ((voice.vibratoParam & 0x0f) * value) >> 7;

              if (voice.vibratoPos > 127) {
                chan.period = voice.period - value;
              } else {
                chan.period = voice.period + value;
              }

              value = (voice.vibratoParam >> 2) & 60;
              voice.vibratoPos = (voice.vibratoPos + value) & 255;
              break;
            case 10:  // volume slide
              value = voice.param;

              if (value < 16) {
                value = voice.volume - value;
                if (value < 0) { value = 0; }
              } else {
                value = voice.volume + (value >> 4);
                if (value > 64) { value = 64; }
              }

              chan.volume = voice.volume = value;
              break;
          }
        } while (voice = voice.next);
      }

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos++;

        if (this.patternPos == 64 || this.jumpFlag) {
          this.trackPos += 4;

          if (this.played[this.trackPos] || (this.trackPositions[this.trackPos] || position) < position) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.jumpFlag = 0;
          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = song.restart;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };

    soundtracker() {
      var voice = this.voices[0];
      var chan, pos, row, sample, speed0, speed1, step, value;

      if (this.trackPositions[this.trackPos] == null) {
        this.trackPositions[this.trackPos] = position;
      }

      if (!this.tick) {
        pos = this.trackPos;

        do {
          chan = voice.channel;
          voice.enabled = 0;
          step = this.track[pos + voice.index];

          row = this.patterns[step.pattern + this.patternPos];
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.sample) {
            sample = voice.sample = this.samples[row.sample];
            chan.volume = voice.volume = sample.volume;
          } else {
            sample = voice.sample;
          }

          if (row.note) {
            if (row.effect == 3) {
              voice.portaPeriod = row.note;
              voice.portaDir = 0;

              if (voice.portaPeriod == voice.period) {
                voice.portaPeriod = 0;
              } else if (voice.portaPeriod < voice.period) {
                voice.portaDir = 1;
              }
            } else {
              voice.enabled = 1;
              voice.period = row.note;
              voice.vibratoPos = 0;

              chan.enabled = 0;
              chan.pointer = sample.pointer;
              chan.length = sample.length;
              chan.period = voice.period;

              cache[writePos].notes[voice.index] = voice.period;
            }
          }

          switch (row.effect) {
            case 11:  // position jump
              this.trackPos = (voice.param << 2) - 4;
              this.jumpFlag = 1;
              break;
            case 12:  // set volume
              chan.volume = voice.param;
              break;
            case 13:  // pattern break
              this.jumpFlag = 1;
              break;
            case 14:  // set filter
              mixer.filter = voice.param & 1;
              break;
            case 15:  // set speed
              if (!voice.param) { break; }

              speed0 = voice.param & 0x0f;
              speed1 = voice.param >> 4;
              if (!speed1) { speed1 = speed0; }

              this.alternate[0] = speed1;
              this.alternate[1] = speed0;
              break;
          }

          if (voice.enabled) { chan.enabled = 1; }
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
        } while (voice = voice.next);
      } else {
        do {
          chan = voice.channel;

          if (!voice.effect && !voice.param) {
            chan.period = voice.period;
            continue;
          }

          switch (voice.effect) {
            case 0:   // arpeggio
              value = this.tick % 3;

              if (!value) {
                chan.period = voice.period;
                break;
              }

              if (value == 1) {
                value = voice.param >> 4;
              } else {
                value = voice.param & 0x0f;
              }

              speed0 = 0;
              while (voice.period >= PERIODS[speed0]) { speed0++; }
              value += speed0;

              if (value < PERIODS.length) {
                chan.period = PERIODS[value];
              } else {
                chan.period = 0;
              }
              break;
            case 1:   // portamento up
              voice.period -= voice.param;
              if (voice.period < 113) { voice.period = 113; }
              chan.period = voice.period;
              break;
            case 2:   // portamento down
              voice.period += voice.param;
              if (voice.period > 856) { voice.period = 856; }
              chan.period = voice.period;
              break;
            case 3:   // tone portamento
              if (voice.param) {
                voice.portaSpeed = voice.param;
                voice.param = 0;
              }

              if (!voice.portaPeriod) { break; }

              if (voice.portaDir) {
                voice.period -= voice.portaSpeed;

                if (voice.period <= voice.portaPeriod) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              } else {
                voice.period += voice.portaSpeed;

                if (voice.period >= voice.portaPeriod) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              }

              chan.period = voice.period;
              break;
            case 4:   // vibrato
              if (voice.param) {
                voice.vibratoParam = voice.param;
              }

              value = VIBRATO[(voice.vibratoPos >> 2) & 31];
              value = ((voice.vibratoParam & 0x0f) * value) >> 6;

              if (voice.vibratoPos > 127) {
                chan.period = voice.period - value;
              } else {
                chan.period = voice.period + value;
              }

              value = (voice.vibratoParam >> 2) & 60;
              voice.vibratoPos = (voice.vibratoPos + value) & 255;
              break;
            case 10:  // volume slide
              chan.period = voice.period;
              value = voice.param >> 4;

              if (value) {
                voice.volume += value;
                if (voice.volume > 64) { voice.volume = 64; }
              } else {
                voice.volume -= (voice.param & 0x0f);
                if (voice.volume < 0) { voice.volume = 0; }
              }

              chan.volume = voice.volume;
              break;
          }
        } while (voice = voice.next);
      }

      if (++this.tick == this.alternate[this.speed]) {
        this.tick = 0;
        this.speed ^= 1;
        this.patternPos++;

        if (this.patternPos == 64 || this.jumpFlag) {
          this.trackPos += 4;

          if (this.played[this.trackPos] || (this.trackPositions[this.trackPos] || position) < position) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.speed = 0;
          this.jumpFlag = 0;
          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };

    replay() {
      position = this.trackPositions[this.trackPos] || 0;
      super.replay();
    };
  }

  window.neoart.Trackers.ChipTracker = function() {
    tracker = new ChipTracker();
    return player;
  }

  class GameMusic extends Tracker {
    constructor() {
      super(Amiga);

      this.patterns   = [];
      this.patternPos = 0;
      this.track      = [];
      this.trackPos   = 0;

      ID.push("Game Music Creator");

      this.createVoices();
      this.samples.length = 16;

      mixer.process = this.process.bind(this);

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.patternPos = -4;
      this.speed = 6;
      this.trackPos = song.start;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = null;
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var size = 0;
      var i, row, sample, temp, value;

      if (stream.length < 1470) { return; }
      stream.position = 4;

      for (i = 0; i < 15; i++) {
        temp = stream.ushort;

        if (temp) {
          if ((size += (temp << 1)) > stream.length) { return; }
          value = stream.ushort;
          if (value > 64) { return; }

          stream.position += 4;
          if (stream.ushort > temp) { return; }
          stream.position += 6;
        } else {
          stream.position += 14;
        }
      }

      stream.position = 240;
      song.length = stream.uint;
      if (!song.length || ((240 + song.length) > 444)) { return; }

      this.track.length = 0;

      for (i = 0; i < song.length; i++) {
        value = stream.short >> 2;

        if (value < 0) {
          value = 0;
        } else if (value > higher) {
          higher = value;
        }

        this.track[i] = value;
      }

      if (((higher << 2) + size) > stream.length) { return; }

      stream.position = 444;
      higher += 256;
      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        row = new Row();
        row.note = stream.ushort;
        if (row.note && row.note < 100) { return; }

        value = stream.ubyte;
        row.param  = stream.ubyte;
        row.effect = value & 0x0f;
        row.sample = value >> 4;

        this.patterns[i] = row;
      }

      size = stream.position;
      stream.position = 0;

      for (i = 1; i < 16; i++) {
        value = stream.uint;

        if (!value) {
          this.samples[i] = null;
          stream.position += 12;
          continue;
        }

        sample = new Sample();
        sample.length  = stream.ushort << 1;
        sample.pointer = size;
        sample.volume  = stream.ushort;
        sample.loopPtr = stream.uint - value;
        sample.repeat  = stream.ushort << 1;

        if (sample.repeat == 4) {
          sample.loopPtr = 0;
        } else {
          sample.loopPtr += sample.pointer;
        }

        stream.position += 2;
        size += sample.length;
        this.samples[i] = sample;
      }

      stream.fill(0, 0, mixer.loopLen);
      version = 1;
    };

    process() {
      var voice = this.voices[0];
      var chan, row, sample, value;

      do {
        chan = voice.channel;
        chan.period = voice.slide + voice.last;

        if (voice.enabled) {
          sample = voice.sample;
          voice.enabled = 0;
          voice.sample = null;

          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
        }

        if (voice.sample) {
          chan.enabled = voice.enabled = 1;
        }
      } while (voice = voice.next);

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos += 4;

        if (this.patternPos == 256) {
          this.trackPos++;

          if (this.played[this.trackPos]) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }

        voice = this.voices[0];
        value = this.track[this.trackPos] + this.patternPos;

        do {
          chan = voice.channel;
          row = this.patterns[value + voice.index];

          if (row.sample) {
            sample = this.samples[row.sample];

            if (sample) {
              voice.sample = sample;

              chan.enabled = 0;
              chan.volume  = sample.volume;
              chan.pointer = sample.pointer;
              chan.length  = sample.length;
              chan.period = row.note;

              voice.last = row.note;
              voice.slide = 0;

              cache[writePos].notes[voice.index] = row.note;
            }
          }

          switch (row.effect) {
            case 0:
              break;
            case 1:   // slide up
              voice.slide = -row.param;
              break;
            case 2:   // slide down
              voice.slide = row.param;
              break;
            case 3:   // set volume
              chan.volume = row.param;
              break;
            case 5:   // position jump
              this.trackPos = row.param - 1;
            case 4:   // pattern break
              this.patternPos = 252;
              break;
            case 8:   // set speed
              this.speed = row.param;
              break;
            case 6:   // filter on
              mixer.filter = 0;
              break;
            case 7:   // filter off
              mixer.filter = 1;
              break;
          }
        } while (voice = voice.next);
      }

      position += mixer.ticksize;
    };
  }

  window.neoart.Trackers.GameMusic = function() {
    tracker = new GameMusic();
    return player;
  }

  const MEGAFX = new Uint8Array([
     0, 3, 7,12,15,12, 7, 3, 0, 3, 7,12,15,12, 7, 3,
     0, 4, 7,12,16,12, 7, 4, 0, 4, 7,12,16,12, 7, 4,
     0, 3, 8,12,15,12, 8, 3, 0, 3, 8,12,15,12, 8, 3,
     0, 4, 8,12,16,12, 8, 4, 0, 4, 8,12,16,12, 8, 4,
     0, 5, 8,12,17,12, 8, 5, 0, 5, 8,12,17,12, 8, 5,
     0, 5, 9,12,17,12, 9, 5, 0, 5, 9,12,17,12, 9, 5,
    12, 0, 7, 0, 3, 0, 7, 0,12, 0, 7, 0, 3, 0, 7, 0,
    12, 0, 7, 0, 4, 0, 7, 0,12, 0, 7, 0, 4, 0, 7, 0,
     0, 3, 7, 3, 7,12, 7,12,15,12, 7,12, 7, 3, 7, 3,
     0, 4, 7, 4, 7,12, 7,12,16,12, 7,12, 7, 4, 7, 4,
    31,27,24,19,15,12, 7, 3, 0, 3, 7,12,15,19,24,27,
    31,28,24,19,16,12, 7, 4, 0, 4, 7,12,16,19,24,28,
     0,12, 0,12, 0,12, 0,12, 0,12, 0,12, 0,12, 0,12,
     0,12,24,12, 0,12,24,12, 0,12,24,12, 0,12,24,12,
     0, 3, 0, 3, 0, 3, 0, 3, 0, 3, 0, 3, 0, 3, 0, 3,
     0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4, 0, 4
  ]);

  class HisMaster extends Tracker {
    constructor() {
      super(Amiga);

      this.jumpFlag   = 0;
      this.patterns   = [];
      this.patternPos = 0;
      this.track      = [];
      this.trackPos   = 0;

      this.voices[0] = new HMVoice(0);
      this.voices[0].next = this.voices[1] = new HMVoice(1);
      this.voices[1].next = this.voices[2] = new HMVoice(2);
      this.voices[2].next = this.voices[3] = new HMVoice(3);

      ID.push("His Master's NoiseTracker");

      periods();
      mixer.process = this.process.bind(this);
      channels = 4;
      this.samples.length = 32;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.jumpFlag   = 0;
      this.patternPos = 0;
      this.speed      = 6;
      this.trackPos   = song.start;

      mixer.ticksize += 2;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var count, empty, i, id, j, len, pos, row, sample, value;

      if (stream.length < 2106) { return; }
      stream.position = 1080;
      if (stream.readUTF8(4) != "FEST") { return; }

      stream.position = 950;
      song.length = stream.ubyte;
      song.restart = stream.ubyte;

      for (i = 0; i < 128; i++) {
        this.track[i] = stream.ubyte;
      }

      stream.position = 0;
      song.title = stream.readUTF8(20);

      for (i = 1; i < 32; i++) {
        id = stream.readUTF8(4);

        if (id == "Mupp") {
          value = stream.ubyte;
          count = value - higher++;

          for (j = 0; j < 128; j++) {
            if (this.track[j] && this.track[j] >= count) { this.track[j]--; }
          }

          sample = new HMSample();
          sample.name = id;
          sample.length = 32;
          sample.repeat = 32;
          sample.restart = stream.ubyte;
          sample.waveLen = stream.ubyte;

          stream.position += 17;
          sample.finetune = stream.byte;
          sample.volume = stream.ubyte;

          pos = stream.position + 4;
          value = 1084 + (value << 10);

          sample.pointer = value;
          stream.position = value + 896;

          for (j = 0; j < 64; j++) {
            sample.waves[j] = stream.ubyte << 5;
          }

          for (j = 0; j < 64; j++) {
            sample.volumes[j] = stream.ubyte & 127;
          }

          stream.position = value;
          stream.int = 0x666c6f64;
          stream.position = pos;
        } else {
          id = id.substr(0, 2);

          if (id == "El") {
            stream.position += 18;
          } else {
            stream.position -= 4;
            id = stream.readUTF8(22);
          }

          value = stream.ushort;

          if (!value) {
            this.samples[i] = null;
            stream.position += 6;
            continue;
          }

          sample = new HMSample();
          sample.name = id;
          sample.length   = value << 1;
          sample.finetune = stream.byte;
          sample.volume   = stream.ubyte;
          sample.loopPtr  = stream.ushort << 1;
          sample.repeat   = stream.ushort << 1;
        }

        this.samples[i] = sample;
      }

      for (i = 0; i < 128; i++) {
        value = this.track[i] << 8;
        if (value > higher) { higher = value; }
        this.track[i] = value;
      }

      stream.position = 1084;
      higher += 256;
      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        value = stream.uint;

        while (value == 0x666c6f64) {
          stream.position += 1020;
          value = stream.uint;
        }

        row = new Row();
        row.note   = (value >> 16) & 0x0fff;
        row.effect = (value >>  8) & 0x0f;
        row.sample = (value >> 24) & 0xf0 | (value >> 12) & 0x0f;
        row.param  = value & 0xff;

        if (row.sample > 31) { row.sample = 0; }

        this.patterns[i] = row;
      }

      len = stream.position;
      stream.fill(0, 0, mixer.loopLen);

      empty = new HMSample();

      for (i = 0; i < 32; i++) {
        sample = this.samples[i];

        if (!sample) {
          this.samples[i] = empty;
          continue;
        }

        if (sample.name == "Mupp") { continue; }

        sample.pointer = len;
        len += sample.length;
        stream.fill(0, sample.pointer, 4);

        if (sample.loopPtr) {
          sample.length = sample.loopPtr + sample.repeat;
          sample.loopPtr += sample.pointer;
        }
      }

      version = 1;
    };

    process() {
      var voice = this.voices[0];
      var chan, pattern, row, sample, value;

      if (!this.tick) {
        pattern = this.track[this.trackPos] + this.patternPos;

        do {
          chan = voice.channel;
          voice.enabled = 0;

          row = this.patterns[pattern + voice.index];
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.sample) {
            sample = voice.sample = this.samples[row.sample];
            voice.volume2 = sample.volume;

            if (sample.name == "Mupp") {
              sample.loopPtr = sample.pointer + sample.waves[0];
              voice.state = 1;
              voice.volume1 = sample.volumes[0];
            } else {
              voice.state = 0;
              voice.volume1 = 64;
            }
          } else {
            sample = voice.sample;
          }

          if (row.note) {
            if (voice.effect == 3 || voice.effect == 5) {
              if (row.note < voice.period) {
                voice.portaDir = 1;
                voice.portaPeriod = row.note;
              } else if (row.note > voice.period) {
                voice.portaDir = 0;
                voice.portaPeriod = row.note;
              } else {
                voice.portaPeriod = 0;
              }
            } else {
              voice.enabled = 1;
              voice.period = row.note;
              voice.vibratoPos = 0;
              voice.wavePos = 0;

              chan.enabled = 0;
              value = voice.period + ((voice.period * sample.finetune) >> 8);
              chan.period = value;

              if (voice.state) {
                chan.pointer = sample.loopPtr;
                chan.length = sample.repeat;
              } else {
                chan.pointer = sample.pointer;
                chan.length = sample.length;
              }
            }

            cache[writePos].notes[voice.index] = value;
          }

          switch (voice.effect) {
            case 11:  // position jump
              this.trackPos = voice.param - 1;
              this.jumpFlag = 1;
              break;
            case 12:  // set volume
              voice.volume2 = voice.param;
              if (voice.volume2 > 64) { voice.volume2 = 64; }
              break;
            case 13:  // pattern break
              this.jumpFlag = 1;
              break;
            case 14:  // set filter
              mixer.filter = voice.param;
              break;
            case 15:  // set speed
              if (voice.param < 1) {
                this.speed = 1;
              } else if (voice.param > 31) {
                this.speed = 31;
              } else {
                this.speed = voice.param;
              }
              break;
          }

          if (!row.note) { this.effects(voice); }
          voice.handler();

          if (voice.enabled) { chan.enabled = 1; }
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
        } while (voice = voice.next);
      } else {
        do {
          this.effects(voice);
          voice.handler();
          sample = voice.sample;

          chan = voice.channel;
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
        } while (voice = voice.next);
      }

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos += 4;

        if (this.patternPos == 256 || this.jumpFlag) {
          this.trackPos = (++this.trackPos & 127);

          if (this.played[this.trackPos]) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.jumpFlag = 0;
          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = song.restart;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };

    effects(voice) {
      var period = voice.period & 0x0fff;
      var slide = 0;
      var i, len, value;

      if (voice.effect || voice.param) {
        switch (voice.effect) {
          case 0:   // arpeggio
            value = this.tick % 3;
            if (!value) { break; }

            if (value == 1) {
              value = voice.param >> 4;
            } else {
              value = voice.param & 0x0f;
            }

            len = 37 - value;

            for (i = 0; i < len; i++) {
              if (period >= PERIODS[i]) {
                period = PERIODS[i + value];
                break;
              }
            }
            break;
          case 1:   // portamento up
            voice.period -= voice.param;
            if (voice.period < 113) { voice.period = 113; }
            period = voice.period;
            break;
          case 2:   // portamento down
            voice.period += voice.param;
            if (voice.period > 856) { voice.period = 856; }
            period = voice.period;
            break;
          case 3:   // tone portamento
          case 5:   // tone portamento + volume slide
            if (voice.effect == 5) {
              slide = 1;
            } else if (voice.param) {
              voice.portaSpeed = voice.param;
              voice.param = 0;
            }

            if (!voice.portaPeriod) { break; }

            if (voice.portaDir) {
              voice.period -= voice.portaSpeed;

              if (voice.period <= voice.portaPeriod) {
                voice.period = voice.portaPeriod;
                voice.portaPeriod = 0;
              }
            } else {
              voice.period += voice.portaSpeed;

              if (voice.period >= voice.portaPeriod) {
                voice.period = voice.portaPeriod;
                voice.portaPeriod = 0;
              }
            }

            period = voice.period;
            break;
          case 4:   // vibrato
          case 6:   // vibrato + volume slide
            if (voice.effect == 6) {
              slide = 1;
            } else if (voice.param) {
              voice.vibratoSpeed = voice.param;
            }

            value = (voice.vibratoPos >> 2) & 31;
            value = ((voice.vibratoSpeed & 0x0f) * VIBRATO[value]) >> 7;

            if (voice.vibratoPos > 127) {
              period = voice.period - value;
            } else {
              period = voice.period + value;
            }

            value = (voice.vibratoSpeed >> 2) & 60;
            voice.vibratoPos = (voice.vibratoPos + value) & 255;
            break;
          case 7:   // mega arpeggio
            value = MEGAFX[(voice.vibratoPos & 0x0f) + ((voice.param & 0x0f) << 4)];
            voice.vibratoPos++;

            for (i = 0; i < 32; i++) {
              if (period >= PERIODS[i]) { break; }
            }

            value += i;
            if (value > 35) { value -= 12; }
            period = PERIODS[value];
            break;
          case 10:  // volume slide
            slide = 1;
            break;
        }
      }

      voice.channel.period = period + ((period * voice.sample.finetune) >> 8);

      if (slide) {
        value = voice.param >> 4;

        if (value) {
          voice.volume2 += value;
        } else {
          voice.volume2 -= (voice.param & 0x0f);
        }

        if (voice.volume2 < 0) {
          voice.volume2 = 0;
        } else if (voice.volume2 > 64) {
          voice.volume2 = 64;
        }
      }
    };
  }

  class HMSample extends Sample {
    constructor() {
      super();

      this.restart = 0;
      this.waveLen = 0;
      this.waves   = new Uint16Array(64);
      this.volumes = new Uint8Array(64);
    };
  }

  class HMVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel      = null;
      this.sample       = null;
      this.enabled      = 0;
      this.state        = 0;
      this.period       = 0;
      this.effect       = 0;
      this.param        = 0;
      this.volume1      = 0;
      this.volume2      = 0;
      this.portaDir     = 0;
      this.portaPeriod  = 0;
      this.portaSpeed   = 0;
      this.vibratoPos   = 0;
      this.vibratoSpeed = 0;
      this.wavePos      = 0;
    };

    handler() {
      if (this.state) {
        this.sample.loopPtr = this.sample.pointer + this.sample.waves[this.wavePos];

        this.volume1 = this.sample.volumes[this.wavePos];

        if (++this.wavePos > this.sample.waveLen) {
          this.wavePos = this.sample.restart;
        }
      }

      this.channel.volume = (this.volume1 * this.volume2) >> 6;
    };
  }

  window.neoart.Trackers.HisMaster = function() {
    tracker = new HisMaster();
    return player;
  }

  const SOUNDFX10 = 1;
  const SOUNDFX18 = 2;
  const SOUNDFX19 = 3;
  const SOUNDFX20 = 4;

  class SoundFX extends Tracker {
    constructor() {
      super(Amiga);

      this.delphine   = 0;
      this.jumpFlag   = 0;
      this.patterns   = [];
      this.patternPos = 0;
      this.track      = [];
      this.trackPos   = 0;

      this.voices[0] = new FXVoice(0);
      this.voices[0].next = this.voices[1] = new FXVoice(1);
      this.voices[1].next = this.voices[2] = new FXVoice(2);
      this.voices[2].next = this.voices[3] = new FXVoice(3);

      ID.push("SoundFX 1.3", "SoundFX 1.8", "SoundFX 1.945", "SoundFX 2.0");

      periods("soundfx");
      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var value;
      super.initialize();

      value = (ntsc) ? 20.44952532 : 20.637767904;
      value = (value * rate) / 120;
      mixer.ticksize = ((this.tempo / 122) * value) >> 0;

      this.jumpFlag   = 0;
      this.patternPos = 0;
      this.speed      = 6;
      this.trackPos   = song.start;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var base, i, id, len, row, sample, value;

      if (stream.length < 1686) { return; }
      stream.position = 60;
      id = stream.readUTF8(4);

      if (id != "SONG") {
        stream.position = 124;
        id = stream.readUTF8(4);
        if (id != "SO31" || stream.length < 2350) { return; }

        base = 544;
        len = 32;

        version = SOUNDFX20;
      } else {
        base = 0;
        len = 16;

        minver  = SOUNDFX10;
        maxver  = SOUNDFX19;
        version = SOUNDFX10;
      }

      this.tempo = stream.ushort;
      stream.position = 0;

      this.samples.length = len;

      for (i = 1; i < len; i++) {
        value = stream.uint;

        if (value) {
          sample = new Sample();
          sample.pointer = higher;
          higher += value;
          this.samples[i] = sample;
        } else {
          this.samples[i] = null;
        }
      }

      stream.position = base + 530;
      song.length = stream.ubyte;

      stream.position++;
      higher = 0;

      for (i = 0; i < song.length; i++) {
        value = stream.ubyte << 8;
        if (value > higher) { higher = value; }
        this.track[i] = value;
      }

      if (base) { base += 4; }
      stream.position = base + 660;

      higher += 256;
      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        row = new Row();

        row.note   = stream.short;
        value      = stream.ubyte;
        row.param  = stream.ubyte;
        row.effect = value & 0x0f;
        row.sample = value >> 4;

        if (version == SOUNDFX20) {
          if (row.note & 0x1000) {
            row.sample += 16;
            if (row.note > 0) { row.note &= 0xefff; }
          }
        } else {
          if (row.effect < -3) { version = SOUNDFX19; }

          if (version < SOUNDFX19) {
            if (row.effect == 9 || row.note > 856) { version = SOUNDFX18; }
          }
        }

        if (row.sample >= len || !this.samples[row.sample]) {
          row.sample = 0;
        }

        this.patterns[i] = row;
      }

      higher = stream.position;
      stream.position = 16 + (len << 2);

      for (i = 1; i < len; i++) {
        sample = this.samples[i];

        if (!sample) {
          stream.position += 30;
          continue;
        }

        sample.pointer += higher;
        sample.name    = stream.readUTF8(22);
        sample.length  = stream.ushort << 1;
        sample.volume  = stream.ushort;
        sample.loopPtr = sample.pointer + stream.ushort;
        sample.repeat  = stream.ushort << 1;

        stream.fill(0, sample.pointer, 4);
      }

      this.samples[0] = new Sample();

      stream.position = 0;
      this.delphine = 0;

      for (i = 0; i < 128; i++) { this.delphine += stream.ushort; }

      switch (this.delphine) {
        case 172662:
        case 1391423:
        case 1458300:
        case 1706977:
        case 1920077:
        case 1920694:
        case 1677853:
        case 1931956:
        case 1926836:
        case 1385071:
        case 1720635:
        case 1714491:
        case 1731874:
        case 1437490:
          this.delphine = 1;
          break;
        default:
          this.delphine = 0;
          break;
      }

      stream.fill(0, 0, mixer.loopLen);
    };

    process() {
      var voice = this.voices[0];
      var chan, index, period, row, sample, value;

      if (!this.tick) {
        value = this.track[this.trackPos] + this.patternPos;

        do {
          chan = voice.channel;

          row = this.patterns[value + voice.index];
          voice.period = row.note;
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.note == -3) {
            voice.effect = 0;
            continue;
          }

          if (row.sample) {
            sample = voice.sample = this.samples[row.sample];
            voice.volume = sample.volume;

            if (voice.effect == 5) {
              voice.volume += voice.param;
            } else if (voice.effect == 6) {
              voice.volume -= voice.param;
            }

            chan.volume = voice.volume;
          } else {
            sample = voice.sample;
          }

          if (row.note) {
            voice.last = row.note;
            voice.stepSpeed = 0;
            voice.slideSpeed = 0;

            chan.enabled = 0;

            switch (row.note) {
              case -2:
                chan.volume = 0;
                break;
              case -4:
                if (version == SOUNDFX18) { this.jumpFlag = 1; }
                break;
              case -5:
                break;
              default:
                chan.pointer = sample.pointer;
                chan.length = sample.length;
                chan.period = voice.period;

                if (this.delphine) {
                  chan.period <<= 1;
                }
                break;
            }

            chan.enabled = 1;
            chan.pointer = sample.loopPtr;
            chan.length = sample.repeat;

            cache[writePos].notes[voice.index] = row.note;
          }
        } while (voice = voice.next);
      } else {
        do {
          chan = voice.channel;

          if (version == SOUNDFX18 && voice.period == -3) { continue; }

          if (voice.stepSpeed) {
            voice.stepPeriod += voice.stepSpeed;

            if (voice.stepSpeed < 0) {
              if (voice.stepPeriod < voice.stepWanted) {
                voice.stepPeriod = voice.stepWanted;
                if (version > SOUNDFX18) { voice.stepSpeed = 0; }
              }
            } else {
              if (voice.stepPeriod > voice.stepWanted) {
                voice.stepPeriod = voice.stepWanted;
                if (version > SOUNDFX18) { voice.stepSpeed = 0; }
              }
            }

            if (version > SOUNDFX18) {
              voice.last = voice.stepPeriod;
            }

            chan.period = voice.stepPeriod;
          } else {
            if (voice.slideSpeed) {
              value = voice.slideParam & 0x0f;

              if (value) {
                if (++voice.slideCtr == value) {
                  voice.slideCtr = 0;
                  value = (voice.slideParam << 4) << 3;

                  if (voice.slideDir) {
                    voice.slidePeriod -= 8;
                    value -= voice.slideSpeed;
                  } else {
                    voice.slidePeriod += 8;
                    value += voice.slideSpeed;
                  }

                  if (value == voice.slidePeriod) {
                    voice.slideDir ^= 1;
                  }

                  chan.period = voice.slidePeriod;
                } else {
                  continue;
                }
              }
            }

            value = 0;

            switch (voice.effect) {
              case 0:
                break;
              case 1:   // arpeggio
                value = this.tick % 3;
                index = 0;

                if (value == 2) {
                  chan.period = voice.last;
                  break;
                }

                if (value == 1) {
                  value = voice.param & 0x0f;
                } else {
                  value = voice.param >> 4;
                }

                while (voice.last != PERIODS[index]) { index++; }
                chan.period = PERIODS[index + value];
                break;
              case 2:   // pitchbend
                value = voice.param >> 4;

                if (value) {
                  voice.period += value;
                } else {
                  voice.period -= (voice.param & 0x0f);
                }

                chan.period = voice.period;
                break;
              case 3:   // filter on
                mixer.filter = 0;
                break;
              case 4:   // filter off
                mixer.filter = 1;
                break;
              case 8:   // step down
                value = -1;
              case 7:   // step up
                voice.stepSpeed = voice.param & 0x0f;
                voice.stepPeriod = (version > SOUNDFX18) ? voice.last : voice.period;

                if (value < 0) {
                  voice.stepSpeed = -voice.stepSpeed;
                }

                index = 0;

                while (1) {
                  period = PERIODS[index];
                  if (period == voice.stepPeriod) { break; }

                  if (period < 0) {
                    index = -1;
                    break;
                  } else {
                    index++;
                  }
                }

                if (index > -1) {
                  period = voice.param >> 4;
                  if (value > -1) { period = -period; }

                  index += period;
                  if (index < 0) { index = 0; }

                  voice.stepWanted = PERIODS[index];
                } else {
                  voice.stepWanted = voice.period;
                }
                break;
              case 9:   // auto slide
                voice.slideSpeed = voice.slidePeriod = voice.period;
                voice.slideParam = voice.param;
                voice.slideDir = 0;
                voice.slideCtr = 0;
                break;
            }
          }
        } while (voice = voice.next);
      }

      if (++this.tick == this.speed) {
        this.tick = 0;
        this.patternPos += 4;

        if (this.patternPos == 256 || this.jumpFlag) {
          this.trackPos++;

          if (this.played[this.trackPos]) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          this.jumpFlag = 0;
          this.patternPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }
      }

      position += mixer.ticksize;
    };
  }

  class FXVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel     = null;
      this.sample      = null;
      this.period      = 0;
      this.last        = 0;
      this.effect      = 0;
      this.param       = 0;
      this.volume      = 0;
      this.slideCtr    = 0;
      this.slideDir    = 0;
      this.slideParam  = 0;
      this.slidePeriod = 0;
      this.slideSpeed  = 0;
      this.stepPeriod  = 0;
      this.stepSpeed   = 0;
      this.stepWanted  = 0;
    };
  }

  window.neoart.Trackers.SoundFX = function() {
    tracker = new SoundFX();
    return player;
  }

  const FINETUNE = new Uint8Array([6,6,5,5,5,4,4,4,4,3,3,3,3,3,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]);

  class UnicTracker extends Tracker {
    constructor() {
      super(Amiga);

      this.delay      = 0;
      this.jumpFlag   = 0;
      this.patterns   = [];
      this.patternPos = 0;
      this.track      = [];
      this.trackPos   = 0;

      ID.push("UnicTracker");

      this.createVoices();
      this.samples.length = 32;

      periods();
      mixer.process = this.process.bind(this);

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.delay      = 0;
      this.jumpFlag   = 0;
      this.patternPos = 0;
      this.speed      = 6;
      this.tick       = 1;
      this.trackPos   = song.start;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];
      } while (voice = voice.next);
    };

    parse(stream) {
      var base = 20;
      var higher = 0;
      var i, id, len, row, sample, value;

      if (stream.length < 1084) { return; }

      stream.position = 1080;
      id = stream.readUTF8(3);

      if (id != "UNC") {
        stream.position = 1060;
        id = stream.readUTF8(3);
        if (id != "UNC") { return; }
        base = 0;
      }

      variant = stream.readUTF8(1);
      stream.position = 0;

      if (base) { song.title = stream.readUTF8(20); }
      stream.position += 22;

      for (i = 1; i < 32; i++) {
        value = stream.ushort;

        if (!value) {
          this.samples[i] = null;
          stream.position += 28;
          continue;
        }

        stream.position -= 24;

        sample = new Sample();
        sample.name = stream.readUTF8(20);
        sample.length = value << 1;
        sample.finetune = stream.short;

        stream.position += 3;
        sample.volume  = stream.ubyte;
        sample.loopPtr = stream.ushort;
        sample.repeat  = stream.ushort << 1;

        if (variant > 3) {
          sample.loopPtr <<= 2;
        } else {
          sample.loopPtr <<= 1;
        }

        stream.position += 22;
        this.samples[i] = sample;
      }

      stream.position = base + 930;
      song.length = stream.ubyte;
      this.track.length = song.length;

      song.restart = stream.ubyte;
      if (song.restart >= 0x7f) { song.restart = 0; }

      for (i = 0; i < 128; i++) {
        value = stream.ubyte << 8;
        if (value > higher) { higher = value; }
        this.track[i] = value;
      }

      stream.position = base + 1064;
      higher += 256;
      this.patterns.length = higher;

      for (i = 0; i < higher; i++) {
        row = new Row();

        row.note   = stream.ubyte;
        row.effect = stream.ubyte;
        row.param  = stream.ubyte;

        row.sample = (row.note & 0x40) >> 2 | row.effect >> 4;
        row.note   &= 0x3f;
        row.effect &= 0x0f;

        if (row.sample > 31 || !this.samples[row.sample]) {
          row.sample = 0;
        }

        this.patterns[i] = row;
      }

      len = stream.position;
      stream.fill(0, 0, mixer.loopLen);

      for (i = 1; i < 32; i++) {
        sample = this.samples[i];
        if (!sample) { continue; }

        sample.pointer = len;
        len += sample.length;

        stream.fill(0, sample.pointer, 2);

        if (sample.loopPtr || sample.repeat > 2) {
          sample.length = sample.loopPtr + sample.repeat;
          sample.loopPtr += sample.pointer;
        } else {
          sample.loopPtr = 0;
          sample.repeat  = 4;
        }
      }

      this.samples[0] = new Sample();
      version = 1;
    };

    process() {
      var voice = this.voices[0];
      var chan, i, param, period, row, sample, slide, value;

      if (--this.tick == 0) {
        value = this.track[this.trackPos] + this.patternPos;

        this.delay = 0;
        this.tick = this.speed;

        do {
          chan = voice.channel;
          voice.enabled = 0;

          row = this.patterns[value + voice.index];
          voice.effect = row.effect;
          voice.param = row.param;

          if (row.sample) {
            sample = this.samples[row.sample];

            voice.pointer  = sample.pointer;
            voice.length   = sample.length;
            voice.loopPtr  = sample.loopPtr;
            voice.repeat   = sample.repeat;
            voice.finetune = sample.finetune;
            voice.volume   = sample.volume;

            chan.volume = voice.volume;
          }

          if (row.note) {
            voice.last = row.note;
            period = PERIODS[voice.last - 1];

            if (voice.finetune) {
              period += (FINETUNE[voice.last - 1] * voice.finetune);
            }

            if (voice.length) {
              if (row.effect == 3 || row.effect == 5) {

                if (period > voice.period) {
                  voice.portaPeriod = period;
                  voice.portaDir = 1;
                } else if (period < voice.period) {
                  voice.portaPeriod = period;
                  voice.portaDir = 0;
                }
              } else {
                if (row.effect == 9) {
                  i = row.param << 8;
                  voice.pointer += i;
                  voice.length -= i;
                }

                voice.period = period;

                if (voice.effect != 14 && (voice.param >> 4) != 13) {
                  voice.enabled = 1;
                  voice.vibratoPos = 0;

                  chan.enabled = 0;
                  chan.pointer = voice.pointer;
                  chan.length = voice.length;
                  chan.period = voice.period;

                  cache[writePos].notes[voice.index] = voice.period;
                }
              }
            }
          }

          switch (row.effect) {
            case 11:  // position jump
              this.trackPos = row.param - 1;
              this.jumpFlag = 1;
              break;
            case 12:  // set volume
              chan.volume = voice.volume = row.param;
              break;
            case 13:  // pattern break
              this.patternPos = (row.param - 1) << 2;
              this.jumpFlag = 1;
              break;
            case 14:  // extended fx
              param = voice.param & 0x0f;
              i = voice.param >> 4;

              if (i == 10) {              // fine volume up
                voice.volume += param;
                if (voice.volume > 64) { voice.volume = 64; }
                chan.volume = voice.volume;
              } else if (i == 11) {       // fine volume down
                voice.volume -= param;
                if (voice.volume < 0) { voice.volume = 0; }
                chan.volume = voice.volume;
              } else if (i == 14) {       // pattern delay
                this.delay = 1;
                this.tick = this.speed * param;
              } else {                    // set filter
                mixer.filter = param & 1;
              }
              break;
            case 15:  // set speed
              this.speed = row.param;
              if (!this.delay) { this.tick = this.speed; }
              break;
          }

          if (voice.enabled) {
            chan.enabled = 1;
            chan.pointer = voice.loopPtr;
            chan.length = voice.repeat;
          }
        } while (voice = voice.next);

        this.patternPos += 4;

        if (this.patternPos == 256 || this.jumpFlag) {
          this.jumpFlag = 0;
          this.patternPos = 0;

          this.trackPos = (++this.trackPos) & 127;

          if (this.played[this.trackPos]) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }

          if (this.trackPos == song.length) {
            this.trackPos = song.restart;
            mixer.complete = 1;
          }
        }
      } else {
        do {
          chan = voice.channel;

          if (!voice.effect && !voice.param) {
            chan.period = voice.period;
            continue;
          }

          switch (voice.effect) {
            case 0:   // arpeggio
              value = this.tick % 3;

              if (!value) {
                chan.period = voice.period;
                continue;
              }

              if (value == 1) {
                value = voice.param >> 4;
              } else {
                value = voice.param & 0x0f;
              }

              value += (voice.last - 1);
              period = PERIODS[value];

              if (voice.finetune) {
                period += (FINETUNE[value] * voice.finetune);
              }

              chan.period = period;
              break;
            case 1:   // portamento up
              voice.period -= voice.param;
              if (voice.period < 113) { voice.period = 113; }
              chan.period = voice.period;
              break;
            case 2:   // portamento down
              voice.period += voice.param;
              if (voice.period > 904) { voice.period = 904; }
              chan.period = voice.period;
              break;
            case 3:   // tone portamento
            case 5:   // tone portamento + volume slide
              if (voice.effect == 5) {
                slide = 1;
              } else if (voice.param) {
                voice.portaSpeed = voice.param;
                voice.param = 0;
              }

              if (!voice.portaPeriod) { break; }

              if (voice.portaDir) {
                voice.period -= voice.portaSpeed;

                if (voice.period <= voice.portaPeriod) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              } else {
                voice.period += voice.portaSpeed;

                if (voice.period >= voice.portaPeriod) {
                  voice.period = voice.portaPeriod;
                  voice.portaPeriod = 0;
                }
              }

              chan.period = voice.period;
              break;
            case 4:   // vibrato
            case 6:   // vibrato + volume slide
              if (voice.effect == 6) {
                slide = 1;
              } else if (voice.param) {
                value = voice.param & 0x0f;
                if (value) { voice.vibratoParam = (voice.vibratoParam & 0xf0) | value; }

                value = voice.param & 0xf0;
                if (value) { voice.vibratoParam = (voice.vibratoParam & 0x0f) | value; }
              }

              value = (voice.vibratoPos >> 2) & 31;
              value = ((voice.vibratoParam & 0x0f) * VIBRATO[value]) >> 7;

              if (voice.vibratoPos > 127) {
                chan.period = voice.period - value;
              } else {
                chan.period = voice.period + value;
              }

              value = (voice.vibratoParam >> 2) & 60;
              voice.vibratoPos = (voice.vibratoPos + value) & 255;
              break;
            case 10:  // volume slide
              chan.period = voice.period;
              slide = 1;
              break;
            case 14:  // extended fx
              chan.period = voice.period;
              value = voice.param >> 4;

              if (value == 9) {           // retrig note
                value = voice.param & 0x0f;
                if (!value || !this.tick || !voice.last) { continue; }

                if (!(this.tick % value)) {
                  this.retrig(voice);
                }
              } else if (value == 13) {   // note delay
                value = (voice.param & 0x0f) - this.speed + this.tick;

                if (!value) {
                  this.retrig(voice);
                }
              }
              break;
          }

          if (slide) {
            value = voice.param >> 4;

            if (value) {
              voice.volume += value;
            } else {
              voice.volume -= (voice.param & 0x0f);
            }

            if (voice.volume < 0) {
              voice.volume = 0;
            } else if (voice.volume > 64) {
              voice.volume = 64;
            }

            chan.volume = voice.volume;
            slide = 0;
          }
        } while (voice = voice.next);
      }

      position += mixer.ticksize;
    };

    retrig(voice) {
      var chan = voice.channel;

      chan.enabled = 0;
      chan.delay   = 30;
      chan.pointer = voice.pointer;
      chan.length  = voice.length;

      chan.enabled = 1;
      chan.pointer = voice.loopPtr;
      chan.length  = voice.repeat;
    };
  }

  window.neoart.Trackers.UnicTracker = function() {
    tracker = new UnicTracker();
    return player;
  }

  const UPDATE_PERIOD  = 1;
  const UPDATE_VOLUME  = 2;
  const UPDATE_PANNING = 4;
  const UPDATE_TRIGGER = 8;
  const UPDATE_ALL     = 15;
  const SHORT_RAMP     = 32;
  const ENVELOPE_ON    = 1;
  const ENVELOPE_SUST  = 2;
  const ENVELOPE_LOOP  = 4;
  const KEYOFF_NOTE    = 97;
  const LOWER_NOTE     = 0;
  const HIGHER_NOTE    = 118;

  const AUTOVIBRATO = new Int8Array([
     0, -2, -3, -5, -6, -8, -9,-11,-12,-14,-16,-17,-19,-20,-22,-23,
   -24,-26,-27,-29,-30,-32,-33,-34,-36,-37,-38,-39,-41,-42,-43,-44,
   -45,-46,-47,-48,-49,-50,-51,-52,-53,-54,-55,-56,-56,-57,-58,-59,
   -59,-60,-60,-61,-61,-62,-62,-62,-63,-63,-63,-64,-64,-64,-64,-64,
   -64,-64,-64,-64,-64,-64,-63,-63,-63,-62,-62,-62,-61,-61,-60,-60,
   -59,-59,-58,-57,-56,-56,-55,-54,-53,-52,-51,-50,-49,-48,-47,-46,
   -45,-44,-43,-42,-41,-39,-38,-37,-36,-34,-33,-32,-30,-29,-27,-26,
   -24,-23,-22,-20,-19,-17,-16,-14,-12,-11, -9, -8, -6, -5, -3, -2,
     0,  2,  3,  5,  6,  8,  9, 11, 12, 14, 16, 17, 19, 20, 22, 23,
    24, 26, 27, 29, 30, 32, 33, 34, 36, 37, 38, 39, 41, 42, 43, 44,
    45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 56, 57, 58, 59,
    59, 60, 60, 61, 61, 62, 62, 62, 63, 63, 63, 64, 64, 64, 64, 64,
    64, 64, 64, 64, 64, 64, 63, 63, 63, 62, 62, 62, 61, 61, 60, 60,
    59, 59, 58, 57, 56, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46,
    45, 44, 43, 42, 41, 39, 38, 37, 36, 34, 33, 32, 30, 29, 27, 26,
    24, 23, 22, 20, 19, 17, 16, 14, 12, 11,  9,  8,  6,  5,  3,  2
  ]);

  const VOLUMES = new Float32Array([
    0.000000,0.005863,0.013701,0.021569,0.029406,0.037244,0.045082,0.052919,0.060757,
    0.068625,0.076463,0.084300,0.092138,0.099976,0.107844,0.115681,0.123519,0.131357,
    0.139194,0.147032,0.154900,0.162738,0.170575,0.178413,0.186251,0.194119,0.201956,
    0.209794,0.217632,0.225469,0.233307,0.241175,0.249013,0.256850,0.264688,0.272526,
    0.280394,0.288231,0.296069,0.303907,0.311744,0.319582,0.327450,0.335288,0.343125,
    0.350963,0.358800,0.366669,0.374506,0.382344,0.390182,0.398019,0.405857,0.413725,
    0.421563,0.429400,0.437238,0.445076,0.452944,0.460781,0.468619,0.476457,0.484294,
    0.492132,0.500000
  ]);

  class FastTracker2 extends Tracker {
    constructor() {
      super(Soundblaster);
      quality = Quality.high;

      this.endian        = true;
      this.instruments   = [];
      this.linear        = 0;
      this.master        = 0;
      this.masterFlag    = 0;
      this.nextOrder     = 0;
      this.nextPosition  = 0;
      this.order         = 0;
      this.pattern       = null;
      this.patternDelay  = 0;
      this.patternOffset = 0;
      this.patterns      = [];
      this.position      = 0;
      this.timer         = 0;
      this.track         = null;

      ID.push(
        "FastTracker II",
        "Sk@leTracker",
        "MadTracker 2.0",
        "MilkyTracker",
        "DigiBooster Pro 2.18",
        "OpenMPT"
      );

      mixer.process = this.process.bind(this);

      PERIODS.set([
        29024,27392,25856,24384,23040,21696,20480,19328,18240,17216,16256,
        15360,14512,13696,12928,12192,11520,10848,10240, 9664, 9120, 8608,
         8128, 7680, 7256, 6848, 6464, 6096, 5760, 5424, 5120, 4832, 4560,
         4304, 4064, 3840, 3628, 3424, 3232, 3048, 2880, 2712, 2560, 2416,
         2280, 2152, 2032, 1920, 1814, 1712, 1616, 1524, 1440, 1356, 1280,
         1208, 1140, 1076, 1016,  960,  907,  856,  808,  762,  720,  678,
          640,  604,  570,  538,  508,  480,  453,  428,  404,  381,  360,
          339,  320,  302,  285,  269,  254,  240,  227,  214,  202,  190,
          180,  169,  160,  151,  142,  134,  127,  120,  113,  107,  101,
           95,   90,   85,   80,   75,   71,   67,   63,   60,   57,   53,
           50,   48,   45,   42,   40,   38,   36,   34,   32,   30,   28
      ]);

      return Object.seal(this);
    };

    initialize() {
      var i, voice;
      super.initialize();

      this.timer         = song.speed;
      this.master        = 64;
      this.masterFlag    = 0;
      this.order         = song.start;
      this.position      = 0;
      this.nextOrder     = -1;
      this.nextPosition  = -1;
      this.patternDelay  = 0;
      this.patternOffset = 0;

      this.voices.length = channels;

      for (i = 0; i < channels; i++) {
        voice = new F2Voice(i);

        voice.channel = mixer.output[i];
        voice.playing = this.instruments[0];
        voice.sample  = voice.playing.samples[0];

        this.voices[i] = voice;
        if (i) { this.voices[i - 1].next = voice; }
      }
    };

    parse(stream) {
      var header, i, id, iheader, instr, ipos, j, len, pattern, pos, row, rows, sample, value;

      if (stream.length < 360 || stream.readUTF8(17) != "Extended Module: ") { return; }

      song.title = stream.readUTF8(20);
      stream.position++;

      id = stream.readUTF8(20);

      if (id.indexOf("FastTracker") != -1) {
        version = 1;
      } else if (id == "Sk@le Tracker") {
        version = 2;
      } else if (id.indexOf("MadTracker 2.0") != -1) {
        version = 3;
      } else if (id.indexOf("MilkyTracker") != -1) {
        version = 4;
      } else if (id == "DigiBooster Pro 2.18") {
        version = 5;
      } else if (id.indexOf("OpenMPT") != -1) {
        version = 6;
      } else {
        ID.push(id);
        version = 7;
      }

      stream.position += 2;

      header = stream.uint;
      song.length  = stream.ushort;
      song.restart = stream.ushort;
      channels     = stream.ushort;

      value = rows = stream.ushort;
      this.instruments.length = stream.ushort + 1;

      this.linear = stream.ushort;
      song.speed  = stream.ushort;
      this.tempo  = stream.ushort;

      this.track = new Uint8Array(song.length);

      for (i = 0; i < song.length; i++) {
        j = stream.ubyte;
        if (j < rows) { this.track[i] = j; }
      }

      this.patterns.length = rows;
      stream.position = pos = header + 60;
      len = value;

      for (i = 0; i < len; i++) {
        header = stream.uint;
        stream.position++;

        pattern = new F2Pattern(stream.ushort, channels);
        rows = pattern.size;

        value = stream.ushort;
        stream.position = pos + header;
        ipos = stream.position + value;

        if (value) {
          for (j = 0; j < rows; j++) {
            row = new F2Row();
            value = stream.ubyte;

            if (value & 128) {
              if (value &  1) { row.note   = stream.ubyte; }
              if (value &  2) { row.instr  = stream.ubyte; }
              if (value &  4) { row.volume = stream.ubyte; }
              if (value &  8) { row.effect = stream.ubyte; }
              if (value & 16) { row.param  = stream.ubyte; }
            } else {
              row.note   = value;
              row.instr  = stream.ubyte;
              row.volume = stream.ubyte;
              row.effect = stream.ubyte;
              row.param  = stream.ubyte;
            }

            if (row.note > KEYOFF_NOTE) { row.note = 0; }

            pattern.rows[j] = row;
          }
        } else {
          for (j = 0; j < rows; j++) { pattern.rows[j] = new F2Row(); }
        }

        this.patterns[i] = pattern;
        pos = stream.position;
        if (pos != ipos) { stream.position = pos = ipos; }
      }

      pos = stream.position;
      len = this.instruments.length;

      for (i = 1; i < len; i++) {
        iheader = stream.uint;
        if (iheader >= stream.bytesAvailable) { break; }

        instr = new F2Instrument();
        instr.name = stream.readUTF8(22);
        stream.position++;

        value = stream.ushort;
        if (value > 16) { value = 16; }

        if (value) {
          header = stream.uint;
          instr.samples.length = value;

          for (j = 0; j < 96; j++) { instr.noteSamples[j] = stream.ubyte; }
          for (j = 0; j < 12; j++) { instr.volData.points[j] = new F2Point(stream.ushort, stream.ushort); }
          for (j = 0; j < 12; j++) { instr.panData.points[j] = new F2Point(stream.ushort, stream.ushort); }

          instr.volData.total     = stream.ubyte;
          instr.panData.total     = stream.ubyte;
          instr.volData.sustain   = stream.ubyte;
          instr.volData.loopStart = stream.ubyte;
          instr.volData.loopEnd   = stream.ubyte;
          instr.panData.sustain   = stream.ubyte;
          instr.panData.loopStart = stream.ubyte;
          instr.panData.loopEnd   = stream.ubyte;
          instr.volData.flags     = stream.ubyte;
          instr.panData.flags     = stream.ubyte;

          if (instr.volData.flags & ENVELOPE_ON) { instr.volEnabled = 1; }
          if (instr.panData.flags & ENVELOPE_ON) { instr.panEnabled = 1; }

          instr.vibratoType  = stream.ubyte;
          instr.vibratoSweep = stream.ubyte;
          instr.vibratoDepth = stream.ubyte;
          instr.vibratoSpeed = stream.ubyte;
          instr.fadeout = stream.ushort << 1;

          pos += iheader;
          stream.position = pos;
          this.instruments[i] = instr;

          for (j = 0; j < value; j++) {
            sample = new SBSample();
            sample.length    = stream.uint;
            sample.loopStart = stream.uint;
            sample.loopLen   = stream.uint;
            sample.volume    = stream.ubyte;
            sample.finetune  = stream.byte;
            sample.loopMode  = stream.ubyte;
            sample.panning   = stream.ubyte;
            sample.relative  = stream.byte;

            stream.position++;
            sample.name = stream.readUTF8(22);

            pos += header;
            stream.position = pos;
            instr.samples[j] = sample;
          }

          for (j = 0; j < value; j++) {
            sample = instr.samples[j];
            if (!sample.length) { continue; }
            pos = stream.position + sample.length;

            if (sample.loopMode & 16) {
              sample.bits       = 16;
              sample.loopMode  ^= 16;
              sample.length    >>= 1;
              sample.loopStart >>= 1;
              sample.loopLen   >>= 1;
            }

            if (!sample.loopLen) { sample.loopMode = 0; }
            sample.store(stream);

            if (sample.loopMode) {
              sample.length = sample.loopStart + sample.loopLen;
            }

            stream.position = pos;
          }
        } else {
          pos += iheader;
          stream.position = pos;
        }

        if (stream.bytesAvailable < 4) { break; }
      }

      instr = new F2Instrument();
      instr.volData = new F2Data();
      instr.panData = new F2Data();

      for (i = 0; i < 12; i++) {
        instr.volData.points[i] = new F2Point();
        instr.panData.points[i] = new F2Point();
      }

      sample = new SBSample();
      sample.length = 220;
      sample.data = new Float32Array(220);

      instr.samples[0] = sample;
      this.instruments[0] = instr;
    };

    process() {
      var voice = this.voices[0];
      var com, curr, i, instr, jumpFlag, next, paramx, paramy, porta, row, sample, slide, value;

      this.masterFlag = 0;

      if (!this.tick) {
        if (this.nextOrder >= 0) { this.order = this.nextOrder; }
        if (this.nextPosition >= 0) { this.position = this.nextPosition; }

        this.nextOrder = this.nextPosition = -1;
        this.pattern = this.patterns[this.track[this.order]];

        do {
          row = this.pattern.rows[this.position + voice.index];
          com = row.volume >> 4;
          porta = (row.effect == 3 || row.effect == 5 || com == 15);
          paramx = row.param >> 4;
          voice.keyoff = 0;

          if (voice.arpDelta) {
            voice.arpDelta = 0;
            voice.flags |= UPDATE_PERIOD;
          }

          if (row.instr) {
            if (!porta) {
              voice.instrument = (row.instr < this.instruments.length) ? this.instruments[row.instr] : null;
            }

            voice.volEnvelope.reset();
            voice.panEnvelope.reset();
            voice.flags |= (UPDATE_VOLUME | UPDATE_PANNING | SHORT_RAMP);
          } else if (row.note == KEYOFF_NOTE || (row.effect == 20 && !row.param)) {
            voice.fadeEnabled = 1;
            voice.keyoff = 1;
          }

          const note = row.note ? row.note : !!row.instr;
          if (note && !voice.keyoff) {
            if (porta && voice.portaSkip) { continue; }
            voice.portaSkip = 0;

            if (voice.instrument) {
              instr = voice.instrument;
              value = row.note - 1;

              if (note === true) {
                value = voice.note;
                sample = voice.sample;
              } else {
                sample = instr.samples[instr.noteSamples[value]];
                value += sample.relative;
              }

              if (value >= LOWER_NOTE && value <= HIGHER_NOTE) {
                if (!porta) {
                  voice.note = value;
                  voice.sample = sample;

                  if (row.instr) {
                    voice.volEnabled = instr.volEnabled;
                    voice.panEnabled = instr.panEnabled;
                    voice.flags |= UPDATE_ALL;
                  } else {
                    voice.flags |= (UPDATE_PERIOD | UPDATE_TRIGGER);
                  }
                }

                if (row.instr) {
                  voice.reset();
                  voice.fadeDelta = instr.fadeout;
                } else {
                  voice.finetune = (sample.finetune >> 3) << 2;
                }

                if (row.effect == 14 && paramx == 5) {
                  voice.finetune = ((row.param & 15) - 8) << 3;
                }

                if (this.linear) {
                  value = ((120 - value) << 6) - voice.finetune;
                } else {
                  value = this.amiga(value, voice.finetune);
                }

                if (!porta) {
                  voice.period = value;
                  voice.glissPeriod = 0;
                } else {
                  voice.portaPeriod = value;
                }
              }
            } else {
              voice.volume = 0;
              voice.flags = (UPDATE_VOLUME | SHORT_RAMP);
            }
          } else if (voice.vibratoReset) {
            if (row.effect != 4 && row.effect != 6) {
              voice.vibDelta = 0;
              voice.vibratoReset = 0;
              voice.flags |= UPDATE_PERIOD;
            }
          }

          if (row.volume) {
            if (row.volume >= 16 && row.volume <= 80) {
              voice.volume = row.volume - 16;
              voice.flags |= (UPDATE_VOLUME | SHORT_RAMP);
            } else {
              paramy = row.volume & 15;

              switch (com) {
                case 8:   // vx fine volume slide down
                  voice.volume -= paramy;
                  if (voice.volume < 0) { voice.volume = 0; }
                  voice.flags |= UPDATE_VOLUME;
                  break;
                case 9:   // vx fine volume slide up
                  voice.volume += paramy;
                  if (voice.volume > 64) { voice.volume = 64; }
                  voice.flags |= UPDATE_VOLUME;
                  break;
                case 10:  // vx set vibrato speed
                  if (paramy) { voice.vibratoSpeed = paramy; }
                  break;
                case 11:  // vx vibrato
                  if (paramy) { voice.vibratoDepth = paramy << 2; }
                  break;
                case 12:  // vx set panning
                  voice.panning = paramy << 4;
                  voice.flags |= UPDATE_PANNING;
                  break;
                case 15:  // vx tone portamento
                  if (paramy) { voice.portaSpeed = paramy << 4; }
                  break;
              }
            }
          }

          if (row.effect) {
            paramy = row.param & 15;

            switch (row.effect) {
              case 1:   // fx portamento up
                if (row.param) { voice.portaU = row.param << 2; }
                break;
              case 2:   // fx portamento down
                if (row.param) { voice.portaD = row.param << 2; }
                break;
              case 3:   // fx tone portamento
                if (row.param && com != 15) { voice.portaSpeed = row.param; }
                break;
              case 4:   // fx vibrato
                voice.vibratoReset = 1;
                break;
              case 5:   // fx tone portamento + volume slide
                if (row.param) { voice.volSlide = row.param; }
                break;
              case 6:   // fx vibrato + volume slide
                if (row.param) { voice.volSlide = row.param; }
                voice.vibratoReset = 1;
                break;
              case 7:   // fx tremolo
                if (paramx) { voice.tremoloSpeed = paramx; }
                if (paramy) { voice.tremoloDepth = paramy; }
                break;
              case 8:   // fx set panning
                voice.panning = row.param;
                voice.flags |= UPDATE_PANNING;
                break;
              case 9:   // fx sample offset
                if (row.param) { voice.sampleOffset = row.param << 8; }

                if (voice.sampleOffset >= voice.sample.length) {
                  voice.portaSkip = 1;
                  voice.sampleOffset = 0;
                  voice.keyoff = 1;
                  voice.flags &= ~(UPDATE_PERIOD | UPDATE_TRIGGER);
                }
                break;
              case 10:  // fx volume slide
                if (row.param) { voice.volSlide = row.param; }
                break;
              case 11:  // fx position jump
                this.nextOrder = row.param;

                if (this.nextOrder >= song.length) {
                  mixer.complete = 1;
                } else {
                  this.nextPosition = 0;

                  if (this.played[this.nextOrder] == this.nextPosition) {
                    mixer.complete = 1;
                  } else {
                    this.played[this.nextOrder] = this.nextPosition;
                  }
                }

                jumpFlag = 1;
                this.patternOffset = 0;
                break;
              case 12:  // fx set volume
                voice.volume = row.param;
                voice.flags |= (UPDATE_VOLUME | SHORT_RAMP);
                break;
              case 13:  // fx pattern break
                this.nextPosition = ((paramx * 10) + paramy) * channels;
                this.patternOffset = 0;

                if (!jumpFlag) {
                  this.nextOrder = this.order + 1;

                  if (this.nextOrder >= song.length) {
                    this.complete = 1;
                    this.nextPosition = -1;
                  } else {
                    this.played[this.nextOrder] = this.nextPosition;
                  }
                }
                break;
              case 14:  // fx extended effects

                switch (paramx) {
                  case 1:   // ex fine portamento up
                    if (paramy) { voice.finePortaU = paramy << 2; }
                    voice.period -= voice.finePortaU;
                    voice.flags |= UPDATE_PERIOD;
                    break;
                  case 2:   // ex fine portamento down
                    if (paramy) { voice.finePortaD = paramy << 2; }
                    voice.period += voice.finePortaD;
                    voice.flags |= UPDATE_PERIOD;
                    break;
                  case 3:   // ex glissando control
                    voice.glissando = paramy;
                    break;
                  case 4:   // ex vibrato control
                    voice.waveControl = (voice.waveControl & 0xf0) | paramy;
                    break;
                  case 6:   // ex pattern loop
                    if (!paramy) {
                      voice.patternLoopRow = this.patternOffset = this.position;
                    } else {
                      if (!voice.patternLoop) {
                        voice.patternLoop = paramy;
                      } else {
                        voice.patternLoop--;
                      }

                      if (voice.patternLoop) {
                        this.nextPosition = voice.patternLoopRow;
                      }
                    }
                    break;
                  case 7:   // ex tremolo control
                    voice.waveControl = (voice.waveControl & 0x0f) | (paramy << 4);
                    break;
                  case 10:  // ex fine volume slide up
                    if (paramy) { voice.fineSlideU = paramy; }
                    voice.volume += voice.fineSlideU;
                    voice.flags |= UPDATE_VOLUME;
                    break;
                  case 11:  // ex fine volume slide down
                    if (paramy) { voice.fineSlideD = paramy; }
                    voice.volume -= voice.fineSlideD;
                    voice.flags |= UPDATE_VOLUME;
                    break;
                  case 13:  // ex note delay
                    voice.delay = voice.flags;
                    voice.flags = 0;
                    break;
                  case 14:  // ex pattern delay
                    this.patternDelay = paramy * this.timer;
                    break;
                }

                break;
              case 15:  // fx set speed
                if (row.param) {
                  if (row.param < 32) {
                    this.timer = row.param;
                  } else {
                    mixer.ticksize = ((audio.sampleRate * 2.5) / row.param) >> 0;
                  }
                }
                break;
              case 16:  // fx set global volume
                this.master = row.param;
                if (this.master > 64) { this.master = 64; }
                this.masterFlag = 1;
                break;
              case 17:  // fx global volume slide
                if (row.param) { voice.volSlideMaster = row.param; }
                break;
              case 21:  // fx set envelope position
                if (!voice.instrument || !voice.instrument.volEnabled) { break; }
                instr = voice.instrument;
                value = row.param;
                paramx = instr.volData.total;

                for (i = 0; i < paramx; i++) {
                  if (value < instr.volData.points[i].frame) { break; }
                }

                voice.volEnvelope.position = --i;
                paramx--;

                if ((instr.volData.flags & ENVELOPE_LOOP) && i == instr.volData.loopEnd) {
                  i = voice.volEnvelope.position = instr.volData.loopStart;
                  value = instr.volData.points[i].frame;
                  voice.volEnvelope.frame = value;
                }

                if (i >= paramx) {
                  voice.volEnvelope.value = instr.volData.points[paramx].value;
                  voice.volEnvelope.stopped = 1;
                } else {
                  voice.volEnvelope.stopped = 0;
                  voice.volEnvelope.frame = value;
                  if (value > instr.volData.points[i].frame) { voice.volEnvelope.position++; }

                  curr = instr.volData.points[i];
                  next = instr.volData.points[++i];
                  value = next.frame - curr.frame;

                  voice.volEnvelope.delta = (value ? (((next.value - curr.value) << 8) / value) >> 0 : 0) || 0;
                  voice.volEnvelope.fraction = curr.value << 8;
                }
                break;
              case 24:  // fx panning slide
                if (row.param) { voice.panSlide = row.param; }
                break;
              case 27:  // fx multi retrig note
                if (paramx) { voice.retrigx = paramx; }
                if (paramy) { voice.retrigy = paramy; }

                if (!row.volume && voice.retrigy) {
                  com = this.tick + 1;
                  if (com % voice.retrigy) { break; }
                  if (row.volume > 80 && voice.retrigx) { this.retrig(voice); }
                }
                break;
              case 29:  // fx tremor
                if (row.param) {
                  voice.tremorOn = ++paramx;
                  voice.tremorOff = (++paramy) + paramx;
                }
                break;
              case 33:  // fx extra fine portamento
                if (paramx == 1) {
                  if (paramy) { voice.xtraPortaU = paramy; }
                  voice.period -= voice.xtraPortaU;
                  voice.flags |= UPDATE_PERIOD;
                } else if (paramx == 2) {
                  if (paramy) { voice.xtraPortaD = paramy; }
                  voice.period += voice.xtraPortaD;
                  voice.flags |= UPDATE_PERIOD;
                }
                break;
            }
          }
        } while (voice = voice.next);
      } else {
        do {
          row = this.pattern.rows[this.position + voice.index];

          if (voice.delay) {
            if ((row.param & 15) == this.tick) {
              voice.flags = voice.delay;
              voice.delay = 0;
            } else {
              continue;
            }
          }

          if (row.volume) {
            paramx = row.volume >> 4;
            paramy = row.volume & 15;

            switch (paramx) {
              case 6:   // vx volume slide down
                voice.volume -= paramy;
                if (voice.volume < 0) { voice.volume = 0; }
                voice.flags |= UPDATE_VOLUME;
                break;
              case 7:   // vx volume slide up
                voice.volume += paramy;
                if (voice.volume > 64) { voice.volume = 64; }
                voice.flags |= UPDATE_VOLUME;
                break;
              case 11:  // vx vibrato
                voice.vibrato();
                break;
              case 13:  // vx panning slide left
                voice.panning -= paramy;
                if (voice.panning < 0) { voice.panning = 0; }
                voice.flags |= UPDATE_PANNING;
                break;
              case 14:  // vx panning slide right
                voice.panning += paramy;
                if (voice.panning > 255) { voice.panning = 255; }
                voice.flags |= UPDATE_PANNING;
                break;
              case 15:  // vx tone portamento
                if (voice.portaPeriod) { voice.tonePortamento(); }
                break;
            }
          }

          paramx = row.param >> 4;
          paramy = row.param & 15;

          switch (row.effect) {
            case 0:   // fx arpeggio
              if (!row.param) { break; }

              value = this.timer - (this.tick % this.timer);

              if (value < 16) {
                value %= 3;
              } else if (value == 16) {
                value = 0;
              } else {
                value = 2;
              }

              if (!value) {
                voice.arpDelta = 0;
              } else if (value == 1) {
                if (this.linear) {
                  value = voice.note + paramx;
                  if (value > 96) { paramx -= (value - 96); }
                  voice.arpDelta = -(paramx << 6);
                } else {
                  value = this.amiga(voice.note + paramx, voice.finetune);
                  voice.arpDelta = value - voice.period;
                }
              } else {
                if (this.linear) {
                  value = voice.note + paramy;
                  if (value > 96) { paramy -= (value - 96); }
                  voice.arpDelta = -(paramy << 6);
                } else {
                  value = this.amiga(voice.note + paramy, voice.finetune);
                  voice.arpDelta = value - voice.period;
                }
              }

              voice.flags |= UPDATE_PERIOD;
              break;
            case 1:   // fx portamento up
              voice.period -= voice.portaU;
              if (voice.period < 0) { voice.period = 0; }
              voice.flags |= UPDATE_PERIOD;
              break;
            case 2:   // fx portamento down
              voice.period += voice.portaD;
              if (voice.period > 9212) { voice.period = 9212; }
              voice.flags |= UPDATE_PERIOD;
              break;
            case 3:   // fx tone portamento
              if (voice.portaPeriod) { voice.tonePortamento(); }
              break;
            case 4:   // fx vibrato
              if (paramx) { voice.vibratoSpeed = paramx; }
              if (paramy) { voice.vibratoDepth = paramy << 2; }
              voice.vibrato();
              break;
            case 5:   // fx tone portamento + volume slide
              slide = 1;
              if (voice.portaPeriod) { voice.tonePortamento(); }
              break;
            case 6:   // fx vibrato + volume slide
              slide = 1;
              voice.vibrato();
              break;
            case 7:   // fx tremolo
              voice.tremolo();
              break;
            case 10:  // fx volume slide
              slide = 1;
              break;
            case 14:  // fx extended effects

              switch (paramx) {
                case 9:   // ex retrig note
                  if ((this.tick % paramy) == 0) {
                    voice.volEnvelope.reset();
                    voice.panEnvelope.reset();
                    voice.flags |= (UPDATE_VOLUME | UPDATE_PANNING | UPDATE_TRIGGER);
                  }
                  break;
                case 12:  // ex note cut
                  if (this.tick == paramy) {
                    voice.volume = 0;
                    voice.flags |= UPDATE_VOLUME;
                  }
                  break;
              }

              break;
            case 17:  // fx global volume slide
              paramx = voice.volSlideMaster >> 4;
              paramy = voice.volSlideMaster & 15;

              if (paramx) {
                this.master += paramx;
                if (this.master > 64) { this.master = 64; }
                this.masterFlag = 1;
              } else if (paramy) {
                this.master -= paramy;
                if (this.master < 0) { this.master = 0; }
                this.masterFlag = 1;
              }
              break;
            case 20:  // fx keyoff
              if (this.tick == row.param) {
                voice.fadeEnabled = 1;
                voice.keyoff = 1;
              }
              break;
            case 24:  // fx panning slide
              paramx = voice.panSlide >> 4;
              paramy = voice.panSlide & 15;

              if (paramx) {
                voice.panning += paramx;
                if (voice.panning > 255) { voice.panning = 255; }
                voice.flags |= UPDATE_PANNING;
              } else if (paramy) {
                voice.panning -= paramy;
                if (voice.panning < 0) { voice.panning = 0; }
                voice.flags |= UPDATE_PANNING;
              }
              break;
            case 27:  // fx multi retrig note
              com = this.tick;
              if (!row.volume) { com++; }
              if (com % voice.retrigy) { break; }

              if ((!row.volume || row.volume > 80) && voice.retrigx) { this.retrig(voice); }
              voice.flags |= UPDATE_TRIGGER;
              break;
            case 29:  // fx tremor
              voice.tremor();
              break;
          }

          if (slide) {
            paramx = voice.volSlide >> 4;
            paramy = voice.volSlide & 15;
            slide = 0;

            if (paramx) {
              voice.volume += paramx;
              voice.flags |= UPDATE_VOLUME;
            } else if (paramy) {
              voice.volume -= paramy;
              voice.flags |= UPDATE_VOLUME;
            }
          }
        } while (voice = voice.next);
      }

      if (++this.tick >= (this.timer + this.patternDelay)) {
        this.tick = this.patternDelay = 0;

        if (this.nextPosition < 0) {
          this.nextPosition = this.position + channels;

          if (this.nextPosition >= this.pattern.size || this.complete) {
            this.nextOrder = this.order + 1;
            this.nextPosition = this.patternOffset;

            if (this.played[this.nextOrder] == this.nextPosition) {
              mixer.complete = 1;
            } else {
              this.played[this.nextOrder] = this.nextPosition;
            }

            if (this.nextOrder >= song.length) {
              this.nextOrder = song.restart;
              mixer.complete = 1;
            }
          }
        }
      }

      position += mixer.ticksize;
    };

    fast() {
      var voice = this.voices[0];
      var chan, delta, flags, instr, panning, vol;

      do {
        chan = voice.channel;
        flags = voice.flags;
        voice.flags = 0;

        if (flags & UPDATE_TRIGGER) {
          chan.index   = voice.sampleOffset;
          chan.pointer = -1;
          chan.sample  = voice.sample;
          chan.length  = voice.sample.length;

          chan.dir = chan.fraction = 0;

          chan.enabled = (chan.sample.data) ? 1 : 0;
          voice.playing = voice.instrument;
          voice.sampleOffset = 0;
        }

        instr = voice.playing;
        delta = (instr.vibratoSpeed) ? voice.autoVibrato() : 0;

        vol = voice.volume + voice.volDelta;

        if (instr.volEnabled) {
          if (voice.volEnabled && !voice.volEnvelope.stopped) {
            this.envelope(voice, voice.volEnvelope, instr.volData);
          }

          vol = (vol * voice.volEnvelope.value) >> 6;
          flags |= UPDATE_VOLUME;

          if (voice.fadeEnabled) {
            voice.fadeVolume -= voice.fadeDelta;

            if (voice.fadeVolume < 0) {
              voice.fadeVolume  = vol = 0;
              voice.fadeEnabled = 0;

              voice.volEnvelope.value   = 0;
              voice.volEnvelope.stopped = 1;
              voice.panEnvelope.stopped = 1;
            } else {
              vol = (vol * voice.fadeVolume) >> 16;
            }
          }
        } else if (voice.keyoff) {
          chan.enabled = 0;
        }

        panning = voice.panning;

        if (instr.panEnabled) {
          if (voice.panEnabled && !voice.panEnvelope.stopped) {
            this.envelope(voice, voice.panEnvelope, instr.panData);
          }

          panning = voice.panEnvelope.value << 2;
          flags |= UPDATE_PANNING;

          if (panning < 0) {
            panning = 0;
          } else if (panning > 255) {
            panning = 255;
          }
        }

        if (flags & UPDATE_PANNING) {
          chan.panning = panning;
          chan.lpan = Math.sqrt((256 - panning) / 512);
          chan.rpan = Math.sqrt(panning / 512);

          chan.lvol = chan.volume * chan.lpan;
          chan.rvol = chan.volume * chan.rpan;
        }

        if (flags & UPDATE_VOLUME || this.masterFlag) {
          if (vol < 0) {
            vol = 0;
          } else if (vol > 64) {
            vol = 64;
          }

          chan.volume = VOLUMES[(volume * vol * this.master) >> 12];
          chan.lvol = chan.volume * chan.lpan;
          chan.rvol = chan.volume * chan.rpan;
        }

        if (flags & UPDATE_PERIOD) {
          delta += (voice.period + voice.arpDelta + voice.vibDelta);

          if (this.linear) {
            chan.speed = (((548077568 * Math.pow(2, ((4608 - delta) / 768))) / audio.sampleRate) >> 0) / 65536;
          } else {
            chan.speed = (((65536 * (14317456 / delta)) / audio.sampleRate) >> 0) / 65536;
          }

          chan.delta = chan.speed >> 0;
          chan.speed -= chan.delta;
        }
      } while (voice = voice.next);
    };

    accurate() {
      var voice = this.voices[0];
      var chan, delta, flags, instr, lpan, lvol, panning, rpan, rvol, vol;

      do {
        chan = voice.channel;
        flags = voice.flags;
        voice.flags = 0;

        if (flags & UPDATE_TRIGGER) {
          if (chan.sample) {
            flags |= SHORT_RAMP;
            chan.mixCounter = 220;
            chan.oldSample  = null;
            chan.oldPointer = -1;

            if (chan.enabled) {
              chan.oldDir = chan.dir;
              chan.oldFraction = chan.fraction;
              chan.oldSpeed    = chan.speed;
              chan.oldSample   = chan.sample;
              chan.oldPointer  = chan.pointer;
              chan.oldLength   = chan.length;

              chan.lmixRampD  = chan.lvol;
              chan.lmixDeltaD = chan.lvol / 220;
              chan.rmixRampD  = chan.rvol;
              chan.rmixDeltaD = chan.rvol / 220;
            }
          }

          chan.dir = 1;
          chan.fraction = 0;
          chan.sample   = voice.sample;
          chan.pointer  = voice.sampleOffset;
          chan.length   = voice.sample.length;

          chan.enabled = (chan.sample.data) ? 1 : 0;
          voice.playing = voice.instrument;
          voice.sampleOffset = 0;
        }

        instr = voice.playing;
        delta = (instr.vibratoSpeed) ? voice.autoVibrato() : 0;

        vol = voice.volume + voice.volDelta;

        if (instr.volEnabled) {
          if (voice.volEnabled && !voice.volEnvelope.stopped) {
            this.envelope(voice, voice.volEnvelope, instr.volData);
          }

          vol = (vol * voice.volEnvelope.value) >> 6;
          flags |= UPDATE_VOLUME;

          if (voice.fadeEnabled) {
            voice.fadeVolume -= voice.fadeDelta;

            if (voice.fadeVolume < 0) {
              voice.fadeVolume  = vol = 0;
              voice.fadeEnabled = 0;

              voice.volEnvelope.value   = 0;
              voice.volEnvelope.stopped = 1;
              voice.panEnvelope.stopped = 1;
            } else {
              vol = (vol * voice.fadeVolume) >> 16;
            }
          }
        } else if (voice.keyoff) {
          chan.enabled = 0;
        }

        panning = voice.panning;

        if (instr.panEnabled) {
          if (voice.panEnabled && !voice.panEnvelope.stopped) {
            this.envelope(voice, voice.panEnvelope, instr.panData);
          }

          panning = voice.panEnvelope.value << 2;
          flags |= UPDATE_PANNING;

          if (panning < 0) {
            panning = 0;
          } else if (panning > 255) {
            panning = 255;
          }
        }

        if (!chan.enabled) {
          chan.volCounter = 0;
          chan.panCounter = 0;
          continue;
        }

        if (flags & UPDATE_VOLUME || this.masterFlag) {
          if (vol < 0) {
            vol = 0;
          } else if (vol > 64) {
            vol = 64;
          }

          vol = VOLUMES[(volume * vol * this.master) >> 12];
          lvol = vol * Math.sqrt((256 - panning) / 512);
          rvol = vol * Math.sqrt(panning / 512);

          if (vol != chan.volume && !chan.mixCounter) {
            chan.volCounter = (flags & SHORT_RAMP) ? 220 : mixer.ticksize;

            chan.lvolDelta = (lvol - chan.lvol) / chan.volCounter;
            chan.rvolDelta = (rvol - chan.rvol) / chan.volCounter;
          } else {
            chan.lvol = lvol;
            chan.rvol = rvol;
          }

          chan.volume = vol;
        }

        if (flags & UPDATE_PANNING) {
          lpan = Math.sqrt((256 - panning) / 512);
          rpan = Math.sqrt(panning / 512);

          if (panning != chan.panning && !chan.mixCounter && !chan.volCounter) {
            chan.panCounter = mixer.ticksize;

            chan.lpanDelta = (lpan - chan.lpan) / chan.panCounter;
            chan.rpanDelta = (rpan - chan.rpan) / chan.panCounter;
          } else {
            chan.lpan = lpan;
            chan.rpan = rpan;
          }

          chan.panning = panning;
        }

        if (flags & UPDATE_PERIOD) {
          delta += (voice.period + voice.arpDelta + voice.vibDelta);

          if (this.linear) {
            chan.speed = (((548077568 * Math.pow(2, ((4608 - delta) / 768))) / audio.sampleRate) >> 0) / 65536;
          } else {
            chan.speed = (((65536 * (14317456 / delta)) / audio.sampleRate) >> 0) / 65536;
          }
        }

        if (chan.mixCounter) {
          chan.lmixRampU  = 0.0;
          chan.lmixDeltaU = chan.lvol / 220;
          chan.rmixRampU  = 0.0;
          chan.rmixDeltaU = chan.rvol / 220;
        }
      } while (voice = voice.next);
    };

    envelope(voice, env, data) {
      var pos = env.position;
      var cur = data.points[pos];
      var next;

      if (env.frame == cur.frame) {
        if ((data.flags & ENVELOPE_LOOP) && pos == data.loopEnd) {
          pos = env.position = data.loopStart;
          cur = data.points[pos];
          env.frame = cur.frame;
        }

        if (pos == (data.total - 1)) {
          env.value = cur.value;
          env.stopped = 1;
          return;
        }

        if ((data.flags & ENVELOPE_SUST) && pos == data.sustain && !voice.fadeEnabled) {
          env.value = cur.value;
          return;
        }

        next = data.points[++env.position];

        env.delta = ((((next.value - cur.value) << 8) / (next.frame - cur.frame)) >> 0) || 0;
        env.fraction = cur.value << 8;
      } else {
        env.fraction += env.delta;
      }

      env.value = env.fraction >> 8;
      env.frame++;
    };

    amiga(note, finetune) {
      var delta = 0.0;
      var period = PERIODS[++note];

      if (finetune < 0) {
        delta = (PERIODS[--note] - period) / 64;
      } else if (finetune > 0) {
        delta = (period - PERIODS[++note]) / 64;
      }

      return (period - (delta * finetune)) >> 0;
    };

    retrig(voice) {
      switch (voice.retrigx) {
        case 1:
          voice.volume--;
          break;
        case 2:
          voice.volume -= 2;
          break;
        case 3:
          voice.volume -= 4;
          break;
        case 4:
          voice.volume -= 8;
          break;
        case 5:
          voice.volume -= 16;
          break;
        case 6:
          voice.volume = ((voice.volume << 1) / 3) >> 0;
          break;
        case 7:
          voice.volume >>= 1;
          break;
        case 8:
          voice.volume = voice.sample.volume;
          break;
        case 9:
          voice.volume++;
          break;
        case 10:
          voice.volume += 2;
          break;
        case 11:
          voice.volume += 4;
          break;
        case 12:
          voice.volume += 8;
          break;
        case 13:
          voice.volume += 16;
          break;
        case 14:
          voice.volume = (voice.volume * 3) >> 1;
          break;
        case 15:
          voice.volume <<= 1;
          break;
      }

      if (voice.volume < 0) {
        voice.volume = 0;
      } else if (voice.volume > 64) {
        voice.volume = 64;
      }

      voice.flags |= UPDATE_VOLUME;
    };
  }

  class F2Data {
    constructor() {
      this.points    = [];
      this.total     = 0;
      this.sustain   = 0;
      this.loopStart = 0;
      this.loopEnd   = 0;
      this.flags     = 0;
    };
  }

  class F2Envelope {
    constructor() {
      this.reset();
    };

    reset() {
      this.value    = 0;
      this.position = 0;
      this.frame    = 0;
      this.delta    = 0;
      this.fraction = 0;
      this.stopped  = 0;
    };
  }

  class F2Instrument {
    constructor() {
      this.name         = "";
      this.samples      = [];
      this.noteSamples  = new Uint8Array(96);
      this.fadeout      = 0;
      this.volData      = new F2Data();
      this.volEnabled   = 0;
      this.panData      = new F2Data();
      this.panEnabled   = 0;
      this.vibratoType  = 0;
      this.vibratoSweep = 0;
      this.vibratoSpeed = 0;
      this.vibratoDepth = 0;
    };
  }

  class F2Pattern {
    constructor(length = 0, channels = 0) {
      this.rows   = [];
      this.length = length;
      this.size   = length * channels;
    };
  }

  class F2Point {
    constructor(x = 0, y = 0) {
      this.frame = x;
      this.value = y;
    };
  }

  class F2Row {
    constructor() {
      this.note   = 0;
      this.instr  = 0;
      this.volume = 0;
      this.effect = 0;
      this.param  = 0;
    };
  }

  class F2Voice {
    constructor(index) {
      this.index          = index;
      this.next           = null;
      this.flags          = 0;
      this.delay          = 0;
      this.channel        = null;
      this.patternLoop    = 0;
      this.patternLoopRow = 0;
      this.playing        = null;
      this.note           = 0;
      this.keyoff         = 0;
      this.period         = 0;
      this.finetune       = 0;
      this.arpDelta       = 0;
      this.vibDelta       = 0;
      this.instrument     = null;
      this.autoVibratoPos = 0;
      this.autoSweep      = 0;
      this.autoSweepPos   = 0;
      this.sample         = null;
      this.sampleOffset   = 0;
      this.volume         = 0;
      this.volEnabled     = 0;
      this.volEnvelope    = new F2Envelope();
      this.volDelta       = 0;
      this.volSlide       = 0;
      this.volSlideMaster = 0;
      this.fineSlideU     = 0;
      this.fineSlideD     = 0;
      this.fadeEnabled    = 0;
      this.fadeDelta      = 0;
      this.fadeVolume     = 0;
      this.panning        = 0;
      this.panEnabled     = 0;
      this.panEnvelope    = new F2Envelope();
      this.panSlide       = 0;
      this.portaU         = 0;
      this.portaD         = 0;
      this.finePortaU     = 0;
      this.finePortaD     = 0;
      this.xtraPortaU     = 0;
      this.xtraPortaD     = 0;
      this.portaPeriod    = 0;
      this.portaSpeed     = 0;
      this.portaSkip      = 0;
      this.glissando      = 0;
      this.glissPeriod    = 0;
      this.vibratoPos     = 0;
      this.vibratoSpeed   = 0;
      this.vibratoDepth   = 0;
      this.vibratoReset   = 0;
      this.tremoloPos     = 0;
      this.tremoloSpeed   = 0;
      this.tremoloDepth   = 0;
      this.waveControl    = 0;
      this.tremorPos      = 0;
      this.tremorOn       = 0;
      this.tremorOff      = 0;
      this.tremorVolume   = 0;
      this.retrigx        = 0;
      this.retrigy        = 0;
    };

    reset() {
      this.volume   = this.sample.volume;
      this.panning  = this.sample.panning;
      this.finetune = (this.sample.finetune >> 3) << 2;
      this.keyoff   = 0;
      this.volDelta = 0;

      this.fadeEnabled = 0;
      this.fadeDelta   = 0;
      this.fadeVolume  = 65536;

      this.autoVibratoPos = 0;
      this.autoSweep      = 1;
      this.autoSweepPos   = 0;
      this.vibDelta       = 0;
      this.vibratoReset   = 0;

      if ((this.waveControl & 15) < 4) { this.vibratoPos = 0; }
      if ((this.waveControl >> 4) < 4) { this.tremoloPos = 0; }
    };

    autoVibrato() {
      var delta = 64;
      var instr = this.playing;

      this.autoVibratoPos = (this.autoVibratoPos + instr.vibratoSpeed) & 255;

      switch (instr.vibratoType) {
        case 0:
          delta = AUTOVIBRATO[this.autoVibratoPos];
          break;
        case 1:
          if (this.autoVibratoPos < 128) { delta = -64; }
          break;
        case 2:
          delta = ((64 + (this.autoVibratoPos >> 1)) & 127) - 64;
          break;
        case 3:
          delta = ((64 - (this.autoVibratoPos >> 1)) & 127) - 64;
          break;
      }

      delta *= instr.vibratoDepth;

      if (this.autoSweep) {
        if (instr.vibratoSweep) {
          if (this.autoSweepPos > instr.vibratoSweep) {
            if (this.autoSweepPos & 2) { delta *= (this.autoSweepPos / instr.vibratoSweep); }
            this.autoSweep = 0;
          } else {
            delta *= (++this.autoSweepPos / instr.vibratoSweep);
          }
        } else {
          this.autoSweep = 0;
        }
      }

      this.flags |= UPDATE_PERIOD;
      return delta >> 6;
    };

    tonePortamento() {
      if (!this.glissPeriod) { this.glissPeriod = this.period; }

      if (this.period < this.portaPeriod) {
        this.glissPeriod += this.portaSpeed << 2;

        if (this.glissando) {
          this.period = Math.round(this.glissPeriod / 64) << 6;
        } else {
          this.period = this.glissPeriod;
        }

        if (this.period >= this.portaPeriod) {
          this.period = this.portaPeriod;
          this.portaPeriod = this.glissPeriod = 0;
        }
      } else if (this.period > this.portaPeriod) {
        this.glissPeriod -= this.portaSpeed << 2;

        if (this.glissando) {
          this.period = Math.round(this.glissPeriod / 64) << 6;
        } else {
          this.period = this.glissPeriod;
        }

        if (this.period <= this.portaPeriod) {
          this.period = this.portaPeriod;
          this.portaPeriod = this.glissPeriod = 0;
        }
      }

      this.flags |= UPDATE_PERIOD;
    };

    tremolo() {
      var delta = 255;
      var position = this.tremoloPos & 31;
      var value = (this.waveControl >> 4) & 3;

      if (!value) {
        delta = VIBRATO[position];
      } else if (value == 1) {
        delta = position << 3;
      }

      this.volDelta = (delta * this.tremoloDepth) >> 6;
      if (this.tremoloPos > 31) { this.volDelta = -this.volDelta; }
      this.tremoloPos = (this.tremoloPos + this.tremoloSpeed) & 63;

      this.flags |= UPDATE_VOLUME;
    };

    tremor() {
      if (this.tremorPos == this.tremorOn) {
        this.tremorVolume = this.volume;
        this.volume = 0;
        this.flags |= UPDATE_VOLUME;
      } else if (this.tremorPos == this.tremorOff) {
        this.tremorPos = 0;
        this.volume = this.tremorVolume;
        this.flags |= UPDATE_VOLUME;
      }

      this.tremorPos++;
    };

    vibrato() {
      var delta = 255;
      var position = this.vibratoPos & 31;
      var value = this.waveControl & 3;

      if (!value) {
        delta = VIBRATO[position];
      } else if (value == 1) {
        delta = position << 3;
        if (this.vibratoPos > 31) { delta = 255 - delta; }
      }

      this.vibDelta = (delta * this.vibratoDepth) >> 7;
      if (this.vibratoPos > 31) { this.vibDelta = -this.vibDelta; }
      this.vibratoPos = (this.vibratoPos + this.vibratoSpeed) & 63;

      this.flags |= UPDATE_PERIOD;
    };
  }

  window.neoart.Trackers.FastTracker2 = function() {
    tracker = new FastTracker2();
    return player;
  }

  class DeltaMusic1 extends Tracker {
    constructor() {
      super(Amiga);

      this.patterns = [];
      this.pointers = new Uint32Array(4);
      this.tracks   = [];

      this.voices[0] = new D1Voice(0);
      this.voices[0].next = this.voices[1] = new D1Voice(1);
      this.voices[1].next = this.voices[2] = new D1Voice(2);
      this.voices[2].next = this.voices[3] = new D1Voice(3);

      ID.push("Delta Music 1.0");

      periods("delta", 1);
      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.complete = 0;
      this.speed = 6;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[20];
        this.complete += (1 << voice.index);
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var data = new Uint32Array(25);
      var j = 0;
      var i, index, len, row, sample, step, value;

      if (stream.readUTF8(4) != "ALL ") { return; }

      for (i = 0; i < 25; i++) {
        data[i] = stream.uint;
      }

      for (i = 1; i < 4; i++) {
        this.pointers[i] = this.pointers[j] + (data[j++] >> 1) - 1;
      }

      len = this.pointers[3] + (data[3] >> 1) - 1;
      this.tracks.length = len;
      index = 104 + data[1] - 2;
      stream.position = 104;
      j = 1;

      for (i = 0; i < len; i++) {
        step = new Step();
        value = stream.ushort;

        if (value == 0xffff || stream.position == index) {
          step.pattern = -1;
          step.transpose = stream.ushort;
          index += data[j++];
        } else {
          stream.position--;
          step.pattern = ((value >> 2) & 0x3fc0) >> 2;
          step.transpose = stream.byte;
        }

        this.tracks[i] = step;
      }

      len = data[4] >> 2;
      this.patterns.length = len;

      for (i = 0; i < len; i++) {
        row = new Row();
        row.sample = stream.ubyte;
        row.note   = stream.ubyte;
        row.effect = stream.ubyte & 31;
        row.param  = stream.ubyte;
        this.patterns[i] = row;
      }

      index = 5;

      for (i = 0; i < 20; i++) {
        if (data[index]) {
          sample = new D1Sample();
          sample.attackStep   = stream.ubyte;
          sample.attackDelay  = stream.ubyte;
          sample.decayStep    = stream.ubyte;
          sample.decayDelay   = stream.ubyte;
          sample.sustain      = stream.ushort;
          sample.releaseStep  = stream.ubyte;
          sample.releaseDelay = stream.ubyte;
          sample.volume       = stream.ubyte;
          sample.vibratoWait  = stream.ubyte;
          sample.vibratoStep  = stream.ubyte;
          sample.vibratoLen   = stream.ubyte;
          sample.pitchBend    = stream.byte;
          sample.portamento   = stream.ubyte;
          sample.synth        = stream.ubyte;
          sample.tableDelay   = stream.ubyte;

          sample.arpeggio = new Int8Array(stream.buffer, stream.position, 8);
          stream.position += 8;

          sample.length = stream.ushort;
          sample.loop   = stream.ushort;
          sample.repeat = stream.ushort << 1;
          sample.synth  = (sample.synth) ? 0 : 1;

          if (sample.synth) {
            sample.table = new Int8Array(stream.buffer, stream.position, 48);
            stream.position += 48;
            len = data[index] - 78;
          } else {
            len = sample.length;
          }

          sample.pointer = stream.position;
          stream.position += len;

          sample.loopPtr = sample.pointer + sample.loop;
          this.samples[i] = sample;
        } else {
          this.samples[i] = null;
        }

        index++;
      }

      sample = new D1Sample();
      sample.table = new Int8Array(48);
      sample.arpeggio = sample.table;
      this.samples[20] = sample;

      stream.fill(0, 0, mixer.loopLen);
      version = 1;
    };

    process() {
      var voice = this.voices[0];
      var adsr, chan, loop, row, sample, value;

      do {
        chan = voice.channel;

        if (--voice.speed == 0) {
          voice.speed = this.speed;

          if (voice.patternPos == 0) {
            voice.step = this.tracks[this.pointers[voice.index] + voice.trackPos];

            if (voice.step.pattern < 0) {
              this.complete &= ~(1 << voice.index);
              if (!this.complete) { mixer.complete = 1; }

              voice.trackPos = voice.step.transpose;
              voice.step = this.tracks[this.pointers[voice.index] + voice.trackPos];
            }

            voice.trackPos++;
          }

          row = this.patterns[voice.step.pattern + voice.patternPos];
          if (row.effect) { voice.row = row; }

          if (row.note) {
            chan.enabled = 0;
            voice.row = row;
            voice.note = row.note + voice.step.transpose;
            voice.arpeggioPos = 0;
            voice.pitchBend = 0;
            voice.status = 0;

            sample = voice.sample = this.samples[row.sample];
            if (!sample.synth) { chan.pointer = sample.pointer; }
            chan.length = sample.length;

            voice.tableCtr   = voice.tablePos = 0;
            voice.vibratoCtr = sample.vibratoWait;
            voice.vibratoPos = sample.vibratoLen;
            voice.vibratoDir = sample.vibratoLen << 1;
            voice.volume     = 0;
            voice.attackCtr  = 0;
            voice.decayCtr   = 0;
            voice.releaseCtr = 0;
            voice.sustain    = sample.sustain;

            cache[writePos].notes[voice.index] = voice.note;
          }

          if (++voice.patternPos == 16) { voice.patternPos = 0; }
        }

        sample = voice.sample;

        if (sample.synth) {
          if (voice.tableCtr) {
            voice.tableCtr--;
          } else {
            voice.tableCtr = sample.tableDelay;
            loop = 1;

            do {
              if (voice.tablePos >= 48) { voice.tablePos = 0; }
              value = sample.table[voice.tablePos++];

              if (value >= 0) {
                chan.pointer = sample.pointer + (value << 5);
                loop = 0;
              } else if (value != -1) {
                sample.tableDelay = value & 127;
              } else {
                voice.tablePos = sample.table[voice.tablePos];
              }
            } while (loop);
          }
        }

        if (sample.portamento) {
          value = PERIODS[voice.note] + voice.pitchBend;

          if (voice.period) {
            if (voice.period < value) {
              voice.period += sample.portamento;
              if (voice.period > value) { voice.period = value; }
            } else {
              voice.period -= sample.portamento;
              if (voice.period < value) { voice.period = value; }
            }
          } else {
            voice.period = value;
          }
        }

        if (voice.vibratoCtr) {
          voice.vibratoCtr--;
        } else {
          voice.vibratoPeriod = voice.vibratoPos * sample.vibratoStep;

          if ((voice.status & 1) == 0) {
            voice.vibratoPos++;
            if (voice.vibratoPos == voice.vibratoDir) { voice.status ^= 1; }
          } else {
            voice.vibratoPos--;
            if (voice.vibratoPos == 0) { voice.status ^= 1; }
          }
        }

        if (sample.pitchBend < 0) {
          voice.pitchBend += sample.pitchBend;
        } else {
          voice.pitchBend -= sample.pitchBend;
        }

        if (voice.row) {
          row = voice.row;

          switch (row.effect) {
            case 0:
              break;
            case 1:
              value = row.param & 15;
              if (value) { this.speed = value; }
              break;
            case 2:
              voice.pitchBend -= row.param;
              break;
            case 3:
              voice.pitchBend += row.param;
              break;
            case 4:
              mixer.filter = row.param;
              break;
            case 5:
              sample.vibratoWait = row.param;
              break;
            case 6:
              sample.vibratoStep = row.param;
              break;
            case 7:
              sample.vibratoLen = row.param;
              break;
            case 8:
              sample.pitchBend = row.param;
              break;
            case 9:
              sample.portamento = row.param;
              break;
            case 10:
              value = row.param;
              if (value > 64) { value = 64; }
              sample.volume = value;
              break;
            case 11:
              sample.arpeggio[0] = row.param;
              break;
            case 12:
              sample.arpeggio[1] = row.param;
              break;
            case 13:
              sample.arpeggio[2] = row.param;
              break;
            case 14:
              sample.arpeggio[3] = row.param;
              break;
            case 15:
              sample.arpeggio[4] = row.param;
              break;
            case 16:
              sample.arpeggio[5] = row.param;
              break;
            case 17:
              sample.arpeggio[6] = row.param;
              break;
            case 18:
              sample.arpeggio[7] = row.param;
              break;
            case 19:
              sample.arpeggio[0] = sample.arpeggio[4] = row.param;
              break;
            case 20:
              sample.arpeggio[1] = sample.arpeggio[5] = row.param;
              break;
            case 21:
              sample.arpeggio[2] = sample.arpeggio[6] = row.param;
              break;
            case 22:
              sample.arpeggio[3] = sample.arpeggio[7] = row.param;
              break;
            case 23:
              value = row.param;
              if (value > 64) { value = 64; }
              sample.attackStep = value;
              break;
            case 24:
              sample.attackDelay = row.param;
              break;
            case 25:
              value = row.param;
              if (value > 64) { value = 64; }
              sample.decayStep = value;
              break;
            case 26:
              sample.decayDelay = row.param;
              break;
            case 27:
              sample.sustain = row.param & (sample.sustain & 255);
              break;
            case 28:
              sample.sustain = (sample.sustain & 0xff00) + row.param;
              break;
            case 29:
              value = row.param;
              if (value > 64) { value = 64; }
              sample.releaseStep = value;
              break;
            case 30:
              sample.releaseDelay = row.param;
              break;
          }
        }

        if (sample.portamento) {
          value = voice.period;
        } else {
          value = PERIODS[voice.note + sample.arpeggio[voice.arpeggioPos]];
          voice.arpeggioPos = (++voice.arpeggioPos & 7);
          value -= (sample.vibratoLen * sample.vibratoStep);
          value += voice.pitchBend;
          voice.period = 0;
        }

        chan.period = value + voice.vibratoPeriod;
        adsr = voice.status & 14;
        value = voice.volume;

        if (adsr == 0) {
          if (voice.attackCtr == 0) {
            voice.attackCtr = sample.attackDelay;
            value += sample.attackStep;

            if (value >= 64) {
              adsr |= 2;
              voice.status |= 2;
              value = 64;
            }
          } else {
            voice.attackCtr--;
          }
        }

        if (adsr == 2) {
          if (voice.decayCtr == 0) {
            voice.decayCtr = sample.decayDelay;
            value -= sample.decayStep;

            if (value <= sample.volume) {
              adsr |= 6;
              voice.status |= 6;
              value = sample.volume;
            }
          } else {
            voice.decayCtr--;
          }
        }

        if (adsr == 6) {
          if (voice.sustain == 0) {
            adsr |= 14;
            voice.status |= 14;
          } else {
            voice.sustain--;
          }
        }

        if (adsr == 14) {
          if (voice.releaseCtr == 0) {
            voice.releaseCtr = sample.releaseDelay;
            value -= sample.releaseStep;

            if (value < 0) {
              voice.status &= 9;
              value = 0;
            }
          } else {
            voice.releaseCtr--;
          }
        }

        chan.volume = voice.volume = value;
        chan.enabled = 1;

        if (!sample.synth) {
          if (sample.loop) {
            chan.pointer = sample.loopPtr;
            chan.length = sample.repeat;
          } else {
            chan.pointer = 0;
            chan.length = 4;
          }
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class D1Sample extends Sample {
    constructor() {
      super();

      this.loop         = 0;
      this.synth        = 0;
      this.attackStep   = 0;
      this.attackDelay  = 0;
      this.decayStep    = 0;
      this.decayDelay   = 0;
      this.releaseStep  = 0;
      this.releaseDelay = 0;
      this.sustain      = 0;
      this.arpeggio     = null;
      this.pitchBend    = 0;
      this.portamento   = 0;
      this.table        = null;
      this.tableDelay   = 0;
      this.vibratoWait  = 0;
      this.vibratoStep  = 0;
      this.vibratoLen   = 0;
    };
  }

  class D1Voice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel       = null;
      this.sample        = null;
      this.trackPos      = 0;
      this.patternPos    = 0;
      this.status        = 0;
      this.speed         = 1;
      this.step          = null;
      this.row           = null;
      this.note          = 0;
      this.period        = 0;
      this.arpeggioPos   = 0;
      this.pitchBend     = 0;
      this.tableCtr      = 0;
      this.tablePos      = 0;
      this.vibratoCtr    = 0;
      this.vibratoDir    = 0;
      this.vibratoPos    = 0;
      this.vibratoPeriod = 0;
      this.volume        = 0;
      this.attackCtr     = 0;
      this.decayCtr      = 0;
      this.releaseCtr    = 0;
      this.sustain       = 1;
    };
  }

  window.neoart.Trackers.DeltaMusic1 = function() {
    tracker = new DeltaMusic1();
    return player;
  }

  class DeltaMusic2 extends Tracker {
    constructor() {
      super(Amiga);

      this.arpeggios = null;
      this.data      = new Uint16Array(12);
      this.noise     = 0;
      this.patterns  = [];
      this.synthPtr  = 0;
      this.tracks    = [];

      this.voices[0] = new D2Voice(0);
      this.voices[0].next = this.voices[1] = new D2Voice(1);
      this.voices[1].next = this.voices[2] = new D2Voice(2);
      this.voices[2].next = this.voices[3] = new D2Voice(3);

      ID.push("Delta Music 2.0");

      periods("delta");
      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.complete = 0;
      this.noise = 0;
      this.speed = 6;
      this.tick  = 1;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[this.samples.length - 1];

        voice.trackPtr = this.data[voice.index];
        voice.restart  = this.data[voice.index + 4];
        voice.trackLen = this.data[voice.index + 8];

        if (voice.trackLen) {
          this.complete += (1 << voice.index);
        }
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var len = 0;
      var dataPtr, i, offset1, offset2, pos, row, sample, step, value;

      if (stream.length < 3018) { return; }

      stream.position = 3014;
      if (stream.readUTF8(4) != ".FNL") { return; }

      this.arpeggios = new Int8Array(stream.buffer, 3018, 1024);
      stream.position = 4042;

      for (i = 0; i < 4; i++) {
        this.data[i] = len;
        this.data[i + 4] = stream.ushort >> 1;
        value = stream.ushort >> 1;
        this.data[i + 8] = value;
        len += value;
      }

      this.tracks.length = len;

      for (i = 0; i < len; i++) {
        step = new Step();
        step.pattern = stream.ubyte << 4;
        step.transpose = stream.byte;
        this.tracks[i] = step;
      }

      len = stream.uint >> 2;
      this.patterns.length = len;

      for (i = 0; i < len; i++) {
        row = new Row();
        row.note   = stream.ubyte;
        row.sample = stream.ubyte;
        row.effect = stream.ubyte - 1;
        row.param  = stream.ubyte;
        this.patterns[i] = row;
      }

      offset1 = new Uint16Array(128);
      stream.position += 254;
      value = stream.ushort;
      pos = stream.position;
      stream.position -= 256;

      len = 1;

      for (i = 0; i < 128; i++) {
        dataPtr = stream.ushort;
        if (dataPtr == value) { break; }
        offset1[len++] = dataPtr;
      }

      stream.position = pos + value;
      offset2 = stream.uint;
      this.synthPtr = stream.position;

      offset2 += stream.position + 64;
      dataPtr = offset2 + 32;

      this.samples.length = len;

      for (i = 0; i < len; i++) {
        stream.position = pos + offset1[i];

        sample = new D2Sample();
        sample.length  = stream.ushort << 1;
        sample.loopPtr = stream.ushort;
        sample.repeat  = stream.ushort << 1;

        sample.volumes = new Uint8Array(stream.buffer, stream.position, 15);
        stream.position += 15;

        sample.vibratos = new Uint8Array(stream.buffer, stream.position, 15);
        stream.position += 15;

        sample.pitchBend = stream.ushort;
        sample.synth = stream.byte;
        sample.index = stream.ubyte;

        sample.table = new Uint8Array(stream.buffer, stream.position, 48);
        stream.position += 48;

        if (sample.synth < 0) {
          stream.position = offset2 + (sample.index << 2);
          sample.pointer  = dataPtr + stream.uint;
          sample.loopPtr += sample.pointer;
        }

        this.samples[i] = sample;
      }

      pos = this.patterns.length;

      for (i = 0; i < pos; i++) {
        if (this.patterns[i].sample >= len) {
          this.patterns[i].sample = len;
        }
      }

      sample = new D2Sample();
      sample.table = new Uint8Array(48);
      sample.vibratos = sample.table;
      sample.volumes  = sample.table;
      this.samples[len] = sample;

      stream.fill(0, 0, mixer.loopLen);
      version = 1;
    };

    process() {
      var voice = this.voices[0];
      var chan, i, level, row, sample, value;

      mixer.buffer.position = this.synthPtr;

      for (i = 0; i < 16; i++) {
        this.noise = (this.noise << 7) | (this.noise >>> 25);
        this.noise += 0x6eca756d;
        this.noise ^= 0x9e59a92b;
        mixer.buffer.int = this.noise;
      }

      if (--this.tick < 0) { this.tick = this.speed; }

      do {
        if (voice.trackLen < 1) { continue; }

        chan = voice.channel;
        sample = voice.sample;

        if (sample.synth) {
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
        }

        if (!this.tick) {
          if (!voice.patternPos) {
            voice.step = this.tracks[voice.trackPtr + voice.trackPos];

            if (++voice.trackPos == voice.trackLen) {
              voice.trackPos = voice.restart;

              this.complete &= ~(1 << voice.index);
              if (!this.complete) { mixer.complete = 1; }
            }
          }

          row = voice.row = this.patterns[voice.step.pattern + voice.patternPos];

          if (row.note) {
            chan.enabled = 0;
            voice.note = row.note;
            voice.period = PERIODS[row.note + voice.step.transpose];
            sample = voice.sample = this.samples[row.sample];

            if (sample.synth < 0) {
              chan.pointer = sample.pointer;
              chan.length = sample.length;
            }

            voice.arpeggioPos    = 0;
            voice.tableCtr       = 0;
            voice.tablePos       = 0;
            voice.vibratoCtr     = sample.vibratos[1];
            voice.vibratoPos     = 0;
            voice.vibratoDir     = 0;
            voice.vibratoPeriod  = 0;
            voice.vibratoSustain = sample.vibratos[2];
            voice.volume         = 0;
            voice.volumePos      = 0;
            voice.volumeSustain  = 0;

            cache[writePos].notes[voice.index] = row.note;
          }

          switch (row.effect) {
            case -1:
              break;
            case 0:
              this.speed = row.param & 15;
              break;
            case 1:
              mixer.filter = row.param;
              break;
            case 2:
              voice.pitchBend = ~(row.param & 255) + 1;
              break;
            case 3:
              voice.pitchBend = row.param & 255;
              break;
            case 4:
              voice.portamento = row.param;
              break;
            case 5:
              voice.volumeMax = row.param & 63;
              break;
            case 6:
              mixer.volume = row.param;
              break;
            case 7:
              voice.arpeggioPtr = (row.param & 63) << 4;
              break;
          }

          voice.patternPos = (++voice.patternPos & 15);
        }

        if (sample.synth >= 0) {
          if (voice.tableCtr) {
            voice.tableCtr--;
          } else {
            voice.tableCtr = sample.index;
            value = sample.table[voice.tablePos];

            if (value == 0xff) {
              value = sample.table[++voice.tablePos];

              if (value != 0xff) {
                voice.tablePos = value;
                value = sample.table[voice.tablePos];
              }
            }

            if (value != 0xff) {
              chan.pointer = this.synthPtr + (value << 8);
              chan.length = sample.length;
              if (++voice.tablePos > 47) { voice.tablePos = 0; }
            }
          }
        }

        value = sample.vibratos[voice.vibratoPos];

        if (voice.vibratoDir) {
          voice.vibratoPeriod -= value;
        } else {
          voice.vibratoPeriod += value;
        }

        if (--voice.vibratoCtr == 0) {
          voice.vibratoCtr = sample.vibratos[voice.vibratoPos + 1];
          voice.vibratoDir = ~voice.vibratoDir;
        }

        if (voice.vibratoSustain) {
          voice.vibratoSustain--;
        } else {
          voice.vibratoPos += 3;
          if (voice.vibratoPos == 15) { voice.vibratoPos = 12; }
          voice.vibratoSustain = sample.vibratos[voice.vibratoPos + 2];
        }

        if (voice.volumeSustain) {
          voice.volumeSustain--;
        } else {
          value = sample.volumes[voice.volumePos];
          level = sample.volumes[voice.volumePos + 1];

          if (level < voice.volume) {
            voice.volume -= value;

            if (voice.volume < level) {
              voice.volume = level;
              voice.volumePos += 3;
              voice.volumeSustain = sample.volumes[voice.volumePos - 1];
            }
          } else {
            voice.volume += value;

            if (voice.volume > level) {
              voice.volume = level;
              voice.volumePos += 3;
              if (voice.volumePos == 15) { voice.volumePos = 12; }
              voice.volumeSustain = sample.volumes[voice.volumePos - 1];
            }
          }
        }

        if (voice.portamento) {
          if (voice.period < voice.finalPeriod) {
            voice.finalPeriod -= voice.portamento;

            if (voice.finalPeriod < voice.period) {
              voice.finalPeriod = voice.period;
            }
          } else {
            voice.finalPeriod += voice.portamento;

            if (voice.finalPeriod > voice.period) {
              voice.finalPeriod = voice.period;
            }
          }
        }

        value = this.arpeggios[voice.arpeggioPtr + voice.arpeggioPos];

        if (value == -128) {
          voice.arpeggioPos = 0;
          value = this.arpeggios[voice.arpeggioPtr];
        }

        voice.arpeggioPos = (++voice.arpeggioPos & 15);

        if (!voice.portamento) {
          value = voice.note + voice.step.transpose + value;
          if (value < 0 || value >= PERIODS.length) { value = 0; }
          voice.finalPeriod = PERIODS[value];
        }

        voice.vibratoPeriod -= (sample.pitchBend - voice.pitchBend);
        chan.period = voice.finalPeriod + voice.vibratoPeriod;

        value = (voice.volume >> 2) & 63;
        if (value > voice.volumeMax) { value = voice.volumeMax; }
        chan.volume = value;

        chan.enabled = 1;
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class D2Sample extends Sample {
    constructor() {
      super();

      this.index     = 0;
      this.pitchBend = 0;
      this.synth     = 0;
      this.table     = null;
      this.vibratos  = null;
      this.volumes   = null;
    };
  }

  class D2Voice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel        = null;
      this.sample         = null;
      this.trackPtr       = 0;
      this.trackPos       = 0;
      this.trackLen       = 0;
      this.patternPos     = 0;
      this.restart        = 0;
      this.step           = null;
      this.row            = null;
      this.note           = 0;
      this.period         = 0;
      this.finalPeriod    = 0;
      this.arpeggioPtr    = 0;
      this.arpeggioPos    = 0;
      this.pitchBend      = 0;
      this.portamento     = 0;
      this.tableCtr       = 0;
      this.tablePos       = 0;
      this.vibratoCtr     = 0;
      this.vibratoDir     = 0;
      this.vibratoPos     = 0;
      this.vibratoPeriod  = 0;
      this.vibratoSustain = 0;
      this.volume         = 0;
      this.volumeMax      = 63;
      this.volumePos      = 0;
      this.volumeSustain  = 0;
    };
  }

  window.neoart.Trackers.DeltaMusic2 = function() {
    tracker = new DeltaMusic2();
    return player;
  }

  const FUTURECOMP10 = 1;
  const FUTURECOMP14 = 2;

  const WAVES = new Int8Array([
      16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,
      16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,  16,
       8,   8,   8,   8,   8,   8,   8,   8,  16,   8,  16,  16,   8,   8,  24, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56,  63,
      55,  47,  39,  31,  23,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
      55,  47,  39,  31,  23,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72,  47,  39,  31,  23,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80,  39,  31,  23,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88,  31,  23,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,  23,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,  15,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,   7,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,  -1,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,   7,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,-120,  15,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,-120,-112,  23,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,-120,-112,-104,  31,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,-120,-112,-104, -96,  39,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,-120,-112,-104, -96, -88,  47,  55, -64,
     -64, -48, -40, -32, -24, -16,  -8,   0,  -8, -16, -24, -32, -40, -48, -56, -64,
     -72, -80, -88, -96,-104,-112,-120,-128,-120,-112,-104, -96, -88, -80,  55,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127, 127,
     127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
     127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127,-127, 127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127, 127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127, 127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127, 127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127, 127, 127, 127, 127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,
    -127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127,-127, 127, 127, 127,-128,
    -128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,
    -128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128, 127, 127,-128,
    -128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,
    -128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128,-128, 127,-128,
    -128,-128,-128,-128,-128,-128,-128, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128,-128,-128,-128,-128,-128, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128,-128,-128,-128,-128, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128,-128,-128,-128, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128,-128,-128, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128,-128, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127, 127,-128,
    -128,-112,-104, -96, -88, -80, -72, -64, -56, -48, -40, -32, -24, -16,  -8,   0,
       8,  16,  24,  32,  40,  48,  56,  64,  72,  80,  88,  96, 104, 112, 127,-128,
    -128, -96, -80, -64, -48, -32, -16,   0,  16,  32,  48,  64,  80,  96, 112,  69,
      69, 121, 125, 122, 119, 112, 102,  97,  88,  83,  77,  44,  32,  24,  18,   4,
     -37, -45, -51, -58, -68, -75, -82, -88, -93, -99,-103,-109,-114,-117,-118,  69,
      69, 121, 125, 122, 119, 112, 102,  91,  75,  67,  55,  44,  32,  24,  18,   4,
      -8, -24, -37, -49, -58, -66, -80, -88, -92, -98,-102,-107,-108,-115,-125,   0,
       0,  64,  96, 127,  96,  64,  32,   0, -32, -64, -96,-128, -96, -64, -32,   0,
       0,  64,  96, 127,  96,  64,  32,   0, -32, -64, -96,-128, -96, -64, -32,-128,
    -128,-112,-104, -96, -88, -80, -72, -64, -56, -48, -40, -32, -24, -16,  -8,   0,
       8,  16,  24,  32,  40,  48,  56,  64,  72,  80,  88,  96, 104, 112, 127,-128,
    -128, -96, -80, -64, -48, -32, -16,   0,  16,  32,  48,  64,  80,  96, 112
  ]);

  class FutureComposer extends Tracker {
    constructor() {
      super(Amiga);

      this.freqs = null;
      this.pats = null;
      this.seqs = null;
      this.vols = null;

      this.voices[0] = new FCVoice(0);
      this.voices[0].next = this.voices[1] = new FCVoice(1);
      this.voices[1].next = this.voices[2] = new FCVoice(2);
      this.voices[2].next = this.voices[3] = new FCVoice(3);

      ID.push("Future Composer 1.0/1.3", "Future Composer 1.4");

      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.freqs.position = 0;
      this.pats.position = 0;
      this.seqs.position = 0;
      this.vols.position = 0;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.pattern = this.seqs.ubyte << 6;
        voice.transpose = this.seqs.byte;
        voice.soundtran = this.seqs.byte;
      } while (voice = voice.next);

      this.speed = this.seqs.ubyte;
      if (!this.speed) { this.speed = 3; }
      this.tick = this.speed;
    };

    parse(stream) {
      var id = stream.readUTF8(4);
      var total = 0;
      var i, j, len, offset, pos, sample, size, temp;

      if (id == "SMOD") {
        periods("futcomp");
        version = FUTURECOMP10;
      } else if (id == "FC14") {
        periods("futcomp", 14);
        version = FUTURECOMP14;
      } else {
        return;
      }

      song.length = stream.uint;
      pos = (version == FUTURECOMP10) ? 100 : 180;
      this.seqs = new ByteArray(stream.buffer, this.endian, pos, song.length);
      song.length = (song.length / 13) >> 0;

      stream.position = 12;
      len = stream.uint;
      stream.position = 8;
      stream.position = stream.uint;

      this.pats = new ByteArray(len + 1);
      stream.readBytes(this.pats, 0, len);
      this.pats.position = len;
      this.pats.byte = 0;

      stream.position = 20;
      len = stream.uint;
      stream.position = 16;
      stream.position = stream.uint;

      this.freqs = new ByteArray(len + 9);
      this.freqs.int = 0x01000000;
      this.freqs.int = 0x000000e1;
      stream.readBytes(this.freqs, 8, len);
      this.freqs.position = this.freqs.length - 1;
      this.freqs.byte = 0xe1;

      stream.position = 28;
      len = stream.uint;
      stream.position = 24;
      stream.position = stream.uint;

      this.vols = new ByteArray(len + 8);
      this.vols.int = 0x01000000;
      this.vols.int = 0x000000e1;
      stream.readBytes(this.vols, 8, len);

      stream.position = 32;
      size = stream.uint;
      stream.position = 40;

      if (version == FUTURECOMP10) {
        offset = 0;
        this.samples.length = 57;
      } else {
        offset = 2;
        this.samples.length = 200;
      }

      for (i = 0; i < 10; i++) {
        len = stream.ushort << 1;

        if (len) {
          pos = stream.position;
          stream.position = size;

          if (stream.bytesAvailable < 4) {
            id = "";
          } else {
            id = stream.readUTF8(4);
          }

          if (id == "SSMP") {
            temp = len;

            for (j = 0; j < 10; j++) {
              stream.position += 4;
              len = stream.ushort << 1;

              if (len) {
                sample = new Sample();
                sample.length  = len + 2;
                sample.loopPtr = stream.ushort;
                sample.repeat  = stream.ushort << 1;

                if ((sample.loopPtr + sample.repeat) > sample.length) {
                  sample.repeat = sample.length - sample.loopPtr;
                }

                if ((sample.length + size) > stream.length) {
                  sample.length = stream.length - size;
                }

                sample.pointer = size + total;
                sample.loopPtr += sample.pointer;
                this.samples[100 + (i * 10) + j] = sample;

                total += sample.length;
                stream.position += 6;
              } else {
                stream.position += 10;
              }
            }

            size += (temp + 2);
            stream.position = pos + 4;
          } else {
            stream.position = pos;

            sample = new Sample();
            sample.length  = len + offset;
            sample.loopPtr = stream.ushort;
            sample.repeat  = stream.ushort << 1;

            if ((sample.loopPtr + sample.repeat) > sample.length) {
              sample.repeat = sample.length - sample.loopPtr;
            }

            if ((sample.length + size) > stream.length) {
              sample.length = stream.length - size;
            }

            sample.pointer = size;
            sample.loopPtr += sample.pointer;
            this.samples[i] = sample;
            size += sample.length;
          }
        } else {
          stream.position += 4;
        }
      }

      if (version == FUTURECOMP10) {
        offset = 0;
        pos = stream.length;

        for (i = 10; i < 57; i++) {
          sample = new Sample();
          sample.length = sample.repeat = WAVES[offset++] << 1;
          sample.pointer = sample.loopPtr = pos;

          this.samples[i] = sample;
          pos += sample.length;
        }

        pos = stream.length;
        len = WAVES.length - 47;

        stream = stream.extend(len);
        stream.position = pos;
        stream.writeBytes(WAVES, 47, len);
      } else {
        stream.position = 36;
        size = stream.uint;
        stream.position = 100;

        for (i = 10; i < 90; i++) {
          len = stream.ubyte << 1;
          if (len < 2) { continue; }

          sample = new Sample();
          sample.length = sample.repeat = len;

          if ((len + size) > stream.length) {
            sample.length = stream.length - size;
          }

          sample.pointer = sample.loopPtr = size;
          this.samples[i] = sample;
          size += sample.length;
        }
      }

      song.length *= 13;
      return stream;
    };

    process() {
      var voice = this.voices[0];
      var base, chan, delta, info, loopFx, loopSustain, period, sample, temp;

      if (--this.tick == 0) {
        base = this.seqs.position;

        do {
          this.pats.position = voice.pattern + voice.patStep;
          temp = this.pats.ubyte;

          if (voice.patStep >= 64 || temp == 0x49) {
            if (this.seqs.position == song.length) {
              this.seqs.position = 0;
              mixer.complete = 1;
            }

            voice.patStep = 0;
            voice.pattern = this.seqs.ubyte << 6;
            voice.transpose = this.seqs.byte;
            voice.soundtran = this.seqs.byte;

            if (voice.pattern >= this.pats.length) { voice.pattern = 0; }
            this.pats.position = voice.pattern;
            temp = this.pats.ubyte;
          }

          info = this.pats.ubyte;
          this.freqs.position = 0;
          this.vols.position = 0;

          if (temp) {
            voice.note = temp & 0x7f;
            voice.pitch = 0;
            voice.portamento = 0;
            voice.enabled = 0;
            voice.channel.enabled = 0;

            temp = 8 + (((info & 0x3f) + voice.soundtran) << 6);
            if (temp >= 0 && temp < this.vols.length) { this.vols.position = temp; }

            voice.volStep = 0;
            voice.volSpeed = voice.volCtr = this.vols.ubyte;
            voice.volSustain = 0;

            voice.freqPos = 8 + (this.vols.ubyte << 6);
            voice.freqStep = 0;
            voice.freqSustain = 0;

            voice.vibFlag = 0;
            voice.vibSpeed = this.vols.ubyte;
            voice.vibDepth = voice.vibrato = this.vols.ubyte;
            voice.vibDelay = this.vols.ubyte;

            voice.volPos = this.vols.position;

            cache[writePos].notes[voice.index] = voice.note;
          }

          if (info & 0x40) {
            voice.portamento = 0;
          } else if (info & 0x80) {
            voice.portamento = this.pats.readAt(this.pats.position + 1);

            if (version == FUTURECOMP10) {
              voice.portamento <<= 1;
            }
          }

          voice.patStep += 2;
        } while (voice = voice.next);

        if (this.seqs.position != base) {
          temp = this.seqs.ubyte;
          if (temp) { this.speed = temp; }
        }

        this.tick = this.speed;
        voice = this.voices[0];
      }

      do {
        chan = voice.channel;

        do {
          loopSustain = 0;

          if (voice.freqSustain) {
            voice.freqSustain--;
            break;
          }

          this.freqs.position = voice.freqPos + voice.freqStep;

          do {
            loopFx = 0;
            if (!this.freqs.bytesAvailable) { break; }

            info = this.freqs.ubyte;
            if (info == 0xe1) { break; }

            if (info == 0xe0) {
              voice.freqStep = this.freqs.ubyte & 0x3f;
              this.freqs.position = voice.freqPos + voice.freqStep;
              info = this.freqs.ubyte;
            }

            switch (info) {
              case 0xe2:  // set wave
                chan.enabled  = 0;
                voice.enabled = 1;
                voice.volCtr  = 1;
                voice.volStep = 0;
              case 0xe4:  // change wave
                sample = this.samples[this.freqs.ubyte];

                if (sample) {
                  chan.pointer = sample.pointer;
                  chan.length = sample.length;
                } else {
                  voice.enabled = 0;
                }

                voice.sample = sample;
                voice.freqStep += 2;
                break;
              case 0xe9:  // set pack
                temp = 100 + (this.freqs.ubyte * 10);
                sample = this.samples[temp + this.freqs.ubyte];

                if (sample) {
                  chan.enabled = 0;
                  chan.pointer = sample.pointer;
                  chan.length = sample.length;
                  voice.enabled = 1;
                }

                voice.sample = sample;
                voice.volCtr = 1;
                voice.volStep = 0;
                voice.freqStep += 3;
                break;
              case 0xe7:  // new sequence
                loopFx = 1;
                voice.freqPos = 8 + (this.freqs.ubyte << 6);
                if (voice.freqPos >= this.freqs.length) { voice.freqPos = 0; }

                voice.freqStep = 0;
                this.freqs.position = voice.freqPos;
                break;
              case 0xea:  // pitch bend
                voice.pitchSpeed = this.freqs.byte;
                voice.pitchTime = this.freqs.ubyte;
                voice.freqStep += 3;
                break;
              case 0xe8:  // sustain
                loopSustain = 1;
                voice.freqSustain = this.freqs.ubyte;
                voice.freqStep += 2;
                break;
              case 0xe3:  // new vibrato
                voice.vibSpeed = this.freqs.ubyte;
                voice.vibDepth = this.freqs.ubyte;
                voice.freqStep += 3;
                break;
            }

            if (!loopSustain && !loopFx) {
              this.freqs.position = voice.freqPos + voice.freqStep;
              voice.freqTrans = this.freqs.byte;
              voice.freqStep++;
            }
          } while (loopFx);
        } while (loopSustain);

        if (voice.volSustain) {
          voice.volSustain--;
        } else if (voice.slideTime) {
          voice.volumeSlide();
        } else if (--voice.volCtr == 0) {
          voice.volCtr = voice.volSpeed;

          do {
            loopFx = 0;
            this.vols.position = voice.volPos + voice.volStep;
            if (!this.vols.bytesAvailable) { break; }

            info = this.vols.ubyte;
            if (info == 0xe1) { break; }

            switch (info) {
              case 0xea:  // volume slide
                voice.slideSpeed = this.vols.byte;
                voice.slideTime = this.vols.ubyte;
                voice.volStep += 3;
                voice.volumeSlide();
                break;
              case 0xe8:  // volume sustain
                voice.volSustain = this.vols.ubyte;
                voice.volStep += 2;
                break;
              case 0xe0:  // volume loop
                loopFx = 1;
                voice.volStep = (this.vols.ubyte & 0x3f) - 5;
                break;
              default:
                voice.volume = info;
                voice.volStep++;
                break;
            }
          } while (loopFx);
        }

        info = voice.freqTrans;
        if (info >= 0) { info += (voice.note + voice.transpose); }
        period = PERIODS[info & 0x7f];

        if (voice.vibDelay) {
          voice.vibDelay--;
        } else {
          temp = voice.vibrato;

          if (voice.vibFlag) {
            delta = voice.vibDepth << 1;
            temp += voice.vibSpeed;

            if (temp > delta) {
              temp = delta;
              voice.vibFlag = 0;
            }
          } else {
            temp -= voice.vibSpeed;

            if (temp < 0) {
              temp = 0;
              voice.vibFlag = 1;
            }
          }

          voice.vibrato = temp;
          temp -= voice.vibDepth;
          base = (info << 1) + 160;

          while (base < 256) {
            temp <<= 1;
            base += 24;
          }

          period += temp;
        }

        voice.portaFlag ^= 1;

        if (voice.portaFlag && voice.portamento) {
          if (voice.portamento > 0x1f) {
            voice.pitch += voice.portamento & 0x1f;
          } else {
            voice.pitch -= voice.portamento;
          }
        }

        voice.pitchFlag ^= 1;

        if (voice.pitchFlag && voice.pitchTime) {
          voice.pitchTime--;
          voice.pitch -= voice.pitchSpeed;
        }

        period += voice.pitch;

        if (period < 113) {
          period = 113;
        } else if (period > 3424) {
          period = 3424;
        }

        chan.period = period;
        chan.volume = voice.volume;

        if (voice.sample) {
          chan.enabled = voice.enabled;
          chan.pointer = voice.sample.loopPtr;
          chan.length = voice.sample.repeat;
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class FCVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel     = null;
      this.sample      = null;
      this.enabled     = 0;
      this.pattern     = 0;
      this.patStep     = 0;
      this.transpose   = 0;
      this.soundtran   = 0;
      this.freqPos     = 0;
      this.freqStep    = 0;
      this.freqSustain = 0;
      this.freqTrans   = 0;
      this.volPos      = 0;
      this.volStep     = 0;
      this.volCtr      = 1;
      this.volSpeed    = 1;
      this.volSustain  = 0;
      this.note        = 0;
      this.pitch       = 0;
      this.volume      = 0;
      this.pitchFlag   = 0;
      this.pitchSpeed  = 0;
      this.pitchTime   = 0;
      this.portamento  = 0;
      this.portaFlag   = 0;
      this.vibrato     = 0;
      this.vibFlag     = 0;
      this.vibSpeed    = 0;
      this.vibDepth    = 0;
      this.vibDelay    = 0;
      this.slideFlag   = 0;
      this.slideSpeed  = 0;
      this.slideTime   = 0;
    };

    volumeSlide() {
      this.slideFlag ^= 1;

      if (this.slideFlag) {
        this.slideTime--;
        this.volume += this.slideSpeed;
        if (this.volume < 0 || this.volume > 64) { this.slideTime = 0; }
      }
    };
  }

  window.neoart.Trackers.FutureComposer = function() {
    tracker = new FutureComposer();
    return player;
  }

  class FredEditor extends Tracker {
    constructor() {
      super(Amiga);

      this.patterns = null;
      this.sampleFlag = 0;

      this.voices[3] = new FEVoice(3);
      this.voices[3].next = this.voices[2] = new FEVoice(2);
      this.voices[2].next = this.voices[1] = new FEVoice(1);
      this.voices[1].next = this.voices[0] = new FEVoice(0);

      ID.push("Fred Editor");

      mixer.process = this.process.bind(this);
      channels = 4;
      this.tuning();

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[3];
      super.initialize();

      this.speed = song.speed;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.patternPos = song.tracks[voice.index][0];

        mixer.memory.fill(0, voice.synth, voice.synth + 64);

        this.complete += (1 << voice.index);
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var pos = 0x7fffffff;
      var base, data, empty, i, j, len, sample, size, song, tracksLen, v, value;

      do {
        if (stream.ushort != 0x4efa) { return; }                          // jmp [xx]
        stream.position += 2;
      } while (stream.position < 16);

      do {
        value = stream.ushort;

        if (value == 0x123a) {                                            // move.b [xx,d1]
          stream.position += 2;

          if (stream.ushort == 0xb001) {                                  // cmp.b [d1,d0]
            stream.position -= 4;
            data = (stream.position + stream.ushort) - 0x895;
          }
        } else if (value == 0x214a) {                                     // move.l [a2,(a0)]
          stream.position += 2;

          if (stream.ushort == 0x47fa) {                                  // lea [xx,a3]
            base = stream.position + stream.short;
            version = 1;
            break;
          }
        }
      } while (stream.position < 1024);

      if (!version) { return; }

      stream.position = data + 0x8a2;
      stream.position = base + stream.uint;
      this.samples.length = 0;

      do {
        value = stream.uint;

        if (value) {
          if (value < stream.position || value >= stream.length) {
            stream.position -= 4;
            break;
          }

          if (value < pos) { pos = base + value; }
        }

        sample = new FESample();
        sample.pointer  = value;
        sample.loopPtr  = stream.short;
        sample.length   = stream.ushort << 1;
        sample.relative = stream.ushort;

        sample.vibratoDelay = stream.ubyte;
        stream.position++;
        sample.vibratoSpeed = stream.ubyte;
        sample.vibratoDepth = stream.ubyte;
        sample.envelopeVol  = stream.ubyte;
        sample.attackSpeed  = stream.ubyte;
        sample.attackVol    = stream.ubyte;
        sample.decaySpeed   = stream.ubyte;
        sample.decayVol     = stream.ubyte;
        sample.sustainTime  = stream.ubyte;
        sample.releaseSpeed = stream.ubyte;
        sample.releaseVol   = stream.ubyte;

        sample.arpeggio = new Int8Array(stream.buffer, stream.position, 16);
        stream.position += 16;

        sample.arpeggioSpeed = stream.ubyte;
        sample.type          = stream.byte;
        sample.pulseRateNeg  = stream.byte;
        sample.pulseRatePos  = stream.ubyte;
        sample.pulseSpeed    = stream.ubyte;
        sample.pulsePosL     = stream.ubyte;
        sample.pulsePosH     = stream.ubyte;
        sample.pulseDelay    = stream.ubyte;
        sample.synchro       = stream.ubyte;
        sample.blendRate     = stream.ubyte;
        sample.blendDelay    = stream.ubyte;
        sample.pulseCounter  = stream.ubyte;
        sample.blendCounter  = stream.ubyte;
        sample.arpeggioLimit = stream.ubyte;

        stream.position += 12;
        this.samples.push(sample);
        if (!stream.bytesAvailable) { break; }
      } while (pos > stream.position);

      stream.position = data + 0x8a2;
      len = stream.uint;
      pos = stream.uint;
      this.patterns = new ByteArray(stream.buffer, this.endian, (base + pos), (len - pos));

      pos += base;
      stream.position = data + 0x895;
      len = stream.ubyte + 1;
      this.list.length = 0;

      base = data + 0xb0e;
      tracksLen = pos - base;
      pos = 0;

      for (i = 0; i < len; i++) {
        song = new Song();
        empty = 1;

        for (j = 0; j < 4; j++) {
          stream.position = base + pos;
          value = stream.ushort;

          if (j == 3 && (i == (len - 1))) {
            size = tracksLen;
          } else {
            size = stream.ushort;
          }

          size = (size - value) >> 1;
          if (size > song.length) { song.length = size; }

          song.tracks[j] = new Uint16Array(size);
          stream.position = base + value;

          for (v = 0; v < size; v++) {
            value = stream.ushort;
            if (value && value < 32768) { empty = 0; }
            song.tracks[j][v] = value;
          }

          if (size == 256) {
            for (v = size - 1; v > -1; v--) {
              value = song.tracks[j][v];

              if (value && value < 32768 || v == 0) {
                if (v != (size - 2)) {
                  song.tracks[j][v + 1] = 32768;
                }

                break;
              }
            }
          }

          pos += 2;
        }

        stream.position = data + i + 0x897;
        song.speed = stream.ubyte;
        if (!empty) { this.list.push(song); }
      }

      stream.fill(0, 0, 356);
      mixer.loopLen = 100;

      for (i = 0; i < 4; i++) {
        this.voices[i].synth = 100 + (i << 6);
      }
    };

    process() {
      var voice = this.voices[3];
      var chan, i, j, len, loop, middle, pos, sample, value;

      do {
        chan = voice.channel;
        loop = 0;

        do {
          this.patterns.position = voice.patternPos;
          sample = voice.sample;
          this.sampleFlag = 0;

          if (!voice.busy) {
            voice.busy = 1;

            if (!sample.loopPtr) {
              chan.pointer = 0;
              chan.length = mixer.loopLen;
            } else if (sample.loopPtr > 0) {
              chan.pointer = (sample.type) ? voice.synth : (sample.pointer + sample.loopPtr);
              chan.length = sample.length - sample.loopPtr;
            }
          }

          if (--voice.tick == 0) {
            loop = 2;

            do {
              value = this.patterns.byte;

              if (value < 0) {
                switch (value) {
                  case -125:
                    sample = voice.sample = this.samples[this.patterns.ubyte];
                    this.sampleFlag = 1;
                    voice.patternPos = this.patterns.position;
                    break;
                  case -126:
                    this.speed = this.patterns.ubyte;
                    voice.patternPos = this.patterns.position;
                    break;
                  case -127:
                    value = (sample) ? sample.relative : 428;
                    voice.portaSpeed = this.patterns.ubyte * this.speed;
                    voice.portaNote  = this.patterns.ubyte;
                    voice.portaLimit = (PERIODS[voice.portaNote] * value) >> 10;
                    voice.portamento = 0;
                    voice.portaDelay = this.patterns.ubyte * this.speed;
                    voice.portaFlag  = 1;
                    voice.patternPos = this.patterns.position;
                    break;
                  case -124:
                    chan.enabled = 0;
                    voice.tick = this.speed;
                    voice.busy = 1;
                    voice.patternPos = this.patterns.position;
                    loop = 0;
                    break;
                  case -128:
                    voice.trackPos++;

                    do {
                      value = song.tracks[voice.index][voice.trackPos];

                      if (value == 65535) {
                        mixer.complete = 1;
                        break;
                      } else if (value > 32767) {
                        voice.trackPos = (value ^ 32768) >> 1;

                        this.complete &= ~(1 << voice.index);
                        if (!this.complete) { mixer.complete = 1; }
                      } else {
                        voice.patternPos = value;
                        voice.tick = 1;
                        loop = 1;
                        break;
                      }
                    } while (1);
                    break;
                  default:
                    voice.tick = this.speed * -value;
                    voice.patternPos = this.patterns.position;
                    loop = 0;
                    break;
                }
              } else {
                loop = 0;
                voice.patternPos = this.patterns.position;

                voice.note = value;
                voice.arpeggioPos = 0;
                voice.vibratoFlag = -1;
                voice.vibrato = 0;

                voice.arpeggioSpeed = sample.arpeggioSpeed;
                voice.vibratoDelay = sample.vibratoDelay;
                voice.vibratoSpeed = sample.vibratoSpeed;
                voice.vibratoDepth = sample.vibratoDepth;

                if (sample.type == 1) {
                  if (this.sampleFlag || (sample.synchro & 2)) {
                    voice.pulseCounter = sample.pulseCounter;
                    voice.pulseDelay = sample.pulseDelay;
                    voice.pulseDir = 0;
                    voice.pulsePos = sample.pulsePosL;
                    voice.pulseSpeed = sample.pulseSpeed;

                    middle = voice.synth + sample.pulsePosL;

                    mixer.memory.fill(sample.pulseRateNeg, voice.synth, middle);
                    mixer.memory.fill(sample.pulseRatePos, middle, voice.synth + sample.length);
                  }

                  chan.pointer = voice.synth;
                } else if (sample.type == 2) {
                  voice.blendCounter = sample.blendCounter;
                  voice.blendDelay = sample.blendDelay;
                  voice.blendDir = 0;
                  voice.blendPos = 1;

                  mixer.memory.copyWithin(sample.pointer, voice.synth, 32);

                  chan.pointer = voice.synth;
                } else {
                  chan.pointer = sample.pointer;
                }

                voice.tick = this.speed;
                voice.busy = 0;
                voice.period = (PERIODS[voice.note] * sample.relative) >> 10;
                voice.volume = 0;
                voice.envelopePos = 0;
                voice.sustainTime = sample.sustainTime;

                chan.length = sample.length;
                chan.period = voice.period;
                chan.volume = 0;
                chan.enabled = 1;

                if (voice.portaFlag) {
                  if (!voice.portamento) {
                    voice.portamento = voice.period;
                    voice.portaCounter = 1;
                    voice.portaPeriod = voice.portaLimit - voice.period;
                  }
                }

                cache[writePos].notes[voice.index] = voice.period;
              }
            } while (loop > 1);
          } else if (voice.tick == 1) {
            value = (this.patterns.readAt(voice.patternPos) - 160) & 255;
            if (value > 127) { chan.enabled = 0; }
          }
        } while (loop > 0);

        if (!chan.enabled) { continue; }

        value = voice.note + sample.arpeggio[voice.arpeggioPos];

        if (--voice.arpeggioSpeed == 0) {
          voice.arpeggioSpeed = sample.arpeggioSpeed;

          if (++voice.arpeggioPos == sample.arpeggioLimit) {
            voice.arpeggioPos = 0;
          }
        }

        voice.period = (PERIODS[value] * sample.relative) >> 10;

        if (voice.portaFlag) {
          if (voice.portaDelay) {
            voice.portaDelay--;
          } else {
            voice.period += (((voice.portaCounter * voice.portaPeriod) / voice.portaSpeed) >> 0);

            if (++voice.portaCounter > voice.portaSpeed) {
              voice.note = voice.portaNote;
              voice.portaFlag = 0;
            }
          }
        }

        if (voice.vibratoDelay) {
          voice.vibratoDelay--;
        } else if (voice.vibratoFlag) {
          if (voice.vibratoFlag < 0) {
            voice.vibrato += voice.vibratoSpeed;

            if (voice.vibrato == voice.vibratoDepth) {
              voice.vibratoFlag ^= 0x80000000;
            }
          } else {
            voice.vibrato -= voice.vibratoSpeed;

            if (!voice.vibrato) {
              voice.vibratoFlag ^= 0x80000000;
            }
          }

          if (!voice.vibrato) { voice.vibratoFlag ^= 1; }

          if (voice.vibratoFlag & 1) {
            voice.period += voice.vibrato;
          } else {
            voice.period -= voice.vibrato;
          }
        }

        chan.period = voice.period;

        switch (voice.envelopePos) {
          case 4:
            break;
          case 0:
            voice.volume += sample.attackSpeed;

            if (voice.volume >= sample.attackVol) {
              voice.volume = sample.attackVol;
              voice.envelopePos = 1;
            }
            break;
          case 1:
            voice.volume -= sample.decaySpeed;

            if (voice.volume <= sample.decayVol) {
              voice.volume = sample.decayVol;
              voice.envelopePos = 2;
            }
            break;
          case 2:
            if (voice.sustainTime) {
              voice.sustainTime--;
            } else {
              voice.envelopePos = 3;
            }
            break;
          case 3:
            voice.volume -= sample.releaseSpeed;

            if (voice.volume <= sample.releaseVol) {
              voice.volume = sample.releaseVol;
              voice.envelopePos = 4;
            }
            break;
        }

        value = sample.envelopeVol << 12;
        value >>= 8;
        value >>= 4;
        value *= voice.volume;
        value >>= 8;
        value >>= 1;
        chan.volume = value;

        if (sample.type == 1) {
          if (voice.pulseDelay) {
            voice.pulseDelay--;
          } else if (voice.pulseSpeed) {
            voice.pulseSpeed--;
          } else if (voice.pulseCounter || !(sample.synchro & 1)) {
            voice.pulseSpeed = sample.pulseSpeed;

            if (voice.pulseDir & 4) {
              do {
                if (voice.pulsePos >= sample.pulsePosL) {
                  loop = 1;
                  break;
                }

                voice.pulseDir &= -5;
                voice.pulsePos++;
                voice.pulseCounter--;

                if (voice.pulsePos <= sample.pulsePosH) {
                  loop = 2;
                  break;
                }

                voice.pulseDir |= 4;
                voice.pulsePos--;
                voice.pulseCounter--;
              } while (1);
            } else {
              do {
                if (voice.pulsePos <= sample.pulsePosH) {
                  loop = 2;
                  break;
                }

                voice.pulseDir |= 4;
                voice.pulsePos--;
                voice.pulseCounter--;

                if (voice.pulsePos >= sample.pulsePosL) {
                  loop = 1;
                  break;
                }

                voice.pulseDir &= -5;
                voice.pulsePos++;
                voice.pulseCounter++;
              } while (1);
            }

            pos = voice.synth + voice.pulsePos;

            if (loop == 1) {
              mixer.memory[pos] = sample.pulseRatePos;
              voice.pulsePos--;
            } else {
              mixer.memory[pos] = sample.pulseRateNeg;
              voice.pulsePos++;
            }
          }
        } else if (sample.type == 2) {
          if (voice.blendDelay) {
            voice.blendDelay--;
          } else if (voice.blendCounter || !(sample.synchro & 4)) {
            if (voice.blendDir) {
              if (voice.blendPos != 1) {
                voice.blendPos--;
              } else {
                voice.blendDir ^= 1;
                voice.blendCounter--;
              }
            } else {
              if (voice.blendPos != (sample.blendRate << 1)) {
                voice.blendPos++;
              } else {
                voice.blendDir ^= 1;
                voice.blendCounter--;
              }
            }

            i = sample.pointer;
            j = voice.synth;
            len = i + 31;

            pos = len + 1;

            for (; i < len; i++) {
              value = (voice.blendPos * mixer.memory[pos++]) >> sample.blendRate;
              mixer.memory[pos++] = value + mixer.memory[i];
            }
          }
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };

    tuning() {
      var i, n = 1024, r = n, t = PERIODS;
      t.fill(0);

      for (i = 36; i < 48; i++) {
        t[i] = r;
        t[i - 36] = r << 3;
        t[i - 24] = r << 2;
        t[i - 12] = r << 1;
        t[i + 12] = r >> 1;
        t[i + 24] = r >> 2;
        r = (n *= 0.94396) * 0.99997;
      }
    };
  }

  class FESample extends Sample {
    constructor() {
      super();

      this.synchro       = 0;
      this.type          = 0;
      this.envelopeVol   = 0;
      this.attackSpeed   = 0;
      this.attackVol     = 0;
      this.decaySpeed    = 0;
      this.decayVol      = 0;
      this.sustainTime   = 0;
      this.releaseSpeed  = 0;
      this.releaseVol    = 0;
      this.arpeggio      = null;
      this.arpeggioLimit = 0;
      this.arpeggioSpeed = 0;
      this.vibratoDelay  = 0;
      this.vibratoDepth  = 0;
      this.vibratoSpeed  = 0;
      this.pulseCounter  = 0;
      this.pulseDelay    = 0;
      this.pulsePosL     = 0;
      this.pulsePosH     = 0;
      this.pulseSpeed    = 0;
      this.pulseRateNeg  = 0;
      this.pulseRatePos  = 0;
      this.blendCounter  = 0;
      this.blendDelay    = 0;
      this.blendRate     = 0;
    };
  }

  class FEVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel       = null;
      this.sample        = null;
      this.trackPos      = 0;
      this.patternPos    = 0;
      this.tick          = 1;
      this.busy          = 1;
      this.note          = 0;
      this.period        = 0;
      this.volume        = 0;
      this.envelopePos   = 0;
      this.sustainTime   = 0;
      this.arpeggioPos   = 0;
      this.arpeggioSpeed = 0;
      this.portamento    = 0;
      this.portaCounter  = 0;
      this.portaDelay    = 0;
      this.portaFlag     = 0;
      this.portaLimit    = 0;
      this.portaNote     = 0;
      this.portaPeriod   = 0;
      this.portaSpeed    = 0;
      this.vibrato       = 0;
      this.vibratoDelay  = 0;
      this.vibratoDepth  = 0;
      this.vibratoFlag   = 0;
      this.vibratoSpeed  = 0;
      this.pulseCounter  = 0;
      this.pulseDelay    = 0;
      this.pulseDir      = 0;
      this.pulsePos      = 0;
      this.pulseSpeed    = 0;
      this.blendCounter  = 0;
      this.blendDelay    = 0;
      this.blendDir      = 0;
      this.blendPos      = 0;
    };
  }

  window.neoart.Trackers.FredEditor = function() {
    tracker = new FredEditor();
    return player;
  }

  const BPSOUNDMON1 = 1;
  const BPSOUNDMON2 = 2;
  const BPSOUNDMON3 = 3;

  const BPVIBRATO = [0,64,128,64,0,-64,-128,-64];

  class SoundMon extends Tracker {
    constructor() {
      super(Amiga);

      this.arpeggioCtr = 0;
      this.buffer      = new Int8Array(128);
      this.jumpFlag    = 0;
      this.nextPos     = 0;
      this.patternPos  = 0;
      this.patterns    = [];
      this.repeatCtr   = 0;
      this.trackPos    = 0;
      this.tracks      = [];
      this.vibratoPos  = 0;

      this.voices[0] = new BPVoice(0);
      this.voices[0].next = this.voices[1] = new BPVoice(1);
      this.voices[1].next = this.voices[2] = new BPVoice(2);
      this.voices[2].next = this.voices[3] = new BPVoice(3);

      ID.push("BP SoundMon V1", "BP SoundMon V2", "BP SoundMon V3");

      periods("soundmon");
      mixer.process = this.process.bind(this);
      channels = 4;
      this.samples.length = 16;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.arpeggioCtr = 0;
      this.jumpFlag    = 0;
      this.nextPos     = 0;
      this.patternPos  = 0;
      this.repeatCtr   = 0;
      this.speed       = 6;
      this.tick        = 1;
      this.trackPos    = 0;
      this.vibratoPos  = 0;

      this.buffer.fill(0);

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.samplePtr = 0;
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var tables = 0;
      var i, id, len, pos1, pos2, row, sample, step;

      song.title = stream.readUTF8(26);
      id = stream.readUTF8(4);

      if (id == "BPSM") {
        version = BPSOUNDMON1;
      } else {
        id = id.substr(0, 3);

        if (id == "V.2") {
          version = BPSOUNDMON2;
        } else if (id == "V.3") {
          version = BPSOUNDMON3;
        } else {
          return;
        }

        stream.position = 29;
        tables = stream.ubyte;
      }

      song.length = stream.ushort;
      stream.position = 512;

      len = song.length << 2;
      this.tracks.length = len;

      for (i = 0; i < len; i++) {
        step = new Step();
        step.pattern   = stream.ushort;
        step.soundtran = stream.byte;
        step.transpose = stream.byte;
        this.tracks[i] = step;

        if (step.pattern > higher) { higher = step.pattern; }
      }

      len = higher << 4;
      this.patterns.length = len;

      for (i = 0; i < len; i++) {
        row = new Row();
        row.note   = stream.byte;
        row.sample = stream.ubyte;
        row.effect = row.sample & 0x0f;
        row.sample = (row.sample & 0xf0) >> 4;
        row.param  = stream.byte;
        this.patterns[i] = row;
      }

      pos1 = stream.position;
      pos2 = pos1 + (tables << 6);
      stream.position = 32;

      for (i = 0; ++i < 16;) {
        sample = new BPSample();

        if (stream.ubyte == 0xff) {
          sample.synth   = 1;
          sample.table   = stream.ubyte;
          sample.pointer = pos1 + (sample.table << 6);
          sample.length  = stream.ushort << 1;

          sample.adsrControl = stream.ubyte;
          sample.adsrTable   = pos1 + (stream.ubyte << 6);
          sample.adsrLen     = stream.ushort;
          sample.adsrSpeed   = stream.ubyte;
          sample.lfoControl  = stream.ubyte;
          sample.lfoTable    = pos1 + (stream.ubyte << 6);
          sample.lfoDepth    = stream.ubyte;
          sample.lfoLen      = stream.ushort;

          if (version < BPSOUNDMON3) {
            stream.byte;
            sample.lfoDelay  = stream.ubyte;
            sample.lfoSpeed  = stream.ubyte;
            sample.egControl = stream.ubyte;
            sample.egTable   = pos1 + (stream.ubyte << 6);
            stream.byte;
            sample.egLen     = stream.ushort;
            stream.byte;
            sample.egDelay   = stream.ubyte;
            sample.egSpeed   = stream.ubyte;
            sample.fxSpeed   = 1;
            sample.modSpeed  = 1;
            sample.volume    = stream.ubyte;
            stream.position += 6;
          } else {
            sample.lfoDelay   = stream.ubyte;
            sample.lfoSpeed   = stream.ubyte;
            sample.egControl  = stream.ubyte;
            sample.egTable    = pos1 + (stream.ubyte << 6);
            sample.egLen      = stream.ushort;
            sample.egDelay    = stream.ubyte;
            sample.egSpeed    = stream.ubyte;
            sample.fxControl  = stream.ubyte;
            sample.fxSpeed    = stream.ubyte;
            sample.fxDelay    = stream.ubyte;
            sample.modControl = stream.ubyte;
            sample.modTable   = pos1 + (stream.ubyte << 6);
            sample.modSpeed   = stream.ubyte;
            sample.modDelay   = stream.ubyte;
            sample.volume     = stream.ubyte;
            sample.modLen     = stream.ushort;
          }
        } else {
          stream.position--;
          sample.synth  = 0;
          sample.name   = stream.readUTF8(24);
          sample.length = stream.ushort << 1;

          if (sample.length) {
            sample.loopPtr = stream.ushort;
            sample.repeat  = stream.ushort << 1;
            sample.volume  = stream.ushort;

            if ((sample.loopPtr + sample.repeat) >= sample.length) {
              sample.repeat = sample.length - sample.loopPtr;
            }

            sample.pointer  = pos2;
            sample.loopPtr += pos2;
            pos2 += sample.length;
          } else {
            sample.pointer--;
            sample.repeat = 2;
            stream.position += 6;
          }
        }

        this.samples[i] = sample;
      }

      stream.fill(0, 0, 4);
    };

    process() {
      var voice = this.voices[0];
      var memory = mixer.memory;
      var chan, data, dst, instr, len, note, option, row, sample, src, step, val;

      this.arpeggioCtr = (--this.arpeggioCtr & 3);
      this.vibratoPos = (++this.vibratoPos & 7);

      do {
        chan = voice.channel;
        voice.period += voice.autoSlide;
        chan.period = voice.period;

        if (voice.vibrato) {
          chan.period += (BPVIBRATO[this.vibratoPos] / voice.vibrato) >> 0;
        }

        chan.pointer = voice.samplePtr;
        chan.length = voice.sampleLen;

        if (voice.arpeggio || voice.autoArpeggio) {
          note = voice.note;

          if (!this.arpeggioCtr) {
            note += ((voice.arpeggio & 0xf0) >> 4) + ((voice.autoArpeggio & 0xf0) >> 4);
          } else if (this.arpeggioCtr == 1) {
            note += (voice.arpeggio & 0x0f) + (voice.autoArpeggio & 0x0f);
          }

          chan.period = voice.period = PERIODS[note + 35];
          voice.restart = 0;
        }

        if (!voice.synth || voice.sample < 0) { continue; }

        sample = this.samples[voice.sample];

        if (voice.adsrControl) {
          if (--voice.adsrCtr == 0) {
            voice.adsrCtr = sample.adsrSpeed;
            data = (128 + memory[sample.adsrTable + voice.adsrPtr]) >> 2;
            chan.volume = (data * voice.volume) >> 6;

            if (++voice.adsrPtr == sample.adsrLen) {
              voice.adsrPtr = 0;
              if (voice.adsrControl == 1) { voice.adsrControl = 0; }
            }
          }
        }

        if (voice.lfoControl) {
          if (--voice.lfoCtr == 0) {
            voice.lfoCtr = sample.lfoSpeed;
            data = memory[sample.lfoTable + voice.lfoPtr];
            if (sample.lfoDepth) { data = (data / sample.lfoDepth) >> 0; }
            chan.period = voice.period + data;

            if (++voice.lfoPtr == sample.lfoLen) {
              voice.lfoPtr = 0;
              if (voice.lfoControl == 1) { voice.lfoControl = 0; }
            }
          }
        }

        if (voice.synthPtr < 0) { continue; }

        if (voice.egControl) {
          if (--voice.egCtr == 0) {
            voice.egCtr = sample.egSpeed;
            val = voice.egValue;
            voice.egValue = (128 + memory[sample.egTable + voice.egPtr]) >> 3;

            if (voice.egValue != val) {
              dst = voice.synthPtr + val;
              src = (voice.index << 5) + val;

              if (voice.egValue < val) {
                val -= voice.egValue;
                len = dst - val;
                for (; dst > len;) { memory[--dst] = this.buffer[--src]; }
              } else {
                val = voice.egValue - val;
                len = dst + val;
                for (; dst < len;) { memory[dst++] = -this.buffer[src++]; }
              }
            }

            if (++voice.egPtr == sample.egLen) {
              voice.egPtr = 0;
              if (voice.egControl == 1) { voice.egControl = 0; }
            }
          }
        }

        switch (voice.fxControl) {
          case 0:
            break;
          case 1:     // averaging
            if (--voice.fxCtr == 0) {
              voice.fxCtr = sample.fxSpeed;

              dst = voice.synthPtr;
              len = dst + 32;
              val = (dst > 0) ? memory[dst - 1] : 0;

              for (; dst < len;) {
                val = (val + memory[dst + 1]) >> 1;
                memory[dst++] = val;
              }
            }
            break;
          case 2:     // inversion
            dst = voice.synthPtr;
            src = (voice.index << 5) + 31;
            len = dst + 32;
            val = sample.fxSpeed;

            for (; dst < len; dst++, src--) {
              if (this.buffer[src] < memory[dst]) {
                memory[dst] -= val;
              } else if (this.buffer[src] > memory[dst]) {
                memory[dst] += val;
              }
            }
            break;
          case 3:     // backward inversion
          case 5:     // backward transform
            dst = voice.synthPtr;
            src = voice.index << 5;
            len = dst + 32;
            val = sample.fxSpeed;

            for (; dst < len; dst++, src++) {
              if (this.buffer[src] < memory[dst]) {
                memory[dst] -= val;
              } else if (this.buffer[src] > memory[dst]) {
                memory[dst] += val;
              }
            }
            break;
          case 4:     // transform
            dst = voice.synthPtr;
            src = dst + 64;
            len = dst + 32;
            val = sample.fxSpeed;

            for (; dst < len; dst++, src++) {
              if (memory[src] < memory[dst]) {
                memory[dst] -= val;
              } else if (memory[src] > memory[dst]) {
                memory[dst] += val;
              }
            }
            break;
          case 6:     // wave change
            if (--voice.fxCtr == 0) {
              voice.fxControl = 0;
              voice.fxCtr = 1;
              memory.copyWithin(voice.synthPtr, voice.synthPtr + 64, 32);
            }
            break;
        }

        if (voice.modControl) {
          if (--voice.modCtr == 0) {
            voice.modCtr = sample.modSpeed;
            memory[voice.synthPtr + 32] = memory[sample.modTable + voice.modPtr];

            if (++voice.modPtr == sample.modLen) {
              voice.modPtr = 0;
              if (voice.modControl == 1) { voice.modControl = 0; }
            }
          }
        }
      } while (voice = voice.next);

      if (--this.tick == 0) {
        this.tick = this.speed;
        voice = this.voices[0];

        do {
          chan = voice.channel;
          voice.enabled = 0;

          step = this.tracks[(this.trackPos << 2) + voice.index];
          row = this.patterns[this.patternPos + ((step.pattern - 1) << 4)];
          option = row.effect;

          note = row.note;
          data = row.param;

          if (note) {
            voice.autoArpeggio = voice.autoSlide = voice.vibrato = 0;
            if (option != 10 || (data & 0xf0) == 0) { note += step.transpose; }
            voice.note = note;
            voice.period = PERIODS[note + 35];

            if (option < 13) {
              voice.restart = voice.volumeDef = 1;
            } else {
              voice.restart = 0;
            }

            instr = row.sample;
            if (instr == 0) { instr = voice.sample; }
            if (option != 10 || (data & 0x0f) == 0) { instr += step.soundtran; }

            if (option < 13 && (!voice.synth || (voice.sample != instr))) {
              voice.sample = instr;
              voice.enabled = 1;
            }

            cache[writePos].notes[voice.index] = voice.period;
          }

          switch (option) {
            case 0:   // arpeggio once
              voice.arpeggio = data;
              break;
            case 1:   // set volume
              voice.volume = data;
              voice.volumeDef = 0;

              if (version < BPSOUNDMON3 || !voice.synth) {
                chan.volume = voice.volume;
              }
              break;
            case 2:   // set speed
              this.tick = this.speed = data;
              break;
            case 3:   // set filter
              mixer.filter = data;
              break;
            case 4:   // portamento up
              voice.period -= data;
              voice.arpeggio = 0;
              break;
            case 5:   // portamento down
              voice.period += data;
              voice.arpeggio = 0;
              break;
            case 6:   // set vibrato
              if (version == BPSOUNDMON3) {
                voice.vibrato = data;
              } else {
                this.repeatCtr = data;
              }
              break;
            case 7:   // step jump
              if (version == BPSOUNDMON3 || this.repeatCtr == 0) {
                this.nextPos = data;
                this.jumpFlag = 1;
              }
              break;
            case 8:   // set auto slide
              voice.autoSlide = data;
              break;
            case 9:   // set auto arpeggio
              voice.autoArpeggio = data;

              if (version == BPSOUNDMON3) {
                voice.adsrPtr = 0;
                if (voice.adsrControl == 0) { voice.adsrControl = 1; }
              }
              break;
            case 11:  // change effect
              voice.fxControl = data;
              break;
            case 13:  // change inversion
              voice.autoArpeggio = data;
              voice.fxControl ^= 1;
              voice.adsrPtr = 0;
              if (voice.adsrControl == 0) { voice.adsrControl = 1; }
              break;
            case 14:  // no eg reset
              voice.autoArpeggio = data;
              voice.adsrPtr = 0;
              if (voice.adsrControl == 0) { voice.adsrControl = 1; }
              break;
            case 15:  // no eg and no adsr reset
              voice.autoArpeggio = data;
              break;
          }
        } while (voice = voice.next);

        if (this.jumpFlag) {
          this.trackPos = this.nextPos;
          this.patternPos = 0;
          this.jumpFlag = 0;

          if (this.played[this.trackPos]) {
            mixer.complete = 1;
          } else {
            this.played[this.trackPos] = 1;
          }
        } else if (++this.patternPos == 16) {
          this.patternPos = 0;

          if (++this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }

        voice = this.voices[0];

        do {
          chan = voice.channel;

          if (voice.enabled) {
            chan.enabled = 0;
            voice.enabled = 0;
          }

          if (!voice.restart) { continue; }

          if (voice.synthPtr > -1) {
            dst = voice.synthPtr;
            src = voice.index << 5;
            len = dst + 32;

            for (; dst < len; dst++, src++) { memory[dst] = this.buffer[src]; }
            voice.synthPtr = -1;
          }
        } while (voice = voice.next);

        voice = this.voices[0];

        do {
          if (!voice.restart || voice.sample < 0) { continue; }
          chan = voice.channel;
          chan.period = voice.period;
          voice.restart = 0;
          sample = this.samples[voice.sample];

          if (sample.synth) {
            voice.synth   = 1;
            voice.egValue = 0;
            voice.adsrPtr = voice.lfoPtr = voice.egPtr = voice.modPtr = 0;

            voice.adsrCtr = 1;
            voice.lfoCtr  = sample.lfoDelay + 1;
            voice.egCtr   = sample.egDelay  + 1;
            voice.fxCtr   = sample.fxDelay  + 1;
            voice.modCtr  = sample.modDelay + 1;

            voice.adsrControl = sample.adsrControl;
            voice.lfoControl  = sample.lfoControl;
            voice.egControl   = sample.egControl;
            voice.fxControl   = sample.fxControl;
            voice.modControl  = sample.modControl;

            chan.pointer = voice.samplePtr = sample.pointer;
            chan.length = voice.sampleLen = sample.length;

            if (voice.adsrControl) {
              data = (128 + memory[sample.adsrTable]) >> 2;

              if (voice.volumeDef) {
                voice.volume = sample.volume;
                voice.volumeDef = 0;
              }

              chan.volume = (data * voice.volume) >> 6;
            } else {
              chan.volume = (voice.volumeDef) ? sample.volume : voice.volume;
            }

            if (voice.egControl || voice.fxControl || voice.modControl) {
              voice.synthPtr = sample.pointer;

              dst = voice.index << 5;
              src = voice.synthPtr;
              len = src + 32;

              for (; src < len; src++, dst++) { this.buffer[dst] = memory[src]; }
            }
          } else {
            voice.synth = voice.lfoControl = 0;

            if (sample.pointer < 0) {
              voice.samplePtr = 0;
              voice.sampleLen = 4;
            } else {
              chan.pointer = sample.pointer;
              chan.volume = (voice.volumeDef) ? sample.volume : voice.volume;

              if (sample.repeat != 2) {
                voice.samplePtr = sample.loopPtr;
                chan.length = voice.sampleLen = sample.repeat;
              } else {
                voice.samplePtr = 0;
                voice.sampleLen = 4;
                chan.length = sample.length;
              }
            }
          }

          chan.enabled = 1;
          voice.enabled = 1;
        } while (voice = voice.next);
      }

      position += mixer.ticksize;
    };

    reset() {
      var voice = this.voices[0];

      do {
        if (voice.synthPtr < 0) { continue; }
        mixer.buffer.position = voice.synthPtr;
        mixer.buffer.writeBytes(this.buffer, (voice.index << 5), 32);
      } while (voice = voice.next);
    };
  }

  class BPSample extends Sample {
    constructor() {
      super();

      this.synth       = 0;
      this.table       = 0;
      this.adsrControl = 0;
      this.adsrTable   = 0;
      this.adsrLen     = 0;
      this.adsrSpeed   = 0;
      this.lfoControl  = 0;
      this.lfoTable    = 0;
      this.lfoDepth    = 0;
      this.lfoLen      = 0;
      this.lfoDelay    = 0;
      this.lfoSpeed    = 0;
      this.egControl   = 0;
      this.egTable     = 0;
      this.egLen       = 0;
      this.egDelay     = 0;
      this.egSpeed     = 0;
      this.fxControl   = 0;
      this.fxDelay     = 0;
      this.fxSpeed     = 0;
      this.modControl  = 0;
      this.modTable    = 0;
      this.modLen      = 0;
      this.modDelay    = 0;
      this.modSpeed    = 0;
    };
  }

  class BPVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel      = null,
      this.enabled      = 0;
      this.restart      = 0;
      this.note         = 0;
      this.period       = 0;
      this.sample       = 0;
      this.samplePtr    = 0;
      this.sampleLen    = 2;
      this.synth        = 0;
      this.synthPtr     = -1;
      this.arpeggio     = 0;
      this.autoArpeggio = 0;
      this.autoSlide    = 0;
      this.vibrato      = 0;
      this.volume       = 0;
      this.volumeDef    = 0;
      this.adsrControl  = 0;
      this.adsrPtr      = 0;
      this.adsrCtr      = 0;
      this.lfoControl   = 0;
      this.lfoPtr       = 0;
      this.lfoCtr       = 0;
      this.egControl    = 0;
      this.egPtr        = 0;
      this.egCtr        = 0;
      this.egValue      = 0;
      this.fxControl    = 0;
      this.fxCtr        = 0;
      this.modControl   = 0;
      this.modPtr       = 0;
      this.modCtr       = 0;
    };
  }

  window.neoart.Trackers.SoundMon = function() {
    tracker = new SoundMon();
    return player;
  }

  class SidMon1 extends Tracker {
    constructor() {
      super(Amiga);

      this.audioLen   = 0;
      this.audioPer   = 0;
      this.audioPtr   = 0;
      this.audioVol   = 0;
      this.filterOn   = 0;
      this.mix1Ctr    = 0;
      this.mix1Pos    = 0;
      this.mix1Dest   = 0;
      this.mix1Src1   = 0;
      this.mix1Src2   = 0;
      this.mix1Speed  = 0;
      this.mix2Ctr    = 0;
      this.mix2Pos    = 0;
      this.mix2Dest   = 0;
      this.mix2Src1   = 0;
      this.mix2Src2   = 0;
      this.mix2Speed  = 0;
      this.patternDef = 0;
      this.patternEnd = 0;
      this.patternLen = 0;
      this.patternPos = 0;
      this.patterns   = [];
      this.resetOn    = 0;
      this.stream     = null;
      this.trackEnd   = 0;
      this.trackPos   = 0;
      this.tracks     = [];
      this.waves      = 0;
      this.wavesList  = null;

      this.voices[0] = new S1Voice(0);
      this.voices[0].next = this.voices[1] = new S1Voice(1);
      this.voices[1].next = this.voices[2] = new S1Voice(2);
      this.voices[2].next = this.voices[3] = new S1Voice(3);

      ID.push("SidMon 1.0");

      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var chan, step;
      super.initialize();

      this.patternEnd = 0;
      this.patternLen = this.patternDef;
      this.patternPos = -1;
      this.speed = song.speed;
      this.tick  = song.speed;
      this.trackEnd = 0;
      this.trackPos = 1;

      this.mix1Ctr = this.mix1Pos = 0;
      this.mix2Ctr = this.mix2Pos = 0;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.step = voice.trackPtr;

        step = this.tracks[voice.step];
        voice.row = step.pattern;
        voice.sample = this.patterns[step.pattern].sample;

        chan = voice.channel;
        chan.length = 32;
        chan.period = voice.period;
        chan.enabled = 1;
      } while (voice = voice.next);
    };

    parse(stream) {
      var base = 0;
      var i, j, len, mix, noloop, periods, pointers, pos, row, sample, step, value;

      do {
        value = stream.ushort;

        switch (value) {
          case 0x41fa:                                        // lea xx,a0
            value = stream.ushort;
            if (stream.uint == 0xd1e8ffd4) {                  // adda.l -44(a0),a0
              variant = value;
              base = stream.position + value - 6;
            }
            break;
          case 0x20bc:                                        // move.l #xx,(a0)
            stream.position += 4;
            if (stream.ushort != 0x24bc) { break; }           // move.l #xx,(a2)

            stream.position += 4;
            pos = stream.position;

            do {
              value = stream.ushort;
              if (value != 0x6100) { break; }                 // bsr.w xx
              pos = stream.position;

              stream.position += stream.ushort + 4;
              value = stream.uint;

              if (value == 0xd1e8ffec) {                      // adda.l -20(a0),a0
                mix = 1;
              } else if (value == 0xd1e8ffe8) {               // adda.l -24(a0),a0
                this.filterOn = 1;
              }

              stream.position = pos + 2;
            } while (1);

            stream.position = pos;
            break;
          case 0x4228:                                        // clr.b xx(a0)
            if (stream.ushort == 0x0013) {                    // 19(a0)
              this.resetOn = 1;
            }
            break;
          case 0x2850:                                        // movea.l (a0),a4
            stream.position -= 6;

            if (stream.ushort == 0x47fa) {                    // lea xx,a3
              periods = stream.position + stream.ushort;
              stream.position += 4;
            } else {
              stream.position += 6;
            }
            break;
          case 0x0cab:                                        // cmpi.l #xx,4(a3)
            value = stream.uint;

            if (stream.ushort == 4) {                         // 4(a3)
              noloop = value;
            }

            stream.position = stream.length;
            break;
        }
      } while (stream.bytesAvailable > 8);

      stream.position = base;
      if (stream.readUTF8(32) != " SID-MON BY R.v.VLIET  (c) 1988 ") { return; }

      stream.position = base - 8;
      stream.position = base + stream.uint + 4;

      pointers = [0];
      pos = 0;

      do {
        value = stream.uint;
        if (value == 0 || value < pos || (value % 5) != 0) { break; }

        pos = value;
        pointers.push((value / 5) >> 0);
      } while (stream.bytesAvailable >= 4);

      stream.position = base - 44;
      len = stream.uint;

      for (i = 1; i < 4; i++) {
        this.voices[i].trackPtr = ((stream.uint - len) / 6) >> 0;
      }

      stream.position = base - 28;
      pos = len;
      len = ((stream.uint - pos) / 6) >> 0;

      this.tracks.length = len;
      stream.position = base + pos;
      value = pointers.length;

      for (i = 0; i < len; i++) {
        step = new Step();

        pos = stream.uint;
        if (pos >= value) { pos = 0; }
        step.pattern = pointers[pos];
        stream.position++;

        pos = stream.byte;
        if (pos < -99 || pos > 99) { pos = 0; }
        step.transpose = pos;

        this.tracks[i] = step;
      }

      stream.position = base - 24;
      pos = stream.uint;
      len = (stream.uint - pos) >> 5;
      this.waves = base + pos;

      if (!this.wavesList) {
        this.wavesList = new Uint8Array(512);
        value = 0;

        for (i = 0; i < 512; i += 12) {
          this.wavesList[i++] = value++;
          this.wavesList[i++] = 0x01;
          this.wavesList[i++] = 0xff;
          this.wavesList[i++] = 0x10;
        }
      }

      stream.position = base - 20;
      stream.position = base + stream.uint;

      this.mix1Src1 = this.waves + ((stream.uint - 1) << 5) + 31;
      this.mix2Src1 = this.waves + ((stream.uint - 1) << 5) + 31;
      this.mix1Src2 = this.waves + ((stream.uint - 1) << 5);
      this.mix2Src2 = this.waves + ((stream.uint - 1) << 5);
      this.mix1Dest = this.waves + ((stream.uint - 1) << 5) + 31;
      this.mix2Dest = this.waves + ((stream.uint - 1) << 5) + 31;

      this.patternDef = stream.uint;
      song.length = stream.uint;
      song.speed  = stream.uint;

      if (!song.speed) { song.speed = 4; }

      if (mix) {
        len = this.waves + (len << 5);

        this.mix1Speed = stream.uint;
        this.mix2Speed = stream.uint;

        if (this.mix1Src1 > len || this.mix1Src2 > len || this.mix1Dest > len) {
          this.mix1Speed = 0;
        }

        if (this.mix2Src1 > len || this.mix2Src2 > len || this.mix2Dest > len) {
          this.mix2Speed = 0;
        }
      }

      stream.position = base - 28;
      pos = stream.uint;
      len = (stream.uint - pos) >> 5;
      if (len > 63) { len = 63; }

      this.samples.length = ++len;
      this.samples[0] = new S1Sample();
      stream.position = base + pos;

      for (i = 1; i < len; i++) {
        sample = new S1Sample();
        sample.waveform = stream.uint;

        for (j = 0; j < 16; j++) { sample.arpeggio[j] = stream.ubyte << 1; }

        sample.attackSpeed = stream.ubyte;
        sample.attackMax   = stream.ubyte;
        sample.decaySpeed  = stream.ubyte;
        sample.decayMin    = stream.ubyte;
        sample.sustain     = stream.ubyte;
        stream.position++;

        sample.releaseSpeed = stream.ubyte;
        sample.releaseMin   = stream.ubyte;
        sample.phaseShift   = stream.ubyte;

        if (sample.phaseShift) {
          sample.phaseShift = (sample.phaseShift - 1) << 5;
        }

        sample.phaseSpeed = stream.ubyte;
        sample.finetune   = stream.ubyte;
        sample.pitchFall  = stream.byte;

        if (variant >= 0x1444) {
          sample.pitchFall = sample.finetune;
          sample.finetune = 0;
        } else if (sample.finetune > 6) {
          sample.finetune = 0;
        } else {
          if (variant == 0x0ffa) {
            sample.finetune *= 136;
          } else {
            sample.finetune *= 134;
          }
        }

        sample.finetune += periods;
        this.samples[i] = sample;
      }

      stream.position = base - 4;
      pos = stream.uint;

      if (pos == 1) {
        stream.position = 0;
        len = 0;

        do {
          value = stream.ushort;
          if (value != 0x0c00) { continue; }                  // cmpi.b #xx,d0

          i = stream.ushort;
          stream.position += 4;
          if (stream.ushort != 0x4dfa) { continue; }          // lea xx,a6

          pos = stream.position + stream.ushort;
          stream.position += 6;

          if (stream.ushort != 0x33fc) {                      // move.w #xx,$dff0d4
            stream.position += 4;
            if (stream.ushort != 0x33fc) { continue; }
          }

          sample = new S1Sample();
          sample.waveform = i - 44;
          sample.pointer  = pos + len;
          sample.length   = stream.ushort << 1;
          sample.loopPtr  = 0;
          sample.repeat   = 4;
          sample.volume   = 64;
          sample.finetune = periods;

          len += sample.length;
          this.samples.push(sample);
          if (i == 62) { break; }
        } while (stream.bytesAvailable > 8);
      } else {
        stream.position = base + pos;
        mix = stream.uint + stream.position;
        pos = stream.position;

        for (i = 1; i < len; i++) {
          sample = this.samples[i];
          if (sample.waveform < 16) { continue; }

          value = sample.waveform - 16;
          stream.position = pos + (value << 5);

          sample.pointer = stream.uint;
          sample.loopPtr = stream.uint;
          sample.length  = stream.uint;
          sample.name = stream.readUTF8(20);

          if (sample.loopPtr == noloop || sample.loopPtr >= sample.length) {
            sample.loopPtr = 0;
            sample.repeat = 4;
          } else {
            sample.repeat = sample.length - sample.loopPtr;
            sample.loopPtr += mix;
          }

          sample.length -= sample.pointer;
          sample.pointer += mix;
        }
      }

      stream.position = base - 12;
      pos = stream.uint;
      len = ((stream.uint - pos) / 5) >> 0;

      this.patterns.length = len;
      stream.position = base + pos;

      for (i = 0; i < len; i++) {
        row = new Row();
        row.note   = stream.ubyte;
        row.sample = stream.ubyte;
        row.effect = stream.ubyte;
        row.param  = stream.ubyte;
        row.step   = stream.ubyte;

        if (variant >= 0x1444 && row.sample > 59) {
          row.sample = this.samples.length - (64 - row.sample);
        } else if (row.sample >= this.samples.length) {
          row.sample = 0;
        }

        this.patterns[i] = row;
      }

      stream.fill(0, 0, 4);
      version = 1;
      this.stream = stream;
    };

    process() {
      var voice = this.voices[0];
      var chan, dest, i, index, row, sample, src1, src2, step, value;

      do {
        chan = voice.channel;
        this.audioPtr = this.audioLen = 0;
        this.audioPer = this.audioVol = 0;

        if (!this.tick) {
          if (this.patternEnd) {
            if (this.trackEnd) {
              voice.step = voice.trackPtr;
            } else {
              voice.step++;
            }

            step = this.tracks[voice.step];
            voice.row = step.pattern;
            if (this.resetOn) { voice.repeat = 0; }
          }

          if (!voice.repeat) {
            row = this.patterns[voice.row];
            sample = this.samples[row.sample];

            if (row.sample) {
              if (voice.loopCtr) { voice.loopCtr = chan.enabled = 0; }

              if (sample.waveform > 15) {
                this.audioPtr = sample.pointer;
                this.audioLen = sample.length;
                voice.loopCtr = 1;
              } else {
                voice.wavePos = 0;
                voice.waveList = (sample.waveform - 1) << 4;
                index = voice.waveList;

                this.audioPtr = this.waves + (this.wavesList[index] << 5);
                this.audioLen = 32;
                voice.waveTimer = this.wavesList[++index];
              }

              voice.repeat = row.step;
              voice.sample = row.sample;

              voice.envelopeCtr = 0;
              voice.pitchCtr = 0;
              voice.pitchFallCtr = 0;
            } else if (row.note && voice.loopCtr) {
              this.audioPtr = sample.pointer;
              this.audioLen = sample.length;
              voice.loopCtr = 1;

              chan.enabled = 0;
            }

            if (row.note) {
              voice.repeat = row.step;

              if (row.note != 0xff) {
                step = this.tracks[voice.step];

                voice.note = (row.note + step.transpose) << 1;
                this.stream.position = 2 + sample.finetune + voice.note;
                this.audioPer = voice.period = this.stream.ushort;

                voice.phaseSpeed   = sample.phaseSpeed;
                voice.bendSpeed    = 0;
                voice.volume       = 0;
                voice.envelopeCtr  = 0;
                voice.pitchCtr     = 0;
                voice.pitchFallCtr = 0;

                switch (row.effect) {
                  case 0:
                    if (row.param) {
                      sample.attackMax = sample.attackSpeed = row.param;
                      voice.waveTimer = 0;
                    }
                    break;
                  case 2:
                    this.speed = row.param;
                    voice.waveTimer = 0;
                    break;
                  case 3:
                    this.patternLen = row.param;
                    voice.waveTimer = 0;
                    break;
                  default:
                    voice.bendTo = row.effect + step.transpose;
                    voice.bendSpeed = row.param;
                    break;
                }

                cache[writePos].notes[voice.index] = voice.period;
              }
            }

            voice.row++;
          } else {
            voice.repeat--;
          }
        }

        sample = this.samples[voice.sample];
        this.audioVol = voice.volume;

        switch (voice.envelopeCtr) {
          case 8: // gone
            break;
          case 0: // attack
            this.audioVol += sample.attackSpeed;

            if (this.audioVol > sample.attackMax) {
              this.audioVol = sample.attackMax;
              voice.envelopeCtr = 2;
            }
            break;
          case 2: // decay
            this.audioVol -= sample.decaySpeed;

            if (this.audioVol <= sample.decayMin || this.audioVol < -256) {
              this.audioVol = sample.decayMin;
              voice.sustainCtr = sample.sustain;
              voice.envelopeCtr = 4;
            }
            break;
          case 4: // sustain
            voice.sustainCtr--;

            if (!voice.sustainCtr || voice.sustainCtr == -256) {
              voice.envelopeCtr = 6;
            }
            break;
          case 6: // release
            this.audioVol -= sample.releaseSpeed;

            if (this.audioVol <= sample.releaseMin || this.audioVol < -256) {
              this.audioVol = sample.releaseMin;
              voice.envelopeCtr = 8;
            }
            break;
        }

        voice.volume = this.audioVol;
        voice.arpeggioCtr = (++voice.arpeggioCtr & 15);

        this.stream.position = sample.finetune + sample.arpeggio[voice.arpeggioCtr] + voice.note;
        this.audioPer = voice.period = this.stream.ushort;

        if (voice.bendSpeed) {
          this.stream.position = sample.finetune + (voice.bendTo << 1);
          value = this.stream.ushort;
          index = -voice.bendSpeed;

          if (index < -128) { index &= 255; }

          voice.pitchCtr += index;
          voice.period += voice.pitchCtr;

          if ((index < 0 && voice.period <= value) || (index > 0 && voice.period >= value)) {
            voice.note = voice.bendTo << 1;
            voice.period = value;
            voice.bendSpeed = 0;
            voice.pitchCtr  = 0;
          }
        }

        if (sample.phaseShift) {
          if (voice.phaseSpeed) {
            voice.phaseSpeed--;
          } else {
            voice.phaseTimer = (++voice.phaseTimer & 31);
            index = this.waves + sample.phaseShift + voice.phaseTimer;
            voice.period += mixer.memory[index] >> 2;
          }
        }

        voice.pitchFallCtr -= sample.pitchFall;
        if (voice.pitchFallCtr < -256) { voice.pitchFallCtr += 256; }
        voice.period += voice.pitchFallCtr;

        if (!voice.loopCtr) {
          if (voice.waveTimer) {
            voice.waveTimer--;
          } else if (voice.wavePos < 16) {
            index = voice.waveList + voice.wavePos;
            value = this.wavesList[index++];

            if (value == 0xff) {
              voice.wavePos = this.wavesList[index] & 254;
            } else {
              this.audioPtr = this.waves + (value << 5);
              voice.waveTimer = this.wavesList[index];
              voice.wavePos += 2;
            }
          }
        }

        if (this.audioPtr) { chan.pointer = this.audioPtr; }
        if (this.audioPer) { chan.period  = voice.period;  }
        if (this.audioLen) { chan.length  = this.audioLen; }

        if (sample.volume) {
          chan.volume = sample.volume;
        } else {
          chan.volume = this.audioVol >> 2;
        }

        chan.enabled = 1;

        if (voice.loopCtr == 1) {
          voice.loopCtr++;
        } else if (voice.loopCtr == 2) {
          sample = this.samples[voice.sample];
          chan.pointer = sample.loopPtr;
          chan.length  = sample.repeat;
          voice.loopCtr++;
        }
      } while (voice = voice.next);

      this.patternEnd = this.trackEnd = 0;

      if (++this.tick > this.speed) {
        this.tick = 0;

        if (++this.patternPos == this.patternLen) {
          this.patternPos = 0;
          this.patternEnd = 1;

          if (++this.trackPos == song.length) {
            this.trackPos = 1;
            this.trackEnd = 1;
            mixer.complete = 1;
          }
        }
      }

      if (this.mix1Speed) {
        if (!this.mix1Ctr) {
          this.mix1Ctr = this.mix1Speed;
          this.mix1Pos = (++this.mix1Pos & 31);
          index = this.mix1Pos;

          dest = this.mix1Dest;
          src1 = this.mix1Src1;
          src2 = this.mix1Src2;

          for (i = 0; i < 32; i++) {
            mixer.memory[dest--] = (mixer.memory[src1--] + mixer.memory[src2 + index]) >> 1;
            index = (--index & 31);
          }
        }

        this.mix1Ctr--;
      }

      if (this.mix2Speed) {
        if (!this.mix2Ctr) {
          this.mix2Ctr = this.mix2Speed;
          this.mix2Pos = (++this.mix2Pos & 31);
          index = this.mix2Pos;

          dest = this.mix2Dest;
          src1 = this.mix2Src1;
          src2 = this.mix2Src2;

          for (i = 0; i < 32; i++) {
            mixer.memory[dest--] = (mixer.memory[src1--] + mixer.memory[src2 + index]) >> 1;
            index = (--index & 31);
          }
        }

        this.mix2Ctr--;
      }

      if (this.filterOn) {
        index = this.waves + this.mix1Pos;
        mixer.memory[index] = -mixer.memory[index];
      }

      position += mixer.ticksize;
    };
  }

  class S1Sample extends Sample {
    constructor() {
      super();

      this.arpeggio     = new Uint8Array(16);
      this.attackMax    = 0;
      this.attackSpeed  = 0;
      this.decayMin     = 0;
      this.decaySpeed   = 0;
      this.phaseShift   = 0;
      this.phaseSpeed   = 0;
      this.pitchFall    = 0;
      this.releaseMin   = 0;
      this.releaseSpeed = 0;
      this.sustain      = 0;
      this.waveform     = 0;
    };
  }

  class S1Voice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
      this.trackPtr = 0;
    };

    initialize() {
      this.channel      = null;
      this.step         = 0;
      this.repeat       = 0;
      this.row          = 0;
      this.sample       = 0;
      this.loopCtr      = 0;
      this.note         = 0;
      this.period       = 0x9999;
      this.volume       = 0;
      this.bendTo       = 0;
      this.bendSpeed    = 0;
      this.arpeggioCtr  = 0;
      this.envelopeCtr  = 8;
      this.pitchCtr     = 0;
      this.pitchFallCtr = 0
      this.sustainCtr   = 0;
      this.phaseSpeed   = 0;
      this.phaseTimer   = 0;
      this.wavePos      = 0;
      this.waveList     = 0;
      this.waveTimer    = 0;
    };
  }

  window.neoart.Trackers.SidMon1 = function() {
    tracker = new SidMon1();
    return player;
  }

  class SidMon2 extends Tracker {
    constructor() {
      super(Amiga);

      this.arpeggioFx  = new Int16Array(4);
      this.arpeggioPos = 0;
      this.arpeggios   = null;
      this.instruments = [];
      this.patternLen  = 0;
      this.patternPos  = 0;
      this.patterns    = [];
      this.speedDef    = 0;
      this.trackPos    = 0;
      this.tracks      = [];
      this.vibratos    = null;
      this.waves       = null;

      this.voices[0] = new S2Voice(0);
      this.voices[0].next = this.voices[1] = new S2Voice(1);
      this.voices[1].next = this.voices[2] = new S2Voice(2);
      this.voices[2].next = this.voices[3] = new S2Voice(3);

      ID.push("SidMon 2.0");

      mixer.process = this.process.bind(this);
      channels = 4;
      this.tuning();

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.patternPos = 0;
      this.patternLen = 64;
      this.speed = this.speedDef;
      this.tick = this.speedDef;
      this.trackPos = 0;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.instr = this.instruments[0];

        this.arpeggioFx[voice.index] = 0;
      } while (voice = voice.next);
    };

    parse(stream) {
      var higher = 0;
      var base, i, instr, j, len, pointers, pos, row, sample, sdata, sheader, step, value;

      stream.position = 58;
      if (stream.readUTF8(28) != "SIDMON II - THE MIDI VERSION") { return; }

      stream.position = 2;
      song.length = stream.ubyte;
      this.speedDef = stream.ubyte;
      this.samples.length = stream.ushort >> 6;

      stream.position = 14;
      len = stream.uint;
      this.tracks.length = len;
      stream.position = 90;

      for (i = 0; i < len; i++) {
        step = new Step();
        value = stream.ubyte;
        if (value > higher) { higher = value; }
        step.pattern = value;
        this.tracks[i] = step;
      }

      for (i = 0; i < len; i++) {
        step = this.tracks[i];
        step.transpose = stream.byte;
      }

      for (i = 0; i < len; i++) {
        step = this.tracks[i];
        step.soundtran = stream.byte;
      }

      pos = stream.position;
      stream.position = 26;
      len = stream.uint >> 5;
      this.instruments.length = ++len;
      stream.position = pos;

      this.instruments[0] = new S2Instrument();

      for (i = 1; i < len; i++) {
        instr = new S2Instrument();
        instr.wave           = stream.ubyte << 4;
        instr.waveLen        = stream.ubyte;
        instr.waveSpeed      = stream.ubyte;
        instr.waveDelay      = stream.ubyte;
        instr.arpeggio       = stream.ubyte << 4;
        instr.arpeggioLen    = stream.ubyte;
        instr.arpeggioSpeed  = stream.ubyte;
        instr.arpeggioDelay  = stream.ubyte;
        instr.vibrato        = stream.ubyte << 4;
        instr.vibratoLen     = stream.ubyte;
        instr.vibratoSpeed   = stream.ubyte;
        instr.vibratoDelay   = stream.ubyte;
        instr.pitchBend      = stream.byte;
        instr.pitchBendDelay = stream.ubyte;

        stream.position += 2;
        instr.attackMax    = stream.ubyte;
        instr.attackSpeed  = stream.ubyte;
        instr.decayMin     = stream.ubyte;
        instr.decaySpeed   = stream.ubyte;
        instr.sustain      = stream.ubyte;
        instr.releaseMin   = stream.ubyte;
        instr.releaseSpeed = stream.ubyte;

        this.instruments[i] = instr;
        stream.position += 9;
      }

      pos = stream.position;
      stream.position = 30;
      len = stream.uint;
      this.waves = new Uint8Array(stream.buffer, pos, len);

      pos += len;
      len = stream.uint;
      this.arpeggios = new Int8Array(stream.buffer, pos, len);

      pos += len;
      len = stream.uint;
      this.vibratos = new Int8Array(stream.buffer, pos, len);
      sheader = pos + len;

      stream.position = sheader + (this.samples.length * 64);
      len = ++higher;
      pointers = new Uint16Array(++higher);

      for (i = 0; i < len; i++) {
        pointers[i] = stream.ushort;
      }

      pos = stream.position;
      stream.position = 50;
      len = stream.uint;
      this.patterns.length = 0;
      stream.position = pos;

      j = 1;
      base = 0;

      for (i = 0; i < len; i++) {
        row = new Row();
        value = stream.byte;

        if (!value) {
          row.effect = stream.byte;
          row.param = stream.ubyte;
          i += 2;
        } else if (value < 0) {
          row.step = ~value;
        } else if (value < 112) {
          row.note = value;
          value = stream.byte;
          i++;

          if (value < 0) {
            row.step = ~value;
          } else if (value < 112) {
            row.sample = value;
            value = stream.byte;
            i++;

            if (value < 0) {
              row.step = ~value;
            } else {
              row.effect = value;
              row.param = stream.ubyte;
              i++;
            }
          } else {
            row.effect = value;
            row.param = stream.ubyte;
            i++;
          }
        } else {
          row.effect = value;
          row.param = stream.ubyte;
          i++;
        }

        this.patterns[base++] = row;

        if ((pos + pointers[j]) == stream.position) {
          pointers[j++] = base;
        }
      }

      pointers[j] = this.patterns.length;
      if (stream.position & 1) { stream.position++; }
      sdata = stream.position

      stream.position = sheader;
      len = this.samples.length;

      for (i = 0; i < len; i++) {
        sample = new S2Sample();
        stream.position += 4;
        sample.pointer = sdata;

        sample.length    = stream.ushort << 1;
        sample.loopPtr   = sdata + (stream.ushort << 1);
        sample.repeat    = stream.ushort << 1;
        sample.negStart  = sdata + (stream.ushort << 1);
        sample.negLen    = stream.ushort << 1;
        sample.negSpeed  = stream.ushort;
        sample.negDir    = stream.ushort;
        sample.negOffset = stream.short;
        sample.negPos    = stream.uint;
        sample.negCtr    = stream.ushort;

        stream.position += 6;
        sample.name = stream.readUTF8(32);
        sdata += sample.length;
        this.samples[i] = sample;
      }

      len = this.tracks.length;

      for (i = 0; i < len; i++) {
        step = this.tracks[i];
        step.pattern = pointers[step.pattern];
      }

      song.length++;
      version = 1;
    };

    process() {
      var voice = this.voices[0];
      var chan, instr, row, sample, value;

      this.arpeggioPos = (++this.arpeggioPos & 3);

      if (++this.tick >= this.speed) {
        this.tick = 0;

        do {
          chan = voice.channel;
          voice.note = 0;
          voice.enabled = 0;

          if (!this.patternPos) {
            voice.step = this.tracks[this.trackPos + (voice.index * song.length)];
            voice.pattern = voice.step.pattern;
            voice.speed = 0;
          }

          if (--voice.speed < 0) {
            row = voice.row = this.patterns[voice.pattern++];
            voice.speed = row.step;

            if (row.note) {
              voice.enabled = 1;
              voice.note = row.note + voice.step.transpose;
              chan.enabled = 0;
            }
          }

          voice.pitchBend = 0;

          if (voice.note) {
            voice.waveCtr      = voice.sustainCtr     = 0;
            voice.arpeggioCtr  = voice.arpeggioPos    = 0;
            voice.vibratoCtr   = voice.vibratoPos     = 0;
            voice.pitchBendCtr = voice.noteSlideSpeed = 0;
            voice.adsrPos = 4;
            voice.volume  = 0;

            if (row.sample) {
              voice.instrument = row.sample;
              voice.instr = this.instruments[voice.instrument + voice.step.soundtran];
              voice.sample = this.samples[this.waves[voice.instr.wave]];
            }

            voice.original = voice.note + this.arpeggios[voice.instr.arpeggio];
            chan.period = voice.period = PERIODS[voice.original];

            sample = voice.sample;
            chan.pointer = sample.pointer;
            chan.length  = sample.length;
            chan.enabled = voice.enabled;
            chan.pointer = sample.loopPtr;
            chan.length  = sample.repeat;

            cache[writePos].notes[voice.index] = voice.period;
          }
        } while (voice = voice.next);

        if (++this.patternPos == this.patternLen) {
          this.patternPos = 0;

          if (++this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        }

        voice = this.voices[0];
      }

      do {
        if (!voice.sample) { continue; }
        chan = voice.channel;

        sample = voice.sample;
        if (sample.negToggle) { continue; }
        sample.negToggle = 1;

        if (sample.negCtr) {
          sample.negCtr = (--sample.negCtr & 31);
        } else {
          sample.negCtr = sample.negSpeed;
          if (!sample.negDir) { continue; }

          value = sample.negStart + sample.negPos;
          mixer.memory[value] = ~mixer.memory[value];
          sample.negPos += sample.negOffset;
          value = sample.negLen - 1;

          if (sample.negPos < 0) {
            if (sample.negDir == 2) {
              sample.negPos = value;
            } else {
              sample.negOffset = -sample.negOffset;
              sample.negPos += sample.negOffset;
            }
          } else if (value < sample.negPos) {
            if (sample.negDir == 1) {
              sample.negPos = 0;
            } else {
              sample.negOffset = -sample.negOffset;
              sample.negPos += sample.negOffset;
            }
          }
        }
      } while (voice = voice.next);

      voice = this.voices[0];

      do {
        if (!voice.sample) { continue; }
        voice.sample.netToggle = 0;
      } while (voice = voice.next);

      voice = this.voices[0];

      do {
        chan = voice.channel;
        instr = voice.instr;

        switch (voice.adsrPos) {
          case 0:
            break;
          case 4: // attack
            voice.volume += instr.attackSpeed;

            if (instr.attackMax <= voice.volume) {
              voice.volume = instr.attackMax;
              voice.adsrPos--;
            }
            break;
          case 3: // decay
            if (!instr.decaySpeed) {
              voice.adsrPos--;
            } else {
              voice.volume -= instr.decaySpeed;

              if (instr.decayMin >= voice.volume) {
                voice.volume = instr.decayMin;
                voice.adsrPos--;
              }
            }
            break;
          case 2: // sustain
            if (voice.sustainCtr == instr.sustain) {
              voice.adsrPos--;
            } else {
              voice.sustainCtr++;
            }
            break;
          case 1: // release
            voice.volume -= instr.releaseSpeed;

            if (instr.releaseMin >= voice.volume) {
              voice.volume = instr.releaseMin;
              voice.adsrPos--;
            }
            break;
        }

        chan.volume = voice.volume >> 2;

        if (instr.waveLen) {
          if (voice.waveCtr == instr.waveDelay) {
            voice.waveCtr = instr.waveDelay - instr.waveSpeed;

            if (voice.wavePos == instr.waveLen) {
              voice.wavePos = 0;
            } else {
              voice.wavePos++;
            }

            sample = voice.sample = this.samples[this.waves[instr.wave + voice.wavePos]];
            chan.pointer = sample.pointer;
            chan.length = sample.length;
          } else {
            voice.waveCtr++;
          }
        }

        if (instr.arpeggioLen) {
          if (voice.arpeggioCtr == instr.arpeggioDelay) {
            voice.arpeggioCtr = instr.arpeggioDelay - instr.arpeggioSpeed;

            if (voice.arpeggioPos == instr.arpeggioLen) {
              voice.arpeggioPos = 0;
            } else {
              voice.arpeggioPos++;
            }

            value = voice.original + this.arpeggios[instr.arpeggio + voice.arpeggioPos];
            voice.period = PERIODS[value];
          } else {
            voice.arpeggioCtr++;
          }
        }

        row = voice.row;

        if (this.tick) {
          switch (row.effect) {
            case 0:
              break;
            case 0x70:  // arpeggio
              this.arpeggioFx[0] = row.param >> 4;
              this.arpeggioFx[2] = row.param & 0x0f;
              value = voice.original + this.arpeggioFx[this.arpeggioPos];
              voice.period = PERIODS[value];
              break;
            case 0x71:  // pitch up
              voice.pitchBend = -row.param;
              break;
            case 0x72:  // pitch down
              voice.pitchBend = row.param;
              break;
            case 0x73:  // volume up
              if (voice.adsrPos) { break; }
              if (instr) { voice.volume = instr.attackMax; }
              voice.volume += (row.param << 2);
              if (voice.volume >= 256) { voice.volume = -1; }
              break;
            case 0x74:  // volume down
              if (voice.adsrPos) { break; }
              if (instr) { voice.volume = instr.attackMax; }
              voice.volume -= (row.param << 2);
              if (voice.volume < 0) { voice.volume = 0; }
              break;
          }
        }

        switch (row.effect) {
          case 0:
            break;
          case 0x75:  // set adsr attack
            instr.attackMax = row.param;
            instr.attackSpeed = row.param;
            break;
          case 0x76:  // set pattern length
            this.patternLen = row.param;
            break;
          case 0x7c:  // set volume
            chan.volume = row.param
            voice.volume = row.param << 2;
            if (voice.volume >= 255) { voice.volume = 255; }
            break;
          case 0x7f:  // set speed
            value = row.param & 15;
            if (value) { this.speed = value; }
            break;
        }

        if (instr.vibratoLen) {
          if (voice.vibratoCtr == instr.vibratoDelay) {
            voice.vibratoCtr = instr.vibratoDelay - instr.vibratoSpeed;

            if (voice.vibratoPos == instr.vibratoLen) {
              voice.vibratoPos = 0;
            } else {
              voice.vibratoPos++;
            }

            voice.period += this.vibratos[instr.vibrato + voice.vibratoPos];
          } else {
            voice.vibratoCtr++;
          }
        }

        if (instr.pitchBend) {
          if (voice.pitchBendCtr == instr.pitchBendDelay) {
            voice.pitchBend += instr.pitchBend;
          } else {
            voice.pitchBendCtr++;
          }
        }

        if (row.param) {
          if (row.effect && row.effect < 0x70) {
            voice.noteSlideTo = PERIODS[row.effect + voice.step.transpose];
            value = row.param;
            if ((voice.noteSlideTo - voice.period) < 0) { value = -value; }
            voice.noteSlideSpeed = value;
          }
        }

        if (voice.noteSlideTo && voice.noteSlideSpeed) {
          voice.period += voice.noteSlideSpeed;

          if ((voice.noteSlideSpeed < 0 && voice.period < voice.noteSlideTo) ||
              (voice.noteSlideSpeed > 0 && voice.period > voice.noteSlideTo)) {
            voice.noteSlideSpeed = 0;
            voice.period = voice.noteSlideTo;
          }
        }

        voice.period += voice.pitchBend;

        if (voice.period < 95) {
          voice.period = 95;
        } else if (voice.period > 5760) {
          voice.period = 5760;
        }

        chan.period = voice.period;
      } while (voice = voice.next);

      position += mixer.ticksize;
    };

    tuning() {
      var i, n = 720, r = n, t = PERIODS;
      t.fill(0);

      for (i = 36; i < 48; i++) {
        t[i] = r;
        t[i - 36] = r << 3;
        t[i - 24] = r << 2;
        t[i - 12] = r << 1;
        t[i + 12] = r >> 1;
        t[i + 24] = Math.round(r / 4);
        r = (n *= 0.94424) * 0.99729;
      }

      t[8]  -= 2;
      t[20] -= 4;
      t[32] -= 8;
    };
  }

  class S2Instrument {
    constructor() {
      this.arpeggio       = 0;
      this.arpeggioDelay  = 0;
      this.arpeggioLen    = 0;
      this.arpeggioSpeed  = 0;
      this.attackMax      = 0;
      this.attackSpeed    = 0;
      this.decayMin       = 0;
      this.decaySpeed     = 0;
      this.pitchBend      = 0;
      this.pitchBendDelay = 0;
      this.releaseMin     = 0;
      this.releaseSpeed   = 0;
      this.sustain        = 0;
      this.vibrato        = 0;
      this.vibratoDelay   = 0;
      this.vibratoLen     = 0;
      this.vibratoSpeed   = 0;
      this.wave           = 0;
      this.waveDelay      = 0;
      this.waveLen        = 0;
      this.waveSpeed      = 0;
    };
  }

  class S2Sample extends Sample {
    constructor() {
      super();

      this.negCtr    = 0;
      this.negDir    = 0;
      this.negLen    = 0;
      this.negOffset = 0;
      this.negPos    = 0;
      this.negSpeed  = 0;
      this.negStart  = 0;
      this.negToggle = 0;
    };
  }

  class S2Voice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel        = null;
      this.step           = null;
      this.row            = null;
      this.instr          = null;
      this.sample         = null;
      this.enabled        = 0;
      this.pattern        = 0;
      this.instrument     = 0;
      this.note           = 0;
      this.period         = 0;
      this.volume         = 0;
      this.original       = 0;
      this.adsrPos        = 0;
      this.sustainCtr     = 0;
      this.pitchBend      = 0;
      this.pitchBendCtr   = 0;
      this.noteSlideTo    = 0;
      this.noteSlideSpeed = 0;
      this.waveCtr        = 0;
      this.wavePos        = 0;
      this.arpeggioCtr    = 0;
      this.arpeggioPos    = 0;
      this.vibratoCtr     = 0;
      this.vibratoPos     = 0;
      this.speed          = 0;
    };
  }

  window.neoart.Trackers.SidMon2 = function() {
    tracker = new SidMon2();
    return player;
  }

  class Mark2 extends Tracker {
    constructor() {
      super(Amiga);

      this.patterns = 0;
      this.pattLen  = 0;
      this.pattPos  = 0;
      this.periods  = 0;
      this.stream   = null;
      this.track    = 0;
      this.trackPos = 0;

      this.voices[0] = new M2Voice(0);
      this.voices[0].next = this.voices[1] = new M2Voice(1);
      this.voices[1].next = this.voices[2] = new M2Voice(2);
      this.voices[2].next = this.voices[3] = new M2Voice(3);

      ID.push(
        "Mark II Soundsystem v1",
        "Mark II Soundsystem v2",
        "Mark II Soundsystem v3"
      );

      this.samples.length = 56;
      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var index;
      var voice = this.voices[0];
      super.initialize();

      this.pattPos  = -4;
      this.trackPos = 8;
      this.tick     = 1;

      do {
        index = voice.index;
        voice.initialize();

        voice.channel = mixer.output[index];
        voice.channel.panning = (++index & 2) ? 1.0 : -1.0;
      } while (voice = voice.next);
    };

    parse(stream) {
      var i, sample, sdata;

      if (stream.length < 1290) { return; }
      stream.position = 840;

      if (stream.readUTF8(8) == ".ZADS89.") {
        version = 3;
        stream.position = 906;
        this.track = 1466;
      } else {
        stream.position = 672;

        if (stream.readUTF8(8) == ".ZADS89.") {
          version = 1;
          stream.position = 738;
          this.track = 1298;
        } else {
          stream.position = 828;

          if (stream.readUTF8(8) == ".ZADS89.") {
            version = 2;
            stream.position = 894;
            this.track = 1454;
          } else {
            stream.position = 188;

            if (stream.readUTF8(5) == "BPXJA") {
              version = 1;
              stream.position = 730;
              this.track = 1290;
            } else {
              return;
            }
          }
        }
      }

      this.patterns = this.track + stream.uint;
      sdata = this.track + stream.uint;
      song.length = stream.ushort << 3;
      this.pattLen = stream.ushort;

      for (i = 0; i < 56; i++) {
        sample = new Sample();
        sample.pointer = sdata + stream.int;
        stream.position += 2;
        sample.length = stream.ushort << 1;

        if (sample.length < 2) {
          sample.pointer = sdata;
          sample.length = 8;
        }

        this.samples[i] = sample;
      }

      this.periods = stream.position;
      this.stream = stream;
    };

    process() {
      var chan, com1, com2, note1, note2, param, period, sample, volume;
      var voice = this.voices[0];

      if (this.tick) {
        this.tick = 0;
        this.pattPos += 4;

        if (this.pattPos == this.pattLen) {
          this.pattPos = 0;

          if (this.trackPos == song.length) {
            this.trackPos = 0;
            mixer.complete = 1;
          }
        } else {
          this.trackPos -= 8;
        }

        do {
          chan = voice.channel;

          this.stream.position = this.track + this.trackPos;
          com2 = this.stream.ubyte * this.pattLen;
          com1 = this.stream.ubyte;

          this.stream.position = this.patterns + com2 + this.pattPos;
          com2 = com1 & ~96;

          sample = this.stream.ubyte;
          note1  = this.stream.ubyte;
          volume = this.stream.ubyte;
          param  = this.stream.ubyte;
          note2  = note1;

          voice.sampleno = sample;
          sample &= ~128;

          voice.sample = this.samples[sample];
          chan.pointer = voice.sample.pointer;
          chan.length  = voice.sample.length;

          if (voice.next) {
            if (volume & 128) {
              if (chan.panning < 0) {
                chan.panning = 1.0;
                voice.next.channel.panning = -1.0;
              } else {
                chan.panning = -1.0;
                voice.next.channel.panning = 1.0;
              }
            }
          }

          if (note1 == 50 && version > 2) {
            period = voice.period;
          } else {
            if (com2 & 128) {
              com2 &= ~128;
              note1 -= com2;
            } else {
              note1 += com2;
            }

            voice.note = note1;

            if (note2 & 128) {
              note2 &= ~128;

              if (param & 128) {
                period = voice.period + note2;
              } else {
                period = voice.period - note2;
              }
            } else {
              this.stream.position = this.periods + (note1 << 1);
              period = this.stream.ushort;
            }
          }

          voice.period = chan.period = period;
          voice.param = param;
          volume &= ~128;

          if (com1 & 32) {
            if (voice.volume1) {
              voice.volume1--;
              voice.volume2 = voice.volume1;

              if (voice.volume1 <= volume) {
                volume -= voice.volume1;
              } else {
                volume = 1;
              }
            }
          } else {
            voice.volume1 = 64;

            if (com1 & 64) {
              if (++voice.volume2 > 64) { voice.volume2 = 64; }
              voice.volume1 = voice.volume2;

              if (voice.volume2 <= volume) {
                volume -= voice.volume2;
              } else {
                volume = 1;
              }
            } else {
              voice.volume2 = 0;
            }
          }

          chan.volume = volume;
          this.trackPos += 2;

          if (param & 1) {
            voice.off = 0;
          } else {
            voice.off = 1;
          }

          chan.enabled = 1;
        } while (voice = voice.next);
      } else {
        this.tick = 1;

        do {
          chan = voice.channel;
          if (voice.off) { chan.enabled = 0; }

          if (version > 1) {
            if (voice.sampleno & 128) {
              note1 = voice.note & ~128;
              param = (voice.param >> 1) & ~64;

              if (param & 32) {
                period = note1 - (param & ~32);
              } else {
                period = note1 + param;
              }

              period <<= 1;
              this.stream.position = this.periods + period;
              chan.period = this.stream.ushort;
            }
          }
        } while (voice = voice.next);
      }

      position += mixer.ticksize;
    };
  }

  class M2Voice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel  = null;
      this.sample   = null;
      this.sampleno = 0;
      this.off      = 0;
      this.note     = 0;
      this.param    = 0;
      this.period   = 0;
      this.volume1  = 0;
      this.volume2  = 0;
    };
  }

  window.neoart.Trackers.Mark2 = function() {
    tracker = new Mark2();
    return player;
  }

  class Suntronic extends Tracker {
    constructor() {
      super(Amiga);

      this.arpeggios = 0;
      this.buffer    = 0;
      this.digital   = 0;
      this.fade      = 0;
      this.fadectr   = 0;
      this.fadespd   = 0;
      this.offset    = 0;
      this.periods   = 0;
      this.rnd1      = 0x4e76;
      this.rnd2      = 0x3218;
      this.stream    = null;
      this.volume    = 64;

      this.voices[0] = new SOVoice(0);
      this.voices[0].next = this.voices[1] = new SOVoice(1);
      this.voices[1].next = this.voices[2] = new SOVoice(2);
      this.voices[2].next = this.voices[3] = new SOVoice(3);

      ID[10] = "Suntronic v1";
      ID[11] = "Suntronic v1a";
      ID[20] = "Suntronic v2";
      ID[30] = "Suntronic v3";
      ID[31] = "Suntronic v3a";
      ID[40] = "Suntronic v4";
      ID[41] = "Suntronic v4a";

      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.buffer  = voice.v_k1;
      this.fade    = 0;
      this.fadectr = 0;
      this.fadespd = 0;
      this.offset  = 0;
      this.rnd1    = 0x4e76;
      this.rnd2    = 0x3218;
      this.volume  = 64;

      this.complete = 15;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];

        voice.v_k1.fill(0);
        voice.v_k2.fill(0);
        voice.v_k3.fill(0);

        this.stream.position = song.track + (voice.index << 2);
        voice.pattern = this.stream.uint;

        this.stream.position = song.track + (voice.index + 16);
        voice.transpose = this.stream.byte;
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var voice = this.voices[0];
      var i, id, inst1, inst2, pos, ptr, sample, song, total;

      stream.position = 34;
      id = stream.readUTF8(16);
      if (id != "FLOD Suntronic v") { return; }

      version = stream.readUTF8(2) >>> 0;

      this.list.length = 0;
      total = stream.ubyte;
      stream.position++;

      for (i = 0; i < total; i++) {
        song = new Song();
        song.track = stream.uint;
        this.list.push(song);
      }

      inst1          = stream.uint;
      inst2          = stream.uint;
      this.periods   = stream.uint;
      this.arpeggios = stream.uint;

      stream = stream.shrink(32, stream.length - 8);
      pos    = stream.length;
      stream = stream.extend(1536);

      this.samples.length = 0;
      stream.position = inst1;

      do {
        ptr = stream.uint;
        if (!ptr) { break; }

        sample = new SOSample();

        sample.envEnd   = stream.ushort;
        sample.envLoop  = stream.ushort;
        sample.envelope = new Int8Array(stream.buffer, ptr, sample.envEnd);

        ptr = stream.uint;
        sample.vibEnd   = stream.ushort;
        sample.vibLoop  = stream.ushort;
        sample.vibSpeed = stream.ushort;
        sample.vibrato  = new Int8Array(stream.buffer, ptr, sample.vibEnd);

        ptr = stream.uint;
        sample.megaEnd  = stream.ushort;
        sample.megaLoop = stream.ushort;
        sample.mega     = new Int8Array(stream.buffer, ptr, sample.megaEnd);

        if (version < 20) {
          sample.inst1ptr = stream.uint;
          sample.inst2ptr = stream.uint;

          sample.length = 32;

          sample.inst1 = new Int8Array(stream.buffer, sample.inst1ptr, 32);
          sample.inst2 = new Int8Array(stream.buffer, sample.inst2ptr, 32);
        } else {
          sample.effect = stream.readAt(stream.position + 9);

          if (sample.effect == 6) {
            sample.spd1   = stream.ushort;
            sample.spd2   = stream.ushort;
            sample.res    = stream.ubyte;
            sample.tim1   = stream.ubyte;
            sample.dep    = stream.ubyte;
            sample.spos   = stream.ubyte;
            sample.length = stream.ubyte << 1;
          } else {
            sample.inst1ptr = stream.uint;
            sample.inst2ptr = stream.uint;

            sample.length = stream.ubyte << 1;

            sample.inst1 = new Int8Array(stream.buffer, sample.inst1ptr, sample.length);
            sample.inst2 = new Int8Array(stream.buffer, sample.inst2ptr, sample.length);
          }

          stream.position++;
        }

        this.samples.push(sample);
      } while (stream.position < inst2);

      this.digital = this.samples.length;
      stream.position = inst2;

      do {
        ptr = stream.uint;
        if (!ptr) { break; }

        sample = new SOSample();

        sample.envEnd   = stream.ushort;
        sample.envLoop  = stream.ushort;
        sample.envelope = new Int8Array(stream.buffer, ptr, sample.envEnd);

        ptr = stream.uint;
        sample.vibEnd   = stream.ushort;
        sample.vibLoop  = stream.ushort;
        sample.vibSpeed = stream.ushort;
        sample.vibrato  = new Int8Array(stream.buffer, ptr, sample.vibEnd);

        sample.pointer = stream.uint;
        sample.length  = stream.ushort << 1;
        sample.loopPtr = stream.ushort << 1;
        sample.repeat  = stream.ushort << 1;

        stream.fill(0, sample.pointer, 4);

        this.samples.push(sample);
      } while (1);

      do {
        voice.buffer = pos;

        voice.v_k1 = new Int8Array(stream.buffer, pos, 128);
        pos += 128;
        voice.v_k2 = new Int8Array(stream.buffer, pos, 128);
        pos += 128;
        voice.v_k3 = new Int8Array(stream.buffer, pos, 128);
        pos += 128;
      } while (voice = voice.next);

      this.stream = stream;
      return stream;
    };

    process() {
      var voice = this.voices[0];
      var buf, chan, cur, i, len, n1, n2, note, pos, sample, sd1, sd2, step, value;

      if (this.fade) {
        if (--this.fadectr < 0) {
          this.fadectr = this.fadespd;
          this.volume += this.fade;

          if (this.volume < 0) {
            this.fade = 0;
            this.volume = 0;
          } else if (this.volume > 64) {
            this.fade = 0;
            this.volume = 64;
          }
        }
      }

      do {
        chan = voice.channel;
        voice.enabled = 0;

        if (this.offset == 0) {
          this.buffer = voice.v_k1;
        } else if (this.offset == 128) {
          this.buffer = voice.v_k2;
        } else {
          this.buffer = voice.v_k3;
        }

        if (voice.v_len) {
          voice.enabled = 1;

          chan.enabled = 0;
          chan.pointer = voice.v_adr;
          chan.length  = voice.v_len;
        }

        voice.v_adr2 = voice.v_adr;
        voice.v_rep2 = voice.v_rep;
        voice.v_rln2 = voice.v_rln;
        voice.v_len = 0;
        voice.v_rln = 0;

        if (!voice.v_novol)  { chan.volume = voice.v_vol1;
//if (voice.index == 3) { debug.log(voice.v_vol1,"vol"); }
         }

        if (!voice.v_nofreq) { chan.period = voice.v_freq;
//if (voice.index == 0) { debug.log(voice.v_freq,"freq"); }
         }

        if (voice.v_mod == -2) { continue; }

        if (++voice.v_c1 >= voice.v_spd) {
          voice.v_c1 = 0;

          if (++voice.patternPos == voice.patternLen) {
            voice.patternPos = 0;
            voice.trackPos += 20;

            this.stream.position = song.track + voice.trackPos;
            value = this.stream.int;

            if (value < 1) {
              this.complete &= ~(1 << voice.index);
              if (!this.complete) { mixer.complete = 1; }

              if (value == -1) {
                chan.enabled = 0;
                voice.v_mod = -2;
              } else {
                voice.trackPos = 0;

                this.stream.position = song.track + (voice.index << 2);
                value = this.stream.uint;
              }
            } else {
              this.stream.position = song.track + voice.trackPos + (voice.index << 2);
              value = this.stream.uint;
            }

            voice.pattern = value;
            this.stream.position = song.track + voice.trackPos + (voice.index + 16);
            voice.transpose = this.stream.byte;
          }

          this.stream.position = voice.pattern;

          do {
            value = this.stream.byte;

            if (value == 0) {
              voice.pattern = this.stream.position;
              break;
            } else if (value > 0) {
              voice.v_in = value;
            } else {
              switch (value) {
                case -100:  // arp
                  voice.v_arp = this.stream.ubyte;
                  voice.v_arpc = 0;
                  break;
                case -101:  // freq
                  if (version < 30) {
                    voice.v_sld = this.stream.byte;
                  } else {
                    voice.v_sld = this.stream.short;
                  }
                  break;
                case -102:  // vol
                  voice.v_vsl = this.stream.byte;
                  if (version >= 40) {
                    voice.v_vslsp = this.stream.ubyte;
                  }
                  break;
                case -103:  // vol2
                  voice.v_vol2 = this.stream.ubyte << 1;
                  voice.v_vsl = 0;
                  break;
                case -104:  // spd
                  value = this.stream.ubyte;
                  this.voices[0].v_spd = value;
                  this.voices[1].v_spd = value;
                  this.voices[2].v_spd = value;
                  this.voices[3].v_spd = value;
                  break;
                case -105:  // rnd
                  this.rnd1 = this.stream.ushort;
                  this.rnd2 = this.rnd1 ^ 0x7e28;
                  break;
                case -106:  // hl
                  voice.v_hkc = 0;
                  break;
                case -107:  // hl2
                  voice.v_mc = 0;
                  break;
                case -108:  // ton
                  voice.v_th = ((~this.stream.byte) - voice.transpose) << 8;
                  voice.v_sld = 0;
                  break;
                case -109:  // fd
                  this.fade = this.stream.byte;
                  this.fadespd = this.stream.ubyte;
                  break;
                case -110:  // fd2
                  this.volume = this.stream.ubyte;
                  this.fade = 0;
                  break;
                case -111:  // mod
                  break;
                case -112:  // fine
                  voice.v_th |= this.stream.ubyte;
                  break;
                case -113:  // spd2
                  voice.v_spd = this.stream.ubyte;
                  break;
                case -114:  // spd3
                  break;
                case -115:  // spdfd
                  break;
                case -116:  // plen
                  value = this.stream.ubyte;
                  this.voices[0].patternLen = value;
                  this.voices[1].patternLen = value;
                  this.voices[2].patternLen = value;
                  this.voices[3].patternLen = value;
                  break;
                case -117:  // plen2
                  voice.patternLen = this.stream.ubyte;
                  break;
                default:    // note
                  voice.v_th = ((~value) - voice.transpose) << 8;
                  voice.v_sld = 0;

                  value = this.stream.byte;

                  if (value > 0) {
                    voice.v_in = value;
                  } else {
                    this.stream.position--;
                  }

                  //cache[writePos].notes[voice.index] = voice.v_th;

                  if (!voice.v_in) { break; }
                  value = voice.v_in;

                  if (value & 64) {
                    sample = voice.sample = this.samples[value - 64];

                    voice.v_arp = voice.v_arpc = 0;
                    voice.v_mc  = 0;
                    voice.v_mod = 1;
                    voice.v_vc1 = voice.v_vc2 = 0;

                    voice.v_adr = voice.buffer + this.offset;
                    voice.v_len = sample.length;
                    voice.v_rln = sample.length;

                    voice.v_phc1 = sample.spos;
                    voice.v_phc2 = 0;
                  } else {
                    sample = voice.sample = this.samples[this.digital + (--value)];

                    voice.v_arp = voice.v_arpc = 0;
                    voice.v_mod = 0;
                    voice.v_vc1 = voice.v_vc2 = 0;

                    voice.v_adr = sample.pointer;
                    voice.v_len = sample.length;
                    voice.v_rep = sample.loopPtr;
                    voice.v_rln = sample.repeat;
                  }
                  break;
              }
            }
          } while (1);
        }

        if (voice.v_mod < 0) { continue; }
        sample = voice.sample;

        if (version < 40) {
          voice.v_vol1 = (sample.envelope[voice.v_hkc] * voice.v_vol2) >> 7;
        } else {
          value = (sample.envelope[voice.v_hkc] * voice.v_vol2) >> 6;
          voice.v_vol1 = (value * this.volume) >> 6;
        }

        pos = voice.v_vc1;
        if (pos < 0) { pos = -pos; }

/*
        pos -= 16384;
        pos *= sample.vibrato[voice.v_vc2];
        pos <<= 4;
        note = voice.v_th + (pos >> 16);
*/
        pos -= 16384;
        pos *= sample.vibrato[voice.v_vc2];
        pos >>= 12;
        note = voice.v_th + pos;

        if (version < 21) {
          pos = (voice.v_arp << 3) + voice.v_arpc;
        } else {
          pos = (voice.v_arp << 4) + voice.v_arpc;
        }

        this.stream.position = this.arpeggios + pos;
        value = ((note >> 8) - this.stream.byte) << 1;

        this.stream.position = this.periods + value;
        value = this.stream.ushort;

        note &= 0xff;

        if (note) {
          pos = this.stream.ushort - value;
          pos *= note;
          pos >>= 8;
          value += pos;
        }

        voice.v_freq = value;

        note = voice.v_th + voice.v_sld;

        if (note < 0) {   // this might be wrong
          note += 18432;
        } else if (note >= 18432) {
          note -= 18432;
        }

        voice.v_th = note;

        if (version >= 40) {
          if (voice.v_vsl) {
            if (--voice.v_vslc < 0) {
              voice.v_vslc = voice.v_vslsp;
              voice.v_vol2 += voice.v_vsl;

              if (voice.v_vol2 < 0) {
                voice.v_vsl  = 0;
                voice.v_vol2 = 0;
              } else if (voice.v_vol2 > 64) {
                voice.v_vol2 = 64;
              }
            }
          }
        } else {
          value = voice.v_vol2 + voice.v_vsl;

          if (value < 0) {
            value = 0;
          } else if (value > 128) {
            value = 128;
          }

          voice.v_vol1 = value;
        }

        if (version < 21) {
          voice.v_arpc = (++voice.v_arpc) & 7;
        } else {
          voice.v_arpc = (++voice.v_arpc) & 15;
        }

        if (++voice.v_hkc == sample.envEnd) {
          voice.v_hkc = sample.envLoop;
        }

        if (++voice.v_vc2 == sample.vibEnd) {
          voice.v_vc2 = sample.vibLoop;
        }

        voice.v_vc1 += sample.vibSpeed;
        if (voice.v_vc1 > 32767) { voice.v_vc1 -= 65536; }

        if (voice.enabled) { chan.enabled = 1; }

        if (voice.v_rln2) {
          chan.pointer = voice.v_adr2 + voice.v_rep2;
          chan.length  = voice.v_rln2;
        }

        if (voice.v_mod < 0 || !(voice.v_mod & 1)) { continue; }

        if (sample.effect != 5) {
          voice.v_adr = voice.buffer;
          voice.v_rep = this.offset;
          voice.v_rln = sample.length;
        }

        cur = sample.mega[voice.v_mc];
        len = sample.length - 1;

        switch (sample.effect) {
          case 0:   // mega-effect
            pos = voice.buffer + this.offset;
            sd1 = sample.inst1;
            sd2 = sample.inst2;

            for (i = 0; i < len; i++) {
              value = sd1[i];
              mixer.memory[pos++] = value + (((sd2[i] - value) * cur) >> 7);
            }
/*
            buf = this.buffer;
            sd1 = sample.inst1;
            sd2 = sample.inst2;

            for (i = 0; i < len; i++) {
              value = sd1[i];
              buf[i] = value + (((sd2[i] - value) * cur) >> 7);
            }
*/
            break;
          case 1:   // audiomaster-filter
            buf = this.buffer;

            if (cur == -1) {
              // rauschen should be good for version 3
              n1 = this.rnd1;

              for (i = 0; i <= len;) {
                n1 = (n1 * n1) >>> 8;
                n1 ^= 0xac91;
                n1 &= 0xffff;

                buf[i++] = (n1 >> 8) & 0xff;
                buf[i++] = n1 & 0xff;
              }

              n2 = this.rnd2;
              n2 = (n2 * n2) >>> 8;
              n2 ^= 0x6e47;
              n2 &= 0xffff;

              this.rnd2 = n2;
              this.rnd1 = n1 ^ n2;
            } else {
              if (cur == -2) { cur = sample.mega[voice.v_mc + 1]; }

              if (voice.v_mod & 2) {
                if (this.offset == 0) {
                  sd1 = voice.v_k3;
                } else if (this.offset == 128) {
                  sd1 = voice.v_k1;
                } else {
                  sd1 = voice.v_k2;
                }
                //sd1 = this.buffer;//voice.buffer + this.offset;
              } else {
                sd1 = sample.inst1;
                voice.v_mod |= 2;
              }

              if (cur < 0) {
                // highpass
                n1 = -cur;
                n2 = sd1[len];
                pos = n2;

                for (i = 0; i <= len; i++) {
                  sd2 = sd1[i];
                  cur = sd2;
                  sd2 -= pos;
                  pos = cur;
                  n2 += sd2;
                  n2 *= n1;
                  n2 >>= 7;
                  buf[i] = n2;
                }
              }

              n1 = 128 - cur;
              n2 = sd1[len];

              for (i = 0; i <= len; i++) {
                cur = sd1[i] - n2;
                cur *= n1;
                cur >>= 7;
                n2 += cur;
                buf[i] = n2;
              }
            }
            break;
          case 2:   // c64-effect
            buf = voice.buffer + this.offset;

            sd2 = sample.inst2ptr;
            mixer.memory.copyWithin(buf, sd2, (sd2 + cur));

            buf += cur;
            len -= cur;

            if (len) {
              sd1 = sample.inst1ptr;
              mixer.memory.copyWithin(buf, sd1, (sd1 + len + 1));
            }
            break;
          case 3:   // sonix-phase / mega range is 0-64
            value = (version >= 40) ? 32768 : 16384;

            pos = 0;
            cur += 64;
            sd1 = (cur * len) >> 7;

            if (sd1) {
              sd2 = (value / cur) << 8;

              for (i = 0; i <= sd1; i++) {
                this.buffer[i] = sample.inst1[pos >>> 16];
                pos += sd2;
              }
            }

            sd1 = len - sd1;

            if (sd1) {
              cur = 128 - cur;
              sd2 = (value / cur) << 8;
              sd1 += i;

              for (; i < sd1; i++) {
                this.buffer[i] = sample.inst1[pos >>> 16];
                pos += sd2;
              }
            }
            break;
          case 4:   // sonix-filter
            value = (version >= 4) ? sample.res : 49152;
            // some replays have 0 instead of 49152 (previous to version 4)

            if (voice.v_mod & 2) {
              buf = this.buffer;
            } else {
              buf = sample.inst1;
              voice.v_mod |= 2;
            }

            sd1 = 38 * cur;
            cur += 32;
            pos = ((1048544 / cur) >>> 0) - sd1;

            sd1 = (((32767 - pos) * value) >> 16) & 0xffff;
            if (sd1 > 32767) { sd1 -= 65536; }

            n2 = buf[len];
            n1 = n2 << 7;
            n2 = (n2 - buf[len - 1]) << 7;

            for (i = 0; i <= len; i++) {
              n2 = ((n2 * sd1) >> 16) << 1;
              if (version >= 40 && n2 < 0) { n2++; }

              sd2 = sample.inst1[i] << 7;
              sd2 = (sd2 - n1) * pos;

              sd2 = (sd2 >> 16) << 1;
              if (version >= 40 && sd2 < 0) { sd2++; }

              n2 += sd2;
              this.buffer[i] = (n1 += n2) >> 7;
            }
            break;
          case 5:   // fast 64
            if (version < 40) {
              if (!(voice.v_mod & 2)) {
                voice.v_mod |= 2;
                mixer.memory.copyWithin((voice.buffer + this.offset), sample.inst1ptr, (sample.inst1ptr + sample.length));
              }
            } else {
              voice.v_adr = sample.inst1ptr + (cur << 1);
              voice.v_rln = sample.length;
              voice.v_rep = 0;
            }
            break;
          case 6:   // c64 + sonix-filter
            buf = voice.buffer + this.offset;

            if (voice.v_phc2 >= 0) {
              if (++voice.v_phc2 == sample.tim1) {
                voice.v_phc2 = -1;
              }
            }

            if (voice.v_phc2 < 0) {
              value = sample.spd2;
            } else {
              value = sample.spd1;
            }

            voice.v_phc1 += value;
            if (voice.v_phc1 > 32767) { voice.v_phc1 -= 65536; }

            value = voice.v_phc1;
            if (value < 0) { value = -value; }

            value *= sample.dep;
            value >>= 8;
            n2 = len + 1;
            value *= n2;
            value >>= 16;
            n2 >>= 1;
            n2 += value;
            n2--;
            len -= n2;

            sd1 = 38 * cur;
            cur += 32;
            pos = ((1048544 / cur) >>> 0) - sd1;

            sd1 = ((32767 - pos) * sample.res) >> 8;
            if (sd1 > 32767) { sd1 -= 65536; }

            var afrika = 128*30;
            n1 = 0;
            var sign = 0;

            for (i = 0; i <= len; i++) {
              n1 *= sd1;
              sign = n1 & 32768;
              n1 = (n1 >> 16) << 1;
              if (sign) { n1++; }

              sd2 = (-128*30) - afrika;
              sd2 *= pos;
              sign = sd2 & 32768;
              sd2 = (sd2 >> 16) << 1;
              if (sign) { sd2++; }

              n1 += sd2;
              afrika += n1;
              mixer.memory[buf++] = afrika >> 7;
            }

            for (i = 0; i <= n2; i++) {
              n1 *= sd1;
              sign = n1 & 32768;
              n1 = (n1 >> 16) << 1;
              if (sign) { n1++; }

              sd2 = (128*30) - afrika;
              sd2 *= pos;
              sign = sd2 & 32768;
              sd2 = (sd2 >> 16) << 1;
              if (sign) { sd2++; }

              n1 += sd2;
              afrika += n1;
              mixer.memory[buf++] = afrika >> 7;
            }
            break;
        }

        if (++voice.v_mc == sample.megaEnd) {
          voice.v_mc = sample.megaLoop;
        }
      } while (voice = voice.next);

      this.offset += 128;
      if (this.offset > 256) { this.offset = 0; }

      position += mixer.ticksize;
    };
  }

  class SOSample extends Sample {
    constructor() {
      super();

      this.envelope = null;
      this.envEnd   = 0;
      this.envLoop  = 0;
      this.vibrato  = null;
      this.vibEnd   = 0;
      this.vibLoop  = 0;
      this.vibSpeed = 0;
      this.mega     = null;
      this.megaEnd  = 0;
      this.megaLoop = 0;
      this.inst1    = null;
      this.inst1ptr = 0;
      this.inst2    = null;
      this.inst2ptr = 0;
      this.effect   = 0;
      this.spd1     = 0;
      this.spd2     = 0;
      this.res      = 0;
      this.tim1     = 0;
      this.dep      = 0;
      this.spos     = 0;
    };
  }

  class SOVoice {
    constructor(index) {
      this.index = index;
      this.next = null;

      this.buffer = 0;
      this.v_k1 = null;
      this.v_k2 = null;
      this.v_k3 = null;
      this.initialize();
    };

    initialize() {
      this.channel    = null;
      this.sample     = null;
      this.enabled    = 0;
      this.trackPos   = 0;
      this.transpose  = 0;
      this.pattern    = 0;
      this.patternLen = 16;
      this.patternPos = -1;
      this.v_th       = 0;
      this.v_sld      = 0;
      this.v_freq     = 0;
      this.v_vol1     = 0;
      this.v_vol2     = 16384;
      this.v_vsl      = 0;
      this.v_vslc     = 0;
      this.v_vslsp    = 0;
      this.v_arp      = 0;
      this.v_arpc     = 0;
      this.v_hkc      = 0;
      this.v_mc       = 0;
      this.v_mod      = -1;
      this.v_in       = 0;
      this.v_adr      = 0;
      this.v_len      = 0;
      this.v_rep      = 0;
      this.v_rln      = 0;
      this.v_adr2     = 0;
      this.v_rep2     = 0;
      this.v_rln2     = 0;
      this.v_c1       = 5;
      this.v_spd      = 6;
      this.v_vc1      = 0;
      this.v_vc2      = 0;
      this.v_phc1     = 0;
      this.v_phc2     = 0;
      this.v_novol    = 0;
      this.v_nofreq   = 0;
    };
  }

  window.neoart.Trackers.Suntronic = function() {
    tracker = new Suntronic();
    return player;
  }

  class Beathoven extends Tracker {
    constructor() {
      super(Amiga);

      this.empty   = 0;
      this.periods = 0;
      this.stream  = null;
      this.timer   = 0;

      this.voices[0] = new BTVoice(0);
      this.voices[1] = new BTVoice(1);
      this.voices[2] = new BTVoice(2);
      this.voices[3] = new BTVoice(3);

      ID.push("Beathoven Synthesizer");

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var i, value;
      super.initialize();

      value = song.channels;
      channels = value--;
      this.voices[value].next = null;

      for (i = 0; i < value;) {
        this.voices[i].next = this.voices[++i];
      }

      if (this.timer) { mixer.ticksize = this.timer; }

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];

        this.complete += (1 << voice.index);

        voice.track = song.tracks[voice.index];
        voice.restart = song.restart[voice.index];

        this.stream.position = voice.track;
        voice.pattern = this.stream.uint;

        if (variant) {
          voice.transpose = this.stream.int;
        } else {
          this.stream.position += 2;
          voice.transpose = this.stream.short;
        }
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var i, song, total;

      stream.position = 36;
      if (stream.readUTF8(27) != "FLOD Beathoven Synthesizer ") { return; }

      if (stream.readUTF8(3) != "100") {
        mixer.process = this.process.bind(this);
      } else {
        mixer.process = this.process100.bind(this);
        variant = 1;
      }

      stream = stream.shrink(32, stream.length - 2);

      stream.position = 34;
      this.periods = stream.uint;

      this.list.length = 0;
      total = stream.ushort;

      this.timer = stream.ushort;

      for (i = 0; i < total; i++) {
        song = new Song();
        song.restart = [];
        song.transpose = [];

        song.tracks.push(stream.uint);
        song.tracks.push(stream.uint);
        song.tracks.push(stream.uint);
        song.tracks.push(stream.uint);

        song.restart.push(stream.uint);
        song.restart.push(stream.uint);
        song.restart.push(stream.uint);
        song.restart.push(stream.uint);

        song.transpose.push(stream.byte);
        song.transpose.push(stream.byte);
        song.transpose.push(stream.byte);
        song.transpose.push(stream.byte);

        song.speed = stream.ubyte;
        song.channels = stream.ubyte;

        this.list.push(song);
      }

      this.empty = stream.length - 6;

      version = 1;
      this.stream = stream;
      return stream;
    };

    process() {
      var voice = this.voices[0];
      var chan, flag, loop, value;

      do {
        chan = voice.channel;
        flag = 0;

        if (voice.flags & 12) {
          chan.pointer = this.empty;
          chan.length  = 2;
        } else {
          value = voice.pointer + voice.loop;
          chan.pointer = value;
          chan.length  = (voice.pointer + voice.repeat) - value;
        }

        if (--voice.tick == 0) {
          loop = 1;

          do {
            voice.flags &= ~8;

            this.stream.position = voice.pattern;
            value = this.stream.short;

            if (!value) {
              voice.track += 8;
              this.stream.position = voice.track;
              value = this.stream.uint;

              if (!value) {
                this.complete &= ~(1 << voice.index);
                if (!this.complete) { mixer.complete = 1; }

                voice.track = voice.restart;
                this.stream.position = voice.track;
                value = this.stream.uint;
              }

              voice.pattern = value;
              this.stream.position += 2;
              voice.transpose = this.stream.short;
              continue;
            }

            if (value != 0x83) {
              voice.flags &= ~16;
              chan.enabled = 0;
              flag = 1;
            }

            switch (value) {
              case 0x80:
                voice.sample = this.stream.uint;
                this.stream.position = voice.sample;

                chan.volume   = this.stream.ushort;
                voice.length  = this.stream.ushort;
                voice.loop    = this.stream.ushort;
                voice.repeat  = this.stream.ushort;
                voice.pointer = this.stream.uint;

                if (this.stream.ushort) {
                  voice.flags |= 4;
                  voice.setLen = voice.length;
                } else {
                  voice.flags &= ~4;
                  voice.setLen = voice.loop;
                }

                chan.pointer = voice.pointer;
                chan.length  = voice.setLen;

                voice.pattern += 6;
                continue;
              case 0x81:
                voice.portaSpeed = this.stream.short;

                if (voice.portaSpeed) {
                  voice.flags |= 1;
                  chan.enabled = 1;
                } else {
                  voice.flags &= ~1;
                }

                voice.pattern += 4;
                continue;
              case 0x82:
                if (this.stream.ushort) {
                  voice.flags |= 2;
                  chan.enabled = 1;
                } else {
                  voice.flags &= ~2;
                }

                voice.pattern += 4;
                continue;
              case 0x83:
                voice.flags |= 8;

                if (voice.flags & 4) {
                  flag = 1;
                  chan.enabled = 0;

                  chan.pointer = voice.pointer + voice.repeat;
                  chan.length  = voice.length  - voice.repeat;
                }

                voice.tick = this.stream.ushort * song.speed;
                voice.pattern += 4;
                loop = 0;
                break;
              case 0x84:
                voice.flags |= 16;
                voice.tick   = this.stream.ushort * song.speed;
                voice.arpLen = this.stream.ushort;
                voice.arpPtr = this.stream.position;
                voice.arpCtr = 0;

                if (!(voice.flags & 3)) {
                  chan.pointer = voice.pointer;
                  chan.length  = voice.setLen;
                }

                voice.pattern += ((voice.arpLen * 2) + 6);
                loop = 0;
                break;
              case 0x85:
                voice.note = this.stream.short;
                voice.pattern += 4;
                continue;
              default:
                voice.tick = this.stream.ushort * song.speed;

                value--;
                value += (voice.note + voice.transpose + song.transpose[voice.index]);
                value <<= 1;

                this.stream.position = this.periods + value;
                voice.period = this.stream.ushort;

                if (!(voice.flags & 3)) {
                  chan.pointer = voice.pointer;
                  chan.length  = voice.setLen;
                }

                voice.pattern += 4;
                loop = 0;
                break;
            }
          } while (loop);
        }

        if (voice.flags & 16) {
          value = voice.arpCtr * 2;
          this.stream.position = voice.arpPtr + value;
          value = this.stream.short;

          value--;
          value += (voice.note + voice.transpose + song.transpose[voice.index]);
          value <<= 1;

          if (value > 52) { value = 52; }

          this.stream.position = this.periods + value;
          voice.period = this.stream.ushort;

          if (++voice.arpCtr == voice.arpLen) { voice.arpCtr = 0; }

          voice.portaPeriod = voice.period;
        } else if (voice.flags & 1) {
          if (voice.portaPeriod < voice.period) {
            voice.portaPeriod += voice.portaSpeed;

            if (voice.portaPeriod > voice.period) {
              voice.portaPeriod = voice.period;
            }
          } else if (voice.portaPeriod > voice.period) {
            voice.portaPeriod -= voice.portaSpeed;

            if (voice.portaPeriod < voice.period) {
              voice.portaPeriod = voice.period;
            }
          }
        } else {
          voice.portaPeriod = voice.period;
        }

        chan.period = voice.portaPeriod;

        if (!flag || !(voice.flags & 3)) { chan.enabled = 1; }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };

    process100() {
      var voice = this.voices[0];
      var chan, loop, value;

      do {
        chan = voice.channel;
        chan.pointer = this.empty;
        chan.length  = 2;

        if (--voice.tick == 0) {
          voice.arpeggio = 0;
          loop = 1;

          do {
            this.stream.position = voice.pattern;
            value = this.stream.ushort;

            if (!value) {
              voice.track += 8;
              this.stream.position = voice.track;
              value = this.stream.uint;

              if (!value) {
                this.complete &= ~(1 << voice.index);
                if (!this.complete) { mixer.complete = 1; }

                voice.track = voice.restart;
                this.stream.position = voice.track;
                value = this.stream.uint;
              }

              voice.pattern = value;
              voice.transpose = this.stream.int;
              continue;
            }

            switch (value) {
              case 0x80:
                voice.sample = this.stream.uint;
                voice.pattern += 6;
                break;
              case 0x81:
                voice.arpeggio++;
                voice.tick = this.stream.ushort;

                if (song.speed) {
                  voice.tick = (voice.tick >> 2) * song.speed;
                }

                value = this.stream.ushort;
                voice.arpLen = value;
                voice.arpPtr = this.stream.position;

                value = (value + 3) * 2;
                voice.pattern += value;

                voice.flags = 1;
                this.setChannel(voice);

                voice.flags = 3;
                this.stream.position = voice.sample + 2;
                voice.length  = this.stream.uint;
                voice.pointer = this.stream.uint;
                this.setChannel(voice);

                loop = 0;
                break;
              case 0x82:
                voice.tick = this.stream.ushort;

                if (song.speed) {
                  voice.tick = (voice.tick >> 2) * song.speed;
                }

                voice.pattern += 4;

                voice.flags = 1;
                this.setChannel(voice);

                loop = 0;
                break;
              default:
                voice.flags = 1;
                this.setChannel(voice);

                voice.tick = this.stream.ushort;

                if (song.speed) {
                  voice.tick = (voice.tick >> 2) * song.speed;
                }

                value += voice.transpose;
                value += song.transpose[voice.index];
                value = (value - 1) * 2;

                this.stream.position = this.periods + value;
                voice.period = this.stream.ushort;

                voice.flags = 3;
                this.stream.position = voice.sample;
                voice.volume  = this.stream.ushort;
                voice.length  = this.stream.uint;
                voice.pointer = this.stream.uint;
                this.setChannel(voice);

                voice.flags = 12;
                this.setChannel(voice);

                voice.pattern += 4;
                loop = 0;
                break;
            }
          } while (loop);
        }

        if (voice.arpeggio) {
          value = voice.arpCtr * 2;
          this.stream.position = voice.arpPtr + value;
          value = this.stream.short;

          value += voice.transpose;
          value += song.transpose[voice.index];
          value = (value - 1) * 2;

          this.stream.position = this.periods + value;
          voice.period = this.stream.ushort;

          voice.flags = 12;
          this.stream.position = voice.sample;
          voice.volume = this.stream.ushort;
          this.setChannel(voice);

          if (++voice.arpCtr == voice.arpLen) { voice.arpCtr = 0; }
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    }

    setChannel(voice) {
      var chan = voice.channel;

      if (voice.flags == 3) {
        chan.pointer = voice.pointer;
        chan.length  = voice.length;
        chan.enabled = 1;
      } else if (voice.flags == 12) {
        chan.volume = voice.volume;
        chan.period = voice.period;
      } else if (voice.flags == 1) {
        chan.enabled = 0;
        chan.reset();
      }
    };
  }

  class BTVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel     = null;
      this.track       = 0;
      this.restart     = 0;
      this.pattern     = 0;
      this.tick        = 1;
      this.flags       = 0;
      this.note        = 0;
      this.period      = 0;
      this.transpose   = 0;
      this.portaPeriod = 0;
      this.portaSpeed  = 0;
      this.arpeggio    = 0;
      this.arpLen      = 0;
      this.arpPtr      = 0;
      this.arpCtr      = 0;
      this.sample      = 0;
      this.pointer     = 0;
      this.loop        = 0;
      this.repeat      = 0;
      this.length      = 0;
      this.volume      = 0;
      this.setLen      = 0;
    };
  }

  window.neoart.Trackers.Beathoven = function() {
    tracker = new Beathoven();
    return player;
  }

  const MUGICIAN1 = 1;
  const MUGICIAN2 = 2;

  class DigitalMugician extends Tracker {
    constructor() {
      super(Amiga);

      this.arpeggios  = null;
      this.averages   = null;
      this.buffer1    = 0;
      this.buffer2    = 0;
      this.calcPhase  = 0;
      this.chans      = 0;
      this.list2      = [];
      this.mixChannel = null;
      this.mixPeriod  = 0;
      this.patternEnd = 0;
      this.patternLen = 0;
      this.patternPos = 0;
      this.patterns   = [];
      this.song2      = null;
      this.stepEnd    = 0;
      this.trackPos   = 0;
      this.volumes    = null;

      this.voices[0] = new MGVoice(0);
      this.voices[0].next = this.voices[1] = new MGVoice(1);
      this.voices[1].next = this.voices[2] = new MGVoice(2);
      this.voices[2].next = this.voices[3] = new MGVoice(3);

      this.voices[4] = new MGVoice(4);
      this.voices[4].next = this.voices[5] = new MGVoice(5);
      this.voices[5].next = this.voices[5] = new MGVoice(6);

      ID.push("Digital Mugician", "Digital Mugician 7 Voices");

      mixer.process = this.process.bind(this);
      this.tables();

      PERIODS.set([
      /*4825,4554,4299,4057,3830,3615,3412,*/3220,3040,2869,2708,2556,
        2412,2277,2149,2029,1915,1807,1706,1610,1520,1434,1354,1278,
        1206,1139,1075,1014, 957, 904, 853, 805, 760, 717, 677, 639,
         603, 569, 537, 507, 479, 452, 426, 403, 380, 359, 338, 319,
         302, 285, 269, 254, 239, 226, 213, 201, 190, 179, 169, 160,
         151, 142, 134, 127,
        4842,4571,4314,4072,3843,3628,3424,3232,3051,2879,2718,2565,
        2421,2285,2157,2036,1922,1814,1712,1616,1525,1440,1359,1283,
        1211,1143,1079,1018, 961, 907, 856, 808, 763, 720, 679, 641,
         605, 571, 539, 509, 480, 453, 428, 404, 381, 360, 340, 321,
         303, 286, 270, 254, 240, 227, 214, 202, 191, 180, 170, 160,
         151, 143, 135, 127,
        4860,4587,4330,4087,3857,3641,3437,3244,3062,2890,2728,2574,
        2430,2294,2165,2043,1929,1820,1718,1622,1531,1445,1364,1287,
        1215,1147,1082,1022, 964, 910, 859, 811, 765, 722, 682, 644,
         607, 573, 541, 511, 482, 455, 430, 405, 383, 361, 341, 322,
         304, 287, 271, 255, 241, 228, 215, 203, 191, 181, 170, 161,
         152, 143, 135, 128,
        4878,4604,4345,4102,3871,3654,3449,3255,3073,2900,2737,2584,
        2439,2302,2173,2051,1936,1827,1724,1628,1536,1450,1369,1292,
        1219,1151,1086,1025, 968, 914, 862, 814, 768, 725, 684, 646,
         610, 575, 543, 513, 484, 457, 431, 407, 384, 363, 342, 323,
         305, 288, 272, 256, 242, 228, 216, 203, 192, 181, 171, 161,
         152, 144, 136, 128,
        4895,4620,4361,4116,3885,3667,3461,3267,3084,2911,2747,2593,
        2448,2310,2181,2058,1943,1834,1731,1634,1542,1455,1374,1297,
        1224,1155,1090,1029, 971, 917, 865, 817, 771, 728, 687, 648,
         612, 578, 545, 515, 486, 458, 433, 408, 385, 364, 343, 324,
         306, 289, 273, 257, 243, 229, 216, 204, 193, 182, 172, 162,
         153, 144, 136, 129,
        4913,4637,4377,4131,3899,3681,3474,3279,3095,2921,2757,2603,
        2456,2319,2188,2066,1950,1840,1737,1639,1547,1461,1379,1301,
        1228,1159,1094,1033, 975, 920, 868, 820, 774, 730, 689, 651,
         614, 580, 547, 516, 487, 460, 434, 410, 387, 365, 345, 325,
         307, 290, 274, 258, 244, 230, 217, 205, 193, 183, 172, 163,
         154, 145, 137, 129,
        4931,4654,4393,4146,3913,3694,3486,3291,3106,2932,2767,2612,
        2465,2327,2196,2073,1957,1847,1743,1645,1553,1466,1384,1306,
        1233,1163,1098,1037, 978, 923, 872, 823, 777, 733, 692, 653,
         616, 582, 549, 518, 489, 462, 436, 411, 388, 366, 346, 326,
         308, 291, 275, 259, 245, 231, 218, 206, 194, 183, 173, 163,
         154, 145, 137, 130,
        4948,4671,4409,4161,3928,3707,3499,3303,3117,2942,2777,2621,
        2474,2335,2204,2081,1964,1854,1750,1651,1559,1471,1389,1311,
        1237,1168,1102,1040, 982, 927, 875, 826, 779, 736, 694, 655,
         619, 584, 551, 520, 491, 463, 437, 413, 390, 368, 347, 328,
         309, 292, 276, 260, 245, 232, 219, 206, 195, 184, 174, 164,
         155, 146, 138, 130,
        4966,4688,4425,4176,3942,3721,3512,3315,3129,2953,2787,2631,
        2483,2344,2212,2088,1971,1860,1756,1657,1564,1477,1394,1315,
        1242,1172,1106,1044, 985, 930, 878, 829, 782, 738, 697, 658,
         621, 586, 553, 522, 493, 465, 439, 414, 391, 369, 348, 329,
         310, 293, 277, 261, 246, 233, 219, 207, 196, 185, 174, 164,
         155, 146, 138, 131,
        4984,4705,4441,4191,3956,3734,3524,3327,3140,2964,2797,2640,
        2492,2352,2220,2096,1978,1867,1762,1663,1570,1482,1399,1320,
        1246,1176,1110,1048, 989, 934, 881, 832, 785, 741, 699, 660,
         623, 588, 555, 524, 495, 467, 441, 416, 392, 370, 350, 330,
         312, 294, 278, 262, 247, 233, 220, 208, 196, 185, 175, 165,
         156, 147, 139, 131,
        5002,4722,4457,4206,3970,3748,3537,3339,3151,2974,2807,2650,
        2501,2361,2228,2103,1985,1874,1769,1669,1576,1487,1404,1325,
        1251,1180,1114,1052, 993, 937, 884, 835, 788, 744, 702, 662,
         625, 590, 557, 526, 496, 468, 442, 417, 394, 372, 351, 331,
         313, 295, 279, 263, 248, 234, 221, 209, 197, 186, 175, 166,
         156, 148, 139, 131,
        5020,4739,4473,4222,3985,3761,3550,3351,3163,2985,2818,2659,
        2510,2369,2236,2111,1992,1881,1775,1675,1581,1493,1409,1330,
        1255,1185,1118,1055, 996, 940, 887, 838, 791, 746, 704, 665,
         628, 592, 559, 528, 498, 470, 444, 419, 395, 373, 352, 332,
         314, 296, 280, 264, 249, 235, 222, 209, 198, 187, 176, 166,
         157, 148, 140, 132,
        5039,4756,4489,4237,3999,3775,3563,3363,3174,2996,2828,2669,
        2519,2378,2244,2118,2000,1887,1781,1681,1587,1498,1414,1335,
        1260,1189,1122,1059,1000, 944, 891, 841, 794, 749, 707, 667,
         630, 594, 561, 530, 500, 472, 445, 420, 397, 374, 353, 334,
         315, 297, 281, 265, 250, 236, 223, 210, 198, 187, 177, 167,
         157, 149, 140, 132,
        5057,4773,4505,4252,4014,3788,3576,3375,3186,3007,2838,2679,
        2528,2387,2253,2126,2007,1894,1788,1688,1593,1503,1419,1339,
        1264,1193,1126,1063,1003, 947, 894, 844, 796, 752, 710, 670,
         632, 597, 563, 532, 502, 474, 447, 422, 398, 376, 355, 335,
         316, 298, 282, 266, 251, 237, 223, 211, 199, 188, 177, 167,
         158, 149, 141, 133,
        5075,4790,4521,4268,4028,3802,3589,3387,3197,3018,2848,2688,
        2538,2395,2261,2134,2014,1901,1794,1694,1599,1509,1424,1344,
        1269,1198,1130,1067,1007, 951, 897, 847, 799, 754, 712, 672,
         634, 599, 565, 533, 504, 475, 449, 423, 400, 377, 356, 336,
         317, 299, 283, 267, 252, 238, 224, 212, 200, 189, 178, 168,
         159, 150, 141, 133,
        5093,4808,4538,4283,4043,3816,3602,3399,3209,3029,2859,2698,
        2547,2404,2269,2142,2021,1908,1801,1700,1604,1514,1429,1349,
        1273,1202,1134,1071,1011, 954, 900, 850, 802, 757, 715, 675,
         637, 601, 567, 535, 505, 477, 450, 425, 401, 379, 357, 337,
         318, 300, 284, 268, 253, 238, 225, 212, 201, 189, 179, 169,
         159, 150, 142, 134
      ]);

      return Object.seal(this);
    };

    calculate(single) {
      this.calcPhase = true;
      super.calculate(single);
      this.calcPhase = false;
    };

    initialize() {
      var voice = this.voices[0];
      var chan, len;
      super.initialize();

      this.patternEnd = 1;
      this.patternLen = 64;
      this.patternPos = 0;
      this.speed      = song.speed & 0x0f;
      this.speed     |= this.speed << 4;
      this.stepEnd    = 1;
      this.tick       = song.speed;
      this.trackPos   = 0;

      do {
        voice.initialize();
        voice.sample = this.samples[0];

        if (voice.index < 4) {
          chan = voice.channel = mixer.output[voice.index];
          chan.enabled = 0;
          chan.pointer = 0;
          chan.length  = 2;
          chan.period  = 124;
          chan.volume  = 0;
        }
      } while (voice = voice.next);

      if (version == MUGICIAN2) {
        this.song2 = this.list2[current];

        if (!this.mixChannel) {
          this.mixChannel = new AmigaChannel(7);
        }

        chan = mixer.output[3];
        chan.mute = 0;

        if (this.buffer1 > this.buffer2) {
          len = this.buffer2;
          this.buffer2 = this.buffer1;
          this.buffer1 = len;
        }

        chan.pointer = this.buffer1;
        chan.length = 350;
        chan.period = this.mixPeriod;
        chan.volume = 64;

        mixer.memory.fill(0, this.buffer1, this.buffer1 + 700);
      }
    };

    parse(stream) {
      var id = stream.readUTF8(24);
      var songs = [];
      var i, index, j, len, pos, row, sample, sdata, song, step;

      if (id == " MUGICIAN/SOFTEYES 1990 ") {
        version = MUGICIAN1;
        this.chans = 4;
        this.voices[3].next = null;
      } else if (id == " MUGICIAN2/SOFTEYES 1990") {
        version = MUGICIAN2;
        this.chans = 7;
        this.voices[3].next = this.voices[4];
      } else {
        return;
      }

      stream.position = 28;
      index = new Uint32Array(8);
      for (i = 0; i < 8; i++) { index[i] = stream.uint; }

      stream.position = 76;
      this.list.length = 0;
      this.list2.length = 0;

      for (i = 0; i < 8; i++) {
        song = new MGSong();
        song.loop     = stream.ubyte;
        song.loopStep = stream.ubyte << 2;
        song.speed    = stream.ubyte;
        song.length   = stream.ubyte << 2;
        song.title    = stream.readUTF8(12);
        songs[i] = song;
      }

      stream.position = 204;

      for (i = 0; i < 8; i++) {
        song = songs[i];
        len = index[i] << 2;
        pos = 0;

        for (j = 0; j < len; j++) {
          step = new Step();
          step.pattern = stream.ubyte << 6;
          step.transpose = stream.byte;
          song.tracks[j] = step;
          pos += step.pattern;
        }

        if (!pos) { song.duration = -1; }
      }

      pos = stream.position;
      stream.position = 60;
      len = stream.uint;
      stream.position = pos;
      pos += len << 4;
      this.samples.length = ++len;

      for (i = 1; i < len; i++) {
        sample = new MGSample();
        sample.wave       = stream.ubyte;
        sample.pointer    = pos + (sample.wave << 7);
        sample.waveLen    = stream.ubyte << 1;
        sample.volume     = pos + (stream.ubyte << 7);
        sample.volSpeed   = stream.ubyte;
        sample.arpeggio   = stream.ubyte;

        index = stream.ubyte;
        if (index) { sample.pitch = pos + (index << 7); }

        sample.fxStep     = stream.ubyte;
        sample.pitchDelay = stream.ubyte;
        sample.finetune   = stream.ubyte << 6;
        sample.pitchLoop  = stream.ubyte;
        sample.pitchSpeed = stream.ubyte;
        sample.fx         = stream.ubyte;
        sample.source1    = pos + (stream.ubyte << 7);

        index = stream.ubyte;
        sample.source2pos = index;
        sample.source2    = pos + (index << 7);

        sample.fxSpeed    = stream.ubyte;
        sample.volLoop    = stream.ubyte;
        this.samples[i] = sample;
      }

      this.samples[0] = this.samples[1];

      pos = stream.position;
      stream.position = 64;
      pos += (stream.uint << 7);
      sdata = stream.uint;

      stream.position = 26;
      len = stream.ushort << 6;
      stream.position = pos + (sdata << 5);
      this.patterns.length = len;

      if (sdata) { sdata = pos; }

      for (i = 0; i < len; i++) {
        row = new Row();
        row.note   = stream.ubyte;
        row.sample = stream.ubyte & 63;
        row.effect = stream.ubyte;
        row.param  = stream.byte;
        this.patterns[i] = row;
      }

      pos = stream.position;
      stream.position = 72;

      if (sdata) {
        index = stream.uint;
        len = this.samples.length;

        for (i = 1; i < len; i++) {
          sample = this.samples[i];
          if (sample.wave < 32) { continue; }
          stream.position = sdata + ((sample.wave - 32) << 5);

          sample.pointer = stream.uint;
          sample.length = stream.uint - sample.pointer;
          sample.loop = stream.uint;
          sample.name = stream.readUTF8(12);

          if (sample.loop) {
            sample.loop -= sample.pointer;
            sample.repeat = sample.length - sample.loop;
            if (sample.repeat & 1) { sample.repeat--; }
          } else {
            sample.loopPtr = -1;
            sample.repeat = 8;
          }

          if (sample.pointer & 1) { sample.pointer--; }
          if (sample.length & 1) { sample.length--; }

          sample.pointer += pos;

          if (!sample.loopPtr) {
            sample.loopPtr = sample.pointer + sample.loop;
          } else if (sample.loopPtr < 0) {
            sample.loopPtr = 0;
          }
        }

        pos += index;
      } else {
        pos += stream.uint;
      }

      stream.position = 24;

      if (stream.ushort == 1) {
        len = stream.length - pos;
        if (len > 256) { len = 256; }
        this.arpeggios = new Uint8Array(stream.buffer, pos, len);
      }

      len = songs.length;

      for (i = 0; i < len; i++) {
        song = songs[i];

        if (song.duration > -1 && song.speed) {
          this.list.push(song);

          if (version == MUGICIAN2 && !(i & 1)) {
            this.list2.push(songs[++i]);
          }
        }
      }

      if (!this.list.length) {
        version = 0;
      } else {
        stream.fill(0, 0, 8);

        if (sdata) {
          mixer.loopLen = 8;
          this.buffer1 = stream.length;
          this.buffer2 = this.buffer1 + 350;;
          return stream.extend(700);
        }
      }
    };

    process() {
      var voice = this.voices[0];
      var memory = mixer.memory;
      var chan, dest, i, index, len, row, sample, src1, src2, value;

      do {
        sample = voice.sample;

        if (voice.index < 3 || this.chans == 4) {
          chan = voice.channel;

          if (this.stepEnd) {
            voice.step = song.tracks[this.trackPos + voice.index];
          }

          if (sample.wave > 31) {
            chan.pointer = sample.loopPtr;
            chan.length = sample.repeat;
          }
        } else {
          chan = this.mixChannel;

          if (this.stepEnd) {
            voice.step = this.song2.tracks[this.trackPos + (voice.index - 3)];
          }
        }

        if (this.patternEnd) {
          row = this.patterns[voice.step.pattern + this.patternPos];

          if (row.note) {
            if (row.effect != 74) {
              voice.note = row.note;
              if (row.sample) { sample = voice.sample = this.samples[row.sample]; }

              cache[writePos].notes[voice.index] = row.note;
            }

            voice.val1 = (row.effect < 64) ? 1 : row.effect - 62;
            voice.val2 = row.param;
            index = voice.step.transpose + sample.finetune;

            if (voice.val1 != 12) {
              voice.pitch = row.effect;
              if (voice.val1 == 1) { index += voice.pitch; }

              if (sample.wave > 31) {
                chan.pointer = sample.pointer;
                chan.length = sample.length;
                chan.enabled = 0;

                voice.mixPtr = sample.pointer;
                voice.mixEnd = sample.pointer + sample.length;
                voice.mixMute = 0;
              } else {
                chan.pointer = sample.pointer;
                chan.length = sample.waveLen;
                if (voice.val1 != 10) { chan.enabled = 0; }

                if (this.chans == 4) {
                  if (sample.fx && voice.val1 != 2 && voice.val1 != 4) {
                    memory.copyWithin(sample.pointer, sample.source1, sample.source1 + 128);

                    sample.fxStep = 0;
                    voice.fxCtr = sample.fxSpeed;
                  }
                }
              }

              if (voice.val1 != 3 && voice.val1 != 4) {
                voice.volCtr = 1;
                voice.volStep = 0;
              }
            } else {
              voice.pitch = row.note;
              index += voice.pitch;
            }

            if (index < 0) {
              voice.period = 0;
            } else {
              voice.period = PERIODS[index];
            }

            if (voice.val1 == 11) { sample.arpeggio = voice.val2 & 7; }

            voice.arpStep = 0;
            voice.pitchCtr = sample.pitchDelay;
            voice.pitchStep = 0;
            voice.portamento = 0;
          }
        }

        switch (voice.val1) {
          case 0:
            break;
          case 5:   // pattern length
            value = voice.val2;
            if (value > 0 && value < 65) { this.patternLen = value; }
            break;
          case 6:   // song speed
            if (!voice.val2 || voice.val2 > 15) { break; }
            value = voice.val2 & 15;
            this.speed = value | (value << 4);
            break;
          case 7:   // filter on
            mixer.filter = 1;
            break;
          case 8:   // filter off
            mixer.filter = 0;
            break;
          case 13:  // shuffle
            voice.val1 = 0;
            value = voice.val2 & 0x0f;
            if (!value) { break; }
            value = voice.val2 & 0xf0;
            if (!value) { break; }
            this.speed = voice.val2;
            break;
        }
      } while (voice = voice.next);

      voice = this.voices[0];

      do {
        sample = voice.sample;

        if (this.chans == 4) {
          chan = voice.channel;

          if (sample.wave < 32 && sample.fx && !sample.fxDone) {
            sample.fxDone = 1;

            if (voice.fxCtr) {
              voice.fxCtr--;
            } else {
              voice.fxCtr = sample.fxSpeed;
              dest = sample.pointer;

              switch (sample.fx) {
                case 1:   // filter
                  len = dest + 127;

                  for (; dest < len; dest++) {
                    value = memory[dest] + memory[dest + 1];
                    memory[dest] = value >> 1;
                  }
                  break;
                case 2:   // mixing
                  src1 = sample.source1;
                  src2 = sample.source2;
                  len = src1 + sample.waveLen;

                  index = sample.fxStep;
                  sample.fxStep = (++sample.fxStep & 127);

                  for (; src1 < len; src1++) {
                    value = memory[src1] + memory[src2 + index];
                    memory[dest++] = value >> 1;
                    index = (++index & 127);
                  }
                  break;
                case 3:   // scr left
                  value = memory[dest];
                  memory.copyWithin(dest, dest + 1, dest + 128);
                  memory[dest + 127] = value;
                  break;
                case 4:   // scr right
                  value = memory[dest + 127];
                  memory.copyWithin(dest + 1, dest, dest + 127);
                  memory[dest] = value;
                  break;
                case 5:   // upsample
                  src1 = value = dest;
                  len = dest + 64;

                  for (; src1 < len; src1++) {
                    memory[src1] = memory[dest];
                    dest += 2;
                  }

                  memory.copyWithin(value + 64, value, value + 64);
                  break;
                case 6:   // downsample
                  len = dest;
                  src1 = dest + 64;
                  dest += 128;

                  for (; src1 > len;) {
                    memory[--dest] = memory[--src1];
                    memory[--dest] = memory[src1];
                  }
                  break;
                case 7:   // negate
                  dest += sample.fxStep;
                  memory[dest] = -memory[dest];
                  if (++sample.fxStep >= sample.waveLen) { sample.fxStep = 0; }
                  break;
                case 8:   // madmix 1
                  sample.fxStep = (++sample.fxStep & 127);
                  src2 = sample.source2 + sample.fxStep;
                  index = memory[src2];
                  len = sample.waveLen;
                  value = 3;

                  for (i = 0; i < len; i++) {
                    src1 = memory[dest] + value;

                    if (src1 < -128) {
                      src1 += 256;
                    } else if (src1 > 127) {
                      src1 -= 256;
                    }

                    memory[dest++] = src1;
                    value += index;

                    if (value < -128) {
                      value += 256;
                    } else if (value > 127) {
                      value -= 256;
                    }
                  }
                  break;
                case 9:   // addition
                  src2 = sample.source2;
                  len = src2 + sample.waveLen;

                  for (; src2 < len; src2++) {
                    value = memory[src2] + memory[dest];
                    if (value > 127) { value -= 256; }
                    memory[dest++] = value;
                  }
                  break;
                case 10:  // filter 2
                  len = dest + 126;

                  for (; dest < len;) {
                    value = (memory[dest++] * 3) + memory[dest + 1];
                    memory[dest] = value >> 2;
                  }
                  break;
                case 11:  // morphing
                  src1 = sample.source1;
                  src2 = sample.source2;
                  len = dest + sample.waveLen;

                  sample.fxStep = (++sample.fxStep & 127);
                  value = sample.fxStep;
                  if (value >= 64) { value = 127 - value; }
                  index = (value ^ 255) & 63;

                  for (; dest < len; dest++) {
                    i = (memory[src1++] * value) + (memory[src2++] * index);
                    memory[dest] = i >> 6;
                  }
                  break;
                case 12:  // morph f
                  src1 = sample.source1;
                  src2 = sample.source2;
                  len = dest + sample.waveLen;

                  sample.fxStep = (++sample.fxStep & 31);
                  value = sample.fxStep;
                  if (value >= 16) { value = 31 - value; }
                  index = (value ^ 255) & 15;

                  for (; dest < len; dest++) {
                    i = (memory[src1++] * value) + (memory[src2++] * index);
                    memory[dest] = i >> 4;
                  }
                  break;
                case 13:  // filter 3
                  len = dest + 126;

                  for (; dest < len;) {
                    value = memory[dest++] + memory[dest + 1];
                    memory[dest] = value >> 1;
                  }
                  break;
                case 14:  // polygate
                  index = dest + sample.fxStep;
                  memory[index] = -memory[index];

                  index = dest + ((sample.fxStep + sample.source2pos) & (sample.waveLen - 1));
                  memory[index] = -memory[index];

                  if (++sample.fxStep >= sample.waveLen) { sample.fxStep = 0; }
                  break;
                case 15:  // colgate
                  index = dest;
                  len = dest + 127;

                  for (; index < len; index++) {
                    value = memory[index] + memory[index + 1];
                    memory[index] = value >> 1;
                  }

                  sample.fxStep++;

                  if (sample.fxStep == sample.source2pos) {
                    sample.fxStep = 0;
                    index = value = dest;
                    len = dest + 64;

                    for (; index < len; index++) {
                      memory[index] = memory[dest];
                      dest += 2;
                    }

                    memory.copyWithin(value + 64, value, value + 64);
                  }
                  break;
              }
            }
          }
        } else {
          chan = (voice.index < 3) ? voice.channel : this.mixChannel;
        }

        if (voice.volCtr) {
          if (--voice.volCtr == 0) {
            voice.volCtr = sample.volSpeed;
            voice.volStep = (++voice.volStep & 127);

            if (voice.volStep || sample.volLoop) {
              index = voice.volStep + sample.volume;
              value = -(memory[index] + 129);

              voice.volume = (value & 255) >> 2;
              chan.volume = voice.volume;
            } else {
              voice.volCtr = 0;
            }
          }
        }

        value = voice.note;

        if (sample.arpeggio) {
          index = voice.arpStep + (sample.arpeggio << 5);
          value += this.arpeggios[index];
          voice.arpStep = (++voice.arpStep & 31);
        }

        index = value + voice.step.transpose + sample.finetune;
        voice.fperiod = PERIODS[index];
        dest = voice.fperiod;

        if (voice.val1 == 1 || voice.val1 == 12) {
          value = -voice.val2;
          voice.portamento += value;
          voice.fperiod += voice.portamento;

          if (voice.val2) {
            if ((value < 0 && voice.fperiod <= voice.period) || (value >= 0 && voice.fperiod >= voice.period)) {
              voice.portamento = voice.period - dest;
              voice.val2 = 0;
            }
          }
        }

        if (sample.pitch) {
          if (voice.pitchCtr) {
            voice.pitchCtr--;
          } else {
            index = voice.pitchStep;
            voice.pitchStep = (++voice.pitchStep & 127);
            if (!voice.pitchStep) { voice.pitchStep = sample.pitchLoop; }

            index += sample.pitch;
            value = memory[index];
            voice.fperiod += (-value);
          }
        }

        chan.period = voice.fperiod;
      } while (voice = voice.next);

      if (this.chans > 4 && !this.calcPhase) {
        src1 = this.buffer1;
        this.buffer1 = this.buffer2;
        this.buffer2 = src1;

        chan = mixer.output[3];
        chan.pointer = src1;
        voice = this.voices[3];

        do {
          voice.mixStep = 0;

          if (voice.fperiod < 125) {
            voice.mixMute = 1;
            voice.mixSpeed = 0;
          } else {
            i = ((voice.fperiod << 8) / this.mixPeriod) & 0xffff;
            src2 = ((256 / i) & 255) << 8;
            dest = ((256 % i) << 8) & 0xffffff;
            voice.mixSpeed = (src2 | ((dest / i) & 255)) << 8;
          }

          if (voice.mixMute) {
            voice.mixVolume = 0;
          } else {
            voice.mixVolume = voice.volume << 8;
          }
        } while (voice = voice.next);

        for (i = 0; i < 350; i++) {
          voice = this.voices[3];
          dest = 0;

          do {
            src2 = (memory[voice.mixPtr + (voice.mixStep >> 16)] & 255) + voice.mixVolume;
            dest += this.volumes[src2];
            voice.mixStep += voice.mixSpeed;
          } while (voice = voice.next);

          memory[src1++] = this.averages[dest];
        }

        chan.length = 350;
        chan.period = this.mixPeriod;
        chan.volume = 64;
      }

      if (--this.tick == 0) {
        this.tick = this.speed & 15;
        this.speed = (this.speed & 0xf0) >> 4;
        this.speed |= (this.tick << 4);

        this.patternEnd = 1;
        this.patternPos++;

        if (this.patternPos == 64 || this.patternPos == this.patternLen) {
          this.patternPos = 0;
          this.stepEnd = 1;
          this.trackPos += 4;

          if (this.trackPos == song.length) {
            this.trackPos = song.loopStep;
            mixer.complete = 1;
          }
        }
      } else {
        this.patternEnd = 0;
        this.stepEnd = 0;
      }

      voice = this.voices[0];

      do {
        voice.mixPtr += (voice.mixStep >> 16);
        sample = voice.sample;
        sample.fxDone = 0;

        if (voice.mixPtr >= voice.mixEnd) {
          if (sample.loop) {
            voice.mixPtr -= sample.repeat;
          } else {
            voice.mixPtr = 0;
            voice.mixMute = 1;
          }
        }

        if (voice.index < 4) { voice.channel.enabled = 1; }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };

    tables() {
      var pos = 0, step = 0, vol = 128;
      var i, index, j, v1, v2;

      this.averages = new Int8Array(1024);
      this.volumes = new Uint8Array(16384);
      this.mixPeriod = 203;

      for (i = 0; i < 1024; i++) {
        if (vol > 127) { vol -= 256; }
        this.averages[i] = vol;
        if (i > 383 && i < 639) { vol = (++vol & 255); }
      }

      for (i = 0; i < 64; i++) {
        v1 = -128;
        v2 =  128;

        for (j = 0; j < 256; j++) {
          vol = (((v1 * step) / 63) + 128) >> 0;
          index = pos + v2;
          this.volumes[index] = vol & 255;
          if (i != 0 && i != 63 && v2 >= 128) { this.volumes[index]--; }

          v1++;
          v2 = (++v2 & 255);
        }

        pos += 256;
        step++;
      }
    };
  }

  class MGSample extends Sample {
    constructor() {
      super();

      this.loop       = 0;
      this.wave       = 0;
      this.waveLen    = 0;
      this.arpeggio   = 0;
      this.pitch      = 0;
      this.pitchDelay = 0;
      this.pitchLoop  = 0;
      this.pitchSpeed = 0;
      this.fx         = 0;
      this.fxDone     = 0;
      this.fxStep     = 0;
      this.fxSpeed    = 0;
      this.source1    = 0;
      this.source2    = 0;
      this.source2pos = 0;
      this.volLoop    = 0;
      this.volSpeed   = 0;
    };
  }

  class MGSong extends Song {
    constructor() {
      super();

      this.loop = 0;
      this.loopStep = 0;
    };
  }

  class MGVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel    = null;
      this.sample     = null;
      this.step       = null;
      this.note       = 0;
      this.period     = 0;
      this.fperiod    = 0;
      this.val1       = 0;
      this.val2       = 0;
      this.arpStep    = 0;
      this.fxCtr      = 0;
      this.pitch      = 0;
      this.pitchCtr   = 0;
      this.pitchStep  = 0;
      this.portamento = 0;
      this.volume     = 0;
      this.volCtr     = 0;
      this.volStep    = 0;
      this.mixMute    = 1;
      this.mixPtr     = 0;
      this.mixEnd     = 0;
      this.mixSpeed   = 0;
      this.mixStep    = 0;
      this.mixVolume  = 0;
    };
  }

  window.neoart.Trackers.DigitalMugician = function() {
    tracker = new DigitalMugician();
    return player;
  }

  const TICKS = new Uint8Array([2,3,4,6,8,12,16,24,32,48,64,96]);

  class Infogrames extends Tracker {
    constructor() {
      super(Amiga);

      this.comData = null;
      this.irqtime = 0;
      this.perData = null;
      this.volData = null;

      this.voices[0] = new IGVoice(0);
      this.voices[0].next = this.voices[1] = new IGVoice(1);
      this.voices[1].next = this.voices[2] = new IGVoice(2);
      this.voices[2].next = this.voices[3] = new IGVoice(3);

      ID.push("Infogrames");

      mixer.process = this.process.bind(this);
      channels = 4;

      PERIODS.set([
        0x6acc,0x64cc,0x5f25,0x59ce,0x54c3,0x5003,0x4b86,0x4747,0x4346,0x3f8b,0x3bf3,0x3892,
        0x3568,0x3269,0x2f93,0x2cea,0x2a66,0x2801,0x2566,0x23a5,0x21af,0x1fc4,0x1dfe,0x1c4e,
        0x1abc,0x1936,0x17cc,0x1676,0x1533,0x1401,0x12e4,0x11d5,0x10d4,0x0fe3,0x0efe,0x0e26,
        0x0d5b,0x0c9b,0x0be5,0x0b3b,0x0a9b,0x0a02,0x0972,0x08e9,0x0869,0x07f1,0x077f,0x0713,
        0x06ad,0x064d,0x05f2,0x059d,0x054d,0x0500,0x04b8,0x0475,0x0435,0x03f8,0x03bf,0x038a,
        0x0356,0x0326,0x02f9,0x02cf,0x02a6,0x0280,0x025c,0x023a,0x021a,0x01fc,0x01e0,0x01c5,
        0x01ab,0x0193,0x017d,0x0167,0x0153,0x0140,0x012e,0x011d,0x010d,0x00fe,0x00f0,0x00e2,
        0x00d6,0x00ca,0x00be,0x00b4,0x00aa,0x00a0,0x0097,0x008f,0x0087,0x007f,0x0078,0x0070,
        0x0060,0x0050,0x0040,0x0030,0x0020,0x0010,0x0000,0x0000,0x0020,0x2020,0x2020,0x2020,
        0x2020,0x3030,0x3030,0x3020,0x2020,0x2020,0x2020,0x2020,0x2020,0x2020,0x2020,0x2020,
        0x2090,0x4040,0x4040,0x4040,0x4040,0x4040,0x4040,0x4040,0x400c,0x0c0c,0x0c0c,0x0c0c,
        0x0c0c,0x0c40,0x4040,0x4040,0x4040,0x0909,0x0909,0x0909,0x0101,0x0101,0x0101,0x0101,
        0x0101,0x0101,0x0101,0x0101,0x0101,0x0101,0x4040,0x4040,0x4040,0x0a0a,0x0a0a,0x0a0a,
        0x0202,0x0202,0x0202,0x0202,0x0202,0x0202,0x0202,0x0202,0x0202,0x0202,0x4040,0x4040,
        0x2000
      ]);

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      mixer.ticksize = this.irqtime;

      this.tick = this.speed;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        this.complete += (1 << voice.index);
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    load(stream) {
      var archive, entry, extra;
      version = 0;

      stream.endian = true;
      stream.position = 0;

      if (stream.uint == 67324752) {
        if (!Flip) {
          throw "Unzip support is not available.";
        }

        archive = new Flip(stream);
        if (archive.entries.length != 2) { return false; }

        extra = archive.uncompress(archive.entries[1]);
        entry = archive.uncompress(archive.entries[0]);
        entry.endian = this.endian;

        if (entry.length == (entry.uint + 4)) {
          return super.load(extra, entry);
        } else {
          return super.load(entry, extra);
        }
      }

      return false;
    };

    parse(stream, extra) {
      var begin, i, j, len, pointers, sample, temp, track, value;

      if (!extra || extra.length != (extra.uint + 4)) { return; }

      switch (extra.length) {
        case 54832:                             //Gobliins 2 (all)
        case 27312:                             //Goblins 3 (all)
        case 82990:                             //Ween The Prophecy (musx)
        case 87800:                             //Ween The Prophecy (ween)
          this.irqtime = 589;                   //irq = $24ff
          break;
        case 37732:                             //Horror Zombies from the Crypt
          this.irqtime = 436;                   //irq = $1b66
          break;
        default:                                //remaining modules
          this.irqtime = 414;                   //irq = $19ff
          break;
      }

      len = extra.uint >> 4;
      this.samples.length = len;
      extra.position = 4;

      for (i = 0; i < len; i++) {
        sample = new Sample();
        sample.pointer = extra.uint;
        sample.loopPtr = extra.uint;

        extra.position += 4;
        sample.length = extra.ushort << 1;
        sample.repeat = extra.ushort << 1;

        this.samples[i] = sample;
      }

      begin = stream.ushort;
      this.speed = stream.ushort;

      pointers = new Uint16Array(8);
      for (i = 0; i < 8; i++) { pointers[i] = stream.ushort; }

      if (stream.length != (begin + pointers[6])) { return; }

      pointers[6] = pointers[7];
      pointers[7] = stream.position - 2;

      stream.position = begin + pointers[0];
      len = pointers[1] - pointers[0];
      temp = new Int8Array(stream.buffer, stream.position, len);
      this.volData = new Int8Array(temp);

      stream.position = begin + pointers[1];
      len = stream.length - stream.position;
      temp = new Int8Array(stream.buffer, stream.position, len);
      this.perData = new Int8Array(temp);

      stream.position = begin + pointers[6];
      len = pointers[0] - pointers[6];
      temp = new Int8Array(stream.buffer, stream.position, len);
      this.comData = new Int8Array(temp);

      stream.position = pointers[7];
      len = ((begin + pointers[2]) - pointers[7]) >> 1;

      temp = new Uint16Array(len);
      for (i = 0; i < len; i++) { temp[i] = stream.ushort; }

      for (i = 2; i < 6; i++) {
        stream.position = begin + pointers[i];
        len = pointers[i + 1] - pointers[i];

        track = new Uint16Array(len);
        this.voices[i - 2].track = track;

        for (j = 0; j < len; j++) {
          value = stream.ubyte;

          if (value != 0xff) {
            track[j] = temp[value] - pointers[6];
          } else {
            track[j] = value;
          }
        }
      }

      version = 1;
      return extra;
    };

    process() {
      var voice = this.voices[0];
      var chan, pos, value;

      this.tick--;

      do {
        if (!this.tick) { voice.tick--; }

        if (!voice.tick) {
          voice.tick = voice.speed;
          pos = voice.track[voice.trackPos];

          do {
            value = this.comData[pos + voice.position++];

            if (value == -1) {
              voice.position = 0;
              pos = voice.track[++voice.trackPos];

              if (pos == 255) {
                voice.trackPos = 0;
                pos = voice.track[0];

                this.complete &= ~(1 << voice.index);
                if (!this.complete) { mixer.complete = 1; }
                continue;
              }
            }

            if (value < 0) {
              switch (value & 0xe0) {
                case 0x80:
                  value = TICKS[(value - 0x80) & 0x0f];
                  voice.tick = voice.speed = value;
                  break;
                case 0xa0:
                  value = (value - 0xa0) & 0x1f;

                  if (value < this.samples.length) {
                    voice.sample = this.samples[value];
                    voice.state = 1;
                  }
                  break;
                case 0xc0:
                  value = ((value - 0xc0) & 0x1f) * 13;

                  voice.volBlock.reset();
                  voice.volBlock.flags = (this.volData[value] & 0x80) | 1;
                  voice.volBlock.amount = this.volData[value] & 0x7f;
                  voice.volBlock.pointer = ++value;
                  break;
                case 0xe0:
                  switch (value & 0x1f) {
                    case 0:
                      voice.transpose = this.comData[pos + voice.position++];
                      break;
                    case 1:
                      value = this.comData[pos + voice.position++] * 13;

                      voice.perBlock.reset();
                      voice.perBlock.flags = -127;
                      voice.perBlock.pointer = ++value;
                      break;
                    case 2:
                      value = this.comData[pos + voice.position++] * 13;

                      voice.perBlock.reset();
                      voice.perBlock.flags = 1;
                      voice.perBlock.pointer = ++value;
                      break;
                    case 3:
                      break;
                  }
                  break;
              }
            } else {
              if (value) { value += voice.transpose; }

              voice.period = PERIODS[value];
              voice.perBlock.reset();
              voice.volBlock.reset();
              break;
            }
          } while (1);
        }

        chan = voice.channel;
        chan.period = this.tune(voice.perBlock, this.perData, voice.period);
        chan.volume = this.tune(voice.volBlock, this.volData);

        if (voice.state == 1) {
          chan.enabled = 0;
          chan.pointer = voice.sample.pointer;
          chan.length = voice.sample.length;
          voice.state++;
        } else if (voice.state == 2) {
          chan.enabled = 1;
          voice.state++;
        } else if (voice.state == 3) {
          chan.pointer = voice.sample.loopPtr;
          chan.length = voice.sample.repeat;
          voice.state = 0;
        }
      } while (voice = voice.next);

      if (!this.tick) { this.tick = this.speed; }

      position += mixer.ticksize;
    };

    tune(block, data, value = 0) {
      var pos = block.pointer + block.position;

      if (block.flags & 1) {
        block.positive += data[pos + 1];
      }

      block.flags &= ~1;

      value += (block.positive + block.negative);
      if (value < 0) { value = 0; }

      if (block.flags & 4) { return value; }

      if (++block.delay1 != data[pos + 2]) { return value; }
      block.delay1 = 0;

      if (++block.delay2 == data[pos]) {
        block.delay2 = 0;
        pos = block.position + 3;

        if (pos == 12) {
          if (block.flags) {
            block.flags |= 4;
            return value;
          } else {
            block.negative += block.amount;
            pos = 3;
          }
        }

        block.position = pos;
      }

      block.flags |= 1;
      return value;
    };
  }

  class IGBlock {
    constructor() {
      this.amount  = 0;
      this.flags   = 0;
      this.pointer = 0;
      this.reset();
    };

    reset() {
      this.delay1   = 0;
      this.delay2   = 0;
      this.flags    = (this.flags | 1) & ~4;
      this.negative = 0;
      this.positive = 0;
      this.position = 0;
    };
  }

  class IGVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.track = null;
      this.initialize();
    };

    initialize() {
      this.channel   = null;
      this.sample    = null;
      this.state     = 0;
      this.trackPos  = 0;
      this.speed     = 1;
      this.tick      = 1;
      this.position  = 0;
      this.period    = 0;
      this.transpose = 0;
      this.perBlock  = new IGBlock();
      this.volBlock  = new IGBlock();
    };
  }

  window.neoart.Trackers.Infogrames = function() {
    tracker = new Infogrames();
    return player;
  }

  class BenDaglish extends Tracker {
    constructor() {
      super(Amiga);

      this.banks      = [];
      this.commands   = 0;
      this.complete   = 0;
      this.defBanks   = [];
      this.fadeStep   = 0;
      this.patterns   = 0;
      this.periods    = 0;
      this.sampleDone = 0;
      this.stream     = null;

      this.voices[0] = new BDVoice(0);
      this.voices[0].next = this.voices[1] = new BDVoice(1);
      this.voices[1].next = this.voices[2] = new BDVoice(2);
      this.voices[2].next = this.voices[3] = new BDVoice(3);

      ID.push("Ben Daglish");

      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var len = this.banks.length >> 2;
      super.initialize();

      this.complete = 15;
      this.banks = this.defBanks.slice();

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];
        voice.sample2 = this.samples[0];
        voice.bank = voice.index * len;
        voice.trackPos = song.tracks[voice.index];
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var lower = 0xffff, pointers = [];
      var i, len, pos, sample, song, tracks, value;

      do {
        value = stream.ushort;

        switch (value) {
          case 0xd040:                                                  // add.w [d0,d0]
            if (stream.ushort != 0xd040) { break; }                     // add.w [d0,d0]
            value = stream.ushort;

            if (value == 0x47fa) {                                      // lea [xx,a3]
              this.periods = stream.position + stream.short;
            } else if (value == 0xd040) {                               // add.w [d0,d0]
              if (stream.ushort == 0x41fa) {                            // lea [xx,a0]
                tracks = stream.position + stream.short;
              }
            }
            break;
          case 0x10c2:                                                  // move.b [d2,(a0)+]
            stream.position += 2;
            value = stream.ushort;

            if (value == 0xb43c || value == 0x0c02) {                   // cmp.b [xx,d2] || cmpi.b [xx,d2]
              value = stream.ushort;

              if (!this.defBanks || this.defBanks.length != value) {
                this.banks.length = value;
                this.defBanks.length = value;
              }
            }
            break;
          case 0xb03c:                                                  // cmp.b [xx,d0]
          case 0x0c00:                                                  // cmpi.b [xx,d0]
            if (stream.ushort == 0x00fd) { variant = 3; }
            break;
          case 0x294b:                                                  // move.l [a3,xx]
            stream.position += 2;
            if (stream.ushort != 0x47fa) { break; }                     // lea [xx,a3]
            this.patterns = stream.position + stream.short;

            if (stream.ushort == 0x4880) {                              // ext.w d0
              stream.position += 6;
            } else {
              stream.position += 4;
            }

            if (stream.ushort != 0x47fa) {                              // lea [xx,a3]
              this.patterns = 0;
            } else {
              this.commands = stream.position + stream.short;
            }
            break;
          case 0x1030:                                                  // move.b (a0,d0.w),d0
            stream.position += 2;

            if (stream.ushort == 0x41fa) {                              // lea [xx,a0]
              pos = stream.position + stream.short;

              for (i = 0; i < 50; i++) {
                value = stream.ushort;

                if (value == 0xb03c || value == 0x0c00) {               // cmp.b [xx,d0] || cmpi.b [xx,d0]
                  if (stream.ushort == 0x00c1) {
                    if (variant) {
                      variant--;
                    } else {
                      variant++;
                    }
                    break;
                  }
                }
              }
              stream.position = stream.length;
            }
            break;
        }
      } while (stream.bytesAvailable > 4);

      if (!tracks || !this.commands || !this.patterns || !this.periods) { return; }

      stream.position = pos;
      len = pos + lower;

      do {
        value = stream.uint;

        if (value < lower) {
          lower = value;
          len = pos + lower;
        }

        pointers.push(value);
      } while (stream.position < len);

      len = pointers.length;
      this.samples.length = len;

      for (i = 0; i < len; i++) {
        stream.position = pos + pointers[i];
        sample = new BDSample();

        sample.pointer = stream.uint;
        sample.loopPtr = stream.uint;
        sample.length  = stream.ushort << 1;
        sample.repeat  = stream.ushort << 1;
        sample.volume  = stream.ushort;
        sample.word14  = stream.short;
        sample.word16  = stream.short;
        sample.word18  = stream.ushort;
        sample.word20  = stream.ushort;
        sample.word22  = stream.ushort;
        sample.word24  = stream.short;
        sample.word26  = stream.ushort;

        this.samples[i] = sample;
      }

      for (i = 0; i < len; i++) {
        sample = this.samples[i];
        sample.pointer += pos;
        if (sample.loopPtr) { sample.loopPtr += pos; }
        stream.fill(0, sample.pointer, 2);
      }

      stream.position = tracks;
      this.list.length = 0;
      lower = 0xffff;

      do {
        song = new Song();

        for (i = 0; i < 4; i++) {
          value = stream.ushort;

          if (value < lower) {
            lower = value;
            len = tracks + lower;
          }

          song.tracks[i] = tracks + value;
        }

        this.list.push(song);
      } while (stream.position < len);

      len = this.defBanks.length >> 2;

      for (i = 0; i < len; i++) {
        this.defBanks[i] = i;
        this.defBanks[i + len] = i;
        this.defBanks[i + (len * 2)] = i;
        this.defBanks[i + (len * 3)] = i;
      }

      stream.fill(0, 0, 4);
      version = 1;
      this.stream = stream;
    };

    process() {
      var voice = this.voices[0];
      var chan, loop, pos, value;

      this.sampleDone = 0;

      do {
        this.sampleDone |= voice.s1byte22;
        if (!voice.state) { continue; }
        chan = voice.channel;

        if (voice.s2word14 > 0) { voice.s2word14--; }

        if (voice.s2word16 != -1) {
          if (voice.s2word16) {
            voice.s2word22 += voice.s2word18;
            voice.s2word16--;
          }

          if (!voice.s2word16) {
            voice.s2word22 += voice.s2word24;

            if (--voice.s2word20 == 0) {
              if (voice.sample.word20) {
                voice.s2word20 = voice.sample.word20;
                voice.s2word24 = -voice.s2word24;
              }
            }
          }
        }

        if (variant == 1) {
          if (voice.v1word14) {
            if (--voice.v1word18 == 0) {
              voice.v1word18 = voice.v1word14;
              voice.volume += voice.v1word16;
            }
          }
        }

        if (voice.type == 1) {
          if (voice.state < 0x8000) {
            if (--voice.state == 0) {
              voice.state = 0xffff;
              chan.pointer = 0;
              chan.length = 2;
            }
          } else if (voice.s2word14 == 1) {
            voice.state = 0x8000;
          }
        } else if (voice.type == 2) {
          if (voice.state < 0x8000) {
            if (--voice.state == 0) {
              voice.state = 0xffff;
              chan.pointer = voice.sample.loopPtr;
              chan.length = voice.sample.repeat;
            }
          } else if (voice.s2word14 == 1) {
            voice.type = 0;
          }
        } else {
          voice.state = 0x8000;
          voice.volume += voice.sample.word14;
        }

        if (voice.volume > 0) {
          chan.period = (voice.period + voice.s2word22 + voice.s2word10) & 0xffff;
          chan.volume = voice.volume;
          chan.enabled = 1;
        } else {
          voice.state = 0;
          chan.reset();
          chan.enabled = 0;
        }
      } while (voice = voice.next);

      if (!this.sampleDone) {
        position += mixer.ticksize;
        return;
      }

      voice = this.voices[0];

      do {
        if (!voice.s1byte22) { continue; }
        chan = voice.channel;
        loop = 1;

        if (variant) {
          if (voice.s1byte35) {
            if (voice.s1byte35 > 0x7f) {
              value = voice.period * (voice.s1long38 & 0xffff);
              value = (value >> 16) & 0xffff;
              value += voice.period * ((voice.s1long38 >> 16) & 0xffff);
              value -= voice.period;

              voice.s1long38 = (value / voice.s1byte37) >> 0;
              voice.s1byte35 &= 0x7f;
            }

            if (voice.s1byte36) {
              voice.s1byte36--;
            } else if (voice.s1byte37) {
              voice.s1byte37--;
              voice.s2word10 += voice.s1long38;
            }
          }

          if (voice.s1byte48) {
            if (voice.s1byte51) {
              if (--voice.s1byte50 == 0) {
                voice.s1byte51--;
                voice.s1byte50 = voice.s1byte49;
                voice.s1word54 += voice.s1word52;
                value = voice.s1word54 + voice.sample.volume;

                if (value < 0) {
                  value = voice.s1byte51 = 0;
                } else if (value > 64) {
                  value = 64;
                }

                voice.volume = value;
                this.sample(voice, voice.s1byte50);
              }
            }
          }
        }

        do {
          if (voice.s1byte20) {
            if (--voice.s1byte18 != 0) {
              voice.patternPos = voice.patternPtr;
              voice.s1byte20 = 0;
              this.stream.position = voice.patternPos;
            } else {
              voice.s1byte18 = 1;
              this.stream.position = voice.trackPos;

              do {
                value = this.stream.ubyte;

                if (value == 0xff) {
                  if (!voice.state || voice.state == 0x8000) { voice.s1byte22 = 0; }
                  loop = 0;
                  voice.trackPos = song.tracks[voice.index];

                  this.complete &= ~(1 << voice.index);
                  if (!this.complete) { mixer.complete = 1; }
                } else if (value == 0xfe) {
                  voice.s1byte19 = this.stream.byte;
                } else if (variant < 2) {
                  if (value < 0x80) {
                    voice.s1byte20 = 0;
                    voice.trackPos = this.stream.position;

                    this.stream.position = this.patterns + (value << 1);
                    this.stream.position = this.commands + this.stream.ushort;

                    voice.patternPtr = this.stream.position;
                    break;
                  } else if (value < 0xc0) {
                    voice.s1byte18 = value & 0x1f;
                  } else {
                    value = (value & 7) + voice.bank;
                    this.banks[value] = this.stream.ubyte >> 2;
                  }
                } else if (value == 0xfd) {
                  this.fadeStep = this.stream.byte;
                } else {
                  if (value < 0xc8) {
                    voice.s1byte20 = 0;
                    voice.trackPos = this.stream.position;

                    this.stream.position = this.patterns + (value << 1);
                    this.stream.position = this.commands + this.stream.ushort;

                    voice.patternPtr = this.stream.position;
                    break;
                  } else if (value < 0xf0) {
                    voice.s1byte18 = value - 0xc8;
                  } else {
                    value = (value - 0xf0) + voice.bank;
                    this.banks[value] = this.stream.ubyte >> 2;
                  }
                }
              } while (loop);
            }
          } else {
            this.stream.position = voice.patternPos;
          }

          voice.s1byte21 = (--voice.s1byte21 & 0xff);

          if (voice.s1byte21) {
            if (this.stream.readAt(this.stream.position) > 0x7f) { this.fx(voice); }
            voice.patternPos = this.stream.position;
            loop = 0;
          } else {
            do {
              if (this.stream.readAt(this.stream.position) > 0x7f) {
                this.fx(voice);

                if (voice.s1byte20) {
                  if (variant > 1 && !voice.s1byte21) { voice.s1byte21 = 1; }
                  break;
                }
              } else {
                value = this.stream.ubyte;

                if (value != 0x7f) {
                  voice.s1byte23 = value + voice.s1byte19;

                  if (variant) {
                    voice.s2word10 = 0;
                    voice.s1byte35 = voice.s1byte31;
                    pos = this.stream.position;

                    if (voice.s1byte35) {
                      voice.s1byte36 = voice.s1byte32;
                      voice.s1byte37 = voice.s1byte33;
                      value = (-voice.s1byte34) << 2;

                      this.stream.position = this.periods + value;
                      voice.s1long38 = this.stream.int;
                    }

                    voice.s1byte48 = voice.s1byte43;

                    if (voice.s1byte48) {
                      voice.s1byte49 = voice.s1byte44;
                      voice.s1byte50 = voice.s1byte44;
                      voice.s1byte51 = voice.s1byte45;
                      voice.s1word52 = voice.s1word46;
                      voice.s1word54 = 0;
                    }

                    if (voice.s1byte42) {
                      voice.s1byte35 = 0xff;
                      voice.s1byte36 = 0;
                      voice.s1byte37 = voice.s1byte33;

                      value = voice.s1byte23;
                      if (!voice.s1byte24) { voice.s1byte23 = voice.s1byte30; }
                      value -= voice.s1byte23;
                      value = (-value) << 2;

                      this.stream.position = this.periods + value;
                      voice.s1long38 = this.stream.int;
                    }

                    voice.s1byte30 = voice.s1byte23;
                    value = voice.sample.volume * voice.s1word66;
                    voice.volume = (value >> 14) & 0xffff;
                    voice.s1byte24 = 0;

                    if (variant == 1) {
                      voice.v1word14 = voice.s1word68;
                      voice.v1word16 = voice.s1word68;
                      voice.v1word18 = voice.s1word70;
                    }

                    this.stream.position = pos;
                  } else {
                    voice.volume = voice.sample.volume;
                  }

                  value = this.stream.ubyte;

                  if (!value && variant > 1) {
                    value = -1;
                    voice.s1byte21 = this.stream.ubyte;
                  } else {
                    voice.s1byte21 = value;
                  }

                  voice.sample = voice.sample2;
                  voice.patternPos = this.stream.position;
                  this.sample(voice, value);
                } else {
                  voice.s1byte21 = this.stream.ubyte;
                  voice.patternPos = this.stream.position;
                }

                loop = 0;
                break;
              }
            } while (1);
          }
        } while (loop);
      } while (voice = voice.next);

      position += mixer.ticksize;
    };

    fx(voice) {
      var value = this.stream.ubyte;
      var flag;

      if (variant > 2) {
        if (value <= 0x8a) {
          value = (value - 0x80) + voice.bank;
          value = this.banks[value];

          if (value < this.samples.length) {
            voice.sample2 = this.samples[value];
          }
        } else if (value == 0xff) {
          voice.s1byte20 = value;
        } else if (value < 0x9b) {
          voice.s1byte56 = (value - 0x9b);
        } else {
          value += 0x25;
          flag = 1;
        }
      } else {
        if (value <= 0x88) {
          value = (value & 7) + voice.bank;
          value = this.banks[value];

          if (value < this.samples.length) {
            voice.sample2 = this.samples[value];
          }
        } else if (value == 0xff) {
          voice.s1byte20 = value;
        } else if (value < 0xc0) {
          voice.s1byte56 = (value & 0x0f);
        } else if (!variant) {
          if (value != 0xc2) { this.stream.position += 3; }
        } else {
          flag = 1;
        }
      }

      if (!flag) { return; }

      switch (value) {
        case 0xc0:
          voice.s1byte31 = 0xff;
          voice.s1byte42 = 0;
          voice.s1byte32 = this.stream.ubyte;
          voice.s1byte33 = this.stream.ubyte;
          voice.s1byte34 = this.stream.byte;
          break;
        case 0xc1:
          voice.s1byte31 = 0;
          break;
        case 0xc2:
          voice.s1byte43 = 0xff;
          voice.s1byte44 = this.stream.ubyte;
          voice.s1byte45 = this.stream.ubyte;
          voice.s1word46 = this.stream.byte;
          break;
        case 0xc3:
          voice.s1byte43 = 0;
          break;
        case 0xc4:
          voice.s1byte42 = 0xff;
          voice.s1byte31 = 0;
          voice.s1byte33 = this.stream.ubyte;
        case 0xc5:
          voice.s1byte42 = 0;
          break;
        case 0xc6:
          voice.s1word66 = (this.stream.ubyte << 8) | 0xff;

          if (variant == 1) {
            voice.s1word68 = this.stream.ubyte;
            voice.s1word70 = this.stream.byte;
          }
          break;
        case 0xc7:
          if (variant != 1) { break; }
          voice.s1word68 = 0;
          voice.s1word70 = 0xffff;
          break;
      }
    };

    sample(voice, counter) {
      var chan = voice.channel;
      var sample = voice.sample;
      var temp, value;

      chan.enabled = 0;
      chan.pointer = sample.pointer;
      chan.length = sample.length;
      chan.volume = voice.volume;

      voice.s2word14 = counter;

      value = -(voice.s1byte23 & 0x7f);
      value = (value + sample.word24) << 2;
      value = this.periods + value;

      if (value >= 0) {
        this.stream.position = value;
        value = sample.word26 * this.stream.ushort;
        temp  = sample.word26 * this.stream.ushort;
        voice.period = ((temp >> 16) & 0xffff) + value;

        cache[writePos].notes[voice.index] = voice.period;
      } else {
        voice.period = 0;
      }

      voice.s2word16 = sample.word16;

      if (sample.word16 >= 0) {
        value = sample.word20 >> 1;
        if (value & 1) { value++; }
        voice.s2word20 = value;

        value = sample.word18 * voice.period;
        voice.s2word18 = (value >> 14) & 0xffff;

        value = sample.word22 * voice.period;
        voice.s2word24 = (value >> 14) & 0xffff;
      }

      voice.s2word22 = 0;
    //voice.s2word10 = 0;
      voice.type = (sample.word14) ? 2 : 1;
      voice.state = 2;
    };
  }

  class BDSample extends Sample {
    constructor() {
      super();

      this.word14 = 0;
      this.word16 = 0;
      this.word18 = 0;
      this.word20 = 0;
      this.word22 = 0;
      this.word24 = 0;
      this.word26 = 0;
    };
  }

  class BDVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel    = null;
      this.sample     = null;
      this.sample2    = null;
      this.bank       = 0;
      this.period     = 0;
      this.state      = 0;
      this.trackPos   = 0;
      this.patternPtr = 0;
      this.patternPos = 0;
      this.volume     = 0;
      this.type       = 0;
      this.s1byte18   = 1;
      this.s1byte19   = 0;
      this.s1byte20   = 1;
      this.s1byte21   = 1;
      this.s1byte22   = 1;
      this.s1byte23   = 0;
      this.s1byte24   = 1;
      this.s1byte30   = 0;
      this.s1byte31   = 0;
      this.s1byte32   = 0;
      this.s1byte33   = 0;
      this.s1byte34   = 0;
      this.s1byte35   = 0;
      this.s1byte36   = 0;
      this.s1byte37   = 0;
      this.s1long38   = 0;
      this.s1byte42   = 0;
      this.s1byte43   = 0;
      this.s1byte44   = 0;
      this.s1byte45   = 0;
      this.s1word46   = 0;
      this.s1byte48   = 0;
      this.s1byte49   = 0;
      this.s1byte50   = 0;
      this.s1byte51   = 0;
      this.s1word52   = 0;
      this.s1word54   = 0;
      this.s1byte56   = 0;
      this.s1byte64   = 0;
      this.s1word66   = 65535;
      this.s1word68   = 0;
      this.s1word70   = 0;
      this.s2word10   = 0;
      this.s2word14   = 0;
      this.s2word16   = 0;
      this.s2word18   = 0;
      this.s2word20   = 0;
      this.s2word22   = 0;
      this.s2word24   = 0;
      this.v1word14   = 0;
      this.v1word16   = 0;
      this.v1word18   = 0;
    };
  }

  window.neoart.Trackers.BenDaglish = function() {
    tracker = new BenDaglish();
    return player;
  }

  class DavidWhittaker extends Tracker {
    constructor() {
      super(Amiga);

      this.active      = 0;
      this.base        = 0;
      this.com2        = 0;
      this.com3        = 0;
      this.com4        = 0;
      this.delayCtr    = 0;
      this.delaySpeed  = 0;
      this.fadeCtr     = 0;
      this.fadeSpeed   = 0;
      this.freqs       = 0;
      this.master      = 0;
      this.periods     = 0;
      this.rlen        = 0;
      this.rmix        = 0;
      this.slower      = 0;
      this.slowerCtr   = 0;
      this.songVol     = 0;
      this.stream      = null;
      this.transpose   = 0;
      this.vols        = 0;
      this.wave        = null;
      this.waveCenter  = 0;
      this.waveDir     = 0;
      this.waveLen     = 0;
      this.waveLo      = 0;
      this.waveHi      = 0;
      this.wavePos     = 0;
      this.waveRateNeg = 0;
      this.waveRatePos = 0;

      this.voices[0] = new DWVoice(0);
      this.voices[1] = new DWVoice(1);
      this.voices[2] = new DWVoice(2);
      this.voices[3] = new DWVoice(3);

      ID.push("David Whittaker");

      mixer.process = this.process.bind(this);

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[this.active];
      super.initialize();

      this.delayCtr   = 0;
      this.delaySpeed = song.delay;
      this.fadeCtr    = 0;
      this.fadeSpeed  = 0;
      this.slowerCtr  = 0;
      this.songVol    = this.master;
      this.speed      = song.speed;
      this.transpose  = 0;

      if (this.wave) {
        this.waveDir = 0;
        this.wavePos = this.wave.pointer + this.waveCenter;

        mixer.memory.fill(this.waveRateNeg, this.wave.pointer, this.wavePos);
        mixer.memory.fill(this.waveRatePos, this.wavePos, this.wavePos + this.waveCenter);
      }

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];

        voice.trackPtr = song.tracks[voice.index];
        voice.trackPos = this.rlen;
        this.stream.position = voice.trackPtr;
        voice.patternPos = this.base + this.stream[this.rmix];

        this.complete += (1 << voice.index);
        this.played[voice.trackPtr] = 1;

        if (this.freqs) {
          this.stream.position = this.freqs;
          voice.freqsPtr = this.base + this.stream.ushort;
          voice.freqsPos = voice.freqsPtr;
        }
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var size = 10;
      var flag, headers, i, index, info, lower, pos, sample, song, total, value;

      this.master = 64;
      this.rlen = 2;
      this.rmix = "ushort";

      if (stream.ushort == 0x48e7) {                                          // movem.l
        stream.position = 4;
        if (stream.ushort != 0x6100) { return; }                              // bsr.w

        stream.position += stream.ushort;
        variant = 30;
      } else {
        stream.position = 0;
      }

      do {
        value = stream.ushort;

        switch (value) {
          case 0x47fa:                                                        // lea (xx,a3)
            this.base = stream.position + stream.short;
            break;
          case 0x6100:                                                        // bsr.w
            stream.position += 2;
            info = stream.position;

            if (stream.ushort == 0x6100) {                                    // bsr.w
              info = stream.position + stream.ushort;
            }
            break;
          case 0xc0fc:                                                        // mulu.w (xx,d0)
            size = stream.ushort;

            if (size == 18) {
              this.rlen = 4;
              this.rmix = "uint";
            } else {
              variant = 10;
            }

            if (stream.ushort == 0x41fa) {                                    // lea [xx,a0]
              headers = stream.position + stream.ushort;
            }

            if (stream.ushort == 0x1230) { flag = 1; }                        // move.b [(a0,d0.w),d1]
            break;
          case 0x1230:                                                        // move.b [(a0,d0.w),d1]
            stream.position -= 6;

            if (stream.ushort == 0x41fa) {                                    // lea [xx,a0]
              headers = stream.position + stream.ushort;
              flag = 1;
            }

            stream.position += 4;
            break;
          case 0xbe7c:                                                        // cmp.w [xx,d7]
            channels = stream.ushort;
            stream.position += 2;

            if (stream.ushort == 0x377c) {
              this.master = stream.ushort;
            }
            break;
        }

        if (stream.bytesAvailable < 20) { return; }
      } while (value != 0x4e75);                                              // rts

      if (!headers || !info) { return; }

      this.list.length = 0;
      lower = 0x7fffffff;
      index = stream.position;
      stream.position = headers;

      do {
        song = new Song();
        song.tracks.length = channels;

        if (flag) {
          song.speed = stream.ubyte;
          song.delay = stream.ubyte;
        } else {
          song.speed = stream.ushort;
        }

        if (song.speed > 255) { break; }

        for (i = 0; i < channels; i++) {
          value = this.base + stream[this.rmix];
          if (value < lower) { lower = value; }
          song.tracks[i] = value;
        }

        this.list.push(song);
        if ((lower - stream.position) < size) { break; }
      } while (1);

      if (!this.list.length) { return; }

      stream.position = info;
      if (stream.ushort != 0x4a2b) { return; }                                // tst.b [xx(a3)]
      headers = size = 0;

      this.wave = null;
      this.samples.length = 0;

      do {
        value = stream.ushort;

        switch (value) {
          case 0x4bfa:                                                        // lea [xx,a5]
            if (headers) { break; }
            info = stream.position + stream.short;
            stream.position++;
            total = stream.ubyte;

            stream.position -= 10;
            value = stream.ushort;
            pos = stream.position;

            if (value == 0x41fa || value == 0x207a) {                         // lea [xx,a0] || movea.l [xx,a0]
              headers = stream.position + stream.ushort;
            } else if (value == 0xd0fc) {                                     // adda.l [xx,a0]
              headers = 64 + stream.ushort;
              stream.position -= 18;
              headers += (stream.position + stream.ushort);
            }

            stream.position = pos;
            break;
          case 0x84c3:                                                        // divu.w [d3,d2]
            if (size) { break; }
            stream.position += 4;
            value = stream.ushort;

            if (value == 0xdafc) {                                            // adda.w [xx,a5]
              size = stream.ushort;
            } else if (value == 0xdbfc) {                                     // adda.l [xx,a5]
              size = stream.uint;
            }

            if (size == 12 && variant < 30) { variant = 20; }

            pos = stream.position;
            this.samples.length = ++total;
            stream.position = headers;

            for (i = 0; i < total; i++) {
              sample = new Sample();
              sample.length = stream.uint;
              sample.relative = (3579545 / stream.ushort) >> 0;
              sample.pointer = stream.position;

              value = stream.position + sample.length;
              stream.position = info + (i * size) + 4;
              sample.loopPtr = stream.int;

              if (!variant) {
                stream.position += 6;
                sample.volume = stream.ushort;
              } else if (variant == 10) {
                stream.position += 4;
                sample.volume = stream.ushort;
                sample.finetune = stream.byte;
              }

              stream.position = value;
              this.samples[i] = sample;
            }

            mixer.loopLen = 64;
            stream.position = pos;
            break;
          case 0x207a:                                                        // movea.l [xx,a0]
            value = stream.position + stream.short;

            if (stream.ushort != 0x323c) {                                    // move.w [xx,d1]
              stream.position -= 2;
              break;
            }

            this.wave = this.samples[((value - info) / size) >> 0];
            this.waveCenter = (stream.ushort + 1) << 1;

            stream.position += 2;
            this.waveRateNeg = stream.byte;
            stream.position += 12;
            this.waveRatePos = stream.byte;
            break;
          case 0x046b:                                                        // subi.w [xx,xx(a3)]
          case 0x066b:                                                        // addi.w [xx,xx(a3)]
            total = stream.ushort;
            sample = this.samples[((stream.ushort - info) / size) >> 0];

            if (value == 0x066b) {                                            // addi.w [xx,xx(a3)]
              sample.relative += total;
            } else {
              sample.relative -= total;
            }
            break;
        }
      } while (value != 0x4e75);                                              // rts

      if (!this.samples.length) { return; }

      stream.position = index;
      this.freqs = 0;
      this.periods = 0;
      this.slower = 0;
      this.vols = 0;

      this.com2 = 0xb0;
      this.com3 = 0xa0;
      this.com4 = 0x90;

      do {
        value = stream.ushort;

        switch (value) {
          case 0x47fa:                                                        // lea [xx,a3]
            stream.position += 2;
            if (stream.ushort != 0x4a2b) { break; }                           // tst.b [xx(a3)]

            pos = stream.position;
            stream.position += 4;
            value = stream.ushort;

            if (value == 0x103a) {                                            // move.b [xx,d0]
              stream.position += 4;

              if (stream.ushort == 0xc0fc) {                                  // mulu.w [xx,d0]
                value = stream.ushort;
                total = this.list.length;

                for (i = 0; i < total; i++) {
                  this.list[i].delay *= value;
                }

                stream.position += 6;
              }
            } else if (value == 0x532b) {                                     // subq.b [xx,xx(a3)]
              stream.position -= 8;
            }

            if (stream.ushort == 0x4a2b) {                                    // tst.b [xx(a3)]
              stream.position = this.base + stream.ushort;
              this.slower = stream.byte;
            }

            stream.position = pos;
            break;
          case 0x0c6b:                                                        // cmpi.b [xx,xx(a3)]
            stream.position -= 6;
            value = stream.ushort;

            if (value == 0x546b || value == 0x526b) {                         // addq.w [#2,xx(a3)] || addq.w [#1,xx(a3)]
              stream.position += 4;
              this.waveHi = this.wave.pointer + stream.ushort;
            } else if (value == 0x556b || value == 0x536b) {                  // subq.w [#2,xx(a3)] || subq.w [#1,xx(a3)]
              stream.position += 4;
              this.waveLo = this.wave.pointer + stream.ushort;
            }

            this.waveLen = (value < 0x546b) ? 1 : 2;
            break;
          case 0x7e00:                                                        // moveq [#0,d7]
          case 0x7e01:                                                        // moveq [#1,d7]
          case 0x7e02:                                                        // moveq [#2,d7]
          case 0x7e03:                                                        // moveq [#3,d7]
            this.active = value & 0x0f;
            total = channels - 1;

            if (this.active) {
              this.voices[0].next = null;

              for (i = total; i > 0;) {
                this.voices[i].next = this.voices[--i];
              }
            } else {
              this.voices[total].next = null;

              for (i = 0; i < total;) {
                this.voices[i].next = this.voices[++i];
              }
            }
            break;
          case 0x0c68:                                                        // cmpi.w [xx,xx(a0)]
            stream.position += 22;
            if (stream.ushort == 0x0c11) { variant = 40; }                    // ???
            break;
          case 0x322d:                                                        // move.w [xx(a5),d1]
            pos = stream.position;
            value = stream.ushort;

            if (value == 0x000a || value == 0x000c) {
              stream.position -= 8;

              if (stream.ushort == 0x45fa) {                                  // lea [xx,a2]
                this.periods = stream.position + stream.ushort;
              }
            }

            stream.position = pos + 2;
            break;
          case 0x0400:                                                        // subi.b [xx,d0]
          case 0x0440:                                                        // subi.w [xx,d0]
          case 0x0600:                                                        // addi.b [xx,d0]
            value = stream.ushort;

            if (value == 0x00c0 || value == 0x0040) {
              this.com2 = 0xc0;
              this.com3 = 0xb0;
              this.com4 = 0xa0;
            } else if (value == this.com3) {
              stream.position += 2;

              if (stream.ushort == 0x45fa) {                                  // lea [xx,a2]
                this.vols = stream.position + stream.ushort;
                if (variant < 40) { variant = 30; }
              }
            } else if (value == this.com4) {
              stream.position += 2;

              if (stream.ushort == 0x45fa) {                                  // lea [xx,a2]
                this.freqs = stream.position + stream.ushort;
              }
            }
            break;
          case 0x4ef3:                                                        // jmp [(a3,a2.w)]
            stream.position += 2;
          case 0x4ed2:                                                        // jmp [a2]
            lower = stream.position;
            stream.position -= 10;
            stream.position += stream.ushort;
            pos = stream.position;                                            // jump table address

            stream.position += 2;
            stream.position = this.base + stream.ushort + 10;
            if (stream.ushort == 0x4a14) { variant = 41; }                    // tst.b [(a4)]

            stream.position = pos + 16;
            value = this.base + stream.ushort;

            if (value > lower && value < pos) {
              stream.position = value;
              value = stream.ushort;

              if (value == 0x50e8) {                                          // st [xx(a0)]
                variant = 21;
              } else if (value == 0x1759) {                                   // move.b [(a1)+,xx(a3)]
                variant = 11;
              }
            }

            stream.position = pos + 20;                                       // fx -118
            value = this.base + stream.ushort;

            if (value > lower && value < pos) {
              stream.position = value + 2;
              if (stream.ushort != 0x4880) { variant = 31; }                  // ext.w [d0]
            }

            stream.position = pos + 26;                                       // fx -115
            value = stream.ushort;
            if (value > lower && value < pos) { variant = 32; }

            if (this.freqs) { stream.position = stream.length; }
            break;
        }
      } while (stream.bytesAvailable > 16);

      if (!this.periods) { return; }

      this.com2 -= 256;
      this.com3 -= 256;
      this.com4 -= 256;

      stream.fill(0, 0, mixer.loopLen);

      version = 1;
      this.stream = stream;
    };

    process() {
      var voice = this.voices[this.active];
      var chan, loop, pos, sample, value, vol;

      if (this.slower) {
        if (--this.slowerCtr == 0) {
          this.slowerCtr = 6;
          position += mixer.ticksize;
          return;
        }
      }

      if ((this.delayCtr += this.delaySpeed) > 255) {
        this.delayCtr -= 256;
        position += mixer.ticksize;
        return;
      }

      if (this.fadeSpeed) {
        if (--this.fadeCtr == 0) {
          this.fadeCtr = this.fadeSpeed;
          this.songVol--;
        }

        if (!this.songVol) {
          if (!loop) {
            mixer.complete = 1;
          } else {
            this.initialize();
          }
        }
      }

      if (this.wave) {
        if (this.waveDir) {
          mixer.memory[this.wavePos++] = this.waveRatePos;
          if (this.waveLen > 1) { mixer.memory[this.wavePos++] = this.waveRatePos; }
          if ((this.wavePos -= (this.waveLen << 1)) == this.waveLo) { this.waveDir = 0; }
        } else {
          mixer.memory[this.wavePos++] = this.waveRateNeg;
          if (this.waveLen > 1) { mixer.memory[this.wavePos++] = this.waveRateNeg; }
          if (this.wavePos == this.waveHi) { this.waveDir = 1; }
        }
      }

      do {
        chan = voice.channel;
        sample = voice.sample;
        this.stream.position = voice.patternPos;

        if (!voice.busy) {
          voice.busy = 1;

          if (sample.loopPtr < 0) {
            chan.pointer = 0;
            chan.length = mixer.loopLen;
          } else {
            chan.pointer = sample.pointer + sample.loopPtr;
            chan.length = sample.length - sample.loopPtr;
          }
        }

        if (--voice.tick == 0) {
          voice.flags = 0;
          loop = 1;

          do {
            value = this.stream.byte;

            if (value < 0) {
              if (value >= -32) {
                voice.speed = this.speed * (value + 33);
              } else if (value >= this.com2) {
                value -= this.com2;
                sample = voice.sample = this.samples[value];
              } else if (value >= this.com3) {
                pos = this.stream.position;

                this.stream.position = this.vols + ((value - this.com3) << 1);
                this.stream.position = this.base + this.stream.ushort;
                voice.volsPtr = this.stream.position;

                this.stream.position--;
                voice.volSpeed = this.stream.ubyte;
                this.stream.position = pos;
              } else if (value >= this.com4) {
                pos = this.stream.position;

                this.stream.position = this.freqs + ((value - this.com4) << 1);
                voice.freqsPtr = this.base + this.stream.ushort;
                voice.freqsPos = voice.freqsPtr;

                this.stream.position = pos;
              } else {
                switch (value) {
                  case -128:
                    this.stream.position = voice.trackPtr + voice.trackPos;
                    value = this.stream[this.rmix];

                    if (value) {
                      this.stream.position = this.base + value;
                      voice.trackPos += this.rlen;
                    } else {
                      this.stream.position = voice.trackPtr;
                      this.stream.position = this.base + this.stream[this.rmix];
                      voice.trackPos = this.rlen;

                      this.complete &= ~(1 << voice.index);
                      if (!this.complete) { mixer.complete = 1; }
                    }
                    break;
                  case -127:
                    if (variant) { voice.portaDelta = 0; }
                    voice.portaSpeed = this.stream.byte;
                    voice.portaDelay = this.stream.ubyte;
                    voice.flags |= 2;
                    break;
                  case -126:
                    voice.tick = voice.speed;
                    voice.patternPos = this.stream.position;

                    if (variant == 41) {
                      voice.busy = 1;
                      chan.enabled = 0;
                    } else {
                      chan.pointer = 0;
                      chan.length = mixer.loopLen;
                    }

                    loop = 0;
                    break;
                  case -125:
                    if (!variant) { break; }
                    voice.tick = voice.speed;
                    voice.patternPos = this.stream.position;

                    chan.enabled = 1;
                    loop = 0;
                    break;
                  case -124:
                    mixer.complete = 1;
                    break;
                  case -123:
                    if (variant) { this.transpose = this.stream.byte; }
                    break;
                  case -122:
                    voice.vibrato = -1;
                    voice.vibSpeed = this.stream.ubyte;
                    voice.vibDepth = this.stream.ubyte;
                    voice.vibDelta = 0;
                    break;
                  case -121:
                    voice.vibrato = 0;
                    break;
                  case -120:
                    if (variant == 21) {
                      voice.halve = 1;
                    } else if (variant == 11) {
                      this.fadeSpeed = this.stream.ubyte;
                    } else {
                      voice.transpose = this.stream.byte;
                    }
                    break;
                  case -119:
                    if (variant == 21) {
                      voice.halve = 0;
                    } else {
                      voice.trackPtr = this.base + this.stream.ushort;
                      voice.trackPos = 0;

                      if (this.played[voice.trackPtr]) {
                        this.complete &= ~(1 << voice.index);
                        if (!this.complete) { mixer.complete = 1; }
                      } else {
                        this.played[voice.trackPtr] = 1;
                      }
                    }
                    break;
                  case -118:
                    value = this.stream.ubyte;

                    if (variant == 31) {
                      this.delaySpeed = value;
                    } else {
                      this.speed = value;
                    }
                    break;
                  case -117:
                    this.fadeSpeed = this.stream.ubyte;
                    this.fadeCtr = this.fadeSpeed;
                    break;
                  case -116:
                    value = this.stream.ubyte;
                    if (variant != 32) { this.songVol = value; }
                    break;
                }
              }
            } else {
              voice.patternPos = this.stream.position;
              voice.note = (value += sample.finetune);
              voice.tick = voice.speed;
              voice.busy = 0;

              if (variant >= 20) {
                value = (value + this.transpose + voice.transpose) & 0xff;
                this.stream.position = voice.volsPtr;
                vol = this.stream.ubyte;

                voice.volsPos = this.stream.position;
                voice.volCtr = voice.volSpeed;

                if (voice.halve) { vol >>= 1; }
                vol = (vol * this.songVol) >> 6;
              } else {
                vol = sample.volume;
              }

              chan.pointer = sample.pointer;
              chan.length = sample.length;
              chan.volume = vol;

              this.stream.position = this.periods + (value << 1);
              value = (this.stream.ushort * sample.relative) >> 10;
              if (variant < 10) { voice.portaDelta = value; }

              chan.period = value;
              chan.enabled = 1;
              loop = 0;

              cache[writePos].notes[voice.index] = value;
            }
          } while (loop);
        } else if (voice.tick == 1) {
          if (variant < 30) {
            chan.enabled = 0;
          } else {
            value = this.stream.ubyte;

            if (value != 131) {
              if (variant < 40 || value < 224 || this.stream.ubyte != 131) {
                chan.enabled = 0;
              }
            }
          }
        } else if (!variant) {
          if (voice.flags & 2) {
            if (voice.portaDelay) {
              voice.portaDelay--;
            } else {
              voice.portaDelta -= voice.portaSpeed;
              chan.period = voice.portaDelta;
            }
          }
        } else {
          this.stream.position = voice.freqsPos;
          value = this.stream.byte;

          if (value < 0) {
            value &= 0x7f;
            this.stream.position = voice.freqsPtr;
          }

          voice.freqsPos = this.stream.position;

          value = (value + voice.note + this.transpose + voice.transpose) & 0xff;
          this.stream.position = this.periods + (value << 1);
          value = (this.stream.ushort * sample.relative) >> 10;

          if (voice.flags & 2) {
            if (voice.portaDelay) {
              voice.portaDelay--;
            } else {
              voice.portaDelta += voice.portaSpeed;
              value -= voice.portaDelta;
            }
          }

          if (voice.vibrato) {
            if (voice.vibrato > 0) {
              voice.vibDelta -= voice.vibSpeed;
              if (!voice.vibDelta) { voice.vibrato ^= 0x80000000; }
            } else {
              voice.vibDelta += voice.vibSpeed;
              if (voice.vibDelta == voice.vibDepth) { voice.vibrato ^= 0x80000000; }
            }

            if (!voice.vibDelta) { voice.vibrato ^= 1; }

            if (voice.vibrato & 1) {
              value += voice.vibDelta;
            } else {
              value -= voice.vibDelta;
            }
          }

          chan.period = value;

          if (variant >= 20) {
            if (--voice.volCtr < 0) {
              this.stream.position = voice.volsPos;
              vol = this.stream.byte;

              if (vol >= 0) { voice.volsPos = this.stream.position; }
              voice.volCtr = voice.volSpeed;
              vol &= 0x7f;

              if (voice.halve) { vol >>= 1; }
              chan.volume = (vol * this.songVol) >> 6;
            }
          }
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class DWVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel    = null;
      this.sample     = null;
      this.trackPtr   = 0;
      this.trackPos   = 0;
      this.patternPos = 0;
      this.freqsPtr   = 0;
      this.freqsPos   = 0;
      this.volsPtr    = 0;
      this.volsPos    = 0;
      this.volCtr     = 0;
      this.volSpeed   = 0;
      this.halve      = 0;
      this.speed      = 0;
      this.tick       = 1;
      this.busy       = 1;
      this.flags      = 0;
      this.note       = 0;
      this.period     = 0;
      this.transpose  = 0;
      this.portaDelay = 0;
      this.portaDelta = 0;
      this.portaSpeed = 0;
      this.vibrato    = 0;
      this.vibDelta   = 0;
      this.vibDepth   = 0;
      this.vibSpeed   = 0;
    };
  }

  window.neoart.Trackers.DavidWhittaker = function() {
    tracker = new DavidWhittaker();
    return player;
  }

  class JasonBrooke extends Tracker {
    constructor() {
      super(Amiga);

      this.command   = 0;
      this.periods   = 0;
      this.pblock    = 0;
      this.ptrack    = 0;
      this.sdata     = 0;
      this.stream    = null;
      this.transpose = 0;
      this.vblock    = 0;
      this.vtrack    = 0;
      this.waveDir   = 0;
      this.wavePos   = 0;
      this.waveLower = 0;
      this.waveUpper = 0;

      this.voices[0] = new JBVoice(0);
      this.voices[0].next = this.voices[1] = new JBVoice(1);
      this.voices[1].next = this.voices[2] = new JBVoice(2);
      this.voices[2].next = this.voices[3] = new JBVoice(3);

      this.voices[1].prev = this.voices[0];
      this.voices[2].prev = this.voices[1];
      this.voices[3].prev = this.voices[2];

      ID.push("Jason Brooke", "Jason Brooke Old");

      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var chan;
      super.initialize();

      this.speed     = song.speed;
      this.tick      = (variant < 3) ? 1 : 255;
      this.transpose = 0;
      this.waveDir   = 0;
      this.wavePos   = this.sdata;
      this.waveLower = this.sdata;
      this.waveUpper = this.sdata;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        this.complete += (1 << voice.index);

        if (variant < 3) {
          chan = voice.channel;

          chan.pointer = 0;
          chan.length = 128;
          chan.volume = 0;
          chan.enabled = 1;
        } else {
          voice.trackLen = song.length[voice.index];
          voice.trackLoop = song.restart[voice.index];
        }

        voice.track = song.tracks[voice.index];
        this.stream.position = voice.track;
        voice.patternPos = this.stream.ushort;
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var samplesLo = 0xff0000;
      var i, pos, sample, song, value;

      if (stream.uint == 0x48e7f0f0) {
        return this.parseOld(stream);
      }

      stream.position = 38;

      if (stream.ushort == 0xa001) {
        variant = 3;
      } else {
        stream.position = 50;

        if (stream.ushort == 0xa001) {
          variant = 4;
        } else {
          stream.position = 42;
          if (stream.ushort != 0xa001) { return; }
          variant = 5;
        }
      }

      do {
        switch (stream.ushort) {
          case 0x143c:                                                    // move.b [xx,d2]
            value = stream.ushort;
            if (stream.ushort == 0x7603) { this.command = value; }        // moveq [#3,d3]
            break;
          case 0x43fa:                                                    // lea [xx,a1]
            value = stream.position + stream.ushort;
            if (stream.ushort == 0x4a28) { this.vblock = value; }         // tst.b [xx(a0)]
            break;
          case 0x1031:                                                    // move.b [xx(a1,d1.w),d0]
            if (variant == 5) {
              stream.position -= 10;

              if (stream.ushort != 0x1231) {                              // move.b [xx(a1,d1.w),d1]
                stream.position += 8;
                break;
              }

              stream.position++;
              this.ptrack = this.vblock + stream.byte;
              stream.position += 7;
            } else {
              stream.position -= 4;

              if (stream.ushort != 0x5201) {                              // addq.b [#1,d1]
                stream.position += 2;
                break;
              }

              stream.position += 3;
            }

            this.pblock = this.vblock + stream.byte;
            break;
          case 0x323b:                                                    // move.w [xx(pc,d0.w),d1]
            value = stream.position + stream.ushort;
            if (stream.ushort == 0xc2c2) { this.periods = value; }        // mulu.w [d2,d1]
            break;
          case 0x45fa:                                                    // lea [xx,a2]
            value = stream.position + stream.ushort;
            i = stream.ushort;

            if (i == 0x1172) {                                            // move.b [(a2,d0.w),xx(a0)]
              this.ptrack = value;
            } else if (i == 0x1032) {                                     // move.b [(a2,d0.w),d0]
              this.vtrack = value;
            }
            break;
          case 0xc2fc:                                                    // mulu.w [#10,d1]
            stream.position += 2;

            if (stream.ushort == 0x45fa) {                                // lea [xx,a2]
              pos = stream.position;
              stream.position = pos + stream.ushort;
              this.samples.length = 0;

              do {
                sample = new Sample();
                sample.relative = stream.ushort;
                sample.pointer = value = stream.uint;
                sample.length = stream.ushort;
                sample.repeat = stream.short;

                if (sample.repeat < 0) {
                  sample.loopPtr = 0;
                  sample.repeat = 4;
                } else {
                  sample.loopPtr = sample.pointer + sample.repeat;
                  sample.repeat = sample.length - sample.repeat;
                }

                if (value > stream.position && value < samplesLo) { samplesLo = value; }

                this.samples.push(sample);
              } while (stream.position < samplesLo);

              stream.position = pos;
            }
            break;
          case 0x51c9:                                                    // dbf [d1,xx]
            stream.position += 2;

            if (stream.ushort == 0x43fa) {                                // lea [xx,a1]
              this.list.length = 0;
              stream.position += stream.ushort;

              do {
                song = new Song();
                song.length = [];
                song.speed = stream.ubyte;
                song.restart = [];
                i = 0;

                do {
                  song.length[i] = stream.ubyte;
                  song.restart[i] = stream.ubyte;

                  value = stream.ushort;
                  if (value > stream.position) { break; }
                  song.tracks[i++] = value;
                } while (i < 4);

                if (i == 4) {
                  this.list.push(song);
                  if (stream.ubyte != 0) { break; }
                } else {
                  break;
                }
              } while (1);

              if (!this.list.length) { return; }
              stream.position = stream.length;
            }
            break;
        }
      } while (stream.bytesAvailable > 4);

      if (!this.ptrack || !this.pblock || !this.vtrack || !this.vblock || !this.periods) { return; }

      if (variant == 5) {
        stream.position = 0x290;
        if (stream.ushort == 0xd028) { variant++; }                       // add.b [xx(a0),d0]

        stream.position = 0x4f6;
        if (stream.ushort == 0x1759) { variant++; }                       // move.b [(a1)+,xx(a3)]
      }

      sample = this.samples[0];
      sample.pointer = sample.loopPtr = 0;
      sample.length  = sample.repeat  = 4;

      this.sdata = this.samples[1].pointer;
      stream.fill(0, 0, 4);

      mixer.process = this.process.bind(this);

      version = 1;
      this.stream = stream;
    };

    parseOld(stream) {
      var i, pos, song, value;

      this.samples.length = 0;

      do {
        switch (stream.ushort) {
          case 0x43fa:                                                    // lea [xx,a1]
            value = stream.position + stream.ushort;
            if (stream.ushort == 0x7603) { this.pblock = value; }         // moveq [#3,d3]
            break;
          case 0x45fa:                                                    // lea [xx,a2]
            value = stream.position + stream.ushort;
            pos = stream.ushort;

            if (pos == 0xd4c0) {                                          // adda.w [d0,a2]
              this.sdata = value;
            } else if (pos == 0x103b) {                                   // move.b [xx(pc,d0.w),d0]
              this.vblock = value;
              stream.position -= 2;
            }
            break;
          case 0x117b:                                                    // move.b [xx(pc.d0.w),xx(a0)]
            value = (stream.position + stream.ushort) - 256;
            if (stream.ushort == 0x0016) { this.ptrack = value; }         // 22(a0)
            break;
          case 0x103b:                                                    // move.b [xx(pc,d0.w),d0]
            value = stream.position + stream.ushort;
            pos = stream.ushort;

            if (pos == 0xd028) {
              this.vtrack = value;
              stream.position += 6;

              if (stream.ushort == 0x1171) {                              // move.b [xx(a1,d0.w),xx(a0)]
                this.vblock = this.pblock + stream.ushort;
              }
            } else if (pos == 0xd4c0) {
              this.vtrack = value;
            }
            break;
          case 0x323b:                                                    // move.b [xx(pc,d0.w),d1]
            value = stream.position + stream.ushort;
            if (stream.ushort == 0x0810) { this.periods = value; }        // btst [#6,(a0)]
            break;
          case 0x137b:                                                    // move.b [xx(pc,d0.w),xx(a1)]
            value = stream.position + stream.ushort;
            stream.position += 2;

            if (stream.ushort == 0x41fa) {                                // lea [xx,a0]
              pos = stream.position + stream.ushort;
              stream.position = value;
              this.list.length = 0;

              do {
                song = new Song();
                song.speed = stream.ubyte;

                for (i = 0; i < 4; i++) {
                  song.tracks[i] = stream.ushort;
                }

                this.list.push(song);
                if (stream.byte) { break; }
              } while (stream.position < pos);

              if (!this.list.length) { return; }
              stream.position = stream.length;
            }
            break;
        }
      } while (stream.bytesAvailable > 4);

      if (!this.ptrack || !this.pblock || !this.vtrack || !this.vblock || !this.periods) { return; }

      variant = 2;
      stream.position = 214;

      if (stream.uint == 0x10bc0040) {                                    // move.b [#$40,(a0)]
        variant = 0;
      } else {
        stream.position = 244;
        if (stream.uint == 0x08d00005) { variant = 1; }                   // bset [#5,(a0)]
      }

      stream.fill(0, 0, 128);

      mixer.process = this.processOld.bind(this);

      version = 2;
      this.stream = stream;
    };

    process() {
      var voice = this.voices[0];
      var chan, loop, period, sample, temp, value;

      value = (this.waveDir) ? this.waveLower : this.waveUpper;

      if (this.wavePos < value) {
        mixer.memory[this.wavePos++] = -128;
      } else if (this.wavePos > value) {
        mixer.memory[this.wavePos--] = 0;
      } else {
        this.waveDir ^= 1;
      }

      do {
        chan = voice.channel;
        sample = this.samples[voice.sample2];

        if (voice.state) {
          if (--voice.state) {
            chan.pointer = sample.pointer;
            chan.length = sample.length;
          } else {
            chan.pointer = sample.loopPtr;
            chan.length = sample.repeat;
          }

          chan.enabled = 1;
        }

        chan.volume = ((voice.volume >> 2) * voice.volumeMod) >> 8;

        if (voice.volCounter) {
          if (--voice.volCounter == 0) {
            this.stream.position = (1 + this.vblock) + voice.volPos;
            voice.volCounter = this.stream.ubyte;

            if (voice.volCounter) {
              voice.volPos += 2;
              this.stream.position = this.vblock + voice.volPos;
              voice.volume = (voice.volume + this.stream.byte) & 255;
            }
          } else {
            this.stream.position = this.vblock + voice.volPos;
            voice.volume = (voice.volume + this.stream.byte) & 255;
          }
        }

        if (variant > 4) {
          this.stream.position = this.ptrack + voice.slidePointer;
          value = this.stream.ubyte + voice.slidePos;
          this.stream.position = this.pblock + value;
          temp = this.stream.byte;

          if (temp >= 0) { voice.slidePos = 255; }

          if (++temp != 0) {
            temp--;
            voice.slidePos = (voice.slidePos + 1) & 255;
          }

          if (variant == 5) { temp = 0; }
        } else {
          value = voice.slidePos + 1;
          this.stream.position = this.pblock + value;
          temp = this.stream.byte;

          if (temp < 0) {
            if (++temp != 0) {
              temp += 127;
              voice.slidePos = voice.slidePointer;
            }
          } else {
            voice.slidePos = value;
          }
        }

        temp += (voice.note + voice.periodMod + this.transpose);
        temp = (temp << 1) & 255;

        this.stream.position = this.periods + temp;
        period = ((this.stream.ushort * sample.relative) << 3) >> 16;

        if (voice.flags & 64) {
          temp = voice.slideStep;
          if (!temp) { temp = voice.flags & 1; }

          if (voice.flags & 16) {
            temp += voice.slideValue;
            voice.slideValue = temp;
            if (temp == voice.slideLimit) { voice.flags ^= 16; }
          } else {
            voice.slideValue -= temp;
            if (!voice.slideValue) { voice.flags ^= 16; }
          }

          period += (temp - (voice.slideLimit >> 1));
        }

        voice.flags ^= 1;

        if (voice.flags & 4) {
          if (voice.portaCounter) {
            voice.portaCounter--;
          } else {
            voice.portaPeriod += voice.portaStep;
            period += voice.portaPeriod;
          }
        }

        chan.period = period;
      } while (voice = voice.next);

      if ((this.tick += this.speed) > 255) {
        this.tick &= 255;
        voice = this.voices[3];

        do {
          if (--voice.counter <= 0) {
            this.stream.position = voice.patternPos;
            voice.flags &= 80;
            loop = 1;

            if (variant > 4) {
              do {
                value = this.stream.ubyte;

                if (value < this.command) {
                  voice.delay = value;
                } else if (value < 0x60) {
                  loop = this.fx(voice, (value - this.command));
                } else if (value < 0x80) {
                  voice.volPointer = value - 0x60;
                } else if (value < 0xe0) {
                  voice.note = value - 0x80;
                  if (voice.flags & 2) { loop = 0; }

                  voice.slidePos = 0;
                  voice.sample2 = voice.sample1;

                  if (!(voice.flags & 32)) {
                    voice.state = 2;
                    voice.channel.enabled = 0;
                  }

                  cache[writePos].notes[voice.index] = voice.note;
                  break;
                } else {
                  voice.sample1 = value - 0xe0;
                }
              } while (loop);
            } else {
              do {
                value = this.stream.ubyte;

                if (value < 0x80) {
                  voice.note = value;
                  if (voice.flags & 2) { loop = 0; }

                  voice.slidePos = voice.slidePointer;
                  voice.sample2 = voice.sample1;

                  if (!(voice.flags & 32)) {
                    voice.state = 2;
                    voice.channel.enabled = 0;
                  }

                  cache[writePos].notes[voice.index] = voice.note;
                  break;
                } else if (value < this.command) {
                  loop = this.fx(voice, (value - 0x80));
                } else if (value < 0xa0) {
                  voice.slidePointer = this.stream.readAt(this.ptrack + (value + 0x60));
                } else if (value < 0xc0) {
                  voice.sample1 = value - 0xa0;
                } else if (value < 0xe0) {
                  voice.volPointer = value - 0xc0;
                } else {
                  voice.delay = value - 0xdf;
                }
              } while (loop);
            }

            if (loop) {
              loop = 0;
              temp = this.stream.position;

              this.stream.position = this.vtrack + voice.volPointer;
              voice.volPos = this.stream.ubyte;
              this.stream.position = this.vblock + voice.volPos;
              voice.volume = this.stream.ubyte;
              voice.volCounter = 1;

              this.stream.position = temp;
            }

            voice.counter = voice.delay;
            voice.patternPos = this.stream.position;
          } else if (voice.flags & 8) {
            if (voice.flags & 128) {
              voice.note--;
            } else {
              voice.note++;
            }
          }
        } while (voice = voice.prev);
      }

      position += mixer.ticksize;
    };

    processOld() {
      var voice = this.voices[0];
      var chan, loop, period, temp, value;

      if (--this.tick == 0) {
        this.tick = this.speed;

        do {
          if (--voice.counter == 0) {
            this.stream.position = voice.patternPos;
            voice.flags &= 112;
            loop = 1;

            do {
              value = this.stream.ubyte;

              if (value < 0x80) {
                voice.note = value;
                voice.slidePos = voice.slidePointer;

                if (!(voice.flags & 256)) {
                  voice.volPos = 0;
                  voice.volume = 0;
                }

                cache[writePos].notes[voice.index] = voice.note;
                break;
              } else if (value < 0x90) {
                switch (value) {
                  case 0x80:
                    voice.volume = 192;
                    loop = 0;
                    break;
                  case 0x81:
                    voice.flags = 0;
                    break;
                  case 0x82:
                    voice.portaStep = this.stream.byte;
                    voice.portaPeriod = 0;
                    voice.portaCounter = this.stream.ubyte;
                    voice.flags |= 4;
                    break;
                  case 0x83:
                    voice.flags |= 136;
                    break;
                  case 0x84:
                    voice.flags |= 8;
                    break;
                  case 0x85:
                    value = voice.trackPos + 2;
                    this.stream.position = voice.track + value;
                    temp = this.stream.ushort;

                    if (!temp) {
                      value = 0;
                      this.stream.position = voice.track;
                      this.stream.position = this.stream.ushort;

                      if (!this.complete) { mixer.complete = 1; }
                      this.complete &= ~(1 << voice.index);
                    } else {
                      this.stream.position = temp;
                    }

                    voice.trackPos = value;
                    break;
                  case 0x86:
                    voice.slideStep = this.stream.ubyte;
                    voice.slideValue = this.stream.ubyte;
                    temp = voice.slideValue << 1;
                    voice.slideLimit = temp & 255;

                    if (!variant) {
                      voice.flags = 64;
                    } else if (variant == 1) {
                      voice.flags |= 64;
                    } else {
                      voice.flags = (voice.slideLimit < temp) ? 80 : 64;
                    }
                    break;
                  case 0x87:
                    voice.trackPos = 0;
                    this.stream.position = voice.track;
                    this.stream.position = this.stream.ushort;
                    mixer.complete = 1;
                    loop = 0;
                    break;
                  case 0x88:
                    voice.periodMod = this.stream.ubyte;
                    break;
                  case 0x89:
                    this.stream.position++;
                    break;
                  case 0x8a:
                    voice.flags |= 256;
                    break;
                }
              } else if (value < 0xa0) {
                voice.slidePointer = this.stream.readAt(this.ptrack + (value + 0x60));
              } else if (value < 0xb8) {
                voice.sample1 = value - 0xa0;
              } else if (value < 0xe0) {
                voice.volPointer = value - 0xb8;
              } else {
                voice.delay = value - 0xdf;
              }
            } while (loop);

            voice.counter = voice.delay;
            voice.patternPos = this.stream.position;
          } else if (voice.flags & 8) {
            if (voice.flags & 128) {
              voice.note--;
            } else {
              voice.note++;
            }
          }
        } while (voice = voice.next);

        voice = this.voices[0];
      }

      do {
        chan = voice.channel;

        if (voice.volume < 192) {
          voice.volume -= 64;

          if (voice.volume < 0) {
            this.stream.position = this.vtrack + voice.volPointer;
            value = this.stream.ubyte + voice.volPos;
            this.stream.position = this.vblock + value;
            voice.volume = this.stream.ubyte;
            voice.volPos++;
          }
        }

        value = voice.slidePos + 1;
        this.stream.position = this.pblock + value;
        temp = this.stream.byte;

        if (temp < 0) {
          temp += 128;
          value = voice.slidePointer;
        }

        voice.slidePos = value;

        temp += (voice.note + voice.periodMod);
        temp = (temp << 1) & 255;

        this.stream.position = this.periods + temp;
        period = this.stream.ushort;

        if (voice.flags & 64) {
          if (variant == 1) {
            value = voice.slideStep;
            if (!value) { value = voice.flags & 1; }

            if (voice.flags & 16) {
              value += voice.slideValue;
              voice.slideValue = value;
              if (voice.slideValue == voice.slideLimit) { voice.flags ^= 16; }
            } else {
              voice.slideValue -= value;
              if (!voice.slideValue) { voice.flags ^= 16; }
            }
          } else {
            loop = 0;

            if (variant > 0) {
              if (voice.flags & 16) {
                if (voice.flags & 1) { loop = 1; }
              } else {
                loop = 1;
              }
            } else {
              loop = 1;
            }

            value = voice.slideValue;

            if (loop) {
              if (voice.flags & 32) {
                value += voice.slideStep;

                if (value >= voice.slideLimit) {
                  value = voice.slideLimit;
                  voice.flags ^= 32;
                }
              } else {
                value -= voice.slideStep;

                if (value < 0) {
                  value = 0;
                  voice.flags ^= 32;
                }
              }

              voice.slideValue = value;
            }
          }

          period += (value - (voice.slideLimit >> 1));
        }

        voice.flags ^= 1;

        if (voice.flags & 4) {
          if (voice.portaCounter) {
            voice.portaCounter--;
          } else {
            voice.portaPeriod += voice.portaStep;
            period += voice.portaPeriod;
          }
        }

        chan.pointer = this.sdata + (voice.sample1 << 7);
        chan.period = period;
        chan.volume = voice.volume & 63;
      } while (voice = voice.next);

      position += mixer.ticksize;
    };

    fx(voice, value) {
      switch (value) {
        case 0:
          voice.sample2 = 0;
          voice.state = 2;
          voice.channel.enabled = 0;
          return 0;
        case 1:
          voice.flags = 0;
          break;
        case 2:
          voice.portaStep = this.stream.short;
          voice.portaPeriod = 0;
          voice.portaCounter = this.stream.ubyte;
          voice.flags |= 4;
          break;
        case 3:
          voice.flags |= 136;
          break;
        case 4:
          voice.flags |= 8;
          break;
        case 5:
          value = voice.trackPos + 2;

          if (value == voice.trackLen) {
            value = voice.trackLoop;
            if (!this.complete) { mixer.complete = 1; }
            this.complete ^= (1 << voice.index);
          }

          this.stream.position = voice.track + value;
          this.stream.position = this.stream.ushort;
          voice.trackPos = value;
          break;
        case 6:
          voice.slideStep = this.stream.ubyte;
          voice.slideValue = this.stream.ubyte;
          voice.slideLimit = (voice.slideValue << 1) & 255;
          voice.flags |= 64;
          break;
        case 7:
          voice.trackPos = 0;
          this.stream.position = voice.track;
          this.stream.position = this.stream.ushort;
          mixer.complete = 1;
          return 0;
        case 8:
          voice.periodMod = this.stream.ubyte;
          break;
        case 9:
          this.stream.position++;
          break;
        case 10:
          voice.flags |= 32;
          break;
        case 11:
          this.waveLower = this.sdata + this.stream.ubyte;
          this.waveUpper = this.sdata + this.stream.ubyte;
          value = 1 + this.stream.ubyte;

          this.samples[1].length = value;
          this.samples[1].repeat = value;
          voice.sample1 = 1;
          break;
        case 12:
          voice.volumeMod = this.stream.ubyte;
          break;
        case 13:
          voice.flags |= 2;
          break;
        case 14:
          voice.flags |= 34;
          break;
        case 15:
          this.stream.position++;
          break;
        case 16:
          this.transpose = this.stream.byte;
          break;
        case 17:
          voice.loopCounter = this.stream.ubyte;
          voice.loopPos = this.stream.position;
          break;
        case 18:
          voice.loopCounter = 2;
          voice.loopPos = this.stream.position;
          break;
        case 19:
          if (--voice.loopCounter) {
            this.stream.position = voice.loopPos;
          }
          break;
        case 20:
          if (variant == 7) {
            this.speed = this.stream.ubyte;
            break;
          }
        case 21:
          voice.slidePointer = this.stream.ubyte;
          break;
      }

      return 1;
    };
  }

  class JBVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.prev = null;
      this.initialize();
    };

    initialize() {
      this.channel      = null;
      this.track        = 0;
      this.trackLen     = 0;
      this.trackLoop    = 0;
      this.trackPos     = 0;
      this.patternPos   = 0;
      this.loopCounter  = 0;
      this.loopPos      = 0;
      this.flags        = 0;
      this.state        = 0;
      this.delay        = 0;
      this.counter      = 1;
      this.note         = 0;
      this.sample1      = 0;
      this.sample2      = 0;
      this.volume       = 0;
      this.volumeMod    = 255;
      this.volCounter   = 0;
      this.volPointer   = 0;
      this.volPos       = 0;
      this.periodMod    = 0;
      this.slidePointer = 0;
      this.slidePos     = 0;
      this.slideStep    = 0;
      this.slideLimit   = 0;
      this.slideValue   = 0;
      this.portaCounter = 0;
      this.portaStep    = 0;
      this.portaPeriod  = 0;
    };
  }

  window.neoart.Trackers.JasonBrooke = function() {
    tracker = new JasonBrooke();
    return player;
  }

  class JochenHippel extends Tracker {
    constructor() {
      super(Amiga);

      this.base     = 0;
      this.coso     = 0;
      this.freqs    = 0;
      this.pattLen  = 0;
      this.patterns = 0;
      this.periods  = 0;
      this.stream   = null;
      this.vols     = 0;

      this.voices[0] = new JHVoice(0);
      this.voices[0].next = this.voices[1] = new JHVoice(1);
      this.voices[1].next = this.voices[2] = new JHVoice(2);
      this.voices[2].next = this.voices[3] = new JHVoice(3);

      ID.push("Jochen Hippel", "Jochen Hippel COSO");

      periods("jhippel");
      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      super.initialize();

      this.speed = song.speed;
      this.tick = (this.coso || variant > 1) ? 1 : this.speed;

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.trackPtr = song.start + (voice.index * 3);

        if (this.coso) {
          voice.trackPos = 0;
          voice.patternPos = 8;
        } else {
          this.stream.position = voice.trackPtr;
          voice.patternPtr = this.patterns + (this.stream.ubyte * this.pattLen);
          voice.trackTrans = this.stream.byte;
          voice.volTrans   = this.stream.byte;

          voice.freqsPtr = this.base;
          voice.volsPtr  = this.base;
        }
      } while (voice = voice.next);
    };

    parse(stream) {
      var value = 0;
      var headers, i, id, len, pos, sample, sdata, song, tdata, tracks;

      this.base = this.periods = 0;
      this.coso = (stream.readUTF8(4) == "COSO");

      if (this.coso) {
        for (i = 0; i < 7; i++) { value += stream.int; }
        stream.position = 47;
        value += stream.ubyte;

        switch (value) {
          case 22660:   //Astaroth
          case 22670:
          case 18845:
          case 30015:   //Chambers of Shaolin
          case 22469:
          case 3549:    //Over the Net
            variant = 1;
            break;
          case 16948:   //Dragonflight
          case 18337:
          case 13704:
            variant = 2;
            break;
          case 18548:   //Wings of Death
          case 13928:
          case 8764:
          case 17244:
          case 11397:
          case 14496:
          case 14394:
          case 13578:   //Dragonflight
          case 6524:
            variant = 3;
            break;
          default:
            variant = 4;
            break;
        }

        version = 2;
        stream.position = 4;

        this.freqs    = stream.uint;
        this.vols     = stream.uint;
        this.patterns = stream.uint;

        tracks  = stream.uint;
        tdata   = stream.uint;
        headers = stream.uint;
        sdata   = stream.uint;

        stream.position = 0;
        stream.int = 0x1000000;
        stream.int = 0xe1;
        stream.short = 0xffff;

        len = (((sdata - headers) / 10) >> 0) - 1;
        total = ((headers - tdata) / 6) >> 0;
      } else {
        do {
          value = stream.ushort;

          switch (value) {
            case 0x0240:                                                  // andi.w [xx,d0]
              if (stream.ushort == 0x007f) {                              // andi.w [#$7f,d0]
                stream.position += 2;
                this.periods = stream.position + stream.ushort;
              }
              break;
            case 0x7002:                                                  // moveq [#2,d0]
            case 0x7003:                                                  // moveq [#3,d0]
              channels = (value & 0xff) + 1;
              value = stream.ushort;
              if (value == 0x7600) { value = stream.ushort; }             // moveq [#0,d3]

              if (value == 0x41fa) {                                      // lea [xx,a0]
                stream.position += 4;
                this.base = stream.position + stream.ushort;
              }
              break;
            case 0x5446:                                                  // "TF"
              if (stream.ushort == 0x4d58) {                              // "MX"
                id = stream.position - 4;
                stream.position = stream.length;
              }
              break;
          }
        } while (stream.bytesAvailable > 12);

        if (!id || !this.base || !this.periods) { return; }

        stream.position = id + 4;
        this.freqs = pos = id + 32;
        value = stream.ushort;
        this.vols = (pos += (++value << 6));

        value = stream.ushort;
        this.patterns = (pos += (++value << 6));
        value = stream.ushort;
        stream.position += 2;
        this.pattLen = stream.ushort;
        tracks = (pos += (++value * this.pattLen));

        stream.position -= 4;
        value = stream.ushort;
        tdata = (pos += (++value * 12));

        stream.position = id + 16;
        total = stream.ushort + 1;
        headers = (pos += (total * 6));

        len = stream.ushort;
        sdata = pos + (len * 30);
        version = 1;
      }

      stream.position = headers;
      this.samples.length = len;

      for (i = 0; i < len; i++) {
        sample = new Sample();

        if (!this.coso) {
          sample.name = stream.readUTF8(18);
        }

        sample.pointer = sdata + stream.uint;
        sample.length = stream.ushort << 1;

        if (!this.coso) {
          sample.volume = stream.ushort;
        }

        sample.loopPtr = sample.pointer + stream.ushort;
        sample.repeat = stream.ushort << 1;
        if (sample.loopPtr & 1) { sample.loopPtr--; }

        this.samples[i] = sample;
      }

      stream.position = tdata;
      this.list.length = 0;

      for (i = 0; i < total; i++) {
        song = new Song();
        song.start  = stream.ushort;
        song.length = stream.ushort - (song.start + 1);
        song.speed  = stream.ushort;

        song.start = (song.start * 12) + tracks;
        song.length *= 12;
        if (song.length > 12) { this.list.push(song); }
      }

      if (!this.coso) {
        stream.position = 0;
        variant = 1;

        do {
          value = stream.ushort;

          if (value == 0xb03c || value == 0x0c00) {                       // cmp.b [xx,d0] || cmpi.b [xx,d0]
            value = stream.ushort;

            if (value == 0x00e5 || value == 0x00e6 || value == 0x00e9) {  // fx
              variant = 2;
              break;
            }
          } else if (value == 0x4efb) {                                   // jmp [(pc,d0.w)]
            variant = 3;
            break;
          }
        } while (stream.position < id);
      }

      this.stream = stream;
    };

    process() {
      var voice = this.voices[0];
      var chan, loop, period, pos1, pos2, sample, value;

      if (--this.tick == 0) {
        this.tick = this.speed;

        do {
          chan = voice.channel;

          if (this.coso) {
            if (--voice.cosoCtr < 0) {
              voice.cosoCtr = voice.cosoSpeed;

              do {
                this.stream.position = voice.patternPos;

                do {
                  loop = 0;
                  value = this.stream.byte;

                  if (value == -1) {
                    if (voice.trackPos == song.length) {
                      voice.trackPos = 0;
                      mixer.complete = 1;
                    }

                    this.stream.position = voice.trackPtr + voice.trackPos;
                    value = this.stream.ubyte;
                    voice.trackTrans = this.stream.byte;
                    pos1 = this.stream.readAt(this.stream.position);

                    if (variant > 3 && pos1 > 127) {
                      pos2 = (pos1 >> 4) & 15;
                      pos1 &= 15;

                      if (pos2 == 15) {
                        pos2 = 100;

                        if (pos1) {
                          pos2 = (15 - pos1) + 1;
                          pos2 <<= 1;
                          pos1 = pos2;
                          pos2 <<= 1;
                          pos2 += pos1;
                        }

                        voice.volFade = pos2;
                      } else if (pos2 == 8) {
                        mixer.complete = 1;
                      } else if (pos2 == 14) {
                        this.speed = pos1;
                      }
                    } else {
                      voice.volTrans = this.stream.byte;
                    }

                    this.stream.position = this.patterns + (value << 1);
                    voice.patternPos = this.stream.ushort;
                    voice.trackPos += 12;
                    loop = 1;
                  } else if (value == -2) {
                    voice.cosoCtr = voice.cosoSpeed = this.stream.ubyte;
                    loop = 3;
                  } else if (value == -3) {
                    voice.cosoCtr = voice.cosoSpeed = this.stream.ubyte;
                    voice.patternPos = this.stream.position;
                  } else {
                    voice.note = value;
                    voice.info = this.stream.byte;

                    if (voice.info & 224) { voice.infoPrev = this.stream.byte; }

                    voice.patternPos = this.stream.position;
                    voice.portaDelta = 0;

                    if (value >= 0) {
                      if (variant == 1) { chan.enabled = 0; }

                      value = (voice.info & 31) + voice.volTrans;
                      this.stream.position = this.vols + (value << 1);
                      this.stream.position = this.stream.ushort;

                      voice.volCtr = voice.volSpeed = this.stream.ubyte;
                      voice.volSustain = 0;
                      value = this.stream.byte;

                      voice.vibSpeed = this.stream.byte;
                      voice.vibrato = 64;
                      voice.vibDepth = voice.vibDelta = this.stream.byte;
                      voice.vibDelay = this.stream.ubyte;

                      voice.volsPtr = this.stream.position;
                      voice.volsPos = 0;

                      if (value != -128) {
                        if (variant > 1 && (voice.info & 64)) { value = voice.infoPrev; }
                        this.stream.position = this.freqs + (value << 1);

                        voice.freqsPtr = this.stream.ushort;
                        voice.freqsPos = 0;
                        voice.tick = 0;
                      }
                    }

                    cache[writePos].notes[voice.index] = voice.note;
                  }
                } while (loop > 2);
              } while (loop > 0);
            }
          } else {
            this.stream.position = voice.patternPtr + voice.patternPos;
            value = this.stream.byte;

            if ((voice.patternPos == this.pattLen) || ((value & 127) == 1)) {
              if (voice.trackPos == song.length) {
                voice.trackPos = 0;
                mixer.complete = 1;
              }

              this.stream.position = voice.trackPtr + voice.trackPos;
              value = this.stream.ubyte;
              voice.trackTrans = this.stream.byte;
              voice.volTrans = this.stream.byte;

              if (voice.volTrans == -128) { mixer.complete = 1; }

              voice.patternPtr = this.patterns + (value * this.pattLen);
              voice.patternPos = 0;
              voice.trackPos += 12;

              this.stream.position = voice.patternPtr;
              value = this.stream.byte;
            }

            if (value & 127) {
              voice.note = value & 127;
              voice.portaDelta = 0;

              pos1 = this.stream.position;
              if (!voice.patternPos) { this.stream.position += this.pattLen; }
              this.stream.position -= 2;

              voice.infoPrev = this.stream.byte;
              this.stream.position = pos1;
              voice.info = this.stream.byte;

              if (value >= 0) {
                if (variant > 1) { chan.enabled = 0; }
                value = (voice.info & 31) + voice.volTrans;
                this.stream.position = this.vols + (value << 6);

                voice.volCtr = voice.volSpeed = this.stream.ubyte;
                voice.volSustain = 0;
                value = this.stream.byte;

                voice.vibSpeed = this.stream.byte;
                voice.vibrato = 64;
                voice.vibDepth = voice.vibDelta = this.stream.byte;
                voice.vibDelay = this.stream.ubyte;

                voice.volsPtr = this.stream.position;
                voice.volsPos = 0;

                if (variant > 1 && (voice.info & 64)) { value = voice.infoPrev; }

                voice.freqsPtr = this.freqs + (value << 6);
                voice.freqsPos = 0;
                voice.tick = 0;
              }

              cache[writePos].notes[voice.index] = voice.note;
            }

            voice.patternPos += 2;
          }
        } while (voice = voice.next);

        voice = this.voices[0];
      }

      do {
        chan = voice.channel;
        voice.enabled = 0;

        do {
          loop = 0;

          if (voice.tick) {
            voice.tick--;
          } else {
            this.stream.position = voice.freqsPtr + voice.freqsPos;

            do {
              value = this.stream.byte;
              if (value == -31) { break; }
              loop = 3;

              if (variant == 3 && this.coso) {
                if (value == -27) {
                  value = -30;
                } else if (value == -26) {
                  value = -28;
                }
              }

              switch (value) {
                case -32:
                  voice.freqsPos = this.stream.ubyte & 63;
                  this.stream.position = voice.freqsPtr + voice.freqsPos;
                  break;
                case -30:
                  sample = this.samples[this.stream.ubyte];
                  voice.sample = -1;

                  voice.loopPtr = sample.loopPtr;
                  voice.repeat  = sample.repeat;
                  voice.enabled = 1;

                  chan.enabled = 0;
                  chan.pointer = sample.pointer;
                  chan.length  = sample.length;

                  voice.volsPos = 0;
                  voice.volCtr  = 1;
                  voice.slide   = 0;
                  voice.freqsPos += 2;
                  break;
                case -29:
                  voice.vibSpeed = this.stream.byte;
                  voice.vibDepth = this.stream.byte;
                  voice.freqsPos += 3;
                  break;
                case -28:
                  sample = this.samples[this.stream.ubyte];
                  voice.loopPtr = sample.loopPtr;
                  voice.repeat  = sample.repeat;

                  chan.pointer = sample.pointer;
                  chan.length  = sample.length;

                  voice.slide = 0;
                  voice.freqsPos += 2;
                  break;
                case -27:
                  if (variant < 2) { break; }
                  sample = this.samples[this.stream.ubyte];
                  chan.enabled = 0;
                  voice.enabled = 1;

                  if (variant == 2) {
                    pos1 = this.stream.ubyte * sample.length;
                    voice.loopPtr = sample.loopPtr + pos1;
                    voice.repeat  = sample.repeat;

                    chan.pointer = sample.pointer + pos1;
                    chan.length  = sample.length;

                    voice.freqsPos += 3;
                  } else {
                    voice.sldPointer = sample.pointer;
                    voice.sldEnd = sample.pointer + sample.length;
                    value = this.stream.ushort;

                    if (value == 0xffff) {
                      voice.sldLoopPtr = sample.length;
                    } else {
                      voice.sldLoopPtr = value << 1;
                    }

                    voice.sldLen = this.stream.ushort << 1;
                    voice.sldDelta = this.stream.short << 1;
                    voice.sldActive = 0;
                    voice.sldCtr = 0;
                    voice.sldSpeed = this.stream.ubyte;
                    voice.slide = 1;
                    voice.sldDone = 0;

                    voice.freqsPos += 9;
                  }

                  voice.volsPos = 0;
                  voice.volCtr = 1;
                  break;
                case -26:
                  if (variant < 3) { break; }

                  voice.sldLen = this.stream.ushort << 1;
                  voice.sldDelta = this.stream.short << 1;
                  voice.sldActive = 0;
                  voice.sldCtr = 0;
                  voice.sldSpeed = this.stream.ubyte;
                  voice.sldDone = 0;

                  voice.freqsPos += 6;
                  break;
                case -25:
                  if (variant == 1) {
                    voice.freqsPtr = this.freqs + (this.stream.ubyte << 6);
                    voice.freqsPos = 0;

                    this.stream.position = voice.freqsPtr;
                    loop = 3;
                  } else {
                    value = this.stream.ubyte;

                    if (value != voice.sample) {
                      sample = this.samples[value];
                      voice.sample = value;

                      voice.loopPtr = sample.loopPtr;
                      voice.repeat  = sample.repeat;
                      voice.enabled = 1;

                      chan.enabled = 0;
                      chan.pointer = sample.pointer;
                      chan.length  = sample.length;
                    }

                    voice.volsPos = 0;
                    voice.volCtr = 1;
                    voice.slide = 0;
                    voice.freqsPos += 2;
                  }
                  break;
                case -24:
                  voice.tick = this.stream.ubyte;
                  voice.freqsPos += 2;
                  loop = 1;
                  break;
                case -23:
                  if (variant < 2) { break; }
                  sample = this.samples[this.stream.ubyte];
                  voice.sample = -1;
                  voice.enabled = 1;

                  pos2 = this.stream.ubyte;
                  pos1 = this.stream.position;
                  chan.enabled = 0;

                  this.stream.position = sample.pointer + 4;
                  value = (this.stream.ushort * 24) + (this.stream.ushort << 2);
                  this.stream.position += (pos2 * 24);

                  voice.loopPtr = this.stream.uint & 0xfffffffe;
                  chan.length = (this.stream.uint & 0xfffffffe) - voice.loopPtr;
                  voice.loopPtr += (sample.pointer + (value + 8));
                  chan.pointer = voice.loopPtr;
                  voice.repeat = 2;

                  this.stream.position = pos1;
                  pos1 = voice.loopPtr + 1;
                  mixer.memory[pos1] = mixer.memory[voice.loopPtr];

                  voice.volsPos = 0;
                  voice.volCtr = 1;
                  voice.slide = 0;
                  voice.freqsPos += 3;
                  break;
                default:
                  voice.transpose = value;
                  voice.freqsPos++;
                  loop = 0;
                  break;
              }
            } while (loop > 2);
          }
        } while (loop > 0);

        if (voice.slide) {
          if (!voice.sldDone) {
            if (--voice.sldCtr < 0) {
              voice.sldCtr = voice.sldSpeed;

              if (voice.sldActive) {
                value = voice.sldLoopPtr + voice.sldDelta;

                if (value < 0) {
                  voice.sldDone = 1;
                  value = voice.sldLoopPtr - voice.sldDelta;
                } else {
                  pos1 = voice.sldPointer + (voice.sldLen + value);

                  if (pos1 > voice.sldEnd) {
                    voice.sldDone = 1;
                    value = voice.sldLoopPtr - voice.sldDelta;
                  }
                }

                voice.sldLoopPtr = value;
              } else {
                voice.sldActive = 1;
              }

              voice.loopPtr = voice.sldPointer + voice.sldLoopPtr;
              voice.repeat = voice.sldLen;

              chan.pointer = voice.loopPtr;
              chan.length = voice.repeat;
            }
          }
        }

        do {
          loop = 0;

          if (voice.volSustain) {
            voice.volSustain--;
          } else {
            if (--voice.volCtr) { break; }
            voice.volCtr = voice.volSpeed;

            do {
              this.stream.position = voice.volsPtr + voice.volsPos;
              value = this.stream.byte;
              if (value <= -25 && value >= -31) { break; }

              switch (value) {
                case -24:
                  voice.volSustain = this.stream.ubyte;
                  voice.volsPos += 2;
                  loop = 1;
                  break;
                case -32:
                  voice.volsPos = (this.stream.ubyte & 63) - 5;
                  loop = 3;
                  break;
                default:
                  voice.volume = value;
                  voice.volsPos++;
                  loop = 0;
                  break;
              }
            } while (loop > 2);
          }
        } while (loop > 0);

        value = voice.transpose;

        if (value >= 0) { value += (voice.note + voice.trackTrans); }
        value &= 127;

        if (this.coso) {
          if (value > 83) { value = 0; }
          period = PERIODS[value];
          value <<= 1;
        } else {
          value <<= 1;
          this.stream.position = this.periods + value;
          period = this.stream.ushort;
        }

        if (voice.vibDelay) {
          voice.vibDelay--;
        } else if (variant > 3) {
          if (voice.vibrato & 32) {
            value = voice.vibDelta + voice.vibSpeed;

            if (value > voice.vibDepth) {
              voice.vibrato &= ~32;
              value = voice.vibDepth;
            }
          } else {
            value = voice.vibDelta - voice.vibSpeed;

            if (value < 0) {
              voice.vibrato |= 32;
              value = 0;
            }
          }

          voice.vibDelta = value;
          value = (value - (voice.vibDepth >> 1)) * period;
          period += (value >> 10);
        } else if (variant > 2) {
          value = voice.vibSpeed;

          if (value < 0) {
            value &= 127;
            voice.vibrato ^= 1;
          }

          if (!(voice.vibrato & 1)) {
            if (voice.vibrato & 32) {
              voice.vibDelta += value;
              pos1 = voice.vibDepth << 1;

              if (voice.vibDelta > pos1) {
                voice.vibrato &= ~32;
                voice.vibDelta = pos1;
              }
            } else {
              voice.vibDelta -= value;

              if (voice.vibDelta < 0) {
                voice.vibrato |= 32;
                voice.vibDelta = 0;
              }
            }
          }

          period += (value - voice.vibDepth);
        } else {
          if ((voice.vibrato >= 0) || (!(voice.vibrato & 1))) {
            if (voice.vibrato & 32) {
              voice.vibDelta += voice.vibSpeed;
              pos1 = voice.vibDepth << 1;

              if (voice.vibDelta >= pos1) {
                voice.vibrato &= ~32;
                voice.vibDelta = pos1;
              }
            } else {
              voice.vibDelta -= voice.vibSpeed;

              if (voice.vibDelta < 0) {
                voice.vibrato |= 32;
                voice.vibDelta = 0;
              }
            }
          }

          pos1 = voice.vibDelta - voice.vibDepth;

          if (pos1) {
            value += 160;

            while (value < 256) {
              pos1 += pos1;
              value += 24;
            }

            period += pos1;
          }
        }

        if (variant < 3) { voice.vibrato ^= 1; }

        if (voice.info & 32) {
          value = voice.infoPrev;

          if (variant > 3) {
            if (value < 0) {
              voice.portaDelta -= value;
              value = voice.portaDelta * period;
              period += (value >> 10);
            } else {
              voice.portaDelta += value;
              value = voice.portaDelta * period;
              period -= (value >> 10);
            }
          } else {
            if (value < 0) {
              voice.portaDelta -= (value << 11);
              period += (voice.portaDelta >> 16);
            } else {
              voice.portaDelta += (value << 11);
              period -= (voice.portaDelta >> 16);
            }
          }
        }

        if (variant > 3) {
          value = ((voice.volFade * voice.volume) / 100) >> 0;
        } else {
          value = voice.volume;
        }

        chan.period = period;
        chan.volume = value;

        if (voice.enabled) {
          chan.enabled = 1;
          chan.pointer = voice.loopPtr;
          chan.length = voice.repeat;
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class JHVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel    = null;
      this.enabled    = 0;
      this.sample     = -1;
      this.loopPtr    = 0;
      this.repeat     = 0;
      this.cosoCtr    = 0;
      this.cosoSpeed  = 0;
      this.trackPtr   = 0;
      this.trackPos   = 12;
      this.trackTrans = 0;
      this.patternPtr = 0;
      this.patternPos = 0;
      this.freqsPtr   = 0;
      this.freqsPos   = 0;
      this.volsPtr    = 0;
      this.volsPos    = 0;
      this.tick       = 0;
      this.note       = 0;
      this.transpose  = 0;
      this.info       = 0;
      this.infoPrev   = 0;
      this.volume     = 0;
      this.volCtr     = 1;
      this.volSpeed   = 1;
      this.volSustain = 0;
      this.volTrans   = 0;
      this.volFade    = 100;
      this.portaDelta = 0;
      this.vibrato    = 0;
      this.vibDelay   = 0;
      this.vibDelta   = 0;
      this.vibDepth   = 0;
      this.vibSpeed   = 0;
      this.slide      = 0;
      this.sldActive  = 0;
      this.sldDone    = 0;
      this.sldCtr     = 0;
      this.sldSpeed   = 0;
      this.sldDelta   = 0;
      this.sldPointer = 0;
      this.sldLoopPtr = 0;
      this.sldLen     = 0;
      this.sldEnd     = 0;
    };
  }

  window.neoart.Trackers.JochenHippel = function() {
    tracker = new JochenHippel();
    return player;
  }

  class RichardJoseph extends Tracker {
    constructor() {
      super(Amiga);

      this.envelope  = null;
      this.patterns  = null;
      this.tracks    = null;
      this.tracksPtr = null;

      this.voices[0] = new RJVoice(0);
      this.voices[0].next = this.voices[1] = new RJVoice(1);
      this.voices[1].next = this.voices[2] = new RJVoice(2);
      this.voices[2].next = this.voices[3] = new RJVoice(3);

      ID.push("Richard Joseph");

      mixer.process = this.process.bind(this);
      channels = 4;

      PERIODS.set([
        453,480,508,538,570,604,640,678,720,762,808,856,
        226,240,254,269,285,302,320,339,360,381,404,428,
        113,120,127,135,143,151,160,170,180,190,202,214
      ]);

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var index;
      super.initialize();

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.sample = this.samples[0];

        index = song.tracks[voice.index];
        if (index < 0) { continue; }

        voice.trackPos = index + 1;
        index = this.tracks[index];
        voice.patternPos = this.tracksPtr[index];

        voice.active = 1;
        this.complete += (1 << voice.index);
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    load(stream) {
      var archive, entry, extra, id;
      version = 0;

      stream.endian = true;
      stream.position = 0;

      if (stream.uint == 67324752) {
        if (!Flip) {
          throw "Unzip support is not available.";
        }

        archive = new Flip(stream);
        if (archive.entries.length != 2) { return false; }

        extra = archive.uncompress(archive.entries[1]);
        entry = archive.uncompress(archive.entries[0]);
        entry.endian = this.endian;

        id = entry.readUTF8(4);
        id = id.replace(id.charAt(3), "1");

        if (id == "RJP1") {
          id = entry.readUTF8(4);
          if (id == "SMOD") { return super.load(entry, extra); }
        }

        return super.load(extra, entry);
      }

      return false;
    };

    parse(stream, extra) {
      var flag, i, id, j, len, pointers, pos, sample, song;

      if (!extra) { return; }

      id = extra.readUTF8(4);
      id = id.replace(id.charAt(3), "1");
      if (id != "RJP1") {
        extra.position += 4;
        id = extra.readUTF8(4);
        id = id.replace(id.charAt(3), "1");
      }
      if (id != "RJP1") { return; }

      id = stream.readUTF8(8);
      id = id.replace(id.charAt(3), "1");
      if (id != "RJP1SMOD") { return; }

      len = stream.uint >> 5;
      this.samples.length = len;

      extra.fill(0, 0, 4);

      for (i = 0; i < len; i++) {
        sample = new RJSample();
        sample.pointer     = stream.uint + 4;
        sample.periodPtr   = stream.uint;
        sample.volumePtr   = stream.uint;
        sample.envelopePos = stream.ushort;
        sample.volumeScale = stream.short;
        sample.offset      = stream.ushort << 1;
        sample.length      = stream.ushort << 1;
        sample.loopPtr     = sample.pointer + (stream.ushort << 1);
        sample.repeat      = stream.ushort << 1;
        sample.periodStart = stream.ushort << 1;
        sample.periodLen   = stream.ushort << 1;
        sample.volumeStart = stream.ushort << 1;
        sample.volumeLen   = stream.ushort << 1;
        this.samples[i] = sample;
      }

      len = stream.uint;
      this.envelope = new Uint8Array(len);
      for (i = 0; i < len; i++) { this.envelope[i] = stream.ubyte; }

      pos = stream.position;
      stream.position = stream.uint + stream.position;

      len = stream.uint >> 2;
      pointers = new Uint32Array(len);
      for (i = 0; i < len; i++) { pointers[i] = stream.uint; }

      i = stream.position;
      stream.position = pos;
      pos = i;

      total = stream.uint >> 2;
      this.list.length = 0;

      for (i = 0; i < total; i++) {
        song = new Song();
        flag = 0;

        for (j = 0; j < 4; j++) {
          len = stream.ubyte;

          if (!len || len >= pointers.length) {
            song.tracks[j] = -1;
          } else {
            flag = 1;
            song.tracks[j] = pointers[len];
          }
        }

        if (flag) { this.list.push(song); }
      }

      stream.position = pos;

      len = stream.uint >> 2;
      this.tracksPtr = new Uint32Array(len);
      for (i = 0; i < len; i++) { this.tracksPtr[i] = stream.uint; }

      len = stream.uint;
      this.tracks = new Uint8Array(len);
      for (i = 0; i < len; i++) { this.tracks[i] = stream.ubyte; }

      len = stream.uint;
      this.patterns = new Uint8Array(len);
      for (i = 0; i < len; i++) { this.patterns[i] = stream.ubyte; }

      version = 1;
      return extra;
    };

    process() {
      var voice = this.voices[0];
      var chan, loop, sample, value;

      do {
        if (!voice.active) { continue; }
        loop = 1;
        chan = voice.channel;
        sample = voice.sample;

        if (voice.enabled) {
          chan.pointer = sample.loopPtr;
          chan.length = sample.repeat;
          voice.enabled = 0;
        }

        if (voice.note) {
          chan.enabled = 1;
          voice.note = 0;
          voice.enabled = 1;
        }

        if (--voice.tick1 == 0) {
          if (--voice.tick2 == 0) {
            do {
              value = this.patterns[voice.patternPos++];

              if (value > 127) {
                switch (value) {
                  case 128:
                    voice.speed2 = 1;

                    do {
                      value = this.tracks[voice.trackPos];

                      if (!value) {
                        this.complete &= ~(1 << voice.index);
                        if (!this.complete) { mixer.complete = 1; }

                        value = this.tracks[++voice.trackPos];

                        if (!value) {
                          voice.active = 0;
                          break;
                        } else if (value > 127) {
                          voice.trackPos = this.tracks[++voice.trackPos];
                        } else {
                          voice.trackPos -= value;

                          if (!(this.complete & (1 << voice.index))) {
                            voice.active = 0;
                            loop = 0;
                            break;
                          }
                        }
                      } else {
                        voice.trackPos++;
                        voice.patternPos = this.tracksPtr[value];
                        break;
                      }
                    } while (1);
                    break;
                  case 129:
                    voice.envelStart = 0;
                    voice.envelEnd1  = this.envelope[voice.envelPos + 5];
                    voice.envelEnd2  = voice.envelEnd1;
                    voice.envelScale = -voice.envelVolume;
                    voice.envelStep  = -1;
                    loop = 0;
                    break;
                  case 130:
                    voice.speed1 = this.patterns[voice.patternPos++];
                    break;
                  case 131:
                    voice.speed2 = this.patterns[voice.patternPos++];
                    break;
                  case 132:
                    value = this.patterns[voice.patternPos++];

                    if (value < this.samples.length) {
                      sample = voice.sample = this.samples[value];
                      voice.volumeScale = sample.volumeScale;
                      voice.periodPos = 0;
                      voice.volumePos = 0;
                    }
                    break;
                  case 133:
                    voice.volumeScale = this.patterns[voice.patternPos++];
                    break;
                  case 134:
                    voice.portaCounter = this.patterns[voice.patternPos++];
                    voice.portaPeriod = 0;

                    voice.portaStep = this.patterns[voice.patternPos++] << 24 |
                                      this.patterns[voice.patternPos++] << 16 |
                                      this.patterns[voice.patternPos++] <<  8 |
                                      this.patterns[voice.patternPos++];
                    break;
                  case 135:
                    loop = 0;
                    break;
                }
              } else {
                voice.period = PERIODS[value >> 1];
                voice.periodMod = voice.period;
                voice.portaPeriod = 0;

                value = sample.pointer + sample.offset;
                chan.enabled = 0;
                chan.pointer = value;
                chan.length = sample.length;

                mixer.memory.fill(0, value, 2);

                value = sample.envelopePos;
                voice.envelPos   = value;
                voice.envelStart = this.envelope[value + 1];
                voice.envelScale = voice.envelStart - this.envelope[value];
                voice.envelEnd1  = this.envelope[value + 2];
                voice.envelEnd2  = voice.envelEnd1;
                voice.envelStep  = 4;

                voice.note = 1;

                cache[writePos].notes[voice.index] = voice.period;
                break;
              }
            } while (loop);

            voice.tick2 = voice.speed2;
          }
          voice.tick1 = voice.speed1;
        }

        if (voice.envelStep) {
          value = voice.envelScale;

          if (voice.envelScale) {
            if (voice.envelEnd1) {
              value *= voice.envelEnd1;

              if (voice.envelEnd2) {
                value = (value / voice.envelEnd2) >> 0;
              } else {
                value = 0;
              }
            } else {
              value = 0;
            }
          }

          voice.envelVolume = voice.envelStart - value;
          voice.envelEnd1--;

          if (voice.envelEnd1 == -1) {
            if (voice.envelStep == 4) {
              value = voice.envelPos;
              voice.envelStart = this.envelope[value + 3];
              voice.envelScale = voice.envelStart - this.envelope[value + 1];
              voice.envelEnd1  = this.envelope[value + 4];
              voice.envelEnd2  = voice.envelEnd1;

              voice.envelStep = 2;
            } else {
              voice.envelStep = 0;
            }
          }
        }

        voice.volume = voice.envelVolume;

        if (sample.volumePtr) {
          value = mixer.memory[sample.volumePtr + voice.volumePos];
          value = (value * voice.volume) >> 7;
          voice.volume += value;

          if (++voice.volumePos == sample.volumeLen) {
            voice.volumePos = sample.volumeStart;
          }
        }

        chan.volume = (voice.volume * voice.volumeScale) >> 6;

        if (sample.periodPtr) {
          value = mixer.memory[sample.periodPtr + voice.periodPos];
          value = -((value * voice.period) >> 7);
          if (value < 0) { value >>= 1; }
          voice.periodMod = voice.period + value;

          if (++voice.periodPos == sample.periodLen) {
            voice.periodPos = sample.periodStart;
          }
        }

        if (voice.portaCounter) {
          voice.portaPeriod += voice.portaStep;
          voice.portaCounter--;
        }

        chan.period = (voice.periodMod + (voice.portaPeriod >> 16));
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class RJSample extends Sample {
    constructor() {
      super();

      this.envelopePos = 0;
      this.offset      = 0;
      this.periodPtr   = 0;
      this.periodStart = 0;
      this.periodLen   = 0;
      this.volumePtr   = 0;
      this.volumeStart = 0;
      this.volumeLen   = 0;
      this.volumeScale = 0;
    };
  }

  class RJVoice {
    constructor(index) {
      this.index = index;
      this.next = null;
      this.initialize();
    };

    initialize() {
      this.channel      = null;
      this.sample       = null;
      this.active       = 0;
      this.enabled      = 0;
      this.trackPos     = 0;
      this.patternPos   = 0;
      this.speed1       = 6;
      this.speed2       = 0;
      this.tick1        = 1;
      this.tick2        = 1;
      this.note         = 0;
      this.period       = 0;
      this.periodMod    = 0;
      this.periodPos    = 0;
      this.volume       = 0;
      this.volumePos    = 0;
      this.volumeScale  = 0;
      this.portaCounter = 0;
      this.portaPeriod  = 0;
      this.portaStep    = 0;
      this.envelPos     = 0;
      this.envelStep    = 0;
      this.envelScale   = 0;
      this.envelStart   = 0;
      this.envelEnd1    = 0;
      this.envelEnd2    = 0;
      this.envelVolume  = 0;
    };
  }

  window.neoart.Trackers.RichardJoseph = function() {
    tracker = new RichardJoseph();
    return player;
  }

  class RobHubbard extends Tracker {
    constructor() {
      super(Amiga);

      this.periods = 0;
      this.stream  = null;
      this.vibrato = 0;

      this.voices[0] = new RHVoice(0);
      this.voices[0].next = this.voices[1] = new RHVoice(1);
      this.voices[1].next = this.voices[2] = new RHVoice(2);
      this.voices[2].next = this.voices[3] = new RHVoice(3);

      ID.push("Rob Hubbard");

      mixer.process = this.process.bind(this);
      channels = 4;

      return Object.seal(this);
    };

    initialize() {
      var voice = this.voices[0];
      var i, sample;
      super.initialize();

      for (i = 0; i < this.samples.length; i++) {
        sample = this.samples[i];

        if (sample.wave) {
          mixer.memory.copyWithin(sample.pointer, sample.wave, sample.length);
        }
      }

      do {
        voice.initialize();
        voice.channel = mixer.output[voice.index];
        voice.trackPtr = song.tracks[voice.index];
        voice.trackPos = 4;

        this.stream.position = voice.trackPtr;
        voice.patternPos = this.stream.uint;

        this.complete += (1 << voice.index);
      } while (voice = voice.next);

      this.backup = this.complete;
    };

    parse(stream) {
      var i, j, len, memory, pos, sample, sdata, sheader, slen, song, theader, value, wheader, wpointer;

      if (stream.length < 1024) { return; }
      stream.position = 44;

      do {
        switch (stream.ushort) {
          case 0x7e10:                                                        // moveq[#16,d7]
          case 0x7e20:                                                        // moveq[#32,d7]
            if (stream.ushort == 0x41fa) {                                    // lea [xx,a0]
              i = stream.position + stream.ushort;
              value = stream.ushort;

              if (value == 0xd1fc) {                                          // adda.l
                sdata = i + stream.uint;
                mixer.loopLen = 64;
                stream.position += 2;
              } else {
                sdata = i;
                mixer.loopLen = 512;
              }

              sheader = stream.position + stream.ushort;
              if (stream.ubyte == 0x72) { slen = stream.ubyte; }              // moveq [#xx,d1]
            }
            break;
          case 0x51c9:                                                        // dbf [d1,xx]
            stream.position += 2;

            if (stream.ushort == 0x45fa) {                                    // lea [xx,a2]
              wpointer = stream.position + stream.ushort;
              stream.position += 2;

              do {
                if (stream.ushort == 0x4bfa) {                                // lea [xx,a5]
                  wheader = stream.position + stream.ushort;
                  break;
                }
              } while (1);
            }
            break;
          case 0xc0fc:                                                        // mulu.w [#xx,d0]
            stream.position += 2;
            if (stream.ushort == 0x41eb) { theader = stream.ushort; }         // lea [xx(a3),a0]
            break;
          case 0x346d:                                                        // movea.w [xx(a5),a2]
            stream.position += 2;
            if (stream.ushort == 0x49fa) {                                    // lea [xx,a4]
              this.vibrato = stream.position + stream.ushort;
            }
            break;
          case 0x4240:                                                        // clr.w [d0]
            if (stream.ushort == 0x45fa) {                                    // lea [xx,a2]
              this.periods = stream.position + stream.ushort;
            }
            break;
        }
      } while (stream.position < 1024);

      if (!sheader || !sdata || !slen || !theader) { return; }

      stream.position = sdata;
      this.samples.length = ++slen;

      for (i = 0; i < slen; i++) {
        sample = new RHSample();
        sample.length   = stream.uint;
        sample.relative = (3579545 / stream.ushort) >> 0;
        sample.pointer  = stream.position;
        stream.position += sample.length;

        this.samples[i] = sample;
      }

      stream.position = sheader;

      for (i = 0; i < slen; i++) {
        sample = this.samples[i];
        stream.position += 4;
        sample.loopPtr = stream.int;
        stream.position += 6;
        sample.volume = stream.ushort;

        if (wheader) {
          sample.divider = stream.ushort;
          sample.vibrato = stream.ushort;
          sample.hiPos   = stream.ushort;
          sample.loPos   = stream.ushort;
          stream.position += 8;
        }
      }

      value = mixer.loopLen;

      if (wheader) {
        variant = 1;
        stream.position = wheader;
        i = (wheader - sheader) >> 5;
        len = i + 3;

        if (i > slen) {
          for (j = slen; j < i; j++) {
            this.samples[j] = new RHSample();
          }
        }

        memory = new Uint8Array(stream.buffer);

        for (; i < len; i++) {
          sample = new RHSample();
          stream.position += 4;
          sample.loopPtr = stream.int;
          sample.length  = stream.ushort;

          stream.position += 2;
          sample.relative = stream.ushort;
          sample.volume   = stream.ushort;
          sample.divider  = stream.ushort;
          sample.vibrato  = stream.ushort;
          sample.hiPos    = stream.ushort;
          sample.loPos    = stream.ushort;

          pos = stream.position;
          stream.position = wpointer;
          stream.position = stream.int;

          sample.pointer = stream.position;
          memory.copyWithin(sample.pointer, value, sample.length);
          sample.wave = value;
          value += sample.length;

          this.samples[i] = sample;
          wpointer += 4;
          stream.position = pos + 8;
        }
      }

      stream.position = theader;
      this.list.length = 0;
      value = 0x10000;

      do {
        song = new Song();
        stream.position++;
        song.tracks.length = 4;
        song.speed = stream.ubyte;

        for (i = 0; i < 4; i++) {
          j = stream.uint;
          if (j < value) { value = j; }
          song.tracks[i] = j;
        }

        this.list.push(song);
        if ((value - stream.position) < 18) { break; }
      } while (1);

      stream.position = 0x160;

      do {
        if (stream.ushort == 0xb03c) {                                        // cmp.b [xx,d0]
          value = stream.ushort;

          if (value == 0x0085) {                                              // -123
            variant = 2;
          } else if (value == 0x0086) {                                       // -122
            variant = 4;
          } else if (value == 0x0087) {                                       // -121
            variant = 3;
          }
        }
      } while (stream.position < 0x200);

      stream.fill(0, 0, mixer.loopLen);

      version = 1;
      this.stream = stream;
    };

    process() {
      var voice = this.voices[0];
      var chan, loop, sample, value;

      do {
        chan = voice.channel;
        sample = voice.sample;
        this.stream.position = voice.patternPos;

        if (!voice.busy) {
          voice.busy = 1;

          if (sample.loopPtr == 0) {
            chan.pointer = 0;
            chan.length = mixer.loopLen;
          } else if (sample.loopPtr > 0) {
            chan.pointer = sample.pointer + sample.loopPtr;
            chan.length = sample.length - sample.loopPtr;
          }
        }

        if (--voice.tick == 0) {
          voice.flags = 0;
          loop = 1;

          do {
            value = this.stream.byte;

            if (value < 0) {
              switch (value) {
                case -121:
                  if (variant == 3) { voice.volume = this.stream.ubyte; }
                  break;
                case -122:
                  if (variant == 4) { voice.volume = this.stream.ubyte; }
                  break;
                case -123:
                  if (variant > 1) { mixer.complete = 1; }
                  break;
                case -124:
                  this.stream.position = voice.trackPtr + voice.trackPos;
                  value = this.stream.uint;
                  voice.trackPos += 4;

                  if (!value) {
                    this.stream.position = voice.trackPtr;
                    value = this.stream.uint;
                    voice.trackPos = 4;

                    this.complete &= ~(1 << voice.index);
                    if (!this.complete) { mixer.complete = 1; }
                  }

                  this.stream.position = value;
                  break;
                case -125:
                  if (variant == 4) { voice.flags |= 4; }
                  break;
                case -126:
                  voice.tick = song.speed * this.stream.byte;
                  voice.patternPos = this.stream.position;

                  chan.pointer = 0;
                  chan.length = mixer.loopLen;
                  loop = 0;
                  break;
                case -127:
                  voice.portaSpeed = this.stream.byte;
                  voice.flags |= 1;
                  break;
                case -128:
                  value = this.stream.byte;
                  if (value < 0) { value = 0; }
                  sample = voice.sample = this.samples[value];

                  voice.vibratoPtr = this.vibrato + sample.vibrato;
                  voice.vibratoPos = voice.vibratoPtr;
                  break;
              }
            } else {
              voice.tick = song.speed * value;
              voice.note = this.stream.byte;
              voice.patternPos = this.stream.position;

              voice.synthPos = sample.loPos;
              voice.vibratoPos = voice.vibratoPtr;

              chan.pointer = sample.pointer;
              chan.length = sample.length;
              chan.volume = (voice.volume) ? voice.volume : sample.volume;

              this.stream.position = this.periods + (voice.note << 1);
              voice.period = (this.stream.ushort * sample.relative) >> 10;
              chan.period = voice.period;
              chan.enabled = 1;

              voice.busy = 0;
              loop = 0;

              cache[writePos].notes[voice.index] = voice.note;
            }
          } while (loop);
        } else {
          if (voice.tick == 1) {
            if (variant != 4 || !(voice.flags & 4)) { chan.enabled = 0; }
          }

          if (voice.flags & 1) {
            chan.period = (voice.period += voice.portaSpeed);
          }

          if (sample.divider) {
            this.stream.position = voice.vibratoPos;
            value = this.stream.byte;

            if (value == -124) {
              this.stream.position = voice.vibratoPtr;
              value = this.stream.byte;
            }

            voice.vibratoPos = this.stream.position;
            value = ((voice.period / sample.divider) * value) >> 0;
            chan.period = voice.period + value;
          }
        }

        if (sample.hiPos) {
          value = 0;

          if (voice.flags & 2) {
            voice.synthPos++;

            if (sample.hiPos <= voice.synthPos) {
              voice.flags &= -3;
              value = 0;
            }
          } else {
            voice.synthPos--;

            if (sample.loPos > voice.synthPos) {
              voice.flags |= 2;
              value = 60;
            }
          }

          mixer.memory[sample.pointer + voice.synthPos] = value;
        }
      } while (voice = voice.next);

      position += mixer.ticksize;
    };
  }

  class RHSample extends Sample {
    constructor() {
      super();

      this.divider = 0;
      this.hiPos   = 0;
      this.loPos   = 0;
      this.vibrato = 0;
      this.wave    = 0;
    };
  }

  class RHVoice {
    constructor(index) {
      this.index = index;
      this.next = null
      this.initialize();
    };

    initialize() {
      this.channel    = null;
      this.sample     = null;
      this.trackPtr   = 0;
      this.trackPos   = 0;
      this.patternPos = 0;
      this.tick       = 1;
      this.busy       = 1;
      this.flags      = 0;
      this.note       = 0;
      this.period     = 0;
      this.volume     = 0;
      this.portaSpeed = 0;
      this.synthPos   = 0;
      this.vibratoPtr = 0;
      this.vibratoPos = 0;
    };
  }

  window.neoart.Trackers.RobHubbard = function() {
    tracker = new RobHubbard();
    return player;
  }

  class TFMX extends Tracker {
    constructor() {
      super(Amiga);

      this.songStart = null;
      this.songEnd = null;
      this.tempo = null;
      this.trackStep = null;
      this.patternPtrs = null;
      this.patternData = null;
      this.macroPtrs = null;
      this.macroData = null;
      this.voices = [];
      this.tracks = [];
      this.stepPositions = [];

      this.speed = null;
      this.step = null;
      this.firstStep = null;
      this.lastStep = null;
      this.trackFinished = null;
      this.tracksPlaying = null;
      this.tracksLooped = null;
      this.trailingDelay = null;
      this.macroInfinity = null;
      this.patternInfinity = null;

      this.masterEnvelopeSpeed = null;
      this.masterEnvelopeStep = null;
      this.masterEnvelopeVol = null;
      this.masterEnvelopeSgn = null;
      this.masterEnvelopePos = null;

      ID.push("TFMX 1.x", "TFMX Pro", "TFMX 7V");

      periods("fasttracker");
      mixer.process = this.process.bind(this);

      return Object.seal(this);
    };

    initialize() {
      super.initialize();

      if (!this.voices || this.voices.length != channels) {
        this.voices.length = channels;
        this.voices[0] = new TFMXVoice(0);

        for (let i = 1; i < this.voices.length; i++) {
          this.voices[i] = this.voices[i - 1].next = new TFMXVoice(i);
        }
      } else {
        for (let i = 0; i < this.voices.length; i++) {
          this.voices[i].initialize();
        }
      }
      for (let i = 0; i < channels; i++) {
        this.voices[i].channel = mixer.output[this.voices[i].index];
      }

      if (!this.tracks || this.tracks.length != 8) {
        this.tracks.length = 8;
        this.tracks[0] = new TFMXTrack(0);

        for (let i = 1; i < this.tracks.length; i++) {
          this.tracks[i] = this.tracks[i - 1].next = new TFMXTrack(i);
        }
      } else {
        for (let i = 0; i < this.tracks.length; i++) {
          this.tracks[i].initialize();
        }
      }

      if (!this.list || this.list.length != 32) {
        this.list.length = 32;
        for (let i = 0; i < this.list.length; i++) {
          this.list[i] = new Song();
          this.list[i].start = i;
        }
      }
      total = this.list.length;
      song = this.list[current];

      this.masterEnvelopeSpeed = null;
      this.masterEnvelopeStep = null;
      this.masterEnvelopeVol = null;
      this.masterEnvelopeSgn = null;
      this.masterEnvelopePos = null;

      const songNo = song.start;
      this.speed = this.tempo[songNo] < 0x10 ? this.tempo[songNo] : 0;
      const bpm = this.tempo[songNo] < 0x10 ? 125 : this.tempo[songNo];
      mixer.ticksize = ((audio.sampleRate * 2.5) / bpm) >> 0;
      this.firstStep = this.songStart[songNo];
      this.lastStep = this.songEnd[songNo];
      this.step = this.firstStep;
      this.trackFinished = null;
      this.tracksPlaying = null;
      this.tracksLooped = null;
      this.trailingDelay = null;
      this.macroInfinity = -1;
      this.patternInfinity = -1;
      this.stepPositions = [];

      //this.voices[0].macro = 0x30;
      this.voices[0].macroNote = 0x9c & 0x3f;
      this.voices[0].macroVolume = 0xb;
      this.voices[0].macroChannel = 0;
      this.voices[0].macroReset();
      this.voices[0].trackTranspose = 0;

      //this.voices[1].macro = 0x36;
      this.voices[1].macroNote = 0x9d & 0x3f;
      this.voices[1].macroVolume = 0xb;
      this.voices[1].macroChannel = 1;
      this.voices[1].macroReset();
      this.voices[1].trackTranspose = 0;

      //this.tracks[0].pattern = 0x2d;
      this.tracks[0].patternReset();
      this.tracks[0].trackTranspose = 0x0;

      //this.tracks[1].pattern = 0x2e;
      this.tracks[1].patternReset();
      this.tracks[1].trackTranspose = 0x0;

      //this.tracks[2].pattern = 0x1d;
      this.tracks[2].patternReset();
      this.tracks[2].trackTranspose = 0;

      for (let i = 16 * (this.step ?? this.lastStep+1); i <= 16 * this.lastStep; i += 16) {
        if (this.trackStep[i] !== 0xef || this.trackStep[i+1] !== 0xfe)
          break;
        if (this.trackStep[i+3] === 0x4 && this.trackStep[i+5] === 0)
          mixer.volume = this.trackStep[i+7];
      }
    };

    debug(type, ...args) {
        const cfg = { l: false, s: false, p: false, m: false };
        if (cfg[type]) console.log.apply(console, args);
    };

    load(stream) {
      var archive, entry, extra, id;
      version = 0;

      stream.endian = true;
      stream.position = 0;

      if (stream.uint == 67324752) {
        if (!Flip) {
          throw "Unzip support is not available.";
        }

        archive = new Flip(stream);
        if (archive.entries.length != 2) { return false; }

        extra = archive.uncompress(archive.entries[1]);
        entry = archive.uncompress(archive.entries[0]);
        entry.endian = this.endian;

        id = entry.readUTF8(10);
        if (id == "TFMX-SONG ") {
          return super.load(entry, extra);
        }
        id = extra.readUTF8(10);
        if (id == "TFMX-SONG ") {
          return super.load(extra, entry);
        }
      }

      return false;
    };

    parse(stream, extra) {
      if (stream.readUTF8(10) != "TFMX-SONG ") return;
      this.debug('l', stream.ushort);
      this.debug('l', stream.uint);
      const description = stream.readUTF8(240).trim();
      this.debug('l', description);

      this.songStart = new Uint16Array(32);
      this.songEnd = new Uint16Array(32);
      this.tempo = new Uint16Array(32);
      for (let i = 0; i < this.songStart.length; i++) this.songStart[i] = stream.ushort;
      for (let i = 0; i < this.songEnd.length; i++) this.songEnd[i] = stream.ushort;
      for (let i = 0; i < this.tempo.length; i++) this.tempo[i] = stream.ushort;
      this.debug('l', 'songStart', this.songStart);
      this.debug('l', 'songEnd', this.songEnd);
      this.debug('l', 'tempo', this.tempo);

      stream.position += 0x10;
      const trackStepPtr = stream.uint || 0x800;
      const patternPtr = stream.uint || 0x400;
      const macroPtr = stream.uint || 0x600;
      this.debug('l', { trackStepPtr, patternPtr, macroPtr });
      if (patternPtr < macroPtr && macroPtr < trackStepPtr) version = 1;
      else if (trackStepPtr < patternPtr && patternPtr < macroPtr) version = 2;
      else throw new Error('unsupported file layout');
      this.debug('l', 'version', version);

      stream.position = patternPtr;
      this.patternPtrs = new Uint32Array((macroPtr - patternPtr) / 4);
      for (let i = 0; i < this.patternPtrs.length; i++) this.patternPtrs[i] = stream.uint;
      this.debug('l', 'patternPtrs', this.patternPtrs);

      stream.position = macroPtr;
      const macroPtrsEnd = version === 1 ? trackStepPtr : stream.length;
      this.macroPtrs = new Uint32Array((macroPtrsEnd - stream.position) / 4);
      for (let i = 0; i < this.macroPtrs.length; i++) this.macroPtrs[i] = stream.uint;
      this.debug('l', 'macroPtrs', this.macroPtrs);

      stream.position = trackStepPtr;
      this.trackStep = new Uint8Array(this.patternPtrs[0] - trackStepPtr);
      for (let i = 0; i < this.trackStep.length; i++) this.trackStep[i] = stream.ubyte;
      this.debug('l', 'trackStep', this.trackStep);

      stream.position = this.patternPtrs[0];
      this.patternData = new Uint8Array(this.macroPtrs[0] - stream.position);
      for (let i = 0; i < this.patternData.length; i++) this.patternData[i] = stream.ubyte;
      this.debug('l', 'patternData', this.patternData);

      stream.position = this.macroPtrs[0];
      const macroDataEnd = version === 1 ? stream.length : patternPtr;
      this.macroData = new Uint8Array(macroDataEnd - stream.position);
      for (let i = 0; i < this.macroData.length; i++) this.macroData[i] = stream.ubyte;
      this.debug('l', 'macroData', this.macroData);

      for (let i = this.macroPtrs.length - 1; i >= 0; i--)
        this.macroPtrs[i] -= this.macroPtrs[0];
      this.debug('l', 'macroPtrs rel', this.macroPtrs);

      for (let i = this.patternPtrs.length - 1; i >= 0; i--)
        this.patternPtrs[i] -= this.patternPtrs[0];
      this.debug('l', 'patternPtrs rel', this.patternPtrs);

      let maxChannel = 0;
      for (let i = 0; i < this.patternData.length; i += 4) {
        if (this.patternData[i] < 0xf0) {
          maxChannel = Math.max(maxChannel, this.patternData[i+2] & 0xf);
        }
      }
      this.debug('l', 'maxChannel', maxChannel);

      channels = maxChannel < 4 ? 4 : 8;
      if (channels === 8) {
        version = 3;
      }

      return extra;
    };

	process() {
		position += mixer.ticksize;

		if (this.trailingDelay != null) {
			if (this.trailingDelay === 0) {
				mixer.complete = 1;
			}
			this.trailingDelay--;
			return;
		}

		if (this.masterEnvelopeVol !== null) {
			this.masterEnvelopePos++;
			if (this.masterEnvelopePos === this.masterEnvelopeSpeed) {
				this.masterEnvelopePos = 0;
				mixer.volume += this.masterEnvelopeSgn * this.masterEnvelopeStep;
				if (mixer.volume * this.masterEnvelopeSgn >= this.masterEnvelopeVol * this.masterEnvelopeSgn) {
					mixer.volume = this.masterEnvelopeVol;
					this.masterEnvelopeVol = null;
				}
			}
		}

		if (this.trackFinished === null) {
			this.processTrackStep();
		}
		this.debug('s', '    >>>>');
		for (let i = 0; i < this.tracks.length; i++) {
			this.processPattern(this.tracks[i]);
			if (this.trackFinished || this.tracksPlaying === 0) {
				this.debug('s', '    ----');
				if (this.processTrackStep()) {
					i = -1;
					this.debug('s', '    >>>>');
				} else {
					return;
				}
			}
		}
		this.debug('s', '    <<<<');
		this.voices.forEach(voice => this.processMacro(voice));
	};

	processTrackStep() {
		if (this.step === null) {
			return false;
		}
		let trackStepBreak = false;
		do {
			if (this.step > this.lastStep) {
				this.step = this.firstStep;
				this.trackFinished = null;
				mixer.complete = true;
				return false;
			}
			const base = 16 * this.step;
			if (base >= this.trackStep.length) {
				console.error(`step ${this.step} out of range (${this.trackStep.length/16})`);
				this.step = this.firstStep;
				this.trackFinished = null;
				mixer.complete = true;
				return false;
			}
			if (this.trackStep[base] === 0xef && this.trackStep[base+1] === 0xfe) {
				switch (this.trackStep[base+3]) {
				case 0x0:
					this.step = this.firstStep;
					this.trackFinished = null;
					mixer.complete = true;
					return false;
				case 0x1:
					this.step = this.trackStep[base+5];
					this.trackFinished = null;
					mixer.complete = true;
					return false;
				case 0x2:
					this.speed = this.trackStep[base+5];
					break;
				case 0x3:
					const speed = (getC2Byte(-this.trackStep[base+7]) * 1.5) >> 0;
					mixer.ticksize = ((audio.sampleRate * 2.5) / (125 + speed)) >> 0;
					break;
				case 0x4:
					this.masterEnvelopeSpeed = this.trackStep[base+5];
					this.masterEnvelopeVol = this.trackStep[base+7];
					if (this.masterEnvelopeSpeed === 0) {
						mixer.volume = this.masterEnvelopeVol;
						this.masterEnvelopeSpeed = null;
						this.masterEnvelopeVol = null;
					} else {
						this.masterEnvelopeStep = 4;
						this.masterEnvelopeSgn = this.masterEnvelopeVol > mixer.volume ? 1 : -1;
						this.masterEnvelopePos = 0;
					}
					break;
				}
			} else {
				trackStepBreak = true;
			}
			if (this.stepPositions[this.step] == null) {
				this.stepPositions[this.step] = position;
			}
			this.step++;
		} while (!trackStepBreak);

		this.debug('s', `    ${this.step-1}`);
		this.tracksPlaying = 0;
		this.tracksLooped = 0;
		const base = 16 * (this.step - 1);
		for (let i = 0; i < 8; i++) {
			if (this.trackStep[base+2*i] === 0xff) {
				this.tracks[i].pattern = null;
			} else if (this.trackStep[base+2*i] === 0xfe) {
				this.tracks[i].pattern = null;
				const voice = this.voices[this.trackStep[base+2*i+1]];
				voice.channel.enabled = 0;
				voice.macro = null;
				voice.effectsReset();
			} else if (this.trackStep[base+2*i] === 0x80) {
				this.tracksPlaying++;
			} else {
				const pattern = this.trackStep[base+2*i];
				if (pattern >= this.patternPtrs.length) {
					console.warn(`pattern ${pattern} out of range (${this.patternPtrs.length})`);
					this.tracks[i].pattern = null;
				} else {
					this.tracks[i].pattern = pattern;
					this.tracks[i].trackTranspose = this.trackStep[base+2*i+1];
					this.tracks[i].patternReset();
					this.tracksPlaying++;
				}
			}
		}
		this.trackFinished = false;
		return true;
	};

	processPattern(track) {
		if (track.pattern === null) {
			return;
		}

		if (track.patternPos++ > 0) {
			if (track.patternPos > this.speed)
				track.patternPos = 0;
			if (this.speed > 0)
				return;
		}

		if (track.patternWait > 0) {
			track.patternWait--;
			this.debug('p', 'wait');
			return;
		}

		let patternBreak = false;
		do {
			const pattern = this.patternData.slice(
				this.patternPtrs[track.pattern] + 4 * track.patternStep,
				this.patternPtrs[track.pattern] + 4 * track.patternStep + 4,
			);
			this.debug('p', `[${this.tracks.indexOf(track)}] pat`, track.pattern, track.patternStep, pattern);
			const voice = this.voices[pattern[2] & 0xf];
			switch (pattern[0]) {
			case 0xf0:
				this.debug('p', 'end');
				if (this.step === null) {
					this.trailingDelay = this.speed;
				} else {
					this.trackFinished = true;
				}
				patternBreak = true;
				break;
			case 0xf1:
				if (track.patternLoop === null) {
					track.patternLoop = pattern[1] > 0 ? pattern[1] - 1 : this.patternInfinity;
				} else if (track.patternLoop != 0) {
					track.patternLoop--;
				} else {
					track.patternLoop = null;
				}
				if (track.patternLoop === -1) {
					if (!track.patternInfLoop) {
						this.tracksLooped++;
						track.patternInfLoop = true;
					}
					if (this.tracksLooped === this.tracksPlaying && !loop) {
						track.patternLoop = null;
					}
				}
				if (track.patternLoop !== null) {
					track.patternStep = ((pattern[2]<<8) | pattern[3]) - 1;
				}
				if (track.patternLoop === -1) {
					track.patternLoop = null;
				}
				break;
			case 0xf2:
				track.patternReset();
				track.pattern = pattern[1];
				track.patternStep = ((pattern[2]<<8) | pattern[3]) - 1;
				patternBreak = true;
				break;
			case 0xf3:
				track.patternWait = pattern[1];
				patternBreak = true;
				break;
			case 0xf4:
				this.debug('p', 'stop');
				if (this.step === null) {
					this.trailingDelay = this.speed;
				} else {
					track.pattern = null;
					if (--this.tracksPlaying === 0) {
						this.step = this.firstStep;
						this.trackFinished = null;
						mixer.complete = true;
					}
				}
				patternBreak = true;
				break;
			case 0xf5:
				this.debug('p', 'KUP');
				if (voice) {
					voice.keyReleased = true;
				} else {
					console.warn(`Key Up for undefined voice ${pattern[2] & 0xf}`);
				}
				break;
			case 0xf6:
				voice.vibratoSpeed = pattern[1];
				voice.vibratoStep = getC2Byte(pattern[3]);
				voice.vibratoSgn = 1;
				voice.vibratoPos = voice.vibratoSpeed / 2;
				break;
			case 0xf7:
				voice.envelopeSpeed = (pattern[2] >> 4) + 1;
				voice.envelopeStep = pattern[1] / 2;
				voice.envelopeVol = pattern[3];
				voice.envelopeSgn = voice.envelopeVol > voice.channel.volume ? 1 : -1;
				voice.envelopePos = 0;
				break;
			default:
				if (pattern[0] < 0xc0) {
					const voice = this.voices[pattern[2] & 0xf];
					voice.macroNote = pattern[0] & 0x3f;
					voice.macro = pattern[1];
					voice.macroVolume = pattern[2] >> 4;
					voice.macroChannel = pattern[2] & 0xf;
					voice.macroReset();
					voice.trackTranspose = track.trackTranspose;
					if (pattern[0] & 0x80) {
						track.patternWait = pattern[3];
						patternBreak = true;
					}
					this.debug('p', 'play', {...voice}, patternBreak);
				} else if (pattern[0] < 0xf0) {
					const voice = this.voices[pattern[2] & 0xf];
					voice.portamentoSpeed = pattern[1];
					voice.portamentoPeriod = PERIODS[addC2Byte(pattern[0] & 0x3f, voice.trackTranspose)];
					voice.portamentoMul = (256 + pattern[3]) / 256;
					voice.portamentoSgn = voice.portamentoPeriod > voice.channel.audper ? 1 : -1;
					voice.portamentoPos = 0;
				}
			}
			track.patternStep++;
		} while (!patternBreak);
	};

	processMacro(voice) {
		if (voice.macro === null) {
			return;
		}
		const chan = voice.channel;

		if (voice.beginVibratoSpeed !== null && voice.beginVibratoStep !== null) {
			chan.pointer += getC2Word(voice.beginVibratoSgn * voice.beginVibratoStep);
			voice.beginVibratoPos++;
			if (voice.beginVibratoPos >= voice.beginVibratoSpeed) {
				voice.beginVibratoPos = 0;
				voice.beginVibratoSgn = -voice.beginVibratoSgn;
			}
		}
		if (voice.vibratoSpeed !== null && voice.vibratoStep !== null) {
			chan.period = chan.audper + voice.vibratoSgn * voice.vibratoStep / 8;
			voice.vibratoPos++;
			if (voice.vibratoPos >= voice.vibratoSpeed) {
				voice.vibratoPos = 0;
				voice.vibratoSgn = -voice.vibratoSgn;
			}
		}
		if (voice.envelopeVol !== null) {
			voice.envelopePos++;
			if (voice.envelopePos === voice.envelopeSpeed) {
				voice.envelopePos = 0;
				chan.volume += voice.envelopeSgn * voice.envelopeStep;
				if (chan.volume * voice.envelopeSgn >= voice.envelopeVol * voice.envelopeSgn) {
					chan.volume = voice.envelopeVol;
					voice.envelopeVol = null;
				}
			}
		}
		if (voice.portamentoPeriod !== null) {
			voice.portamentoPos++;
			if (voice.portamentoPos === voice.portamentoSpeed) {
				voice.portamentoPos = 0;
				chan.period = chan.audper * (voice.portamentoSgn > 0 ? voice.portamentoMul : 1 / voice.portamentoMul);
				if (chan.audper * voice.portamentoSgn >= voice.portamentoPeriod * voice.portamentoSgn) {
					chan.period = voice.portamentoPeriod;
					voice.portamentoPeriod = null;
				}
			}
		}

		if (voice.macroWaitDma > 0 && chan.loopcount >= voice.macroWaitDma) {
			this.debug('m', 'got DMA!');
			voice.macroWaitDma = 0;
			voice.macroWait = 0;
		}
		if (voice.macroWaitKeyUp && voice.keyReleased) {
			this.debug('m', 'got KUP!');
			voice.macroWaitKeyUp = false;
			voice.macroWait = 0;
		}
		if (voice.macroWait != 0) {
			voice.macroWait--;
			if (voice.macroWait === 0) {
				voice.macroWaitDma = 0;
				voice.macroWaitKeyUp = false;
			}
			this.debug('m', 'wait...');
			return;
		}

		let macroBreak = false;
		do {
			const macro = this.macroData.slice(
				this.macroPtrs[voice.macro] + 4 * voice.macroStep,
				this.macroPtrs[voice.macro] + 4 * voice.macroStep + 4,
			);
			this.debug('m', `[${this.voices.indexOf(voice)}] mac`, voice.macro, voice.macroStep, macro);
			switch (macro[0]) {
			case 0x0: // flag/addset/vol
				chan.enabled = 0;
				voice.effectsReset();
				break;
			case 0x1:
				chan.enabled = 1;
				break;
			case 0x2:
				chan.pointer = (macro[1]<<16) | (macro[2]<<8) | macro[3];
				break;
			case 0x3:
				chan.length = ((macro[2]<<8) | macro[3]) << 1;
				break;
			case 0x4:
				voice.macroWait = (macro[2]<<8) | macro[3];
				macroBreak = true;
				break;
			case 0x5:
				if (voice.macroLoop === null) {
					voice.macroLoop = macro[1] > 0 ? macro[1] - 1 : this.macroInfinity;
				} else if (voice.macroLoop != 0) {
					voice.macroLoop--;
				} else {
					voice.macroLoop = null;
				}
				if (voice.macroLoop !== null) {
					voice.macroStep = ((macro[2]<<8) | macro[3]) - 1;
				}
				if (voice.macroLoop === -1) {
					voice.macroLoop = null;
				}
				break;
			case 0x6:
				voice.macro = macro[1];
				voice.macroStep = ((macro[2]<<8) | macro[3]) - 1;
				break;
			case 0x7:
				if (this.macroInfinity > 0) {
					this.debug('m', 'end');
					this.trailingDelay = this.macroInfinity;
				} else {
					voice.macroWait = -1;
				}
				macroBreak = true;
				break;
			case 0x8:
				const period = PERIODS[addC2Byte(voice.macroNote, macro[1] + voice.trackTranspose)] + getC2Word((macro[2]<<8) | macro[3]) * 2;
				if (voice.portamentoSpeed === null) {
					chan.period = period;
				} else {
					voice.portamentoPeriod = period;
					voice.portamentoSgn = voice.portamentoPeriod > chan.audper ? 1 : -1;
					voice.portamentoPos = 0;
				}
				macroBreak = true;
				break;
			case 0x9:
				chan.period = PERIODS[macro[1]] + getC2Word((macro[2]<<8) | macro[3]) * 2;
				macroBreak = true;
				break;
			case 0xa:
				voice.effectsReset();
				break;
			case 0xb:
				voice.portamentoSpeed = macro[1];
				voice.portamentoMul = (256 + macro[3]) / 256;
				break;
			case 0xc:
				voice.vibratoSpeed = macro[1];
				voice.vibratoStep = getC2Byte(macro[3]);
				voice.vibratoSgn = 1;
				voice.vibratoPos = voice.vibratoSpeed / 2;
				break;
			case 0xd:
				chan.volume = addC2Byte(voice.macroVolume * 2, macro[3]);
				break;
			case 0xe:
				chan.volume = macro[3];
				break;
			case 0xf:
				voice.envelopeSpeed = macro[2];
				voice.envelopeStep = macro[1] / 2;
				voice.envelopeVol = macro[3];
				voice.envelopeSgn = voice.envelopeVol > chan.volume ? 1 : -1;
				voice.envelopePos = 0;
				break;
			case 0x11:
				voice.beginVibratoStep = (macro[2]<<8) | macro[3];
				voice.beginVibratoSpeed = macro[1];
				if (voice.beginVibratoSpeed === 0) {
					chan.pointer += getC2Word(voice.beginVibratoStep);
					voice.beginVibratoStep = null;
					voice.beginVibratoSpeed = null;
					macroBreak = true;
				} else {
					voice.beginVibratoSgn = 1;
					voice.beginVibratoPos = 0;
				}
				break;
			case 0x12:
				chan.length += getC2Word((macro[2]<<8) | macro[3]);
				macroBreak = true;
				break;
			case 0x13:
				chan.enabled = 0;
				break;
			case 0x14:
				voice.macroWait = macro[3] || this.macroInfinity;
				voice.macroWaitKeyUp = true;
				this.debug('m', 'wait KUP', macro[3]);
				macroBreak = true;
				break;
			case 0x15:
				voice.returnMacro = voice.macro;
				voice.returnStep = voice.macroStep + 1;
				voice.macro = macro[1];
				voice.macroStep = ((macro[2]<<8) | macro[3]) - 1;
				break;
			case 0x16:
				voice.macro = voice.returnMacro;
				voice.macroStep = voice.returnStep - 1;
				break;
			case 0x18:
				const offset = (macro[2]<<8) | macro[3];
				chan.pointer += offset;
				chan.length -= offset;
				break;
			case 0x19:
				chan.pointer = 0;
				chan.length = 0;
				voice.beginVibratoSpeed = null;
				voice.beginVibratoStep = null;
				break;
			case 0x1a:
				voice.macroWait = this.macroInfinity;
				voice.macroWaitDma = chan.loopcount + 1 + ((macro[2]<<8) | macro[3]);
				this.debug('m', 'wait DMA');
				macroBreak = true;
				break;
			case 0x1c:
				if (voice.macroNote > macro[1]) {
					voice.macroStep = ((macro[2]<<8) | macro[3]) - 1;
				}
				break;
			}
			voice.macroStep++;
		} while (!macroBreak);
	};

	replay() {
		position = this.stepPositions[this.step];
		super.replay();
	};
  }

  class TFMXVoice {
    constructor(index) {
      this.index = index;
      this.next = null
      this.initialize();
      return Object.seal(this);
    };

    initialize() {
      this.channel = null;
      this.trackTranspose = null;
      this.macro = null;
      this.macroNote = null;
      this.macroVolume = null;
      this.macroChannel = null;
      this.macroStep = null;
      this.macroWait = null;
      this.macroWaitKeyUp = null;
      this.macroWaitDma = null;
      this.macroLoop = null;
      this.keyReleased = null;
      this.returnMacro = null;
      this.returnStep = null;
      this.effectsReset();
    };

    macroReset() {
      this.macroStep = 0;
      this.macroWait = 0;
      this.macroWaitKeyUp = false;
      this.macroWaitDma = 0;
      this.macroLoop = null;
      this.keyReleased = false;
      this.returnMacro = null;
      this.returnStep = null;
    };

    effectsReset() {
      this.vibratoSpeed = null;
      this.vibratoStep = null;
      this.vibratoSgn = null;
      this.vibratoPos = null;
      this.beginVibratoSpeed = null;
      this.beginVibratoStep = null;
      this.beginVibratoSgn = null;
      this.beginVibratoPos = null;
      this.envelopeSpeed = null;
      this.envelopeStep = null;
      this.envelopeVol = null;
      this.envelopeSgn = null;
      this.envelopePos = null;
      this.portamentoSpeed = null;
      this.portamentoMul = null;
      this.portamentoSgn = null;
      this.portamentoPeriod = null;
      this.portamentoPos = null;
    };
  }

  class TFMXTrack {
    constructor(index) {
      this.index = index;
      this.next = null
      this.initialize();
      return Object.seal(this);
    };

    initialize() {
      this.pattern = null;
      this.patternStep = null;
      this.patternPos = null;
      this.patternWait = null;
      this.patternLoop = null;
      this.patternInfLoop = null;
      this.trackTranspose = null;
    };

    patternReset() {
      this.patternStep = 0;
      this.patternPos = 0;
      this.patternWait = 0;
      this.patternLoop = null;
      this.patternInfLoop = false;
    };
  }

  window.neoart.Trackers.TFMX = function() {
    tracker = new TFMX();
    return player;
  }

  class ScreamTracker3 extends Tracker {
    constructor() {
      super(Soundblaster);
      //quality = Quality.high;

      this.endian = true;
      this.globalVolume = 0;
      this.masterVolume = 0;
      this.master = 0;
      this.orders = [];
      this.instruments = [];
      this.channelSettings = [];
      this.panning = [];
      this.patterns = [];
      this.fastSlide = null;

      this.nextOrder     = 0;
      this.nextPosition  = 0;
      this.order         = 0;
      this.pattern       = null;
      this.patternDelay  = 0;
      this.patternOffset = 0;
      this.position      = 0;
      this.timer         = 0;
      this.orderPositions = [];

      ID.push(
        "Scream Tracker 3",
      );

      mixer.process = this.process.bind(this);

      PERIODS.set([
        27392, 25856, 24384, 23040, 21696, 20480, 19328, 18240, 17216, 16256, 15360, 14496,
        13696, 12928, 12192, 11520, 10848, 10240,  9664,  9120,  8608,  8128,  7680,  7248,
         6848,  6464,  6096,  5760,  5424,  5120,  4832,  4560,  4304,  4064,  3840,  3624,
         3424,  3232,  3048,  2880,  2712,  2560,  2416,  2280,  2152,  2032,  1920,  1812,
         1712,  1616,  1524,  1440,  1356,  1280,  1208,  1140,  1076,  1016,   960,   906,
          856,   808,   762,   720,   678,   640,   604,   570,   538,   508,   480,   453,
          428,   404,   381,   360,   339,   320,   302,   285,   269,   254,   240,   226,
          214,   202,   190,   180,   170,   160,   151,   143,   135,   127,   120,   113,
          107,   101,    95,    90,    85,    80,    75,    71,    67,    63,    60,    56,
      ]);

      this.amiga = FastTracker2.prototype.amiga.bind(this);
      this.retrig = FastTracker2.prototype.retrig.bind(this);

      return Object.seal(this);
    };

    initialize() {
      super.initialize();

      song = this.list[0];
      if (!this.list || this.list.length != this.orders.length) {
        this.list.length = this.orders.length;
        for (let i = 0; i < this.list.length; i++) {
          this.list[i] = new Song(song);
          this.list[i].start = i;
          this.list[i].restart = i;
        }
      }
      total = this.list.length;
      song = this.list[current];

      this.timer         = song.speed;
      this.master        = 64;
      this.order         = song.start;
      this.position      = 0;
      this.nextOrder     = -1;
      this.nextPosition  = -1;
      this.patternDelay  = 0;
      this.patternOffset = 0;
      this.orderPositions = [];

      this.voices.length = channels;
      for (let i = 0; i < channels; i++) {
        const voice = new ST3Voice(i);

        voice.channel = mixer.output[i];

        this.voices[i] = voice;
        if (i) { this.voices[i - 1].next = voice; }
      }

      for (let i = 0; i < channels; i++) {
        const pan = this.panning[i] & 0xf;
        this.voices[i].channel.panning = (pan << 4) | pan;
      }

      //this.master = Math.min(this.globalVolume, 64) * (this.masterVolume & ~0x80) >> 6;
    };

	parse(stream) {
		stream.position = 0x2c;
		if (stream.readUTF8(4) !== "SCRM") return;

		stream.position = 0;
		song.title = stream.readUTF8(28);
		if (stream.ubyte !== 0x1a) return;
		if (stream.ubyte !== 0x10) return;
		stream.position += 2;

		song.length = stream.ushort;
		const instrumentPtrs = new Uint16Array(stream.ushort);
		const patternPtrs = new Uint16Array(stream.ushort);
		const flags = stream.ushort;
		this.fastSlide = !!(flags & 64);
		const ver = stream.ushort;
		version = 1;
		if (stream.ushort !== 2) return;
		stream.position += 4;

		this.globalVolume = stream.ubyte;
		song.speed = stream.ubyte;
		this.tempo = stream.ubyte;
		this.masterVolume = stream.ubyte;
		stream.position += 1;
		this.panning = new Uint8Array(stream.ubyte === 252 ? 32 : 0);
		stream.position += 8;
		stream.position += 2;

		this.channelSettings = new Uint8Array(32);
		stream.readBytes(this.channelSettings, 0, this.channelSettings.length);
		channels = this.channelSettings.filter(ch => ch !== 255).length;

		this.orders = new Uint8Array(song.length);
		stream.readBytes(this.orders, 0, this.orders.length);

		for (let i = 0; i < instrumentPtrs.length; i++)
			instrumentPtrs[i] = stream.ushort << 4;

		for (let i = 0; i < patternPtrs.length; i++)
			patternPtrs[i] = stream.ushort << 4;

		stream.readBytes(this.panning, 0, this.panning.length);

		this.instruments.length = instrumentPtrs.length;
		for (let i = 0; i < instrumentPtrs.length; i++) {
			stream.position = instrumentPtrs[i];
			if (stream.ubyte !== 1) continue;
			const sample = new SBSample();
			sample.name = stream.readUTF8(12);
			const offset = ((stream.ubyte << 16) | stream.ushort) << 4;
			sample.length = stream.uint
			sample.loopStart = stream.uint;
			sample.loopLen = stream.uint;
			sample.volume = stream.ubyte;
			stream.position += 2;
			const flags = stream.ubyte;
			sample.loopMode = flags & 0x1;
			if (flags & ~0x1) throw 'unsupported flags';
			sample.rate = stream.uint;
			stream.position += 12 + 28;
			if (stream.readUTF8("4") !== "SCRS") continue;
			stream.position = offset;
			sample.data = new Float32Array(sample.length);
			for (let j = 0; j < sample.data.length; j++) {
				sample.data[j] = (stream.ubyte - 128) / 128;
			}
			if (sample.loopMode) {
			  sample.length = sample.loopLen;
			}
			this.instruments[i] = { sample };
		}

		this.patterns.length = patternPtrs.length;
		for (let i = 0; i < this.patterns.length; i++) {
			stream.position = patternPtrs[i];
			const end = stream.position + stream.ushort;
			let row = 0;
			this.patterns[i] = [];
			while (stream.position < end) {
				this.patterns[i][row] ||= [];
				const what = stream.ubyte;
				if (what === 0) {
					row++;
					continue;
				}
				const ch = what & 0x1f;
				this.patterns[i][row][ch] ||= new ST3Row();
				const data = this.patterns[i][row][ch];
				if (what & 0x20) {
					data.note = stream.ubyte;
					data.instr = stream.ubyte;
				}
				if (what & 0x40) {
					data.volume = stream.ubyte;
				}
				if (what & 0x80) {
					data.effect = stream.ubyte;
					data.param = stream.ubyte;
				}
			}
		}
	};

    process() {
      let voice = this.voices[0];
      let porta = false;
      let jumpFlag = false;
      let slide = false;

      if (this.orderPositions[this.order] == null) {
        this.orderPositions[this.order] = position;
      }

      if (!this.tick) {
        if (this.nextOrder >= 0) { this.order = this.nextOrder; }
        if (this.nextPosition >= 0) { this.position = this.nextPosition; }

        this.nextOrder = this.nextPosition = -1;
        this.pattern = this.patterns[this.orders[this.order]];

        do {
          const row = (this.pattern[this.position] || [])[voice.index];
          if (!row) {
            continue;
          }
          porta = (row.effect == 7);

          if (row.instr) {
            if (!porta) {
              voice.instrument = (row.instr <= this.instruments.length) ? this.instruments[row.instr-1] : null;
            }

            voice.volEnvelope.reset();
            voice.panEnvelope.reset();
            voice.flags |= (UPDATE_VOLUME | SHORT_RAMP);
          }

          const note = row.note ? row.note : !!row.instr;
          if (note && !voice.keyoff) {
            if (porta && voice.portaSkip) { continue; }
            voice.portaSkip = 0;

            if (voice.instrument) {
              const instr = voice.instrument;
              let value = (row.note & 0x0f) + (row.note >> 4) * 12 - 1;
              let sample;

              if (note === true) {
                value = voice.note;
                sample = voice.sample;
              } else {
                sample = instr.sample;
                value += sample.relative;
              }
              if (value >= LOWER_NOTE && value <= HIGHER_NOTE) {
                if (!porta) {
                  voice.note = value;
                  voice.sample = sample;

                  if (row.instr) {
                    voice.volEnabled = instr.volEnabled;
                    voice.panEnabled = instr.panEnabled;
                    voice.flags |= UPDATE_ALL & ~UPDATE_PANNING;
                  } else {
                    voice.flags |= (UPDATE_PERIOD | UPDATE_TRIGGER);
                  }
                }

                if (row.instr) {
                  voice.reset();
                  voice.fadeDelta = instr.fadeout;
                }

                value = this.amiga(value, voice.finetune);

                if (!porta) {
                  voice.period = value * 8363 / instr.sample.rate;
                  voice.glissPeriod = 0;
                } else {
                  voice.portaPeriod = value;
                }
              }
            } else {
              voice.volume = 0;
              voice.flags = (UPDATE_VOLUME | SHORT_RAMP);
            }
          } else if (voice.vibratoReset) {
            if (row.effect !== 8 && row.effect !== 11) {
              voice.vibDelta = 0;
              voice.vibratoReset = 0;
              voice.flags |= UPDATE_PERIOD;
            }
          }

          if (row.volume != null) {
            voice.volume = row.volume !== 255 ? row.volume : voice.instrument?.sample.volume;
            voice.flags |= (UPDATE_VOLUME | SHORT_RAMP);
          }

          if (row.effect) {
            const paramx = row.param >> 4;
            const paramy = row.param & 0xf;
            switch (row.effect) {
              case 1:
                if (row.param !== 0) this.timer = row.param;
                break;
              case 2:
                this.nextOrder = row.param;

                if (this.nextOrder >= song.length) {
                  mixer.complete = 1;
                } else {
                  this.nextPosition = 0;

                  if (this.played[this.nextOrder] == this.nextPosition) {
                    mixer.complete = 1;
                  } else {
                    this.played[this.nextOrder] = this.nextPosition;
                  }
                }

                jumpFlag = true;
                this.patternOffset = 0;
                break;
              case 3:
                this.nextPosition = (row.param >> 4) * 10 + (row.param & 0x0f);
                this.patternOffset = 0;

                if (!jumpFlag) {
                  this.nextOrder = this.order + 1;

                  if (this.nextOrder >= song.length || this.orders[this.nextOrder] >= 254) {
                    this.complete = 1;
                    this.nextPosition = -1;
                  } else {
                    this.played[this.nextOrder] = this.nextPosition;
                  }
                }
                break;
              case 4:
                if (row.param) { voice.volSlide = row.param; }
                if ((voice.volSlide & 0xf) === 0xf) {
                  voice.volume += voice.volSlide >> 4;
                  voice.flags |= UPDATE_VOLUME;
                } else if ((voice.volSlide & 0xf0) === 0xf0) {
                  voice.volume -= voice.volSlide & 0xf;
                  voice.flags |= UPDATE_VOLUME;
                }
                if (this.fastSlide || voice.volSlide === 0x0f || voice.volSlide === 0xf0) {
                  this.slide(voice);
                }
                break;
              case 5:
                voice.portaD = row.param;
                if ((voice.portaD & 0xf0) === 0xf0) {
                  voice.period += (voice.portaD & 0xf) << 2;
                } else if ((voice.portaD & 0xf0) === 0xe0) {
                  voice.period += voice.portaD & 0xf;
                }
                if (voice.period > PERIODS[0]) {
                  voice.channel.enabled = 0;
                }
                voice.flags |= UPDATE_PERIOD;
                break;
              case 6:
                voice.portaU = row.param;
                if ((voice.portaU & 0xf0) === 0xf0) {
                  voice.period -= (voice.portaU & 0xf) << 2;
                } else if ((voice.portaU & 0xf0) === 0xe0) {
                  voice.period -= voice.portaU & 0xf;
                }
                if (voice.period < PERIODS[PERIODS.length-1]) {
                  voice.channel.enabled = 0;
                }
                voice.flags |= UPDATE_PERIOD;
                break;
              case 7:
                if (row.param) { voice.portaSpeed = row.param; }
                break;
              case 8:
                voice.vibratoReset = 1;
                break;
              case 11:
                if (row.param) { voice.volSlide = row.param; }
                voice.vibratoReset = 1;
                break;
              case 15:
                if (row.param) { voice.sampleOffset = row.param << 8; }

                if (voice.sampleOffset >= voice.sample.length) {
                  voice.portaSkip = 1;
                  voice.sampleOffset = 0;
                  voice.keyoff = 1;
                  voice.flags &= ~(UPDATE_PERIOD | UPDATE_TRIGGER);
                }
                break;
              case 17:
                if (paramx) { voice.retrigx = paramx; }
                if (paramy) { voice.retrigy = paramy; }

                if (this.tick % voice.retrigy) { break; }
                if (voice.retrigx) { this.retrig(voice); }
                break;
              case 19:
                switch (paramx) {
                  case 8:
                    voice.panning = paramy | (paramy << 4);
                    voice.flags |= UPDATE_PANNING;
                    break;
                  case 13:
                    console.warn('set vibrato waveform', paramy);
                    break;
                  default:
                    console.error('efx', paramx, voice.index);
                }
                break;
              case 20:
                mixer.ticksize = ((audio.sampleRate * 2.5) / row.param) >> 0;
                break;
              default:
                console.error('fx', row.effect, voice.index);
            }
          }

        } while (voice = voice.next);
      } else {
        do {
          const row = (this.pattern[this.position] || [])[voice.index];
          if (!row) {
            continue;
          }

          switch (row.effect) {
            case 4:
              slide = true;
              break;
            case 5:
              if (voice.portaD >= 0xe0) break;
              voice.period += voice.portaD << 2;
              if (voice.period > PERIODS[0]) {
                voice.channel.enabled = 0;
              }
              voice.flags |= UPDATE_PERIOD;
              break;
            case 6:
              if (voice.portaU >= 0xe0) break;
              voice.period -= voice.portaU << 2;
              if (voice.period < PERIODS[PERIODS.length-1]) {
                voice.channel.enabled = 0;
              }
              voice.flags |= UPDATE_PERIOD;
              break;
            case 7:
              if (voice.portaPeriod) { voice.tonePortamento(); }
              break;
            case 8:
              const paramx = row.param >> 4;
              const paramy = row.param & 0xf;
              if (paramx) { voice.vibratoSpeed = paramx; }
              if (paramy) { voice.vibratoDepth = paramy; }
              voice.vibrato();
              break;
            case 11:
              slide = true;
              voice.vibrato();
              break;
            case 17:
              if (this.tick % voice.retrigy) { break; }

              if (voice.retrigx) { this.retrig(voice); }
              voice.flags |= UPDATE_TRIGGER;
              break;
            default:
          }

          if (slide) {
           slide = false;
           this.slide(voice);
         }
        } while (voice = voice.next);
      }

      if (++this.tick >= (this.timer + this.patternDelay)) {
        this.tick = this.patternDelay = 0;

        if (this.nextPosition < 0) {
          this.nextPosition = this.position + 1;

          if (this.nextPosition >= 64 || this.complete) {
            this.nextOrder = this.order + 1;
            this.nextPosition = this.patternOffset;

            if (this.played[this.nextOrder] == this.nextPosition) {
              mixer.complete = 1;
            } else {
              this.played[this.nextOrder] = this.nextPosition;
            }
            if (this.nextOrder >= song.length || this.orders[this.nextOrder] >= 254) {
              this.nextOrder = song.restart;
              mixer.complete = 1;
            }
          }
        }
      }

      position += mixer.ticksize;
    };

    fast() {
      var voice = this.voices[0];
      var chan, delta, flags, instr, panning, vol;

      do {
        chan = voice.channel;
        flags = voice.flags;
        voice.flags = 0;

        if (flags & UPDATE_TRIGGER) {
          chan.index   = voice.sampleOffset;
          chan.pointer = -1;
          chan.sample  = voice.sample;
          chan.length  = voice.sample.length;

          chan.dir = chan.fraction = 0;

          chan.enabled = (chan.sample.data) ? 1 : 0;
          voice.playing = voice.instrument;
          voice.sampleOffset = 0;
        }

        instr = voice.playing;
        delta = (instr?.vibratoSpeed) ? voice.autoVibrato() : 0;

        vol = voice.volume + voice.volDelta;

        if (instr?.volEnabled) {
          if (voice.volEnabled && !voice.volEnvelope.stopped) {
            this.envelope(voice, voice.volEnvelope, instr.volData);
          }

          vol = (vol * voice.volEnvelope.value) >> 6;
          flags |= UPDATE_VOLUME;

          if (voice.fadeEnabled) {
            voice.fadeVolume -= voice.fadeDelta;

            if (voice.fadeVolume < 0) {
              voice.fadeVolume  = vol = 0;
              voice.fadeEnabled = 0;

              voice.volEnvelope.value   = 0;
              voice.volEnvelope.stopped = 1;
              voice.panEnvelope.stopped = 1;
            } else {
              vol = (vol * voice.fadeVolume) >> 16;
            }
          }
        } else if (voice.keyoff) {
          chan.enabled = 0;
        }

        panning = voice.panning;

        if (instr?.panEnabled) {
          if (voice.panEnabled && !voice.panEnvelope.stopped) {
            this.envelope(voice, voice.panEnvelope, instr.panData);
          }

          panning = voice.panEnvelope.value << 2;
          flags |= UPDATE_PANNING;

          if (panning < 0) {
            panning = 0;
          } else if (panning > 255) {
            panning = 255;
          }
        }

        if (flags & UPDATE_PANNING) {
          chan.panning = panning;
          chan.lpan = Math.sqrt((256 - panning) / 512);
          chan.rpan = Math.sqrt(panning / 512);

          chan.lvol = chan.volume * chan.lpan;
          chan.rvol = chan.volume * chan.rpan;
        }

        if (flags & UPDATE_VOLUME || this.masterFlag) {
          if (vol < 0) {
            vol = 0;
          } else if (vol > 64) {
            vol = 64;
          }

          chan.volume = VOLUMES[(volume * vol * this.master) >> 12];
          chan.lvol = chan.volume * chan.lpan;
          chan.rvol = chan.volume * chan.rpan;
        }

        if (flags & UPDATE_PERIOD) {
          delta += (voice.period + voice.arpDelta + voice.vibDelta);

          chan.speed = (((65536 * (14317456 / delta)) / audio.sampleRate) >> 0) / 65536;

          chan.delta = chan.speed >> 0;
          chan.speed -= chan.delta;
        }
      } while (voice = voice.next);
    };

    accurate() {
      var voice = this.voices[0];
      var chan, delta, flags, instr, lpan, lvol, panning, rpan, rvol, vol;

      do {
        chan = voice.channel;
        flags = voice.flags;
        voice.flags = 0;

        if (flags & UPDATE_TRIGGER) {
          if (chan.sample) {
            flags |= SHORT_RAMP;
            chan.mixCounter = 220;
            chan.oldSample  = null;
            chan.oldPointer = -1;

            if (chan.enabled) {
              chan.oldDir = chan.dir;
              chan.oldFraction = chan.fraction;
              chan.oldSpeed    = chan.speed;
              chan.oldSample   = chan.sample;
              chan.oldPointer  = chan.pointer;
              chan.oldLength   = chan.length;

              chan.lmixRampD  = chan.lvol;
              chan.lmixDeltaD = chan.lvol / 220;
              chan.rmixRampD  = chan.rvol;
              chan.rmixDeltaD = chan.rvol / 220;
            }
          }

          chan.dir = 1;
          chan.fraction = 0;
          chan.sample   = voice.sample;
          chan.pointer  = voice.sampleOffset;
          chan.length   = voice.sample.length;

          chan.enabled = (chan.sample.data) ? 1 : 0;
          voice.playing = voice.instrument;
          voice.sampleOffset = 0;
        }

        instr = voice.playing;
        delta = (instr?.vibratoSpeed) ? voice.autoVibrato() : 0;

        vol = voice.volume + voice.volDelta;

        if (instr?.volEnabled) {
          if (voice.volEnabled && !voice.volEnvelope.stopped) {
            this.envelope(voice, voice.volEnvelope, instr.volData);
          }

          vol = (vol * voice.volEnvelope.value) >> 6;
          flags |= UPDATE_VOLUME;

          if (voice.fadeEnabled) {
            voice.fadeVolume -= voice.fadeDelta;

            if (voice.fadeVolume < 0) {
              voice.fadeVolume  = vol = 0;
              voice.fadeEnabled = 0;

              voice.volEnvelope.value   = 0;
              voice.volEnvelope.stopped = 1;
              voice.panEnvelope.stopped = 1;
            } else {
              vol = (vol * voice.fadeVolume) >> 16;
            }
          }
        } else if (voice.keyoff) {
          chan.enabled = 0;
        }

        panning = voice.panning;

        if (instr?.panEnabled) {
          if (voice.panEnabled && !voice.panEnvelope.stopped) {
            this.envelope(voice, voice.panEnvelope, instr.panData);
          }

          panning = voice.panEnvelope.value << 2;
          flags |= UPDATE_PANNING;

          if (panning < 0) {
            panning = 0;
          } else if (panning > 255) {
            panning = 255;
          }
        }

        if (!chan.enabled) {
          chan.volCounter = 0;
          chan.panCounter = 0;
          continue;
        }

        if (flags & UPDATE_VOLUME || this.masterFlag) {
          if (vol < 0) {
            vol = 0;
          } else if (vol > 64) {
            vol = 64;
          }

          vol = VOLUMES[(volume * vol * this.master) >> 12];
          lvol = vol * Math.sqrt((256 - panning) / 512);
          rvol = vol * Math.sqrt(panning / 512);

          if (vol != chan.volume && !chan.mixCounter) {
            chan.volCounter = (flags & SHORT_RAMP) ? 220 : mixer.ticksize;

            chan.lvolDelta = (lvol - chan.lvol) / chan.volCounter;
            chan.rvolDelta = (rvol - chan.rvol) / chan.volCounter;
          } else {
            chan.lvol = lvol;
            chan.rvol = rvol;
          }

          chan.volume = vol;
        }

        if (flags & UPDATE_PANNING) {
          lpan = Math.sqrt((256 - panning) / 512);
          rpan = Math.sqrt(panning / 512);

          if (panning != chan.panning && !chan.mixCounter && !chan.volCounter) {
            chan.panCounter = mixer.ticksize;

            chan.lpanDelta = (lpan - chan.lpan) / chan.panCounter;
            chan.rpanDelta = (rpan - chan.rpan) / chan.panCounter;
          } else {
            chan.lpan = lpan;
            chan.rpan = rpan;
          }

          chan.panning = panning;
        }

        if (flags & UPDATE_PERIOD) {
          delta += (voice.period + voice.arpDelta + voice.vibDelta);

          chan.speed = (((65536 * (14317456 / delta)) / audio.sampleRate) >> 0) / 65536;
        }

        if (chan.mixCounter) {
          chan.lmixRampU  = 0.0;
          chan.lmixDeltaU = chan.lvol / 220;
          chan.rmixRampU  = 0.0;
          chan.rmixDeltaU = chan.rvol / 220;
        }
      } while (voice = voice.next);
    };

    slide(voice) {
      if ((voice.volSlide & 0xf) === 0) {
        voice.volume += voice.volSlide >> 4;
        voice.flags |= UPDATE_VOLUME;
      } else if ((voice.volSlide & 0xf0) === 0) {
        voice.volume -= voice.volSlide & 0xf;
        voice.flags |= UPDATE_VOLUME;
      }
    };

    replay() {
      position = this.orderPositions[this.nextOrder] || 0;
      super.replay();
    };

  }

  class ST3Instrument {
    constructor() {
      this.sample = null;
      Object.seal(this);
    }
  }

  class ST3Row {
    constructor() {
      this.note   = null;
      this.instr  = null;
      this.volume = null;
      this.effect = null;
      this.param  = null;
      Object.seal(this);
    };
  }

  class ST3Voice extends F2Voice {
    vibrato() {
      if (!ST3Voice.VIBRATO) {
        ST3Voice.VIBRATO = new Float32Array(256);
        for (let i = 0; i < ST3Voice.VIBRATO.length; i++) {
          ST3Voice.VIBRATO[i] = 127*Math.sin(Math.PI*2*(i/256));
        }
      }

      const delta = ST3Voice.VIBRATO[this.vibratoPos & 255];
      this.vibDelta += (delta * this.vibratoDepth) / 128;
      this.vibratoPos += this.vibratoSpeed << 1;
      this.flags |= UPDATE_PERIOD;
    };
  }

  window.neoart.Trackers.ScreamTracker3 = function() {
    tracker = new ScreamTracker3();
    return player;
  }

  const ID = [""];

  const VIBRATO = new Uint8Array([0,24,49,74,97,120,141,161,180,197,212,224,235,244,250,253,255,253,250,244,235,224,212,197,180,161,141,120,97,74,49,24]);

  var analyser = [];
  var buffer   = 8192;
  var cache    = [];
  var channels = 4;
  var cia      = false;
  var current  = 0;
  var filter   = Filter.disabled;
  var loop     = false;
  var maxver   = 0;
  var minver   = 0;
  var model    = Model.a1200;
  var mute     = 0;
  var muted    = new Uint8Array(32);
  var ntsc     = false;
  var paused   = false;
  var position = 0;
  var quality  = Quality.low;
  var readPos  = 0;
  var record   = false;
  var skip     = false;
  var song     = new Song();
  var starting = 0;
  var stereo   = 1.0;
  var total    = 0;
  var variant  = 0;
  var version  = 0;
  var volume   = 64;
  var writePos = 0;

  var audio    = null;
  var mixer    = null;
  var node     = null;
  var playtime = 999;
  var rate     = null;
  var synctime = 0.1;
  var tracker  = null;
  var wave     = [];

  const player = Object.freeze(new Player());

  Object.freeze(window.neoart.Trackers);

  class FileLoader {
    constructor() {
      this.player = player;
      this.initialize();
    };

    initialize() {
      this.packer = "";
      this.packed = 0;
      this.unpacked = 0;
    };

    load(stream) {
      var type;

      this.initialize();
      if (!stream) { return false; }

      stream = new ByteArray(stream);
      stream.endian = true;
      stream.position = 0;

      if (stream.uint == 67324752) {
        if (Flip) {
          let archive = new Flip(stream);
          this.packed = stream.length;
          this.unpacked = archive.total;

          if (archive.entries.length == 1) {
            stream = archive.uncompress(archive.entries[0]);
          }
        } else {
          throw "Unzip support is not available.";
        }
      } else {
        this.unpacked = stream.length;
      }

      if (tracker) {
        if (player.load(stream)) { return true; }
      }

      for (type in window.neoart.Trackers) {
        window.neoart.Trackers[type]();
        if (player.load(stream)) { return true; }
      }

      if (!window.neoart.Packers) { return false; }

      if (!(tracker instanceof Soundtracker)) {
        window.neoart.Trackers.Soundtracker();
      }

      stream.position = 0;
      stream.endian = false;
      for (type in window.neoart.Packers) {
        let packer = window.neoart.Packers[type]();
        let output = packer.depack(stream);

        if (packer.format) {
          if (player.load(output)) {
            this.packer = packer.format;
            this.packed = packer.packed;
            this.unpacked = packer.unpacked;
            return true;
          }
        }
      }

      return false;
    };
  }

  window.neoart.initialize = function() {
    if (window.neoart.audioContext) return;
    if (typeof AudioContext === "undefined") {
      window.neoart.audioContext = new webkitAudioContext();
    } else {
      window.neoart.audioContext = new AudioContext();
    }
    audio = window.neoart.audioContext;
    rate = audio.sampleRate / 1000;
  }

  window.neoart.FileLoader = function() {
    return Object.seal(new FileLoader());
  }

  function isNumeric(value) {
    value = parseFloat(value);
    return !Number.isNaN(value) && isFinite(value);
  }

  function range(value, min = 0.0, max = 1.0) {
    if (value < min) {
      value = min;
    } else if (value > max) {
      value = max;
    }

    return value;
  }

  function rol(value, shift) {
    return (value << shift) | (value >>> (32 - shift));
  }

  function rol8(value, shift) {
    const rotation = shift & 7;

    return ((value << rotation) & 255) | (value >>> (8 - rotation));
  }

  function getC2Byte(value) {
    return Int8Array.of(value)[0];
  }
  function getC2Word(value) {
    return Int16Array.of(value)[0];
  }
  function addC2Byte(value, offset) {
    return Uint8Array.of(value+offset)[0];
  }
  function addC2Word(value, offset) {
    return Uint16Array.of(value+offset)[0];
  }

  const MAGIC = "M.K.";

  const NOTES = [
    [0x00, 0x00], [0x03, 0x58], [0x03, 0x28], [0x02, 0xfa],
    [0x02, 0xd0], [0x02, 0xa6], [0x02, 0x80], [0x02, 0x5c],
    [0x02, 0x3a], [0x02, 0x1a], [0x01, 0xfc], [0x01, 0xe0],
    [0x01, 0xc5], [0x01, 0xac], [0x01, 0x94], [0x01, 0x7d],
    [0x01, 0x68], [0x01, 0x53], [0x01, 0x40], [0x01, 0x2e],
    [0x01, 0x1d], [0x01, 0x0d], [0x00, 0xfe], [0x00, 0xf0],
    [0x00, 0xe2], [0x00, 0xd6], [0x00, 0xca], [0x00, 0xbe],
    [0x00, 0xb4], [0x00, 0xaa], [0x00, 0xa0], [0x00, 0x97],
    [0x00, 0x8f], [0x00, 0x87], [0x00, 0x7f], [0x00, 0x78],
    [0x00, 0x71], [0x00, 0x00]
  ];

  const TABLE = new Int16Array([0,1,2,4,8,16,32,64,128,-64,-32,-16,-8,-4,-2,-1]);

  window.neoart.Packers = Object.create(null);

  class Packer {
    constructor() {
      this.reset();
      return Object.seal(this);
    };

    about() {
      console.info("Packers 1.6\n2017/02/15\nChristian Corti\nNEOART Costa Rica");
    };

    sort(a, b) {
      return a - b;
    };

    reset() {
      this.format   = "";
      this.higher   = 0;
      this.offsets  = [];
      this.packed   = 0;
      this.samples  = 0;
      this.sdata    = 0;
      this.ssize    = 0;
      this.tdata    = 0;
      this.track    = [];
      this.unpacked = 0;
    };
  }
/* Digital Illusion Packer by The Silents */

  class DigitalIllusion extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, i, out, size;

      if (!this.identify(stream)) { return stream; }
      out = new ByteArray(this.unpacked);

      out.position = 20;
      stream.position = 14;

      out.writeUTF8("flod_digital_illusion ");
      out.position = 20;

      for (i = 0; i < this.samples; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      out.byte = (this.patterns - this.tdata) - 1;
      out.byte = 0x7f;

      this.offsets[this.higher] = this.sdata;

      for (i = 0; i < this.higher; i++) {
        this.offsets[i] = stream.ushort;
      }

      stream.position = this.tdata;

      while ((i = stream.ubyte) != 0xff) {
        out.byte = i;
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      this.higher++;

      for (i = 1; i < this.higher; i++) {
        size = this.offsets[i];

        do {
          b0 = stream.ubyte;

          if (b0 == 0xff) {
            out.position += 4;
            continue;
          }

          b1 = stream.ubyte;
          b2 = ((b0 << 4) & 0x30) | ((b1 >> 4) & 0x0f);
          b3 =  (b0 >> 2) & 0x1f;

          out.byte = NOTES[b2][0] | (b3 & 0xf0);
          out.byte = NOTES[b2][1];
          out.byte = ((b3 << 4) & 0xf0) | (b1 & 0x0f);

          if (b0 & 0x80) {
            out.byte = stream.ubyte;
          } else {
            out.position++;
          }
        } while (stream.position < size);

        out.position = 1084 + (i << 10);
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var i;

      this.reset();
      stream.position = 0;

      this.samples = stream.ushort;
      if (this.samples > 31) { return 0; }

      this.tdata = stream.uint;
      this.patterns = stream.uint;
      this.sdata = stream.uint;

      if (this.tdata > this.patterns || this.tdata > this.sdata || this.patterns > this.sdata) { return 0; }

      if (this.tdata >= stream.length || this.patterns >= stream.length || this.sdata >= stream.length) { return 0; }

      stream.position = this.patterns - 1;
      if (stream.ubyte != 0xff) { return 0; }

      stream.position = 14;

      for (i = 0; i < this.samples; i++) {
        this.ssize += (stream.ushort << 1);

        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        stream.position += 4;
      }

      if ((this.sdata + this.ssize) > stream.length) { return 0; }
      stream.position = this.tdata;

      while ((i = stream.ubyte) != 0xff) {
        if (i > this.higher) { this.higher = i; }
      }

      this.format = "Digital Illusion";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (++this.higher << 10) + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.patterns = 0;
    };
  }

  window.neoart.Packers.DigitalIllusion = function() {
    return new DigitalIllusion();
  }
/* Module Protector 1.0 by David Counter aka Matrix of LSD */

  class ModuleProtector extends Packer {
    depack(stream) {
      var i, out;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      out.writeBytes(stream, stream.position, 130);
      out.writeUTF8(MAGIC);

      stream.position = 378;
      if (this.skip) { stream.position += 4; }

      i = stream.length - stream.position;

      out.writeBytes(stream, stream.position, i);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, i, len, loop, repl, val;

      if (stream.length < 1404) { return 0; }

      this.reset();
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;

        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        this.ssize += (val << 1);

        loop = stream.ushort;
        repl = stream.ushort;
        if (val == 0) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2) { return 0; }

      len = stream.ubyte;
      if (len == 0 || len > 0x7f || stream.ubyte > 0x7f) { return 0; }

      for (i = 0; i < 128; i++) {
        val = stream.ubyte;
        if (val > 0x3f) { return 0; }
        if (val > this.higher) { this.higher = val; }
      }

      this.sdata = 378 + (++this.higher << 10);
      len = this.sdata + this.ssize;
      if (len > stream.length) { return 0; }

      if ((stream.length - len) == 4) {
        this.skip = true;
        stream.position += 4;
      }

      len = this.higher << 8;
      repl = 0;

      for (i = 0; i < len; i++) {
        val = stream.uint;
        if (val) { repl++; }

        b0 = (val >> 16) & 0x0fff;
        if (b0 > 0x358 || (b0 != 0 && b0 < 0x71)) { return 0; }

        b0 = (val >> 24) & 0xf0;
        if (b0 > 0x10) { return 0; }
      }

      if (repl == 0) { return 0; }

      len = (this.higher << 10) + this.ssize;
      val = stream.length - 378;
      if (this.skip) { val -= 4; }

      if ((len - val) == 384) { return 0; }

      this.format = "Module Protector 1.0";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + len;
      return 1;
    };

    reset() {
      super.reset();
      this.skip = false;
    };
  }

  window.neoart.Packers.ModuleProtector = function() {
    return new ModuleProtector();
  }
/* NoisePacker 1.0/2.0/2.01/2.02/2.03 by Twins of Phenomena */

  class NoisePacker2 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, i, j, out, val, x;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 8;

      for (i = 0; i < this.samples; i++) {
        out.position += 22;
        stream.position += 4;

        out.int = stream.uint;
        stream.position += 4;

        b0 = stream.ushort;
        b1 = stream.ushort;
        if (this.version < 2.01) { b1 >>= 1; }

        out.short = b1;
        out.short = b0;
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      stream.position += 2;
      out.byte = this.length;
      out.byte = stream.ushort >> 1;

      for (i = 0; i < this.length; i++) {
        out.byte = stream.ushort >> 3;
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      for (i = 0; i < this.higher; i++) {
        val = 1084 + (i << 10);

        for (c = 0; c < 4; c++) {
          stream.position = this.offsets[c + (i << 2)];
          x = val + (c << 2);

          for (j = 0; j < 64; j++) {
            b0 = stream.ubyte;
            b1 = stream.ubyte;
            b2 = stream.ubyte;

            b3 = (b0 & 0xfe) >> 1;
            b0 = ((b0 << 4) & 0x10) | NOTES[b3][0];

            out.writeAt(x++, b0);
            out.writeAt(x++, NOTES[b3][1]);

            b3 = b1 & 0x0f;

            switch (b3) {
              case 0x0a:
                if (this.version > 1) { break; }
              case 0x07:
                b1 = (b1 & 0xf0) + 0x0a;
              case 0x05:
              case 0x06:
                b2 = (b2 > 0x80) ? 0x100 - b2 : (b2 << 4) & 0xf0;
                break;
              case 0x08:
                b1 -= 8;
                break;
              case 0x0b:
                if (this.version > 1) {
                  b2 = ((b2 + 2) & 0xff) >> 1;
                }
                break;
              case 0x0e:
                if (this.version > 1) { b2 >>= 1; }
                break;
            }

            out.writeAt(x++, b1);
            out.writeAt(x++, b2);
            x += 12;
          }
        }
      }

      out.position = this.unpacked - this.ssize;
      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, b1, b2, i, j, val;

      this.reset();
      stream.position = 0;

      b0 = stream.ushort;
      b1 = stream.ushort;
      b2 = stream.ushort;

      this.samples = (b0 - 0x0c) >> 4;
      this.length = b1 >> 1;
      this.tdata = b0 + b1 + b2;
      this.sdata = this.tdata + stream.ushort;

      if (this.length > 0x7f || this.sdata >= stream.length) { return 0; }

      for (i = 0; i < this.samples; i++) {
        stream.position += 4;
        val = stream.ushort;
        this.ssize += (val << 1);

        stream.position++;
        if (stream.ubyte > 0x40) { return 0; }
        stream.position += 4;

        b0 = stream.ushort;
        b1 = stream.ushort;

        if ((b0 + b1) > val) {
          b1 >>= 1;
          if ((b0 + b1) > val) { return 0; }
        } else if (b0 != 1) {
          this.version = 2.01;
        }
      }

      if ((this.sdata + this.ssize) > stream.length) { return 0; }

      if ((stream.ushort >> 1) != this.length) { return 0; }
      stream.position += 2;

      for (i = 0; i < this.length; i++) {
        val = stream.ushort >> 3;
        if (val > 0x3f) { return 0; }
        if (val > this.higher) { this.higher = val; }
      }

      this.higher++;
      this.offsets.length = this.higher;

      for (i = 0; i < this.higher; i++) {
        b0 = i << 2;

        for (j = 3; j >= 0; j--) {
          val = this.tdata + stream.ushort;
          if (val >= this.sdata) { return 0; }
          this.offsets[b0 + j] = val;
        }
      }

      while (stream.position < this.sdata) {
        b0 = stream.ubyte;
        b1 = stream.ubyte;
        b2 = stream.ubyte;

        if (b0 > 0x49) { return 0; }
        val = ((b0 & 0x01) << 4) | ((b1 >> 4) & 0x0f);
        if (val > 0x1f) { return 0; }

        b0 = b1 & 0x0f;

        if (b0 == 0x0a) {
          this.version = 1.0;
        } else if (b0 == 0x0b) {
          if (b2 & 1) { this.version = 1.0; }
        } else if (b0 == 0x0e) {
          if (b2 != 0 && b2 != 2) { this.version = 1.0; }
        }
      }

      this.format = "NoisePacker "+ this.version.toFixed(2);
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 10) + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.length = 0;
      this.version = 2;
    };
  }

  window.neoart.Packers.NoisePacker2 = function() {
    return new NoisePacker2();
  }
/* NoisePacker 3.0 by Twins of Phenomena */

  class NoisePacker3 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, i, j, out, val, x;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 8;

      for (i = 0; i < this.samples; i++) {
        out.position += 22;

        val = stream.ushort;
        stream.position += 4;

        out.short = stream.ushort;
        out.short = val;
        stream.position += 4;

        b0 = stream.ushort;
        b1 = stream.ushort;

        out.short = b1;
        out.short = b0;
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      stream.position += 2;
      out.byte = this.length;
      out.byte = stream.ushort >> 1;

      for (i = 0; i < this.length; i++) {
        out.byte = stream.ushort >> 3;
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      for (i = 0; i < this.higher; i++) {
        val = 1084 + (i << 10);

        for (c = 0; c < 4; c++) {
          stream.position = this.offsets[c + (i << 2)];
          x = val + (c << 2);

          for (j = 0; j < 64; j++) {
            b0 = stream.ubyte;

            if (b0 > 0x7f) {
              b0 = 0x100 - b0;
              j += (b0 - 1);
              x += (b0 << 4);
              continue;
            }

            b1 = stream.ubyte;
            b2 = stream.ubyte;
            b3 = (b0 & 0xfe) >> 1;
            b0 = ((b0 << 4) & 0x10) | NOTES[b3][0];

            out.writeAt(x++, b0);
            out.writeAt(x++, NOTES[b3][1]);

            b3 = b1 & 0x0f;

            switch (b3) {
              case 0x07:
                b1 = (b1 & 0xf0) + 0x0a;
              case 0x05:
              case 0x06:
                b2 = (b2 > 0x80) ? 0x100 - b2 : (b2 << 4) & 0xf0;
                break;
              case 0x08:
                b1 -= 8;
                break;
              case 0x0b:
                b2 = (b2 + 4) >> 1;
                break;
              case 0x0e:
                b2 >>= 1;
                break;
            }

            out.writeAt(x++, b1);
            out.writeAt(x++, b2);
            x += 12;
          }
        }
      }

      out.position = this.unpacked - this.ssize;
      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, b1, b2, i, j, val;

      this.reset();
      stream.position = 0;

      b0 = stream.ushort;
      b1 = stream.ushort;
      b2 = stream.ushort;

      this.samples = (b0 - 0x0c) >> 4;
      this.length = b1 >> 1;
      this.tdata = b0 + b1 + b2;
      this.sdata = this.tdata + stream.ushort;

      if (this.length > 0x7f || this.sdata >= stream.length) { return 0; }

      for (i = 0; i < this.samples; i++) {
        stream.position++;
        if (stream.ubyte > 0x40) { return 0; }

        stream.position += 4;
        val = stream.ushort;
        this.ssize += (val << 1);

        stream.position += 4;
        b0 = stream.ushort;
        b1 = stream.ushort;

        if ((b0 + b1) > val) { return 0; }
      }

      if ((this.sdata + this.ssize) > stream.length) { return 0; }

      if ((stream.ushort >> 1) != this.length) { return 0; }
      stream.position += 2;

      for (i = 0; i < this.length; i++) {
        val = stream.ushort >> 3;
        if (val > 0x3f) { return 0; }
        if (val > this.higher) { this.higher = val; }
      }

      this.higher++;
      this.offsets.length = this.higher;

      for (i = 0; i < this.higher; i++) {
        b0 = i << 2;

        for (j = 3; j >= 0; j--) {
          val = this.tdata + stream.ushort;
          if (val >= this.sdata) { return 0; }
          this.offsets[b0 + j] = val;
        }
      }

      while (stream.position < this.sdata) {
        b0 = stream.ubyte;
        if (b0 > 0x7f) { continue; }

        b1 = stream.ubyte;
        b2 = stream.ubyte;

        if (b0 > 0x49) { return 0; }
        val = ((b0 & 0x01) << 4) | ((b1 >> 4) & 0x0f);
        if (val > 0x1f) { return 0; }
      }

      this.format = "NoisePacker 3";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 10) + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.length = 0;
    };
  }

  window.neoart.Packers.NoisePacker3 = function() {
    return new NoisePacker3();
  }
/* Novo Trade Packer */

  class NovoTrade extends Packer {
    depack(stream) {
      if (!this.identify(stream)) { return stream; }
      const out = new ByteArray(this.unpacked);

      stream.position = 4;
      const title = stream.readUTF8(16);
      out.writeUTF8(title);

      stream.position = 30;
      for (let i = 0; i < this.samples; i++) {
        const n = stream.ubyte;
        if (n > 30) {
          stream.position += 7;
          continue;
        }
        const volume = stream.ubyte;
        const size = stream.ushort;
        const loopStart = stream.ushort;
        const loopSize = stream.ushort;
        out.position = 20 + 30 * n + 22;
        out.short = size;
        out.byte = 0;
        out.byte = volume;
        out.short = loopStart;
        out.short = loopSize;
      }

      out.position = 950;
      out.byte = this.length;
      out.byte = 0x7f;

      this.tdata = stream.position;
      for (let i = 0; i < this.length; i++) {
        const pattern = stream.ushort;
        if (pattern >= this.patterns)
          return;
        out.byte = pattern;
      }
      for (let i = 0; i < this.length; i++) {
        this.offsets[i] = stream.ushort;
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      for (let i = 0; i < this.patterns; i++) {
        stream.position = this.pdata + this.offsets[i];
        for (let j = 0; j < 64; j++) {
          const data = stream.ushort & 0xf;
          for (let ch = 0; ch < 4; ch++) {
            if (data & (0x1 << ch)) {
              out.int = stream.uint;
            } else {
              out.position += 4;
            }
          }
        }
        out.position = 1084 + (i+1 << 10);
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      this.reset();
      stream.position = 0;
      if (stream.readUTF8(4) !== "MODU") return 0;

      stream.position = 20;
      this.pdata = stream.ushort + 8;
      this.samples = stream.ushort;
      this.length = stream.ushort;
      this.patterns = stream.ushort;
      this.higher = this.patterns;
      if (this.samples > 128 || length > 128) return 0;
      this.sdata = stream.ushort + this.pdata + 4;

      for (let i = 0; i < this.samples; i++) {
        const n = stream.ubyte;
        if (n > 30) {
          stream.positiom += 7;
          continue;
        }
        stream.position += 1;
        this.ssize += stream.ushort << 1;
        stream.position += 4;
      }

      stream.position = this.pdata - 4;
      if (stream.readUTF8(4) !== "BODY") return 0;
      stream.position = this.sdata - 4;
      if (stream.readUTF8(4) !== "SAMP") return 0;

      this.format = "Novo Trade";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.patterns << 10) + this.ssize;

      return 1;
    };

    reset() {
      super.reset();
      this.length = 0;
      this.patterns = 0;
      this.pdata = 0;
    };
  }

  window.neoart.Packers.NovoTrade = function() {
    return new NovoTrade();
  }
/* PhaPacker by Azatoth of Phenomena */

  class PhaPacker extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, counters, i, j, len, out, previous, value;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.short = stream.ushort;

        stream.position += 10;
        out.byte = stream.ushort / 72;

        stream.position -= 11;
        out.byte = stream.ubyte;
        out.int = stream.uint;

        stream.position += 6;
      }

      stream.position = 436;
      out.byte = stream.ushort >> 2;
      out.byte = 0x7f;

      len = this.track.length;

      for (i = 0; i < len; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      len = this.offsets.length;
      previous = new Uint8Array(16);
      counters = new Uint8Array(4);

      for (i = 0; i < len; i++) {
        stream.position = this.offsets[i];
        c = 0;

        for (j = 0; j < 256; j++) {
          if (counters[c]) {
            counters[c]--;
            b0 = c << 2;

            out.byte = previous[b0++];
            out.byte = previous[b0++];
            out.byte = previous[b0++];
            out.byte = previous[b0];
          } else {
            value = stream.ubyte;

            b1 = stream.ubyte >> 1;
            b0 = (value & 0xf0) | NOTES[b1][0];
            b1 = NOTES[b1][1];
            b2 = ((value << 4) & 0xf0) | stream.ubyte;
            b3 = stream.ubyte;

            out.byte = b0;
            out.byte = b1;
            out.byte = b2;
            out.byte = b3;

            value = c << 2;
            previous[value++] = b0;
            previous[value++] = b1;
            previous[value++] = b2;
            previous[value]   = b3;

            if (stream.bytesAvailable) {
              if (stream.ubyte == 0xff) {
                counters[c] = 255 - stream.ubyte;
              } else {
                stream.position--;
              }
            }
          }

          c = (++c & 3);
        }
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, i;

      if (stream.length < 964) { return 0; }

      this.reset();
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        b0 = stream.ushort;
        this.ssize += (b0 << 1);

        stream.position++;
        if (stream.ubyte > 0x40) { return 0; }
        b0++;

        if ((stream.ushort + stream.ushort) > b0) { return 0; }
        if ((stream.uint + b0) > stream.length) { return 0; }
        stream.position += 2;
      }

      this.sdata = 960;
      if ((this.sdata + this.ssize) > stream.length) { return 0; }

      stream.position += 2;
      if ((stream.ushort >> 2) > 0x7f) { return 0; }

      stream.position = 448;

      for (i = 0; i < 128; i++) {
        b0 = stream.uint;

        if (this.offsets.indexOf(b0) < 0) {
          this.offsets.push(b0);
        }
      }

      this.offsets.sort(this.sort);
      stream.position = 448;

      for (i = 0; i < 128; i++) {
        b0 = this.offsets.indexOf(stream.uint);
        if (b0 > this.higher) { this.higher = b0; }
        this.track[i] = b0;
      }

      stream.position = this.offsets[0];

      do {
        b0 = stream.ubyte;

        if (b0 == 0xff) {
          stream.position++;
          continue;
        }

        if (b0 > 0x1f) { return 0; }
        if (stream.ubyte > 0x92) { return 0; }
        stream.position += 2;
      } while (stream.bytesAvailable);

      this.format = "PhaPacker";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (++this.higher << 10) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.PhaPacker = function() {
    return new PhaPacker();
  }
/* Promizer 0.1a/0.2a by Franck Hulsmann aka MC68000 of Masque */

  class Promizer0 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, begin, fine, i, j, len, note, out, sample;

      if (!this.identify(stream)) { return stream; }
      periods("protracker");

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      len = stream.ushort >> 2;
      out.byte = len;
      out.byte = 0x7f;

      for (i = 0; i < 128; i++) {
        out.byte = stream.uint >> 10;
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      stream.position += 4;
      this.higher += 766;
      i = 0;

      do {
        b0 = 0xff - stream.ubyte;
        b1 = 0xff - stream.ubyte;
        b2 = 0xff - stream.ubyte;

        b3 = stream.ubyte;
        b3 = 0xf0 - (b3 & 0xf0) + (b3 & 0x0f);

        sample = (b0 & 0xf0) | (b2 >> 4);
        note = ((b0 & 0x0f) << 8) | b1;

        if (sample == 0) {
          sample = this.voices[i];
        } else {
          this.voices[i] = sample;
        }

        fine = this.tunes[sample - 1];

        if (note != 0 && fine != 0) {
          begin = 37 * fine;

          for (j = begin, len = j + 36; j < len; j++) {
            if (note == PERIODS[j]) {
              note = PERIODS[j - begin];
              break;
            }
          }

          b1 = note & 0x00ff;
          b0 = (b0 & 0xf0) | ((note & 0xff00) >> 8);
        }

        out.byte = b0;
        out.byte = b1;
        out.byte = b2;
        out.byte = b3;

        i = (++i & 3);
      } while (stream.position < this.higher);

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var i, loop, repl, val;

      if (stream.length < 1792) { return 0; }

      this.reset();
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;

        loop = stream.ubyte;
        if (loop > 0x0f) { return 0; }
        this.tunes[i] = loop;

        if (stream.ubyte > 0x40) { return 0; }

        this.ssize += (val << 1);
        if (!val) { val = 1; }

        loop = stream.ushort;
        repl = stream.ushort;

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2 || this.ssize > stream.length) { return 0; }

      stream.position = 248;
      val = stream.ushort >> 2;
      if (val == 0 || val > 0x7f) { return 0; }

      stream.position = 762;
      this.higher = stream.uint;
      if (this.higher == 0) { return 0; }

      this.sdata = stream.position + this.higher;
      if ((this.sdata + this.ssize) > stream.length) { return 0; }

      this.format = "Promizer 0.1";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + this.higher + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.tunes  = new Uint8Array(31);
      this.voices = new Uint8Array(4);
    };
  }

  window.neoart.Packers.Promizer0 = function() {
    return new Promizer0();
  }
/* Promizer 1.0/1.0b/1.0c/1.2a/1.8a by Franck Hulsmann aka MC68000 of Masque */

  class Promizer1 extends Packer {
    depack(stream) {
      var begin, data, end, fine, i, j, len, note, out, sample, size, val;

      if (!this.identify(stream)) { return stream; }
      periods("protracker");

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 8;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      out.byte = stream.ushort >> 2;
      out.byte = 0x7f;

      for (i = 0; i < 128; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      len = this.offsets.length - 1;

      data = new ByteArray(this.higher);
      data.writeBytes(stream, this.tdata, this.higher);

      for (i = 0; i < len;) {
        size = this.offsets[i];
        stream.position = 770 + size;
        size = stream.position + (this.offsets[i + 1] - size);

        do {
          data.position = stream.ushort << 2;
          val = data.int;

          note = (val >> 16) & 0x0fff;
          sample = (val >> 24) & 0xf0 | (val >> 12) & 0x0f;

          fine = this.tunes[sample - 1];

          if (note != 0 && fine != 0) {
            begin = 37 * fine;

            for (j = begin, end = j + 36; j < end; j++) {
              if (note == PERIODS[j]) {
                note = PERIODS[j - begin];
                break;
              }
            }

            val = (val & 0xf000ffff) | (note << 16);
          }

          out.int = val;
        } while (stream.position < size);

        out.position = 1084 + (++i << 10);
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var i, loop, repl, val;

      if (stream.length < 1292) { return 0; }

      this.reset();
      stream.position = 0;

      this.sdata = stream.uint + stream.position;
      if (this.sdata > stream.length) { return 0; }
      this.tdata = stream.uint;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;

        loop = stream.ubyte;
        if (loop > 0x0f) { return 0; }
        this.tunes[i] = loop;

        if (stream.ubyte > 0x40) { return 0; }

        this.ssize += (val << 1);
        loop = stream.ushort;
        repl = stream.ushort;
        if (!val) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2 || (this.sdata + this.ssize) > stream.length) { return 0; }

      stream.position = 256;
      val = stream.ushort >> 2;
      if (val == 0 || val > 0x7f) { return 0; }

      stream.position = 258;

      for (i = 0; i < 128; i++) {
        val = stream.uint;
        if (val == 0xffff) { continue; }
        if (val > this.tdata) { return 0; }

        if (this.offsets.indexOf(val) < 0) {
          this.offsets.push(val);
        }
      }

      this.offsets.sort(this.sort);
      stream.position = 258;
      loop = 0;

      for (i = 0; i < 128; i++) {
        val = stream.uint;

        if (val == 0xffff) {
          this.tracks[i] = 0;
        } else {
          val = this.offsets.indexOf(val);
          if (val > loop) { loop = val; }
          this.track[i] = val;
        }
      }

      this.offsets.push(this.tdata);
      this.tdata += 770;
      stream.position = 770;

      do {
        val = stream.ushort;
        if (val > this.higher) { this.higher = val; }
      } while (stream.position < this.tdata);

      this.higher = (++this.higher << 2);
      if (this.tdata + this.higher > this.sdata) { return 0; }

      this.format = "Promizer 1.0/1.8";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (++loop << 10) + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.tunes  = new Uint8Array(31);
      this.track  = new Uint8Array(128);
      this.voices = new Uint8Array(4);
    };
  }

  window.neoart.Packers.Promizer1 = function() {
    return new Promizer1();
  }
/* Promizer 2.0 by Franck Hulsmann aka MC68000 of Masque */

  class Promizer2 extends Packer {
    depack(stream) {
      var b0, b1, data, i, len, out, size, val;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 260;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.short = stream.ushort;
        out.byte  = stream.ubyte >> 1;
        out.byte  = stream.ubyte;
        out.short = stream.ushort
        out.short = stream.ushort || 1;
      }

      stream.position = 2;
      len = stream.ushort >> 1;

      out.byte = len;
      out.byte = 0x7f;

      this.offsets.sort(this.sort);

      for (i = 0; i < len; i++) {
        val = stream.ushort;

        if (val == 0xffff) {
          ouput.byte = 0;
        } else {
          out.byte = this.offsets.indexOf(val);
        }
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      len = this.sdata - this.tdata;
      data = new ByteArray(len);
      data.writeBytes(stream, this.tdata, len);

      len = this.offsets.length - 1;

      for (i = 0; i < len;) {
        size = this.offsets[i];
        stream.position = 516 + size;
        size = stream.position + (this.offsets[i + 1] - size);

        do {
          data.position = stream.ushort << 2;
          b0 = data.ubyte >> 2;
          b1 = data.ubyte >> 1;

          out.byte = (b0 & 0xf0) | NOTES[b1][0];
          out.byte = NOTES[b1][1];
          out.byte = data.ubyte | ((b0 << 4) & 0xf0);
          out.byte = data.ubyte;
        } while (stream.position < size);

        out.position = 1084 + (++i << 10);
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var i, len, loop, repl, val;

      if (stream.length < 1034) { return; }

      this.reset();
      stream.position = 0;

      this.higher = stream.ushort;
      if (this.higer > 0x7f) { return 0; }

      stream.position = 508;
      this.sdata = stream.uint;
      this.tdata = stream.uint;

      stream.position = 2;
      len = stream.ushort >> 1;

      if ((len << 1) >= stream.length) { return 0; }

      for (i = 0; i < len; i++) {
        val = stream.ushort;
        if (val == 0xffff) { continue; }
        if (val > this.sdata) { return 0; }

        if (this.offsets.indexOf(val) < 0) {
          this.offsets.push(val);
        }
      }

      this.offsets.push(this.tdata - 516);
      stream.position = 260;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;

        if (stream.ubyte > 0x1e) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        this.ssize += (val << 1);
        loop = stream.ushort;
        repl = stream.ushort;
        if (!val) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2 || (this.sdata + this.ssize) > stream.length) { return 0; }

      this.format = "Promizer 2.0";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 10) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.Promizer2 = function() {
    return new Promizer2();
  }
/* ProPacker 1.0 by Estrup of Static Bytes */

  class ProPacker1 extends Packer {
    depack(stream) {
      var c, i, j, len, out, val;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      len = stream.ubyte;
      out.byte = len;
      out.byte = stream.ubyte;

      for (i = 0; i < len; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      for (i = 0; i < this.higher; i++) {
        for (c = 0; c < 4; c++) {
          out.position = 1084 + (i << 10) + (c << 2);

          val = (this.offsets[i] >> (c << 3)) & 0xff;
          stream.position = 762 + (val << 8);

          for (j = 0; j < 64; j++) {
            out.int = stream.uint;
            out.position += 12;
          }
        }
      }

      out.position -= 12;
      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var hsplit = 0;
      var b0, b1, b2, b3, i, len, loop, repl, val;

      if (stream.length < 1022) { return 0; }

      this.reset();
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;

        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        this.ssize += (val << 1);

        loop = stream.ushort;
        repl = stream.ushort;
        if (val == 0) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2) { return 0; }

      len = stream.ubyte;
      if (len == 0 || len > 0x7f || stream.ubyte > 0x7f) { return 0; }

      i = stream.position;

      do {
        b0 = stream.readAt(i++);
        b1 = stream.readAt(i + 127);
        b2 = stream.readAt(i + 255);
        b3 = stream.readAt(i + 383);

        if (b0 > hsplit) { hsplit = b0; }
        if (b1 > hsplit) { hsplit = b1; }
        if (b2 > hsplit) { hsplit = b2; }
        if (b3 > hsplit) { hsplit = b3; }

        val = b0 + (b1 << 8) + (b2 << 16) + (b3 << 24);
        b0 = this.offsets.indexOf(val);

        if (b0 < 0) {
          this.offsets.push(val);
          this.track.push(this.higher++);
        } else {
          this.track.push(b0);
        }
      } while (--len);

      this.sdata = 762 + (++hsplit << 8);
      if ((this.sdata + this.ssize) > stream.length) { return 0; }

      stream.position = 762;
      hsplit <<= 6;
      repl = 0;

      for (i = 0; i < hsplit; i++) {
        val = stream.uint;
        if (val) { repl++; }

        b0 = (val >> 16) & 0x0fff;
        if (b0 > 0x358 || (b0 != 0 && b0 < 0x71)) { return 0; }

        b0 = (val >> 24) & 0xf0;
        if (b0 > 0x10) { return 0; }
      }

      if (repl == 0) { return 0; }

      this.format = "ProPacker 1.0";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 10) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.ProPacker1 = function() {
    return new ProPacker1();
  }
/* ProPacker 2.0/1.2/3.0 by Christian Estrup */

  class ProPacker2 extends Packer {
    depack(stream) {
      var c, i, j, len, out, val;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      len = stream.ubyte;
      out.byte = len;
      out.byte = stream.ubyte;

      for (i = 0; i < len; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      for (i = 0; i < this.higher; i++) {
        for (c = 0; c < 4; c++) {
          out.position = 1084 + (i << 10) + (c << 2);
          val = (this.offsets[i] >> (c << 3)) & 0xff;
          val = 762 + (val << 7);

          for (j = 0; j < 64; j++) {
            stream.position = val;
            len = stream.ushort;
            if (this.version != "3.0") { len <<= 2; }

            stream.position = this.pointer + len;
            val += 2;

            out.int = stream.uint;
            out.position += 12;
          }
        }
      }

      out.position -= 12;
      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var hsplit = 0;
      var b0, b1, b2, b3, i, len, loop, repl, val;

      if (stream.length < 900) { return 0; }

      this.reset();
      stream.position = 0;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;

        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        this.ssize += (val << 1);

        loop = stream.ushort;
        repl = stream.ushort;
        if (val == 0) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2) { return 0; }

      len = stream.ubyte;
      if (len == 0 || len > 0x7f || stream.ubyte > 0x7f) { return 0; }

      i = stream.position;

      do {
        b0 = stream.readAt(i++);
        b1 = stream.readAt(i + 127);
        b2 = stream.readAt(i + 255);
        b3 = stream.readAt(i + 383);

        if (b0 > hsplit) { hsplit = b0; }
        if (b1 > hsplit) { hsplit = b1; }
        if (b2 > hsplit) { hsplit = b2; }
        if (b3 > hsplit) { hsplit = b3; }

        val = b0 + (b1 << 8) + (b2 << 16) + (b3 << 24);
        b0 = this.offsets.indexOf(val);

        if (b0 < 0) {
          this.offsets.push(val);
          this.track.push(this.higher++);
        } else {
          this.track.push(b0);
        }
      } while (--len);

      i = 0;

      do {
        this.pointer = 762 + (++hsplit << 7);
        stream.position = this.pointer;

        len = stream.uint;
        this.sdata = stream.position + len;

        if ((this.sdata + this.ssize) > stream.length) {
          if (i) { return 0; }
          stream.position = 250;
          hsplit = 0;

          for (; i < 512; i++) {
            val = stream.ubyte;
            if (val > hsplit) { hsplit = val; }
          }
        } else {
          break;
        }
      } while (true);

      stream.position = 762;

      while (stream.position < this.pointer) {
        b0 = stream.ushort << 2;

        if (b0 >= len) {
          b0 >>= 2;
          if (b0 >= len) { return 0; }
          this.version = "3.0";
        }
      }

      this.pointer += 4;
      stream.position = this.pointer;
      len >>= 2;
      repl = 0;

      for (i = 0; i < len; i++) {
        val = stream.uint;
        if (val) { repl++; }

        b0 = (val >> 16) & 0x0fff;
        if (b0 > 0x358 || (b0 != 0 && b0 < 0x71)) { return 0; }

        b0 = (val >> 24) & 0xf0;
        if (b0 > 0x10) { return 0; }
      }

      if (repl == 0) { return 0; }

      this.format = "ProPacker "+ this.version;
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 10) + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.pointer = 0;
      this.version = "2.0/2.1";
    };
  }

  window.neoart.Packers.ProPacker2 = function() {
    return new ProPacker2();
  }
/* ProRunner 1.0 by Cosmos of Sanity */

  class ProRunner1 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, i;

      if (!this.identify(stream)) { return stream; }

      stream.position = 1084;
      this.higher <<= 8;

      for (i = 0; i < this.higher; i++) {
        b0 = stream.ubyte;
        b1 = stream.ubyte;
        b2 = stream.ubyte;

        b3 = (b0 & 0xf0) | NOTES[b1][0];
        b2 = ((b0 & 0x0f) << 4) | b2;
        b1 = NOTES[b1][1];

        stream.position -= 3;
        stream.byte = b3;
        stream.byte = b1;
        stream.byte = b2;

        stream.position++;
      }

      stream.position = 1080;
      stream.writeUTF8(MAGIC);
      stream.endian = false;
      return stream;
    };

    identify(stream) {
      var i, id, val;

      if (stream.length < 2110) { return 0; }

      this.reset();
      stream.position = 42;

      for (i = 0; i < 31; i++) {
        this.ssize += (stream.ushort << 1);
        stream.position += 28;
      }

      if (this.ssize < 2) { return 0; }
      stream.position = 950;

      if (stream.ubyte > 0x7f) { return 0; }
      if (stream.ubyte > 0x7f) { return 0; }

      for (i = 0; i < 128; i++) {
        val = stream.ubyte;
        if (val > this.higher) { this.higher = val; }
      }

      id = stream.readUTF8(4);
      if (id != "SNT." && id != "+SNT" && id != "KURT") { return 0; }

      this.ssize = 1084 + (++this.higher << 10) + this.ssize;
      if (stream.length < this.ssize) { return 0; }

      this.format = "ProRunner1";
      this.packed = stream.length;
      this.unpacked = this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.ProRunner1 = function() {
    return new ProRunner1();
  }
/* ProRunner 2.0 by Cosmos of Sanity */

  class ProRunner2 extends Packer {
    depack(stream) {
      var j = 0;
      var b0, b1, b2, b3, i, out, row, val;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.position = 20;
      stream.position = 8;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      out.writeBytes(stream, stream.position, 130);
      out.writeUTF8(MAGIC);

      stream.position = 770;
      row = new ByteArray(16);
      this.higher <<= 8;

      for (i = 0; i < this.higher; i++) {
        val = stream.ubyte;

        if (val == 0x80) {
          out.int = 0;
        } else if (val == 0xc0) {
          out.writeBytes(row, j, 4);
        } else {
          b1 = stream.ubyte;

          b3 = val >> 1;
          if (b3 > 36) { b3 = 0; }
          b0 = ((b1 & 0x80) >> 3) | NOTES[b3][0];
          b2 = ((b1 & 0x70) << 1) | ((val & 0x01) << 4) | (b1 & 0x0f);
          b1 = NOTES[b3][1];

          out.byte = b0;
          out.byte = b1;
          out.byte = b2;

          b3 = stream.ubyte;
          out.byte = b3;

          row.writeAt(j, b0);
          row.writeAt(j + 1, b1);
          row.writeAt(j + 2, b2);
          row.writeAt(j + 3, b3);
        }

        j = (j + 4) & 15;
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var i, val;

      if (stream.length < 836) { return 0; }

      this.reset();
      stream.position = 0;

      if (stream.readUTF8(4) != "SNT!") { return 0; }

      this.sdata = stream.uint;
      if (this.sdata >= stream.length) { return 0; }

      for (i = 0; i < 31; i++) {
        this.ssize += (stream.ushort << 1);

        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        stream.position += 2;
        if (stream.ushort == 0) { return 0; }
      }

      if (this.ssize < 2 || this.ssize > stream.length) { return 0; }

      stream.position = 256;
      if (stream.ubyte > 0x7f) { return 0; }
      if (stream.ubyte > 0x7f) { return 0; }

      for (i = 0; i < 128; i++) {
        val = stream.ubyte;
        if (val > this.higher) { this.higher = val; }
      }

      this.format = "ProRunner 2";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (++this.higher << 10) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.ProRunner2 = function() {
    return new ProRunner2();
  }
/* StarTrekker Packer by Mr. Spiv of Cave */

  class StarTrekkerPacker extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, i, len, out, val;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.writeBytes(stream, 0, 20);
      stream.position = 20;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        out.int = stream.uint;
        out.int = stream.uint;
      }

      len = stream.ushort >> 2;
      out.byte = len;
      stream.position += 2;

      this.offsets.sort(this.sort);
      out.position++;

      for (i = 0; i < len; i++) {
        val = stream.uint;
        out.byte = this.offsets.indexOf(val);
      }

      stream.position = 270;
      val = stream.ushort >> 2;
      out.writeAt(951, val);

      out.position = 1080;
      out.writeUTF8((val == 0x7f) ? MAGIC : "FLT4");

      stream.position = 788;
      len = this.offsets.length << 8;

      for (i = 0; i < len; i++) {
        val = stream.ubyte;

        if (val != 0x80) {
          b1 = stream.ubyte;
          b2 = stream.ubyte;
          b3 = stream.ubyte;

          b0 = ((val & 0xf0) | ((b2 >> 4) & 0x0f)) >> 2;

          out.byte = (b0 & 0xf0) | (val & 0x0f);
          out.byte = b1;
          out.byte = ((b0 << 4) & 0xf0) | (b2 & 0x0f);
          out.byte = b3;
        } else {
          out.int = 0;
        }
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, b1, b2, i, len, val;

      if (stream.length < 796) { return 0; }

      this.reset();
      stream.position = 20;

      for (i = 0; i < 31; i++) {
        val = stream.ushort;
        stream.position++;

        if (stream.ubyte > 0x40) { return 0; }

        b0 = stream.ushort;
        b1 = stream.ushort;
        if (!b0 && (b1 == 0)) { return 0; }

        if (val && ((b0 + b1) > val)) { return 0; }
        this.ssize += (val << 1);
      }

      len = stream.ushort >> 2;
      if (this.ssize < 2 || len > 0x7f) { return 0; }
      stream.position += 2;

      for (i = 0; i < len; i++) {
        val = stream.uint;
        if ((788 + val + this.ssize) > stream.length) { return 0; }

        if (this.offsets.indexOf(val) < 0) {
          this.offsets.push(val);
        }
      }

      stream.position = 784;
      len = stream.uint;

      this.sdata = len + stream.position;
      if ((this.sdata + this.ssize) > stream.length) { return 0; }

      len >>= 2;

      for (i = 0; i < len; i++) {
        val = stream.ubyte;
        if (val == 0x80) { continue; }

        b1 = stream.ubyte;
        b2 = stream.ubyte;
        stream.position++;

        b0 = ((val & 0x0f) << 8) | b1;
        if (b0 > 0x358 || (b0 != 0 && b0 < 0x71)) { return 0; }

        b0 = ((val & 0xf0) | ((b2 >> 4) & 0x0f)) >> 2;
        if (b0 > 0x1f) { return 0; }
      }

      this.format = "StarTrekker Packer";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.offsets.length << 10) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.StarTrekkerPacker = function() {
    return new StarTrekkerPacker();
  }
/* The Player 4.0a/b/4.1a by Jarno Paananen aka Guru of Sahara Surfers */

  const TP40 = "P40A";
  const TP41 = "P40B";
  const TP42 = "P41A";

  class ThePlayer4 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, i, j, len, out, pos, r, sample, size, skip, value;

      if (!this.identify(stream)) { return stream; }
      out = new ByteArray(this.unpacked);

      out.position = 20;

      for (i = 0; i < this.samples; i++) {
        sample = this.instr[i];
        out.position += 22;

        out.short = sample.size;
        out.byte  = sample.fine / 74;
        out.byte  = sample.volume;
        out.short = (sample.loop - sample.offset) >> 1;
        out.short = sample.repeat;
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      out.byte = this.patterns;
      out.byte = 0x7f;

      for (i = 0; i < this.patterns; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      this.patterns = (this.offsets.length >> 2) - 1;

      for (i = 0; i < this.patterns; i++) {
        for (c = 0; c < 4; c++) {
          r = c + (i << 2);
          pos = this.pdata + this.offsets[r];
          len = this.pdata + this.offsets[r + 4];

          stream.position = pos;
          out.position = 1084 + (i << 10) + (c << 2);
          const next = out.position + 1024;

          do {
            j = 0;

            do {
              size = 1;
              b0 = stream.ubyte;
              b1 = stream.ubyte;
              b2 = stream.ubyte;
              b3 = stream.ubyte;

              if (b0 & 0x80) {
                j = b1 + 2;
                value = stream.position;
                stream.position = this.pdata + ((b2 << 8) + b3);
                continue;
              }

              if (b3 > 0x7f) {
                size = 257 - b3;
              } else if (b3) {
                skip = b3;
              }

              b3 = b1 & 0x0f;

              if (b3 == 0x05 || b3 == 0x06 || b3 == 0x0a) {
                if (b2 > 0x7f) {
                  b2 = ((256 - b2) << 4) & 0xf0;
                }
              } else if (b3 == 0x08) {
                b1 -= 8;
              } else if (b3 == 0x0e) {
                if (b2 == 2) { b2 = 1; }
              }

              b3 = b0 >> 1;
              b0 = ((b0 << 4) & 0x10) | NOTES[b3][0];
              b3 = NOTES[b3][1];

              for (r = 0; r < size; r++) {
                out.byte = b0;
                out.byte = b3;
                out.byte = b1;
                out.byte = b2;
                out.position += 12;
              }
              if (out.position >= next) {
                skip = j = 0;
                value = len;
              }

              if (skip) {
                out.position += (skip << 4);
                skip = 0;
              }
            } while (--j > 0);

            if (value) {
              stream.position = value;
              value = 0;
            }
          } while (stream.position < len);
        }
      }

      out.position = this.higher;
      out.writeBytes(stream, this.sdata, this.ssize);

      out.position = 890;
      out.writeUTF8(this.format);
      out.position = 920;
      out.writeUTF8("(C) 1992-93 Guru/S2");

      out.endian = false;
      return out;
    };

    identify(stream) {
      var temp = [[], [], [], []];
      var b0, b1, b2, b3, i, sample;

      this.reset();
      stream.position = 0;

      this.id = stream.readUTF8(4);
      if (this.id != TP40 && this.id != TP41 && this.id != TP42) { return 0; }

      if (stream.ubyte > 0x63) { return 0; }

      this.patterns = stream.ubyte;
      this.samples  = stream.ubyte;

      if (!this.patterns || this.patterns > 0x63 || !this.samples) { return 0; }

      stream.position++;
      this.pdata = stream.uint + 4;
      this.tdata = stream.uint + 4;
      this.sdata = stream.uint + 4;

      if (this.sdata >= stream.length || this.tdata >= this.sdata || this.pdata >= this.sdata) { return 0; }

      for (i = 0; i < this.samples; i++) {
        b0 = stream.uint;

        if ((this.sdata + b0) == stream.length) {
          this.samples = i;
          break;
        }

        sample = Object.create(null);
        sample.offset = b0;
        sample.size   = stream.ushort;
        sample.loop   = stream.uint;
        sample.repeat = stream.ushort;

        if (this.id == TP42) {
          sample.volume = stream.ushort;
          sample.fine = stream.ushort;
        } else {
          sample.fine = stream.ushort;
          sample.volume = stream.ushort;
        }

        if (sample.volume > 64) { return 0; }
        if (sample.fine > 0x456) { sample.fine = 0; }

        if (b0 == this.ssize) {
          this.ssize += (sample.size << 1);
        }

        this.instr[i] = sample;
      }

      if ((this.sdata + this.ssize) > stream.length) { return 0; }
      stream.position = this.tdata;

      for (i = 0; i < this.patterns; i++) {
        b0 = stream.ushort;
        if ((this.tdata + b0) >= this.sdata) { return 0; }

        this.track.push(b0);
        b1 = temp[0].indexOf(b0);

        if (b1 < 0) {
          temp[0].push(b0);
          temp[1].push(stream.ushort);
          temp[2].push(stream.ushort);
          temp[3].push(stream.ushort);
        } else {
          stream.position += 6;
        }
      }

      if (stream.ushort != 0xffff) { return 0; }

      temp[0].sort(this.sort);
      temp[1].sort(this.sort);
      temp[2].sort(this.sort);
      temp[3].sort(this.sort);

      for (i = 0; i < this.patterns; i++) {
        b0 = temp[0].indexOf(this.track[i]);
        if (b0 > this.higher) { this.higher = b0; }
        this.track[i] = b0;
      }

      for (i = 0; i < temp[0].length; i++) {
        this.offsets.push(temp[0][i]);
        this.offsets.push(temp[1][i]);
        this.offsets.push(temp[2][i]);
        this.offsets.push(temp[3][i]);
      }

      this.offsets.push(this.offsets[1]);
      this.offsets.push(this.offsets[2]);
      this.offsets.push(this.offsets[3]);
      this.offsets.push(this.sdata - this.pdata);

      stream.position = this.pdata;

      do {
        b0 = stream.ubyte;
        b1 = stream.ubyte;
        b2 = stream.ubyte;
        b3 = stream.ubyte;

        if (b0 & 0x80) {
          if ((this.pdata + ((b2 << 8) + b3)) < this.pdata) { return 0; }
          continue;
        }

        if (b0 > 0x49) { return 0; }
        b2 = ((b0 << 4) & 0x10) | ((b1 >> 4) & 0x0f);
        if (b2 > this.samples) { return 0; }
      } while (stream.position < this.sdata);

      this.higher = 1084 + (++this.higher << 10);

      if (this.id == TP40) {
        this.format = "4.0a";
      } else if (this.id == TP41) {
        this.format = "4.0b";
      } else {
        this.format = "4.1a";
      }

      this.format = "The Player "+ this.format;
      this.packed = this.sdata + this.ssize;
      this.unpacked = this.higher + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.id       = "";
      this.instr    = [];
      this.patterns = 0;
      this.pdata    = 0;
    };
  }

  window.neoart.Packers.ThePlayer4 = function() {
    return new ThePlayer4();
  }
/* The Player 5.0a/6.0a by Jarno Paananen aka Guru of Sahara Surfers */

  const TP50 = "P50A";
  const TP60 = "P60A";

  class ThePlayer56 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, i, j, len, out, pos, r, sample, size, skip, value;

      if (!this.identify(stream)) { return stream; }
      out = new ByteArray(this.unpacked);

      out.position = 20;
      stream.position = this.headers;

      for (i = 0; i < this.samples; i++) {
        sample = this.instr[i];
        out.position += 22;
        out.short = sample.length;

        stream.position += 2;
        out.byte = stream.ubyte & 0x0f;
        out.byte = stream.ubyte;

        b0 = stream.ushort;

        if (b0 == 0xffff) {
          out.short = 0;
          out.short = 1;
        } else {
          out.short = b0;
          out.short = sample.length - b0;
        }
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      out.byte = this.track.length;
      out.byte = 0x7f;

      len = this.track.length;

      for (i = 0; i < len; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      stream.position = this.tdata;
      len = this.patterns << 2;

      for (i = 0; i < len; i++) {
        this.offsets[i] = stream.ushort;
      }

      this.offsets.push(this.offsets[1]);
      this.offsets.push(this.offsets[2]);
      this.offsets.push(this.offsets[3]);
      this.offsets.push(this.sdata - this.pdata);

      for (i = 0; i < this.patterns; i++) {
        for (c = 0; c < 4; c++) {
          r = c + (i << 2);
          pos = this.pdata + this.offsets[r];
          len = this.pdata + this.offsets[r + 4];

          stream.position = pos;
          out.position = 1084 + (i << 10) + (c << 2);

          do {
            j = 0;

            do {
              size = 1;
              b0 = stream.ubyte;
              b1 = stream.ubyte;
              b2 = stream.ubyte;

              if (b0 == 0x80) {
                j = b1 + 2;
                b3 = stream.ubyte;
                value = stream.position;
                stream.position -= ((b2 << 8) + b3);
                continue;
              }

              if (b0 > 0x7f) {
                b0 = 255 - b0;
                b3 = stream.ubyte;

                if (b3 > 0x7f) {
                  size = 257 - b3;
                } else {
                  skip = b3;
                }
              }

              b3 = b1 & 0x0f;

              if (b3 == 0x05 || b3 == 0x06 || b3 == 0x0a) {
                if (b2 > 0x7f) {
                  b2 = ((256 - b2) << 4) & 0xf0;
                }
              } else if (b3 == 0x08) {
                b1 -= 8;
              } else if (b3 == 0x0e) {
                if (b2 == 2) { b2 = 1; }
              }

              b3 = b0 >> 1;
              b0 = ((b0 << 4) & 0x10) | NOTES[b3][0];
              b3 = NOTES[b3][1];

              for (r = 0; r < size; r++) {
                out.byte = b0;
                out.byte = b3;
                out.byte = b1;
                out.byte = b2;
                out.position += 12;
              }

              if (skip) {
                out.position += (skip << 4);
                skip = 0;
              }
            } while (--j > 0);

            if (value) {
              stream.position = value;
              value = 0;
            }
          } while (stream.position < len);
        }
      }

      out.position = this.higher;

      if (this.delta == 1) {
        for (i = 0; i < this.samples; i++) {
          sample = this.instr[i];
          stream.position = sample.offset;
          len = sample.size;

          r = stream.ubyte;
          out.byte = r;

          for (j = 1; j < len; j++) {
            r -= stream.ubyte;
            out.byte = r;
          }
        }
      } else if (this.delta == 2) {
        for (i = 0; i < this.samples; i++) {
          sample = this.instr[i];

          if (sample.packed) {
            len = sample.length;
            r = 0;

            for (j = 0; j < len; j++) {
              c = stream.ubyte;
              r -= TABLE[c >> 4];
              out.byte = r;
              r -= TABLE[c & 0x0f];
              out.byte = r;
            }
          } else {
            out.writeBytes(stream, sample.offset, sample.size);
          }
        }
      } else {
        for (i = 0; i < this.samples; i++) {
          sample = this.instr[i];
          out.writeBytes(stream, sample.offset, sample.size);
        }
      }

      out.position = 890;
      out.writeUTF8(this.format);
      out.position = 920;
      out.writeUTF8("(C) 1992-94 Guru/S2");

      out.endian = false;
      return out;
    };

    identify(stream) {
      var size = 0;
      var b0, b1, b2, b3, i, pos, sample;

      this.reset();
      stream.position = 0;

      this.id = stream.readUTF8(4);

      if (this.id != TP50 && this.id != TP60) {
        this.id = TP50;
        stream.position = 0;
      }

      this.sdata = stream.position + stream.ushort;
      this.patterns = stream.ubyte;
      this.samples = stream.ubyte;

      if (this.samples & 0x80) {
        this.delta = 1;
      } else if (this.samples & 0x40) {
        this.delta = 2;
        stream.position += 4;
      }

      this.samples &= 0x3f;

      if (!this.patterns || this.patterns > 0x63 || !this.samples || this.samples > 31 || this.sdata >= stream.length) { return 0; }

      this.headers = stream.position;

      for (i = 0; i < this.samples; i++) {
        sample = Object.create(null);

        b0 = stream.ushort;
        sample.length = b0;
        sample.size   = b0 << 1;

        b0 = stream.ubyte;
        sample.packed = b0 & 0x80;

        if (sample.length > 0xff00) {
          sample = this.instr[0xffff - sample.length];
        } else {
          sample.offset = this.sdata + size;
          size += (sample.packed) ? sample.length : sample.size;
        }

        this.ssize += sample.size;
        this.instr[i] = sample;
        stream.position += 3;
      }

      if ((this.sdata + size) > stream.length) { return 0; }

      this.tdata = stream.position;
      pos = this.patterns << 2;

      for (i = 0; i < pos; i++) {
        if ((this.tdata + stream.ushort) > this.sdata) { return 0; }
      }

      pos = stream.position;

      for (i = 0; i < 128; i++) {
        b0 = stream.ubyte;
        if (b0 == 0xff) { break; }

        if (b0 & 1) {
          this.id = TP60;
          break;
        }
      }

      stream.position = pos;

      for (i = 0; i < 128; i++) {
        b0 = stream.ubyte;
        if (b0 == 0xff) { break; }
        if (this.id == TP50) { b0 >>= 1; }

        if (b0 > 0x63) { return 0; }
        if (b0 > this.higher) { this.higher = b0; }
        this.track.push(b0);
      }

      this.pdata = stream.position;

      do {
        b0 = stream.ubyte;
        b1 = stream.ubyte;
        b2 = stream.ubyte;

        if (b0 > 0x7f) {
          b3 = stream.ubyte;
          if (b0 == 0x80 && (stream.position - ((b2 << 8) + b3)) < pos) { return 0; }
          continue;
        }

        if (b0 > 0x49) { return 0; }
        b2 = ((b0 << 4) & 0x10) | ((b1 >> 4) & 0x0f);
        if (b2 > this.samples) { return 0; }
      } while (stream.position < this.sdata);

      this.higher = 1084 + (++this.higher << 10);

      if (this.id == TP50) {
        this.format = "5.0a";
      } else {
        this.format = "6.0a";
      }

      this.format = "The Player "+ this.format;
      this.packed = this.sdata + size;
      this.unpacked = this.higher + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.delta    = 0;
      this.headers  = 0;
      this.id       = "";
      this.instr    = [];
      this.patterns = 0;
      this.pdata    = 0;
    };
  }

  window.neoart.Packers.ThePlayer56 = function() {
    return new ThePlayer56();
  }
/* The Player 6.1a by Jarno Paananen aka Guru of Sahara Surfers */

  class ThePlayer61 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, fx, i, j, len, out, pos, r, sample, size, skip, value;

      if (!this.identify(stream)) { return stream; }
      out = new ByteArray(this.unpacked);

      out.position = 20;
      stream.position = this.headers;

      for (i = 0; i < this.samples; i++) {
        sample = this.instr[i];
        out.position += 22;
        out.short = sample.length;

        stream.position += 2;
        out.byte = stream.ubyte & 0x0f;
        out.byte = stream.ubyte;

        b0 = stream.ushort;

        if (b0 == 0xffff) {
          out.short = 0;
          out.short = 1;
        } else {
          out.short = b0;
          out.short = sample.length - b0;
        }
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      out.byte = this.track.length;
      out.byte = 0x7f;

      len = this.track.length;

      for (i = 0; i < len; i++) {
        out.byte = this.track[i];
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      stream.position = this.tdata;
      len = this.patterns << 2;

      for (i = 0; i < len; i++) {
        this.offsets[i] = stream.ushort;
      }

      this.offsets.push(this.offsets[1]);
      this.offsets.push(this.offsets[2]);
      this.offsets.push(this.offsets[3]);
      this.offsets.push(this.sdata - this.pdata);

      stream.position = this.pdata;

      for (i = 0; i < this.patterns; i++) {
        for (c = 0; c < 4; c++) {
          r = c + (i << 2);
          pos = this.pdata + this.offsets[r];
          len = this.pdata + this.offsets[r + 4];

          stream.position = pos;
          out.position = 1084 + (i << 10) + (c << 2);

          do {
            j = 0;

            do {
              size = 1;
              b0 = stream.ubyte;

              if (b0 == 0x7f) {
                out.position += 16;
                break;
              }

              fx = b0;
              b1 = stream.ubyte;

              if (b0 == 0xff) {
                if (b1 & 0x40 || b1 & 0x80) {
                  if (b1 & 0x80) {
                    b2 = stream.ushort;
                    j = b1 - 0xbe;
                  } else {
                    b2 = stream.ubyte;
                    j = b1 - 0x3e;
                  }

                  value = stream.position;
                  stream.position -= b2;
                } else {
                  b1++;
                  out.position += (b1 << 4);
                }

                continue;
              }

              if ((b0 & 0x70) == 0x70) {
                b3 = (((b0 << 4) & 0xf0) | ((b1 >> 4) & 0x0e)) >> 1;
                b0 = (b1 & 0x10) | NOTES[b3][0];
                b3 = NOTES[b3][1];
                b1 = (b1 << 4) & 0xf0;
                b2 = 0;
              } else if ((b0 & 0x60) == 0x60) {
                b2 = b1;
                b1 = b0 & 0x0f;
                b0 = b3 = 0;
              } else {
                b2 = stream.ubyte;
                b3 = (b0 & 0x7f) >> 1;
                b0 = ((b0 << 4) & 0x10) | NOTES[b3][0];
                b3 = NOTES[b3][1];
              }

              if (fx > 0x7f) {
                fx = stream.ubyte;

                if (fx > 0x7f) {
                  size = fx - 0x7f;
                } else {
                  skip = fx;
                }
              }

              fx = b1 & 0x0f;

              if (fx == 0x05 || fx == 0x06 || fx == 0x0a) {
                if (b2 > 0x7f) {
                  b2 = ((256 - b2) << 4) & 0xf0;
                }
              } else if (fx == 0x08) {
                b1 -= 8;
              } else if (fx == 0x0e) {
                if (b2 == 2) { b2 = 1; }
              }

              for (r = 0; r < size; r++) {
                out.byte = b0;
                out.byte = b3;
                out.byte = b1;
                out.byte = b2;
                out.position += 12;
              }

              if (skip) {
                out.position += (skip << 4);
                skip = 0;
              }
            } while (--j > 0);

            if (value) {
              stream.position = value;
              value = 0;
            }
          } while (stream.position < len);
        }
      }

      out.position = this.higher;

      if (this.delta == 1) {
        for (i = 0; i < this.samples; i++) {
          sample = this.instr[i];
          stream.position = sample.offset;
          len = sample.size;

          r = stream.ubyte;
          out.byte = r;

          for (j = 1; j < len; j++) {
            r -= stream.ubyte;
            out.byte = r;
          }
        }
      } else if (this.delta == 2) {
        for (i = 0; i < this.samples; i++) {
          sample = this.instr[i];

          if (sample.packed) {
            len = sample.length;
            r = 0;

            for (j = 0; j < len; j++) {
              c = stream.ubyte;
              r -= TABLE[c >> 4];
              out.byte = r;
              r -= TABLE[c & 0x0f];
              out.byte = r;
            }
          } else {
            out.writeBytes(stream, sample.offset, sample.size);
          }
        }
      } else {
        for (i = 0; i < this.samples; i++) {
          sample = this.instr[i];
          out.writeBytes(stream, sample.offset, sample.size);
        }
      }

      out.position = 890;
      out.writeUTF8(this.format);
      out.position = 920;
      out.writeUTF8("(C) 1992-95 Guru/S2");

      out.endian = false;
      return out;
    };

    identify(stream) {
      var size = 0;
      var b0, b1, b2, b3, i, pos, sample;

      this.reset();
      stream.position = 0;

      if (stream.readUTF8(4) != "P61A") { stream.position = 0; }

      this.sdata = stream.ushort;
      this.patterns = stream.ubyte;
      this.samples = stream.ubyte;

      if (this.samples & 0x80) {
        this.delta = 1;
      } else if (this.samples & 0x40) {
        this.delta = 2;
        stream.position += 4;
      }

      this.samples &= 0x3f;

      if (!this.patterns || this.patterns > 0x63 || !this.samples || this.samples > 31 || this.sdata >= stream.length) { return 0; }

      this.headers = stream.position;

      for (i = 0; i < this.samples; i++) {
        sample = Object.create(null);

        b0 = stream.ushort;
        sample.length = b0;
        sample.size   = b0 << 1;

        b0 = stream.ubyte;
        sample.packed = b0 & 0x80;

        if (sample.length > 0xff00) {
          sample = this.instr[0xffff - sample.length];
        } else {
          sample.offset = this.sdata + size;
          size += (sample.packed) ? sample.length : sample.size;
        }

        this.ssize += sample.size;
        this.instr[i] = sample;
        stream.position += 3;
      }

      if ((this.sdata + size) > stream.length) { return 0; }

      this.tdata = stream.position;
      pos = this.patterns << 2;

      for (i = 0; i < pos; i++) {
        if ((this.tdata + stream.ushort) > this.sdata) { return 0; }
      }

      pos = stream.position;

      for (i = 0; i < 128; i++) {
        b0 = stream.ubyte;
        if (b0 == 0xff) { break; }

        if (b0 > 0x63) { return 0; }
        if (b0 > this.higher) { this.higher = b0; }
        this.track.push(b0);
      }

      this.pdata = stream.position;

      do {
        b0 = stream.ubyte;
        if (b0 == 0x7f) { continue; }
        b3 = b0;
        b1 = stream.ubyte;

        if (b0 == 0xff) {
          if (b1 & 0x80) {
            b2 = stream.ushort;
            if ((stream.position - b2) < this.tdata) { return 0; }
          } else if (b1 & 0x40) {
            b2 = stream.ubyte;
            if ((stream.position - b2) < this.tdata) { return 0; }
          }

          continue;
        }

        if ((b0 & 0x70) == 0x70) {
          if (((((b0 << 4) & 0xf0) | ((b1 >> 4) & 0x0e)) >> 1) > 0x49) { return 0; }
          b1 =  ((b0 << 4) & 0x10) | ((b1 >> 4) & 0x0f);
        } else if ((b0 & 0x60) == 0x60) {
          b0 = 0;
          b1 = 0;
        } else {
          if (((b0 & 0x7f) >> 1) > 0x49) { return 0; }
          b1 = ((b0 << 4) & 0x10) | ((b1 >> 4) & 0x0f);
          stream.position++;
        }

        if (b1 > 0x1f) { return 0; }

        if (b3 > 0x7f) {
          b3 = stream.ubyte;
          if (b3 > 0x7f) { b3 -= 0x7f; }
          if (b3 > 0x40) { return 0; }
        }
      } while (stream.position < this.sdata);

      this.higher = 1084 + (++this.higher << 10);

      this.format = "The Player 6.1a";
      this.packed = this.sdata + size;
      this.unpacked = this.higher + this.ssize;
      return 1;
    };

    reset() {
      super.reset();
      this.delta    = 0;
      this.headers  = 0;
      this.id       = "";
      this.instr    = [];
      this.patterns = 0;
      this.pdata    = 0;
    };
  }

  window.neoart.Packers.ThePlayer61 = function() {
    return new ThePlayer61();
  }
/* TrackerPacker 1.0 by Crazy Crack of Complex */

  class TrackerPacker1 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, i, len, out, val;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.writeBytes(stream, 8, 20);
      stream.position = 32;

      for (i = 0; i < 31; i++) {
        out.position += 22;
        val = stream.ushort;

        out.short = stream.ushort;
        out.short = val;
        out.int = stream.uint;
      }

      val = stream.ubyte;
      len = stream.ubyte + 1;

      out.byte = len;
      out.byte = (val != 0) ? val : 0x7f;

      this.offsets.sort(this.sort);

      for (i = 0; i < len; i++) {
        out.byte = this.offsets.indexOf(stream.uint);
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      stream.position = 794;
      len = this.sdata - 1;

      do {
        b0 = stream.ubyte;

        if (b0 == 0xc0) {
          out.position += 4;
        } else if ((b0 & 0xc0) == 0x80) {
          out.position += 2;
          out.byte = (b0 >> 2) & 0x0f;
          out.byte = stream.ubyte;
        } else {
          b2 = stream.ubyte;
          b3 = stream.ubyte;

          b1 = (b0 & 0xfe) >> 1;
          b0 = ((b2 >> 4) & 0x0f) | ((b0 << 4) & 0x10);
          b2 &= 0x0f;

          out.byte = (b0 & 0xf0) | NOTES[b1][0];
          out.byte = NOTES[b1][1];
          out.byte = ((b0 << 4) & 0xf0) | b2;
          out.byte = b3;
        }
      } while (stream.position < len);

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, i, len, loop, repl, size, val;

      this.reset();
      stream.position = 0;

      if (stream.readUTF8(4) != "MEXX") { return 0; }

      size = stream.uint;
      if (stream.length < size) { return 0; }

      stream.position = 28;
      this.sdata = stream.uint;

      for (i = 0; i < 31; i++) {
        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        val = stream.ushort;
        this.ssize += (val << 1);

        loop = stream.ushort;
        repl = stream.ushort;
        if (val == 0) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2 || stream.ubyte > 0x7f) { return 0; }

      len = stream.ubyte;
      if (len == 0 || ++len > 0x7f) { return 0; }

      for (i = 0; i < len; i++) {
        val = stream.uint;

        if (this.offsets.indexOf(val) < 0) {
          this.offsets.push(val);
        }
      }

      stream.position = 794;
      len = this.sdata + 1;

      do {
        b0 = stream.ubyte;
        if (b0 == 0xc0) { continue; }

        if ((b0 & 0xc0) == 0x80) {
          stream.position++;
          continue;
        }

        b0 = (b0 & 0xfe) >> 1;
        if (b0 > 36) { return 0; }

        stream.position += 2;
      } while (stream.position < len);

      this.format = "TrackerPacker 1.0";
      this.packed = size;
      this.unpacked = 1084 + (this.offsets.length << 10) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.TrackerPacker1 = function() {
    return new TrackerPacker1();
  }
/* TrackerPacker 2.0 by Crazy Crack of Complex */

  class TrackerPacker2 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, data, i, j, len, out, rows, val, x;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.writeBytes(stream, 8, 20);
      stream.position = 30;

      for (i = 0; i < this.samples; i++) {
        out.position += 22;
        val = stream.ushort;

        out.short = stream.ushort;
        out.short = val;
        out.int = stream.uint;
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      len = stream.ushort;
      out.byte = len;
      out.byte = 0x7f;

      this.offsets.sort(this.sort);

      for (i = 0; i < len; i++) {
        out.byte = this.offsets[this.offsets.indexOf(stream.ushort >> 3)];
      }

      for (i = 0; i < this.higher; i += 2) {
        this.track.push(stream.ushort);
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      stream.position = this.tdata;
      data = new ByteArray(1024);
      len = this.higher >> 3;

      for (i = 0; i < len; i++) {
        data.fill(0);
        rows = 64;

        for (c = 0; c < 4; c++) {
          stream.position = this.tdata + this.track[c + (i << 2)];

          for (j = 0; j < 64; j++) {
            x = (c << 2) + (j << 4);
            b0 = stream.ubyte;

            if ((b0 & 0xc0) == 0xc0) {
              j += (0xff - b0);
            } else if ((b0 & 0xc0) == 0x80) {
              b0 = (b0 >> 2) & 0x0f;
              b1 = stream.ubyte;

              if (b0 == 5 || b0 == 6 || b0 == 10) {
                if (b1 > 0x80) {
                  b1 = 0x100 - b1;
                } else {
                  b1 = (b1 << 4) & 0xf0;
                }
              } else if (b0 == 8) {
                b0 = 0;
              }

              x += 2;
              data.writeAt(x++, b0);
              data.writeAt(x++, b1);
            } else {
              b2 = stream.ubyte;
              b3 = 0;

              b1 = (b0 & 0xfe) >> 1;
              b0 = ((b2 >> 4) & 0x0f) | ((b0 << 4) & 0x10);
              b2 &= 0x0f;

              if (b2 != 0) {
                b3 = stream.ubyte;

                if (b2 == 5 || b2 == 6 || b2 == 10) {
                  if (b3 > 0x80) {
                    b3 = 0x100 - b3;
                  } else {
                    b3 = (b3 << 4) & 0xf0;
                  }
                } else if (b2 == 8) {
                  b2 = 0;
                }
              }

              data.writeAt(x++, (b0 & 0xf0) | NOTES[b1][0]);
              data.writeAt(x++, NOTES[b1][1]);
              data.writeAt(x++, ((b0 << 4) & 0xf0) | b2);
              data.writeAt(x++, b3);
            }
          }
        }

        out.position = 1084 + (i << 10);
        out.writeBytes(data, 0, (rows << 4));
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, i, len, loop, repl, size, val;

      this.reset();
      stream.position = 0;

      if (stream.readUTF8(8) != "MEXX_TP2") { return 0; }

      stream.position = 28;
      this.samples = stream.ushort >> 3;

      for (i = 0; i < this.samples; i++) {
        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        val = stream.ushort;
        this.ssize += (val << 1);

        loop = stream.ushort;
        repl = stream.ushort;
        if (val == 0) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2) { return 0; }

      len = stream.ushort;
      if (len == 0 || len > 0x7f) { return 0; }

      for (i = 0; i < len; i++) {
        val = stream.ushort;
        if (val > this.higher) { this.higher = val; }
        val >>= 3;

        if (this.offsets.indexOf(val) < 0) {
          this.offsets.push(val);
        }
      }

      this.higher += 8;
      stream.position += this.higher;

      this.sdata = stream.ushort;
      this.tdata = stream.position;
      this.sdata += this.tdata;

      len = this.sdata - 1;

      do {
        b0 = stream.ubyte;
        if ((b0 & 0xc0) == 0xc0) { continue; }

        if ((b0 & 0xc0) == 0x80) {
          stream.position++;
          continue;
        }

        b0 = (b0 & 0xfe) >> 1;
        if (b0 > 36) { return 0; }

        if ((stream.ubyte & 0x0f) != 0) {
          stream.position++;
        }
      } while (stream.position < len);

      this.format = "TrackerPacker 2.0";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 7) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.TrackerPacker2 = function() {
    return new TrackerPacker2();
  }
/* TrackerPacker 3.0/3.1 by Crazy Crack of Complex */

  class TrackerPacker3 extends Packer {
    depack(stream) {
      var b0, b1, b2, b3, c, data, i, j, len, out, rows, val, x;

      if (!this.identify(stream)) { return stream; }

      out = new ByteArray(this.unpacked);
      out.writeBytes(stream, 8, 20);
      stream.position = 30;

      for (i = 0; i < this.samples; i++) {
        out.position += 22;
        val = stream.ushort;

        out.short = stream.ushort;
        out.short = val;
        out.int = stream.uint;
      }

      for (; i < 31; i++) {
        out.position += 22;
        out.int = 0;
        out.short = 0;
        out.short = 1;
      }

      len = stream.ushort;
      out.byte = len;
      out.byte = 0x7f;

      this.offsets.sort(this.sort);

      for (i = 0; i < len; i++) {
        out.byte = this.offsets[this.offsets.indexOf(stream.ushort >> 3)];
      }

      for (i = 0; i < this.higher; i += 2) {
        this.track.push(stream.ushort);
      }

      out.position = 1080;
      out.writeUTF8(MAGIC);

      stream.position = this.tdata;
      data = new ByteArray(1024);
      len = this.higher >> 3;

      for (i = 0; i < len; i++) {
        data.fill(0);
        rows = 64;

        for (c = 0; c < 4; c++) {
          stream.position = this.tdata + this.track[c + (i << 2)];

          for (j = 0; j < 64; j++) {
            x = (c << 2) + (j << 4);
            b0 = stream.ubyte;

            if ((b0 & 0xc0) == 0xc0) {
              j += (0xff - b0);
            } else if ((b0 & 0xc0) == 0x80) {
              b0 = (b0 >> 1) & 0x0f;
              b1 = stream.ubyte;

              if (b0 == 5 || b0 == 6 || b0 == 10) {
                if (b1 > 0x80) {
                  b1 = 0x100 - b1;
                } else {
                  b1 = (b1 << 4) & 0xf0;
                }
              } else if (b0 == 8) {
                b0 = 0;
              }

              x += 2;
              data.writeAt(x++, b0);
              data.writeAt(x++, b1);
            } else {
              b2 = stream.ubyte;
              b3 = 0;

              if ((b0 & 0x40) == 0x40) {
                b1 = 0x7f - b0;
              } else {
                b1 = b0 & 0x3f;
              }

              b0 = ((b2 >> 4) & 0x0f) | ((b0 >> 2) & 0x10);
              b2 &= 0x0f;

              if (b2 != 0) {
                b3 = stream.ubyte;

                if (b2 == 5 || b2 == 6 || b2 == 10) {
                  if (b3 > 0x80) {
                    b3 = 0x100 - b3;
                  } else {
                    b3 = (b3 << 4) & 0xf0;
                  }
                } else if (b2 == 8) {
                  b2 = 0;
                }
              }

              data.writeAt(x++, (b0 & 0xf0) | NOTES[b1][0]);
              data.writeAt(x++, NOTES[b1][1]);
              data.writeAt(x++, ((b0 << 4) & 0xf0) | b2);
              data.writeAt(x++, b3);
            }
          }
        }

        out.position = 1084 + (i << 10);
        out.writeBytes(data, 0, (rows << 4));
      }

      out.writeBytes(stream, this.sdata, this.ssize);
      out.endian = false;
      return out;
    };

    identify(stream) {
      var b0, i, len, loop, repl, size, val;

      this.reset();
      stream.position = 0;

      if (stream.readUTF8(8) != "CPLX_TP3") { return 0; }

      stream.position = 28;
      this.samples = stream.ushort >> 3;

      for (i = 0; i < this.samples; i++) {
        if (stream.ubyte > 0x0f) { return 0; }
        if (stream.ubyte > 0x40) { return 0; }

        val = stream.ushort;
        this.ssize += (val << 1);

        loop = stream.ushort;
        repl = stream.ushort;
        if (val == 0) { continue; }

        if (loop >= val || (loop + repl) > val || (loop != 0 && repl < 1)) { return 0; }
      }

      if (this.ssize < 2) { return 0; }

      len = stream.ushort;
      if (len == 0 || len > 0x7f) { return 0; }

      for (i = 0; i < len; i++) {
        val = stream.ushort;
        if (val > this.higher) { this.higher = val; }
        val >>= 3;

        if (this.offsets.indexOf(val) < 0) {
          this.offsets.push(val);
        }
      }

      this.higher += 8;
      stream.position += this.higher;

      this.sdata = stream.ushort;
      this.tdata = stream.position;
      this.sdata += this.tdata;

      len = this.sdata - 1;

      do {
        b0 = stream.ubyte;
        if ((b0 & 0xc0) == 0xc0) { continue; }

        if ((b0 & 0xc0) == 0x80) {
          stream.position++;
          continue;
        }

        if ((b0 & 0x40) == 0x40) {
          b0 = 0x7f - b0;
        } else {
          b0 &= 0x3f;
        }

        if (b0 > 37) { return 0; }

        if ((stream.ubyte & 0x0f) != 0) {
          stream.position++;
        }
      } while (stream.position < len);

      this.format = "TrackerPacker 3.0/3.1";
      this.packed = this.sdata + this.ssize;
      this.unpacked = 1084 + (this.higher << 7) + this.ssize;
      return 1;
    };
  }

  window.neoart.Packers.TrackerPacker3 = function() {
    return new TrackerPacker3();
  }
})();

/*
  ByteArray 2.2
  Christian Corti
  NEOART Costa Rica
*/
class ByteArray extends DataView {
  constructor(buffer, endian, offset, length) {
    if (Number.isInteger(buffer)) {
      buffer = new ArrayBuffer(buffer);
    }

    if (!offset) { offset = 0; }
    if (!length) { length = buffer.byteLength; }

    super(buffer, offset, length);

    this.endian = endian & true;
    this.length = this.byteLength;
    this.position = 0;
  };

  get bytesAvailable() { return this.length - this.position; };

  get ubyte() {
    return this.getUint8(this.position++);
  };
  get byte() {
    return this.getInt8(this.position++);
  };
  set byte(value) {
    this.setInt8(this.position++, value);
  };

  get ushort() {
    var v = this.getUint16(this.position, this.endian);
    this.position += 2;
    return v;
  };
  get short() {
    var v = this.getInt16(this.position, this.endian);
    this.position += 2;
    return v;
  };
  set short(value) {
    this.setInt16(this.position, value, this.endian);
    this.position += 2;
  };

  get uint() {
    var v = this.getUint32(this.position, this.endian);
    this.position += 4;
    return v;
  };
  get int() {
    var v = this.getInt32(this.position, this.endian);
    this.position += 4;
    return v;
  };
  set int(value) {
    this.setInt32(this.position, value, this.endian);
    this.position += 4;
  };

  readAt(index) {
    return this.getUint8(index);
  };

  readBytes(dest, offset, length) {
    var d = new Int8Array(dest.buffer, offset, length);
    var s = new Int8Array(this.buffer, this.position, length);
    d.set(s);
    this.position += length;
  };

  readUTF8(length) {
    var v = String.fromCharCode.apply(null, new Uint8Array(this.buffer, this.position, length));
    this.position += length;
    return v.replace(/\0/g, "");
  };

  writeAt(index, value) {
    this.setInt8(index, value);
  };

  writeBytes(source, offset, length) {
    var d = new Int8Array(this.buffer, this.position, length);
    var s = new Int8Array(source.buffer, offset, length);
    d.set(s);
    this.position += length;
  };

  writeUTF8(value) {
    for (var i = 0, l = value.length; i < l; i++) {
      this.setInt8(this.position++, value.charCodeAt(i));
    }
  };

  extend(length) {
    var r = new Int8Array(this.length + length);
    r.set(new Int8Array(this.buffer));
    return new ByteArray(r.buffer);
  };

  fill(value, offset = 0, length) {
    if (!length) { length = this.length - offset; }
    new Int8Array(this.buffer, offset, length).fill(value);
  };

  shrink(offset, length) {
    length -= offset;
    var r = new Int8Array(this.buffer, offset, length);
    var w = new Int8Array(length);
    w.set(r);
    return new ByteArray(w.buffer);
  };
}

/*
  Flip
  version 1.4 (2018-02-25)
  Christian Corti
  NEOART Costa Rica
*/
const Flip = (function() {
  const ERROR1  = "The archive is either in unknown format or damaged.";
  const ERROR2  = "Unexpected end of archive.";
  const ERROR3  = "Encrypted archive not supported.";
  const ERROR4  = "Compression method not supported.";
  const ERROR5  = "Invalid block type.";
  const ERROR6  = "Available inflate data did not terminate.";
  const ERROR7  = "Invalid literal/length or distance code.";
  const ERROR8  = "Distance is too far back.";
  const ERROR9  = "Stored block length did not match one's complement.";
  const ERROR10 = "Too many length or distance codes.";
  const ERROR11 = "Code lengths codes incomplete.";
  const ERROR12 = "Repeat lengths with no first length.";
  const ERROR13 = "Repeat more than specified lengths.";
  const ERROR14 = "Invalid literal/length code lengths.";
  const ERROR15 = "Invalid distance code lengths.";

  const LENG  = new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258]);
  const LEXT  = new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]);
  const DIST  = new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577]);
  const DEXT  = new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]);
  const ORDER = new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);

  class Huffman {
    constructor(length) {
      this.count  = new Uint16Array(length);
      this.symbol = new Uint16Array(length);
    };
  }

  class Inflater {
    constructor() {
      this.output = null;
      this.inpbuf = null;
      this.inpcnt = 0;
      this.bitbuf = 0;
      this.bitcnt = 0;

      this.initialize();
    };

    set input(args) {
      this.inpbuf = args[0];
      this.inpbuf.endian = args[2];
      this.inpbuf.position = 0;
      this.inpcnt = 0;

      this.output = new ByteArray(new ArrayBuffer(args[1]));
      this.output.endian = args[2];
      this.output.position = 0;
      this.outcnt = 0;
    };

    inflate() {
      var err, last, type;

      do {
        last = this.bits(1);
        type = this.bits(2);

        err = (type == 0) ? this.stored() :
              (type == 1) ? this.codes(this.flencode, this.fdiscode) :
              (type == 2) ? this.dynamic() : 1;

        if (err) { throw ERROR5; }
      } while (!last);
    };

    initialize() {
      var len = new Uint8Array(288);

      this.flencode = new Huffman(288);
      this.fdiscode = new Huffman(30);

      len.fill(8, 0, 144);
      len.fill(9, 144, 256);
      len.fill(7, 256, 280);
      len.fill(8, 280);
      this.construct(this.flencode, len, 288);

      len.fill(5, 0, 30);
      this.construct(this.fdiscode, len, 30);

      this.dlencode = new Huffman(286);
      this.ddiscode = new Huffman(30);
    };

    construct(huff, arr, n) {
      var left = 1, len = 1, off = new Uint16Array(16), sym = 0;

      huff.count.fill(0, 0, 16);
      for (; sym < n; sym++) { huff.count[arr[sym]]++; }
      if (huff.count[0] == n) { return 0; }

      for (; len < 16; len++) {
        left <<= 1;
        left -= huff.count[len];
        if (left < 0) { return left; }
      }

      for (len = 1; len < 15; len++) { off[len + 1] = off[len] + huff.count[len]; }

      for (sym = 0; sym < n; sym++) { if (arr[sym] != 0) { huff.symbol[off[arr[sym]]++] = sym; } }

      return left;
    };

    bits(need) {
      var buf = this.bitbuf, inplen = this.inpbuf.length;

      while (this.bitcnt < need) {
        if (this.inpcnt == inplen) { throw ERROR6; }
        buf |= this.inpbuf.readAt(this.inpcnt++) << this.bitcnt;
        this.bitcnt += 8;
      }

      this.bitbuf = buf >> need;
      this.bitcnt -= need;
      return buf & ((1 << need) - 1);
    };

    codes(lencode, discode) {
      var dis, len, pos, sym;

      do {
        sym = this.decode(lencode);

        if (sym < 256) {
          this.output.writeAt(this.outcnt++, sym);
        } else if (sym > 256) {
          sym -= 257;
          if (sym >= 29) { throw ERROR7; }
          len = LENG[sym] + this.bits(LEXT[sym]);

          sym = this.decode(discode);
          if (sym < 0) { return sym; }
          dis = DIST[sym] + this.bits(DEXT[sym]);
          if (dis > this.outcnt) { throw ERROR8; }

          pos = this.outcnt - dis;
          while (len--) { this.output.writeAt(this.outcnt++, this.output.readAt(pos++)); }
        }
      } while (sym != 256);

      return 0;
    };

    decode(huff) {
      var buf = this.bitbuf, code = 0, count, first = 0, index = 0, inplen = this.inpbuf.length, left = this.bitcnt, len = 1;

      while (1) {
        while (left--) {
          code |= buf & 1;
          buf >>= 1;
          count = huff.count[len];

          if ((code - count) < first) {
            this.bitbuf = buf;
            this.bitcnt = (this.bitcnt - len) & 7;
            return huff.symbol[index + (code - first)];
          }

          index += count;
          first += count;
          first <<= 1;
          code  <<= 1;
          len++;
        }

        left = 16 - len;
        if (!left) { break; }
        if (this.inpcnt == inplen) { throw ERROR6; }
        buf = this.inpbuf.readAt(this.inpcnt++);
        if (left > 8) { left = 8; }
      }

      throw ERROR7;
    };

    stored() {
      var inplen = this.inpbuf.length, len = 0;
      this.bitbuf = this.bitcnt = 0;

      if ((this.inpcnt + 4) > inplen) { throw ERROR6; }
      len  = this.inpbuf.readAt(this.inpcnt++);
      len |= this.inpbuf.readAt(this.inpcnt++) << 8;

      if (this.inpbuf.readAt(this.inpcnt++) != ( ~len & 0xff) ||
          this.inpbuf.readAt(this.inpcnt++) != ((~len >> 8) & 0xff)) { throw ERROR9; }

      if ((this.inpcnt + len) > inplen) { throw ERROR6; }
      while (len--) { this.output.writeAt(this.outcnt++, this.inpbuf.readAt(this.inpcnt++)); }

      return 0;
    };

    dynamic() {
      var arr = new Uint8Array(316), err, index = 0, len, nlen = this.bits(5) + 257, ndis = this.bits(5) + 1, ncode = this.bits(4) + 4, max = nlen + ndis, sym;

      if (nlen > 286 || ndis > 30) { throw ERROR10; }
      for (; index < ncode; ++index) { arr[ORDER[index]] = this.bits(3); }
      for (; index < 19; ++index) { arr[ORDER[index]] = 0; }

      err = this.construct(this.dlencode, arr, 19);
      if (err) { throw ERROR11; }
      index = 0;

      while (index < max) {
        sym = this.decode(this.dlencode);

        if (sym < 16) {
          arr[index++] = sym;
        } else {
          len = 0;

          if (sym == 16) {
            if (index == 0) { throw ERROR12; }
            len = arr[index - 1];
            sym = 3 + this.bits(2);
          } else if (sym == 17) {
            sym = 3 + this.bits(3);
          } else {
            sym = 11 + this.bits(7);
          }

          if ((index + sym) > max) { throw ERROR13; }
          while (sym--) { arr[index++] = len; }
        }
      }

      err = this.construct(this.dlencode, arr, nlen);
      if (err < 0 || (err > 0 && nlen - this.dlencode.count[0] != 1)) { throw ERROR14; }

      err = this.construct(this.ddiscode, arr.subarray(nlen), ndis);
      if (err < 0 || (err > 0 && ndis - this.ddiscode.count[0] != 1)) { throw ERROR15; }

      return this.codes(this.dlencode, this.ddiscode);
    };
  }

  class ZipEntry {
    constructor() {
      this.name       = "";
      this.extra      = null;
      this.version    = 0;
      this.flag       = 0;
      this.method     = 0;
      this.time       = 0;
      this.crc        = 0;
      this.compressed = 0;
      this.size       = 0;
      this.offset     = 0;
    };

    get date() {
      return new Date(
        ((this.time >> 25) & 0x7f) + 1980,
        ((this.time >> 21) & 0x0f) - 1,
         (this.time >> 16) & 0x1f,
         (this.time >> 11) & 0x1f,
         (this.time >>  5) & 0x3f,
         (this.time & 0x1f) << 1
      );
    };

    get isDirectory() {
      return (this.name.charAt(this.length - 1) == "/");
    };
  }

  return class Flip {
    constructor(stream) {
      if (!stream) { return null; }
      if (!(stream instanceof ByteArray)) { stream = new ByteArray(stream); }

      this.endian  = true;
      this.entries = null;
      this.stream  = stream;
      this.total   = 0;

      stream.endian = this.endian;
      stream.position = 0;

      this.parseEnd();
      return Object.seal(this);
    };

    about() {
      console.info("Flip 1.5\n2016/08/15\nChristian Corti\nNeoart Costa Rica");
    };

    uncompress(entry) {
      var src = this.stream, buffer, found = false, i, inflater, item, l, size;
      if (!entry) { return null; }

      if (typeof entry === "string") {
        for (i = 0, l = this.entries.length; i < l; i++) {
          item = this.entries[i];

          if (item.name == entry) {
            entry = item;
            found = true;
            break;
          }
        }

        if (!found) { return null; }
      }

      src.position = entry.offset + 28;
      size = src.ushort;
      src.position += (entry.name.length + size);

      if (entry.compressed) {
        buffer = new ByteArray(new ArrayBuffer(entry.compressed), this.endian);
        src.readBytes(buffer, 0, entry.compressed);

        switch (entry.method) {
          case 0:
            return buffer;
          case 8:
            inflater = new Inflater();
            inflater.input = [buffer, entry.size, this.endian];
            inflater.inflate();
            return inflater.output;
          default:
            throw ERROR4;
            break;
        }
      }
    };

    parseCentral() {
      var src = this.stream, entry, hdr = new ByteArray(new ArrayBuffer(46), this.endian), i, l, size;

      for (i = 0, l = this.entries.length; i < l; i++) {
        src.readBytes(hdr, 0, 46);
        hdr.position = 0;
        if (hdr.uint != 0x02014b50) { throw ERROR2; }
        hdr.position += 24;

        size = hdr.ushort;
        if (!size) { throw ERROR2; }
        entry = new ZipEntry();
        entry.name = src.readUTF8(size);

        size = hdr.ushort;
        if (size) {
          entry.extra = new ByteArray(new ArrayBuffer(size), this.endian);
          src.readBytes(entry.extra, 0, size);
        }

        src.position += hdr.ushort;
        hdr.position = 6;
        entry.version = hdr.ushort;

        entry.flag = hdr.ushort;
        if ((entry.flag & 1) == 1) { throw ERROR3; }

        entry.method = hdr.ushort;
        entry.time = hdr.uint;
        entry.crc = hdr.uint;
        entry.compressed = hdr.uint;
        entry.size = hdr.uint;
        this.total += entry.size;

        hdr.position = 42;
        entry.offset = hdr.uint;
        this.entries[i] = Object.freeze(entry);
      }
    };

    parseEnd() {
      var src = this.stream, i = src.length - 22, l = i - 65536;
      if (l < 0) { l = 0; }

      do {
        if (src.readAt(i) != 0x50) { continue; }
        src.position = i;
        if (src.uint == 0x06054b50) { break; }
      } while (--i > l);

      if (i == l) { throw ERROR1; }

      src.position = i + 10;
      this.entries = [];
      this.entries.length = src.ushort;

      src.position = i + 16;
      src.position = src.uint;
      this.parseCentral();
    };
  }
})();