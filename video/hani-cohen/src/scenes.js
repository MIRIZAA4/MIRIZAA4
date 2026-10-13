// scenes.js — the film. Everything is a pure function of the beat `b` (104 BPM).
'use strict';

let g = null, TL = null, B = 60 / 104;
const FOCAL = 1400;

// ============================================================ 3D camera model (blueprint)
const MODEL = [];
(function buildModel() {
  const P = MODEL;
  const box = (x0, x1, y0, y1, z0, z1, kind = 'body') => {
    const f = (pts, n) => P.push({ pts, n, kind, edges: [1, 1, 1, 1] });
    f([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], [0, 0, -1]);
    f([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
    f([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0]);
    f([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0]);
    f([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], [-1, 0, 0]);
    f([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0]);
  };
  // cylinder along axis 'z' (centre cx,cy) or 'y' (centre cx,cz)
  const cyl = (axis, c1, c2, a0, a1, r, seg, o = {}) => {
    const pt = (ang, a) => axis === 'z' ? [c1 + Math.cos(ang) * r, c2 + Math.sin(ang) * r, a] : [c1 + Math.cos(ang) * r, a, c2 + Math.sin(ang) * r];
    const nn = ang => axis === 'z' ? [Math.cos(ang), Math.sin(ang), 0] : [Math.cos(ang), 0, Math.sin(ang)];
    const side = [];
    for (let i = 0; i < seg; i++) {
      const u = i / seg * TAU, v = (i + 1) / seg * TAU, m = (u + v) / 2;
      const q = { pts: [pt(u, a0), pt(v, a0), pt(v, a1), pt(u, a1)], n: nn(m), kind: o.kind || 'body', edges: [1, 0, 1, 0], ridge: o.ridge };
      side.push(q); P.push(q);
    }
    side.forEach((q, i) => { q.prev = side[(i + seg - 1) % seg]; q.next = side[(i + 1) % seg]; });
    const cap = (a, sgn, kind) => {
      const pts = []; for (let i = 0; i < seg; i++) pts.push(pt(i / seg * TAU, a));
      P.push({ pts, n: axis === 'z' ? [0, 0, sgn] : [0, sgn, 0], kind, edges: pts.map(() => 1) });
    };
    if (o.cap0) cap(a0, a0 < a1 ? -1 : 1, o.cap0);
    if (o.cap1) cap(a1, a0 < a1 ? 1 : -1, o.cap1);
  };
  box(-260, 260, -170, 170, -80, 80);
  box(140, 255, -150, 165, -150, -80);            // grip
  box(-95, 95, -250, -170, -60, 50);              // prism hump
  box(-62, 62, -240, -186, 50, 92);               // eyepiece
  cyl('y', 200, -115, -150, -168, 22, 14, { cap1: 'body' });   // shutter button
  cyl('y', -175, 0, -170, -205, 46, 18, { cap1: 'dial', ridge: true }); // mode dial
  cyl('z', 0, 10, -80, -106, 152, 36);            // mount
  cyl('z', 0, 10, -106, -300, 138, 36);           // barrel
  cyl('z', 0, 10, -168, -238, 147, 36, { ridge: true }); // focus ring
  cyl('z', 0, 10, -300, -332, 152, 36, { cap1: 'glass' }); // front ring + glass
  P.push({ pts: [[-215, -120, 81], [125, -120, 81], [125, 120, 81], [-215, 120, 81]], n: [0, 0, 1], kind: 'screen', edges: [1, 1, 1, 1] });
  for (const [x, y, r] of [[195, -95, 20], [195, -25, 20], [195, 45, 30], [195, 115, 16]]) {
    const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r, 81]); }
    P.push({ pts, n: [0, 0, 1], kind: 'button', edges: pts.map(() => 1) });
  }
})();

function makeView(yaw, pitch, D, ox, oy) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const rot = ([x, y, z]) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
    return [x1, y2, z2];
  };
  const w = p => { const r = rot(p); return [r[0], r[1], r[2] + D]; };
  const proj = p => { const q = w(p); const s = FOCAL / Math.max(q[2], 1); return [CX + ox + q[0] * s, CY + oy + q[1] * s, q[2], s]; };
  return { rot, w, proj, D, ox, oy };
}

function drawModel(view, o = {}) {
  const L = [-.35, -.6, -.72];
  const items = [];
  for (const p of MODEL) {
    const ws = p.pts.map(view.w);
    let c = [0, 0, 0]; ws.forEach(q => { c[0] += q[0]; c[1] += q[1]; c[2] += q[2]; });
    c = c.map(v => v / ws.length);
    const n = view.rot(p.n);
    p._vis = (n[0] * c[0] + n[1] * c[1] + n[2] * c[2]) < 0;
    p._n = n; p._z = c[2];
  }
  for (const p of MODEL) if (p._vis) items.push(p);
  items.sort((a, b) => b._z - a._z);
  const a = o.alpha ?? 1;
  g.save();
  g.globalAlpha = a;
  for (const p of items) {
    const pr = p.pts.map(view.proj);
    const lam = clamp(-(p._n[0] * L[0] + p._n[1] * L[1] + p._n[2] * L[2]));
    g.beginPath(); pr.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
    const base = p.kind === 'screen' ? [24, 10, 16] : p.kind === 'dial' ? [92, 58, 62] : [52, 26, 38];
    const k = .55 + lam * .75;
    g.fillStyle = `rgba(${base[0] * k + 20 * lam | 0},${base[1] * k + 8 * lam | 0},${base[2] * k + 12 * lam | 0},.96)`;
    g.fill();
    // edges
    bp(g, .85, 1.7);
    g.beginPath();
    for (let i = 0; i < pr.length; i++) {
      const j = (i + 1) % pr.length;
      let draw = p.edges[i];
      if (!draw && p.prev) draw = (i === 1 && !p.next._vis) || (i === 3 && !p.prev._vis);
      if (draw) { g.moveTo(pr[i][0], pr[i][1]); g.lineTo(pr[j][0], pr[j][1]); }
    }
    g.stroke();
    if (p.ridge) { bp(g, .3, 1); g.beginPath(); g.moveTo(pr[0][0], pr[0][1]); g.lineTo(pr[3][0], pr[3][1]); g.stroke(); }
    if (p.kind === 'glass') drawGlassAt(view, o.aperture ?? 1, o.b ?? 0);
    if (p.kind === 'screen' && o.lcd) drawLCD(view, o.b, o.lcd);
  }
  g.restore();
}

// affine frame of a model-space plane point: returns [a,b,c,d,e,f] mapping local (u,v) -> screen
function affineFrom(view, o, ux, vy) {
  const P0 = view.proj(o), Px = view.proj([o[0] + ux[0], o[1] + ux[1], o[2] + ux[2]]), Py = view.proj([o[0] + vy[0], o[1] + vy[1], o[2] + vy[2]]);
  return [Px[0] - P0[0], Px[1] - P0[1], Py[0] - P0[0], Py[1] - P0[1], P0[0], P0[1]];
}

function drawGlassAt(view, ap, b) {
  const m = affineFrom(view, [0, 10, -333], [1, 0, 0], [0, 1, 0]);
  g.save();
  g.transform(...m);
  drawGlass(118, ap, b);
  g.restore();
}

// detailed lens glass in local units, radius R
function drawGlass(R, ap, b) {
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
  gr.addColorStop(0, '#120910'); gr.addColorStop(.7, '#1e0e18'); gr.addColorStop(1, '#0b0509');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  // internal elements
  g.lineWidth = .9;
  for (const [k, al] of [[.94, .55], [.8, .3], [.66, .45], [.5, .25]]) { g.strokeStyle = rgba(C.goldL, al); g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke(); }
  // aperture blades
  const n = 9, ar = R * .62 * clamp(ap, .015, 1), rot = (1 - ap) * 1.4 + b * .02;
  g.save();
  g.beginPath(); g.arc(0, 0, R * .64, 0, TAU);
  for (let i = n; i >= 0; i--) { const a = rot + i / n * TAU; g.lineTo(Math.cos(a) * ar, Math.sin(a) * ar); }
  g.closePath();
  const bg = g.createRadialGradient(0, 0, ar, 0, 0, R * .64); bg.addColorStop(0, '#3a2230'); bg.addColorStop(1, '#170b12');
  g.fillStyle = bg; g.fill('evenodd');
  g.strokeStyle = rgba(C.gold, .55); g.lineWidth = .7;
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU;
    const a2 = rot + (i + 1) / n * TAU;
    const vx = Math.cos(a2) * ar, vy = Math.sin(a2) * ar, dx = Math.cos(a2) - Math.cos(a), dy = Math.sin(a2) - Math.sin(a);
    const dl = Math.hypot(dx, dy) || 1;
    g.beginPath(); g.moveTo(vx, vy); g.lineTo(vx + dx / dl * R * .7, vy + dy / dl * R * .7); g.stroke();
  }
  // deep core glow through the aperture
  const cg = g.createRadialGradient(0, 0, 0, 0, 0, ar);
  cg.addColorStop(0, 'rgba(120,50,80,.55)'); cg.addColorStop(1, 'rgba(40,15,30,0)');
  g.fillStyle = cg; g.beginPath(); g.arc(0, 0, ar, 0, TAU); g.fill();
  g.restore();
  // coating reflections
  g.save();
  g.globalCompositeOperation = 'lighter';
  const h1 = g.createRadialGradient(-R * .38, -R * .42, 0, -R * .38, -R * .42, R * .7);
  h1.addColorStop(0, 'rgba(255,215,230,.42)'); h1.addColorStop(.35, 'rgba(232,140,175,.16)'); h1.addColorStop(1, 'rgba(232,140,175,0)');
  g.fillStyle = h1; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(241,217,160,.45)'; g.lineWidth = R * .035;
  g.beginPath(); g.arc(0, 0, R * .86, Math.PI * 1.05, Math.PI * 1.42); g.stroke();
  g.strokeStyle = 'rgba(232,150,190,.35)'; g.lineWidth = R * .05;
  g.beginPath(); g.arc(0, 0, R * .72, Math.PI * .1, Math.PI * .38); g.stroke();
  g.fillStyle = 'rgba(255,245,235,.85)';
  g.beginPath(); g.ellipse(-R * .42, -R * .5, R * .07, R * .035, -.7, 0, TAU); g.fill();
  g.beginPath(); g.arc(R * .33, R * .3, R * .025, 0, TAU); g.fill();
  g.restore();
  circleText('HANI COHEN  ·  85mm  1:1.4  ·  Ø77  ·  PORTRAIT  ·  ', 0, 0, R * 1.12, -Math.PI * .95 + b * .01, { font: F.mono(R * .075, 500), track: R * .012, color: rgba(C.goldL, .75) });
}

