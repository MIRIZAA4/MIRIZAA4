import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DURATION, FPS } from './timeline.js';
import { buildPhotos } from './photos.js';
import { Overlay, W, H } from './overlay.js';
import { COPY, FX } from './copy.js';
import { createCapture } from './scenes/capture.js';
import { createEditing } from './scenes/editing.js';
import { createAlbum } from './scenes/album.js';
import { createPrint } from './scenes/print.js';
import { createHome } from './scenes/home.js';

const params = new URLSearchParams(location.search);
const RENDER = params.has('render');

const glCanvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = (() => {
  const c = document.createElement('canvas');
  c.width = 540; c.height = 960;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(270, 400, 20, 270, 480, 720);
  gr.addColorStop(0, '#5e2443');
  gr.addColorStop(0.45, '#3b1428');
  gr.addColorStop(1, '#14050c');
  g.fillStyle = gr;
  g.fillRect(0, 0, 540, 960);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();

const pmrem = new THREE.PMREMGenerator(renderer);
const env = new RoomEnvironment();
scene.environment = pmrem.fromScene(env, 0.035).texture;
scene.environmentIntensity = 0.65;

const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 400);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.42, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// lights shared by all scenes
scene.add(new THREE.HemisphereLight('#ffe6ee', '#2a0c18', 0.6));
const key = new THREE.DirectionalLight('#fff0e6', 2.2);
key.position.set(4, 6, 8);
scene.add(key);
const rim = new THREE.DirectionalLight('#ffc89a', 2.0);
rim.position.set(-6, 3, -6);
scene.add(rim);
const fill = new THREE.DirectionalLight('#ff9ab8', 0.8);
fill.position.set(-5, -2, 5);
scene.add(fill);

const overlay = new Overlay(document.getElementById('ov'));

async function init() {
  await Promise.all([
    document.fonts.load('700 100px "Frank Ruhl Libre"', 'אבג'),
    document.fonts.load('500 100px "Frank Ruhl Libre"', 'אבג'),
    document.fonts.load('400 100px "Frank Ruhl Libre"', 'אבג abc'),
    document.fonts.load('200 40px Heebo', 'אבג abc'),
    document.fonts.load('300 40px Heebo', 'אבג abc'),
    document.fonts.load('400 40px Heebo', 'אבג abc'),
    document.fonts.load('500 40px Heebo', 'אבג abc'),
  ]);
  const photos = await buildPhotos();
  const ctx = { scene, camera, renderer, photos, bloom, key, rim };
  const modules = [createCapture(ctx), createEditing(ctx), createAlbum(ctx), createPrint(ctx), createHome(ctx)];

  function renderAt(t) {
    for (const m of modules) m.update(t);
    camera.updateMatrixWorld();
    for (const m of modules) m.late && m.late(t);
    overlay.draw(t, COPY, FX);
    composer.render();
  }
  window.renderAt = renderAt;
  const grabC = document.createElement('canvas');
  grabC.width = W; grabC.height = H;
  const grabG = grabC.getContext('2d');
  // composite 3D + overlay into one JPEG (used by the offline renderer)
  window.grab = (t, q = 0.92) => {
    renderAt(t);
    grabG.drawImage(glCanvas, 0, 0);
    grabG.drawImage(document.getElementById('ov'), 0, 0);
    return grabC.toDataURL('image/jpeg', q).slice(23);
  };
  window.DURATION = DURATION;
  window.FPS = FPS;

  // warm-up: compile every program once
  for (const tt of [0.5, 5, 10, 13, 17, 20, 24, 29, 32, 35, 37, 39, 42, 45, 48]) renderAt(tt);
  renderAt(Number(params.get('t') || 0));
  window.ready = true;

  if (!RENDER) {
    const stage = document.getElementById('stage');
    const fit = () => {
      const s = Math.min(innerWidth / W, innerHeight / H);
      stage.style.transform = `translate(${(innerWidth - W * s) / 2}px, ${(innerHeight - H * s) / 2}px) scale(${s})`;
    };
    fit();
    addEventListener('resize', fit);
    const audio = new Audio('out/music.wav');
    let t0 = performance.now(), playing = !params.has('t'), base = Number(params.get('t') || 0);
    const hud = document.getElementById('hud');
    addEventListener('keydown', (e) => {
      if (e.code === 'Space') { playing = !playing; base = cur(); t0 = performance.now(); if (playing) { audio.currentTime = base; audio.play(); } else audio.pause(); }
      if (e.code === 'ArrowRight') { base = cur() + 1; t0 = performance.now(); audio.currentTime = base; }
      if (e.code === 'ArrowLeft') { base = Math.max(0, cur() - 1); t0 = performance.now(); audio.currentTime = base; }
    });
    const cur = () => (playing ? base + (performance.now() - t0) / 1000 : base) % DURATION;
    const loop = () => {
      const t = cur();
      renderAt(t);
      hud.textContent = t.toFixed(2) + 's  [space] play/pause  [←/→] seek';
      requestAnimationFrame(loop);
    };
    loop();
  }
}
init();
