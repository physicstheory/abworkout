// Spotify remote control via the Web API with PKCE sign-in, so no server or
// client secret is needed. Music plays in the Spotify app (or on any Spotify
// Connect / Bluetooth speaker); this app shows it and controls it in place.

const API = 'https://api.spotify.com/v1';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');
const KEY = 'abw.spotify';

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export class SpotifyError extends Error {
  constructor(status, reason, message) { super(message); this.status = status; this.reason = reason; }
}

export class Spotify {
  constructor(clientId) {
    this.clientId = clientId;
    this.redirect = location.origin + location.pathname;
    try { this.tok = JSON.parse(localStorage.getItem(KEY)) || null; } catch { this.tok = null; }
  }

  get configured() { return !!this.clientId; }
  get connected() { return !!this.tok?.refresh_token; }

  save() {
    try { this.tok ? localStorage.setItem(KEY, JSON.stringify(this.tok)) : localStorage.removeItem(KEY); } catch {}
  }

  async login() {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    const state = b64url(crypto.getRandomValues(new Uint8Array(12)));
    sessionStorage.setItem('abw.pkce', JSON.stringify({ verifier, state }));
    localStorage.setItem('abw.pkce', JSON.stringify({ verifier, state }));
    const q = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirect,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      scope: SCOPES,
      state,
    });
    // Same-window navigation keeps the sign-in inside the home-screen app.
    location.href = `https://accounts.spotify.com/authorize?${q}`;
  }

  // Finish sign-in if we just came back from Spotify. Returns true if handled.
  async handleRedirect() {
    const q = new URLSearchParams(location.search);
    if (!q.has('code') && !q.has('error')) return false;
    history.replaceState(null, '', this.redirect);
    if (q.has('error')) throw new SpotifyError(0, q.get('error'), 'Spotify sign-in was cancelled.');
    const saved = JSON.parse(sessionStorage.getItem('abw.pkce') || localStorage.getItem('abw.pkce') || 'null');
    localStorage.removeItem('abw.pkce');
    if (!saved || saved.state !== q.get('state')) throw new SpotifyError(0, 'state', 'Sign-in expired, try again.');
    await this.token({
      grant_type: 'authorization_code',
      code: q.get('code'),
      redirect_uri: this.redirect,
      code_verifier: saved.verifier,
    });
    return true;
  }

  async token(body) {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.clientId, ...body }),
    });
    const j = await r.json();
    if (!r.ok) {
      if (body.grant_type === 'refresh_token') this.logout();
      throw new SpotifyError(r.status, j.error, j.error_description || 'Spotify sign-in failed.');
    }
    this.tok = {
      access_token: j.access_token,
      refresh_token: j.refresh_token || this.tok?.refresh_token,
      expires: Date.now() + (j.expires_in - 60) * 1000,
    };
    this.save();
  }

  logout() { this.tok = null; this.save(); }

  async call(method, path, body) {
    if (!this.connected) throw new SpotifyError(401, 'not_connected', 'Not connected to Spotify.');
    if (Date.now() > this.tok.expires) {
      await this.token({ grant_type: 'refresh_token', refresh_token: this.tok.refresh_token });
    }
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${this.tok.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (r.status === 204 || r.status === 202) return null;
    const text = await r.text();
    const j = text ? JSON.parse(text) : null;
    if (!r.ok) {
      const reason = j?.error?.reason || '';
      let msg = j?.error?.message || `Spotify error ${r.status}`;
      if (reason === 'NO_ACTIVE_DEVICE' || r.status === 404) msg = 'Open Spotify on your phone once so it shows up as a device.';
      if (reason === 'PREMIUM_REQUIRED') msg = 'Controlling playback needs Spotify Premium.';
      throw new SpotifyError(r.status, reason, msg);
    }
    return j;
  }

  state() { return this.call('GET', '/me/player?additional_types=episode'); }
  devices() { return this.call('GET', '/me/player/devices').then((j) => j?.devices || []); }
  playlists() { return this.call('GET', '/me/playlists?limit=50').then((j) => (j?.items || []).filter(Boolean)); }
  pause() { return this.call('PUT', '/me/player/pause'); }
  next() { return this.call('POST', '/me/player/next'); }
  previous() { return this.call('POST', '/me/player/previous'); }
  transfer(id) { return this.call('PUT', '/me/player', { device_ids: [id], play: true }); }
  shuffle(on, device) { return this.call('PUT', `/me/player/shuffle?state=${on}${device ? `&device_id=${device}` : ''}`); }

  // Resume, or start a playlist. Falls back to the first available device when
  // nothing is active (e.g. Spotify was idle in the background).
  async play(contextUri) {
    const body = contextUri ? { context_uri: contextUri } : undefined;
    try {
      return await this.call('PUT', '/me/player/play', body);
    } catch (e) {
      if (e.status !== 404 && e.reason !== 'NO_ACTIVE_DEVICE') throw e;
      const devs = await this.devices();
      const dev = devs.find((d) => d.type === 'Smartphone') || devs[0];
      if (!dev) throw e;
      return this.call('PUT', `/me/player/play?device_id=${dev.id}`, body);
    }
  }
}