function circleText(str, x, y, r, a0, o) { return circleTextG(g, str, x, y, r, a0, o); }
// alias to core helper (core defines circleText(g,...))
function circleTextG(gg, str, x, y, r, a0, o) {
  gg.save();
  gg.font = o.font; gg.fillStyle = o.color; gg.textAlign = 'center'; gg.textBaseline = 'middle';
  let a = a0;
  for (const ch of str) {
    const w = gg.measureText(ch).width + (o.track ?? 2);
    a += w / 2 / r;
    gg.save(); gg.translate(x + Math.cos(a) * r, y + Math.sin(a) * r); gg.rotate(a + Math.PI / 2); gg.fillText(ch, 0, 0); gg.restore();
    a += w / 2 / r;
  }
  gg.restore();
}

// camera back screen (content in 340x240 local units)
function drawLCD(view, b, amt) {
  const m = affineFrom(view, [125, -120, 82], [-1, 0, 0], [0, 1, 0]);
  g.save();
  g.transform(...m);
  g.beginPath(); g.rect(0, 0, 340, 240); g.clip();
  g.globalAlpha *= amt;
  g.fillStyle = '#12070d'; g.fillRect(0, 0, 340, 240);
  const cols = 3, rows = 2, pad = 8, tw = (340 - pad * (cols + 1)) / cols, th = (240 - 34 - pad * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const idx = (i * 3 + Math.floor(b * 1.5 + i * .4)) % PHOTOS.length;
    const x = pad + c * (tw + pad), y = 22 + pad + r * (th + pad);
    drawCover(g, PHOTOS[idx].img, x, y, tw, th, 1.1);
    if ((Math.floor(b * 2) % 6) === i) { g.strokeStyle = C.goldL; g.lineWidth = 2; g.strokeRect(x, y, tw, th); }
  }
  g.font = F.mono(11, 500); g.fillStyle = rgba(C.goldL, .9); g.textBaseline = 'middle';
  g.textAlign = 'left'; g.fillText('PLAY ▸  248/248', 8, 12);
  g.textAlign = 'right'; g.fillText('1/250  F1.8  ISO100', 332, 12);
  g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(150, 12, 4, 0, TAU); g.fill();
  // screen glow
  g.globalCompositeOperation = 'lighter';
  const sg = g.createLinearGradient(0, 0, 340, 240); sg.addColorStop(0, 'rgba(255,190,210,.18)'); sg.addColorStop(1, 'rgba(255,190,210,0)');
  g.fillStyle = sg; g.fillRect(0, 0, 340, 240);
  g.restore();
}

// ============================================================ background & overlays
const DUST = (() => { const r = rng(7); return Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * H, s: .6 + r() * 2.2, d: .2 + r() * .8, p: r() * TAU })); })();
const NOISE = [];
function buildNoise() {
  for (let k = 0; k < 6; k++) {
    const c = mkCanvas(540, 960), x = c.getContext('2d'), id = x.createImageData(540, 960), r = rng(99 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); NOISE.push(c);
  }
}

function drawBG(b) {
  const bg = g.createRadialGradient(CX, CY * .85, 80, CX, CY, H * .75);
  bg.addColorStop(0, '#4d2738'); bg.addColorStop(.55, '#33192a'); bg.addColorStop(1, '#170a11');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // drifting blueprint grid — the "camera" never stops
  const zoom = 1 + .06 * Math.sin(b * .21);
  const ox = (b * 9) % 60, oy = (b * -23) % 60;
  g.save();
  g.translate(CX, CY); g.scale(zoom, zoom); g.rotate(Math.sin(b * .05) * .03); g.translate(-CX, -CY);
  g.lineWidth = 1;
  for (let x = -120 + ox; x < W + 120; x += 60) { const major = Math.round((x - ox) / 60) % 5 === 0; g.strokeStyle = rgba(C.gold, major ? .085 : .04); g.beginPath(); g.moveTo(x, -200); g.lineTo(x, H + 200); g.stroke(); }
  for (let y = -120 + oy; y < H + 120; y += 60) { const major = Math.round((y - oy) / 60) % 5 === 0; g.strokeStyle = rgba(C.gold, major ? .085 : .04); g.beginPath(); g.moveTo(-200, y); g.lineTo(W + 200, y); g.stroke(); }
  g.restore();
  // dust
  g.save(); g.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const y = ((d.y - b * 20 * d.d) % H + H) % H, x = (d.x + Math.sin(b * .3 + d.p) * 20 + W) % W;
    g.fillStyle = rgba(C.goldL, (.25 + .25 * Math.sin(b * 1.3 + d.p)) * d.d);
    g.beginPath(); g.arc(x, y, d.s, 0, TAU); g.fill();
  }
  g.restore();
}

