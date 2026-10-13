import * as THREE from 'three';

export const PALETTE = {
  plum: '#3a1424',
  deep: '#1c0812',
  rose: '#e8b4bf',
  blush: '#f8e1e6',
  dusty: '#d98fa0',
  gold: '#d4af6a',
  goldLight: '#f3dca6',
  goldDeep: '#a8813f',
  cream: '#fbf3ef',
};

// ---------- reveal ("blueprint fills with material") ----------
// Every material that takes part in a reveal shares one uniform set per object,
// so a whole object dissolves in together with a glowing gold seam.
export function revealUniforms({ mode = 0, axis = [0, 1, 0], range = [-1, 1], edge = 0.1 } = {}) {
  return {
    uReveal: { value: 1 },
    uRevealMat: { value: new THREE.Matrix4() },
    uAxis: { value: new THREE.Vector3(...axis).normalize() },
    uRange: { value: new THREE.Vector2(...range) },
    uMode: { value: mode },
    uEdgeW: { value: edge },
    uEdgeCol: { value: new THREE.Color(1.8, 1.15, 0.55) },
  };
}

export function patchReveal(mat, U, { clipR = 1e6, shine = null } = {}) {
  const local = { uClipR: { value: clipR } };
  if (shine) Object.assign(local, shine);
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U, local);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat4 uRevealMat;\nvarying vec3 vRP;\nvarying vec2 vMyUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMyUv = uv;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRP = (uRevealMat * modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uReveal; uniform vec3 uAxis; uniform vec2 uRange; uniform int uMode;
        uniform float uEdgeW; uniform vec3 uEdgeCol; uniform float uClipR;
        ${shine ? 'uniform float uShine; uniform vec3 uShineCol;' : ''}
        varying vec3 vRP; varying vec2 vMyUv;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        if (length(vRP.xy) > uClipR) discard;
        float rdist = uMode == 1 ? length(vRP.xy) : dot(vRP, uAxis);
        float rd = (rdist - uRange.x) / (uRange.y - uRange.x);
        float th = uReveal * (1.0 + uEdgeW * 2.0) - uEdgeW;
        if (rd > th) discard;
        float edgeAmt = 1.0 - smoothstep(0.0, uEdgeW, th - rd);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uEdgeCol * edgeAmt;
        ${shine ? 'float sb = vMyUv.x * 0.8 + vMyUv.y * 0.35 - uShine; totalEmissiveRadiance += uShineCol * exp(-sb * sb * 90.0);' : ''}`);
  };
  mat.customProgramCacheKey = () => 'reveal' + (shine ? 's' : '');
  return mat;
}

// update helper: keep the reveal space glued to an object
export function syncReveal(U, obj) {
  obj.updateWorldMatrix(true, false);
  U.uRevealMat.value.copy(obj.matrixWorld).invert();
}

// ---------- base materials ----------
export const mats = {
  pinkSatin: () => new THREE.MeshPhysicalMaterial({ color: '#eab2c0', roughness: 0.38, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: new THREE.Color('#ffdbe5') }),
  leather: () => new THREE.MeshPhysicalMaterial({ color: '#b86a80', roughness: 0.75, metalness: 0.0, sheen: 0.6, sheenColor: new THREE.Color('#ffc7d6') }),
  gold: (r = 0.22) => new THREE.MeshStandardMaterial({ color: '#e9c27f', metalness: 1, roughness: r }),
  roseGold: () => new THREE.MeshStandardMaterial({ color: '#ecb9a4', metalness: 1, roughness: 0.25 }),
  darkMetal: () => new THREE.MeshStandardMaterial({ color: '#2a1820', metalness: 0.7, roughness: 0.32 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: '#3a2029', metalness: 0.15, roughness: 0.55 }),
  black: () => new THREE.MeshStandardMaterial({ color: '#0b0508', metalness: 0.2, roughness: 0.5 }),
  velvet: () => new THREE.MeshPhysicalMaterial({ color: '#d47f95', roughness: 0.92, metalness: 0, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color('#ffd0dc') }),
  paper: () => new THREE.MeshStandardMaterial({ color: '#b9a5a2', roughness: 0.95, metalness: 0 }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: '#160a12', metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [250, 700], transparent: true, opacity: 0.62 }),
};

// ---------- hologram photo card ----------
export function holoMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uHolo: { value: 1 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uSeed: { value: Math.random() * 100 },
      uFrame: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D map; uniform float uHolo, uOpacity, uTime, uGlitch, uSeed, uFrame;
      varying vec2 vUv;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main(){
        vec2 uv = vUv;
        float band = floor(uv.y * 26.0 + floor(uTime * 24.0) * 3.0);
        float g = uGlitch * step(0.62, h(band + uSeed));
        uv.x += g * (h(band * 1.7 + uSeed) - 0.5) * 0.12;
        vec3 c = texture2D(map, uv).rgb;
        vec3 cr = texture2D(map, uv + vec2(0.006 * (uHolo + g * 3.0), 0.0)).rgb;
        c.r = mix(c.r, cr.r, 0.7);
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        vec3 holo = mix(vec3(0.85, 0.22, 0.42), vec3(1.0, 0.82, 0.62), smoothstep(0.05, 0.8, l)) * (0.25 + 1.35 * l);
        holo = mix(holo, c * 1.1, 0.35);
        float scan = 0.82 + 0.18 * sin(vUv.y * 520.0 - uTime * 9.0);
        holo *= scan;
        vec2 e = min(vUv, 1.0 - vUv);
        float m = min(e.x, e.y * 0.8);
        float edge = (1.0 - smoothstep(0.0, 0.012, m)) * uFrame;
        float corner = (1.0 - smoothstep(0.0, 0.07, max(e.x, e.y * 0.8))) * uFrame;
        vec3 col = mix(c, holo, uHolo) + vec3(1.0, 0.75, 0.42) * (edge * (0.9 + uHolo * 1.6) + corner * 2.0);
        col += vec3(0.9, 0.5, 0.7) * g * 0.8;
        float a = uOpacity * mix(1.0, 0.86, uHolo);
        gl_FragColor = vec4(col, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

// soft round sprite for dust / bokeh
let _dot;
export function dotTexture() {
  if (_dot) return _dot;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,240,220,0.8)');
  gr.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _dot = new THREE.CanvasTexture(c);
  return _dot;
}

export function dust(count, box, { size = 0.06, color = '#f3d29a', seed = 1 } = {}) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pos = new Float32Array(count * 3);
  const base = [];
  for (let i = 0; i < count; i++) {
    const p = [box[0][0] + r() * (box[1][0] - box[0][0]), box[0][1] + r() * (box[1][1] - box[0][1]), box[0][2] + r() * (box[1][2] - box[0][2])];
    base.push([...p, r() * 6.28, 0.3 + r()]);
    pos.set(p, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size, map: dotTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.userData.drift = (t) => {
    for (let i = 0; i < count; i++) {
      const b = base[i];
      pos[i * 3] = b[0] + Math.sin(t * 0.4 * b[4] + b[3]) * 0.25;
      pos[i * 3 + 1] = b[1] + Math.sin(t * 0.3 * b[4] + b[3] * 2) * 0.3 + t * 0.05 * b[4];
      pos[i * 3 + 2] = b[2] + Math.cos(t * 0.35 * b[4] + b[3]) * 0.25;
    }
    geo.attributes.position.needsUpdate = true;
  };
  return pts;
}

// canvas text -> textured plane (technical labels, foil text)
export function textCanvas(lines, { font = '300 40px Heebo', color = '#f0d49a', pad = 16, align = 'center', lh = 1.25, dir = 'ltr', letter = 0 } = {}) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = font;
  if (letter) g.letterSpacing = letter + 'px';
  const arr = Array.isArray(lines) ? lines : [lines];
  const size = parseFloat(font.match(/(\d+)px/)[1]);
  const w = Math.ceil(Math.max(...arr.map((l) => g.measureText(l).width)) + pad * 2 + letter * 2);
  const h = Math.ceil(arr.length * size * lh + pad * 2);
  c.width = w; c.height = h;
  g.font = font;
  if (letter) g.letterSpacing = letter + 'px';
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.direction = dir;
  g.textAlign = align;
  const x = align === 'center' ? w / 2 : align === 'left' || align === 'start' ? pad : w - pad;
  arr.forEach((l, i) => g.fillText(l, x, pad + size * lh * (i + 0.5)));
  return c;
}

export function textPlane(lines, height, opts = {}) {
  const c = textCanvas(lines, opts);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry((height * c.width) / c.height, height);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  return new THREE.Mesh(geo, mat);
}
