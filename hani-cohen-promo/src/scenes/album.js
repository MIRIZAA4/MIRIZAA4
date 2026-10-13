import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Blueprint } from '../blueprint.js';
import { mats, patchReveal, revealUniforms, syncReveal, dust, textPlane } from '../materials.js';
import { clamp, lerp, rng, ease, keys, env } from '../util.js';
import { T } from '../timeline.js';
import { HERO, PW, PH, CATEGORY_PHOTO } from '../photos.js';

// Scenes 5-6: client picks favourites on her phone, the picks fly into an
// album layout, the album closes and is sent for approval.
const O = new THREE.Vector3(400, 0, 0);
const SCW = 720, SCH = 1536;
const PSW = 1.5, PSH = 3.2;
const AY = -7; // album height below the phone

// selected photos (gallery cell index -> photo index)
export const PICKS = [HERO, CATEGORY_PHOTO.maternity, 1, 4, 5];
const PICK_CELLS = [0, 4, 2, 7, 9];
const TAPS = [24.3, 24.75, 25.2, 25.65, 26.1]; // dotted-8th grid

export function buildAlbum(photos, { picks = PICKS, foilShine } = {}) {
  const group = new THREE.Group();
  const halves = [];
  const covers = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.19, 0);
    group.add(pivot);
    const cover = new THREE.Mesh(new RoundedBoxGeometry(3.15, 0.08, 3.2, 2, 0.03), mats.velvet());
    cover.position.set(side * 1.575, -0.14, 0);
    pivot.add(cover);
    const pages = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.1, 3.06, 2, 0.02), mats.paper());
    pages.position.set(side * 1.5, -0.05, 0);
    pivot.add(pages);
    halves.push(pivot);
    covers.push(cover);
  }
  // spine
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2, 24, 1, false, 0, Math.PI), mats.velvet());
  spine.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  spine.position.set(0, 0.0, 0);
  group.add(spine);

  // photo slots (in half-local coordinates, on the page surface)
  const slots = [
    { half: 0, x: -1.5, z: 0, w: 2.1, h: 2.62 },
    { half: 1, x: 0.86, z: -0.76, w: 1.08, h: 1.35 },
    { half: 1, x: 2.12, z: -0.76, w: 1.08, h: 1.35 },
    { half: 1, x: 0.86, z: 0.76, w: 1.08, h: 1.35 },
    { half: 1, x: 2.12, z: 0.76, w: 1.08, h: 1.35 },
  ];
  const prints = slots.map((s, i) => {
    const mat = new THREE.MeshStandardMaterial({ map: photos.tex[picks[i]], color: '#a89a9a', emissive: '#ffffff', emissiveMap: photos.tex[picks[i]], emissiveIntensity: 0.18, roughness: 0.5, metalness: 0 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), mat);
    m.userData.slot = s;
    m.userData.local = new THREE.Matrix4().compose(new THREE.Vector3(s.x, 0.004, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), new THREE.Vector3(1, 1, 1));
    m.matrixAutoUpdate = false;
    group.add(m);
    return m;
  });

  // front cover foil (on the outside of the left cover => faces -y before closing)
  const fc = document.createElement('canvas');
  fc.width = fc.height = 1024;
  {
    const g = fc.getContext('2d');
    g.fillStyle = '#fff';
    g.strokeStyle = '#fff';
    g.translate(512, 512);
    g.lineWidth = 7;
    g.beginPath(); g.arc(0, -120, 150, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(0, -120, 132, 0, Math.PI * 2); g.stroke();
    g.font = '700 150px "Frank Ruhl Libre"';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('HC', 0, -112);
    g.direction = 'rtl';
    g.font = '700 88px "Frank Ruhl Libre"';
    g.fillText('חני כהן', 0, 140);
    g.font = '300 40px Heebo';
    g.letterSpacing = '10px';
    g.fillText('האלבום של נועה', 0, 230);
    g.fillRect(-120, 290, 240, 3);
  }
  const foilTex = new THREE.CanvasTexture(fc);
  const shine = foilShine || { uShine: { value: -1 }, uShineCol: { value: new THREE.Color(3.0, 2.4, 1.4) } };
  const foilMat = patchReveal(new THREE.MeshStandardMaterial({ color: '#f0c983', metalness: 1, roughness: 0.2, alphaMap: foilTex, transparent: true, depthWrite: false }), revealUniforms(), { shine });
  const foil = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), foilMat);
  foil.rotation.set(Math.PI / 2, 0, Math.PI);
  foil.position.set(-1.575, -0.1801, 0);
  halves[0].add(foil);

  function setClose(k) {
    halves[0].rotation.z = -Math.PI * k;
    halves[0].position.y = 0.19;
    halves[1].rotation.z = 0;
  }
  function syncPrints(flyFn) {
    group.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    prints.forEach((p, i) => {
      const half = halves[p.userData.slot.half];
      const mLocal = new THREE.Matrix4().multiplyMatrices(inv, half.matrixWorld).multiply(p.userData.local);
      if (flyFn) flyFn(p, i, mLocal);
      else p.matrix.copy(mLocal);
    });
  }
  return { group, halves, covers, prints, slots, setClose, syncPrints, shine, foil };
}