const FLASHES = [[4, .85], [14, .55], [44, .25], [61, .55], [72, .9]];
function post(b, frame) {
  g.save();
  // light leaks
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 2; i++) {
    const x = CX + Math.sin(b * .13 + i * 2.1) * 520, y = CY + Math.cos(b * .09 + i * 1.3) * 820;
    const lg = g.createRadialGradient(x, y, 0, x, y, 700);
    lg.addColorStop(0, i ? 'rgba(232,150,175,.13)' : 'rgba(241,200,140,.10)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(0, 0, W, H);
  }
  g.globalCompositeOperation = 'source-over';
  // flashes
  for (const [fb, amt] of FLASHES) {
    if (b >= fb - .05 && b < fb + 1) {
      const a = amt * Math.pow(1 - prog(b, fb, fb + .9), 2.2) * prog(b, fb - .05, fb);
      g.fillStyle = `rgba(255,242,232,${a})`; g.fillRect(0, 0, W, H);
    }
  }
  // vignette
  const v = g.createRadialGradient(CX, CY, H * .3, CX, CY, H * .72);
  v.addColorStop(0, 'rgba(10,3,7,0)'); v.addColorStop(1, 'rgba(10,3,7,.62)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // grain
  g.globalCompositeOperation = 'overlay'; g.globalAlpha = .07;
  g.drawImage(NOISE[frame % NOISE.length], 0, 0, W, H);
  g.restore();
}

function shake(b) {
  let x = 0, y = 0;
  for (const [fb, amp] of [[4, 10], [14, 16], [61, 12], [72, 10]]) {
    if (b >= fb && b < fb + 1.2) { const k = Math.exp(-(b - fb) * 6) * amp; x += Math.sin(b * 90) * k; y += Math.cos(b * 73) * k; }
  }
  return [x, y];
}

// ============================================================ HUD
const STEPS = [[1.5, 'צילום'], [30, 'עריכה וריטוש'], [40, 'אישור הלקוחה'], [48, 'עיצוב אלבום'], [56, 'דפוס'], [63, 'משלוח עד הבית']];
function hud(b) {
  const a = win(b, 1, 71.5, 1, .8);
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  let si = 0; for (let i = 0; i < STEPS.length; i++) if (b >= STEPS[i][0]) si = i;
  const ts = b - STEPS[si][0];
  const e = E.outExpo(clamp(ts / .8));
  // step label
  g.globalAlpha = a * e;
  label(`0${si + 1}`, CX + 150, 150 + (1 - e) * 20, { font: F.mono(26, 500), color: C.goldL, align: 'left' });
  label(STEPS[si][1], CX + 120, 152 + (1 - e) * 20, { font: F.sans(30, 400), color: C.champ, align: 'right', rtl: true });
  g.globalAlpha = a;
  // progress segments (RTL: first step on the right)
  for (let i = 0; i < 6; i++) {
    const w = 64, gap = 10, x = CX + 3 * (w + gap) - (i + 1) * (w + gap) + gap / 2;
    g.fillStyle = rgba(C.gold, .22); g.fillRect(x, 196, w, 3);
    const f = i < si ? 1 : i === si ? clamp(ts / ((STEPS[i + 1]?.[0] ?? 71.5) - STEPS[i][0])) : 0;
    g.fillStyle = C.goldL; g.fillRect(x + w * (1 - f), 196, w * f, 3);
  }
  // viewfinder chrome
  corners(g, 54, 54, W - 108, H - 108, 50, .35, 2);
  label('● REC', 96, 108, { font: F.mono(20, 500), color: Math.floor(b * 1.73) % 2 ? 'rgba(255,90,120,.9)' : 'rgba(255,90,120,.35)', align: 'left' });
  const secs = b * B;
  label(`00:${String(Math.floor(secs)).padStart(2, '0')}:${String(Math.floor(secs % 1 * 30)).padStart(2, '0')}`, W - 96, 108, { font: F.mono(20, 400), align: 'right' });
  label('ISO 100   1/250   ƒ1.8   5600K', 96, H - 100, { font: F.mono(18, 400), align: 'left', alpha: .6 });
  g.restore();
}

// ============================================================ SCENE 1+2: lens → orbit
function camView(b) {
  let D;
  if (b < 4) D = lerp(560, 600, E.inOutSine(prog(b, 0, 4)));
  else if (b < 6.5) D = lerp(600, 1060, E.inOutExpo(prog(b, 4.15, 6.6)));
  else if (b < 12.5) D = lerp(1060, 1180, E.inOutSine(prog(b, 6.5, 12.5)));
  else D = lerp(1180, 900, E.inOut(prog(b, 12.5, 14.5)));
  const yaw = E.inOut(prog(b, 6.3, 12.6)) * Math.PI + Math.sin(b * .4) * .02;
  const pitch = lerp(0, .2, E.inOut(prog(b, 6.3, 12.6))) - .03 * Math.sin(b * .3);
  const oy = lerp(70, 160, E.inOut(prog(b, 4.2, 7))) + E.inExpo(prog(b, 14.3, 17)) * 1200;
  const ox = Math.sin(b * .27) * 14;
  return makeView(yaw, pitch, D, ox, oy);
}

function sceneCamera(b) {
  if (b > 17.5) return;
  const v = camView(b);
  // aperture: breathing, then the click
  let ap = .9 + .08 * Math.sin(b * 1.3);
  if (b > 3.86 && b < 4.9) ap = b < 4 ? lerp(ap, 0, E.in(prog(b, 3.86, 4))) : b < 4.25 ? 0 : E.out(prog(b, 4.25, 4.9)) * ap;
  if (b > 71) ap = 0;
  // construction lines (lens scene)
  const lc = v.proj([0, 10, -333]), lr = 118 * lc[3];
  SHARED.lensC = lc;
  const ca = win(b, 0, 6.5, .2, .8);
  if (ca > 0) {
    g.save(); g.globalAlpha = ca;
    bp(g, .35, 1.1);
    line(g, 0, lc[1], W, lc[1], E.inOut(prog(b, 0, 1.6)));
    line(g, lc[0], 0, lc[0], H, E.inOut(prog(b, .2, 1.8)));
    g.setLineDash([8, 10]); bp(g, .4, 1.2);
    circ(g, lc[0], lc[1], lr * 1.42, E.inOut(prog(b, .3, 2)));
    circ(g, lc[0], lc[1], lr * .62, E.inOut(prog(b, .5, 2.2)), Math.PI / 2);
    g.setLineDash([]);
    g.restore();
  }
  drawModel(v, { aperture: ap, b, lcd: clamp(prog(b, 9.5, 11.5)) });
  // annotations over the lens
  if (ca > 0) {
    g.save(); g.globalAlpha = ca;
    crosshair(g, lc[0], lc[1], 36, E.out(prog(b, .8, 1.8)), .7);
    dim(g, lc[0] - lr, lc[1] + lr + 30, lc[0] + lr, lc[1] + lr + 30, 'Ø 77 mm', prog(b, 1.2, 2.6), 40);
    callout(g, lc[0] + lr * .7, lc[1] - lr * .7, lc[0] + lr * .9, lc[1] - lr * 1.05, '85mm · ƒ/1.4', prog(b, 1.8, 3), { dir: -1, font: F.mono(26, 500) });
    g.restore();
  }
  // orbit annotations
  const oa = win(b, 6.8, 13.2, .5, .6);
  if (oa > 0) {
    g.save(); g.globalAlpha = oa;
    const p1 = v.proj([-260, 170, -80]), p2 = v.proj([260, 170, -80]), p3 = v.proj([-260, -170, -80]);
    dim(g, p1[0], p1[1], p2[0], p2[1], '143.5 mm', prog(b, 7, 8.5), 70);
    dim(g, p3[0], p3[1], p1[0], p1[1], '104.2 mm', prog(b, 7.4, 8.9), 70);
    const lens = v.proj([0, -140, -300]), sensor = v.proj([0, 10, 0]);
    callout(g, sensor[0], sensor[1], CX + 60, 1560, 'חיישן פול־פריים', prog(b, 8.2, 9.6), { sub: '45 MP · 8K RAW', dir: 1 });
    callout(g, lens[0], lens[1], CX - 80, 1660, 'עדשת פורטרט', prog(b, 8.8, 10.2), { sub: '85mm ƒ/1.4', dir: -1 });
    g.restore();
  }
  // projector beam out of the LCD
  const ba = win(b, 12, 17.5, 1.2, 1.5);
  if (ba > 0) {
    const a1 = v.proj([125, -120, 82]), a2 = v.proj([-215, -120, 82]);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = ba;
    const top = Math.min(a1[1], a2[1]);
    const bm = g.createLinearGradient(0, top, 0, top - 900);
    bm.addColorStop(0, 'rgba(255,190,215,.38)'); bm.addColorStop(1, 'rgba(255,190,215,0)');
    g.fillStyle = bm;
    g.beginPath(); g.moveTo(a1[0], a1[1]); g.lineTo(a2[0], a2[1]); g.lineTo(a2[0] - 380, top - 900); g.lineTo(a1[0] + 380, top - 900); g.closePath(); g.fill();
    g.restore();
  }
  SHARED.lcd = v.proj([-45, 0, 82]);
}

const SHARED = {};

function sceneTitles1(b) {
  if (SHARED.lensC) kText(g, 'רגע אחד.', CX, SHARED.lensC[1] + 50, { t: b - 1, size: 160, mode: 'rise', out: 2.7, stagger: .07 });
  kText(g, 'כל קליק', CX, 340, { t: b - 8, size: 150, mode: 'drop', out: 5.2 });
  kText(g, 'הוא סיפור.', CX, 500, { t: b - 10, size: 150, mode: 'rise', out: 3.3, stagger: .05 });
}

// ============================================================ SCENE 3: hologram carousel
const CARDS = (() => {
  const out = []; const r = rng(42);
  const rings = [-430, 0, 430];
  let k = 0;
  rings.forEach((y, ri) => { for (let i = 0; i < 10; i++) out.push({ y, base: (i + (ri % 2) * .5) / 10 * TAU, ph: r() * 10, k: k++, idx: (i * 3 + ri * 5) % 11 }); });
  return out;
})();
const HEROES = [{ b: 16, idx: 0, word: 'רגעים', mode: 'rise' }, { b: 20, idx: 2, word: 'שלא', mode: 'drop' }, { b: 24, idx: 1, word: 'חוזרים.', mode: 'stamp' }];
const HERO_RECT = { x: CX - 410, y: CY + 60 - 512, w: 820, h: 1025 };

function holoCard(img, x, y, w, h, sx, skew, alpha, o = {}) {
  if (alpha <= 0.01 || w < 2) return;
  g.save();
  g.translate(x, y); g.transform(sx, skew, 0, 1, 0, 0);
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'lighter';
  g.drawImage(img, -w / 2, -h / 2, w, h);
  g.globalCompositeOperation = 'source-over';
  bp(g, .8, 1.6 / Math.max(.3, Math.abs(sx)));
  g.strokeRect(-w / 2, -h / 2, w, h);
  corners(g, -w / 2 - 8, -h / 2 - 8, w + 16, h + 16, Math.min(24, w * .12), .7, 1.5);
  if (o.tag) label(o.tag, -w / 2, h / 2 + 16, { font: F.mono(Math.max(10, w * .045), 400), align: 'left', alpha: .8 });
  g.restore();
}

function sceneHolo(b) {
  if (b < 11.8 || b > 30.5) return;
  const Z0 = lerp(1850, 1500, E.inOutSine(prog(b, 14, 28)));
  const cyOff = lerp(120, -40, E.inOutSine(prog(b, 14, 28)));
  const spin = b * .13 + E.outExpo(prog(b, 14, 17)) * 1.6;
  const spread = lerp(.35, 1, E.outExpo(prog(b, 13.8, 15.5)));
  let heroDim = 0;
  for (const h of HEROES) heroDim = Math.max(heroDim, win(b, h.b, h.b + 3.9, .6, .5));
  heroDim = Math.max(heroDim, prog(b, 24, 24.6));
  const fade = 1 - prog(b, 27.4, 29.4);
  const flick = .9 + .1 * Math.sin(b * 41) * Math.sin(b * 13);
  const global = fade * flick * lerp(1, .3, heroDim);
  // rings & axis
  g.save();
  g.globalAlpha = global * clamp(prog(b, 13.5, 15));
  for (const y of [-430, 0, 430]) {
    const s = FOCAL / Z0, rx = 600 * spread * s, ry = rx * .16;
    const yy = CY + (y + cyOff) * s;
    g.setLineDash([6, 12]); bp(g, .45, 1.3, C.rose);
    g.beginPath(); g.ellipse(CX, yy, rx, ry, 0, 0, TAU); g.stroke();
    g.setLineDash([]);
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + spin; const px = CX + Math.cos(a) * rx, py = yy + Math.sin(a) * ry; g.fillStyle = rgba(C.goldL, .6); g.fillRect(px - 1.5, py - 1.5, 3, 3); }
  }
  const col = g.createLinearGradient(0, 300, 0, 1700); col.addColorStop(0, 'rgba(255,200,220,0)'); col.addColorStop(.5, 'rgba(255,200,220,.5)'); col.addColorStop(1, 'rgba(255,200,220,0)');
  g.fillStyle = col; g.fillRect(CX - 1.5, 300, 3, 1400);
  g.restore();
  // cards
  const items = [];
  for (const c of CARDS) {
    const th = c.base + spin;
    const R = 600 * spread;
    const x = Math.sin(th) * R, z = Z0 - Math.cos(th) * R;
    const s = FOCAL / z;
    let sx = CX + x * s, sy = CY + (c.y + cyOff) * s, w = 300 * s, h = 375 * s;
    let cs = Math.cos(th);
    // launch from the camera screen
    const tl = 11.9 + (c.k / CARDS.length) * 2.3;
    const e = E.outExpo(prog(b, tl, tl + 1.3));
    if (e <= 0) continue;
    if (e < 1 && SHARED.lcd) { sx = lerp(SHARED.lcd[0], sx, e); sy = lerp(SHARED.lcd[1], sy, e); w *= lerp(.15, 1, e); h *= lerp(.15, 1, e); cs = lerp(1, cs, e); }
    // photo swap with a flip
    const phase = (b + c.ph) / 2.6, fr = phase % 1;
    const swap = Math.floor(phase);
    let flip = 1; if (fr < .14) flip = Math.abs(Math.cos(fr / .14 * Math.PI));
    const idx = (c.idx + swap * 4 + (fr < .07 ? -4 : 0) + 44) % PHOTOS.length;
    items.push({ z, sx, sy, w, h, cs: cs * flip, sk: Math.sin(th) * .12, a: (cs > 0 ? .8 : .28) * clamp(1.4 - (z - Z0 + 600) / 1400) * lerp(.35, 1, e * e), idx, k: c.k });
  }
  items.sort((p, q) => q.z - p.z);
  for (const it of items) holoCard(PHOTOS[it.idx].holo, it.sx, it.sy, it.w, it.h, it.cs, it.sk, it.a * global, { tag: it.cs > .6 ? `IMG_04${String(10 + it.k).padStart(2, '0')}.CR3` : null });
  // scanline sweep across the hologram
  const sweepY = 300 + ((b * 420) % 1500);
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = global * .6;
  const sw = g.createLinearGradient(0, sweepY - 60, 0, sweepY + 60); sw.addColorStop(0, 'rgba(255,200,220,0)'); sw.addColorStop(.5, 'rgba(255,200,220,.22)'); sw.addColorStop(1, 'rgba(255,200,220,0)');
  g.fillStyle = sw; g.fillRect(0, sweepY - 60, W, 120);
  g.restore();
}

