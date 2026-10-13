import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { textPlane } from './materials.js';
import { clamp, ease } from './util.js';

// Gold technical drawing that draws itself on.
// Each stroke is an ordered list of segments; at time t only the first
// (progress * n) segments are drawn, so circles sweep and lines extend.
export class Blueprint {
  constructor({ color = '#e6c47e', width = 2.0, opacity = 0.95 } = {}) {
    this.group = new THREE.Group();
    this.items = [];
    this.labels = [];
    this.mats = {};
    this.color = color;
    this.width = width;
    this.opacity = opacity;
    this.fade = 1;
  }

  mat(width) {
    const k = width.toFixed(2);
    if (!this.mats[k]) {
      this.mats[k] = new LineMaterial({
        color: this.color, linewidth: width, transparent: true, opacity: this.opacity,
        depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      });
    }
    return this.mats[k];
  }

  // segs: flat array [x,y,z, x,y,z, ...] (pairs), already ordered
  segments(segs, { t0 = 0, dur = 1, width = this.width, parent = this.group, e = ease.inOut } = {}) {
    const geo = new LineSegmentsGeometry();
    geo.setPositions(segs);
    const line = new LineSegments2(geo, this.mat(width));
    line.frustumCulled = false;
    parent.add(line);
    const n = segs.length / 6;
    this.items.push({ line, geo, n, t0, dur, e });
    return line;
  }

  polyline(pts, opts) {
    const s = [];
    for (let i = 0; i < pts.length - 1; i++) s.push(...pts[i], ...pts[i + 1]);
    return this.segments(s, opts);
  }

  // circle in the plane perpendicular to `axis` ('z' | 'y' | 'x')
  circle(c, r, opts = {}) {
    const { axis = 'z', seg = 96, a0 = 0, arc = Math.PI * 2 } = opts;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (arc * i) / seg;
      const u = Math.cos(a) * r, v = Math.sin(a) * r;
      if (axis === 'z') pts.push([c[0] + u, c[1] + v, c[2]]);
      else if (axis === 'y') pts.push([c[0] + u, c[1], c[2] + v]);
      else pts.push([c[0], c[1] + u, c[2] + v]);
    }
    return this.polyline(pts, opts);
  }

  // straight line split in pieces so it can extend smoothly
  line(a, b, opts = {}) {
    const n = opts.pieces || 24;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      pts.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]);
    }
    return this.polyline(pts, opts);
  }

  dashed(a, b, opts = {}) {
    const n = opts.dashes || 20;
    const s = [];
    for (let i = 0; i < n; i++) {
      const k0 = i / n, k1 = (i + 0.55) / n;
      s.push(a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0, a[2] + (b[2] - a[2]) * k0);
      s.push(a[0] + (b[0] - a[0]) * k1, a[1] + (b[1] - a[1]) * k1, a[2] + (b[2] - a[2]) * k1);
    }
    return this.segments(s, opts);
  }

  rect(c, w, h, opts = {}) {
    const [x, y, z] = c;
    const plane = opts.plane || 'xy';
    const P = (u, v) => (plane === 'xy' ? [x + u, y + v, z] : plane === 'xz' ? [x + u, y, z + v] : [x, y + v, z + u]);
    return this.polyline([P(-w / 2, -h / 2), P(w / 2, -h / 2), P(w / 2, h / 2), P(-w / 2, h / 2), P(-w / 2, -h / 2)].flatMap((p, i, arr) => {
      if (i === arr.length - 1) return [p];
      const q = arr[i + 1], out = [];
      for (let k = 0; k < 12; k++) out.push([p[0] + ((q[0] - p[0]) * k) / 12, p[1] + ((q[1] - p[1]) * k) / 12, p[2] + ((q[2] - p[2]) * k) / 12]);
      return out;
    }), opts);
  }

  // mesh edges, ordered by a sort key so the drawing sweeps across the object
  edges(mesh, opts = {}) {
    const { threshold = 30, key = (p) => p.y, parent = this.group } = opts;
    const eg = new THREE.EdgesGeometry(mesh.geometry, threshold);
    const p = eg.attributes.position.array;
    mesh.updateMatrix();
    const m = opts.matrix || mesh.matrix;
    const segs = [];
    const va = new THREE.Vector3(), vb = new THREE.Vector3();
    for (let i = 0; i < p.length; i += 6) {
      va.set(p[i], p[i + 1], p[i + 2]).applyMatrix4(m);
      vb.set(p[i + 3], p[i + 4], p[i + 5]).applyMatrix4(m);
      segs.push({ a: va.toArray(), b: vb.toArray(), k: key(va.clone().add(vb).multiplyScalar(0.5)) });
    }
    segs.sort((x, y) => x.k - y.k);
    return this.segments(segs.flatMap((s) => [...s.a, ...s.b]), { ...opts, parent });
  }

  // dimension line between a and b, offset by `off`, with end ticks and a label
  dim(a, b, off, label, opts = {}) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), O = new THREE.Vector3(...off);
    const a2 = A.clone().add(O), b2 = B.clone().add(O);
    const t0 = opts.t0 || 0, dur = opts.dur || 0.8;
    const w = opts.width || 1.4;
    this.line(A.toArray(), a2.clone().addScaledVector(O.clone().normalize(), 0.08).toArray(), { t0, dur: dur * 0.4, width: w, pieces: 6 });
    this.line(B.toArray(), b2.clone().addScaledVector(O.clone().normalize(), 0.08).toArray(), { t0, dur: dur * 0.4, width: w, pieces: 6 });
    this.line(a2.toArray(), b2.toArray(), { t0: t0 + dur * 0.25, dur: dur * 0.75, width: w });
    // arrow ticks (45 deg slashes, architectural style)
    const dir = b2.clone().sub(a2).normalize();
    const n = O.clone().normalize();
    const tick = dir.clone().add(n).normalize().multiplyScalar(opts.tick || 0.07);
    for (const p of [a2, b2]) this.line(p.clone().sub(tick).toArray(), p.clone().add(tick).toArray(), { t0: t0 + dur * 0.8, dur: 0.15, width: w + 0.6, pieces: 2 });
    if (label) {
      const mid = a2.clone().add(b2).multiplyScalar(0.5).addScaledVector(n, opts.labelOff || 0.16);
      this.label(label, mid.toArray(), { t0: t0 + dur * 0.6, size: opts.size || 0.14, rot: opts.rot, billboard: opts.billboard });
    }
  }

  label(text, pos, opts = {}) {
    const { t0 = 0, size = 0.14, rot = null, billboard = false, font = '300 64px Heebo', color = '#f2d69e', dir = 'ltr', letter = 4, parent = this.group } = opts;
    const m = textPlane(text, size, { font, color, dir, letter, additive: true });
    m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    m.userData = { t0, billboard, base: m.position.clone() };
    m.material.opacity = 0;
    parent.add(m);
    this.labels.push(m);
    return m;
  }

  update(t, camera, fade = 1) {
    for (const mt of Object.values(this.mats)) mt.opacity = this.opacity * fade;
    for (const it of this.items) {
      const k = it.e(clamp((t - it.t0) / it.dur));
      const n = Math.floor(k * it.n + 0.0001);
      it.geo.instanceCount = n;
      it.line.visible = n > 0 && fade > 0.001;
    }
    for (const l of this.labels) {
      const k = clamp((t - l.userData.t0) / 0.35);
      l.material.opacity = ease.out(k) * fade;
      l.visible = l.material.opacity > 0.001;
      if (l.userData.billboard && camera) l.quaternion.copy(camera.quaternion);
    }
  }
}
