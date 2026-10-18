// Offline-first: everything (including every voice clip) is cached on first
// visit, so the app opens instantly afterwards, even with no signal.
// BUILD is stamped by the deploy workflow so each release refreshes the cache.
const BUILD = 'dev';
const CACHE = `abw-${BUILD}`;
const SHELL = [
  './', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/exercises.js', 'js/figure.js', 'js/audio.js', 'js/workout.js', 'js/spotify.js',
  'vendor/qrcode.mjs', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'audio/manifest.json', 'audio/silence.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Bypass the browser's HTTP cache so a new version never stores stale
    // files (e.g. an old sound list missing newly recorded clips).
    const fresh = (urls) => urls.map((u) => new Request(u, { cache: 'reload' }));
    await cache.addAll(fresh(SHELL));
    const m = await (await cache.match('audio/manifest.json')).json();
    const clips = [];
    for (const voice of Object.keys(m.voices)) {
      for (const [clip, n] of Object.entries(m.clips)) {
        for (let i = 0; i < n; i++) clips.push(`audio/${voice}/${clip}_${i}.mp3`);
      }
    }
    await cache.addAll(fresh(clips));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Ignore ?code=... from the Spotify redirect when matching the page.
    const hit = await cache.match(e.request, { ignoreSearch: e.request.mode === 'navigate' });
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch {
      return e.request.mode === 'navigate' ? cache.match('index.html') : Response.error();
    }
  })());
});
