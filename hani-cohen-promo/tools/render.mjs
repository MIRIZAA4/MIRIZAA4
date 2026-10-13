// Offline renderer: N headless browsers render frame ranges, each piped into ffmpeg.
// usage: node tools/render.mjs [workers=3] [fps=30]
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';

const WORKERS = +(process.argv[2] || 3);
const URL = process.env.URL || 'http://localhost:8777/index.html?render';
fs.mkdirSync('out/seg', { recursive: true });

async function worker(k, f0, f1, fps) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log(`[w${k}] pageerror`, e.message));
  await p.goto(URL);
  await p.waitForFunction('window.ready === true', null, { timeout: 600000 });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(fps), `out/seg/seg_${String(k).padStart(2, '0')}.mp4`]);
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    const b64 = await p.evaluate((t) => window.grab(t, 0.95), f / fps);
    const buf = Buffer.from(b64, 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if ((f - f0) % 25 === 0) console.log(`[w${k}] frame ${f}/${f1}  ${(((Date.now() - t0) / (f - f0 + 1)) / 1000).toFixed(2)}s/f`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close();
  console.log(`[w${k}] done`);
}

const fps = +(process.argv[3] || 30);
const total = Math.round(49.2 * fps);
const per = Math.ceil(total / WORKERS);
await Promise.all([...Array(WORKERS)].map((_, k) => worker(k, k * per, Math.min(total, (k + 1) * per), fps)));
console.log('ALL DONE', total, 'frames');
