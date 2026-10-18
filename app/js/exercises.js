// The ten moves in Workout #1, with coaching text and the keyframes that
// drive the animated coach. Pose angles are in degrees, counter-clockwise
// from "pointing right" (feet side). Torso angle t points hip -> shoulder;
// arm angles are relative to the torso, leg angles are absolute.

// Lying on the back, knees bent, feet flat, hands cradling the head.
const LIE = {
  hx: 196, hy: 165, t: 180, n: 0,
  aU: -58, aF: 62, bU: -48, bF: 66,
  lT: 50, lS: -77, mT: 54, mS: -80,
  e: 0, prone: 0,
};

const pose = (over) => ({ ...LIE, ...over });

// Elbow driven across toward the opposite knee.
const CROSS_ARM = { U: -150, F: 12 };

export const EXERCISES = [
  {
    id: 'basic_crunch',
    name: 'Basic Crunch',
    target: 'Upper abs',
    cue: 'Feet flat, hands behind your head. Lift your shoulders off the mat, then lower slowly.',
    frames: [
      { p: pose({}), d: 0.9 },
      { p: pose({ t: 148, n: -8, e: 1 }), d: 0.9 },
    ],
  },
  {
    id: 'right_oblique',
    name: 'Right Oblique Crunch',
    target: 'Right obliques',
    cue: 'Bring your right elbow across toward your left knee, and squeeze your side.',
    frames: [
      { p: pose({}), d: 0.95 },
      { p: pose({ t: 140, n: -10, aU: CROSS_ARM.U, aF: CROSS_ARM.F, mT: 74, mS: -40, e: 1 }), d: 0.95 },
    ],
  },
  {
    id: 'left_oblique',
    name: 'Left Oblique Crunch',
    target: 'Left obliques',
    cue: 'Bring your left elbow across toward your right knee, and squeeze.',
    frames: [
      { p: pose({}), d: 0.95 },
      { p: pose({ t: 140, n: -10, bU: CROSS_ARM.U, bF: CROSS_ARM.F, lT: 74, lS: -40, e: 1 }), d: 0.95 },
    ],
  },
  {
    id: 'bicycle',
    name: 'Bicycle Crunch',
    target: 'Obliques & lower abs',
    cue: 'Hands behind your head. Pedal your legs, and twist elbow to opposite knee.',
    frames: [
      { p: pose({ t: 146, n: -8, bU: CROSS_ARM.U, bF: CROSS_ARM.F, lT: 112, lS: 18, mT: 14, mS: 10, e: 1 }), d: 0.7 },
      { p: pose({ t: 146, n: -8, aU: CROSS_ARM.U, aF: CROSS_ARM.F, lT: 14, lS: 10, mT: 112, mS: 18, e: 1 }), d: 0.7 },
    ],
  },
  {
    id: 'reverse',
    name: 'Reverse Crunch',
    target: 'Lower abs',
    cue: 'Knees up at ninety degrees. Curl your hips off the mat, and pull your knees to your chest.',
    frames: [
      { p: pose({ aU: -178, aF: -180, bU: -176, bF: -180, lT: 90, lS: 0, mT: 94, mS: 2 }), d: 0.95 },
      { p: pose({ hy: 156, t: 189, aU: -187, aF: -189, bU: -185, bF: -189, lT: 132, lS: 36, mT: 136, mS: 38, e: 1 }), d: 0.95 },
    ],
  },
  {
    id: 'long_arm',
    name: 'Long Arm Crunch',
    target: 'Upper abs',
    cue: 'Arms straight overhead, biceps by your ears. Crunch up, and keep those arms long.',
    frames: [
      { p: pose({ aU: -14, aF: -6, bU: -10, bF: -4 }), d: 0.9 },
      { p: pose({ t: 150, n: -6, aU: -16, aF: -8, bU: -12, bF: -6, e: 1 }), d: 0.9 },
    ],
  },
  {
    id: 'crossover',
    name: 'Crossover Crunch',
    target: 'Obliques',
    cue: 'Cross your right ankle over your left knee. Bring your left elbow toward your right knee.',
    frames: [
      { p: pose({ lT: 86, lS: -22 }), d: 0.95 },
      { p: pose({ t: 142, n: -10, lT: 86, lS: -22, bU: CROSS_ARM.U, bF: CROSS_ARM.F, e: 1 }), d: 0.95 },
    ],
  },
  {
    id: 'half_curl',
    name: 'Half Curl',
    target: 'Upper abs',
    cue: 'Reach your hands toward your knees. Curl halfway up, pause, and lower with control.',
    frames: [
      { p: pose({ aU: -176, aF: -176, bU: -172, bF: -172 }), d: 1.0 },
      { p: pose({ t: 154, n: -10, aU: -140, aF: -140, bU: -137, bF: -137, e: 1 }), d: 0.8, hold: 0.5 },
    ],
  },
  {
    id: 'vertical_leg',
    name: 'Vertical Leg Crunch',
    target: 'Upper & lower abs',
    cue: 'Legs straight up toward the ceiling. Crunch up, and reach your chest toward your feet.',
    frames: [
      { p: pose({ hx: 200, lT: 86, lS: 86, mT: 90, mS: 90 }), d: 0.9 },
      { p: pose({ hx: 200, t: 146, n: -8, lT: 86, lS: 86, mT: 90, mS: 90, e: 1 }), d: 0.9 },
    ],
  },
  {
    id: 'plank',
    name: 'Plank',
    target: 'Full core',
    cue: 'Forearms down, elbows under your shoulders. Keep one straight line from head to heels, and hold.',
    frames: [
      { p: pose({ hx: 176, hy: 156.5, t: 169.5, n: 4, aU: 100.5, aF: 10.5, bU: 100.5, bF: 14, lT: -10.5, lS: -10.5, mT: -10.5, mS: -10.5, e: 0.6, prone: 1 }), d: 1.6 },
      { p: pose({ hx: 176, hy: 157.5, t: 169.0, n: 4, aU: 101, aF: 11, bU: 101, bF: 14.5, lT: -10.8, lS: -10.8, mT: -10.8, mS: -10.8, e: 1, prone: 1 }), d: 1.6 },
    ],
  },
];

const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

// Interpolated pose for an exercise at time `sec` (loops forever).
export function poseAt(ex, sec) {
  const segs = ex.frames.map((f) => (f.d || 1) + (f.hold || 0));
  const cycle = segs.reduce((a, b) => a + b, 0);
  let t = ((sec % cycle) + cycle) % cycle;
  let i = 0;
  while (t > segs[i]) { t -= segs[i]; i++; }
  const from = ex.frames[i];
  const to = ex.frames[(i + 1) % ex.frames.length];
  const hold = from.hold || 0;
  const k = t <= hold ? 0 : ease(Math.min(1, (t - hold) / (from.d || 1)));
  const out = {};
  for (const key in from.p) out[key] = from.p[key] + (to.p[key] - from.p[key]) * k;
  return out;
}

// The "peak" pose, used for still thumbnails.
export const peakPose = (ex) => ex.frames[ex.frames.length > 1 ? 1 : 0].p;
