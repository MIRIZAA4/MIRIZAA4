import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Placeholder "photos": painterly backlit silhouettes in the brand palette.
// Real photos dropped in photos/ (listed in photos/manifest.json) replace them.
export const PW = 800, PH = 1000;

const PALETTES = {
  sunset: { sky: ['#f3b9c3', '#f39fa6', '#ffd39e'], ground: '#4c1a2c', sil: '#2a0d1a', glow: 'rgba(255,214,170,0.95)' },
  golden: { sky: ['#f7d6b8', '#f6ad86', '#ffe0a3'], ground: '#55212c', sil: '#2b0f18', glow: 'rgba(255,224,160,0.95)' },
  lavender: { sky: ['#d8c0e2', '#f0b2c6', '#ffd6c0'], ground: '#43203a', sil: '#241024', glow: 'rgba(255,215,200,0.95)' },
  dusk: { sky: ['#6e3d63', '#e48a98', '#ffcb9a'], ground: '#33121f', sil: '#1c0812', glow: 'rgba(255,200,170,0.9)' },
};

function smoothPath(ctx, pts, closed = true) {
  const n = pts.length;
  const P = (i) => pts[(i + n) % n];
  ctx.moveTo(...P(0));
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(closed ? i - 1 : Math.max(0, i - 1)), p1 = P(i), p2 = P(i + 1), p3 = P(closed ? i + 2 : Math.min(n - 1, i + 2));
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    ctx.bezierCurveTo(...c1, ...c2, ...p2);
  }
  if (closed) ctx.closePath();
}

function sky(g, pal, hz) {
  const gr = g.createLinearGradient(0, 0, 0, hz);
  gr.addColorStop(0, pal.sky[0]);
  gr.addColorStop(0.6, pal.sky[1]);
  gr.addColorStop(1, pal.sky[2]);
  g.fillStyle = gr;
  g.fillRect(0, 0, PW, PH);
}

function sun(g, x, y, r) {
  let gr = g.createRadialGradient(x, y, r * 0.5, x, y, r * 6);
  gr.addColorStop(0, 'rgba(255,240,215,0.85)');
  gr.addColorStop(0.3, 'rgba(255,215,180,0.35)');
  gr.addColorStop(1, 'rgba(255,200,170,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, PW, PH);
  gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, '#fffaf0');
  gr.addColorStop(0.85, '#fff1dc');
  gr.addColorStop(1, 'rgba(255,236,210,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(x, y, r * 1.05, 0, Math.PI * 2); g.fill();
}

function bokeh(g, r, n, area, cols) {
  g.save();
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * (area[2] - area[0]), y = area[1] + r() * (area[3] - area[1]);
    const s = 8 + r() * 46;
    const gr = g.createRadialGradient(x, y, s * 0.2, x, y, s);
    const c = cols[Math.floor(r() * cols.length)];
    gr.addColorStop(0, c.replace('A', (0.18 + r() * 0.25).toFixed(2)));
    gr.addColorStop(0.8, c.replace('A', (0.12 + r() * 0.12).toFixed(2)));
    gr.addColorStop(1, c.replace('A', '0'));
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function ground(g, pal, hz, r) {
  const gr = g.createLinearGradient(0, hz, 0, PH);
  gr.addColorStop(0, pal.ground);
  gr.addColorStop(1, '#14050b');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(0, hz + 10);
  for (let x = 0; x <= PW; x += 20) g.lineTo(x, hz + Math.sin(x * 0.01) * 8 + r() * 4);
  g.lineTo(PW, PH); g.lineTo(0, PH); g.closePath(); g.fill();
  // grass blades catching the light
  g.strokeStyle = pal.sil;
  g.lineWidth = 2;
  for (let i = 0; i < 260; i++) {
    const x = r() * PW, h = 10 + r() * 38, y = hz + 6 + r() * 14;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 10, y - h * 0.6, x + (r() - 0.5) * 18, y - h); g.stroke();
  }
}

// ---------- silhouettes (drawn into an offscreen canvas, units: height = 1) ----------
function figureCanvas(drawFn) {
  const c = document.createElement('canvas');
  c.width = PW; c.height = PH;
  const g = c.getContext('2d');
  drawFn(g);
  return c;
}

function makeT(g, cx, gy, s, flip = 1) {
  const T = (x, y) => [cx + x * s * flip, gy - y * s];
  const E = (x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(...T(x, y), rx * s, ry * s, rot * flip, 0, Math.PI * 2); g.fill(); };
  const S = (pts, w) => { g.lineWidth = w * s; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...T(...p)) : g.moveTo(...T(...p)))); g.stroke(); };
  const F = (pts, smooth = true) => { g.beginPath(); smooth ? smoothPath(g, pts.map((p) => T(...p))) : pts.forEach((p, i) => (i ? g.lineTo(...T(...p)) : g.moveTo(...T(...p)))); g.closePath(); g.fill(); };
  return { T, E, S, F };
}

