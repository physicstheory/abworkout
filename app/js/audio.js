// Coach voice: pre-recorded neural-voice clips played through Web Audio so
// they can be queued back-to-back and interrupted.

export class Coach {
  constructor() {
    this.ctx = null;
    this.buffers = {};      // clip name -> [AudioBuffer variants]
    this.voice = null;
    this.live = new Set();  // playing / scheduled sources
    this.queueEnd = 0;
    this.last = {};
    this.manifest = null;
  }

  // Must be called from a tap: iOS only allows audio after a user gesture.
  // overMusic=false (default): the coach plays out loud even when the ring
  //   switch is on silent; iOS pauses other audio while the app is talking.
  // overMusic=true: the coach mixes over Spotify, but iOS mutes it on silent.
  unlock(overMusic = false) {
    clearTimeout(this.sleepTimer);
    this.setMixing(overMusic);
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    const src = this.ctx.createBufferSource();
    src.buffer = this.ctx.createBuffer(1, 1, 22050);
    src.connect(this.out);
    src.start(0);
  }

  // Release the silent-mode workaround once the coach is done talking.
  sleep(afterSec = 0) {
    clearTimeout(this.sleepTimer);
    this.sleepTimer = setTimeout(() => this.keepalive?.pause(), afterSec * 1000);
  }

  get running() { return this.ctx?.state === 'running'; }

  setMixing(overMusic) {
    this.overMusic = overMusic;
    if (navigator.audioSession) {
      try { navigator.audioSession.type = overMusic ? 'ambient' : 'playback'; } catch {}
      return;
    }
    // Older iOS has no audioSession API. A looping silent <audio> element
    // switches the page to "playback" audio, so Web Audio ignores the
    // silent switch too.
    if (!overMusic) {
      if (!this.keepalive) {
        this.keepalive = new Audio('audio/silence.mp3');
        this.keepalive.loop = true;
        this.keepalive.setAttribute('playsinline', '');
      }
      this.keepalive.play().catch(() => {});
    } else {
      this.keepalive?.pause();
    }
  }

  async load(voice) {
    if (this.voice === voice && Object.keys(this.buffers).length) return;
    this.manifest ??= await (await fetch('audio/manifest.json')).json();
    const jobs = [];
    const buffers = {};
    for (const [clip, n] of Object.entries(this.manifest.clips)) {
      buffers[clip] = [];
      for (let i = 0; i < n; i++) {
        jobs.push(
          fetch(`audio/${voice}/${clip}_${i}.mp3`)
            .then((r) => r.arrayBuffer())
            .then((ab) => new Promise((ok, bad) => this.ctx.decodeAudioData(ab, ok, bad)))
            .then((buf) => (buffers[clip][i] = buf)),
        );
      }
    }
    await Promise.all(jobs);
    this.buffers = buffers;
    this.voice = voice;
  }

  pick(clip) {
    const v = this.buffers[clip];
    if (!v || !v.length) return null;
    let i = Math.floor(Math.random() * v.length);
    if (v.length > 1 && i === this.last[clip]) i = (i + 1) % v.length;
    this.last[clip] = i;
    return v[i];
  }

  // Queue clips one after another. `cut` drops anything still queued first;
  // `after` waits that many seconds (e.g. to clear a beep) before speaking.
  // Returns seconds until the queue finishes speaking.
  say(clips, { cut = false, gap = 0.18, after = 0 } = {}) {
    if (!this.ctx) return 0;
    // iOS suspends audio after calls/Siri or when another app takes over.
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (cut) this.stop();
    const now = this.ctx.currentTime;
    let at = Math.max(now + 0.02 + after, this.queueEnd);
    for (const clip of [].concat(clips)) {
      const buf = this.pick(clip);
      if (!buf) continue;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.out);
      src.start(at);
      src.onended = () => this.live.delete(src);
      this.live.add(src);
      at += buf.duration + gap;
    }
    this.queueEnd = at;
    return Math.max(0, at - now);
  }

  stop() {
    for (const s of this.live) { try { s.stop(); } catch {} }
    this.live.clear();
    this.queueEnd = 0;
  }

  // Short synth blip for phase changes.
  beep(freq = 880, dur = 0.12, vol = 0.18) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}
