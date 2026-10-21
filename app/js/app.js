import { EXERCISES, poseAt, peakPose } from './exercises.js';
import { Figure } from './figure.js';
import { Coach } from './audio.js';
import { Workout } from './workout.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ---------- Icons ----------
const P = {
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none"/>',
  next: '<path d="M6 6l9 6-9 6z" fill="currentColor" stroke="none"/><path d="M18 6v12"/>',
  prev: '<path d="M18 6l-9 6 9 6z" fill="currentColor" stroke="none"/><path d="M6 6v12"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M6 11H5v10h14V11h-1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
};
const icon = (n) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
const paintIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach((el) => {
  const svg = icon(el.dataset.icon);
  const first = el.firstElementChild;
  if (first?.classList?.contains('i')) first.outerHTML = svg; else el.insertAdjacentHTML('afterbegin', svg);
});

// ---------- Settings ----------
const DEFAULTS = { work: 40, rest: 20, ready: 10, voice: 'heart', loud: false, wake: true };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('abw.settings') || '{}') }; } catch {}
const saveSettings = () => { try { localStorage.setItem('abw.settings', JSON.stringify(settings)); } catch {} };

const coach = new Coach();
// Declare up front that our audio mixes with other apps, so opening the app
// never stops music that's already playing.
if (!settings.loud) coach.setMixing(true);
const appUrl = () => location.origin + location.pathname;

// ---------- Toast ----------
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3200);
}

