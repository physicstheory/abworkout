// Workout timeline: get ready -> work -> cool down -> work ... -> done.
// The coach names each move at the switch; beeps count down the timing.
// The UI subscribes via onTick / onPhase.

import { EXERCISES } from './exercises.js';

// Announcement phases stretch so the name is never cut off by the countdown.
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
      this.coach.beep(1046, 0.35, 0.22);
    } else {
      // The only thing the coach says: the move that's coming up.
      if (p.type === 'rest') this.coach.beep(523, 0.3, 0.22);
      const talk = this.coach.say(`name_${ex.id}`, { after: p.type === 'rest' ? 0.4 : 0 });
      const base = p.type === 'ready' ? this.s.ready : this.s.rest;
      this.length = Math.max(base, Math.ceil(talk + COUNTDOWN_ROOM));
    }
    this.cb.onPhase(p, ex, this);
    this.tick();
  }

  cue(key, freq) {
    if (this.fired.has(key)) return;
    this.fired.add(key);
    this.coach.beep(freq, 0.14, 0.2);
  }

  tick() {
    const now = performance.now();
    if (!this.paused) this.elapsed += (now - this.last) / 1000;
    this.last = now;
    const left = this.length - this.elapsed;
    const p = this.phase;

    if (!this.paused) {
      // Countdown beeps out of every phase except into the finish.
      const last = p.type === 'work' && this.k === this.phases.length - 1;
      if (!last) {
        if (left <= 3.05) this.cue('3', 660);
        if (left <= 2.05) this.cue('2', 660);
        if (left <= 1.05) this.cue('1', 660);
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
    this.tick();
    return this.paused;
  }

  finish() {
    this.stop();
    this.coach.beep(1046, 0.18, 0.22);
    setTimeout(() => this.coach.beep(1318, 0.45, 0.22), 200);
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
