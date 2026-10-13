// usage: node tools/shot.mjs <page> <out.png> [w h] [beat]
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require(process.env.NODE_PATH_PW || '/opt/node22/lib/node_modules/playwright');
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const [,, page, out, w='1080', h='1920', ...beats] = process.argv;
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'};
const srv = http.createServer((q,s)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});s.end(d);});}).listen(0);
const port = srv.address().port;
const b = await chromium.launch(); const p = await b.newPage({viewport:{width:+w,height:+h}});
p.on('console', m => console.log('[page]', m.text())); p.on('pageerror', e => console.log('[err]', e.message));
await p.goto(`http://localhost:${port}/${page}`); await p.waitForFunction('window.READY===true',null,{timeout:60000});
if (beats.length) {
  for (const bt of beats) { await p.evaluate(x => window.renderBeat(+x), bt); const o = out.replace('.png', `_${bt}.png`); await p.locator('canvas').screenshot({ path: o }); }
} else await p.screenshot({ path: out });
await b.close(); srv.close();