// hero photos that leave the hologram and become "real"
function heroRect(h, b) {
  const t = b - h.b;
  const front = { x: CX - 185, y: CY + 60 - 230, w: 370, h: 462 };
  const e = E.outExpo(clamp(t / 1.1));
  let r = { x: lerp(front.x, HERO_RECT.x, e), y: lerp(front.y, HERO_RECT.y, e), w: lerp(front.w, HERO_RECT.w, e), h: lerp(front.h, HERO_RECT.h, e) };
  return r;
}
function sceneHeroes(b) {
  for (let i = 0; i < HEROES.length; i++) {
    const h = HEROES[i], t = b - h.b;
    if (t < 0) continue;
    const last = i === HEROES.length - 1;
    if (!last && t > 4) continue;
    if (last && b > 30.2) continue;
    let r = heroRect(h, b);
    let alpha = clamp(t / .3), rot = 0;
    if (!last) {
      const q = E.inExpo(prog(t, 3.35, 4));
      const s = lerp(1, .25, q);
      r = { x: r.x + r.w * (1 - s) / 2, y: r.y + r.h * (1 - s) / 2 - q * 300, w: r.w * s, h: r.h * s };
      alpha *= 1 - q; rot = q * (i ? .5 : -.5);
    } else {
      // match cut into the editor's photo well
      const m = E.inOutExpo(prog(b, 27.6, 29.6));
      r = { x: lerp(r.x, EDIT.P.x, m), y: lerp(r.y, EDIT.P.y, m), w: lerp(r.w, EDIT.P.w, m), h: lerp(r.h, EDIT.P.h, m) };
      SHARED.heroM = m;
    }
    const col = E.inOut(prog(t, .25, 1.3));
    const zoom = 1 + .07 * prog(t, 0, 4);
    g.save();
    g.globalAlpha = alpha;
    g.translate(r.x + r.w / 2, r.y + r.h / 2); g.rotate(rot); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 60; g.shadowOffsetY = 30;
    g.fillStyle = '#000'; g.fillRect(r.x, r.y, r.w, r.h);
    g.shadowColor = 'transparent';
    if (last) {
      const raw = prog(b, 28.6, 29.8);
      g.filter = `saturate(${lerp(1, .4, raw)}) contrast(${lerp(1, .84, raw)}) brightness(${lerp(1, .92, raw)}) sepia(${lerp(0, .15, raw)})`;
    }
    drawCover(g, PHOTOS[h.idx].img, r.x, r.y, r.w, r.h, zoom);
    g.filter = 'none';
    if (col < 1) { g.globalAlpha = alpha * (1 - col); drawCover(g, PHOTOS[h.idx].holo, r.x, r.y, r.w, r.h, zoom); }
    g.globalAlpha = alpha;
    const fa = last ? 1 - (SHARED.heroM || 0) : 1;
    g.globalAlpha = alpha * fa;
    bp(g, .9, 2.5); g.strokeRect(r.x, r.y, r.w, r.h);
    corners(g, r.x - 16, r.y - 16, r.w + 32, r.h + 32, 44, .8, 2);
    label(`IMG_04${16 + i * 7}.CR3   1/250   ƒ1.8   ISO 100`, r.x, r.y + r.h + 34, { font: F.mono(20, 400), align: 'left', alpha: E.out(prog(t, .8, 1.5)) });
    label(`${4000 + i * 117} × ${5000 + i * 146}`, r.x + r.w, r.y - 30, { font: F.mono(20, 400), align: 'right', alpha: E.out(prog(t, .9, 1.6)) });
    g.restore();
    kText(g, h.word, CX, 365, { t: t - .1, size: 190, mode: h.mode, out: last ? 4.3 : 3.2, stagger: .08 });
  }
}

// ============================================================ SCENE 4: editing suite
const EDIT = {
  S: { x: 70, y: 560, w: 940, h: 588 },
  P: { x: 470, y: 612, w: 416, h: 520 },
};
function editProg(b) { return E.inOut(prog(b, 30.8, 33.6)); }
function photoFilter(e) { return `saturate(${lerp(.4, 1.15, e)}) contrast(${lerp(.84, 1.06, e)}) brightness(${lerp(.92, 1.04, e)}) sepia(${lerp(.15, 0, e)})`; }

function sceneEdit(b) {
  if (b < 28.8 || b > 41.6) return;
  const S = EDIT.S, P = EDIT.P;
  const draw = E.inOut(prog(b, 28.9, 30.6));
  const m = E.inOut(prog(b, 39.4, 41)); // morph to phone
  const out = 1 - m;
  // camera: slow push-out then glide
  const zs = 1 - .035 * Math.sin(Math.PI * prog(b, 29.6, 39.4));
  g.save();
  g.translate(CX, CY); g.scale(zs, zs); g.translate(-CX, -CY);
  // monitor body
  g.save(); g.globalAlpha = out;
  g.fillStyle = 'rgba(30,14,22,.95)'; roundRect(g, S.x - 20, S.y - 20, S.w * draw + 40, S.h + 40, 18); g.fill();
  bp(g, .9, 2); rectP(g, S.x - 20, S.y - 20, S.w + 40, S.h + 40, draw);
  bp(g, .6, 1.4); rectP(g, S.x, S.y, S.w, S.h, prog(b, 29.3, 30.8));
  // stand
  const st = E.out(prog(b, 29.8, 31));
  bp(g, .85, 1.8);
  polyline(g, [[CX - 60, S.y + S.h + 20], [CX - 90, S.y + S.h + 150], [CX + 90, S.y + S.h + 150], [CX + 60, S.y + S.h + 20]], st);
  g.beginPath(); g.ellipse(CX, S.y + S.h + 156, 210 * st, 18 * st, 0, 0, TAU); g.stroke();
  dim(g, S.x - 20, S.y - 20, S.x + S.w + 20, S.y - 20, '27″  ·  5K  ·  P3', prog(b, 30, 31.5), -50);
  dim(g, S.x + S.w + 20, S.y - 20, S.x + S.w + 20, S.y + S.h + 20, '336 mm', prog(b, 30.4, 31.9), -45);
  g.restore();
  // screen contents
  g.save();
  const ui = clamp(prog(b, 29.6, 30.8)) * clamp(1 - m * 2.2);
  const ep = editProg(b);
  g.beginPath(); g.rect(S.x, S.y, S.w, S.h); g.clip();
  g.globalAlpha = ui;
  g.fillStyle = '#160910'; g.fillRect(S.x, S.y, S.w, S.h);
  g.fillStyle = '#21101a'; g.fillRect(S.x, S.y, S.w, 38);
  ['#ff6b81', '#f1d9a0', '#9fd0a0'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(S.x + 22 + i * 22, S.y + 19, 6, 0, TAU); g.fill(); });
  label('IMG_0430.CR3  —  100%', S.x + S.w / 2, S.y + 20, { font: F.mono(16, 400), alpha: .8 });
  label('עריכה · ריטוש', S.x + S.w - 20, S.y + 20, { font: F.sans(18, 500), align: 'right', rtl: true, color: C.champ });
  // left panel
  const px = S.x + 18, pw = 330;
  g.fillStyle = '#1d0d16'; g.fillRect(S.x, S.y + 38, pw + 30, S.h - 38);
  // histogram
  const hy = S.y + 60, hh = 110;
  g.strokeStyle = rgba(C.gold, .25); g.lineWidth = 1; g.strokeRect(px, hy, pw, hh);
  for (const [colr, off] of [['rgba(255,120,150,.45)', 0], ['rgba(241,217,160,.45)', .7], ['rgba(255,240,240,.35)', 1.4]]) {
    g.fillStyle = colr; g.beginPath(); g.moveTo(px, hy + hh);
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const raw = Math.exp(-Math.pow((u - .32 - off * .02) / .12, 2)) * .9;
      const fin = Math.exp(-Math.pow((u - .5 - off * .03) / .2, 2)) * .75 + Math.exp(-Math.pow((u - .82) / .06, 2)) * .3;
      const v = lerp(raw, fin, ep) * (.9 + .1 * Math.sin(i * 1.7 + off));
      g.lineTo(px + u * pw, hy + hh - v * hh);
    }
    g.lineTo(px + pw, hy + hh); g.closePath(); g.fill();
  }
  // sliders
  const sliders = [['חשיפה', .5, .62], ['ניגודיות', .45, .66], ['חום', .5, .7], ['גוון', .5, .58], ['רוויה', .4, .72], ['בהירות עור', .5, .64]];
  sliders.forEach(([name, a0, a1], i) => {
    const y = hy + hh + 50 + i * 54;
    const lp = E.inOut(prog(b, 30.8 + i * .35, 31.9 + i * .35));
    label(name, px + pw, y - 14, { font: F.sans(17, 400), align: 'right', rtl: true, color: rgba(C.champ, .85) });
    label(((lerp(a0, a1, lp) - .5) * 200 | 0) > 0 ? '+' + ((lerp(a0, a1, lp) - .5) * 200 | 0) : String((lerp(a0, a1, lp) - .5) * 200 | 0), px, y - 14, { font: F.mono(15), align: 'left' });
    g.fillStyle = rgba(C.gold, .25); g.fillRect(px, y + 4, pw, 3);
    const kx = px + pw * lerp(a0, a1, lp);
    g.fillStyle = goldGrad(g, px, 0, px + pw, 0); g.fillRect(px + pw * .5, y + 4, kx - (px + pw * .5), 3);
    g.fillStyle = C.goldL; g.beginPath(); g.arc(kx, y + 5.5, 9, 0, TAU); g.fill();
  });
  // curves
  const cy0 = hy + hh + 50 + 6 * 54, ch = S.y + S.h - cy0 - 20;
  if (ch > 40) {
    g.strokeStyle = rgba(C.gold, .25); g.strokeRect(px, cy0, pw, ch);
    g.strokeStyle = rgba(C.gold, .12);
    for (let k = 1; k < 4; k++) { line(g, px + pw * k / 4, cy0, px + pw * k / 4, cy0 + ch); line(g, px, cy0 + ch * k / 4, px + pw, cy0 + ch * k / 4); }
    g.strokeStyle = C.goldL; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(px, cy0 + ch);
    g.bezierCurveTo(px + pw * .3, cy0 + ch * lerp(.7, .86, ep), px + pw * .7, cy0 + ch * lerp(.3, .1, ep), px + pw, cy0); g.stroke();
  }
  // photo well (raw → edited)
  g.globalAlpha = 1;
  if (b >= 29.6) {
    g.filter = photoFilter(ep);
    drawCover(g, PHOTOS[1].img, P.x, P.y, P.w, P.h, 1.07);
    g.filter = 'none';
    // retouch: brush strokes
    const rp = prog(b, 33.8, 36);
    if (rp > 0 && rp < 1) {
      const path = t => [P.x + P.w * (.35 + .3 * Math.sin(t * 9)), P.y + P.h * (.3 + .25 * t + .05 * Math.cos(t * 13))];
      const [bx, by] = path(rp);
      g.save();
      g.globalCompositeOperation = 'soft-light';
      for (let k = 0; k < 14; k++) { const [x, y] = path(rp - k * .012); const sg = g.createRadialGradient(x, y, 0, x, y, 40); sg.addColorStop(0, 'rgba(255,240,235,.5)'); sg.addColorStop(1, 'rgba(255,240,235,0)'); g.fillStyle = sg; g.beginPath(); g.arc(x, y, 40, 0, TAU); g.fill(); }
      g.restore();
      bp(g, .95, 2, C.champ); circ(g, bx, by, 34); bp(g, .6, 1); circ(g, bx, by, 22);
      for (let k = 0; k < 4; k++) sparkle(g, bx + Math.sin(b * 20 + k * 2) * 40, by + Math.cos(b * 17 + k) * 40, 6 + k, .7);
      label('ריטוש עדין · 100%', bx + 50, by - 40, { font: F.sans(16, 500), align: 'left', rtl: true, color: C.champ });
    }
    // before / after
    const s1 = E.inOut(prog(b, 36, 37.4)), s2 = E.inOut(prog(b, 37.8, 39.2));
    const sp = s1 * .55 * (1 - s2);
    if (b > 36 && b < 39.3) {
      const lx = P.x + P.w * sp;
      g.save(); g.beginPath(); g.rect(P.x, P.y, lx - P.x, P.h); g.clip();
      g.filter = photoFilter(0); drawCover(g, PHOTOS[1].img, P.x, P.y, P.w, P.h, 1.07); g.filter = 'none';
      g.restore();
      g.fillStyle = C.goldL; g.fillRect(lx - 1.5, P.y, 3, P.h);
      g.beginPath(); g.arc(lx, P.y + P.h / 2, 18, 0, TAU); g.fill();
      label('◂ ▸', lx, P.y + P.h / 2 + 1, { font: F.mono(14, 500), color: C.ink });
      const la = win(b, 36.2, 39, .3, .3);
      label('לפני', P.x + 40, P.y + 30, { font: F.sans(20, 500), rtl: true, alpha: la * clamp(sp * 5), color: C.champ });
      label('אחרי', P.x + P.w - 40, P.y + 30, { font: F.sans(20, 500), rtl: true, alpha: la, color: C.champ });
    }
    bp(g, .7, 1.4); g.strokeRect(P.x, P.y, P.w, P.h);
  }
  g.restore();
  g.restore();
  // word pills
  const words = [['עריכה.', 32], ['ריטוש.', 34], ['שלמות.', 36]];
  words.forEach(([w, wb], i) => {
    const t = b - wb;
    if (t < 0) return;
    const x = CX + 300 - i * 300, y = 1400;
    const e = E.outBack(clamp(t / .5)), a = clamp(t * 4) * (1 - prog(b, 39.2, 40));
    g.save(); g.globalAlpha = a;
    g.translate(x, y); g.scale(lerp(1.5, 1, clamp(e, 0, 1.1)), lerp(1.5, 1, clamp(e, 0, 1.1))); g.translate(-x, -y);
    const filled = i === 2;
    roundRect(g, x - 130, y - 52, 260, 104, 52);
    if (filled) { g.fillStyle = goldGrad(g, x - 130, y - 52, x + 130, y + 52, (t * .5) % 1.4 - .2); g.fill(); }
    else { g.fillStyle = 'rgba(40,18,28,.8)'; g.fill(); bp(g, .95, 2.4); g.stroke(); }
    g.restore();
    kText(g, w, x, y + 22, { t: t, size: 64, mode: 'type', stagger: .05, dur: .1, fill: filled ? C.ink : 'gold', glow: !filled, alpha: a });
  });
  SHARED.editM = m;
}

