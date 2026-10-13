import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Blueprint } from '../blueprint.js';
import { mats, patchReveal, revealUniforms, syncReveal, dust, textPlane, dotTexture } from '../materials.js';
import { clamp, lerp, rng, ease, keys, env, shake, mulberry32 } from '../util.js';
import { T } from '../timeline.js';
import { buildAlbum, PICKS } from './album.js';

// Scenes 7-8a: press line -> foil stamp -> gift box -> map route -> front door.
const O = new THREE.Vector3(600, 0, 0);
const R1 = -7.5, R2 = -3.0; // roller z positions
const SPEED = 3.2;
const ALBUM_Z = 3.6;
const ROUTE = [[0, ALBUM_Z], [0, -6], [10, -6], [10, -19], [16.2, -19]];
const HOUSE = new THREE.Vector3(21, 0, -19);

function sheetMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uR1: { value: R1 }, uR2: { value: R2 }, uO: { value: 1 } },
    vertexShader: 'varying vec2 vUv; varying float vZ; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vZ = w.z; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform sampler2D map; uniform float uR1, uR2, uO; varying vec2 vUv; varying float vZ;
      void main(){
        vec3 paper = vec3(0.78, 0.71, 0.69);
        vec3 img = texture2D(map, vUv).rgb;
        float printed = smoothstep(uR1 - 0.02, uR1 + 0.02, vZ);
        vec3 c = mix(paper, img * 1.05, printed);
        float scan = exp(-pow((vZ - uR1) * 12.0, 2.0));
        c += vec3(1.0, 0.6, 0.75) * scan * 1.2;
        vec2 e = min(vUv, 1.0 - vUv);
        float border = 1.0 - smoothstep(0.035, 0.045, min(e.x, e.y * 0.8));
        float foil = smoothstep(uR2 - 0.02, uR2 + 0.02, vZ);
        vec3 gold = vec3(1.0, 0.72, 0.36) * (0.8 + 0.6 * sin(vUv.x * 20.0 + vZ * 3.0));
        c = mix(c, gold * 1.3, border * foil);
        c += vec3(1.0, 0.8, 0.45) * exp(-pow((vZ - uR2) * 12.0, 2.0)) * 1.5;
        gl_FragColor = vec4(c, uO);
      }`,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

export function createPrint(ctx) {
  const { scene, camera, photos } = ctx;
  const root = new THREE.Group();
  root.position.copy(O);
  scene.add(root);

  // ---------- press line ----------
  const line = new THREE.Group();
  root.add(line);
  const bc = document.createElement('canvas');
  bc.width = 64; bc.height = 512;
  {
    const g = bc.getContext('2d');
    g.fillStyle = '#2a0f1b'; g.fillRect(0, 0, 64, 512);
    g.fillStyle = '#3d1828';
    for (let y = 0; y < 512; y += 32) g.fillRect(0, y, 64, 4);
  }
  const beltTex = new THREE.CanvasTexture(bc);
  beltTex.wrapS = beltTex.wrapT = THREE.RepeatWrapping;
  beltTex.repeat.set(1, 6);
  beltTex.colorSpace = THREE.SRGBColorSpace;
  const belt = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 22), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.6 }));
  belt.rotation.x = -Math.PI / 2;
  belt.position.set(0, -0.02, -6);
  line.add(belt);
  const rollers = [];
  for (const [z, label, sub] of [[R1, 'CMYK + ROSE', '1200 DPI'], [R2, 'GOLD FOIL', '24K']]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.8, 64), mats.gold(0.18));
    r.rotation.z = Math.PI / 2;
    r.position.set(0, 0.44, z);
    line.add(r);
    rollers.push(r);
    for (const sx of [-1, 1]) {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(0.16, 1.6, 1.4, 2, 0.05), mats.pinkSatin());
      plate.position.set(sx * 1.5, 0.55, z);
      line.add(plate);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 32), mats.gold(0.2));
      hub.rotation.z = Math.PI / 2;
      hub.position.set(sx * 1.6, 0.44, z);
      line.add(hub);
    }
    const lab = textPlane([label, sub], 0.36, { font: '400 54px Heebo', color: '#f3d79e', letter: 6, additive: true });
    lab.position.set(-2.55, 1.05, z);
    lab.rotation.y = 0.5;
    line.add(lab);
  }
  const bpLine = new Blueprint({ width: 1.6, opacity: 0.85 });
  line.add(bpLine.group);
  for (const z of [R1, R2]) {
    bpLine.circle([0, 0.44, z], 0.62, { axis: 'x', t0: 33.7, dur: 0.6, seg: 64 });
    bpLine.circle([1.75, 0.44, z], 0.62, { axis: 'x', t0: 33.75, dur: 0.6, seg: 64 });
    bpLine.line([-1.75, 0.44, z], [1.75, 0.44, z], { t0: 33.8, dur: 0.6, width: 1.0 });
    // rotation arrow
    bpLine.circle([1.95, 0.44, z], 0.75, { axis: 'x', t0: 34.0, dur: 0.5, seg: 40, a0: 0.4, arc: 2.2, width: 2.2 });
  }
  bpLine.line([-1.25, 0.01, -16], [-1.25, 0.01, 4.5], { t0: 33.65, dur: 1.0, width: 1.2 });
  bpLine.line([1.25, 0.01, -16], [1.25, 0.01, 4.5], { t0: 33.65, dur: 1.0, width: 1.2 });
  bpLine.dim([-1.1, 0.01, R1], [-1.1, 0.01, R2], [-0.55, 0, 0], '4.5 m/s', { t0: 34.2, dur: 0.8, size: 0.2, rot: [-Math.PI / 2, 0, Math.PI / 2] });
  bpLine.label('ARCHIVAL PAPER · 100 YEARS', [0, 0.02, 1.6], { t0: 34.6, size: 0.16, rot: [-Math.PI / 2, 0, 0] });

  const sheets = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), sheetMaterial(photos.tex[PICKS[i % PICKS.length]]));
    m.rotation.x = -Math.PI / 2;
    m.userData.z0 = -12.5 - i * 2.1 + 2.0;
    line.add(m);
    sheets.push(m);
  }

  // ---------- album + stamp ----------
  const shine = { uShine: { value: -1 }, uShineCol: { value: new THREE.Color(3.0, 2.4, 1.4) } };
  const A = buildAlbum(photos, { foilShine: shine });
  A.setClose(1);
  A.prints.forEach((p) => (p.visible = true));
  A.syncPrints();
  const albumHolder = new THREE.Group();
  albumHolder.position.set(0, 0, ALBUM_Z);
  root.add(albumHolder);
  A.group.position.set(-1.575, 0, 0);
  albumHolder.add(A.group);
  const press = new THREE.Group();
  root.add(press);
  const block = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.5, 2.0, 3, 0.06), mats.gold(0.15));
  press.add(block);
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 6, 32), mats.darkMetal());
  piston.position.y = 3.2;
  press.add(piston);
  const sparks = dust(140, [[-1.5, 0.3, ALBUM_Z - 1.5], [1.5, 0.6, ALBUM_Z + 1.5]], { size: 0.09, color: '#ffe0a0', seed: 5 });
  root.add(sparks);

  // ---------- gift box ----------
  const box = new THREE.Group();
  albumHolder.add(box);
  const boxMat = () => new THREE.MeshPhysicalMaterial({ color: '#d98ea3', roughness: 0.5, clearcoat: 0.2, sheen: 0.6, sheenColor: new THREE.Color('#ffe0e8') });
  const walls = new THREE.Group();
  box.add(walls);
  const bottom = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.1, 3.7, 2, 0.03), boxMat());
  bottom.position.y = -0.05;
  walls.add(bottom);
  for (const [x, z, w, d] of [[0, 1.8, 3.7, 0.1], [0, -1.8, 3.7, 0.1], [1.8, 0, 0.1, 3.7], [-1.8, 0, 0.1, 3.7]]) {
    const wm = new THREE.Mesh(new RoundedBoxGeometry(w, 0.75, d, 2, 0.03), boxMat());
    wm.position.set(x, 0.37, z);
    walls.add(wm);
  }
  const lid = new THREE.Group();
  box.add(lid);
  const lidTop = new THREE.Mesh(new RoundedBoxGeometry(3.86, 0.14, 3.86, 3, 0.05), boxMat());
  lid.add(lidTop);
  const lidLip = new THREE.Mesh(new RoundedBoxGeometry(3.86, 0.35, 3.86, 3, 0.05), boxMat());
  lidLip.position.y = -0.2;
  lidLip.scale.set(1, 1, 1);
  lid.add(lidLip);
  const ribbonMat = new THREE.MeshStandardMaterial({ color: '#efc77e', metalness: 0.75, roughness: 0.28 });
  const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.03, 3.9), ribbonMat);
  rib1.position.y = 0.085;
  lid.add(rib1);
  const rib2 = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.03, 0.36), ribbonMat);
  rib2.position.y = 0.088;
  lid.add(rib2);
  const bow = new THREE.Group();
  bow.position.y = 0.16;
  lid.add(bow);
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 16, 48), ribbonMat);
    loop.scale.set(1, 0.55, 0.35);
    loop.rotation.set(Math.PI / 2 - 0.35, 0, s * 0.35);
    loop.position.set(s * 0.42, 0.12, 0);
    bow.add(loop);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.9), ribbonMat);
    tail.position.set(s * 0.25, 0.0, 0.45);
    tail.rotation.set(0, s * 0.5, 0);
    bow.add(tail);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), ribbonMat);
  knot.scale.set(1, 0.7, 1);
  knot.position.y = 0.1;
  bow.add(knot);
  const bpBox = new Blueprint({ width: 1.8 });
  albumHolder.add(bpBox.group);
  bpBox.rect([0, 0.0, 0], 3.7, 3.7, { plane: 'xz', t0: 36.55, dur: 0.5 });
  bpBox.rect([0, 0.75, 0], 3.7, 3.7, { plane: 'xz', t0: 36.65, dur: 0.5 });
  for (const [x, z] of [[-1.85, -1.85], [1.85, -1.85], [1.85, 1.85], [-1.85, 1.85]]) bpBox.line([x, 0, z], [x, 0.75, z], { t0: 36.7, dur: 0.3, pieces: 6 });
  bpBox.dim([-1.85, 0, 1.85], [1.85, 0, 1.85], [0, 0, 0.5], '40 × 40 ס״מ', { t0: 36.8, dur: 0.6, size: 0.22, rot: [-Math.PI / 2, 0, 0], labelOff: 0.3 });

  // ---------- map ----------
  const map = new THREE.Group();
  root.add(map);
  const bpMap = new Blueprint({ width: 1.5, opacity: 0.75 });
  map.add(bpMap.group);
  const rnd = mulberry32(9);
  for (let i = -6; i <= 6; i++) {
    for (const off of [-0.7, 0.7]) {
      bpMap.line([i * 8 + off + 2, 0, -60], [i * 8 + off + 2, 0, 30], { t0: 38.5 + Math.abs(i) * 0.05, dur: 1.0, pieces: 40 });
      bpMap.line([-50, 0, i * 6.5 + off - 6], [50, 0, i * 6.5 + off - 6], { t0: 38.55 + Math.abs(i) * 0.05, dur: 1.0, pieces: 40 });
    }
  }
  const bpBld = new Blueprint({ width: 1.2, opacity: 0.4 });
  map.add(bpBld.group);
  for (let i = 0; i < 70; i++) {
    const bx = Math.floor(rnd() * 12 - 6) * 8 + 6, bz = Math.floor(rnd() * 12 - 6) * 6.5 - 2.75;
    if (Math.abs(bx - 16) < 7 && Math.abs(bz + 19) < 6) continue;
    const w = 2 + rnd() * 3, d = 1.5 + rnd() * 2.5;
    bpBld.rect([bx + (rnd() - 0.5) * 2, 0.01, bz + (rnd() - 0.5) * 1.5], w, d, { plane: 'xz', t0: 38.8 + rnd() * 0.6, dur: 0.5, width: 1.0 });
  }
  bpBld.circle([-14, 0.01, -26], 4, { axis: 'y', t0: 39.0, dur: 0.8, width: 1.0 });
  bpBld.circle([-14, 0.01, -26], 3.3, { axis: 'y', t0: 39.1, dur: 0.8, width: 1.0 });
  // route
  const bpRoute = new Blueprint({ width: 4.0, opacity: 1 });
  map.add(bpRoute.group);
  const routePts = [];
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const [ax, az] = ROUTE[i], [bx, bz] = ROUTE[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    for (let k = 0; k < n; k++) routePts.push([lerp(ax, bx, k / n), 0.05, lerp(az, bz, k / n)]);
  }
  routePts.push([...ROUTE[ROUTE.length - 1].slice(0, 1), 0.05, ROUTE[ROUTE.length - 1][1]]);
  const dashes = [];
  for (let i = 0; i < routePts.length - 1; i += 2) dashes.push(...routePts[i], ...routePts[i + 1]);
  bpRoute.segments(dashes, { t0: 38.9, dur: 1.0, e: ease.inOut });
  const routeLen = [];
  let acc = 0;
  for (let i = 0; i < ROUTE.length - 1; i++) { acc += Math.hypot(ROUTE[i + 1][0] - ROUTE[i][0], ROUTE[i + 1][1] - ROUTE[i][1]); routeLen.push(acc); }
  const routeAt = (k) => {
    const d = k * acc;
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const d0 = i ? routeLen[i - 1] : 0;
      if (d <= routeLen[i] || i === ROUTE.length - 2) {
        const kk = clamp((d - d0) / (routeLen[i] - d0));
        return [lerp(ROUTE[i][0], ROUTE[i + 1][0], kk), lerp(ROUTE[i][1], ROUTE[i + 1][1], kk)];
      }
    }
  };
  const pins = [];
  for (const [p, label] of [[[0, ALBUM_Z], 'הסטודיו'], [[15.2, -21.5], 'הבית שלך']]) {
    const pin = new THREE.Group();
    pin.position.set(p[0], 0, p[1]);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), mats.gold(0.2));
    head.position.y = 1.6;
    pin.add(head);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 24), mats.gold(0.2));
    tip.rotation.x = Math.PI;
    tip.position.y = 0.75;
    pin.add(tip);
    const lab = textPlane(label, 1.0, { font: '500 64px Heebo', color: '#f9e3e8', dir: 'rtl', letter: 2 });
    lab.position.set(0, 3.0, 0);
    pin.add(lab);
    pin.userData.lab = lab;
    map.add(pin);
    pins.push(pin);
  }

  // ---------- house ----------
  const house = new THREE.Group();
  house.position.copy(HOUSE);
  root.add(house);
  const HU = revealUniforms({ mode: 0, axis: [0, 1, 0], range: [0, 6.5], edge: 0.06 });
  const H = (m) => patchReveal(m, HU);
  const wallsH = new THREE.Mesh(new RoundedBoxGeometry(6, 4.2, 6, 2, 0.06), H(mats.pinkSatin()));
  wallsH.position.y = 2.1;
  house.add(wallsH);
  const roofShape = new THREE.Shape([new THREE.Vector2(-3.4, 0), new THREE.Vector2(3.4, 0), new THREE.Vector2(0, 2.3)]);
  const roofG = new THREE.ExtrudeGeometry(roofShape, { depth: 6.4, bevelEnabled: false });
  roofG.translate(0, 0, -3.2);
  const roof = new THREE.Mesh(roofG, H(mats.gold(0.3)));
  roof.position.y = 4.2;
  roof.rotation.y = Math.PI / 2;
  house.add(roof);
  // doorway on the -x face
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.6), new THREE.MeshBasicMaterial({ color: '#fff3e6', toneMapped: false }));
  arch.position.set(-3.01, 1.3, 0);
  arch.rotation.y = -Math.PI / 2;
  house.add(arch);
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-3.06, 0, 0.75);
  house.add(doorPivot);
  const door = new THREE.Mesh(new RoundedBoxGeometry(0.1, 2.6, 1.5, 2, 0.03), H(mats.leather()));
  door.position.set(0, 1.3, -0.75);
  doorPivot.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), H(mats.gold(0.15)));
  knob.position.set(-0.08, 1.3, -1.3);
  doorPivot.add(knob);
  const frameD = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 12, 48, Math.PI), H(mats.gold(0.2)));
  frameD.position.set(-3.05, 2.55, 0);
  frameD.rotation.y = -Math.PI / 2;
  house.add(frameD);
  for (const z of [-1.9, 1.9]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), new THREE.MeshBasicMaterial({ color: '#ffd9a8', toneMapped: false }));
    win.position.set(-3.01, 2.4, z);
    win.rotation.y = -Math.PI / 2;
    house.add(win);
  }
  const bpHouse = new Blueprint({ width: 1.8 });
  house.add(bpHouse.group);
  [wallsH, roof].forEach((m, i) => bpHouse.edges(m, { threshold: 30, t0: 39.4 + i * 0.3, dur: 0.8, key: (p) => p.y }));
  bpHouse.rect([-3.02, 1.3, 0], 1.5, 2.6, { plane: 'zy', t0: 39.8, dur: 0.6 });
  const warm = dust(200, [[-3, 0.2, -2], [-0.5, 3, 2]], { size: 0.06, color: '#ffe6c0', seed: 13 });
  house.add(warm);

  // ---------- camera ----------
  function boxPos(t) {
    const k = ease.inOut(rng(t, 39.0, 40.35));
    const [x, z] = routeAt(k);
    return new THREE.Vector3(x, 0, z);
  }
  function cameraAt(t) {
    let pos, look;
    if (t < 38.4) {
      const P = keys(t, [
        [T.print, [0.6, 4.6, 4.8]],
        [35.0, [4.4, 3.8, 1.2], ease.inOut],
        [35.7, [-2.8, 4.8, ALBUM_Z + 7.4]],
        [36.2, [-3.6, 3.8, ALBUM_Z + 6.4]],
        [37.4, [-2.6, 7.4, ALBUM_Z + 6.0]],
        [38.4, [0, 11.0, ALBUM_Z + 3.0]],
      ]);
      const L = keys(t, [
        [T.print, [0, 0, -6]],
        [35.0, [0, 0.0, -4.5], ease.inOut],
        [35.7, [0, 0.9, ALBUM_Z]],
        [36.2, [0, 0.6, ALBUM_Z]],
        [37.4, [0, 1.8, ALBUM_Z]],
        [38.4, [0, 0.4, ALBUM_Z - 1.6]],
      ]);
      pos = P; look = L;
    } else if (t < T.door) {
      const b = boxPos(t);
      const h = keys(t, [[38.4, 11.0], [39.2, 30, ease.inOut], [T.door, 24]]);
      const back = keys(t, [[38.4, 3.0], [39.3, 7], [T.door, 9]]);
      const kk = ease.inOut(rng(t, 38.4, 39.4));
      pos = [b.x - back * 0.5 * kk, h, b.z + back];
      look = [b.x + kk, lerp(0.4, 0, kk), b.z - lerp(1.6, 2, kk)];
    } else {
      const k = rng(t, T.door, T.home);
      const b = boxPos(t);
      const P0 = [b.x - 4.5, 24, b.z + 9];
      pos = keys(t, [[T.door, P0], [40.75, [HOUSE.x - 11, 3.2, HOUSE.z + 1.5], ease.inOut], [T.home, [HOUSE.x - 3.4, 1.4, HOUSE.z], ease.in]]);
      look = keys(t, [[T.door, [b.x + 1, 0, b.z - 2]], [40.75, [HOUSE.x - 3, 1.8, HOUSE.z], ease.inOut], [T.home, [HOUSE.x, 1.3, HOUSE.z], ease.in]]);
    }
    camera.position.set(O.x + pos[0], O.y + pos[1], O.z + pos[2]);
    if (t > 35.95 && t < 36.4) {
      const [sx, sy] = shake(t, 0.06 * (1 - rng(t, 35.95, 36.4)));
      camera.position.x += sx; camera.position.y += sy;
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(O.x + look[0], O.y + look[1], O.z + look[2]);
    camera.fov = 40;
    camera.updateProjectionMatrix();
  }

  function update(t) {
    const active = t >= T.print && t < T.home;
    root.visible = active;
    if (!active) return;
    cameraAt(t);
    camera.updateMatrixWorld();
    const lt = t - T.print;
    // press line
    const lineFade = 1 - rng(t, 38.4, 39.0);
    line.visible = t < 39.0;
    for (const r of rollers) r.rotation.x = -lt * SPEED / 0.42;
    beltTex.offset.y = (lt * SPEED) / 22 * 6;
    for (const s of sheets) {
      const z = s.userData.z0 + lt * SPEED;
      s.position.set(0, 0.012, Math.min(z, ALBUM_Z - 0.8));
      s.visible = z < ALBUM_Z - 0.9 && z > -16;
      s.material.uniforms.uO.value = lineFade;
    }
    bpLine.update(t, camera, env(t, 33.6, 38.6, 0.2, 0.6));
    // press block + foil
    const down = keys(t, [[35.4, 4.5], [35.95, 0.62, ease.in], [36.2, 0.62], [36.7, 6, ease.inOut]]);
    press.position.set(0, down, ALBUM_Z);
    press.visible = t > 35.2 && t < 36.8;
    const stamped = t > 35.95;
    A.foil.visible = stamped;
    shine.uShine.value = lerp(-0.6, 1.6, rng(t, 36.0, 36.9));
    sparks.visible = t > 35.95 && t < 36.8;
    if (sparks.visible) {
      const k = rng(t, 35.95, 36.8);
      sparks.material.opacity = 1 - k;
      sparks.scale.set(1 + k * 1.5, 1 + k * 3, 1 + k * 1.5);
      sparks.position.set(0, 0, ALBUM_Z * -k * 1.5);
    }
    // box
    const wallK = ease.out(rng(t, 36.75, 37.15));
    walls.scale.set(1, Math.max(0.001, wallK), 1);
    walls.visible = t > 36.75;
    lid.position.y = keys(t, [[37.15, 6], [37.65, 0.86, ease.outBack]]);
    lid.visible = t > 37.15;
    const r1k = ease.out(rng(t, 37.65, 37.95));
    rib1.scale.set(1, 1, Math.max(0.001, r1k));
    const r2k = ease.out(rng(t, 37.7, 38.0));
    rib2.scale.set(Math.max(0.001, r2k), 1, 1);
    bow.scale.setScalar(Math.max(0.001, ease.outBack(rng(t, 37.9, 38.25))));
    bpBox.update(t, camera, env(t, 36.5, 38.0, 0.1, 0.4));
    A.group.visible = t < 37.7;
    // travel: box shrinks to map scale and follows the route
    const bp = boxPos(t);
    const shrink = ease.inOut(rng(t, 38.6, 39.6));
    albumHolder.position.set(bp.x, 0, t < 39.0 ? ALBUM_Z : bp.z);
    if (t >= 39.0) albumHolder.position.set(bp.x, 0, bp.z);
    albumHolder.scale.setScalar(lerp(1, 0.45, shrink));
    albumHolder.rotation.y = keys(t, [[39.0, 0], [40.3, -Math.PI / 2]]);
    albumHolder.visible = t < 40.9;
    // map
    map.visible = t > 38.4;
    bpMap.update(t, camera, env(t, 38.4, T.home, 0.3, 0.6));
    bpBld.update(t, camera, env(t, 38.4, T.home, 0.3, 0.6));
    bpRoute.update(t, camera, env(t, 38.8, T.home, 0.2, 0.5));
    pins.forEach((p, i) => {
      const k = ease.outBack(rng(t, 39.0 + i * 0.4, 39.4 + i * 0.4));
      p.scale.setScalar(Math.max(0.001, k) * 1.8);
      p.userData.lab.quaternion.copy(camera.quaternion);
      p.userData.lab.quaternion.premultiply(new THREE.Quaternion());
    });
    // house
    house.visible = t > 39.3;
    HU.uReveal.value = ease.inOut(rng(t, 39.7, 40.5));
    syncReveal(HU, house);
    bpHouse.update(t, camera, env(t, 39.3, T.home, 0.1, 0.5));
    doorPivot.rotation.y = -ease.inOut(rng(t, 40.75, 41.2)) * 1.9;
    warm.userData.drift(t);
  }
  return { update };
}
