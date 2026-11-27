#!/usr/bin/env node
// Motion values for a sheet, computed rather than drawn by eye.
//
//   node motion-frames.mjs --curve "0, 0, .2, 1" --duration 200 [--frames 5] [--from 0 --to 1] [--delay 0]
//       Frame values along a cubic-bezier (the four numbers of a --ui-ease-* token):
//       time, eased progress, and the interpolated value at each frame.
//
//   node motion-frames.mjs --spring 0.75 [--points 41] [--settle 0.001]
//       A damped spring (damping ratio, 0–1) sampled as a CSS linear() easing that
//       settles within `settle` of its target by the end of whatever duration it
//       runs over — how --ui-ease-spring was made. Prints the overshoot, when it
//       peaks and when it reaches 90%, so the curve can be compared with the one
//       it replaces before anyone adopts it.
//
// No dependencies: it runs in a cold clone, an app, or anywhere with Node.

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = (t) => ((ax * t + bx) * t + cx) * t;
  const y = (t) => ((ay * t + by) * t + cy) * t;
  return (progress) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (x(mid) < progress) lo = mid;
      else hi = mid;
    }
    return y((lo + hi) / 2);
  };
}

function spring(damping, omega) {
  const wd = omega * Math.sqrt(1 - damping * damping);
  return (t) => 1 - Math.exp(-damping * omega * t) * (Math.cos(wd * t) + ((damping * omega) / wd) * Math.sin(wd * t));
}

const round = (n, places = 3) => Number(n.toFixed(places));

if (flag("spring") !== undefined) {
  const damping = Number(flag("spring"));
  const points = Number(flag("points", 41));
  const settle = Number(flag("settle", 0.001));
  if (!(damping > 0 && damping < 1)) throw new Error("--spring takes a damping ratio between 0 and 1 (0.75 is a small, single settle)");
  // The smallest stiffness that is at rest within `settle` over the last 5% of the duration.
  let omega = 1;
  const settled = (w) => {
    const f = spring(damping, w);
    for (let ms = 950; ms <= 1000; ms++) if (Math.abs(f(ms / 1000) - 1) >= settle) return false;
    return true;
  };
  while (!settled(omega) && omega < 200) omega += 0.1;
  const f = spring(damping, omega);
  const values = Array.from({ length: points }, (_, i) => (i === points - 1 ? 1 : f(i / (points - 1))));
  const peak = Math.max(...values);
  const at90 = (() => {
    for (let ms = 0; ms <= 1000; ms++) if (f(ms / 1000) >= 0.9) return ms / 1000;
    return 1;
  })();
  console.log(`damping ${damping} · stiffness ${round(omega, 1)} · overshoot ${round((peak - 1) * 100, 1)}% at ${round(values.indexOf(peak) / (points - 1), 2)} · 90% at ${at90}`);
  console.log(`linear(${values.map((v, i) => (i === 0 ? "0" : String(round(v)))).join(", ")})`);
} else {
  const curve = String(flag("curve", "0, 0, .2, 1")).replace(/^cubic-bezier\(|\)$/g, "").split(",").map(Number);
  if (curve.length !== 4 || curve.some(Number.isNaN)) throw new Error('--curve takes the four numbers of a cubic-bezier, e.g. "0, 0, .2, 1"');
  const ease = cubicBezier(...curve);
  const duration = Number(flag("duration", 200));
  const frames = Number(flag("frames", 5));
  const from = Number(flag("from", 0));
  const to = Number(flag("to", 1));
  const delay = Number(flag("delay", 0));
  console.log(`cubic-bezier(${curve.join(", ")}) over ${duration}ms${delay ? ` after ${delay}ms` : ""}, ${from} → ${to}`);
  for (let i = 0; i < frames; i++) {
    const ms = Math.round(((delay + duration) * i) / (frames - 1));
    const p = ms <= delay ? 0 : ease(Math.min(1, (ms - delay) / duration));
    console.log(`  ${String(ms).padStart(4)}ms  progress ${round(p, 2).toFixed(2)}  value ${round(from + (to - from) * p, 2)}`);
  }
}
