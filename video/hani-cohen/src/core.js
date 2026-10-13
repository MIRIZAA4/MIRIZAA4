// core.js — math, easing, palette, kinetic type and blueprint drawing helpers
'use strict';

const W = 1080, H = 1920, CX = W / 2, CY = H / 2;

const C = {
  bg0: '#1c0d15', bg1: '#3A1F2B', bg2: '#5b3043',
  rose: '#E8B4C0', blush: '#F3CED6', champ: '#F6E7DC',
  gold: '#C9A25E', goldL: '#F1D9A0', goldD: '#8E6A2F', ink: '#24111a',
};

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: t => t,
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  in: t => t * t * t,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
};
// window of visibility: fades in over [a, a+fi], out over [b-fo, b]
const win = (t, a, b, fi = .5, fo = .5) => Math.min(prog(t, a, a + fi), 1 - prog(t, b - fo, b));

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}

function roundRect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// metallic gold gradient across a box with a moving sheen band (sheen 0..1, <0 = none)
function goldGrad(g, x0, y0, x1, y1, sheen = -1) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, C.goldD);
  gr.addColorStop(.28, C.gold);
  gr.addColorStop(.5, C.goldL);
  gr.addColorStop(.72, C.gold);
  gr.addColorStop(1, C.goldD);
  if (sheen < 0) return gr;
  const s = clamp(sheen, 0.001, 0.999), w = .07;
  const g2 = g.createLinearGradient(x0, y0, x1, y1);
  const stops = [[0, C.goldD], [.28, C.gold], [.5, C.goldL], [.72, C.gold], [1, C.goldD]];
  const col = p => { // sample base gradient
    for (let i = 1; i < stops.length; i++) if (p <= stops[i][0]) return stops[i - 1][1];
    return C.goldD;
  };
  g2.addColorStop(0, C.goldD);
  if (s - w > .02) g2.addColorStop(s - w, col(s - w));
  g2.addColorStop(s, '#FFF6DE');
  if (s + w < .98) g2.addColorStop(s + w, col(s + w));
  g2.addColorStop(1, C.goldD);
  return g2;
}

// ---------- fonts
const F = {
  serif: (s, w = 700) => `${w} ${s}px "Frank Ruhl Libre"`,
  sans: (s, w = 400) => `${w} ${s}px "Heebo"`,
  mono: (s, w = 400) => `${w} ${s}px "IBM Plex Mono"`,
};

// ---------- kinetic typography (RTL, per glyph)
// t: seconds-like local time in beats since the word starts. opts.out: local time when exit begins.
function kText(g, str, x, y, o = {}) {
  const size = o.size || 120;
  const font = o.font || F.serif(size, o.weight || 700);
  const stagger = o.stagger ?? .06, dur = o.dur ?? .7;
  const t = o.t ?? 99;
  if (t < 0) return;
  const mode = o.mode || 'rise';
  const track = o.track || 0;
  g.save();
  g.font = font;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'right';
  const chars = [...str];
  const widths = chars.map(c => g.measureText(c).width + track);
  const total = widths.reduce((a, b) => a + b, 0) - track;
  let right = o.align === 'right' ? x : o.align === 'left' ? x + total : x + total / 2;
  const asc = size * .75;
  const fill = o.fill || 'gold';
  let fs;
  if (fill === 'gold') fs = goldGrad(g, right - total, y - asc, right, y + size * .1, o.sheen ?? ((t * .35) % 1.6 - .3));
  else fs = fill;
  if (o.glow !== false) { g.shadowColor = o.glowColor || rgba(C.gold, .45); g.shadowBlur = o.glowBlur ?? size * .25; }
  let cum = 0;
  const n = chars.length;
  for (let i = 0; i < n; i++) {
    const ch = chars[i];
    const cx = right - cum; cum += widths[i];
    if (ch === ' ') continue;
    const order = o.reverse ? n - 1 - i : i;
    const lt = t - order * stagger;
    let p = clamp(lt / dur);
    if (p <= 0) continue;
    let a = 1, dy = 0, sc = 1, rot = 0, sx = 1;
    if (mode === 'rise') { const e = E.outExpo(p); a = clamp(p * 2); dy = (1 - e) * size * .55; sc = lerp(.85, 1, e); }
    else if (mode === 'stamp') { const e = E.outBack(p); a = clamp(p * 3); sc = lerp(1.8, 1, clamp(e, 0, 1.2)); }
    else if (mode === 'drop') { const e = E.outBack(p); a = clamp(p * 2.5); dy = -(1 - e) * size * .9; rot = (1 - E.out(p)) * (order % 2 ? .25 : -.25); }
    else if (mode === 'flip') { const e = E.outExpo(p); a = clamp(p * 2); sx = Math.max(.02, e); dy = (1 - e) * size * .2; }
    else if (mode === 'type') { a = p > 0 ? 1 : 0; }
    if (o.out !== undefined && t > o.out) {
      const q = clamp((t - o.out - order * stagger * .5) / (o.outDur ?? .5));
      const e = E.in(q);
      a *= 1 - q; dy -= e * size * .5; sc *= lerp(1, 1.06, e);
    }
    if (a <= 0.003) continue;
    g.globalAlpha = a * (o.alpha ?? 1);
    g.save();
    const w = widths[i] - track;
    g.translate(cx - w / 2, y + dy - asc * .35);
    g.rotate(rot);
    g.scale(sc * sx, sc);
    g.fillStyle = fs;
    // fill style gradient is in canvas space: undo transform for gradient by drawing via fill with matrix trick
    g.translate(-(cx - w / 2), -(y - asc * .35));
    g.fillText(ch, cx, y);
    g.restore();
  }
  g.restore();
  return total;
}

