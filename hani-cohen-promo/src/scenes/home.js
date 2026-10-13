import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Blueprint } from '../blueprint.js';
import { mats, dust } from '../materials.js';
import { clamp, lerp, rng, ease, keys, env, mulberry32 } from '../util.js';
import { T } from '../timeline.js';
import { HERO_SUN } from '../photos.js';
import { buildAlbum } from './album.js';
import { buildCameraModel } from './capture.js';

// Scene 8b: the album opens at home. Scene 9: sun -> lens match cut, logo + CTA.
const O = new THREE.Vector3(800, 0, 0);
const C = new THREE.Vector3(1000, 0, 0);

function petalTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 96;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 96);
  gr.addColorStop(0, '#ffe3ea'); gr.addColorStop(1, '#e2869d');
  g.fillStyle = gr;
  g.beginPath();
  g.moveTo(32, 94);
  g.bezierCurveTo(-6, 60, 6, 6, 32, 4);
  g.bezierCurveTo(58, 6, 70, 60, 32, 94);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createHome(ctx) {
  const { scene, camera, photos } = ctx;

  // ================= interior =================
  const root = new THREE.Group();
  root.position.copy(O);
  scene.add(root);
  const tc = document.createElement('canvas');
  tc.width = tc.height = 512;
  {
    const g = tc.getContext('2d');
    const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256);
    gr.addColorStop(0, '#b97488'); gr.addColorStop(0.5, '#6e2c46'); gr.addColorStop(1, 'rgba(60,20,36,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  }
  const tabTex = new THREE.CanvasTexture(tc);
  tabTex.colorSpace = THREE.SRGBColorSpace;
  const table = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ map: tabTex, transparent: true, roughness: 0.8 }));
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.06;
  root.add(table);

  // open box
  const boxMat = new THREE.MeshPhysicalMaterial({ color: '#d98ea3', roughness: 0.5, clearcoat: 0.2, sheen: 0.6, sheenColor: new THREE.Color('#ffe0e8') });
  const boxG = new THREE.Group();
  boxG.position.set(0, 0, 0.6);
  root.add(boxG);
  const bottom = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.1, 3.7, 2, 0.03), boxMat);
  boxG.add(bottom);
  for (const [x, z, w, d] of [[0, 1.8, 3.7, 0.1], [0, -1.8, 3.7, 0.1], [1.8, 0, 0.1, 3.7], [-1.8, 0, 0.1, 3.7]]) {
    const wm = new THREE.Mesh(new RoundedBoxGeometry(w, 0.75, d, 2, 0.03), boxMat);
    wm.position.set(x, 0.37, z);
    boxG.add(wm);
  }
  const lid = new THREE.Mesh(new RoundedBoxGeometry(3.86, 0.4, 3.86, 3, 0.05), boxMat);
  lid.position.set(-3.6, 1.3, -1.6);
  lid.rotation.set(0.2, 0.5, 1.2);
  root.add(lid);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: '#efc77e', metalness: 0.75, roughness: 0.28 });
  const ribbon = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 8, 64, Math.PI * 1.3), ribbonMat);
  ribbon.rotation.set(-Math.PI / 2, 0, 0.6);
  ribbon.position.set(2.6, 0.02, 2.2);
  root.add(ribbon);

  const A = buildAlbum(photos);
  A.prints.forEach((p) => (p.visible = true));
  const albumG = new THREE.Group();
  root.add(albumG);
  albumG.add(A.group);

  // light rays
  const rayMat = new THREE.ShaderMaterial({
    uniforms: { uO: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uO; varying vec2 vUv; void main(){ float a = pow(vUv.y, 1.5) * (1.0 - pow(abs(vUv.x - 0.5) * 2.0, 2.0)) * 0.1 * uO; gl_FragColor = vec4(vec3(1.0, 0.86, 0.72) * a, a); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const rays = new THREE.Group();
  root.add(rays);
  for (let i = 0; i < 5; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + i * 0.3, 14), rayMat);
    r.position.set(-3 + i * 1.3, 6, -2.5 + i * 0.4);
    r.rotation.set(0, 0.3 * i, -0.45);
    rays.add(r);
  }
  // petals
  const pt = petalTexture();
  const petals = [];
  const pr = mulberry32(77);
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), new THREE.MeshStandardMaterial({ map: pt, transparent: true, side: THREE.DoubleSide, roughness: 0.7, alphaTest: 0.05 }));
    m.userData = { x: (pr() - 0.5) * 10, z: (pr() - 0.5) * 8, y0: 3 + pr() * 7, sp: 0.6 + pr() * 0.8, ph: pr() * 6.28, rs: pr() * 3 };
    root.add(m);
    petals.push(m);
  }
  const dustI = dust(260, [[-6, 0, -5], [6, 7, 5]], { size: 0.05, color: '#ffe6c0', seed: 31 });
  root.add(dustI);

  // sun position on the hero print (left page, open album)
  const s = A.slots[0];
  const sunLocal = new THREE.Vector3(s.x + (HERO_SUN.u - 0.5) * s.w, 0.19 + 0.004, s.z + (HERO_SUN.v - 0.5) * s.h);

  // ================= CTA =================
  const croot = new THREE.Group();
  croot.position.copy(C);
  scene.add(croot);
  const cam = buildCameraModel();
  croot.add(cam.rig);
  cam.UL.uReveal.value = 1;
  cam.UB.uReveal.value = 1;
  const bp = new Blueprint({ width: 1.8, opacity: 0.75 });
  cam.rig.add(bp.group);
  [[2.6, 43.4], [2.9, 43.55], [3.4, 43.7]].forEach(([r, t0], i) => bp.circle([0, 0, 0], r, { t0, dur: 1.2, seg: 160, a0: i * 1.3 + Math.PI / 2, width: i === 1 ? 1.0 : 1.8 }));
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r1 = i % 6 ? 3.0 : 3.15;
    bp.line([Math.cos(a) * 2.9, Math.sin(a) * 2.9, 0], [Math.cos(a) * r1, Math.sin(a) * r1, 0], { t0: 43.9 + i * 0.008, dur: 0.1, pieces: 2, width: 1.2 });
  }
  const dustC = dust(400, [[-6, -6, -6], [6, 6, 6]], { size: 0.05, seed: 41 });
  croot.add(dustC);
  const burst = dust(160, [[-0.3, -0.3, 2.2], [0.3, 0.3, 2.6]], { size: 0.12, color: '#ffe2a8', seed: 51 });
  cam.rig.add(burst);

  function update(t) {
    // ---------- interior ----------
    const inA = t >= T.home && t < T.cta;
    root.visible = inA;
    if (inA) {
      const openK = ease.inOut(rng(t, 41.85, 42.75));
      const rise = ease.out(rng(t, 41.4, 41.95));
      A.setClose(1 - openK);
      A.syncPrints();
      albumG.position.set(lerp(-1.575, 0, openK), lerp(0.2, 0.9, rise) - openK * 0.2, lerp(0.6, 0, openK));
      albumG.rotation.set(lerp(-0.15, 0, openK), 0, 0);
      rayMat.uniforms.uO.value = 0.6 + 0.4 * Math.sin(t * 2);
      for (const p of petals) {
        const u = p.userData;
        const y = u.y0 - (t - T.home) * u.sp;
        p.position.set(u.x + Math.sin(t * 1.3 + u.ph) * 0.5, Math.max(0.0, y), u.z + Math.cos(t + u.ph) * 0.3);
        p.rotation.set(t * u.rs + u.ph, t * 0.7 + u.ph, u.ph);
      }
      dustI.userData.drift(t);
      // camera: from the doorway glow down onto the album, then into the sun
      A.group.updateWorldMatrix(true, true);
      const sunW = sunLocal.clone().applyMatrix4(A.group.matrixWorld);
      const pos = keys(t, [
        [T.home, [0.5, 7.0, 8.6]],
        [42.0, [0.2, 9.6, 8.0], ease.out],
        [42.75, [-0.7, 7.4, 5.2]],
        [T.cta, [sunW.x - O.x, sunW.y - O.y + 0.55, sunW.z - O.z + 0.05], ease.in],
      ]);
      const look = keys(t, [
        [T.home, [0, 0.8, 0.3]],
        [42.0, [0, 2.2, 0], ease.out],
        [42.75, [-0.8, 0.8, 0]],
        [T.cta, [sunW.x - O.x, sunW.y - O.y, sunW.z - O.z], ease.in],
      ]);
      camera.position.set(O.x + pos[0], O.y + pos[1], O.z + pos[2]);
      camera.up.set(0, 0.0, -1).lerp(new THREE.Vector3(0, 1, 0), 1 - rng(t, 42.6, 43.1)).normalize();
      camera.lookAt(O.x + look[0], O.y + look[1], O.z + look[2]);
      camera.fov = 40;
      camera.updateProjectionMatrix();
    }

    // ---------- CTA ----------
    const inC = t >= T.cta;
    croot.visible = inC;
    if (inC) {
      const ir = keys(t, [[T.cta, 0.05], [43.9, 0.66, ease.out], [T.finalClick - 0.12, 0.62], [T.finalClick, 0.02, ease.in], [T.finalClick + 0.06, 0.02], [T.finalClick + 0.5, 0.62, ease.out]]);
      cam.setIris(ir, keys(t, [[T.cta, 0.8], [43.9, 0.05, ease.out], [T.finalClick, 0.5, ease.in], [T.finalClick + 0.5, 0.05, ease.out]]));
      cam.rig.rotation.set(0, keys(t, [[T.cta, 0], [45.6, -0.55], [49.2, -0.42]], ease.inOut), keys(t, [[T.cta, 0.25], [45.0, 0]]));
      bp.update(t, camera, env(t, 43.3, 99, 0.2, 0) * (1 - rng(t, 43.9, 44.6) * 0.7));
      cam.rig.position.x = keys(t, [[T.cta, 0], [45.4, 0.7]]);
      dustC.userData.drift(t);
      const bk = rng(t, T.finalClick, T.finalClick + 1.2);
      burst.visible = bk > 0 && bk < 1;
      if (burst.visible) { burst.scale.setScalar(1 + ease.out(bk) * 18); burst.material.opacity = 1 - bk; }
      const pos = keys(t, [
        [T.cta, [0, 0, 4.4]],
        [45.4, [0.4, -0.4, 12.5], ease.inOut],
        [T.finalClick, [0.2, -0.3, 11.4]],
        [49.2, [0.0, -0.2, 10.4]],
      ]);
      const look = keys(t, [[T.cta, [0, 0, 0]], [45.4, [0, -2.9, 0], ease.inOut], [49.2, [0, -2.6, 0]]]);
      camera.position.set(C.x + pos[0], C.y + pos[1], C.z + pos[2]);
      if (t > T.finalClick && t < T.finalClick + 0.4) {
        const a = 0.04 * (1 - rng(t, T.finalClick, T.finalClick + 0.4));
        camera.position.x += Math.sin(t * 90) * a;
        camera.position.y += Math.cos(t * 77) * a;
      }
      camera.up.set(0, 1, 0);
      camera.lookAt(C.x + look[0], C.y + look[1], C.z + look[2]);
      camera.fov = 40;
      camera.updateProjectionMatrix();
    }
  }
  return { update };
}
