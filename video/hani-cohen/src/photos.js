// photos.js — procedural placeholder "photographs" (replace with real photos in ./photos/01.jpg … )
'use strict';

const PW = 720, PH = 900;

function grain(g, w, h, amt, seed) {
  const r = rng(seed);
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - .5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(id, 0, 0);
}

function finishPhoto(g, seed, o = {}) {
  // warm grade
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.fillStyle = o.tone || 'rgba(255,170,140,.35)';
  g.fillRect(0, 0, PW, PH);
  g.globalCompositeOperation = 'source-over';
  // vignette
  const v = g.createRadialGradient(PW / 2, PH * .48, PH * .25, PW / 2, PH * .5, PH * .78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(30,8,16,${o.vig ?? .55})`);
  g.fillStyle = v; g.fillRect(0, 0, PW, PH);
  g.restore();
  grain(g, PW, PH, o.grain ?? 18, seed);
}

function bokeh(g, r, n, cols, rmin, rmax, area = [0, 0, PW, PH], amax = .5) {
  for (let i = 0; i < n; i++) {
    const x = area[0] + r() * area[2], y = area[1] + r() * area[3], rad = lerp(rmin, rmax, r() * r());
    const col = cols[Math.floor(r() * cols.length)];
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const a = amax * (.35 + r() * .65);
    gr.addColorStop(0, rgba(col, a * .55)); gr.addColorStop(.75, rgba(col, a * .7)); gr.addColorStop(.92, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
}

function sun(g, x, y, r, col = '255,226,170') {
  const gl = g.createRadialGradient(x, y, 0, x, y, r * 9);
  gl.addColorStop(0, `rgba(${col},.95)`); gl.addColorStop(.12, `rgba(${col},.55)`); gl.addColorStop(.4, `rgba(${col},.15)`); gl.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gl; g.fillRect(0, 0, PW, PH);
  g.fillStyle = 'rgba(255,250,235,1)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}

// silhouette person; feet at (x, fy), height h. o: {dress, hair:'long'|'short'|'bun'|'none', child, armL:[dx,dy], armR:[dx,dy], legs:'walk'|'jump'}
function person(g, x, fy, h, o = {}) {
  const hr = h * (o.child ? .095 : .068);
  const hy = fy - h + hr;
  const sh = hy + hr * 1.55;
  const sw = h * (o.child ? .1 : .115) * (o.broad ?? 1);
  const waist = sh + h * (o.child ? .22 : .27);
  g.beginPath(); g.arc(x, hy, hr, 0, TAU); g.fill();
  if (o.hair === 'long') {
    g.beginPath(); g.ellipse(x, hy + hr * .9, hr * 1.12, hr * 1.9, 0, 0, TAU); g.fill();
  } else if (o.hair === 'bun') {
    g.beginPath(); g.arc(x + (o.face ?? 0) * -hr * .9, hy - hr * .55, hr * .55, 0, TAU); g.fill();
  }
  // neck
  g.fillRect(x - hr * .35, hy + hr * .6, hr * .7, hr * 1.1);
  // torso
  g.beginPath();
  g.moveTo(x - sw, sh + hr * .5);
  g.quadraticCurveTo(x - sw, sh, x - sw * .5, sh - hr * .1);
  g.lineTo(x + sw * .5, sh - hr * .1);
  g.quadraticCurveTo(x + sw, sh, x + sw, sh + hr * .5);
  g.lineTo(x + sw * .72, waist);
  g.lineTo(x - sw * .72, waist);
  g.closePath(); g.fill();
  const lift = o.legs === 'jump' ? h * .08 : 0;
  if (o.dress) {
    const hem = fy - h * .045 - lift, flare = sw * (o.child ? 1.25 : 1.4);
    g.beginPath();
    g.moveTo(x - sw * .72, waist);
    g.quadraticCurveTo(x - sw * .95, (waist + hem) / 2, x - flare, hem);
    g.quadraticCurveTo(x, hem + h * .015, x + flare, hem);
    g.quadraticCurveTo(x + sw * .95, (waist + hem) / 2, x + sw * .72, waist);
    g.closePath(); g.fill();
    g.fillRect(x - sw * .45, hem - 4, sw * .25, fy - hem + 4 - lift);
    g.fillRect(x + sw * .2, hem - 4, sw * .25, fy - hem + 4 - lift);
  } else {
    g.beginPath();
    const lw = sw * .42;
    const sp = o.legs === 'walk' ? sw * .55 : sw * .25;
    g.moveTo(x - sw * .72, waist); g.lineTo(x + sw * .72, waist);
    g.lineTo(x + sp + lw * .5, fy - lift); g.lineTo(x + sp - lw * .5, fy - lift);
    g.lineTo(x, waist + h * .1);
    g.lineTo(x - sp + lw * .5, fy - lift); g.lineTo(x - sp - lw * .5, fy - lift);
    g.closePath(); g.fill();
  }
  // arms
  g.save();
  g.lineCap = 'round'; g.lineWidth = sw * .36; g.strokeStyle = g.fillStyle;
  const armLen = h * .36;
  const aL = o.armL || [-sw * 1.1, armLen * .95], aR = o.armR || [sw * 1.1, armLen * .95];
  g.beginPath(); g.moveTo(x - sw * .8, sh + hr * .3); g.quadraticCurveTo(x - sw * 1.05 + aL[0] * .2, sh + aL[1] * .5, x + aL[0], sh + aL[1]); g.stroke();
  g.beginPath(); g.moveTo(x + sw * .8, sh + hr * .3); g.quadraticCurveTo(x + sw * 1.05 + aR[0] * .2, sh + aR[1] * .5, x + aR[0], sh + aR[1]); g.stroke();
  g.restore();
  return { hy, hr, sh, sw };
}

// draws callback silhouettes on a layer, then composites with rim glow
function silhouettes(g, col, glow, blur, fn) {
  const L = mkCanvas(PW, PH), lg = L.getContext('2d');
  lg.fillStyle = col; lg.strokeStyle = col;
  fn(lg);
  g.save();
  g.shadowColor = glow; g.shadowBlur = blur;
  g.drawImage(L, 0, 0);
  g.shadowBlur = blur * .4;
  g.drawImage(L, 0, 0);
  g.restore();
}

function grass(g, r, y0, col, n = 500) {
  g.save(); g.strokeStyle = col; g.lineWidth = 1.4;
  for (let i = 0; i < n; i++) {
    const x = r() * PW, h = 12 + r() * 50, y = y0 + r() * 40;
    g.globalAlpha = .3 + r() * .6;
    g.beginPath(); g.moveTo(x, y + h); g.quadraticCurveTo(x + (r() - .5) * 10, y + h * .5, x + (r() - .5) * 18, y); g.stroke();
  }
  g.restore();
}

const PHOTO_GEN = [
  // 0 — sunset couple in a field
  (g, r) => {
    const s = g.createLinearGradient(0, 0, 0, PH);
    s.addColorStop(0, '#4b2242'); s.addColorStop(.35, '#b45673'); s.addColorStop(.58, '#f29a7f'); s.addColorStop(.7, '#ffd39c'); s.addColorStop(1, '#ffd39c');
    g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 7; i++) { g.fillStyle = `rgba(255,${180 + r() * 40 | 0},190,${.08 + r() * .1})`; g.beginPath(); g.ellipse(r() * PW, 120 + r() * 380, 120 + r() * 200, 14 + r() * 26, 0, 0, TAU); g.fill(); }
    sun(g, PW * .5, PH * .655, 42);
    const gr = g.createLinearGradient(0, PH * .68, 0, PH);
    gr.addColorStop(0, '#7a3b45'); gr.addColorStop(.3, '#3b1a24'); gr.addColorStop(1, '#1a0a10');
    g.fillStyle = gr; g.fillRect(0, PH * .68, PW, PH);
    grass(g, r, PH * .64, 'rgba(255,200,150,.8)', 700);
    silhouettes(g, '#1b0b11', 'rgba(255,190,140,.95)', 26, lg => {
      person(lg, PW * .43, PH * .93, PH * .47, { dress: true, hair: 'long', armR: [70, 150] });
      person(lg, PW * .585, PH * .935, PH * .51, { hair: 'short', armL: [-58, 155], broad: 1.1 });
    });
    for (let i = 0; i < 5; i++) { const k = .2 + i * .18; const x = lerp(PW * .5, PW * .1, k), y = lerp(PH * .655, PH * .2, k); g.fillStyle = `rgba(255,220,180,${.12 - i * .015})`; g.beginPath(); g.arc(x, y, 20 + i * 14, 0, TAU); g.fill(); }
  },
  // 1 — newborn in swaddle (top-down)
  (g, r) => {
    g.fillStyle = '#f2e3d8'; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = 'rgba(190,150,140,.25)'; g.lineWidth = 3;
    for (let y = -20; y < PH + 20; y += 22) for (let x = (y / 22) % 2 ? 0 : 11; x < PW + 20; x += 22) { g.beginPath(); g.arc(x, y, 9, .2, Math.PI - .2); g.stroke(); }
    g.save(); g.translate(PW * .5, PH * .6); g.rotate(-.18);
    g.fillStyle = 'rgba(90,50,50,.18)'; g.beginPath(); g.ellipse(18, 30, 210, 330, 0, 0, TAU); g.fill();
    const sg = g.createLinearGradient(-200, -300, 200, 300); sg.addColorStop(0, '#f7d3d8'); sg.addColorStop(1, '#e3a9b3');
    g.fillStyle = sg; g.beginPath(); g.ellipse(0, 60, 190, 300, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(170,90,105,.35)'; g.lineWidth = 6;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-60 + i * 30, 60 + i * 40, 200, -.9, -.2); g.stroke(); }
    const fg = g.createRadialGradient(-20, -210, 10, 0, -190, 130); fg.addColorStop(0, '#fbe2d2'); fg.addColorStop(1, '#ebc0a8');
    g.fillStyle = fg; g.beginPath(); g.ellipse(0, -190, 112, 122, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(240,140,150,.35)'; g.beginPath(); g.arc(-52, -160, 26, 0, TAU); g.arc(52, -160, 26, 0, TAU); g.fill();
    g.strokeStyle = '#8a5a55'; g.lineWidth = 4;
    g.beginPath(); g.arc(-40, -195, 18, .3, Math.PI - .3); g.stroke();
    g.beginPath(); g.arc(40, -195, 18, .3, Math.PI - .3); g.stroke();
    g.beginPath(); g.arc(0, -150, 12, .4, Math.PI - .4); g.stroke();
    g.fillStyle = '#e7b9c2'; g.beginPath(); g.ellipse(0, -270, 120, 34, 0, Math.PI, TAU); g.fill();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.fillStyle = i % 2 ? '#f7dfe3' : '#e8a9b6'; g.beginPath(); g.ellipse(70 + Math.cos(a) * 26, -282 + Math.sin(a) * 26, 26, 16, a, 0, TAU); g.fill(); }
    g.fillStyle = '#d4a85a'; g.beginPath(); g.arc(70, -282, 13, 0, TAU); g.fill();
    g.restore();
    const lg = g.createRadialGradient(PW * .15, PH * .1, 20, PW * .2, PH * .15, PH * .8);
    lg.addColorStop(0, 'rgba(255,250,240,.5)'); lg.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = lg; g.fillRect(0, 0, PW, PH);
  },
  // 2 — family at the beach
  (g, r) => {
    const s = g.createLinearGradient(0, 0, 0, PH * .6);
    s.addColorStop(0, '#e9a6b4'); s.addColorStop(1, '#fde0cc');
    g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    sun(g, PW * .7, PH * .5, 30, '255,236,200');
    const sea = g.createLinearGradient(0, PH * .58, 0, PH * .74); sea.addColorStop(0, '#c78fa3'); sea.addColorStop(1, '#efc6bf');
    g.fillStyle = sea; g.fillRect(0, PH * .58, PW, PH * .16);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,240,220,${.2 + r() * .5})`; g.fillRect(PW * .7 - 40 + r() * 80 - i, PH * .59 + i * 3.4, 30 + r() * 60, 2); }
    const sand = g.createLinearGradient(0, PH * .74, 0, PH); sand.addColorStop(0, '#f1d3c1'); sand.addColorStop(1, '#c79b8e');
    g.fillStyle = sand; g.fillRect(0, PH * .74, PW, PH);
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, PH * .74); for (let x = 0; x <= PW; x += 20) g.lineTo(x, PH * .745 + Math.sin(x * .03) * 6); g.lineTo(PW, PH * .76); g.lineTo(0, PH * .76); g.fill();
    silhouettes(g, '#3d1c29', 'rgba(255,215,190,.9)', 20, lg => {
      person(lg, PW * .25, PH * .9, PH * .4, { hair: 'short', armR: [55, 120], broad: 1.08 });
      person(lg, PW * .42, PH * .88, PH * .22, { child: true, dress: true, hair: 'long', armL: [-35, 55], armR: [35, -40], legs: 'jump' });
      person(lg, PW * .6, PH * .905, PH * .37, { dress: true, hair: 'long', armL: [-50, 105], armR: [45, 115] });
      person(lg, PW * .76, PH * .91, PH * .2, { child: true, hair: 'short', armL: [-30, 50] });
    });
  },
  // 3 — wedding rings on peony
  (g, r) => {
    const s = g.createLinearGradient(0, 0, PW, PH); s.addColorStop(0, '#f6d3d6'); s.addColorStop(1, '#e09aa9'); g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    bokeh(g, r, 30, ['#ffffff', '#f1d9a0', '#f7c0cb'], 20, 90, [0, 0, PW, PH * .5], .45);
    for (let k = 0; k < 3; k++) {
      const px = [PW * .3, PW * .72, PW * .5][k], py = [PH * .78, PH * .82, PH * .95][k];
      for (let i = 0; i < 46; i++) {
        const a = r() * TAU, d = r() * 150, pr = 60 + r() * 70;
        const gg = g.createRadialGradient(px + Math.cos(a) * d, py + Math.sin(a) * d * .6, 0, px + Math.cos(a) * d, py + Math.sin(a) * d * .6, pr);
        gg.addColorStop(0, '#fbe7ea'); gg.addColorStop(.7, i % 3 ? '#efb2bf' : '#e597a9'); gg.addColorStop(1, 'rgba(200,110,130,0)');
        g.fillStyle = gg; g.beginPath(); g.ellipse(px + Math.cos(a) * d, py + Math.sin(a) * d * .6, pr, pr * .55, a, 0, TAU); g.fill();
      }
    }
    const ring = (x, y, rx, ry, rot) => {
      g.save(); g.translate(x, y); g.rotate(rot);
      g.strokeStyle = 'rgba(80,40,30,.35)'; g.lineWidth = 26; g.beginPath(); g.ellipse(8, 18, rx, ry, 0, 0, TAU); g.stroke();
      const rg = g.createLinearGradient(-rx, -ry, rx, ry); rg.addColorStop(0, '#7d5a26'); rg.addColorStop(.3, '#f7e0a6'); rg.addColorStop(.5, '#c9a25e'); rg.addColorStop(.7, '#fff3cf'); rg.addColorStop(1, '#8e6a2f');
      g.strokeStyle = rg; g.lineWidth = 24; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,250,230,.8)'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, -3, rx - 6, ry - 6, 0, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
      g.restore();
    };
    ring(PW * .42, PH * .52, 120, 70, -.25);
    ring(PW * .6, PH * .56, 105, 62, .3);
    sparkle(g, PW * .34, PH * .44, 30, 1, .2);
    sparkle(g, PW * .66, PH * .5, 16, .8);
  },
  // 4 — girl with bouquet in garden (bat mitzvah)
  (g, r) => {
    const s = g.createLinearGradient(0, 0, 0, PH); s.addColorStop(0, '#d9d2ae'); s.addColorStop(.5, '#efc6b4'); s.addColorStop(1, '#c98e98');
    g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    bokeh(g, r, 70, ['#fff4d6', '#f6d38f', '#ffffff', '#b9c58d'], 15, 70, [0, 0, PW, PH * .7], .5);
    sun(g, PW * .78, PH * .16, 22, '255,240,205');
    silhouettes(g, '#5a2f3c', 'rgba(255,225,180,.95)', 30, lg => {
      person(lg, PW * .5, PH * 1.02, PH * .78, { dress: true, hair: 'long', armL: [70, 160], armR: [-60, 165] });
    });
    for (let i = 0; i < 26; i++) {
      const a = r() * TAU, d = r() * 70, x = PW * .5 + Math.cos(a) * d, y = PH * .62 + Math.sin(a) * d * .7;
      const fg = g.createRadialGradient(x, y, 0, x, y, 30); fg.addColorStop(0, '#fff3f0'); fg.addColorStop(.6, ['#f3b7c3', '#fde6d8', '#e590a4'][i % 3]); fg.addColorStop(1, 'rgba(230,140,160,0)');
      g.fillStyle = fg; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill();
    }
    g.strokeStyle = '#6f8a5a'; g.lineWidth = 6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(PW * .5 + (i - 2) * 6, PH * .68); g.lineTo(PW * .5 + (i - 2) * 3, PH * .8); g.stroke(); }
  },
  // 5 — maternity profile in studio window light
  (g, r) => {
    const s = g.createLinearGradient(0, 0, PW, 0); s.addColorStop(0, '#f6dedb'); s.addColorStop(1, '#d9a0ad'); g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    g.save(); g.globalAlpha = .35;
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,250,240,.6)'; g.beginPath(); g.moveTo(-50 + i * 120, 0); g.lineTo(30 + i * 120, 0); g.lineTo(380 + i * 120, PH); g.lineTo(260 + i * 120, PH); g.fill(); }
    g.restore();
    silhouettes(g, '#4a2232', 'rgba(255,220,190,.9)', 24, lg => {
      const x = PW * .48, top = PH * .12;
      lg.beginPath(); lg.arc(x, top + 60, 52, 0, TAU); lg.fill();
      lg.beginPath(); lg.arc(x - 44, top + 30, 30, 0, TAU); lg.fill();
      lg.beginPath();
      lg.moveTo(x - 20, top + 100);
      lg.lineTo(x + 20, top + 105);
      lg.quadraticCurveTo(x + 60, top + 170, x + 55, top + 250);
      lg.bezierCurveTo(x + 190, top + 300, x + 200, top + 460, x + 90, top + 510);
      lg.quadraticCurveTo(x + 150, top + 650, x + 200, PH);
      lg.lineTo(x - 170, PH);
      lg.quadraticCurveTo(x - 100, top + 520, x - 70, top + 260);
      lg.quadraticCurveTo(x - 75, top + 150, x - 20, top + 100);
      lg.fill();
      lg.lineCap = 'round'; lg.lineWidth = 30;
      lg.beginPath(); lg.moveTo(x - 30, top + 160); lg.quadraticCurveTo(x - 20, top + 330, x + 100, top + 360); lg.stroke();
      lg.beginPath(); lg.moveTo(x + 20, top + 175); lg.quadraticCurveTo(x + 40, top + 280, x + 135, top + 300); lg.stroke();
    });
  },
  // 6 — mother lifting child, purple sunset
  (g, r) => {
    const s = g.createLinearGradient(0, 0, 0, PH); s.addColorStop(0, '#3a1c3e'); s.addColorStop(.45, '#a54a6c'); s.addColorStop(.75, '#f7a989'); s.addColorStop(1, '#ffdcae');
    g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    sun(g, PW * .3, PH * .8, 50);
    g.fillStyle = '#2a1220'; g.beginPath(); g.moveTo(0, PH * .86); g.quadraticCurveTo(PW * .5, PH * .8, PW, PH * .88); g.lineTo(PW, PH); g.lineTo(0, PH); g.fill();
    silhouettes(g, '#1c0a14', 'rgba(255,185,150,.95)', 26, lg => {
      const m = person(lg, PW * .55, PH * .87, PH * .5, { dress: true, hair: 'bun', armL: [-30, -150], armR: [30, -150] });
      const cx = PW * .55, cy = m.sh - 190;
      lg.beginPath(); lg.arc(cx + 60, cy - 10, 30, 0, TAU); lg.fill();
      lg.beginPath(); lg.ellipse(cx, cy + 10, 62, 34, -.2, 0, TAU); lg.fill();
      lg.lineCap = 'round'; lg.lineWidth = 16;
      lg.beginPath(); lg.moveTo(cx - 40, cy + 20); lg.lineTo(cx - 100, cy + 50); lg.stroke();
      lg.beginPath(); lg.moveTo(cx - 40, cy + 10); lg.lineTo(cx - 95, cy - 20); lg.stroke();
      lg.beginPath(); lg.moveTo(cx + 40, cy); lg.lineTo(cx + 95, cy - 50); lg.stroke();
      lg.beginPath(); lg.moveTo(cx + 30, cy + 15); lg.lineTo(cx + 100, cy + 30); lg.stroke();
    });
    for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(30,10,20,.7)'; g.lineWidth = 3; const bx = 100 + i * 70, by = 150 + (i % 2) * 40; g.beginPath(); g.moveTo(bx - 14, by); g.quadraticCurveTo(bx - 6, by - 8, bx, by); g.quadraticCurveTo(bx + 6, by - 8, bx + 14, by); g.stroke(); }
  },
  // 7 — child blowing a dandelion
  (g, r) => {
    const s = g.createLinearGradient(0, 0, PW, PH); s.addColorStop(0, '#f8e6d6'); s.addColorStop(1, '#e7a7b5'); g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    bokeh(g, r, 50, ['#ffffff', '#fbe4bd', '#d7dfb1'], 20, 80, [0, 0, PW, PH], .4);
    silhouettes(g, '#5b2b3b', 'rgba(255,235,210,.95)', 22, lg => {
      const x = PW * .32, y = PH * .5;
      lg.beginPath(); lg.arc(x, y, 95, 0, TAU); lg.fill();
      lg.beginPath(); lg.ellipse(x - 20, y - 50, 90, 70, -.3, 0, TAU); lg.fill();
      lg.beginPath(); lg.arc(x + 95, y + 10, 16, 0, TAU); lg.fill();
      lg.beginPath(); lg.moveTo(x - 40, y + 80); lg.quadraticCurveTo(x - 150, y + 150, x - 170, PH); lg.lineTo(x + 180, PH); lg.quadraticCurveTo(x + 150, y + 160, x + 30, y + 90); lg.fill();
      lg.lineCap = 'round'; lg.lineWidth = 28; lg.beginPath(); lg.moveTo(x + 60, y + 170); lg.quadraticCurveTo(x + 150, y + 160, x + 170, y + 100); lg.stroke();
      lg.lineWidth = 4; lg.beginPath(); lg.moveTo(x + 172, y + 100); lg.quadraticCurveTo(x + 185, y + 30, x + 200, y - 20); lg.stroke();
    });
    const dx = PW * .32 + 200, dy = PH * .5 - 30;
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) { const a = r() * TAU; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + Math.cos(a) * 34, dy + Math.sin(a) * 34); g.stroke(); }
    for (let i = 0; i < 60; i++) { const x = dx + 20 + r() * 330, y = dy - 200 + r() * 330, a = r() * TAU; g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = .4 + r() * .6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 12); g.stroke(); for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(k) * 7, -Math.abs(Math.sin(k)) * 7); g.stroke(); } g.restore(); }
  },
  // 8 — studio portrait, backlit hair
  (g, r) => {
    const s = g.createRadialGradient(PW * .5, PH * .35, 50, PW * .5, PH * .4, PH * .8); s.addColorStop(0, '#f6d6d8'); s.addColorStop(1, '#a8566e');
    g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    silhouettes(g, '#3c1a27', 'rgba(255,215,190,1)', 34, lg => {
      const x = PW * .5, y = PH * .4;
      lg.beginPath(); lg.ellipse(x, y + 60, 190, 260, 0, 0, TAU); lg.fill();
      lg.beginPath(); lg.ellipse(x, y, 125, 160, 0, 0, TAU); lg.fill();
      lg.fillRect(x - 50, y + 120, 100, 120);
      lg.beginPath(); lg.moveTo(x - 60, y + 210); lg.bezierCurveTo(x - 320, y + 240, x - 330, y + 380, x - 360, PH); lg.lineTo(x + 360, PH); lg.bezierCurveTo(x + 330, y + 380, x + 320, y + 240, x + 60, y + 210); lg.fill();
    });
    g.strokeStyle = 'rgba(255,215,180,.4)'; g.lineWidth = 1.2;
    for (let i = 0; i < 80; i++) { const a = -Math.PI * .9 + r() * Math.PI * .8; const x = PW * .5 + Math.cos(a) * 190, y = PH * .4 + 60 + Math.sin(a) * 250; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30, x + Math.cos(a) * 50 + (r() - .5) * 30, y + Math.sin(a) * 40 + 30); g.stroke(); }
    sparkle(g, PW * .5 - 112, PH * .4 + 110, 14, .9);
  },
  // 9 — peonies still life
  (g, r) => {
    const s = g.createLinearGradient(0, 0, 0, PH); s.addColorStop(0, '#f7ebe3'); s.addColorStop(1, '#e8cfc8'); g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    g.fillStyle = 'rgba(120,70,70,.12)'; g.beginPath(); g.ellipse(PW * .55, PH * .9, 260, 40, 0, 0, TAU); g.fill();
    const vg = g.createLinearGradient(PW * .38, 0, PW * .66, 0); vg.addColorStop(0, '#c9a25e'); vg.addColorStop(.4, '#f6e2b0'); vg.addColorStop(1, '#8e6a2f');
    g.fillStyle = vg; g.beginPath(); g.moveTo(PW * .4, PH * .62); g.quadraticCurveTo(PW * .33, PH * .78, PW * .42, PH * .9); g.lineTo(PW * .64, PH * .9); g.quadraticCurveTo(PW * .73, PH * .78, PW * .66, PH * .62); g.closePath(); g.fill();
    const peony = (x, y, R, c1, c2) => {
      for (let L = 0; L < 5; L++) {
        const rr = R * (1 - L * .17), n = 9 - L;
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + L * .5 + r() * .3;
          const px = x + Math.cos(a) * rr * .45, py = y + Math.sin(a) * rr * .4;
          const pg = g.createRadialGradient(x, y, 0, px, py, rr * .6);
          pg.addColorStop(0, c2); pg.addColorStop(1, c1);
          g.fillStyle = pg; g.beginPath(); g.ellipse(px, py, rr * .5, rr * .38, a, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(160,70,90,.15)'; g.lineWidth = 2; g.stroke();
        }
      }
    };
    g.fillStyle = '#9fae86'; for (let i = 0; i < 6; i++) { g.save(); g.translate(PW * .53, PH * .6); g.rotate(-1.2 + i * .5); g.beginPath(); g.ellipse(0, -110, 30, 90, 0, 0, TAU); g.fill(); g.restore(); }
    peony(PW * .36, PH * .48, 170, '#f3bccb', '#c9667f');
    peony(PW * .68, PH * .45, 150, '#fbe6e6', '#e8a6b4');
    peony(PW * .52, PH * .3, 140, '#efa9ba', '#b8506c');
  },
  // 10 — first birthday cake
  (g, r) => {
    const s = g.createLinearGradient(0, 0, 0, PH); s.addColorStop(0, '#f6cfd6'); s.addColorStop(1, '#f2dfd5'); g.fillStyle = s; g.fillRect(0, 0, PW, PH);
    for (let i = 0; i < 5; i++) {
      const x = 90 + i * 135 + r() * 30, y = 140 + r() * 120, R = 58 + r() * 14;
      const col = i % 2 ? ['#d6ad62', '#fff0c8'] : ['#e693a8', '#ffe1e8'];
      g.strokeStyle = 'rgba(120,80,80,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + R * 1.2); g.quadraticCurveTo(x + 20, y + 260, PW * .5, PH * .45); g.stroke();
      const bg = g.createRadialGradient(x - R * .4, y - R * .5, 5, x, y, R * 1.3); bg.addColorStop(0, col[1]); bg.addColorStop(1, col[0]);
      g.fillStyle = bg; g.beginPath(); g.ellipse(x, y, R, R * 1.18, 0, 0, TAU); g.fill();
    }
    const cx = PW / 2;
    g.fillStyle = 'rgba(120,60,60,.15)'; g.beginPath(); g.ellipse(cx, PH * .87, 260, 36, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff8f2'; g.fillRect(cx - 230, PH * .68, 460, 190);
    g.fillStyle = '#f7dce3'; g.fillRect(cx - 160, PH * .55, 320, 125);
    g.fillStyle = '#ecaebd';
    for (const [y, w] of [[PH * .68, 230], [PH * .55, 160]]) { g.beginPath(); g.moveTo(cx - w, y); g.lineTo(cx + w, y); for (let x = cx + w; x >= cx - w; x -= 20) g.lineTo(x, y + 18 + ((x / 20) % 3 ? 10 : 34) * .8); g.closePath(); g.fill(); }
    g.fillStyle = '#d4a85a'; g.fillRect(cx - 16, PH * .43, 32, 105); g.font = 'bold 120px serif'; g.textAlign = 'center';
    const fl = g.createRadialGradient(cx, PH * .41, 2, cx, PH * .41, 80); fl.addColorStop(0, 'rgba(255,240,190,1)'); fl.addColorStop(.25, 'rgba(255,200,120,.6)'); fl.addColorStop(1, 'rgba(255,180,120,0)');
    g.fillStyle = fl; g.beginPath(); g.arc(cx, PH * .41, 80, 0, TAU); g.fill();
    g.fillStyle = '#fff3c9'; g.beginPath(); g.ellipse(cx, PH * .41, 9, 20, 0, 0, TAU); g.fill();
    for (let i = 0; i < 80; i++) { g.fillStyle = ['#d4a85a', '#e693a8', '#ffffff'][i % 3]; g.save(); g.translate(r() * PW, r() * PH); g.rotate(r() * 3); g.fillRect(-4, -2, 8, 4); g.restore(); }
  },
];