// ============================================================ SCENE 5: client approval on phone
const PHONE = { x: 330, y: 430, w: 420, h: 880, r: 58 };
function scenePhone(b) {
  if (b < 39.4 || b > 49.5) return;
  const S = EDIT.S, P = EDIT.P, Ph = PHONE;
  const m = E.inOut(prog(b, 39.4, 41));
  const fly = E.inExpo(prog(b, 47.6, 48.9)); // camera flies past the phone
  const rr = { x: lerp(S.x, Ph.x, m), y: lerp(S.y, Ph.y, m), w: lerp(S.w, Ph.w, m), h: lerp(S.h, Ph.h, m), r: lerp(6, Ph.r, m) };
  g.save();
  const fs = 1 + fly * 2.2;
  g.translate(CX, 830); g.scale(fs, fs); g.translate(-CX, -830);
  g.globalAlpha = 1 - fly;
  // bezel
  g.fillStyle = 'rgba(30,14,22,.97)';
  roundRect(g, rr.x - 16, rr.y - 16, rr.w + 32, rr.h + 32, rr.r + 14); g.fill();
  bp(g, .9 * m, 2.2); g.stroke();
  bp(g, .6 * m, 1.3); roundRect(g, rr.x, rr.y, rr.w, rr.h, rr.r); g.stroke();
  // side buttons, notch
  g.globalAlpha = (1 - fly) * prog(b, 40.6, 41.4);
  bp(g, .8, 4); line(g, rr.x + rr.w + 18, rr.y + 180, rr.x + rr.w + 18, rr.y + 280); line(g, rr.x - 18, rr.y + 150, rr.x - 18, rr.y + 210); line(g, rr.x - 18, rr.y + 230, rr.x - 18, rr.y + 290);
  dim(g, rr.x - 16, rr.y + rr.h + 16, rr.x - 16, rr.y - 16, '6.1″', prog(b, 41, 42.4), 50);
  g.globalAlpha = 1 - fly;
  // screen
  g.save();
  roundRect(g, rr.x, rr.y, rr.w, rr.h, rr.r); g.clip();
  const ca = clamp(m * 2 - .8);
  g.globalAlpha = (1 - fly) * ca;
  g.fillStyle = '#1a0b12'; g.fillRect(rr.x, rr.y, rr.w, rr.h);
  // gallery grid scrolling under the photo
  const scroll = E.inOut(prog(b, 41, 43.2)) * 520;
  const gx = Ph.x + 14, gw = (Ph.w - 28 - 16) / 3, gy0 = Ph.y + 690 - scroll;
  for (let i = 0; i < 24; i++) {
    const c = i % 3, r = Math.floor(i / 3);
    const y = gy0 + r * (gw + 8);
    if (y > Ph.y + Ph.h || y + gw < Ph.y + 640) continue;
    drawCover(g, PHOTOS[(i * 5 + 3) % PHOTOS.length].img, gx + c * (gw + 8), y, gw, gw, 1.2);
  }
  // header
  g.fillStyle = '#1a0b12'; g.fillRect(Ph.x, Ph.y, Ph.w, 128);
  g.fillStyle = '#000'; roundRect(g, CX - 62, Ph.y + 14, 124, 34, 17); g.fill();
  label('הגלריה שלך', Ph.x + Ph.w - 28, Ph.y + 82, { font: F.serif(34, 700), align: 'right', rtl: true, color: C.champ });
  label('248 תמונות · חני כהן', Ph.x + Ph.w - 28, Ph.y + 112, { font: F.sans(17, 300), align: 'right', rtl: true, color: rgba(C.goldL, .8) });
  g.restore();
  // the edited photo travels from the editor into the phone
  const pr = { x: lerp(P.x, Ph.x + 14, m), y: lerp(P.y, Ph.y + 136, m), w: lerp(P.w, Ph.w - 28, m), h: lerp(P.h, (Ph.w - 28) * 1.25, m) };
  g.save(); g.globalAlpha = 1 - fly;
  g.filter = photoFilter(1);
  roundRect(g, pr.x, pr.y, pr.w, pr.h, 14 * m); g.save(); g.clip();
  drawCover(g, PHOTOS[1].img, pr.x, pr.y, pr.w, pr.h, 1.07);
  g.restore(); g.filter = 'none';
  // heart button + tap
  const hx = Ph.x + Ph.w - 70, hy = pr.y + pr.h - 60;
  const tap = b - 44;
  const ha = prog(b, 41.2, 41.8);
  g.globalAlpha = (1 - fly) * ha;
  g.fillStyle = 'rgba(20,8,14,.6)'; g.beginPath(); g.arc(hx, hy, 40, 0, TAU); g.fill();
  const filled = tap > 0;
  const hs = 30 * (filled ? 1 + .45 * Math.exp(-tap * 5) * Math.sin(tap * 25) : 1);
  heartPath(g, hx, hy + 4, hs);
  if (filled) { g.fillStyle = goldGrad(g, hx - 30, hy - 30, hx + 30, hy + 30); g.fill(); } else { g.strokeStyle = C.champ; g.lineWidth = 3; g.stroke(); }
  // finger
  if (b > 42.8 && b < 45) {
    const fe = E.inOut(prog(b, 42.8, 43.95));
    const fx = lerp(Ph.x + Ph.w + 160, hx, fe), fy = lerp(Ph.y + Ph.h + 140, hy, fe);
    const press = tap > 0 && tap < .25 ? .85 : 1;
    g.globalAlpha = (1 - fly) * (1 - prog(b, 44.4, 45));
    g.fillStyle = 'rgba(246,231,220,.35)'; g.beginPath(); g.arc(fx, fy, 38 * press, 0, TAU); g.fill();
    bp(g, .9, 2, C.champ); circ(g, fx, fy, 38 * press);
  }
  if (tap > 0 && tap < 2) {
    g.globalAlpha = 1 - fly;
    for (let k = 0; k < 3; k++) { const q = prog(tap, k * .12, .9 + k * .12); if (q > 0 && q < 1) { bp(g, (1 - q) * .9, 2.5); circ(g, hx, hy, 40 + q * 120); } }
    const r = rng(5);
    for (let k = 0; k < 12; k++) {
      const a = r() * TAU, d = E.outExpo(clamp(tap / 1.2)) * (90 + r() * 120), q = clamp(tap / 1.4);
      g.globalAlpha = (1 - q) * (1 - fly);
      heartPath(g, hx + Math.cos(a) * d, hy + Math.sin(a) * d - q * 40, 8 + r() * 10);
      g.fillStyle = k % 2 ? C.goldL : C.rose; g.fill();
    }
  }
  g.restore();
  g.restore();
  // approval badge (survives the fly-through and becomes the album emblem)
  const bt = b - 44.35;
  if (bt > 0) {
    const e = E.outBack(clamp(bt / .5));
    const toAlbum = E.inOut(prog(b, 47.6, 48.9));
    const bx = CX, by = lerp(pr.y + pr.h / 2, ALBUM.cy, toAlbum);
    const R = lerp(90 * clamp(e, 0, 1.15), ALBUM.emR, toAlbum);
    SHARED.badge = { x: bx, y: by, r: R };
    if (b < 49.3) {
      g.save();
      g.globalAlpha = clamp(bt * 4) * (1 - prog(b, 48.9, 49.3));
      g.shadowColor = rgba(C.gold, .7); g.shadowBlur = 40;
      g.fillStyle = goldGrad(g, bx - R, by - R, bx + R, by + R, (bt * .6) % 1.4 - .2);
      g.beginPath(); g.arc(bx, by, R, 0, TAU); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = C.ink; g.lineWidth = R * .11; g.lineCap = 'round'; g.lineJoin = 'round';
      const ck = E.out(prog(bt, .15, .55));
      polyline(g, [[bx - R * .38, by + R * .02], [bx - R * .1, by + R * .3], [bx + R * .42, by - R * .3]], ck);
      g.restore();
      label('מאושר', bx, by + R + 46, { font: F.serif(44, 700), rtl: true, color: C.champ, alpha: clamp(bt * 3) * (1 - toAlbum), glow: 20 });
    }
  }
  kText(g, 'את בוחרת.', CX, 320, { t: b - 41, size: 150, mode: 'rise', out: 6.2, stagger: .06 });
}