// ---------- Animation loop ----------
const animated = new Map(); // Figure -> exercise
function loop(ts) {
  const sec = ts / 1000;
  for (const [fig, ex] of animated) fig.draw(poseAt(ex, sec));
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- Home ----------
const fmt = (s) => { s = Math.ceil(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function renderHome() {
  const total = settings.ready + EXERCISES.length * settings.work + (EXERCISES.length - 1) * settings.rest;
  $('#hero-time').textContent = Math.round(total / 60);
  $('#hero-split').textContent = `${settings.work}/${settings.rest}`;
  const list = $('#list');
  list.innerHTML = '';
  EXERCISES.forEach((ex, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button class="row">
      <span class="idx">${String(i + 1).padStart(2, '0')}</span>
      <span class="txt"><div class="nm">${esc(ex.name)}</div><div class="sub">${esc(ex.target)} · ${settings.work}s</div></span>
      <svg class="thumb"></svg></button>`;
    new Figure(li.querySelector('svg')).draw(peakPose(ex));
    li.querySelector('button').onclick = () => openPreview(ex);
    list.appendChild(li);
  });
}

function openPreview(ex) {
  openSheet(`
    <h3>${esc(ex.name)}</h3>
    <p class="lead">${esc(ex.target)} · ${settings.work} seconds</p>
    <div class="preview-stage"><svg></svg></div>
    <p>${esc(ex.cue)}</p>
    <div class="row-btns">
      <button class="ghost" data-act="hear"><span data-icon="sound"></span> Hear coach</button>
      <button class="ghost" data-act="close">Close</button>
    </div>`, (body) => {
    const fig = new Figure(body.querySelector('svg'));
    animated.set(fig, ex);
    body.querySelectorAll('.ghost span').forEach((s) => (s.style.display = 'inline-block'));
    body.querySelector('[data-act=hear]').onclick = async () => {
      coach.unlock(!settings.loud);
      await coach.load(settings.voice);
      coach.say(`ex_${ex.id}`, { cut: true });
    };
    body.querySelector('[data-act=close]').onclick = closeSheet;
    return () => animated.delete(fig);
  });
}

// ---------- Sheets ----------
let sheetCleanup = null;
function openSheet(html, setup) {
  closeSheet();
  const body = $('#sheet-body');
  body.innerHTML = html;
  paintIcons(body);
  $('#sheet').hidden = false;
  sheetCleanup = setup?.(body) || null;
}
function closeSheet() {
  sheetCleanup?.();
  sheetCleanup = null;
  $('#sheet').hidden = true;
  $('#sheet-body').innerHTML = '';
}
$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

// ---------- Settings sheet ----------
function stepper(key, min, max, step) {
  return `<div class="stepper" data-key="${key}" data-min="${min}" data-max="${max}" data-step="${step}">
    <button data-d="-1">−</button><output>${settings[key]}s</output><button data-d="1">+</button></div>`;
}

function openSettings() {
  const voices = { heart: 'Heart', michael: 'Michael' };
  openSheet(`
    <h3>Settings</h3>
    <p class="group-title">Timing</p>
    <div class="group">
      <div class="item"><div class="grow">Exercise<small>Work time per move</small></div>${stepper('work', 15, 120, 5)}</div>
      <div class="item"><div class="grow">Cool down<small>Rest between moves</small></div>${stepper('rest', 10, 90, 5)}</div>
      <div class="item"><div class="grow">Get ready<small>Before the first move</small></div>${stepper('ready', 5, 30, 5)}</div>
    </div>
    <p class="group-title">Coach</p>
    <div class="group">
      <div class="item"><div class="grow">Voice</div>
        <div class="seg" id="voice-seg">${Object.entries(voices).map(([k, v]) => `<button data-v="${k}" class="${settings.voice === k ? 'on' : ''}">${v}</button>`).join('')}</div></div>
      <button class="item" data-toggle="loud"><div class="grow">Play on silent<small>Off (default): the coach plays alongside your music without stopping it, but iPhone mutes the coach when Silent mode is on. On: the coach is heard even in Silent mode, but iPhone pauses your music.</small></div><span class="switch ${settings.loud ? 'on' : ''}"></span></button>
      <button class="item" data-toggle="wake"><div class="grow">Keep screen on<small>During a workout</small></div><span class="switch ${settings.wake ? 'on' : ''}"></span></button>
    </div>
    <p class="group-title">Audio &amp; Bluetooth</p>
    <div class="group"><div class="item"><div class="grow"><small style="font-size:13px">Connect AirPods or any Bluetooth headphones/speaker in iPhone Settings → Bluetooth (or Control Center). Keep your music playing in any app; the coach plays on top of it, and both follow the iPhone's audio output automatically.</small></div></div></div>
    <button class="ghost" data-act="share">Send the app to a friend</button>`, (body) => {
    body.querySelectorAll('.stepper').forEach((st) => {
      st.onclick = (e) => {
        const d = +e.target.dataset.d;
        if (!d) return;
        const { key, min, max, step } = st.dataset;
        settings[key] = Math.min(+max, Math.max(+min, settings[key] + d * +step));
        st.querySelector('output').textContent = `${settings[key]}s`;
        saveSettings();
        renderHome();
      };
    });
    body.querySelector('#voice-seg').onclick = async (e) => {
      const v = e.target.dataset.v;
      if (!v) return;
      settings.voice = v;
      saveSettings();
      body.querySelectorAll('#voice-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      coach.unlock(!settings.loud);
      await coach.load(v);
      coach.say('intro', { cut: true });
    };
    body.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.toggle;
        settings[k] = !settings[k];
        saveSettings();
        b.querySelector('.switch').classList.toggle('on', settings[k]);
        if (k === 'loud') coach.unlock(!settings.loud);
      };
    });
    body.querySelector('[data-act=share]').onclick = openShare;
  });
}

// ---------- Share ----------
async function openShare() {
  const url = appUrl();
  const { qrcode } = await import('../vendor/qrcode.mjs');
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  openSheet(`
    <h3>Send it to a friend</h3>
    <p class="lead">They scan this or open the link in Safari, then tap <b>Share → Add to Home Screen</b>. No App Store, no account, free.</p>
    <div class="qr">${qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true })}</div>
    <p style="text-align:center"><code>${esc(url)}</code></p>
    <div class="row-btns">
      <button class="primary" data-act="share" style="height:50px;font-size:16px">Share link</button>
      <button class="ghost" data-act="copy">Copy</button>
    </div>`, (body) => {
    body.querySelector('[data-act=share]').onclick = async () => {
      try {
        await navigator.share({ title: 'AbWorkout', text: '10-minute ab workout with a voice coach. Open in Safari → Share → Add to Home Screen.', url });
      } catch (e) {
        if (e.name !== 'AbortError') copy(url);
      }
    };
    body.querySelector('[data-act=copy]').onclick = () => copy(url);
  });
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('Link copied'); } catch { toast(text); }
}

// ---------- Session ----------
let workout = null;
let wakeLock = null;
const stageFig = new Figure($('#s-figure'));
const RING = 2 * Math.PI * 54;

async function keepAwake(on) {
  try {
    if (on && settings.wake && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else { await wakeLock?.release(); wakeLock = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && workout) keepAwake(true);
});

// iPhone mutes mixed-in app audio in Silent mode; say so on the first workouts.
function silentTip() {
  let n = 0;
  try { n = +localStorage.getItem('abw.silenttip') || 0; localStorage.setItem('abw.silenttip', n + 1); } catch {}
  if (n < 2) toast("Can't hear the coach? Turn off Silent mode, or switch on Play on silent in Settings.");
}

function buildSegments() {
  $('#s-progress').innerHTML = EXERCISES.map(() => '<i></i>').join('');
}

async function startWorkout() {
  coach.unlock(!settings.loud);
  const btn = $('#btn-start');
  btn.disabled = true;
  try {
    await coach.load(settings.voice);
  } catch {
    toast('Could not load the coach voice. Check your connection once, then it works offline.');
  } finally {
    btn.disabled = false;
  }
  if (!coach.running) toast('Sound is blocked. Tap Start again and check the volume buttons.');
  else if (!settings.loud) silentTip();
  closeSheet();
  buildSegments();
  $('#home').hidden = true;
  $('#done').hidden = true;
  $('#session').hidden = false;
  keepAwake(true);
  workout = new Workout(coach, settings, { onPhase, onTick, onDone });
  workout.start();
  setPauseIcon(false);
}

function onPhase(p, ex) {
  const s = $('#session');
  s.dataset.phase = p.type;
  $('#s-phase').textContent = p.type === 'work' ? 'Go' : p.type === 'rest' ? 'Cool down · Up next' : 'Get ready';
  $('#s-name').textContent = ex.name;
  $('#s-target').textContent = ex.target;
  $('#s-index').textContent = p.ex + 1;
  animated.clear();
  animated.set(stageFig, ex);
  $('#s-progress').querySelectorAll('i').forEach((seg, i) => {
    seg.className = i < p.ex ? 'fin' : i === p.ex && p.type === 'work' ? 'now' : '';
    seg.style.removeProperty('--p');
  });
  $('#s-sub').textContent = p.type === 'work'
    ? (EXERCISES[p.ex + 1] ? `Next: ${EXERCISES[p.ex + 1].name}` : 'Last one!')
    : 'until start';
}

function onTick(left, length, w) {
  $('#s-time').textContent = fmt(left);
  $('#s-ring').style.strokeDashoffset = String(RING * (1 - left / length));
  const p = w.phase;
  if (p.type === 'work') {
    const seg = $('#s-progress').children[p.ex];
    seg?.style.setProperty('--p', `${(100 * (1 - left / length)).toFixed(1)}%`);
  }
}

function onDone(totalSec) {
  workout = null;
  coach.sleep(6);
  keepAwake(false);
  animated.clear();
  $('#session').hidden = true;
  $('#done').hidden = false;
  $('#done-time').textContent = fmt(totalSec);
}

function endWorkout() {
  workout?.quit();
  coach.sleep();
  workout = null;
  keepAwake(false);
  animated.clear();
  $('#session').hidden = true;
  $('#done').hidden = true;
  $('#home').hidden = false;
}

function setPauseIcon(paused) {
  const b = $('#s-pause');
  b.dataset.icon = paused ? 'play' : 'pause';
  b.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
  paintIcons(b.parentElement);
}

// ---------- Wire up ----------
paintIcons();
renderHome();
$('#btn-start').onclick = startWorkout;
$('#btn-settings').onclick = openSettings;
$('#btn-share').onclick = openShare;
$('#s-close').onclick = () => { if (confirm('End this workout?')) endWorkout(); };
$('#s-pause').onclick = () => setPauseIcon(workout?.togglePause());
$('#s-next').onclick = () => workout?.next();
$('#s-prev').onclick = () => workout?.prev();
$('#done-ok').onclick = endWorkout;
$('#done-share').onclick = openShare;

// Install hint for Safari users who haven't added it to the home screen yet.
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
let tipDismissed = false;
try { tipDismissed = !!localStorage.getItem('abw.tip'); } catch {}
if (isIOS && !standalone && !tipDismissed) {
  $('#install-tip').hidden = false;
  $('#install-tip .tip-x').onclick = () => {
    $('#install-tip').hidden = true;
    try { localStorage.setItem('abw.tip', '1'); } catch {}
  };
}

if ('serviceWorker' in navigator) {
  // When a new version installs, switch to it right away unless mid-workout.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !workout) location.reload();
  });
  navigator.serviceWorker.register('sw.js');
}