export function buildPhone() {
  const phone = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1.64, 3.36, 0.16, 4, 0.2), mats.roseGold());
  phone.add(body);
  const glass = new THREE.Mesh(new RoundedBoxGeometry(1.58, 3.3, 0.02, 4, 0.18), new THREE.MeshPhysicalMaterial({ color: '#0a0507', roughness: 0.05, clearcoat: 1 }));
  glass.position.z = 0.08;
  phone.add(glass);
  for (const [y, h] of [[0.9, 0.3], [0.45, 0.45]]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.04, h, 0.06, 2, 0.015), mats.roseGold());
    b.position.set(-0.83, y, 0);
    phone.add(b);
  }
  const c = document.createElement('canvas');
  c.width = SCW; c.height = SCH;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(PSW, PSH), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false }));
  screen.position.z = 0.092;
  phone.add(screen);
  return { phone, canvas: c, tex, screen };
}

export function createAlbum(ctx) {
  const { scene, camera, photos } = ctx;
  const root = new THREE.Group();
  root.position.copy(O);
  scene.add(root);

  // ---------- phone ----------
  const P = buildPhone();
  root.add(P.phone);
  const g = P.canvas.getContext('2d');
  const bpPhone = new Blueprint({ width: 1.6, opacity: 0.8 });
  root.add(bpPhone.group);
  bpPhone.rect([0, 0, 0], 1.64, 3.36, { t0: 23.0, dur: 0.9 });
  bpPhone.dim([0.82, -1.68, 0], [0.82, 1.68, 0], [0.4, 0, 0], '6.1″', { t0: 23.3, dur: 0.8, size: 0.14, labelOff: 0.25 });
  bpPhone.dim([-0.82, -1.68, 0], [0.82, -1.68, 0], [0, -0.3, 0], null, { t0: 23.5, dur: 0.8 });

  // gallery grid geometry (screen px)
  const GX = 30, GY = 330, CWD = 214, CHT = 268, GAP = 12;
  const cellRect = (i, scroll) => ({ x: GX + (2 - (i % 3)) * (CWD + GAP), y: GY + Math.floor(i / 3) * (CHT + GAP) - scroll, w: CWD, h: CHT });
  const gridPhoto = (i) => {
    const k = PICK_CELLS.indexOf(i);
    return k >= 0 ? PICKS[k] : (i * 5 + 3) % photos.count;
  };
  const scrollAt = (t) => ease.inOut(rng(t, 24.0, 26.3)) * 210;

  function heart(x, y, s, fill) {
    g.save();
    g.translate(x, y); g.scale(s, s);
    g.beginPath();
    g.moveTo(0, 6);
    g.bezierCurveTo(-14, -4, -10, -16, 0, -9);
    g.bezierCurveTo(10, -16, 14, -4, 0, 6);
    g.fillStyle = fill;
    g.fill();
    g.restore();
  }
  function ripple(x, y, t, t0) {
    const k = rng(t, t0, t0 + 0.45);
    if (k <= 0 || k >= 1) return;
    g.strokeStyle = `rgba(236,201,133,${1 - k})`;
    g.lineWidth = 6;
    g.beginPath(); g.arc(x, y, 20 + k * 70, 0, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`;
    g.beginPath(); g.arc(x, y, 34, 0, Math.PI * 2); g.fill();
  }

  function drawPhone(t) {
    g.clearRect(0, 0, SCW, SCH);
    g.save();
    g.beginPath(); g.roundRect(0, 0, SCW, SCH, 70); g.clip();
    // lock screen
    const gal = ease.inOut(rng(t, 23.7, 24.05));
    g.fillStyle = '#f8e1e6';
    g.fillRect(0, 0, SCW, SCH);
    if (gal < 1) {
      g.save();
      g.globalAlpha = 1 - gal;
      g.translate(0, -gal * 200);
      const wall = ease.inOut(rng(t, 22.85, 23.3));
      g.globalAlpha *= wall;
      g.filter = 'blur(18px)';
      g.drawImage(photos.canvases[HERO], -100, 100, SCW + 200, SCH);
      g.filter = 'none';
      g.fillStyle = 'rgba(248,225,230,0.35)';
      g.fillRect(0, 0, SCW, SCH);
      g.fillStyle = '#fffaf7';
      g.textAlign = 'center';
      g.font = '300 34px Heebo';
      g.direction = 'rtl';
      g.fillText('יום שלישי, 13 באוקטובר', SCW / 2, 250);
      g.font = '500 170px Heebo';
      g.direction = 'ltr';
      g.fillText('10:24', SCW / 2, 420);
      // notification
      const nk = ease.outBack(rng(t, 23.0, 23.35));
      const ny = lerp(-220, 520, nk);
      g.globalAlpha = (1 - gal) * wall;
      g.fillStyle = 'rgba(255,250,248,0.94)';
      g.beginPath(); g.roundRect(30, ny, SCW - 60, 170, 36); g.fill();
      const ig = g.createLinearGradient(SCW - 150, ny + 30, SCW - 50, ny + 130);
      ig.addColorStop(0, '#f3d79e'); ig.addColorStop(1, '#c99a50');
      g.fillStyle = ig;
      g.beginPath(); g.roundRect(SCW - 160, ny + 35, 100, 100, 24); g.fill();
      g.fillStyle = '#3a1424';
      g.font = '700 46px "Frank Ruhl Libre"';
      g.fillText('HC', SCW - 110, ny + 100);
      g.direction = 'rtl';
      g.textAlign = 'right';
      g.font = '500 34px Heebo';
      g.fillText('חני כהן צילום', SCW - 185, ny + 70);
      g.font = '300 32px Heebo';
      g.fillText('הגלריה שלך מוכנה', SCW - 185, ny + 122);
      heart(SCW - 470, ny + 112, 1.4, '#e07a95');
      g.textAlign = 'left';
      g.direction = 'ltr';
      g.font = '300 26px Heebo';
      g.fillStyle = 'rgba(58,20,36,0.5)';
      g.fillText('עכשיו', 60, ny + 52);
      ripple(SCW / 2, ny + 85, t, 23.55);
      g.restore();
    }
    if (gal > 0) {
      g.save();
      g.globalAlpha = gal;
      g.translate(0, (1 - gal) * 300);
      const scroll = scrollAt(t);
      // grid
      for (let i = 0; i < 18; i++) {
        const r = cellRect(i, scroll);
        if (r.y > SCH || r.y + r.h < 120) continue;
        g.save();
        g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 18); g.clip();
        g.drawImage(photos.canvases[gridPhoto(i)], r.x, r.y, r.w, r.h);
        g.restore();
        const k = PICK_CELLS.indexOf(i);
        if (k >= 0 && t > TAPS[k]) {
          const hk = ease.outBack(rng(t, TAPS[k], TAPS[k] + 0.3));
          g.strokeStyle = '#ecc985';
          g.lineWidth = 7;
          g.beginPath(); g.roundRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6, 16); g.stroke();
          g.fillStyle = 'rgba(255,255,255,0.92)';
          g.beginPath(); g.arc(r.x + r.w - 38, r.y + 38, 26 * hk, 0, Math.PI * 2); g.fill();
          heart(r.x + r.w - 38, r.y + 41, 1.6 * hk, '#e07a95');
          ripple(r.x + r.w / 2, r.y + r.h / 2, t, TAPS[k]);
          // burst
          const bk = rng(t, TAPS[k], TAPS[k] + 0.5);
          if (bk > 0 && bk < 1) for (let j = 0; j < 7; j++) {
            const a = j * 0.9 + k;
            heart(r.x + r.w - 38 + Math.cos(a) * 80 * bk, r.y + 38 + Math.sin(a) * 80 * bk - bk * 30, 0.8 * (1 - bk), '#f2a3b8');
          }
        }
      }
      // header
      const hg = g.createLinearGradient(0, 0, 0, 320);
      hg.addColorStop(0, '#f8e1e6'); hg.addColorStop(0.8, '#f8e1e6'); hg.addColorStop(1, 'rgba(248,225,230,0)');
      g.fillStyle = hg;
      g.fillRect(0, 0, SCW, 320);
      g.direction = 'rtl';
      g.textAlign = 'right';
      g.fillStyle = '#3a1424';
      g.font = '700 60px "Frank Ruhl Libre"';
      g.fillText('הגלריה של נועה', SCW - 40, 170);
      g.font = '300 30px Heebo';
      g.fillText('בחרי את התמונות לאלבום', SCW - 40, 225);
      const n = TAPS.filter((x) => t > x).length;
      g.textAlign = 'center';
      g.fillStyle = '#3a1424';
      g.beginPath(); g.roundRect(40, 140, 190, 64, 32); g.fill();
      g.fillStyle = '#f3d79e';
      g.font = '500 28px Heebo';
      g.fillText(`נבחרו ${n}`, 135, 182);
      // approve button
      const bk = ease.outBack(rng(t, 25.9, 26.25));
      if (bk > 0) {
        const by = SCH - 190 + (1 - bk) * 200;
        const bg = g.createLinearGradient(80, by, SCW - 80, by + 110);
        bg.addColorStop(0, '#f3d79e'); bg.addColorStop(1, '#c99a50');
        const press = t > T.approve && t < T.approve + 0.15 ? 0.95 : 1;
        g.save();
        g.translate(SCW / 2, by + 55); g.scale(press, press); g.translate(-SCW / 2, -by - 55);
        g.shadowColor = 'rgba(120,60,20,0.35)'; g.shadowBlur = 30;
        g.fillStyle = bg;
        g.beginPath(); g.roundRect(80, by, SCW - 160, 110, 55); g.fill();
        g.restore();
        g.fillStyle = '#3a1424';
        g.font = '700 46px "Frank Ruhl Libre"';
        g.fillText('אישור הבחירה', SCW / 2, by + 70);
        ripple(SCW / 2, by + 55, t, T.approve);
      }
      // confirmation check
      const ck = rng(t, T.approve + 0.1, T.approve + 0.6);
      if (ck > 0) {
        g.fillStyle = `rgba(58,20,36,${0.55 * Math.min(1, ck * 3)})`;
        g.fillRect(0, 0, SCW, SCH);
        const cx = SCW / 2, cy = SCH / 2 - 60;
        g.strokeStyle = '#ecc985';
        g.lineWidth = 14;
        g.lineCap = 'round';
        g.beginPath(); g.arc(cx, cy, 130, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ease.out(clamp(ck * 1.6))); g.stroke();
        const k2 = ease.out(clamp((ck - 0.55) / 0.45));
        if (k2 > 0) {
          g.beginPath();
          g.moveTo(cx - 60, cy + 5);
          const m = [cx - 15, cy + 50], e = [cx + 65, cy - 45];
          if (k2 < 0.4) g.lineTo(lerp(cx - 60, m[0], k2 / 0.4), lerp(cy + 5, m[1], k2 / 0.4));
          else { g.lineTo(...m); g.lineTo(lerp(m[0], e[0], (k2 - 0.4) / 0.6), lerp(m[1], e[1], (k2 - 0.4) / 0.6)); }
          g.stroke();
        }
        g.fillStyle = '#fbe6ea';
        g.font = '500 44px Heebo';
        g.globalAlpha = gal * clamp((ck - 0.5) * 3);
        g.fillText('הבחירה נשלחה לחני', cx, cy + 230);
      }
      g.direction = 'ltr';
      g.textAlign = 'left';
      g.restore();
    }
    g.restore();
    P.tex.needsUpdate = true;
  }

  // ---------- album ----------
  const A = buildAlbum(photos);
  A.group.position.set(0, AY, 0);
  root.add(A.group);
  const bpAlb = new Blueprint({ width: 1.8, opacity: 0.9 });
  A.group.add(bpAlb.group);
  const yb = 0.2;
  bpAlb.rect([-1.5, yb, 0], 3.0, 3.06, { plane: 'xz', t0: 27.05, dur: 0.7 });
  bpAlb.rect([1.5, yb, 0], 3.0, 3.06, { plane: 'xz', t0: 27.1, dur: 0.7 });
  bpAlb.rect([-1.5, yb, 0], 2.7, 2.76, { plane: 'xz', t0: 27.25, dur: 0.7, width: 1.1 });
  bpAlb.rect([1.5, yb, 0], 2.7, 2.76, { plane: 'xz', t0: 27.3, dur: 0.7, width: 1.1 });
  bpAlb.dashed([0, yb, -1.7], [0, yb, 1.7], { t0: 27.2, dur: 0.6, dashes: 22 });
  for (const s of A.slots) bpAlb.rect([s.x, yb + 0.01, s.z], s.w, s.h, { plane: 'xz', t0: 27.4 + s.x * 0.04 + 0.1, dur: 0.6, width: 2.2 });
  bpAlb.dim([-3.0, yb, -1.53], [3.0, yb, -1.53], [0, 0, -0.4], '60 ס״מ', { t0: 28.0, dur: 0.8, size: 0.2, rot: [-Math.PI / 2, 0, 0], labelOff: 0.22 });
  bpAlb.dim([3.0, yb, -1.53], [3.0, yb, 1.53], [0.4, 0, 0], '30 ס״מ', { t0: 28.2, dur: 0.8, size: 0.2, rot: [-Math.PI / 2, 0, Math.PI / 2], labelOff: 0.25 });
  bpAlb.label('GUTTER', [0.0, yb, 1.95], { t0: 28.4, size: 0.13, rot: [-Math.PI / 2, 0, 0] });
  bpAlb.label('BLEED 3 mm', [-2.2, yb, 1.95], { t0: 28.5, size: 0.13, rot: [-Math.PI / 2, 0, 0] });
  bpAlb.label('LAYFLAT · 300 gsm', [2.0, yb, 1.95], { t0: 28.6, size: 0.13, rot: [-Math.PI / 2, 0, 0] });
  const albumU = revealUniforms({ mode: 0, axis: [1, 0, 0], range: [-3.3, 3.3], edge: 0.08 });
  A.group.traverse((o) => { if (o.isMesh && o !== A.foil && !A.prints.includes(o)) patchReveal(o.material, albumU); });

  // paper plane (line drawing) + approval stamp
  const plane = new THREE.Group();
  root.add(plane);
  const bpPlane = new Blueprint({ width: 2.6, opacity: 1 });
  plane.add(bpPlane.group);
  const pp = [[0, 0, -0.5], [0.35, 0, 0.35], [0, 0.02, 0.15], [-0.35, 0, 0.35], [0, 0, -0.5], [0, -0.14, 0.3], [0, 0.02, 0.15]];
  bpPlane.polyline(pp, { t0: 31.95, dur: 0.35, e: ease.out });
  const trail = [];
  const trailGeo = new THREE.BufferGeometry();
  const trailPos = new Float32Array(60 * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trailPts = new THREE.Points(trailGeo, new THREE.PointsMaterial({ size: 0.05, color: '#f3d79e', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  trailPts.frustumCulled = false;
  root.add(trailPts);
  const planePath = (t) => {
    const k = clamp((t - 32.2) / 1.4);
    const e = ease.in(k);
    return new THREE.Vector3(lerp(1.5, -1.0, e) + Math.sin(k * 5) * 0.4, AY + 0.6 + e * 4.4 + Math.sin(k * 3.5) * 0.3, lerp(0.2, 3.6, e));
  };
  const stamp = new THREE.Group();
  stamp.position.set(1.575 + 0.75, AY + 0.42, 1.0);
  root.add(stamp);
  const bpStamp = new Blueprint({ width: 3.2, opacity: 1 });
  stamp.add(bpStamp.group);
  bpStamp.circle([0, 0, 0], 0.42, { axis: 'y', t0: 32.95, dur: 0.35, seg: 64 });
  bpStamp.circle([0, 0, 0], 0.36, { axis: 'y', t0: 33.0, dur: 0.35, seg: 64, width: 1.4 });
  bpStamp.polyline([[-0.17, 0, 0.0], [-0.04, 0, 0.13], [0.2, 0, -0.14]], { t0: 33.2, dur: 0.25 });
  bpStamp.label('אושר', [0, 0, 0.6], { t0: 33.2, size: 0.17, rot: [-Math.PI / 2, 0, 0], font: '500 64px Heebo', dir: 'rtl' });

  const dustP = dust(300, [[-5, AY - 1, -4], [5, 3, 5]], { size: 0.05, seed: 21 });
  root.add(dustP);

  // ---------- flights: phone cells -> album slots ----------
  const tmpM = new THREE.Matrix4(), pa = new THREE.Vector3(), qa = new THREE.Quaternion(), sa = new THREE.Vector3();
  const pb = new THREE.Vector3(), qb = new THREE.Quaternion(), sb = new THREE.Vector3();
  function cellWorldLocal(i, t) {
    // cell centre on the phone screen in root-local space
    const r = cellRect(PICK_CELLS[i], scrollAt(t));
    const x = ((r.x + r.w / 2) / SCW - 0.5) * PSW, y = (0.5 - (r.y + r.h / 2) / SCH) * PSH;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, 0.1), new THREE.Quaternion(), new THREE.Vector3((r.w / SCW) * PSW / A.slots[i].w, (r.h / SCH) * PSH / A.slots[i].h, 1));
    return new THREE.Matrix4().multiplyMatrices(phonePose(t), m);
  }

  function phonePose(t) {
    const rx = keys(t, [[T.select, 0], [24, -0.12], [27, -0.05]]);
    const ry = keys(t, [[T.select, 0], [24, 0.18], [26.5, -0.1]]);
    const y = keys(t, [[26.8, 0], [27.8, 6.0, ease.in]]);
    return new THREE.Matrix4().compose(new THREE.Vector3(0, y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(1, 1, 1));
  }

  function cameraAt(t) {
    const pos = keys(t, [
      [T.select, [0, 0, 3.0]],
      [23.8, [-0.9, 1.0, 7.0], ease.inOut],
      [26.4, [0.7, 0.9, 6.6]],
      [27.0, [0.4, 0.0, 8.0]],
      [27.75, [0, -0.6, 15.5]],
      [28.6, [0, AY + 9.4, 7.4], ease.inOut],
      [29.8, [-1.4, AY + 8.4, 6.8]],
      [30.8, [-2.4, AY + 8.6, 5.0]],
      [31.9, [1.5, AY + 7.0, 4.4]],
      [33.0, [1.7, AY + 6.0, 3.9]],
      [T.print, [0.2, AY + 5.5, 4.6], ease.in],
    ]);
    const look = keys(t, [
      [T.select, [0, 0, 0]],
      [23.8, [0, 0.95, 0], ease.inOut],
      [26.4, [0, 0.9, 0]],
      [27.0, [0, -0.6, 0]],
      [27.75, [0, -3.0, 0]],
      [28.6, [0, AY + 1.6, 0.0], ease.inOut],
      [29.8, [0, AY + 1.4, 0.0]],
      [30.8, [0.4, AY + 1.3, -0.2]],
      [31.9, [1.5, AY + 1.2, -0.2]],
      [33.0, [1.5, AY + 1.1, -0.2]],
      [T.print, [-0.6, AY + 4.0, 2.4], ease.in],
    ]);
    camera.position.set(O.x + pos[0], O.y + pos[1], O.z + pos[2]);
    camera.up.set(0, 1, 0);
    camera.lookAt(O.x + look[0], O.y + look[1], O.z + look[2]);
    camera.rotateZ(Math.sin(t * 0.6) * 0.03);
    camera.fov = 40;
    camera.updateProjectionMatrix();
  }

  function update(t) {
    const active = t >= T.select && t < T.print;
    root.visible = active;
    if (!active) return;
    cameraAt(t);
    camera.updateMatrixWorld();
    // phone
    P.phone.matrix.copy(phonePose(t));
    P.phone.matrix.decompose(P.phone.position, P.phone.quaternion, P.phone.scale);
    P.phone.visible = t < 27.9;
    drawPhone(t);
    bpPhone.update(t, camera, env(t, 22.9, 27.0, 0.2, 0.5) * 0.8);
    bpPhone.group.position.copy(P.phone.position);
    bpPhone.group.rotation.copy(P.phone.rotation);

    // album
    A.group.visible = t > 27.0;
    albumU.uReveal.value = ease.inOut(rng(t, 27.1, 28.3));
    syncReveal(albumU, A.group);
    A.setClose(ease.inOut(rng(t, T.albumClose, 31.7)));
    A.shine.uShine.value = lerp(-0.6, 1.6, rng(t, 31.75, 32.7));
    A.syncPrints((p, i, mSlot) => {
      const t0 = 26.95 + i * 0.12, t1 = 28.55 + i * 0.18;
      const k = clamp((t - t0) / (t1 - t0));
      p.visible = t > t0;
      if (k >= 1) { p.matrix.copy(mSlot); return; }
      const mCell = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(A.group.matrix).invert(), cellWorldLocal(i, Math.min(t, t0)));
      mCell.decompose(pa, qa, sa);
      mSlot.decompose(pb, qb, sb);
      const e = ease.inOut(k);
      const pos = pa.clone().lerp(pb, e);
      pos.y += Math.sin(e * Math.PI) * 0.8;
      pos.z += Math.sin(e * Math.PI) * 1.4;
      const q = qa.clone().slerp(qb, e);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(e * Math.PI) * (i % 2 ? 0.5 : -0.5)));
      const s = sa.clone().lerp(sb, e);
      p.matrix.compose(pos, q, s);
    });
    bpAlb.update(t, camera, env(t, 27.0, 31.0, 0.1, 0.5));
    // plane + stamp
    plane.visible = t > 31.9;
    const pp0 = planePath(t), pp1 = planePath(t + 0.05);
    plane.position.copy(pp0);
    if (pp1.distanceTo(pp0) > 1e-5) plane.lookAt(O.clone().add(pp0).sub(pp1.clone().sub(pp0)));
    plane.rotation.z += Math.sin(t * 4) * 0.2;
    bpPlane.update(t, camera, 1 - rng(t, 33.3, 33.6));
    for (let i = 0; i < 60; i++) {
      const p = planePath(t - i * 0.03);
      trailPos.set([p.x + Math.sin(i) * 0.02, p.y, p.z], i * 3);
    }
    trailGeo.attributes.position.needsUpdate = true;
    trailPts.visible = t > 32.25;
    trailPts.material.opacity = 1 - rng(t, 33.3, 33.6);
    const sk = ease.outBack(rng(t, 32.95, 33.3));
    stamp.scale.setScalar(lerp(1.6, 1, sk));
    bpStamp.update(t, camera, env(t, 32.9, 34, 0.1, 0));
    dustP.userData.drift(t);
  }
  return { update };
}