const PHOTOS = []; // {img, raw, holo}

function holoVersion(img) {
  const c = mkCanvas(PW / 2, PH / 2), g = c.getContext('2d');
  g.filter = 'grayscale(1) contrast(1.25) brightness(1.15)';
  g.drawImage(img, 0, 0, c.width, c.height);
  g.filter = 'none';
  g.globalCompositeOperation = 'multiply';
  const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#ffc1d1'); gr.addColorStop(1, '#f2c27f');
  g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = 'rgba(30,5,15,.22)';
  for (let y = 0; y < c.height; y += 4) g.fillRect(0, y, c.width, 1.5);
  return c;
}

async function buildPhotos() {
  for (let i = 0; i < PHOTO_GEN.length; i++) {
    let img = null;
    // optional real photo override: ./photos/01.jpg …
    try {
      const n = String(i + 1).padStart(2, '0');
      img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = `photos/${n}.jpg`; });
      const c = mkCanvas(PW, PH); drawCover(c.getContext('2d'), img, 0, 0, PW, PH); img = c;
    } catch (e) { img = null; }
    if (!img) {
      img = mkCanvas(PW, PH);
      const g = img.getContext('2d');
      PHOTO_GEN[i](g, rng(1000 + i * 77));
      finishPhoto(g, 9 + i);
    }
    PHOTOS.push({ img, holo: holoVersion(img) });
  }
}
