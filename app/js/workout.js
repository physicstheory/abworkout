// Workout timeline: get ready -> work -> cool down -> work ... -> done.
// Drives the coach's voice cues; the UI subscribes via onTick / onPhase.

import { EXERCISES } from './exercises.js';

// Announcement phases stretch so the coach is never cut off before "3, 2, 1".
const COUNTDOWN_ROOM = 4;

export class Workout {
  constructor(coach, settings, { onPhase, onTick, onDone }) {
    this.coach = coach;
    this.s = settings;
    this.cb = { onPhase, onTick, onDone };
    this.phases = [{ type: 'ready', ex: 0 }];
    EXERCISES.forEach((_, i) => {
      if (i > 0) this.phases.push({ type: 'rest', ex: i });
      this.phases.push({ type: 'work', ex: i });
    });
    this.k = -1;
    this.paused = false;
    this.startedAt = 0;
    this.timer = null;
  }

  start() {
    this.startedAt = performance.now();
    this.enter(0);
    this.timer = setInterval(() => this.tick(), 100);
  }

  get phase() { return this.phases[this.k]; }

  enter(k) {
    this.coach.stop();
    this.k = k;
    this.fired = new Set();
    this.elapsed = 0;
    this.last = performance.now();
    const p = this.phase;
    const ex = EXERCISES[p.ex];
    if (p.type === 'work') {
      this.length = this.s.work;
      this.coach.beep(1046, 0.18);
      this.coach.say('go');
    } else {
      const intro = p.type === 'ready'
        ? ['intro', 'first_up']
        : ['rest', p.ex === EXERCISES.length - 1 ? 'last_one' : 'up_next'];
      if (p.type === 'rest') this.coach.beep(523, 0.22);
      const talk = this.coach.say([...intro, `ex_${ex.id}`]);
      const base = p.type === 'ready' ? this.s.ready : this.s.rest;
      this.length = Math.max(base, Math.ceil(talk + COUNTDOWN_ROOM));
    }
    this.cb.onPhase(p, ex, this);
    this.tick();
  }

  cue(key, clip, opts) {
    if (this.fired.has(key)) return;
    this.fired.add(key);
    this.coach.say(clip, opts);
  }

  tick() {
    const now = performance.now();
    if (!this.paused) this.elapsed += (now - this.last) / 1000;
    this.last = now;
    const left = this.length - this.elapsed;
    const p = this.phase;

    if (!this.paused) {
      if (p.type === 'work') {
        if (this.length >= 20 && this.elapsed >= this.length / 2) this.cue('half', 'halfway');
        if (this.length >= 25 && left <= 10.2) this.cue('ten', 'ten_left');
      }
      // Count down out of every phase except into the finish.
      const last = p.type === 'work' && this.k === this.phases.length - 1;
      if (!last) {
        if (left <= 3.05) this.cue('3', 'three', { cut: true });
        if (left <= 2.05) this.cue('2', 'two', { cut: true });
        if (left <= 1.05) this.cue('1', 'one', { cut: true });
      }
      if (left <= 0) return this.next();
    }
    this.cb.onTick(Math.max(0, left), this.length, this);
  }

  next() {
    if (this.k >= this.phases.length - 1) return this.finish();
    this.enter(this.k + 1);
  }

  prev() {
    // From work: replay its announcement. From an announcement: go back one move.
    const target = this.phase.type === 'work' ? this.k - 1 : this.k - 2;
    this.enter(Math.max(0, target));
  }

  togglePause() {
    this.paused = !this.paused;
    this.coach.stop();
    this.coach.say(this.paused ? 'paused' : 'resumed');
    this.tick();
    return this.paused;
  }

  finish() {
    this.stop();
    this.coach.beep(1318, 0.3);
    this.coach.say('complete');
    this.cb.onDone((performance.now() - this.startedAt) / 1000);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  quit() {
    this.stop();
    this.coach.stop();
  }
}