function bride(g, cx, gy, s, flip = 1) {
  const { E, S, F } = makeT(g, cx, gy, s, flip);
  E(0, 0.925, 0.05, 0.062);
  E(-0.035, 0.955, 0.034, 0.03);
  S([[0, 0.88], [0, 0.82]], 0.034);
  F([[-0.085, 0.825], [0.085, 0.825], [0.065, 0.72], [0.058, 0.655], [-0.058, 0.655], [-0.065, 0.72]]);
  S([[-0.08, 0.815], [-0.105, 0.71], [-0.02, 0.625]], 0.03);
  S([[0.08, 0.815], [0.105, 0.71], [0.02, 0.625]], 0.03);
  for (let i = 0; i < 9; i++) E(Math.cos(i * 0.7) * 0.03, 0.615 + Math.sin(i * 1.3) * 0.025, 0.026, 0.024);
  F([[-0.06, 0.66], [-0.15, 0.42], [-0.26, 0.12], [-0.29, 0], [0.12, -0.005], [0.5, 0], [0.33, 0.06], [0.2, 0.28], [0.06, 0.66]]);
}

function veil(g, cx, gy, s, flip = 1, wind = 1) {
  const { T } = makeT(g, cx, gy, s, flip);
  g.save();
  g.filter = 'blur(2px)';
  const gr = g.createLinearGradient(...T(0, 0.95), ...T(-0.6 * wind, 0.5));
  gr.addColorStop(0, 'rgba(255,245,248,0.55)');
  gr.addColorStop(1, 'rgba(255,235,240,0.08)');
  g.fillStyle = gr;
  g.beginPath();
  smoothPath(g, [T(-0.03, 0.975), T(-0.22 * wind, 0.98), T(-0.48 * wind, 0.82), T(-0.66 * wind, 0.56), T(-0.5 * wind, 0.6), T(-0.28 * wind, 0.7), T(-0.06, 0.86)]);
  g.fill();
  g.restore();
}

function groom(g, cx, gy, s, flip = 1) {
  const { E, S, F } = makeT(g, cx, gy, s, flip);
  E(0, 0.93, 0.053, 0.065);
  E(0.005, 0.975, 0.05, 0.03);
  S([[0, 0.88], [0, 0.83]], 0.042);
  F([[-0.115, 0.83], [0.115, 0.83], [0.09, 0.5], [-0.09, 0.5]], false);
  F([[-0.09, 0.52], [0.09, 0.52], [0.075, 0], [0.018, 0], [0, 0.42], [-0.018, 0], [-0.075, 0]], false);
  S([[-0.11, 0.82], [-0.125, 0.62], [-0.11, 0.5]], 0.045);
  S([[0.11, 0.82], [0.125, 0.62], [0.11, 0.5]], 0.045);
}

function womanDress(g, cx, gy, s, flip = 1, wind = 0.6) {
  const { E, S, F } = makeT(g, cx, gy, s, flip);
  E(0, 0.925, 0.05, 0.062);
  F([[-0.04, 0.97], [0.04, 0.96], [0.05, 0.88], [-0.02, 0.8], [-0.12 * wind - 0.05, 0.74], [-0.09, 0.84]]);
  S([[0, 0.88], [0, 0.82]], 0.032);
  F([[-0.08, 0.825], [0.08, 0.825], [0.055, 0.6], [-0.055, 0.6]]);
  S([[-0.075, 0.815], [-0.1, 0.66], [-0.11, 0.53]], 0.028);
  S([[0.075, 0.815], [0.1, 0.66], [0.11, 0.53]], 0.028);
  F([[-0.055, 0.62], [-0.12, 0.3], [-0.2 - wind * 0.15, 0], [0.17, 0], [0.12, 0.3], [0.055, 0.62]]);
}

