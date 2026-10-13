import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Blueprint } from '../blueprint.js';
import { mats, patchReveal, revealUniforms, syncReveal, holoMaterial, dust, textPlane } from '../materials.js';
import { clamp, lerp, rng, ease, keys, env, shake, mulberry32 } from '../util.js';
import { T } from '../timeline.js';
import { CATEGORY_PHOTO, HERO, PW, PH } from '../photos.js';

// Scenes 1-3: lens + click, orbit to the rear screen, hologram photo tunnel.
const ORIGIN = new THREE.Vector3(0, 0, 0);
const LENS_C = new THREE.Vector3(0.25, 0.1, 0); // lens axis passes through x/y of this point
const LCD_Z = -0.66;

export function buildCameraModel({ withLcd = true } = {}) {
  const rig = new THREE.Group();
  const UL = revealUniforms({ mode: 1, range: [1.05, 0.0], edge: 0.12 });
  const UB = revealUniforms({ mode: 0, axis: [0, 0, -1], range: [-0.8, 0.8], edge: 0.1 });
  const L = (m, o) => patchReveal(m, UL, o);
  const B = (m, o) => patchReveal(m, UB, o);

  // ---- body (lens axis at x = 0.25, y = 0.1 in rig space => rig is offset so lens sits on the origin axis)
  const body = new THREE.Group();
  body.position.set(-LENS_C.x, -LENS_C.y, 0);
  rig.add(body);
  const bodyMeshes = [];
  const add = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    body.add(m);
    bodyMeshes.push(m);
    return m;
  };
  add(new RoundedBoxGeometry(3.4, 2.2, 1.2, 4, 0.2), B(mats.pinkSatin()), [0, 0, 0]);
  add(new RoundedBoxGeometry(1.3, 0.6, 1.05, 3, 0.12), B(mats.pinkSatin()), [0.25, 1.22, -0.05]);
  add(new RoundedBoxGeometry(0.8, 2.05, 0.55, 3, 0.22), B(mats.leather()), [-1.22, -0.03, 0.62]);
  add(new RoundedBoxGeometry(3.42, 0.6, 1.22, 2, 0.15), B(mats.leather()), [0, -0.55, 0]);
  const dial = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 48);
  add(dial, B(mats.gold(0.3)), [1.15, 1.18, 0.0]);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 40), B(mats.gold(0.3)), [-0.95, 1.17, -0.2]);
  add(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 32), B(mats.gold(0.18)), [-1.2, 1.17, 0.3]);
  add(new THREE.TorusGeometry(0.11, 0.03, 12, 24), B(mats.gold()), [1.73, 0.75, 0], [0, Math.PI / 2, 0]);
  add(new THREE.TorusGeometry(0.11, 0.03, 12, 24), B(mats.gold()), [-1.73, 0.75, 0], [0, Math.PI / 2, 0]);
  add(new RoundedBoxGeometry(0.6, 0.3, 0.12, 2, 0.05), B(mats.black()), [0.25, 1.22, -0.6]);
  // rear screen bezel + buttons
  add(new RoundedBoxGeometry(2.5, 1.66, 0.08, 2, 0.04), B(mats.black()), [0.25, -0.1 + 0.0, -0.62]);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 20), B(mats.gold(0.25)), [-1.35, 0.45 - i * 0.32, -0.62], [Math.PI / 2, 0, 0]);
  // front logo
  const logo = textPlane('HANI COHEN', 0.11, { font: '500 64px Heebo', color: '#f1d18f', letter: 14 });
  logo.position.set(1.05, 0.82, 0.605);
  body.add(logo);
  bodyMeshes.logo = logo;
  // LCD screen
  const lcdCanvas = document.createElement('canvas');
  lcdCanvas.width = 1024; lcdCanvas.height = 668;
  const lcdTex = new THREE.CanvasTexture(lcdCanvas);
  lcdTex.colorSpace = THREE.SRGBColorSpace;
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: lcdTex, toneMapped: false }));
  lcd.position.set(0.25, -0.1, LCD_Z - 0.005);
  lcd.rotation.y = Math.PI;
  body.add(lcd);

  // ---- lens (on the rig's z axis)
  const lens = new THREE.Group();
  rig.add(lens);
  const lathe = (pts, mat) => {
    const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), 128);
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, mat);
    lens.add(m);
    return m;
  };
  const dbl = (m) => { m.side = THREE.DoubleSide; return m; };
  lathe([[0.99, 0.6], [1.0, 0.62], [1.0, 0.7], [0.93, 0.72]], L(dbl(mats.gold(0.18))));
  lathe([[0.88, 0.72], [0.885, 0.74], [0.885, 1.24], [0.88, 1.26]], L(dbl(mats.pinkSatin())));
  const rib = new THREE.CylinderGeometry(0.92, 0.92, 0.58, 160, 1, true);
  const rp = rib.attributes.position;
  for (let i = 0; i < rp.count; i++) {
    const x = rp.getX(i), z = rp.getZ(i);
    const a = Math.atan2(z, x);
    const k = Math.round((a / (Math.PI * 2)) * 160);
    const r = k % 2 ? 0.895 : 0.92;
    rp.setX(i, Math.cos(a) * r); rp.setZ(i, Math.sin(a) * r);
  }
  rib.computeVertexNormals();
  rib.rotateX(Math.PI / 2);
  const ribM = new THREE.Mesh(rib, L(dbl(mats.rubber())));
  ribM.position.z = 1.55;
  lens.add(ribM);
  lathe([[0.9, 1.84], [0.905, 1.86], [0.905, 1.93], [0.9, 1.95]], L(dbl(mats.gold(0.15))));
  lathe([[0.885, 1.95], [0.88, 2.22], [0.86, 2.27], [0.8, 2.29], [0.77, 2.27], [0.76, 2.1]], L(dbl(mats.pinkSatin())));
  lathe([[0.82, 2.28], [0.825, 2.3], [0.79, 2.31]], L(dbl(mats.gold(0.12))));
  // printed front ring
  const ringC = document.createElement('canvas');
  ringC.width = ringC.height = 1024;
  {
    const g = ringC.getContext('2d');
    g.translate(512, 512);
    g.font = '400 30px Heebo';
    g.fillStyle = '#f3d79e';
    g.textBaseline = 'middle';
    const txt = 'HANI COHEN  ·  PORTRAIT 85mm  1:1.8  ·  Ø72  ·  ∞  ·  MADE WITH LOVE  ·  ';
    const R = 487;
    let a = -Math.PI / 2;
    for (const ch of txt) {
      const w = g.measureText(ch).width + 3;
      g.save(); g.rotate(a + w / R / 2 + Math.PI / 2); g.fillText(ch, 0, -R); g.restore();
      a += w / R;
      if (a > Math.PI * 1.5) break;
    }
  }
  const ringTex = new THREE.CanvasTexture(ringC);
  ringTex.colorSpace = THREE.SRGBColorSpace;
  const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.8, 128), L(new THREE.MeshStandardMaterial({ color: '#1a0d13', emissive: '#ffffff', emissiveMap: ringTex, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.3 })));
  ringMesh.position.z = 2.2;
  lens.add(ringMesh);
  // interior
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.8, 64), L(mats.black()));
  inner.position.z = 1.7;
  lens.add(inner);
  for (const [r, z] of [[0.7, 1.78], [0.55, 1.86], [0.4, 1.92]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 96), L(new THREE.MeshStandardMaterial({ color: '#6b4a3a', metalness: 1, roughness: 0.4 })));
    ring.position.z = z;
    lens.add(ring);
  }
  // iris blades
  const iris = new THREE.Group();
  iris.position.z = 2.0;
  lens.add(iris);
  const blades = [];
  const NB = 9;
  for (let i = 0; i < NB; i++) {
    const g = new THREE.PlaneGeometry(2.4, 1.4);
    g.translate(0, 0.7, 0);
    const m = new THREE.Mesh(g, patchReveal(new THREE.MeshStandardMaterial({ color: '#8a6a62', metalness: 0.95, roughness: 0.28, side: THREE.DoubleSide }), UL, { clipR: 0.79 }));
    m.userData.a = (i / NB) * Math.PI * 2;
    m.position.z = i * 0.004;
    iris.add(m);
    blades.push(m);
  }
  const setIris = (r, twist) => {
    for (const b of blades) {
      const a = b.userData.a + twist;
      b.rotation.set(0.12, 0, a);
      b.position.x = -Math.sin(a) * r;
      b.position.y = Math.cos(a) * r;
    }
  };
  // glass
  const R = 1.3, th = Math.asin(0.78 / R);
  const glassG = new THREE.SphereGeometry(R, 96, 24, 0, Math.PI * 2, 0, th);
  glassG.rotateX(Math.PI / 2);
  const glass = new THREE.Mesh(glassG, L(mats.glass()));
  glass.position.z = 2.26 - R * Math.cos(th);
  lens.add(glass);

  return { rig, body, lens, lcd, lcdCanvas, lcdTex, setIris, UL, UB, bodyMeshes };
}

