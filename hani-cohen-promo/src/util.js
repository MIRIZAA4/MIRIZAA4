export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
// normalized progress of t inside [a, b]
export const rng = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);

export const ease = {
  inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  out: (x) => 1 - Math.pow(1 - x, 3),
  in: (x) => x * x * x,
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// piecewise keyframes: [[t, value], ...] with per-segment easing
export function keys(t, frames, e = ease.inOut) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 0; i < frames.length - 1; i++) {
    const [t0, v0] = frames[i], [t1, v1] = frames[i + 1];
    if (t <= t1) {
      const k = (frames[i + 1][2] || e)((t - t0) / (t1 - t0));
      if (Array.isArray(v0)) return v0.map((v, j) => lerp(v, v1[j], k));
      return lerp(v0, v1, k);
    }
  }
  return frames[frames.length - 1][1];
}

// window envelope: 0 before a, rises over fin, holds, falls over fout before b
export function env(t, a, b, fin = 0.3, fout = 0.3) {
  if (t < a || t > b) return 0;
  return Math.min(fin > 0 ? clamp((t - a) / fin) : 1, fout > 0 ? clamp((b - t) / fout) : 1);
}

export function shake(t, amp, freq = 18, seed = 1) {
  return [
    Math.sin(t * freq * 1.3 + seed) * Math.sin(t * freq * 0.7 + seed * 2) * amp,
    Math.sin(t * freq * 1.1 + seed * 3) * Math.cos(t * freq * 0.9 + seed) * amp,
  ];
}
