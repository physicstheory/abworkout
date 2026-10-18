// Cartoon coach drawn in SVG from a pose (see exercises.js for the angle
// conventions). One Figure owns one <svg>; call draw(pose) every frame.

const NS = 'http://www.w3.org/2000/svg';
const L = { torso: 58, neck: 9, head: 12.5, upper: 26, fore: 24, thigh: 38, shin: 36 };
const FLOOR = 176;

const rad = (d) => (d * Math.PI) / 180;
const step = (o, ang, len) => ({ x: o.x + len * Math.cos(rad(ang)), y: o.y - len * Math.sin(rad(ang)) });
const pts = (...p) => 'M' + p.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' L');

let uid = 0;

export class Figure {
  constructor(svg) {
    this.svg = svg;
    const id = `fg${uid++}`;
    svg.setAttribute('viewBox', '60 70 220 120');
    svg.innerHTML = `
      <defs>
        <radialGradient id="${id}glow">
          <stop offset="0" stop-color="#ff5a7a" stop-opacity=".95"/>
          <stop offset=".55" stop-color="#ff3d6e" stop-opacity=".35"/>
          <stop offset="1" stop-color="#ff3d6e" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="${id}mat" x1="0" x2="1">
          <stop offset="0" stop-color="#2a2f45"/><stop offset="1" stop-color="#363c58"/>
        </linearGradient>
      </defs>
      <ellipse class="shadow" cx="180" cy="${FLOOR + 2}" rx="78" ry="4" fill="#000" opacity=".25"/>
      <rect x="78" y="${FLOOR}" width="200" height="6" rx="3" fill="url(#${id}mat)"/>
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path data-k="mLeg" stroke="#252a4a" stroke-width="10.5"/>
        <path data-k="bArm" stroke="#d9a885" stroke-width="7.5"/>
        <circle data-k="mShoe" r="5" fill="#c9cfe0"/>
        <path data-k="torso" stroke="#4d68ff" stroke-width="18"/>
        <path data-k="shorts" stroke="#30365f" stroke-width="18.5"/>
        <ellipse data-k="glow" rx="17" ry="9" fill="url(#${id}glow)"/>
        <path data-k="lLeg" stroke="#353c6b" stroke-width="10.5"/>
        <circle data-k="lShoe" r="5.2" fill="#f4f6fb"/>
        <path data-k="pony" stroke="#3b2a22" stroke-width="7"/>
        <circle data-k="head" r="${L.head}" fill="#f2c4a0"/>
        <path data-k="hair" fill="#3b2a22"/>
        <circle data-k="eye" r="1.6" fill="#1b1d2a"/>
        <path data-k="aArm" stroke="#f2c4a0" stroke-width="7.5"/>
      </g>`;
    this.el = {};
    svg.querySelectorAll('[data-k]').forEach((n) => (this.el[n.dataset.k] = n));
  }

  draw(p) {
    const e = this.el;
    const hip = { x: p.hx, y: p.hy };
    const sh = step(hip, p.t, L.torso);
    const neckA = p.t + p.n;
    const hc = step(sh, neckA, L.neck + L.head);

    // Arms relative to torso, legs absolute.
    const limb = (o, a1, l1, a2, l2) => { const m = step(o, a1, l1); return [o, m, step(m, a2, l2)]; };
    const aArm = limb(sh, p.t + p.aU, L.upper, p.t + p.aF, L.fore);
    const bArm = limb(step(sh, p.t - 90, 1.5), p.t + p.bU, L.upper, p.t + p.bF, L.fore);
    const lLeg = limb(hip, p.lT, L.thigh, p.lS, L.shin);
    const mLeg = limb(step(hip, p.t + 90, 1), p.mT, L.thigh, p.mS, L.shin);

    e.torso.setAttribute('d', pts(step(hip, p.t, 14), sh));
    e.shorts.setAttribute('d', pts(hip, step(hip, p.t, 13)));
    e.aArm.setAttribute('d', pts(...aArm));
    e.bArm.setAttribute('d', pts(...bArm));
    e.lLeg.setAttribute('d', pts(...lLeg));
    e.mLeg.setAttribute('d', pts(...mLeg));
    const shoe = (el, leg, a) => { const f = step(leg[2], a, 1.5); el.setAttribute('cx', f.x); el.setAttribute('cy', f.y); };
    shoe(e.lShoe, lLeg, p.lS);
    shoe(e.mShoe, mLeg, p.mS);

    // Ab "burn" glow sits on the lower torso and pulses with effort.
    const g = step(hip, p.t, 24);
    e.glow.setAttribute('cx', g.x);
    e.glow.setAttribute('cy', g.y);
    e.glow.setAttribute('transform', `rotate(${-p.t} ${g.x} ${g.y})`);
    e.glow.setAttribute('opacity', (0.15 + 0.85 * p.e).toFixed(2));

    // Head: face points up when lying, toward the floor in plank.
    e.head.setAttribute('cx', hc.x);
    e.head.setAttribute('cy', hc.y);
    const face = p.prone ? neckA + 70 : neckA - 90;
    const eye = step(step(hc, face, 6.5), neckA, 3.5);
    e.eye.setAttribute('cx', eye.x);
    e.eye.setAttribute('cy', eye.y);
    // Hair covers the crown and back of the head; ponytail hangs off it.
    const hairDir = face + 180 + (p.prone ? 50 : -45);
    const arc = [];
    for (let a = -100; a <= 100; a += 10) arc.push(step(hc, hairDir + a, L.head + 0.6));
    e.hair.setAttribute('d', pts(...arc) + 'Z');
    const tail0 = step(hc, hairDir, L.head - 2);
    const tail1 = step(tail0, p.prone ? hairDir + 30 : neckA + 4, 9);
    const tail2 = step(tail1, p.prone ? hairDir - 10 : neckA + 14, 7);
    e.pony.setAttribute('d', pts(tail0, tail1, tail2));
  }
}