// ============================================================ SCENE 6: album design
const ALBUM = { cy: 1000, P: 620, emR: 108 };
function albumCover(x, y, P, o = {}) {
  // cover square with top-left (x,y)
  const cg = g.createLinearGradient(x, y, x + P, y + P);
  cg.addColorStop(0, '#f2c7d0'); cg.addColorStop(.5, '#e4a9b7'); cg.addColorStop(1, '#c98597');
  g.fillStyle = cg; roundRect(g, x, y, P, P, 10); g.fill();
  // leather texture lines
  g.save(); g.clip();
  g.strokeStyle = 'rgba(120,50,70,.07)'; g.lineWidth = 1;
  for (let i = -P; i < P * 2; i += 7) { g.beginPath(); g.moveTo(x + i, y); g.lineTo(x + i - P * .3, y + P); g.stroke(); }
  g.fillStyle = 'rgba(90,30,50,.25)'; g.fillRect(x + P - 34, y, 34, P); // spine (right)
  g.restore();
  g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,240,235,.6)'; g.lineWidth = 2;
  roundRect(g, x + 24, y + 24, P - 82, P - 48, 6); g.stroke(); g.setLineDash([]);
  const ex = x + (P - 34) / 2, ey = y + P / 2, R = ALBUM.emR * P / ALBUM.P;
  const foil = o.foil ?? 1;
  if (foil > 0) {
    g.save(); g.globalAlpha *= foil;
    g.fillStyle = goldGrad(g, ex - R, ey - R, ex + R, ey + R, o.sheen ?? -1);
    g.beginPath(); g.arc(ex, ey, R, 0, TAU); g.fill();
    g.restore();
  }
  g.strokeStyle = foil > 0 ? rgba(C.goldD, .9) : 'rgba(120,50,70,.5)'; g.lineWidth = 2;
  g.beginPath(); g.arc(ex, ey, R * .86, 0, TAU); g.stroke();
  g.save();
  g.font = F.serif(R * .78, 700); g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillStyle = foil > 0 ? C.ink : 'rgba(120,50,70,.55)';
  g.fillText('ח״כ', ex, ey + R * .05);
  g.restore();
  g.save(); g.font = F.mono(P * .028, 500); g.letterSpacing = '6px'; g.fillStyle = foil > 0 ? rgba(C.goldD, .95) : 'rgba(120,50,70,.5)'; g.textAlign = 'center';
  g.fillText('HANI COHEN', ex, ey + R + P * .07); g.restore();
  return { ex, ey, R };
}

const SPREAD = [
  { idx: 1, page: 'L', r: [40, 40, 540, 540], at: 52.2 },
  { idx: 9, page: 'R', r: [40, 40, 540, 300], at: 52.7 },
  { idx: 3, page: 'R', r: [40, 360, 260, 200], at: 53.1 },
  { idx: 8, page: 'R', r: [320, 360, 260, 200], at: 53.4 },
];
// draws open spread pages in local coords (spine at x=0, pages y from -P/2)
function drawSpread(b, P, o = {}) {
  const y0 = -P / 2;
  g.fillStyle = '#fbf2ec';
  g.fillRect(-P, y0, P, P); g.fillRect(0, y0, P, P);
  const sg = g.createLinearGradient(-60, 0, 60, 0); sg.addColorStop(0, 'rgba(120,60,70,0)'); sg.addColorStop(.5, 'rgba(120,60,70,.28)'); sg.addColorStop(1, 'rgba(120,60,70,0)');
  g.fillStyle = sg; g.fillRect(-60, y0, 120, P);
  // guides
  const ga = o.guides ?? 0;
  if (ga > 0) {
    g.save(); g.globalAlpha *= ga; g.setLineDash([8, 7]); bp(g, .9, 1.4, C.gold);
    for (const s of SPREAD) { const ox = s.page === 'L' ? -P : 0; rectP(g, ox + s.r[0], y0 + s.r[1], s.r[2], s.r[3], ga); }
    g.setLineDash([]);
    dim(g, -P, y0 + 20, -P + 40, y0 + 20, '', ga, 0);
    label('15mm', -P + 20, y0 + 20, { font: F.mono(13), alpha: ga });
    g.restore();
  }
  for (const s of SPREAD) {
    const t = b - s.at;
    if (t < 0 && !o.all) continue;
    const e = o.all ? 1 : E.outBack(clamp(t / .7));
    const ox = s.page === 'L' ? -P : 0;
    const [x, y, w, h] = s.r;
    const dy = (1 - e) * -700, rot = (1 - clamp(e)) * (s.page === 'L' ? -.4 : .4);
    g.save();
    g.globalAlpha *= o.all ? 1 : clamp(t * 4);
    g.translate(ox + x + w / 2, y0 + y + h / 2 + dy); g.rotate(rot);
    g.shadowColor = 'rgba(60,20,30,.35)'; g.shadowBlur = 20; g.shadowOffsetY = 8;
    g.fillStyle = '#fff'; g.fillRect(-w / 2, -h / 2, w, h); g.shadowColor = 'transparent';
    g.filter = photoFilter(1); drawCover(g, PHOTOS[s.idx].img, -w / 2, -h / 2, w, h, 1.05); g.filter = 'none';
    g.restore();
  }
  if (b > 53.6 || o.all) {
    g.save(); g.globalAlpha *= o.all ? 1 : prog(b, 53.6, 54.2);
    g.font = F.serif(24, 500); g.fillStyle = '#7a4a55'; g.textAlign = 'center'; g.direction = 'rtl';
    g.fillText('פרק א׳ · הרגעים הראשונים', P / 2, y0 + P - 20);
    g.restore();
  }
}

function sceneAlbum(b) {
  if (b < 48.2 || b > 57.2) return;
  const P = ALBUM.P;
  const open = E.inOut(prog(b, 50, 51.6));
  const s = lerp(1, .745, open);
  const shift = lerp(P - (P - 34) / 2, 0, open);
  // circle → square: the badge grows into the cover
  const grow = E.inOutExpo(prog(b, 48.4, 49.6));
  const toPrint = E.inOutExpo(prog(b, 55.4, 56.6));
  g.save();
  g.translate(CX, ALBUM.cy - toPrint * 0); g.scale(s, s); g.translate(shift, 0);
  g.globalAlpha = 1 - toPrint;
  if (grow < 1) {
    const sz = lerp(ALBUM.emR * 2, P, grow), rad = lerp(ALBUM.emR, 10, grow);
    g.save();
    const cx = lerp(-P + (P - 34) / 2, -P / 2, grow), cy = 0;
    roundRect(g, cx - sz / 2, cy - sz / 2, sz, sz, rad); g.clip();
    albumCover(-P - 0, -P / 2, P);
    g.restore();
  } else {
    // cover rotates around the spine (right edge, local x=0)
    const ang = open * Math.PI;
    if (ang > 0) drawSpread(b, P, { guides: win(b, 51.2, 54.6, .5, .6) });
    if (ang < Math.PI / 2) {
      const cs = Math.cos(ang);
      g.save();
      g.transform(cs, -Math.sin(ang) * .08, 0, 1, 0, 0);
      albumCover(-P, -P / 2, P);
      g.fillStyle = `rgba(30,10,20,${(1 - cs) * .5})`; g.fillRect(-P, -P / 2, P, P);
      g.restore();
    } else if (ang < Math.PI * .999) {
      const cs = -Math.cos(ang);
      g.save();
      g.transform(cs, Math.sin(ang) * .08, 0, 1, 0, 0);
      g.fillStyle = '#e7b2be'; g.fillRect(0, -P / 2, P, P);
      g.fillStyle = `rgba(30,10,20,${(1 - cs) * .4})`; g.fillRect(0, -P / 2, P, P);
      g.restore();
    }
    // blueprint dims
    const da = win(b, 49.4, 55.3, .6, .5);
    if (da > 0) {
      g.save(); g.globalAlpha *= da;
      if (open < .5) { dim(g, -P, -P / 2 - 20, 0, -P / 2 - 20, '30 cm', prog(b, 49.4, 50.4), -40); dim(g, -P - 20, P / 2, -P - 20, -P / 2, '30 cm', prog(b, 49.6, 50.6), -40); }
      else { dim(g, -P, -P / 2 - 20, P, -P / 2 - 20, '60 cm  ·  LAY-FLAT', prog(b, 51.4, 52.6), -46); }
      g.restore();
    }
  }
  g.restore();
  kText(g, 'מעוצב', CX, 320, { t: b - 50, size: 170, mode: 'drop', out: 5.2 });
  kText(g, 'בדיוק בשבילך', CX, 470, { t: b - 52, size: 110, mode: 'rise', out: 3.3, stagger: .05 });
  SHARED.albumOpen = open;
}

// ============================================================ SCENE 7: print
const ROLLER_Y = 1000;
function scenePrint(b) {
  if (b < 55.4 || b > 63.2) return;
  const a = win(b, 55.5, 63.1, .8, .6);
  g.save(); g.globalAlpha = a;
  const sheetW = 2 * ALBUM.P * .745, sheetH = ALBUM.P * .745;
  // sheet: arrives where the spread was, slides up, then feeds through the press
  const up = E.inOutExpo(prog(b, 55.5, 56.6));
  const feed = E.inOutSine(prog(b, 56.6, 59.9));
  const top = lerp(ALBUM.cy - sheetH / 2, 520, up) + feed * 1250;
  const sx = CX - sheetW / 2;
  const spin = feed * 30 + b * .2;
  // sheet: blank above the roller, printed below
  g.save();
  g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 30;
  g.fillStyle = '#fbf2ec'; g.fillRect(sx, top, sheetW, sheetH);
  g.restore();
  // registration marks + colour bars on the blank paper
  bp(g, .7, 1.2, '#7a4a55');
  for (const [mx, my] of [[sx + 20, top + 20], [sx + sheetW - 20, top + 20], [sx + 20, top + sheetH - 20], [sx + sheetW - 20, top + sheetH - 20]]) { circ(g, mx, my, 9); line(g, mx - 16, my, mx + 16, my); line(g, mx, my - 16, mx, my + 16); }
  ['#E8B4C0', '#C9A25E', '#8E6A2F', '#3A1F2B'].forEach((c, i) => { g.fillStyle = c; g.fillRect(sx + 60 + i * 26, top + 10, 22, 14); });
  const printLine = ROLLER_Y;
  const ghost = 1 - prog(b, 56.1, 56.8);
  for (const [clipTop, al] of [[top, ghost], [Math.max(top, printLine), 1]]) {
    if (al <= 0 || clipTop > top + sheetH) continue;
    g.save(); g.globalAlpha *= al;
    g.beginPath(); g.rect(sx, clipTop, sheetW, top + sheetH - clipTop + 2); g.clip();
    g.translate(CX, top + sheetH / 2); g.scale(.745, .745);
    drawSpread(b, ALBUM.P, { all: true });
    g.restore();
  }
  // press
  const pa = E.out(prog(b, 55.8, 56.8));
  const rx0 = 40, rx1 = W - 40, rh = 130;
  g.save();
  const rg = g.createLinearGradient(0, ROLLER_Y - rh / 2, 0, ROLLER_Y + rh / 2);
  rg.addColorStop(0, '#3b1c29'); rg.addColorStop(.35, '#b97f8e'); rg.addColorStop(.5, '#f3d2d8'); rg.addColorStop(.65, '#b97f8e'); rg.addColorStop(1, '#2a1220');
  g.globalAlpha = a * pa;
  g.fillStyle = rg; g.fillRect(rx0, ROLLER_Y - rh / 2, (rx1 - rx0), rh);
  // rotating ridges
  g.beginPath(); g.rect(rx0, ROLLER_Y - rh / 2, rx1 - rx0, rh); g.clip();
  g.strokeStyle = 'rgba(60,20,35,.35)'; g.lineWidth = 2;
  for (let k = 0; k < 14; k++) { const ph = ((k / 14 + spin * .05) % 1) * Math.PI; const yy = ROLLER_Y - Math.cos(ph) * rh / 2; line(g, rx0, yy, rx1, yy); }
  g.restore();
  g.globalAlpha = a * pa;
  bp(g, .9, 2); g.strokeRect(rx0, ROLLER_Y - rh / 2, rx1 - rx0, rh);
  // gears
  for (const gx of [rx0, rx1]) {
    g.save(); g.translate(gx, ROLLER_Y); g.rotate(spin * (gx === rx0 ? 1 : -1));
    g.fillStyle = 'rgba(40,18,28,.95)'; g.beginPath(); g.arc(0, 0, 88, 0, TAU); g.fill();
    bp(g, .9, 2);
    g.beginPath();
    for (let i = 0; i < 24; i++) { const a0 = i / 24 * TAU, a1 = (i + .5) / 24 * TAU; g.lineTo(Math.cos(a0) * 88, Math.sin(a0) * 88); g.lineTo(Math.cos(a0) * 100, Math.sin(a0) * 100); g.lineTo(Math.cos(a1) * 100, Math.sin(a1) * 100); g.lineTo(Math.cos(a1) * 88, Math.sin(a1) * 88); }
    g.closePath(); g.stroke();
    circ(g, 0, 0, 30); for (let i = 0; i < 6; i++) { const q = i / 6 * TAU; line(g, Math.cos(q) * 30, Math.sin(q) * 30, Math.cos(q) * 80, Math.sin(q) * 80); }
    g.restore();
  }
  // ink sparks at the nip
  if (feed > 0 && feed < 1) {
    const r = rng(Math.floor(b * 30));
    for (let k = 0; k < 10; k++) sparkle(g, sx + r() * sheetW, ROLLER_Y + rh / 2 + r() * 30, 3 + r() * 6, .6 * a);
  }
  dim(g, rx0 + 100, ROLLER_Y + rh / 2 + 40, rx1 - 100, ROLLER_Y + rh / 2 + 40, '12 COLOR  ·  GICLÉE  ·  300 DPI', prog(b, 56.4, 57.6), 30);
  g.restore();
  kText(g, 'מודפס', CX, 300, { t: b - 57, size: 160, mode: 'stamp', out: 5.4 });
  kText(g, 'באיכות של מוזיאון', CX, 430, { t: b - 59, size: 86, mode: 'rise', out: 3.4, stagger: .04 });
  g.restore();
}

