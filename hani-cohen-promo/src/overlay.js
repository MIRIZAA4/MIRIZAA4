import { clamp, ease, mulberry32 } from './util.js';

export const W = 1080, H = 1920;

const FONTS = {
  serif: (w, s) => `${w || 700} ${s}px "Frank Ruhl Libre"`,
  sans: (w, s) => `${w || 300} ${s}px "Heebo"`,
};

// Kinetic typography + screen effects drawn on top of the 3D frame.
export class Overlay {
  constructor(canvas) {
    this.c = canvas;
    this.c.width = W; this.c.height = H;
    this.g = canvas.getContext('2d');
    this.off = document.createElement('canvas');
    this.off.width = W; this.off.height = 700;
    this.og = this.off.getContext('2d');
    this.grain = [];
    const r = mulberry32(7);
    for (let k = 0; k < 6; k++) {
      const n = document.createElement('canvas');
      n.width = 540; n.height = 960;
      const ng = n.getContext('2d');
      const id = ng.createImageData(540, 960);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 128 + (r() - 0.5) * 255;
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
        id.data[i + 3] = 255;
      }
      ng.putImageData(id, 0, 0);
      this.grain.push(n);
    }
  }

  goldFill(g, y, size) {
    const gr = g.createLinearGradient(0, y - size * 0.75, 0, y + size * 0.35);
    gr.addColorStop(0, '#fff3cf');
    gr.addColorStop(0.42, '#ecc985');
    gr.addColorStop(0.7, '#c89a52');
    gr.addColorStop(1, '#f2d9a0');
    return gr;
  }

  fillFor(it, g, y) {
    if (it.color === 'gold') return this.goldFill(g, y, it.size);
    if (it.color === 'blush') return '#f9e3e8';
    if (it.color === 'white') return '#fffaf7';
    return it.color || '#fffaf7';
  }

  // draws one text item into the offscreen buffer, returns true if anything drawn
  item(t, it) {
    const { t0, t1 } = it;
    if (t < t0 - 0.01 || t > t1 + 0.01) return;
    const g = this.og;
    const size = it.size;
    const font = FONTS[it.font || 'serif'](it.weight, size);
    const lt = t - t0;
    const st = it.stagger ?? 0.045;
    const exitDur = it.exit ?? 0.45;
    const ex = clamp((t - (t1 - exitDur)) / exitDur);
    const oy = 350; // baseline inside offscreen buffer
    g.clearRect(0, 0, W, 700);
    g.save();
    g.font = font;
    g.textBaseline = 'alphabetic';
    const ls = it.letter || 0;
    const chars = [...it.text];
    const ltr = it.dir === 'ltr';
    const widths = chars.map((ch) => g.measureText(ch).width + ls);
    const total = widths.reduce((a, b) => a + b, 0) - ls;
    const cx = it.x ?? W / 2;
    const style = it.style || 'rise';

    if (style === 'rise' || style === 'type') {
      let x = ltr ? cx - total / 2 : cx + total / 2;
      chars.forEach((ch, i) => {
        const w = widths[i];
        if (!ltr) x -= w;
        const k = clamp((lt - i * st) / (style === 'type' ? 0.08 : 0.7));
        const ke = ease.outExpo(k);
        const e = clamp((t - (t1 - exitDur) - i * st * 0.4) / exitDur);
        const a = clamp((lt - i * st) / 0.3) * (1 - ease.in(e));
        if (a > 0.003) {
          const dy = style === 'type' ? 0 : (1 - ke) * size * 0.55 - ease.in(e) * size * 0.35;
          const blur = style === 'type' ? 0 : (1 - ke) * 12 + e * 8;
          g.globalAlpha = a;
          g.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
          g.fillStyle = this.fillFor(it, g, oy);
          g.fillText(ch, x, oy + dy);
        }
        if (ltr) x += w;
      });
    } else if (style === 'punch') {
      const k = clamp(lt / 0.45);
      const s = 1 + 0.55 * (1 - ease.outExpo(k)) + ease.in(ex) * 0.12;
      const a = clamp(lt / 0.12) * (1 - ex);
      const blur = (1 - ease.outExpo(k)) * 16 + ex * 10;
      g.globalAlpha = a;
      g.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : 'none';
      g.translate(cx, oy - size * 0.35);
      g.scale(s, s);
      g.fillStyle = this.fillFor(it, g, size * 0.35);
      g.textAlign = 'center';
      g.direction = ltr ? 'ltr' : 'rtl';
      g.fillText(it.text, 0, size * 0.35);
    } else if (style === 'track') {
      const k = ease.outExpo(clamp(lt / 1.4));
      const extra = (1 - k) * size * 0.5;
      const a = clamp(lt / 0.5) * (1 - ex);
      g.globalAlpha = a;
      g.filter = (1 - k) * 8 + ex * 8 > 0.4 ? `blur(${((1 - k) * 8 + ex * 8).toFixed(1)}px)` : 'none';
      const tw = total + extra * (chars.length - 1);
      let x = ltr ? cx - tw / 2 : cx + tw / 2;
      g.fillStyle = this.fillFor(it, g, oy);
      chars.forEach((ch, i) => {
        const w = widths[i] + extra;
        if (!ltr) x -= widths[i];
        g.fillText(ch, x, oy);
        if (!ltr) x -= extra; else x += w;
      });
    } else if (style === 'fade') {
      const a = clamp(lt / 0.5) * (1 - ex);
      g.globalAlpha = a;
      g.textAlign = 'center';
      g.direction = ltr ? 'ltr' : 'rtl';
      g.fillStyle = this.fillFor(it, g, oy);
      g.fillText(it.text, cx, oy + (1 - ease.out(clamp(lt / 0.6))) * 20);
    }
    g.restore();

    // shine sweep across the glyphs
    if (it.shine) {
      const sp = (t - (it.shineAt ?? t0 + 0.5)) / 0.9;
      if (sp > 0 && sp < 1) {
        g.save();
        g.globalCompositeOperation = 'source-atop';
        const sx = cx + total * 0.8 - sp * total * 1.6;
        const gr = g.createLinearGradient(sx - 120, 0, sx + 120, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, 'rgba(255,253,240,0.95)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(0, 0, W, 700);
        g.restore();
      }
    }
    const main = this.g;
    main.save();
    main.shadowColor = it.shadow ?? 'rgba(25,4,14,0.65)';
    main.shadowBlur = 28;
    main.shadowOffsetY = 4;
    main.drawImage(this.off, 0, it.y - oy);
    main.restore();
  }

  hairline(t, it) {
    if (t < it.t0 || t > it.t1) return;
    const k = ease.inOut(clamp((t - it.t0) / (it.dur || 0.8)));
    const ex = clamp((t - (it.t1 - 0.4)) / 0.4);
    const g = this.g;
    g.save();
    g.globalAlpha = 1 - ex;
    const half = (it.w / 2) * k;
    const gr = g.createLinearGradient(W / 2 - half, 0, W / 2 + half, 0);
    gr.addColorStop(0, 'rgba(236,201,133,0)');
    gr.addColorStop(0.5, 'rgba(255,236,190,1)');
    gr.addColorStop(1, 'rgba(236,201,133,0)');
    g.fillStyle = gr;
    g.fillRect(W / 2 - half, it.y - 1.5, half * 2, 3);
    g.fillStyle = '#ffeec4';
    if (k > 0.98) {
      g.beginPath(); g.arc(W / 2, it.y, 5, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  chapter(t, it) {
    if (t < it.t0 || t > it.t1) return;
    const lt = t - it.t0;
    const a = clamp(lt / 0.4) * (1 - clamp((t - (it.t1 - 0.35)) / 0.35));
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    const x = W - 90, y = 250;
    const k = ease.outExpo(clamp(lt / 0.8));
    g.strokeStyle = 'rgba(236,201,133,0.9)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, y + 18); g.lineTo(x - 70 * k, y + 18); g.stroke();
    g.font = '200 30px Heebo';
    g.fillStyle = '#f3d79e';
    g.textAlign = 'right';
    g.letterSpacing = '6px';
    g.fillText(it.num, x, y - 6);
    g.letterSpacing = '2px';
    g.font = '400 34px Heebo';
    g.direction = 'rtl';
    g.fillStyle = '#fbe6ea';
    g.fillText(it.text, x - 90 * k - 10, y + 30);
    // step dots
    for (let i = 0; i < 6; i++) {
      const on = i < it.step;
      g.fillStyle = on ? '#ecc985' : 'rgba(249,227,232,0.35)';
      g.beginPath(); g.arc(x - i * 22, y + 70, i === it.step - 1 ? 6 : 4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  pill(t, it) {
    if (t < it.t0) return;
    const lt = t - it.t0;
    const k = ease.outBack(clamp(lt / 0.6));
    const g = this.g;
    const w = it.w * (0.6 + 0.4 * k), h = it.h;
    const x = W / 2 - w / 2, y = it.y - h / 2;
    const pulse = 1 + Math.max(0, Math.sin((t - it.t0) * Math.PI * 1.666)) * 0.025;
    g.save();
    g.globalAlpha = clamp(lt / 0.3);
    g.translate(W / 2, it.y); g.scale(pulse, pulse); g.translate(-W / 2, -it.y);
    g.shadowColor = 'rgba(255,200,140,0.55)';
    g.shadowBlur = 40;
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, '#f6dca2'); gr.addColorStop(0.5, '#d9ac62'); gr.addColorStop(1, '#f3d79c');
    g.fillStyle = gr;
    g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.fill();
    g.shadowBlur = 0;
    // moving shine
    const sp = ((t - it.t0) % 2.4) / 1.2;
    if (sp < 1) {
      g.save();
      g.beginPath(); g.roundRect(x, y, w, h, h / 2); g.clip();
      const sx = x - 100 + sp * (w + 200);
      const sg = g.createLinearGradient(sx - 60, 0, sx + 60, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg; g.fillRect(x, y, w, h);
      g.restore();
    }
    g.globalAlpha *= clamp((lt - 0.2) / 0.3);
    g.fillStyle = '#3a1424';
    g.font = '700 58px "Frank Ruhl Libre"';
    g.textAlign = 'center';
    g.direction = 'rtl';
    g.textBaseline = 'middle';
    g.fillText(it.text, W / 2 + 24, it.y + 4);
    // arrow (points left = forward in RTL)
    g.strokeStyle = '#3a1424'; g.lineWidth = 4; g.lineCap = 'round';
    const ax = x + 70 - Math.sin(t * 5) * 6, ay = it.y + 2;
    g.beginPath(); g.moveTo(ax + 34, ay); g.lineTo(ax, ay); g.moveTo(ax + 14, ay - 14); g.lineTo(ax, ay); g.lineTo(ax + 14, ay + 14); g.stroke();
    g.restore();
  }

  draw(t, copy, fx) {
    const g = this.g;
    g.clearRect(0, 0, W, H);
    // vignette
    const v = g.createRadialGradient(W / 2, H * 0.47, W * 0.42, W / 2, H / 2, H * 0.62);
    v.addColorStop(0, 'rgba(14,3,8,0)');
    v.addColorStop(1, 'rgba(14,3,8,0.55)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);

    for (const it of copy) {
      if (it.kind === 'line') this.hairline(t, it);
      else if (it.kind === 'chapter') this.chapter(t, it);
      else if (it.kind === 'pill') this.pill(t, it);
      else this.item(t, it);
    }

    // flashes
    for (const f of fx.flashes) {
      const d = t - f.t;
      if (d < -(f.pre || 0) || d > f.dur) continue;
      const a = d < 0 ? ease.in(1 + d / f.pre) : Math.pow(1 - d / f.dur, 2.2);
      g.fillStyle = f.color;
      g.globalAlpha = a * f.amp;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
    }
    // film grain
    g.save();
    g.globalAlpha = 0.07;
    g.globalCompositeOperation = 'overlay';
    g.drawImage(this.grain[Math.floor(t * 30) % this.grain.length], 0, 0, W, H);
    g.restore();
  }
}