function measure(g, str, font) { g.save(); g.font = font; const w = g.measureText(str).width; g.restore(); return w; }

// plain label (mono / sans), supports rtl via canvas direction
function label(str, x, y, o = {}) {
  g.save();
  g.font = o.font || F.mono(22);
  g.fillStyle = o.color || rgba(C.goldL, .85);
  g.textAlign = o.align || 'center';
  g.textBaseline = o.baseline || 'middle';
  g.direction = o.rtl ? 'rtl' : 'ltr';
  g.globalAlpha *= o.alpha ?? 1;
  if (o.track) g.letterSpacing = o.track + 'px';
  if (o.glow) { g.shadowColor = rgba(C.gold, .6); g.shadowBlur = o.glow; }
  g.fillText(str, x, y);
  g.restore();
}

// ---------- blueprint primitives
function bp(g, a = .8, lw = 1.6, col = C.goldL) { g.strokeStyle = rgba(col, a); g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; }

function line(g, x1, y1, x2, y2, p = 1) {
  if (p <= 0) return;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(lerp(x1, x2, p), lerp(y1, y2, p)); g.stroke();
}
function circ(g, x, y, r, p = 1, start = -Math.PI / 2) {
  if (p <= 0 || r <= 0) return;
  g.beginPath(); g.arc(x, y, r, start, start + TAU * p); g.stroke();
}
function polyline(g, pts, p = 1, close = false) {
  if (p <= 0 || pts.length < 2) return;
  const segs = []; let L = 0;
  const all = close ? [...pts, pts[0]] : pts;
  for (let i = 1; i < all.length; i++) { const d = Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]); segs.push(d); L += d; }
  let rem = L * p;
  g.beginPath(); g.moveTo(all[0][0], all[0][1]);
  for (let i = 1; i < all.length; i++) {
    const d = segs[i - 1];
    if (rem >= d) { g.lineTo(all[i][0], all[i][1]); rem -= d; }
    else { const k = d ? rem / d : 0; g.lineTo(lerp(all[i - 1][0], all[i][0], k), lerp(all[i - 1][1], all[i][1], k)); break; }
  }
  g.stroke();
}
function rectP(g, x, y, w, h, p = 1) { polyline(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], p, true); }

function arrowHead(g, x, y, ang, s = 12) {
  g.beginPath();
  g.moveTo(x + Math.cos(ang + 2.7) * s, y + Math.sin(ang + 2.7) * s);
  g.lineTo(x, y);
  g.lineTo(x + Math.cos(ang - 2.7) * s, y + Math.sin(ang - 2.7) * s);
  g.stroke();
}

// dimension line between two points, offset perpendicular by `off`
function dim(g, x1, y1, x2, y2, txt, p = 1, off = 40, o = {}) {
  if (p <= 0) return;
  const ang = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(ang) * off, ny = Math.cos(ang) * off;
  const a = o.alpha ?? .75;
  g.save();
  bp(g, a * .55, 1.2);
  const pe = E.out(prog(p, 0, .35));
  line(g, x1, y1, x1 + nx * 1.15, y1 + ny * 1.15, pe);
  line(g, x2, y2, x2 + nx * 1.15, y2 + ny * 1.15, pe);
  bp(g, a, 1.4);
  const pm = E.inOut(prog(p, .2, .8));
  const mx = (x1 + x2) / 2 + nx, my = (y1 + y2) / 2 + ny;
  line(g, mx, my, x1 + nx, y1 + ny, pm);
  line(g, mx, my, x2 + nx, y2 + ny, pm);
  if (pm >= 1) { arrowHead(g, x1 + nx, y1 + ny, ang + Math.PI, 11); arrowHead(g, x2 + nx, y2 + ny, ang, 11); }
  const pt = prog(p, .6, 1);
  if (pt > 0 && txt) {
    g.translate(mx, my);
    let ta = ang; if (ta > Math.PI / 2 || ta < -Math.PI / 2) ta += Math.PI;
    g.rotate(ta);
    g.font = o.font || F.mono(21, 500);
    const tw = g.measureText(txt).width + 18;
    g.globalAlpha = pt;
    g.fillStyle = o.bg || 'rgba(40,20,30,.85)';
    g.fillRect(-tw / 2, -15, tw, 30);
    g.fillStyle = rgba(C.goldL, .95);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.direction = o.rtl ? 'rtl' : 'ltr';
    g.fillText(txt, 0, 1);
  }
  g.restore();
}