// foil stamping of the closed album
function sceneFoil(b) {
  if (b < 59.4 || b > 64.2) return;
  const P = ALBUM.P;
  const inE = E.outExpo(prog(b, 59.5, 60.6));
  const intoBox = E.inOut(prog(b, 62.6, 63.9));
  const s = lerp(1, .62, intoBox);
  const cy = lerp(-500, ALBUM.cy, inE) + intoBox * (1210 - ALBUM.cy);
  g.save();
  // the album sinks into the box: clip at the box opening
  if (intoBox > 0) { g.beginPath(); g.rect(0, 0, W, BOX.y0 + 4); g.clip(); }
  g.translate(CX, cy); g.scale(s, s);
  const foil = prog(b, 61, 61.15);
  const em = albumCover(-P / 2, -P / 2, P, { foil, sheen: b > 61 ? ((b - 61) * .55) % 1.5 - .25 : -1 });
  g.restore();
  // stamping plate
  const down = E.in(prog(b, 60.4, 61)), upk = E.out(prog(b, 61.15, 61.9));
  const py = lerp(-300, cy - 120, down) - upk * 900;
  if (b < 62) {
    g.save();
    g.fillStyle = 'rgba(40,18,28,.97)'; g.fillRect(CX - 170, py - 70, 340, 100);
    bp(g, .95, 2); g.strokeRect(CX - 170, py - 70, 340, 100);
    line(g, CX - 40, py - 70, CX - 40, py - 900); line(g, CX + 40, py - 70, CX + 40, py - 900);
    g.strokeStyle = 'rgba(255,170,120,.6)'; g.lineWidth = 2;
    for (let k = 0; k < 5; k++) { g.beginPath(); for (let x = -140; x <= 140; x += 10) g.lineTo(CX + x, py - 40 + k * 12 + Math.sin(x * .1 + b * 20 + k) * 3); g.stroke(); }
    label('HOT FOIL · 24K · 120°C', CX + 190, py - 20, { font: F.mono(18, 500), align: 'left' });
    g.restore();
  }
  if (b > 61) {
    const t = b - 61, r = rng(3);
    for (let k = 0; k < 26; k++) {
      const a = r() * TAU, d = E.outExpo(clamp(t / 1.2)) * (120 + r() * 320);
      sparkle(g, CX + Math.cos(a) * d, ALBUM.cy + Math.sin(a) * d, (4 + r() * 10) * (1 - clamp(t / 1.6)), 1, a);
    }
  }
  void em;
}

// ============================================================ SCENE 8: box, map, home
const BOX = { x0: 250, x1: 830, y0: 1050, y1: 1420, depth: 120 };
function drawBox(b, o = {}) {
  const { x0, x1, y0, y1, depth } = BOX;
  const lid = o.lid ?? 0, rib = o.ribbon ?? 0, lidOpen = o.lidOpen ?? 0;
  // interior (opening)
  g.fillStyle = '#4d2433';
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + 40, y0 - depth); g.lineTo(x1 - 40, y0 - depth); g.lineTo(x1, y0); g.closePath(); g.fill();
  bp(g, .9, 1.8); g.stroke();
  if (o.inside) o.inside();
  // front face
  const fg = g.createLinearGradient(x0, y0, x1, y1); fg.addColorStop(0, '#f0bfca'); fg.addColorStop(1, '#d996a7');
  g.fillStyle = fg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  bp(g, .9, 2); g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  label('HANI COHEN · PHOTOGRAPHY', CX, y1 - 50, { font: F.mono(20, 500), color: rgba(C.goldD, .9), track: 4 });
  // lid
  if (lid > 0) {
    const ly = lerp(y0 - 700, y0, E.outBack(lid)) - lidOpen * 520;
    const rot = lidOpen * -.35;
    g.save(); g.translate(CX, ly); g.rotate(rot); g.translate(-CX, -ly);
    g.fillStyle = '#c98597';
    g.beginPath(); g.moveTo(x0 - 16, ly - 20); g.lineTo(x0 + 30, ly - 20 - depth); g.lineTo(x1 - 30, ly - 20 - depth); g.lineTo(x1 + 16, ly - 20); g.closePath(); g.fill(); bp(g, .9, 1.8); g.stroke();
    const lg = g.createLinearGradient(0, ly - 20, 0, ly + 90); lg.addColorStop(0, '#f3c9d2'); lg.addColorStop(1, '#de9fb0');
    g.fillStyle = lg; g.fillRect(x0 - 16, ly - 20, x1 - x0 + 32, 110); bp(g, .9, 2); g.strokeRect(x0 - 16, ly - 20, x1 - x0 + 32, 110);
    if (rib > 0) {
      g.fillStyle = goldGrad(g, CX - 26, 0, CX + 26, 0);
      const vr = E.inOut(clamp(rib * 2));
      g.fillRect(CX - 24, ly - 20 - depth, 48, (depth + 110) * vr);
      // bow
      const bw = E.outBack(prog(rib, .45, 1));
      if (bw > 0) {
        g.save(); g.translate(CX, ly - 20 - depth * .5); g.scale(bw, bw);
        g.fillStyle = goldGrad(g, -150, -60, 150, 60, (b * .3) % 1.4 - .2);
        for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sgn * 60, -110, sgn * 170, -70, sgn * 120, 0); g.bezierCurveTo(sgn * 170, 60, sgn * 70, 50, 0, 0); g.fill(); g.beginPath(); g.moveTo(0, 0); g.lineTo(sgn * 70, 120); g.lineTo(sgn * 40, 130); g.closePath(); g.fill(); }
        g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
        g.restore();
      }
    }
    g.restore();
  }
  if (rib > 0 && lidOpen < .05) {
    g.fillStyle = goldGrad(g, CX - 26, 0, CX + 26, 0);
    const vr = E.inOut(clamp(rib * 2 - .2));
    g.fillRect(CX - 24, y0 + 90, 48, (y1 - y0 - 90) * vr);
    g.fillStyle = goldGrad(g, 0, 1210, 0, 1250);
    g.fillRect(x0, 1205, (x1 - x0) * E.inOut(clamp(rib * 2 - .4)), 44);
  }
}

// map geometry
const MAP = (() => {
  const r = rng(11), streets = [];
  for (let i = 0; i < 9; i++) streets.push([[-100, 380 + i * 165 + r() * 40], [W + 100, 360 + i * 165 + r() * 60]]);
  for (let i = 0; i < 7; i++) streets.push([[60 + i * 165 + r() * 30, 250], [40 + i * 165 + r() * 50, 1750]]);
  const path = [[290, 1430], [290, 1180], [520, 1180], [520, 860], [800, 860], [800, 640]];
  return { streets, path, S: path[0], Hm: path[path.length - 1] };
})();
function pathAt(pts, p) {
  const segs = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(d); L += d; }
  let rem = L * clamp(p);
  for (let i = 1; i < pts.length; i++) { if (rem <= segs[i - 1]) { const k = rem / segs[i - 1]; return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; } rem -= segs[i - 1]; }
  return pts[pts.length - 1];
}
function house(x, y, s, p = 1, doorOpen = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = 'rgba(40,18,28,.95)';
  g.beginPath(); g.moveTo(-100, 0); g.lineTo(-100, -120); g.lineTo(0, -200); g.lineTo(100, -120); g.lineTo(100, 0); g.closePath(); g.fill();
  bp(g, .95, 2.4 / s * Math.min(s, 1.5));
  polyline(g, [[-100, 0], [-100, -120], [0, -200], [100, -120], [100, 0]], p, true);
  // window
  polyline(g, [[40, -95], [75, -95], [75, -60], [40, -60]], p, true);
  // door
  const dw = 46, dh = 80;
  g.fillStyle = 'rgba(255,220,180,' + (.9 * doorOpen) + ')'; g.fillRect(-dw / 2, -dh, dw, dh);
  if (doorOpen > 0) { const gl = g.createRadialGradient(0, -dh / 2, 0, 0, -dh / 2, 160); gl.addColorStop(0, `rgba(255,220,180,${.6 * doorOpen})`); gl.addColorStop(1, 'rgba(255,220,180,0)'); g.fillStyle = gl; g.fillRect(-170, -200, 340, 320); }
  g.fillStyle = 'rgba(70,32,46,1)'; g.fillRect(-dw / 2, -dh, dw * (1 - doorOpen), dh);
  bp(g, .9, 1.6 / Math.max(s, .5)); polyline(g, [[-dw / 2, 0], [-dw / 2, -dh], [dw / 2 - dw * doorOpen, -dh], [dw / 2 - dw * doorOpen, 0]], p);
  g.restore();
}

