// Renders the film frame-by-frame in headless Chromium and muxes it with the score.
// usage: node tools/render.mjs [startFrame endFrame]
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || '/opt/node22/lib/node_modules/playwright');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TL = JSON.parse(fs.readFileSync(path.join(root, 'timeline.json')));
const total = Math.round(TL.totalBeats * 60 / TL.bpm * TL.fps);
const f0 = +(process.argv[2] ?? 0), f1 = +(process.argv[3] ?? total);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.wav': 'audio/wav' };
const srv = http.createServer((q, s) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); s.end(d); }); }).listen(0);
const port = srv.address().port;
fs.mkdirSync(path.join(root, 'out'), { recursive: true });
const silent = path.join(root, 'out', 'video_silent.mp4');
const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const b = await chromium.launch({ args: ['--disable-web-security'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('[err]', e.message));
await p.goto(`http://localhost:${port}/index.html?render`);
await p.waitForFunction('window.READY===true', null, { timeout: 120000 });
const t0 = Date.now();
for (let f = f0; f < f1; f++) {
  const url = await p.evaluate(x => window.frameJPEG(x, .96), f);
  const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 60 === 0) console.log(`frame ${f}/${f1}  ${((Date.now() - t0) / (f - f0 + 1)).toFixed(0)} ms/frame`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await b.close(); srv.close();
console.log('done', silent);
