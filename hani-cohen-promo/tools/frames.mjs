import fs from 'fs';
// usage: node tools/frames.mjs out/prefix t1 t2 t3 ...  -> renders stills at given times
import { chromium } from 'playwright';
const [,, prefix, ...ts] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('console', m => { if (m.type() !== 'log' || !m.text().includes('THREE')) console.log('console:', m.text()); });
p.on('pageerror', e => console.log('pageerror:', e.message));
const t0 = Date.now();
await p.goto('http://localhost:8777/index.html?render');
await p.waitForFunction('window.ready === true', null, { timeout: 300000 });
console.log('init ms', Date.now() - t0);
for (const t of ts) {
  const s = Date.now();
  const b64 = await p.evaluate((t) => window.grab(t, 0.85), +t);
  fs.writeFileSync(`${prefix}${t}.jpg`, Buffer.from(b64, 'base64'));
  console.log(t, 'ms', Date.now() - s);
}
await b.close();