export function createCapture(ctx) {
  const { scene, camera, photos } = ctx;
  const root = new THREE.Group();
  scene.add(root);
  const cam = buildCameraModel();
  root.add(cam.rig);

  // ---------- blueprint: lens front view ----------
  const bpLens = new Blueprint({ width: 2.2 });
  cam.rig.add(bpLens.group);
  const zf = 2.34;
  [[1.0, 0.0, 1.1], [0.93, 0.15, 1.0], [0.8, 0.3, 0.9], [0.62, 0.45, 0.8], [0.45, 0.6, 0.7], [0.25, 0.72, 0.6]].forEach(([r, t0, dur], i) => {
    bpLens.circle([0, 0, zf], r, { t0, dur, a0: Math.PI / 2 + i * 0.6, seg: 128, width: i ? 1.6 : 2.4 });
  });
  bpLens.line([-1.5, 0, zf], [1.5, 0, zf], { t0: 0.35, dur: 0.9, width: 1.2 });
  bpLens.line([0, -1.6, zf], [0, 1.6, zf], { t0: 0.45, dur: 0.9, width: 1.2 });
  bpLens.dim([-1.0, -1.05, zf], [1.0, -1.05, zf], [0, -0.25, 0], 'Ø 72 mm', { t0: 0.8, dur: 0.8, size: 0.13, labelOff: -0.17 });
  bpLens.dim([-1.18, -0.8, zf], [-1.18, 0.8, zf], [-0.12, 0, 0], null, { t0: 1.0, dur: 0.7 });
  bpLens.label('85 mm', [-1.55, 0.0, zf], { t0: 1.4, size: 0.12, rot: [0, 0, Math.PI / 2] });
  bpLens.label('f / 1.8', [0.0, 1.32, zf], { t0: 1.2, size: 0.15 });
  bpLens.label('A', [0.72, 0.72, zf], { t0: 1.5, size: 0.1 });
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, r0 = 1.06, r1 = i % 3 ? 1.12 : 1.18;
    bpLens.line([Math.cos(a) * r0, Math.sin(a) * r0, zf], [Math.cos(a) * r1, Math.sin(a) * r1, zf], { t0: 0.9 + i * 0.012, dur: 0.12, pieces: 2, width: 1.2 });
  }

  // ---------- blueprint: body (drawn while orbiting) ----------
  const bpBody = new Blueprint({ width: 1.6, opacity: 0.85 });
  cam.body.add(bpBody.group);
  cam.bodyMeshes.slice(0, 4).forEach((m, i) => bpBody.edges(m, { threshold: 20, t0: 3.9 + i * 0.25, dur: 1.3, key: (p) => -p.z * 3 + p.x }));
  bpBody.dim([-1.7, 1.3, 0.62], [1.7, 1.3, 0.62], [0, 0.5, 0], '134 mm', { t0: 4.6, dur: 0.8, size: 0.16, billboard: true });
  bpBody.dim([1.95, -1.1, -0.62], [1.95, 1.1, -0.62], [0.35, 0, 0], '88 mm', { t0: 5.2, dur: 0.8, size: 0.16, billboard: true, labelOff: 0.3 });
  bpBody.dim([-1.15, -1.25, -0.62], [1.65, -1.25, -0.62], [0, -0.3, 0], '3.2" OLED', { t0: 6.4, dur: 0.8, size: 0.15, billboard: true, labelOff: 0.25 });
  bpBody.label('ISO 100 · 1/250 · RAW', [0.25, 1.95, -0.6], { t0: 6.9, size: 0.14, billboard: true });

  // ---------- LCD content ----------
  const lg = cam.lcdCanvas.getContext('2d');
  const drawLCD = (t) => {
    const W = 1024, H = 668;
    lg.fillStyle = '#0c0508';
    lg.fillRect(0, 0, W, H);
    const k = rng(t, 7.6, 9.5);
    // shuffling grid of thumbs, then one grows
    const cols = 4, rows = 3, gw = 220, gh = 190, ox = (W - cols * 236) / 2 + 8, oy = 60;
    const grow = ease.inOut(rng(t, 8.9, 9.5));
    for (let i = 0; i < cols * rows; i++) {
      const shift = Math.floor(t * 3.333) + i;
      const idx = (i * 5 + Math.floor(shift / 3)) % photos.count;
      const c = i % cols, r = Math.floor(i / cols);
      const wob = Math.sin(t * 6 + i) * 4 * k;
      let x = ox + c * 236 + wob, y = oy + r * 200, w = gw, h = gh;
      if (i === 5) {
        x = lerp(x, 40, grow); y = lerp(y, 40, grow); w = lerp(w, W - 80, grow); h = lerp(h, H - 80, grow);
      }
      const im = photos.canvases[i === 5 ? HERO : idx];
      lg.save();
      lg.beginPath(); lg.roundRect(x, y, w, h, 10); lg.clip();
      const s = Math.max(w / PW, h / PH);
      lg.drawImage(im, x + (w - PW * s) / 2, y + (h - PH * s) / 2, PW * s, PH * s);
      lg.restore();
    }
    // HUD
    lg.fillStyle = '#f3d79e';
    lg.font = '400 26px Heebo';
    lg.textBaseline = 'top';
    lg.fillText('ISO 100   1/250   f/1.8   +0.3', 40, 14);
    lg.textAlign = 'right';
    lg.fillText('●  REC  4K   ▮▮▮', W - 40, 14);
    lg.textAlign = 'left';
    // focus brackets
    lg.strokeStyle = 'rgba(243,215,158,0.9)'; lg.lineWidth = 3;
    const fx = W / 2, fy = H / 2 + 20, fs = 70 + Math.sin(t * 5) * 6;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      lg.beginPath();
      lg.moveTo(fx + sx * fs, fy + sy * fs - sy * 22); lg.lineTo(fx + sx * fs, fy + sy * fs); lg.lineTo(fx + sx * fs - sx * 22, fy + sy * fs);
      lg.stroke();
    }
    cam.lcdTex.needsUpdate = true;
  };

  // ---------- hologram tunnel ----------
  const holo = new THREE.Group();
  root.add(holo);
  const NC = 44;
  const cards = [];
  const rnd = mulberry32(42);
  const cardGeo = new THREE.PlaneGeometry(1.2, 1.5);
  const featureIdx = [6, 12, 18, 24, 30];
  const featurePhotos = [CATEGORY_PHOTO.bride, CATEGORY_PHOTO.maternity, CATEGORY_PHOTO.newborn, CATEGORY_PHOTO.family, CATEGORY_PHOTO.twirl];
  for (let i = 0; i < NC; i++) {
    const a = i * 2.39996 + 0.4;
    const R = 2.15 + rnd() * 0.55;
    const z = -2.4 - i * 0.6;
    const fi = featureIdx.indexOf(i);
    const base = fi >= 0 ? featurePhotos[fi] : (i * 7) % photos.count;
    const m = new THREE.Mesh(cardGeo, holoMaterial(photos.tex[base]));
    m.userData = { home: new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, z), base, swaps: [10.4 + rnd() * 5.5, 12 + rnd() * 4], fi, delay: i * 0.022 };
    m.frustumCulled = false;
    holo.add(m);
    cards.push(m);
  }
  const hero = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.0), holoMaterial(photos.tex[HERO]));
  hero.position.set(0, 0, -31);
  hero.frustumCulled = false;
  holo.add(hero);
  // tunnel rings + labels
  const bpTun = new Blueprint({ width: 1.6, opacity: 0.8 });
  holo.add(bpTun.group);
  const ringGroups = [];
  for (let k = 0; k < 9; k++) {
    const z = -3 - k * 3.1;
    const g = new THREE.Group();
    g.position.z = z;
    bpTun.group.add(g);
    ringGroups.push(g);
    bpTun.circle([0, 0, 0], 3.25, { t0: 9.7 + k * 0.12, dur: 0.9, seg: 160, parent: g, width: 1.6 });
    const ticks = [];
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2, r1 = i % 6 ? 3.33 : 3.45;
      ticks.push(Math.cos(a) * 3.25, Math.sin(a) * 3.25, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
    }
    bpTun.segments(ticks, { t0: 10.0 + k * 0.12, dur: 0.8, parent: g, width: 1.2 });
    if (k % 2 === 0) bpTun.circle([0, 0, 0], 3.7, { t0: 10.1 + k * 0.12, dur: 1.1, seg: 160, parent: g, width: 1.0, arc: Math.PI * 0.6, a0: k });
  }
  const tags = ['RAW · 6000×4000', 'ISO 100', 'f/1.8 · 1/250', 'IMG_0427.CR3', 'COLOR · P3', '★★★★★', 'IMG_0512.CR3', 'GOLDEN HOUR', 'IMG_0618.CR3', '85mm'];
  tags.forEach((s, i) => {
    const a = i * 2.1 + 1.0;
    bpTun.label(s, [Math.cos(a) * 3.0, Math.sin(a) * 3.0, -4 - i * 2.4], { t0: 10.2 + i * 0.25, size: 0.16, billboard: true });
  });
  const dustP = dust(900, [[-3.5, -3.5, -32], [3.5, 3.5, 0]], { size: 0.05, seed: 3 });
  holo.add(dustP);

  // projector glow cone from the LCD
  const coneMat = new THREE.ShaderMaterial({
    uniforms: { uO: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uO; varying vec2 vUv; void main(){ float a = (1.0 - vUv.y) * 0.5 * uO * (0.6 + 0.4 * sin(vUv.x * 60.0)); gl_FragColor = vec4(vec3(1.0, 0.55, 0.7) * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 1.0, 6, 64, 1, true), coneMat);
  cone.rotation.x = -Math.PI / 2;
  cone.position.set(0, 0, LCD_Z - 3);
  holo.add(cone);

  const tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), fwd = new THREE.Vector3();
  const homeQ = new THREE.Quaternion();
  const lookM = new THREE.Matrix4();

  // ---------- camera path ----------
  function cameraAt(t) {
    let pos, look, roll = 0;
    if (t < T.orbit - 1.2) {
      // first person on the lens, slow push
      const z = keys(t, [[0, 9.6], [3.5, 7.4], [3.6, 7.25, ease.out]]);
      pos = new THREE.Vector3(0, 0, z);
      look = new THREE.Vector3(0, 0, 0);
      roll = keys(t, [[0, -0.12], [3.6, 0.0]]);
      if (t > T.click) {
        const [sx, sy] = shake(t, 0.05 * (1 - rng(t, T.click, T.click + 0.4)));
        pos.x += sx; pos.y += sy;
      }
    } else if (t < T.lcdPush) {
      // orbit from front to back around the body
      const k = rng(t, 3.6, T.lcdPush);
      const phi = ease.inOut(rng(t, 3.9, 8.2)) * Math.PI;
      const r = keys(t, [[3.6, 7.25], [5.0, 9.4], [7.0, 9.0], [8.4, 6.3]]);
      const elev = keys(t, [[3.6, 0], [5.2, 0.32], [7.2, 0.26], [8.4, 0.02]]);
      pos = new THREE.Vector3(Math.sin(phi) * Math.cos(elev) * r, Math.sin(elev) * r, Math.cos(phi) * Math.cos(elev) * r);
      const lk = keys(t, [[3.6, [0, 0, 0]], [5.2, [0, 0.95, -0.2]], [7.95, [0, 0.85, -0.3]], [8.4, [0, -0.2, LCD_Z]]]);
      look = new THREE.Vector3(...lk);
      if (t < 4.0) { const [sx, sy] = shake(t, 0.05 * (1 - rng(t, T.click, T.click + 0.4))); pos.x += sx; pos.y += sy; }
      roll = Math.sin(k * Math.PI) * 0.08;
    } else if (t < T.holo) {
      const z = keys(t, [[T.lcdPush, LCD_Z - 6.3], [T.holo, LCD_Z - 2.6]], ease.in);
      pos = new THREE.Vector3(0, keys(t, [[T.lcdPush, Math.sin(0.02) * 6.3], [T.holo, -0.2]]), z);
      look = new THREE.Vector3(0, -0.2, LCD_Z);
    } else {
      // turn around inside the hologram, then fly the tunnel
      const yawK = ease.inOut(rng(t, T.holo + 0.25, 10.7));
      const psi = yawK * Math.PI;
      const z = keys(t, [[T.holo, LCD_Z - 2.6, ease.out], [10.7, -5.0], [T.hero, -21.0], [T.edit, -31 + 7.3, ease.out]]);
      const sway = env(t, 10.6, T.hero + 0.3, 1.0, 0.8);
      pos = new THREE.Vector3(Math.sin(t * 1.1) * 0.35 * sway, lerp(-0.2, 0, rng(t, T.holo, 11)) + Math.cos(t * 0.9) * 0.28 * sway, z);
      const dir = new THREE.Vector3(Math.sin(psi) * 1, 0.0, Math.cos(psi));
            look = pos.clone().add(dir.multiplyScalar(4));
      if (t > T.hero) look = new THREE.Vector3(0, 0, -31);
      roll = Math.sin(t * 0.7) * 0.22 * sway + Math.sin(yawK * Math.PI) * 0.15;
    }
    camera.position.copy(pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(look);
    camera.rotateZ(roll);
    camera.fov = 40;
    camera.updateProjectionMatrix();
  }

  function update(t) {
    const active = t < T.edit;
    root.visible = active;
    if (!active) return;
    cameraAt(t);
    camera.updateMatrixWorld();

    // reveal + iris
    cam.UL.uReveal.value = ease.inOut(rng(t, 1.3, 2.7));
    cam.UB.uReveal.value = ease.inOut(rng(t, 3.7, 6.4));
    syncReveal(cam.UL, cam.rig);
    syncReveal(cam.UB, cam.rig);
    const ir = keys(t, [[0, 0.72], [3.35, 0.7], [3.56, 0.02, ease.in], [3.62, 0.02], [4.05, 0.62, ease.out], [9, 0.62]]);
    const tw = keys(t, [[0, 0.0], [3.56, 0.5, ease.in], [4.05, 0.05, ease.out]]);
    cam.setIris(ir, tw);
    cam.rig.rotation.z = keys(t, [[0, 0.05], [3.6, 0]]);
    bpLens.update(t, camera, 1 - rng(t, 2.4, 3.4) * 0.85 - rng(t, 4.2, 4.8) * 0.15);
    bpBody.update(t, camera, env(t, 3.8, 9.6, 0.3, 0.6) * (1 - rng(t, 6.5, 7.6) * 0.4));
    cam.rig.visible = t < T.holo + 0.9;
    cam.bodyMeshes.logo.material.opacity = rng(t, 5.0, 5.6);
    // camera body sinks away after the burst
    const sink = ease.in(rng(t, T.holo, T.holo + 0.9));
    cam.rig.position.set(0, -sink * 0.5, sink * 2.5);
    cam.rig.scale.setScalar(1 - sink * 0.3);

    if (t > 7.5 && t < T.holo + 0.5) drawLCD(t);

    // hologram
    holo.visible = t > T.holo - 0.05;
    if (!holo.visible) return;
    const lt = t - T.holo;
    coneMat.uniforms.uO.value = env(t, T.holo, 12.0, 0.15, 1.5) * 0.45;
    bpTun.update(t, camera, 1 - rng(t, 15.9, 16.6));
    for (const g of ringGroups) g.rotation.z = t * 0.12 * (ringGroups.indexOf(g) % 2 ? 1 : -1);
    dustP.userData.drift(t);
    dustP.material.opacity = 0.9 * (1 - rng(t, 16.0, 16.7));
    const camQ = camera.quaternion;
    camera.getWorldDirection(fwd);
    for (const c of cards) {
      const u = c.userData;
      const k = ease.outExpo(clamp((lt - u.delay) / 1.0));
      // home transform
      tmpV.set(0, 0, u.home.z + 4);
      lookM.lookAt(tmpV, u.home, new THREE.Vector3(0, 1, 0));
      homeQ.setFromRotationMatrix(lookM);
      c.position.lerpVectors(new THREE.Vector3(0, -0.2, LCD_Z - 0.1), u.home, k);
      c.position.y += Math.sin(t * 1.3 + u.delay * 40) * 0.08;
      c.quaternion.copy(homeQ);
      c.scale.setScalar(lerp(0.12, 1, k));
      let holoAmt = 1, glitch = 0;
      // texture swaps
      let idx = u.base;
      for (const s of u.swaps) { if (t > s) idx = (idx + 5) % photos.count; if (Math.abs(t - s) < 0.12) glitch = 1; }
      if (u.fi >= 0) idx = u.base;
      c.material.uniforms.map.value = photos.tex[idx];
      // featured pop toward the camera
      if (u.fi >= 0) {
        const f0 = T.features[u.fi];
        const p = ease.inOut(clamp((t - f0) / 0.25)) * (1 - ease.inOut(clamp((t - f0 - 0.62) / 0.25)));
        if (p > 0) {
          const target = camera.position.clone().addScaledVector(fwd, 4.2);
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camQ);
          target.addScaledVector(up, -0.08);
          c.position.lerp(target, p);
          c.quaternion.slerp(camQ, p);
          c.scale.setScalar(lerp(1, 1.25, p));
          holoAmt = 1 - p;
          c.renderOrder = 10;
        } else c.renderOrder = 0;
        if (Math.abs(t - f0) < 0.1) glitch = 1;
      }
      c.material.uniforms.uHolo.value = holoAmt;
      c.material.uniforms.uGlitch.value = glitch;
      c.material.uniforms.uTime.value = t;
      c.material.uniforms.uOpacity.value = clamp((lt - u.delay) / 0.2) * (1 - rng(t, 16.0, 16.6));
    }
    const hk = rng(t, 15.2, 16.4);
    hero.material.uniforms.uHolo.value = 1 - ease.inOut(hk);
    hero.material.uniforms.uFrame.value = 1 - ease.inOut(rng(t, 16.2, 16.7));
    hero.material.uniforms.uTime.value = t;
    hero.material.uniforms.uOpacity.value = rng(t, 13.5, 15.0);
    hero.material.uniforms.uGlitch.value = Math.abs(t - 15.3) < 0.1 ? 1 : 0;
    hero.renderOrder = 20;
  }

  return { update };
}