function maternity(g, cx, gy, s, flip = 1) {
  const { E, S, F } = makeT(g, cx, gy, s, flip);
  E(0.02, 0.925, 0.05, 0.062);
  F([[0.0, 0.985], [0.06, 0.96], [0.02, 0.88], [-0.06, 0.8], [-0.2, 0.62], [-0.16, 0.74], [-0.06, 0.92]]);
  S([[0.01, 0.88], [0.0, 0.82]], 0.034);
  F([[-0.06, 0.83], [0.06, 0.82], [0.08, 0.76], [0.06, 0.7], [0.15, 0.64], [0.2, 0.55], [0.17, 0.45], [0.08, 0.41], [0.12, 0.2], [0.2, 0], [-0.45, 0], [-0.28, 0.12], [-0.12, 0.35], [-0.065, 0.55]]);
  S([[0.0, 0.8], [0.03, 0.66], [0.15, 0.58]], 0.028);
  S([[-0.03, 0.79], [-0.02, 0.65], [0.1, 0.5]], 0.026);
}

function child(g, cx, gy, s, flip = 1) {
  const { E, S, F } = makeT(g, cx, gy, s, flip);
  E(0, 0.86, 0.085, 0.095);
  F([[-0.09, 0.74], [0.09, 0.74], [0.1, 0.4], [-0.1, 0.4]], false);
  S([[-0.05, 0.42], [-0.06, 0.02]], 0.06);
  S([[0.05, 0.42], [0.07, 0.02]], 0.06);
}

function twirlGirl(g, cx, gy, s, flip = 1) {
  const { E, S, F } = makeT(g, cx, gy, s, flip);
  E(0, 0.925, 0.05, 0.062);
  F([[-0.03, 0.98], [0.04, 0.97], [0.05, 0.9], [0.18, 0.83], [0.26, 0.86], [0.12, 0.92]]);
  S([[0, 0.88], [0, 0.82]], 0.03);
  F([[-0.07, 0.825], [0.07, 0.825], [0.05, 0.6], [-0.05, 0.6]]);
  S([[-0.065, 0.81], [-0.16, 0.95], [-0.2, 1.08]], 0.026);
  S([[0.065, 0.81], [0.17, 0.93], [0.23, 1.04]], 0.026);
  F([[-0.05, 0.62], [-0.22, 0.5], [-0.38, 0.36], [-0.3, 0.3], [-0.12, 0.27], [0.1, 0.26], [0.33, 0.3], [0.4, 0.36], [0.24, 0.5], [0.05, 0.62]]);
  S([[-0.03, 0.3], [-0.05, 0.02]], 0.03);
  S([[0.03, 0.3], [0.08, 0.02]], 0.03);
}

function profile(g, cx, gy, s, flip = 1) {
  const { T, F } = makeT(g, cx, gy, s, flip);
  F([[-0.06, 1.0], [0.05, 0.98], [0.09, 0.93], [0.1, 0.87], [0.105, 0.835], [0.14, 0.79], [0.117, 0.772], [0.122, 0.752], [0.11, 0.742], [0.12, 0.727], [0.103, 0.69], [0.062, 0.662], [0.05, 0.6], [0.1, 0.5], [0.2, 0.35], [0.24, 0], [-0.3, 0], [-0.25, 0.3], [-0.38, 0.5], [-0.55, 0.62], [-0.42, 0.7], [-0.6, 0.78], [-0.4, 0.86], [-0.2, 0.96]]);
  return T;
}

function silhouette(g, pal, draw, glowPx = 26) {
  const fig = figureCanvas((fg) => { fg.fillStyle = pal.sil; fg.strokeStyle = pal.sil; draw(fg); });
  g.save();
  g.shadowColor = pal.glow;
  g.shadowBlur = glowPx;
  g.drawImage(fig, 0, 0);
  g.shadowBlur = glowPx * 0.35;
  g.drawImage(fig, 0, 0);
  g.restore();
}