function crosshair(g, x, y, s, p = 1, a = .6) {
  g.save(); bp(g, a, 1.2);
  line(g, x - s, y, x + s, y, p); line(g, x, y - s, x, y + s, p);
  circ(g, x, y, s * .35, p);
  g.restore();
}

function corners(g, x, y, w, h, len, a = .8, lw = 2) {
  g.save(); bp(g, a, lw);
  g.beginPath();
  g.moveTo(x, y + len); g.lineTo(x, y); g.lineTo(x + len, y);
  g.moveTo(x + w - len, y); g.lineTo(x + w, y); g.lineTo(x + w, y + len);
  g.moveTo(x + w, y + h - len); g.lineTo(x + w, y + h); g.lineTo(x + w - len, y + h);
  g.moveTo(x + len, y + h); g.lineTo(x, y + h); g.lineTo(x, y + h - len);
  g.stroke(); g.restore();
}

// callout: dot at anchor, leader line, text
function callout(g, ax, ay, tx, ty, txt, p = 1, o = {}) {
  if (p <= 0) return;
  g.save();
  bp(g, .8, 1.3);
  g.fillStyle = rgba(C.goldL, .95);
  g.beginPath(); g.arc(ax, ay, 5 * E.outBack(prog(p, 0, .3)), 0, TAU); g.fill();
  circ(g, ax, ay, 13, prog(p, .05, .4));
  const elbowX = tx;
  const pl = E.inOut(prog(p, .15, .7));
  polyline(g, [[ax, ay], [elbowX, ty], [tx + (o.dir ?? 1) * 150, ty]], pl);
  const pt = prog(p, .55, 1);
  if (pt > 0) {
    g.globalAlpha = pt;
    g.font = o.font || F.sans(26, 400);
    g.fillStyle = rgba(C.champ, .95);
    g.direction = 'rtl';
    g.textAlign = (o.dir ?? 1) > 0 ? 'left' : 'right';
    g.textBaseline = 'bottom';
    const xx = (o.dir ?? 1) > 0 ? tx + 4 : tx - 4;
    g.textAlign = (o.dir ?? 1) > 0 ? 'right' : 'left';
    g.fillText(txt, (o.dir ?? 1) > 0 ? tx + 150 : tx - 150, ty - 8);
    if (o.sub) { g.font = F.mono(18); g.fillStyle = rgba(C.goldL, .75); g.textBaseline = 'top'; g.direction = 'ltr'; g.fillText(o.sub, (o.dir ?? 1) > 0 ? tx + 150 : tx - 150, ty + 8); }
    void xx;
  }
  g.restore();
}

// text drawn along a circle (ltr, clockwise starting at angle a0)
function circleText(g, str, x, y, r, a0, o = {}) {
  g.save();
  g.font = o.font || F.mono(16, 500);
  g.fillStyle = o.color || rgba(C.goldL, .8);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let a = a0;
  for (const ch of str) {
    const w = g.measureText(ch).width + (o.track ?? 2);
    a += w / 2 / r;
    g.save(); g.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
    a += w / 2 / r;
  }
  g.restore();
}

// draw image cover-fit into rect, with optional zoom (Ken Burns) and filter
function drawCover(g, img, x, y, w, h, zoom = 1, fx = .5, fy = .5) {
  const iw = img.width, ih = img.height;
  const s = Math.max(w / iw, h / ih) * zoom;
  const sw = w / s, sh = h / s;
  const sx = clamp((iw - sw) * fx, 0, iw - sw), sy = clamp((ih - sh) * fy, 0, ih - sh);
  g.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// sparkle star
function sparkle(g, x, y, s, a = 1, rot = 0) {
  if (a <= 0 || s <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha *= a;
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, s);
  gr.addColorStop(0, 'rgba(255,248,225,1)'); gr.addColorStop(.25, rgba(C.goldL, .6)); gr.addColorStop(1, rgba(C.gold, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,250,235,.95)';
  g.beginPath();
  const k = s * 1.6, q = s * .09;
  g.moveTo(0, -k); g.quadraticCurveTo(q, -q, k, 0); g.quadraticCurveTo(q, q, 0, k); g.quadraticCurveTo(-q, q, -k, 0); g.quadraticCurveTo(-q, -q, 0, -k);
  g.fill();
  g.restore();
}

// heart path centered at 0,0 with size s
function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s * .35);
  g.bezierCurveTo(x - s * .9, y - s * .25, x - s * .45, y - s * .95, x, y - s * .45);
  g.bezierCurveTo(x + s * .45, y - s * .95, x + s * .9, y - s * .25, x, y + s * .35);
  g.closePath();
}
