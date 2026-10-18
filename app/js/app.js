import { EXERCISES, poseAt, peakPose } from './exercises.js';
import { Figure } from './figure.js';
import { Coach } from './audio.js';
import { Workout } from './workout.js';
import { Spotify } from './spotify.js';

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
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M6 11H5v10h14V11h-1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  speaker: '<rect x="5.5" y="2.5" width="13" height="19" rx="2.5"/><circle cx="12" cy="14.5" r="3.2"/><circle cx="12" cy="7" r="1"/>',
  computer: '<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16.5V20"/>',
  shuffle: '<path d="M3 7h3.5c5 0 6 10 11 10H21M3 17h3.5c2 0 3.2-1.6 4.2-3.5M14 8.6c.9-1 2-1.6 3.5-1.6H21M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  spotify: '<circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><path d="M7 9.4c3.6-1.1 7.4-.8 10.4.9M7.6 12.4c3-.9 6.1-.6 8.6.8M8.2 15.2c2.4-.6 4.6-.4 6.6.6" stroke="#000" stroke-width="1.7"/>',
};
const icon = (n) => `<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
const paintIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach((el) => {
  const svg = icon(el.dataset.icon);
  const first = el.firstElementChild;
  if (first?.classList?.contains('i')) first.outerHTML = svg; else el.insertAdjacentHTML('afterbegin', svg);
});

// ---------- Settings ----------
const DEFAULTS = { work: 40, rest: 20, ready: 10, voice: 'heart', mix: true, autoMusic: true, wake: true, clientId: '' };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('abw.settings') || '{}') }; } catch {}
const saveSettings = () => { try { localStorage.setItem('abw.settings', JSON.stringify(settings)); } catch {} };

const coach = new Coach();
let spotify = new Spotify(window.ABW_CONFIG?.spotifyClientId || settings.clientId);
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
      coach.unlock();
      coach.setMixing(settings.mix);
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
      <button class="item" data-toggle="mix"><div class="grow">Play over music<small>On: coach talks over Spotify (ring switch must be on). Off: works in silent mode but pauses music.</small></div><span class="switch ${settings.mix ? 'on' : ''}"></span></button>
      <button class="item" data-toggle="wake"><div class="grow">Keep screen on<small>During a workout</small></div><span class="switch ${settings.wake ? 'on' : ''}"></span></button>
    </div>
    <p class="group-title">Music</p>
    <div class="group">
      <button class="item" data-toggle="autoMusic"><div class="grow">Start my music with the workout<small>Resumes Spotify when you tap Start</small></div><span class="switch ${settings.autoMusic ? 'on' : ''}"></span></button>
      <button class="item" data-act="music"><div class="grow">Spotify<small>${spotify.connected ? 'Connected' : 'Not connected'}</small></div><span class="spot" data-icon="spotify"></span></button>
    </div>
    <p class="group-title">Audio &amp; Bluetooth</p>
    <div class="group"><div class="item"><div class="grow"><small style="font-size:13px">Connect AirPods or any Bluetooth headphones/speaker in iPhone Settings → Bluetooth (or Control Center). The coach and your music follow the iPhone's audio output automatically. To send Spotify to another speaker, use <b>Play on</b> in the music panel.</small></div></div></div>
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
      coach.unlock();
      coach.setMixing(settings.mix);
      await coach.load(v);
      coach.say('intro', { cut: true });
    };
    body.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = () => {
        const k = b.dataset.toggle;
        settings[k] = !settings[k];
        saveSettings();
        b.querySelector('.switch').classList.toggle('on', settings[k]);
        if (k === 'mix') coach.setMixing(settings.mix);
      };
    });
    body.querySelector('[data-act=music]').onclick = openMusic;
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

// ---------- Music (Spotify) ----------
let musicState = null;
let musicTimer = null;

function deviceIcon(type) {
  return type === 'Smartphone' ? 'phone' : type === 'Computer' ? 'computer' : 'speaker';
}

function nowPlaying(st) {
  const it = st?.item;
  if (!it) return null;
  return {
    title: it.name,
    artist: it.artists ? it.artists.map((a) => a.name).join(', ') : it.show?.name || '',
    art: (it.album?.images || it.images || [])[1]?.url || (it.album?.images || it.images || [])[0]?.url || '',
    playing: st.is_playing,
    device: st.device,
  };
}

async function refreshMusic() {
  if (!spotify.connected) { musicState = null; renderMiniBars(); return; }
  try {
    musicState = await spotify.state();
  } catch (e) {
    if (e.status === 401 || e.reason === 'invalid_grant') spotify.logout();
    musicState = null;
  }
  renderMiniBars();
}

function startMusicPolling() {
  clearInterval(musicTimer);
  if (!spotify.connected) return renderMiniBars();
  refreshMusic();
  musicTimer = setInterval(() => { if (!document.hidden) refreshMusic(); }, 5000);
}

async function musicCmd(fn) {
  try {
    await fn();
    setTimeout(refreshMusic, 350);
  } catch (e) {
    toast(e.message);
  }
}

function renderMiniBars() {
  const np = nowPlaying(musicState);
  for (const bar of [$('#home-music'), $('#s-music')]) {
    if (!spotify.configured && bar.id === 'home-music') { bar.hidden = true; continue; }
    bar.hidden = false;
    if (!spotify.connected) {
      bar.innerHTML = `<button class="connect"><span class="spot">${icon('spotify')}</span>Connect Spotify</button>`;
      bar.querySelector('.connect').onclick = openMusic;
      continue;
    }
    if (!np) {
      bar.innerHTML = `<button class="connect"><span class="spot">${icon('spotify')}</span>Pick something to play</button>`;
      bar.querySelector('.connect').onclick = openMusic;
      continue;
    }
    bar.innerHTML = `
      ${np.art ? `<img src="${esc(np.art)}" alt="">` : '<div class="art"></div>'}
      <button class="meta" data-act="open" style="text-align:left"><div class="t">${esc(np.title)}</div><div class="a">${esc(np.artist)}</div></button>
      <button class="mb" data-act="prev">${icon('prev')}</button>
      <button class="mb main" data-act="pp">${icon(np.playing ? 'pause' : 'play')}</button>
      <button class="mb" data-act="next">${icon('next')}</button>`;
    bar.querySelector('[data-act=open]').onclick = openMusic;
    bar.querySelector('[data-act=prev]').onclick = () => musicCmd(() => spotify.previous());
    bar.querySelector('[data-act=next]').onclick = () => musicCmd(() => spotify.next());
    bar.querySelector('[data-act=pp]').onclick = () => musicCmd(() => (np.playing ? spotify.pause() : spotify.play()));
  }
  $('#btn-music').classList.toggle('on', !!np?.playing);
  $('#s-music-btn').classList.toggle('on', !!np?.playing);
  if ($('#session').hidden) $('#s-music').hidden = true;
}

function openMusic() {
  if (!spotify.configured) return openSpotifySetup();
  if (!spotify.connected) {
    return openSheet(`
      <h3>Music</h3>
      <p class="lead">Connect once and control Spotify right here: see what's playing, skip tracks, pick playlists and choose your speaker, without leaving your workout.</p>
      <button class="btn-spotify" data-act="login">${icon('spotify')} Connect Spotify</button>
      <p class="lead" style="margin-top:14px;font-size:13px">Needs Spotify Premium (Spotify's rule for remote control). Have the Spotify app installed on this phone.</p>
      <button class="ghost" data-act="setup">Change Spotify Client ID</button>`, (body) => {
      body.querySelector('[data-act=login]').onclick = () => spotify.login();
      body.querySelector('[data-act=setup]').onclick = openSpotifySetup;
    });
  }
  openSheet('<h3>Music</h3><p class="lead">Loading…</p>', (body) => {
    let alive = true;
    const draw = async () => {
      let st = null, devices = [], lists = [];
      try {
        [st, devices, lists] = await Promise.all([spotify.state(), spotify.devices(), spotify.playlists()]);
      } catch (e) {
        if (!alive) return;
        body.innerHTML = `<h3>Music</h3><p class="lead">${esc(e.message)}</p><button class="ghost" data-act="retry">Try again</button>`;
        body.querySelector('[data-act=retry]').onclick = draw;
        return;
      }
      if (!alive) return;
      musicState = st;
      renderMiniBars();
      const np = nowPlaying(st);
      body.innerHTML = `
        <h3>Music</h3>
        ${np ? `<div class="np">${np.art ? `<img src="${esc(np.art)}" alt="">` : '<div class="art"></div>'}
          <div><div class="t">${esc(np.title)}</div><div class="a">${esc(np.artist)}</div>
          <div class="a">on ${esc(np.device?.name || 'Spotify')}</div></div></div>
          <div class="np-ctl">
            <button class="ctl" data-act="shuffle" style="${st.shuffle_state ? 'color:var(--spotify)' : ''}">${icon('shuffle')}</button>
            <button class="ctl" data-act="prev">${icon('prev')}</button>
            <button class="ctl big" data-act="pp">${icon(np.playing ? 'pause' : 'play')}</button>
            <button class="ctl" data-act="next">${icon('next')}</button>
          </div>`
        : `<p class="lead">Nothing playing yet. Pick a playlist below.</p>`}
        <p class="group-title">Play on</p>
        <div class="group">${devices.length ? devices.map((d) => `
          <button class="item ${d.is_active ? 'active' : ''}" data-dev="${esc(d.id)}">${icon(deviceIcon(d.type))}
            <div class="grow">${esc(d.name)}<small>${esc(d.type)}${d.is_active ? ' · playing here' : ''}</small></div></button>`).join('')
          : `<div class="item"><div class="grow"><small style="font-size:13px">No devices found. Open the Spotify app once (it can stay in the background), then come back. Bluetooth speakers and AirPods connected to your iPhone play whatever "This iPhone" plays.</small></div></div>`}
        </div>
        <p class="group-title">Your playlists</p>
        <div class="group">${lists.map((p) => `
          <button class="item" data-uri="${esc(p.uri)}">${p.images?.[0]?.url ? `<img src="${esc(p.images[p.images.length - 1].url)}" alt="">` : '<img alt="">'}
            <div class="grow">${esc(p.name)}<small>${p.tracks?.total ?? p.items?.total ?? ''} songs</small></div></button>`).join('') || '<div class="item"><small>No playlists found.</small></div>'}
        </div>
        <button class="ghost" data-act="logout">Disconnect Spotify</button>`;
      const on = (sel, fn) => body.querySelectorAll(sel).forEach((b) => (b.onclick = () => fn(b)));
      const act = (fn) => musicCmd(async () => { await fn(); setTimeout(draw, 500); });
      on('[data-act=prev]', () => act(() => spotify.previous()));
      on('[data-act=next]', () => act(() => spotify.next()));
      on('[data-act=pp]', () => act(() => (np?.playing ? spotify.pause() : spotify.play())));
      on('[data-act=shuffle]', () => act(() => spotify.shuffle(!st?.shuffle_state)));
      on('[data-dev]', (b) => act(() => spotify.transfer(b.dataset.dev)));
      on('[data-uri]', (b) => act(async () => { await spotify.play(b.dataset.uri); toast('Playing'); }));
      on('[data-act=logout]', () => { spotify.logout(); closeSheet(); startMusicPolling(); toast('Spotify disconnected'); });
    };
    draw();
    return () => { alive = false; };
  });
}

function openSpotifySetup() {
  openSheet(`
    <h3>Set up Spotify</h3>
    <p class="lead">One-time, about 2 minutes. You only need to do this once; paste the ID into <code>config.js</code> and everyone you share the app with skips this step.</p>
    <ol class="steps">
      <li>Go to <b>developer.spotify.com/dashboard</b> and log in.</li>
      <li>Create app → any name. Redirect URI:<br><code>${esc(appUrl())}</code></li>
      <li>Tick <b>Web API</b>, save, then copy the <b>Client ID</b>.</li>
      <li>Friends: add their Spotify emails under <b>User Management</b>.</li>
    </ol>
    <p class="group-title">Client ID</p>
    <input class="field" id="cid" placeholder="e.g. 3f9a…" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(settings.clientId)}">
    <div class="row-btns"><button class="primary" data-act="save" style="height:50px;font-size:16px">Save</button><button class="ghost" data-act="copy">Copy URI</button></div>`, (body) => {
    body.querySelector('[data-act=copy]').onclick = () => copy(appUrl());
    body.querySelector('[data-act=save]').onclick = () => {
      settings.clientId = body.querySelector('#cid').value.trim();
      saveSettings();
      spotify = new Spotify(window.ABW_CONFIG?.spotifyClientId || settings.clientId);
      renderMiniBars();
      if (spotify.configured) openMusic(); else closeSheet();
    };
  });
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
  if (!document.hidden) refreshMusic();
});

function buildSegments() {
  $('#s-progress').innerHTML = EXERCISES.map(() => '<i></i>').join('');
}

async function startWorkout() {
  coach.unlock();
  coach.setMixing(settings.mix);
  const btn = $('#btn-start');
  btn.disabled = true;
  try {
    await coach.load(settings.voice);
  } catch {
    toast('Could not load the coach voice. Check your connection once, then it works offline.');
  } finally {
    btn.disabled = false;
  }
  if (settings.autoMusic && spotify.connected && !musicState?.is_playing) {
    spotify.play().then(() => setTimeout(refreshMusic, 600)).catch((e) => toast(e.message));
  }
  closeSheet();
  buildSegments();
  $('#home').hidden = true;
  $('#done').hidden = true;
  $('#session').hidden = false;
  renderMiniBars();
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
  keepAwake(false);
  animated.clear();
  $('#session').hidden = true;
  $('#done').hidden = false;
  $('#done-time').textContent = fmt(totalSec);
}

function endWorkout() {
  workout?.quit();
  workout = null;
  keepAwake(false);
  animated.clear();
  $('#session').hidden = true;
  $('#done').hidden = true;
  $('#home').hidden = false;
  renderMiniBars();
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
$('#btn-music').onclick = openMusic;
$('#btn-share').onclick = openShare;
$('#s-music-btn').onclick = openMusic;
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

// Finish a Spotify sign-in if we just came back from it.
spotify.handleRedirect()
  .then((handled) => { if (handled) { toast('Spotify connected'); openMusic(); } })
  .catch((e) => toast(e.message))
  .finally(startMusicPolling);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