function grade(g, r, warm = 'rgba(255,170,190,0.18)') {
  g.save();
  g.globalCompositeOperation = 'soft-light';
  const gr = g.createLinearGradient(0, 0, PW, PH);
  gr.addColorStop(0, warm);
  gr.addColorStop(1, 'rgba(120,40,80,0.25)');
  g.fillStyle = gr;
  g.fillRect(0, 0, PW, PH);
  g.globalCompositeOperation = 'source-over';
  const v = g.createRadialGradient(PW / 2, PH * 0.45, PW * 0.35, PW / 2, PH / 2, PW * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(30,5,15,0.45)');
  g.fillStyle = v;
  g.fillRect(0, 0, PW, PH);
  g.restore();
  const id = g.getImageData(0, 0, PW, PH);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 14;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
}

function flare(g, x, y) {
  g.save();
  g.globalCompositeOperation = 'screen';
  const gr = g.createLinearGradient(0, y, PW, y);
  gr.addColorStop(0, 'rgba(255,200,180,0)');
  gr.addColorStop(x / PW, 'rgba(255,230,210,0.45)');
  gr.addColorStop(1, 'rgba(255,200,180,0)');
  g.fillStyle = gr;
  g.fillRect(0, y - 3, PW, 6);
  for (const [k, s, a] of [[0.4, 30, 0.12], [0.75, 14, 0.18], [1.3, 50, 0.08]]) {
    const fx = x + (PW / 2 - x) * k * 2, fy = y + (PH / 2 - y) * k * 2;
    g.fillStyle = `rgba(255,190,210,${a})`;
    g.beginPath(); g.arc(fx, fy, s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// ---------- scene recipes ----------
function outdoor(g, r, pal, sunPos, drawFigs, hz = 760) {
  sky(g, pal, hz);
  sun(g, sunPos[0], sunPos[1], sunPos[2]);
  bokeh(g, r, 26, [0, 0, PW, hz], ['rgba(255,230,210,A)', 'rgba(255,200,215,A)', 'rgba(255,240,200,A)']);
  ground(g, pal, hz, r);
  silhouette(g, pal, drawFigs);
  flare(g, sunPos[0], sunPos[1]);
}

function newborn(g, r, tint = '#f3d3d8') {
  g.fillStyle = tint;
  g.fillRect(0, 0, PW, PH);
  // knit blanket
  for (let y = 0; y < PH; y += 26) {
    for (let x = (y / 26) % 2 ? 0 : 13; x < PW; x += 26) {
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 5;
      g.beginPath(); g.arc(x, y, 9, 0.2, Math.PI - 0.2); g.stroke();
      g.strokeStyle = 'rgba(180,110,130,0.18)';
      g.lineWidth = 3;
      g.beginPath(); g.arc(x, y + 4, 9, 0.2, Math.PI - 0.2); g.stroke();
    }
  }
  const cx = PW * 0.5, cy = PH * 0.52;
  g.save();
  g.shadowColor = 'rgba(90,30,50,0.35)'; g.shadowBlur = 40; g.shadowOffsetY = 18;
  // wrap
  let gr = g.createRadialGradient(cx - 40, cy + 60, 20, cx, cy + 80, 300);
  gr.addColorStop(0, '#f6c5cf'); gr.addColorStop(1, '#d98ea0');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(cx + 10, cy + 90, 200, 250, -0.25, 0, Math.PI * 2); g.fill();
  g.restore();
  g.strokeStyle = 'rgba(160,70,95,0.35)'; g.lineWidth = 4;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(cx + 10, cy + 90, 200 - i * 8, 250 - i * 30, -0.25, 0.6 + i * 0.2, 2.2 + i * 0.1); g.stroke(); }
  // head
  gr = g.createRadialGradient(cx - 30, cy - 150, 20, cx, cy - 120, 150);
  gr.addColorStop(0, '#fbe0d2'); gr.addColorStop(0.7, '#efc0ab'); gr.addColorStop(1, '#d9a08e');
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(cx, cy - 120, 120, 135, -0.15, 0, Math.PI * 2); g.fill();
  // headband with bow
  g.fillStyle = '#f7e6ea';
  g.beginPath(); g.ellipse(cx - 70, cy - 220, 46, 30, -0.6, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx - 20, cy - 245, 46, 30, 0.4, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e9cdd4';
  g.beginPath(); g.arc(cx - 45, cy - 232, 18, 0, Math.PI * 2); g.fill();
  // face
  g.strokeStyle = '#8a5a52'; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.arc(cx - 45, cy - 120, 20, 0.2, Math.PI - 0.2); g.stroke();
  g.beginPath(); g.arc(cx + 35, cy - 128, 20, 0.2, Math.PI - 0.2); g.stroke();
  g.fillStyle = 'rgba(240,140,150,0.35)';
  g.beginPath(); g.arc(cx - 60, cy - 80, 26, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(cx + 55, cy - 88, 26, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#b07068'; g.lineWidth = 3;
  g.beginPath(); g.arc(cx - 5, cy - 62, 12, 0.3, Math.PI - 0.3); g.stroke();
  // tiny hand
  g.fillStyle = '#f1c4b1';
  g.beginPath(); g.ellipse(cx + 70, cy - 20, 36, 28, 0.4, 0, Math.PI * 2); g.fill();
  // window light
  g.save(); g.globalCompositeOperation = 'screen';
  gr = g.createLinearGradient(0, 0, PW, PH);
  gr.addColorStop(0, 'rgba(255,240,230,0.55)'); gr.addColorStop(0.5, 'rgba(255,220,220,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
  g.restore();
}

function roses(g, r, pal) {
  const gr = g.createLinearGradient(0, 0, 0, PH);
  gr.addColorStop(0, pal.sky[0]); gr.addColorStop(1, pal.sky[2]);
  g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
  bokeh(g, r, 40, [0, 0, PW, PH], ['rgba(255,240,230,A)', 'rgba(255,190,205,A)', 'rgba(255,225,170,A)']);
  const rose = (x, y, s, c1, c2) => {
    for (let k = 9; k >= 0; k--) {
      const rr = s * (0.25 + k * 0.08);
      const gg = g.createRadialGradient(x, y, rr * 0.2, x, y, rr);
      gg.addColorStop(0, c1); gg.addColorStop(1, c2);
      g.fillStyle = gg;
      g.strokeStyle = 'rgba(120,30,60,0.25)'; g.lineWidth = 2;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const a = i * (Math.PI * 2 / n) + k * 0.7;
        g.beginPath();
        g.ellipse(x + Math.cos(a) * rr * 0.35, y + Math.sin(a) * rr * 0.35, rr * 0.62, rr * 0.48, a, 0, Math.PI * 2);
        g.fill(); g.stroke();
      }
    }
  };
  g.save(); g.shadowColor = 'rgba(80,20,40,0.4)'; g.shadowBlur = 30;
  rose(PW * 0.38, PH * 0.6, 170, '#fbe3e6', '#e79cad');
  rose(PW * 0.72, PH * 0.42, 120, '#fdeef0', '#eeb2bf');
  rose(PW * 0.2, PH * 0.32, 90, '#f9d9df', '#d98399');
  g.restore();
  // gold ring
  g.save(); g.shadowColor = 'rgba(255,220,160,0.9)'; g.shadowBlur = 20;
  g.strokeStyle = '#e8c37c'; g.lineWidth = 16;
  g.beginPath(); g.ellipse(PW * 0.62, PH * 0.78, 70, 34, -0.2, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#fff3d4'; g.lineWidth = 4;
  g.beginPath(); g.ellipse(PW * 0.62, PH * 0.78, 70, 34, -0.2, 3.6, 5.2); g.stroke();
  g.restore();
}

function beach(g, r, pal, flip) {
  const hz = 610;
  sky(g, pal, hz);
  sun(g, flip > 0 ? 560 : 240, 520, 80);
  const sea = g.createLinearGradient(0, hz, 0, PH);
  sea.addColorStop(0, pal.sky[1]); sea.addColorStop(1, pal.ground);
  g.fillStyle = sea; g.fillRect(0, hz, PW, PH - hz);
  g.save(); g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 70; i++) {
    const y = hz + 6 + Math.pow(r(), 1.6) * (PH - hz);
    const w = 20 + r() * 120 * (1 - (y - hz) / (PH - hz) * 0.5);
    g.fillStyle = `rgba(255,230,200,${0.15 + r() * 0.35})`;
    g.fillRect((flip > 0 ? 560 : 240) - w / 2 + (r() - 0.5) * 120, y, w, 2 + r() * 3);
  }
  g.restore();
  silhouette(g, pal, (fg) => profile(fg, PW * (flip > 0 ? 0.42 : 0.58), PH * 1.02, 900, flip));
}

const RECIPES = [
  // [kind, palette, flip, extra]
  ['bride', 'sunset', 1], ['couple', 'golden', 1], ['maternity', 'lavender', 1], ['newborn', '#f3d3d8'],
  ['family', 'dusk', 1], ['twirl', 'sunset', 1], ['roses', 'sunset'], ['beach', 'golden', 1],
  ['bride', 'lavender', -1], ['couple', 'dusk', -1], ['maternity', 'golden', -1], ['newborn', '#ead5e3'],
  ['family', 'golden', -1], ['twirl', 'lavender', -1], ['roses', 'golden'], ['beach', 'dusk', -1],
  ['couple', 'sunset', 1], ['bride', 'golden', 1], ['maternity', 'sunset', 1], ['family', 'lavender', 1],
  ['twirl', 'golden', 1], ['beach', 'lavender', 1], ['couple', 'lavender', -1], ['bride', 'dusk', -1],
];

export const CATEGORY_PHOTO = { bride: 0, maternity: 2, newborn: 3, family: 4, twirl: 5 };
export const HERO = 0;
// where the sun sits in the hero photo (uv, y down) - used for the final match cut
export const HERO_SUN = { u: 0.66, v: 0.43, r: 0.1 };

function drawRecipe(g, idx) {
  const [kind, palName, flip = 1] = RECIPES[idx];
  const r = mulberry32(1000 + idx * 77);
  const pal = PALETTES[palName];
  const f = flip;
  const X = (u) => (f > 0 ? u : 1 - u) * PW;
  switch (kind) {
    case 'bride':
      outdoor(g, r, pal, [X(0.66), PH * 0.43, PW * 0.1], (fg) => bride(fg, X(0.36), 770, 560, f));
      veil(g, X(0.36), 770, 560, f, 1);
      break;
    case 'couple':
      outdoor(g, r, pal, [X(0.5), PH * 0.5, PW * 0.09], (fg) => {
        groom(fg, X(0.59), 770, 600, -f);
        womanDress(fg, X(0.42), 770, 545, f, 0.8);
        const { S } = makeT(fg, X(0.59), 770, 600, -f);
        S([[0.11, 0.8], [0.2, 0.68], [0.26, 0.62]], 0.04);
      });
      break;
    case 'maternity':
      outdoor(g, r, pal, [X(0.62), PH * 0.48, PW * 0.11], (fg) => maternity(fg, X(0.45), 780, 620, f));
      break;
    case 'family':
      outdoor(g, r, pal, [X(0.5), PH * 0.52, PW * 0.1], (fg) => {
        groom(fg, X(0.25), 790, 470, f);
        womanDress(fg, X(0.75), 790, 430, -f, 0.4);
        child(fg, X(0.5), 790, 250, f);
        const { S } = makeT(fg, X(0.5), 790, 250, f);
        S([[-0.08, 0.68], [-0.3, 0.6], [-0.62, 0.95]], 0.05);
        S([[0.08, 0.68], [0.3, 0.6], [0.62, 0.9]], 0.05);
      });
      break;
    case 'twirl':
      outdoor(g, r, pal, [X(0.55), PH * 0.42, PW * 0.1], (fg) => twirlGirl(fg, X(0.48), 780, 560, f));
      g.save(); g.globalCompositeOperation = 'screen';
      for (let i = 0; i < 90; i++) {
        g.fillStyle = `rgba(255,${200 + r() * 55},${170 + r() * 60},${0.4 + r() * 0.5})`;
        g.beginPath(); g.arc(r() * PW, r() * PH * 0.8, 1.5 + r() * 4, 0, Math.PI * 2); g.fill();
      }
      g.restore();
      break;
    case 'roses':
      roses(g, r, pal);
      break;
    case 'beach':
      beach(g, r, pal, f);
      break;
    case 'newborn':
      newborn(g, r, palName);
      break;
  }
  grade(g, r);
}

async function loadReal() {
  try {
    const res = await fetch('photos/manifest.json');
    if (!res.ok) return null;
    const list = await res.json();
    const imgs = await Promise.all(list.map((f) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = 'photos/' + f; })));
    return imgs.filter(Boolean);
  } catch (e) {
    return null;
  }
}

function coverDraw(g, im) {
  const s = Math.max(PW / im.width, PH / im.height);
  const w = im.width * s, h = im.height * s;
  g.drawImage(im, (PW - w) / 2, (PH - h) / 2, w, h);
}

export async function buildPhotos() {
  const real = await loadReal();
  const canvases = [];
  const n = real && real.length ? Math.max(real.length, 12) : RECIPES.length;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    const g = c.getContext('2d');
    if (real && real.length) coverDraw(g, real[i % real.length]);
    else drawRecipe(g, i);
    canvases.push(c);
  }
  // "before" version of the hero for the retouch wipe
  const before = document.createElement('canvas');
  before.width = PW; before.height = PH;
  const bg = before.getContext('2d');
  bg.filter = 'saturate(0.35) brightness(0.8) contrast(0.78) sepia(0.2) hue-rotate(-12deg)';
  bg.drawImage(canvases[HERO], 0, 0);
  bg.filter = 'none';
  bg.fillStyle = 'rgba(150,160,170,0.12)';
  bg.fillRect(0, 0, PW, PH);
  const tex = canvases.map((c) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
  return { canvases, tex, before, count: n };
}