function sceneDeliver(b) {
  if (b < 62.4 || b > 72.4) return;
  const a = win(b, 62.4, 72.1, .4, .5);
  const zoomOut = E.inOutExpo(prog(b, 66, 67.2));
  const zoomIn = E.inExpo(prog(b, 69, 70));
  const travel = E.inOutSine(prog(b, 67, 69));
  const pos = pathAt(MAP.path, travel);
  // ---- map layer
  const ma = clamp(zoomOut * 1.4) * (1 - prog(b, 69.6, 70.1));
  if (ma > 0) {
    g.save(); g.globalAlpha = a * ma;
    const zs = 1 + zoomIn * 7;
    g.translate(MAP.Hm[0], MAP.Hm[1]); g.scale(zs, zs); g.translate(-MAP.Hm[0], -MAP.Hm[1]);
    g.translate((CX - MAP.Hm[0]) * zoomIn, (1150 - MAP.Hm[1]) * zoomIn);
    bp(g, .2, 6, C.rose); for (const s of MAP.streets) line(g, s[0][0], s[0][1], s[1][0], s[1][1], E.inOut(prog(b, 66, 67.4)));
    bp(g, .5, 1, C.goldL); for (const s of MAP.streets) line(g, s[0][0], s[0][1], s[1][0], s[1][1], E.inOut(prog(b, 66, 67.4)));
    g.setLineDash([10, 6]); bp(g, .3, 1.2); circ(g, 760, 1380, 110, prog(b, 66.3, 67.3)); g.setLineDash([]);
    label('פארק', 760, 1380, { font: F.sans(22, 300), rtl: true, alpha: .6 });
    g.save(); g.setLineDash([18, 12]); g.lineDashOffset = -b * 40;
    g.shadowColor = rgba(C.gold, .8); g.shadowBlur = 16;
    bp(g, 1, 6, C.goldL); polyline(g, MAP.path, E.inOut(prog(b, 66.6, 68.4)));
    g.restore();
    // pins
    for (const [p, txt, tb] of [[MAP.S, 'הסטודיו', 66.6], [MAP.Hm, 'הבית שלך', 67.2]]) {
      const e = E.outBack(prog(b, tb, tb + .5));
      if (e <= 0) continue;
      g.save(); g.translate(p[0], p[1]); g.scale(e, e);
      g.fillStyle = goldGrad(g, -20, -60, 20, 0); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-26, -30, -26, -62, 0, -62); g.bezierCurveTo(26, -62, 26, -30, 0, 0); g.fill();
      g.fillStyle = C.ink; g.beginPath(); g.arc(0, -40, 9, 0, TAU); g.fill();
      g.restore();
      label(txt, p[0], p[1] + 34, { font: F.sans(28, 500), rtl: true, color: C.champ, alpha: e > 0 ? 1 : 0, glow: 10 });
    }
    house(MAP.Hm[0] + 110, MAP.Hm[1] + 20, .55, prog(b, 67, 67.8));
    label('3.2 ק״מ · משלוח מבוטח', 300, 1000, { font: F.sans(22, 400), rtl: true, alpha: prog(b, 67.6, 68.2) });
    g.restore();
  }
  // ---- the box (big → icon travelling the route)
  const icon = zoomOut;
  if (b < 69.6) {
    const bs = lerp(1, .14, icon), bx = lerp(CX, pos[0], icon), by = lerp(1235, pos[1] - 34, icon);
    g.save(); g.globalAlpha = a * (1 - zoomIn);
    g.translate(bx, by); g.scale(bs, bs); g.translate(-CX, -1235);
    drawBox(b, { lid: prog(b, 63.8, 64.6), ribbon: prog(b, 64.8, 66) });
    g.restore();
  }
  // ---- home: door opens, box at the doorstep
  if (b > 69.4) {
    const he = E.outExpo(prog(b, 69.4, 70.2));
    const door = E.inOut(prog(b, 70, 70.6));
    g.save(); g.globalAlpha = a * clamp((b - 69.4) * 3);
    house(CX, 1010, lerp(1.2, 2.9, he), 1, door);
    // box at doorstep
    const lidOpen = E.outExpo(prog(b, 70.4, 71.2));
    g.translate(CX, 1250); g.scale(.62, .62); g.translate(-CX, -1235);
    drawBox(b, { lid: 1, ribbon: 1, lidOpen, inside: () => {
      if (lidOpen > 0) {
        const gl = g.createRadialGradient(CX, BOX.y0 - 60, 0, CX, BOX.y0 - 60, 460 * lidOpen);
        gl.addColorStop(0, 'rgba(255,240,215,.75)'); gl.addColorStop(.3, 'rgba(241,217,160,.35)'); gl.addColorStop(1, 'rgba(241,217,160,0)');
        g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gl; g.fillRect(-500, -500, W + 1000, H + 1000); g.restore();
      }
    } });
    g.restore();
    if (b > 70.4) {
      const t = b - 70.4, r = rng(21);
      for (let k = 0; k < 30; k++) { const ang = -Math.PI / 2 + (r() - .5) * 2.2, d = E.outExpo(clamp(t / 1.3)) * (150 + r() * 600); sparkle(g, CX + Math.cos(ang) * d, 1170 + Math.sin(ang) * d, (5 + r() * 12) * (1 - clamp(t / 1.8)), 1, ang); }
    }
  }
  kText(g, 'עד הבית שלך.', CX, 330, { t: b - 67, size: 140, mode: 'rise', out: 3.4, stagger: .05 });
}

// ============================================================ SCENE 9: end card
function sceneEnd(b) {
  if (b < 70.8) return;
  // glow collapses into a disc → the lens again
  const LX = CX, LY = 760;
  const disc = E.inOutExpo(prog(b, 70.9, 71.9));
  if (b < 72.05) {
    const R = lerp(900, 335, disc);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gl = g.createRadialGradient(LX, lerp(1170, LY, disc), 0, LX, lerp(1170, LY, disc), R);
    gl.addColorStop(0, 'rgba(255,240,225,.9)'); gl.addColorStop(.8, 'rgba(241,200,170,.45)'); gl.addColorStop(1, 'rgba(241,200,170,0)');
    g.fillStyle = gl; g.fillRect(0, 0, W, H);
    g.restore();
  }
  if (b < 71.9) return;
  const t = b - 72;
  let ap = 1;
  if (t < .05) ap = 0; else if (t < .25) ap = 0; else ap = E.out(prog(t, .25, .9));
  const dimL = lerp(1, .4, E.inOut(prog(t, .6, 1.6)));
  const s = 335 / 118 * lerp(1, .94, E.inOutSine(prog(t, 0, 6)));
  g.save();
  g.globalAlpha = clamp((b - 71.9) * 8);
  // blueprint rings
  bp(g, .5, 1.3);
  for (const [k, sp] of [[1.18, .2], [1.32, -.13], [1.5, .08]]) {
    g.save(); g.translate(LX, LY); g.rotate(b * sp);
    g.setLineDash([4, 10 + k * 8]); circ(g, 0, 0, 118 * s * k / 1.0 * .98, E.inOut(prog(t, 0, 1.2)));
    g.restore();
  }
  g.setLineDash([]);
  crosshair(g, LX, LY, 380, E.out(prog(t, .2, 1.2)), .25);
  g.save(); g.translate(LX, LY); g.scale(s, s); g.globalAlpha *= dimL;
  g.fillStyle = 'rgba(40,18,28,1)'; g.beginPath(); g.arc(0, 0, 150, 0, TAU); g.fill();
  bp(g, .9, 1.4 / s); circ(g, 0, 0, 150); circ(g, 0, 0, 138);
  drawGlass(118, ap, b);
  g.restore();
  g.restore();
  // logo
  kText(g, TL.brand.name, CX, LY + 60, { t: t - .6, size: 200, mode: 'stamp', stagger: .07, glowBlur: 50 });
  if (t > 1.1) {
    g.save(); g.globalAlpha = E.out(prog(t, 1.1, 1.9));
    const tw = 380 * E.outExpo(prog(t, 1.1, 2));
    g.fillStyle = goldGrad(g, CX - tw / 2, 0, CX + tw / 2, 0); g.fillRect(CX - tw / 2, LY + 105, tw, 2);
    g.restore();
    kText(g, TL.brand.title, CX, LY + 175, { t: t - 1.3, size: 54, font: F.sans(54, 300), track: 22, mode: 'rise', fill: C.champ, glow: false });
  }
  kText(g, TL.brand.tagline, CX, 1180, { t: t - 2, size: 86, mode: 'rise', stagger: .05, fill: C.champ, glowColor: 'rgba(232,180,192,.5)' });
  // CTA button
  if (t > 2.6) {
    const e = E.outBack(clamp((t - 2.6) / .6));
    const pulse = 1 + .03 * Math.sin((t - 2.6) * Math.PI * 2 / 1);
    const bw = 600, bh = 128, by = 1340;
    g.save();
    g.translate(CX, by); g.scale(e * pulse, e * pulse);
    g.shadowColor = rgba(C.gold, .6); g.shadowBlur = 50 + 20 * Math.sin(t * 6);
    roundRect(g, -bw / 2, -bh / 2, bw, bh, bh / 2);
    g.fillStyle = goldGrad(g, -bw / 2, -bh / 2, bw / 2, bh / 2, ((t - 2.6) * .45) % 1.5 - .25); g.fill();
    g.shadowBlur = 0;
    g.font = F.serif(58, 700); g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillText(TL.brand.cta + '  ←', 0, 4);
    g.restore();
  }
  if (t > 3.2) {
    const e = E.out(prog(t, 3.2, 4));
    label(`${TL.brand.phone}   ·   ${TL.brand.instagram}`, CX, 1490 + (1 - e) * 20, { font: F.mono(34, 400), color: C.champ, alpha: e });
  }
  // sparkles around logo
  const r = rng(77);
  for (let k = 0; k < 14; k++) { const ph = r() * TAU; const a = Math.max(0, Math.sin(b * 2 + ph)); sparkle(g, CX + (r() - .5) * 900, LY + (r() - .5) * 760, 4 + r() * 8, a * prog(t, .8, 2) * .8, b); }
}

// ============================================================ master
function renderBeat(b, frame = 0) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  drawBG(b);
  const [sx, sy] = shake(b);
  g.save(); g.translate(sx, sy);
  sceneCamera(b);
  sceneHolo(b);
  sceneHeroes(b);
  sceneEdit(b);
  scenePhone(b);
  sceneAlbum(b);
  scenePrint(b);
  sceneDeliver(b);
  sceneFoil(b);
  sceneEnd(b);
  sceneTitles1(b);
  g.restore();
  hud(b);
  post(b, frame);
}
