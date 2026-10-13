import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Blueprint } from '../blueprint.js';
import { mats, patchReveal, revealUniforms, syncReveal, dust } from '../materials.js';
import { clamp, lerp, rng, ease, keys, env } from '../util.js';
import { T } from '../timeline.js';
import { HERO, PW, PH } from '../photos.js';

// Scene 4: retouching monitor. The photo on screen matches the hero card
// size/position of the previous shot exactly (match cut).
const O = new THREE.Vector3(200, 0, 0);
const SW = 4.8, SH = 3.0, CW = 1600, CH = 1000;
const PX = SW / CW;
const PHOTO = { x: 456, y: 70, w: 688, h: 860 };

export function createEditing(ctx) {
  const { scene, camera, photos } = ctx;
  const root = new THREE.Group();
  root.position.copy(O);
  scene.add(root);

  const U = revealUniforms({ mode: 1, range: [1.2, 4.2], edge: 0.12 });
  const R = (m) => patchReveal(m, U);
  const mon = new THREE.Group();
  root.add(mon);
  const frame = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.16, SH + 0.16, 0.1, 3, 0.05), R(mats.black()));
  frame.position.z = -0.01;
  mon.add(frame);
  const chin = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.16, 0.55, 0.1, 3, 0.05), R(mats.pinkSatin()));
  chin.position.set(0, -SH / 2 - 0.08 - 0.27, -0.01);
  mon.add(chin);
  const back = new THREE.Mesh(new RoundedBoxGeometry(SW + 0.16, SH + 0.7, 0.18, 4, 0.08), R(mats.pinkSatin()));
  back.position.set(0, -0.27, -0.15);
  mon.add(back);
  const neck = new THREE.Mesh(new RoundedBoxGeometry(0.7, 2.0, 0.12, 2, 0.05), R(mats.gold(0.2)));
  neck.position.set(0, -2.3, -0.55);
  neck.rotation.x = 0.28;
  mon.add(neck);
  const base = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 1.4, 3, 0.035), R(mats.gold(0.2)));
  base.position.set(0, -3.3, -0.35);
  mon.add(base);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), R(mats.gold(0.15)));
  logo.position.set(0, -SH / 2 - 0.35, 0.045);
  mon.add(logo);

  const sc = document.createElement('canvas');
  sc.width = CW; sc.height = CH;
  const g = sc.getContext('2d');
  const stex = new THREE.CanvasTexture(sc);
  stex.colorSpace = THREE.SRGBColorSpace;
  stex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: stex, toneMapped: false }));
  screen.position.z = 0.045;
  mon.add(screen);

  // blueprint
  const bp = new Blueprint({ width: 1.7, opacity: 0.85 });
  root.add(bp.group);
  [frame, chin, neck, base].forEach((m, i) => bp.edges(m, { threshold: 25, t0: 16.95 + i * 0.15, dur: 1.0, key: (p) => -Math.abs(p.x) - Math.abs(p.y) }));
  bp.dim([-SW / 2 - 0.08, SH / 2 + 0.08, 0], [SW / 2 + 0.08, SH / 2 + 0.08, 0], [0, 0.45, 0], '27″  ·  5K', { t0: 17.4, dur: 0.9, size: 0.2 });
  bp.dim([SW / 2 + 0.08, -SH / 2 - 0.62, 0], [SW / 2 + 0.08, SH / 2 + 0.08, 0], [0.45, 0, 0], null, { t0: 17.7, dur: 0.9 });
  bp.label('P3 · 10-bit', [SW / 2 + 0.75, 0, 0], { t0: 18.2, size: 0.17, rot: [0, 0, -Math.PI / 2] });
  for (let i = -6; i <= 6; i++) {
    bp.line([i * 0.9, -3.36, -4], [i * 0.9, -3.36, 4], { t0: 17.1 + Math.abs(i) * 0.04, dur: 0.9, width: 1.0 });
  }
  for (let j = -4; j <= 4; j++) bp.line([-5.4, -3.36, j * 0.9], [5.4, -3.36, j * 0.9], { t0: 17.2 + Math.abs(j) * 0.05, dur: 0.9, width: 1.0 });

  // callouts: leader line from a screen point to a label
  const callouts = [
    { text: 'תיקון צבע  01', at: [1240, 300], to: [3.35, 1.25], t0: 18.0 },
    { text: 'ריטוש עדין  02', at: [700, 520], to: [-3.45, 0.55], t0: 19.3 },
    { text: 'איזון אור  03', at: [1400, 700], to: [3.4, -1.05], t0: 20.3 },
  ];
  const sp = (x, y) => [(x - CW / 2) * PX, (CH / 2 - y) * PX, 0.07];
  for (const c of callouts) {
    const a = sp(...c.at);
    const b = [c.to[0], c.to[1], 0.4];
    const elbow = [b[0] * 0.8 + a[0] * 0.2, b[1], 0.3];
    bp.polyline([a, elbow, b], { t0: c.t0, dur: 0.5, width: 2.0 });
    bp.circle(a, 0.06, { t0: c.t0, dur: 0.3, width: 2.4, seg: 24 });
    bp.label(c.text, [b[0] + (b[0] > 0 ? 0.62 : -0.62), b[1] + 0.02, 0.4], { t0: c.t0 + 0.35, size: 0.2, font: '400 64px Heebo', dir: 'rtl', letter: 2 });
  }
  const dustP = dust(260, [[-7, -4, -5], [7, 5, 4]], { size: 0.05, seed: 11 });
  root.add(dustP);

  const sliders = [
    ['חשיפה', 0.5, 0.62], ['ניגודיות', 0.5, 0.58], ['חום', 0.5, 0.71], ['רוויה', 0.5, 0.66], ['גוון עור', 0.5, 0.55],
  ];

  function drawScreen(t) {
    const ui = ease.inOut(rng(t, 17.1, 17.8));
    g.fillStyle = '#140910';
    g.fillRect(0, 0, CW, CH);
    g.globalAlpha = ui;
    // top bar
    g.fillStyle = '#211019';
    g.fillRect(0, 0, CW, 46);
    g.fillStyle = '#f3d79e';
    g.font = '500 22px Heebo';
    g.textBaseline = 'middle';
    g.letterSpacing = '4px';
    g.fillText('HANI COHEN STUDIO  —  RETOUCH', 90, 24);
    g.letterSpacing = '0px';
    for (let i = 0; i < 3; i++) { g.fillStyle = ['#e58fa3', '#ecc985', '#f6dfe5'][i]; g.beginPath(); g.arc(24 + i * 22, 23, 7, 0, Math.PI * 2); g.fill(); }
    // left tools
    g.fillStyle = '#1b0d15';
    g.fillRect(0, 46, 74, CH - 46);
    for (let i = 0; i < 8; i++) {
      const on = i === (t < 19.3 ? 2 : t < 20.3 ? 4 : 6);
      g.strokeStyle = on ? '#ecc985' : 'rgba(249,227,232,0.35)';
      g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(18, 80 + i * 70, 38, 38, 8); g.stroke();
      if (on) { g.fillStyle = 'rgba(236,201,133,0.25)'; g.fill(); }
    }
    // right panel
    const px = 1236;
    g.fillStyle = '#1b0d15';
    g.fillRect(px, 46, CW - px, CH - 46);
    g.direction = 'rtl';
    g.textAlign = 'right';
    g.fillStyle = '#fbe6ea';
    g.font = '500 28px Heebo';
    g.fillText('תיקון צבע', CW - 30, 90);
    sliders.forEach(([name, v0, v1], i) => {
      const y = 150 + i * 62;
      const v = lerp(v0, v1, ease.inOut(rng(t, 18.0 + i * 0.12, 19.0 + i * 0.12)));
      g.font = '300 22px Heebo';
      g.fillStyle = 'rgba(251,230,234,0.8)';
      g.fillText(name, CW - 30, y);
      g.fillStyle = 'rgba(249,227,232,0.18)';
      g.fillRect(px + 30, y + 22, CW - px - 60, 4);
      const kx = px + 30 + (CW - px - 60) * v;
      const gr = g.createLinearGradient(px + 30, 0, kx, 0);
      gr.addColorStop(0, '#b88a45'); gr.addColorStop(1, '#f3d79e');
      g.fillStyle = gr;
      g.fillRect(px + 30, y + 22, kx - px - 30, 4);
      g.fillStyle = '#fff3d6';
      g.beginPath(); g.arc(kx, y + 24, 10, 0, Math.PI * 2); g.fill();
    });
    // histogram
    const hy = 520, hh = 150;
    g.fillStyle = 'rgba(249,227,232,0.06)';
    g.fillRect(px + 30, hy, CW - px - 60, hh);
    const hk = ease.inOut(rng(t, 20.0, 21.0));
    for (const [col, ph] of [['rgba(232,140,165,0.55)', 0], ['rgba(236,201,133,0.55)', 1.3], ['rgba(250,235,240,0.4)', 2.4]]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(px + 30, hy + hh);
      for (let i = 0; i <= 60; i++) {
        const x = i / 60;
        const raw = Math.exp(-Math.pow((x - 0.35) * 4, 2)) * 0.8 + Math.exp(-Math.pow((x - 0.75 - ph * 0.02) * 6, 2)) * 0.3;
        const fixed = Math.exp(-Math.pow((x - 0.52) * 3, 2)) * 0.7 + Math.exp(-Math.pow((x - 0.85 - ph * 0.02) * 6, 2)) * 0.45;
        const v = lerp(raw, fixed, hk) * (0.9 + 0.1 * Math.sin(i * 1.7 + ph));
        g.lineTo(px + 30 + x * (CW - px - 60), hy + hh - v * hh);
      }
      g.lineTo(CW - 30, hy + hh);
      g.fill();
    }
    g.fillStyle = 'rgba(251,230,234,0.8)';
    g.font = '300 22px Heebo';
    g.fillText('היסטוגרמה', CW - 30, hy - 18);
    // tone curve
    const cy = 720, cs = 230;
    g.strokeStyle = 'rgba(249,227,232,0.15)';
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(px + 60 + (i * cs) / 4, cy); g.lineTo(px + 60 + (i * cs) / 4, cy + cs); g.stroke();
      g.beginPath(); g.moveTo(px + 60, cy + (i * cs) / 4); g.lineTo(px + 60 + cs, cy + (i * cs) / 4); g.stroke();
    }
    const ck = ease.inOut(rng(t, 18.2, 19.4)) * 0.16;
    g.strokeStyle = '#ecc985';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(px + 60, cy + cs);
    g.bezierCurveTo(px + 60 + cs * 0.3, cy + cs * (0.7 + ck), px + 60 + cs * 0.7, cy + cs * (0.3 - ck), px + 60 + cs, cy);
    g.stroke();
    g.direction = 'ltr';
    g.textAlign = 'left';
    // filmstrip
    for (let i = 0; i < 9; i++) {
      const fx = 110 + i * 124, fy = 944;
      g.save();
      g.beginPath(); g.roundRect(fx, fy, 110, 46, 6); g.clip();
      g.drawImage(photos.canvases[(i * 3 + 1) % photos.count], 0, 380, PW, 240, fx, fy, 110, 46);
      g.restore();
      if (i === 4) { g.strokeStyle = '#ecc985'; g.lineWidth = 3; g.beginPath(); g.roundRect(fx, fy, 110, 46, 6); g.stroke(); }
    }
    g.globalAlpha = 1;

    // photo: tunnel hero -> RAW -> wipe to edited
    const { x, y, w, h } = PHOTO;
    const after = photos.canvases[HERO], before = photos.before;
    const showRaw = t > 17.45;
    const wipe = ease.inOut(rng(t, 18.1, 19.5));
    if (!showRaw) g.drawImage(after, x, y, w, h);
    else {
      g.drawImage(before, x, y, w, h);
      const wx = x + w * (1 - wipe);
      g.save();
      g.beginPath(); g.rect(wx, y, x + w - wx, h); g.clip();
      g.drawImage(after, x, y, w, h);
      g.restore();
      if (wipe > 0 && wipe < 1) {
        g.fillStyle = '#fff3d6';
        g.fillRect(wx - 2, y, 4, h);
        g.beginPath(); g.arc(wx, y + h / 2, 22, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#3a1424';
        g.font = '700 22px Heebo';
        g.textAlign = 'center';
        g.fillText('⟷', wx, y + h / 2 + 1);
        g.textAlign = 'left';
      }
      const lab = env(t, 17.5, 19.9, 0.2, 0.3);
      if (lab > 0) {
        g.globalAlpha = lab;
        g.font = '500 24px Heebo';
        g.fillStyle = 'rgba(20,9,16,0.6)';
        g.beginPath(); g.roundRect(x + 16, y + 16, 90, 40, 20); g.fill();
        g.beginPath(); g.roundRect(x + w - 106, y + 16, 90, 40, 20); g.fill();
        g.fillStyle = '#fbe6ea';
        g.textAlign = 'center';
        g.fillText('RAW', x + 61, y + 37);
        g.fillStyle = '#f3d79e';
        g.fillText('FINAL', x + w - 61, y + 37);
        g.textAlign = 'left';
        g.globalAlpha = 1;
      }
    }
    // retouch brush path
    const bk = rng(t, 19.35, 20.5);
    if (bk > 0 && bk < 1) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const k = (i / 24) * bk;
        pts.push([x + w * (0.28 + 0.22 * Math.sin(k * 6)), y + h * (0.3 + 0.45 * k)]);
      }
      g.save();
      g.globalCompositeOperation = 'screen';
      g.strokeStyle = 'rgba(255,220,200,0.35)';
      g.lineWidth = 34;
      g.lineCap = 'round';
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke();
      g.restore();
      const p = pts[pts.length - 1];
      g.strokeStyle = '#fff3d6'; g.lineWidth = 3;
      g.beginPath(); g.arc(p[0], p[1], 26, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(p[0], p[1], 3, 0, Math.PI * 2); g.fillStyle = '#fff3d6'; g.fill();
    }
    // pixel loupe
    const lk = env(t, 20.25, 21.85, 0.35, 0.3);
    if (lk > 0) {
      const cx = x + w * 0.44, cy2 = y + h * 0.27;
      const R = 150 * ease.outBack(clamp(lk));
      g.save();
      g.beginPath(); g.arc(cx + 120, cy2 + 40, R, 0, Math.PI * 2); g.clip();
      g.imageSmoothingEnabled = false;
      const srcS = 22;
      const sx = (0.44 * PW) - srcS / 2, sy = (0.27 * PH) - srcS / 2;
      g.drawImage(after, sx, sy, srcS, srcS, cx + 120 - 160, cy2 + 40 - 160, 320, 320);
      g.imageSmoothingEnabled = true;
      g.strokeStyle = 'rgba(236,201,133,0.5)';
      g.lineWidth = 1;
      for (let i = 0; i <= srcS; i++) {
        const q = (i * 320) / srcS;
        g.beginPath(); g.moveTo(cx - 40 + q, cy2 - 120); g.lineTo(cx - 40 + q, cy2 + 200); g.stroke();
        g.beginPath(); g.moveTo(cx - 40, cy2 - 120 + q); g.lineTo(cx + 280, cy2 - 120 + q); g.stroke();
      }
      g.restore();
      g.strokeStyle = '#ecc985'; g.lineWidth = 5;
      g.beginPath(); g.arc(cx + 120, cy2 + 40, R, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(236,201,133,0.8)'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy2, 14, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(cx + 10, cy2 + 10); g.lineTo(cx + 120 - R * 0.7, cy2 + 40 - R * 0.2); g.stroke();
      g.fillStyle = '#f3d79e'; g.font = '500 24px Heebo'; g.textAlign = 'center';
      g.fillText('1 : 1 · 100%', cx + 120, cy2 + 40 + R + 34);
      g.textAlign = 'left';
    }
    // upload modal
    const mk = env(t, 21.55, 30, 0.3, 0);
    if (mk > 0) {
      g.fillStyle = `rgba(20,9,16,${0.55 * mk})`;
      g.fillRect(0, 0, CW, CH);
      const mw = 560, mh = 230, mx = CW / 2 - mw / 2, my = CH / 2 - mh / 2;
      g.globalAlpha = mk;
      g.fillStyle = '#f8e1e6';
      g.beginPath(); g.roundRect(mx, my + (1 - ease.out(mk)) * 40, mw, mh, 26); g.fill();
      const pk = ease.inOut(rng(t, 21.75, 22.4));
      g.direction = 'rtl'; g.textAlign = 'center';
      g.fillStyle = '#3a1424';
      g.font = '700 38px "Frank Ruhl Libre"';
      g.fillText(pk < 1 ? 'מעלה לגלריה של נועה…' : 'הגלריה מוכנה ✓', CW / 2, my + 80);
      g.direction = 'ltr';
      g.fillStyle = 'rgba(58,20,36,0.15)';
      g.beginPath(); g.roundRect(mx + 60, my + 140, mw - 120, 14, 7); g.fill();
      const gr = g.createLinearGradient(mx + 60, 0, mx + mw - 60, 0);
      gr.addColorStop(0, '#d9a85a'); gr.addColorStop(1, '#f3d79e');
      g.fillStyle = gr;
      g.beginPath(); g.roundRect(mx + 60, my + 140, (mw - 120) * pk, 14, 7); g.fill();
      g.fillStyle = '#3a1424'; g.font = '400 24px Heebo';
      g.fillText(Math.round(pk * 248) + ' / 248', CW / 2, my + 195);
      g.globalAlpha = 1;
      g.textAlign = 'left';
    }
    // final: blush wash so the cut into the phone is seamless
    const pink = ease.in(rng(t, 22.35, 22.75));
    if (pink > 0) {
      g.fillStyle = `rgba(248,225,230,${pink})`;
      g.fillRect(0, 0, CW, CH);
    }
    stex.needsUpdate = true;
  }

  function cameraAt(t) {
    // photo centre in world
    const pcx = ((PHOTO.x + PHOTO.w / 2) - CW / 2) * PX, pcy = (CH / 2 - (PHOTO.y + PHOTO.h / 2)) * PX;
    const P = keys(t, [
      [T.edit, [pcx, pcy, 6.29]],
      [18.6, [-2.2, 1.3, 11.2], ease.inOut],
      [20.1, [1.8, 1.1, 10.4]],
      [21.5, [0.6, 0.6, 8.6]],
      [22.2, [0.2, 0.3, 6.0]],
      [22.8, [0, 0, 1.25], ease.in],
    ]);
    const L = keys(t, [
      [T.edit, [pcx, pcy, 0]],
      [18.6, [0, 1.15, 0], ease.inOut],
      [20.1, [0, 1.05, 0]],
      [21.5, [0, 0.5, 0]],
      [22.2, [0, 0.15, 0]],
      [22.8, [0, 0, 0]],
    ]);
    camera.position.set(O.x + P[0], O.y + P[1], O.z + P[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(O.x + L[0], O.y + L[1], O.z + L[2]);
    camera.rotateZ(Math.sin(rng(t, T.edit, 21.5) * Math.PI) * -0.05);
    camera.fov = 40;
    camera.updateProjectionMatrix();
  }

  function update(t) {
    const active = t >= T.edit && t < T.select;
    root.visible = active;
    if (!active) return;
    cameraAt(t);
    camera.updateMatrixWorld();
    U.uReveal.value = ease.inOut(rng(t, 17.0, 18.2));
    syncReveal(U, mon);
    bp.update(t, camera, 1 - rng(t, 21.6, 22.3) * 0.7);
    dustP.userData.drift(t);
    drawScreen(t);
  }
  return { update };
}
