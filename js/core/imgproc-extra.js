/*
 * Prisma Studio — ajustes (estilo menu Imagem › Ajustes), filtros (menu Filtro)
 * e super-resolução progressiva. Também roda dentro do Worker.
 * Recebe o motor base (P) para reaproveitar desfoques, filtro guiado e Lanczos.
 */
function PrismaImgProcExtra(P) {
  'use strict';
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const make = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });
  const hex = h => { const v = parseInt(String(h || '#000000').slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const copy = img => { const o = make(img.w, img.h); o.d.set(img.d); return o; };
  // gerador pseudoaleatório determinístico (mesmo resultado na prévia e no final)
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6; }; };

  function lutMap(img, lr, lg, lb) {
    const o = make(img.w, img.h), d = img.d, od = o.d;
    for (let i = 0; i < d.length; i += 4) { od[i] = lr[d[i]]; od[i + 1] = lg[d[i + 1]]; od[i + 2] = lb[d[i + 2]]; od[i + 3] = d[i + 3]; }
    return o;
  }
  function rgb2hsl(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (d < 1e-6) return [0, 0, l];
    const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl2rgb(h, s, l) {
    if (s <= 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, H = ((h % 360) + 360) % 360 / 360;
    const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(H + 1 / 3), f(H), f(H - 1 / 3)];
  }
  function lumaArr(img) { const n = img.w * img.h, L = new Float32Array(n), d = img.d; for (let i = 0; i < n; i++) L[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255; return L; }
  function stats(img) {
    const h = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)], d = img.d; let n = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue; h[0][d[i]]++; h[1][d[i + 1]]++; h[2][d[i + 2]]++; h[3][Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])]++; n++; }
    const pct = (hh, q) => { let a = 0; for (let i = 0; i < 256; i++) { a += hh[i]; if (a >= n * q) return i; } return 255; };
    return { h, n, pct };
  }
  const stretchLut = (lo, hi) => { const l = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) l[i] = (i - lo) / Math.max(1, hi - lo) * 255; return l; };

  /* =================== AJUSTES =================== */
  const ADJ = {
    levels(img, p) {
      const mk = (ib, iw, g, ob, ow) => { const l = new Uint8ClampedArray(256); for (let i = 0; i < 256; i++) { const t = clamp01((i - ib) / Math.max(1, iw - ib)); l[i] = ob + Math.pow(t, 1 / Math.max(0.05, g)) * (ow - ob); } return l; };
      const id = new Uint8ClampedArray(256).map((_, i) => i);
      const m = mk(p.inBlack ?? 0, p.inWhite ?? 255, p.gamma ?? 1, p.outBlack ?? 0, p.outWhite ?? 255);
      const ch = p.channel || 'rgb';
      return lutMap(img, ch === 'rgb' || ch === 'r' ? m : id, ch === 'rgb' || ch === 'g' ? m : id, ch === 'rgb' || ch === 'b' ? m : id);
    },
    exposure(img, p) {
      const k = Math.pow(2, p.exposure || 0), off = p.offset || 0, g = p.gamma || 1, l = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) { const lin = Math.pow(i / 255, 2.2) * k + off; l[i] = Math.pow(clamp01(lin), 1 / 2.2 / g) * 255; }
      return lutMap(img, l, l, l);
    },
    brightnessContrast(img, p) {
      const b = (p.brightness || 0) / 100, c = (p.contrast || 0) / 100, l = new Uint8ClampedArray(256), f = c >= 0 ? 1 / Math.max(0.01, 1 - c * 0.99) : 1 + c;
      for (let i = 0; i < 256; i++) { let v = i / 255; v = b >= 0 ? v + (1 - v) * b * 0.6 * (1 - v) + b * 0.15 : v * (1 + b * 0.6); v = (v - 0.5) * f + 0.5; l[i] = clamp01(v) * 255; }
      return lutMap(img, l, l, l);
    },
    hueSat(img, p) {
      const o = make(img.w, img.h), d = img.d, od = o.d, dh = p.hue || 0, ds = (p.saturation || 0) / 100, dl = (p.lightness || 0) / 100;
      for (let i = 0; i < d.length; i += 4) {
        let [h, s, l] = rgb2hsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
        if (p.colorize) { h = p.colorHue || 0; s = (p.colorSat ?? 25) / 100; }
        else { h += dh; s = ds >= 0 ? s + (1 - s) * ds * s : s * (1 + ds); }
        l = dl >= 0 ? l + (1 - l) * dl : l * (1 + dl);
        const [r, g, b] = hsl2rgb(h, clamp01(s), clamp01(l));
        od[i] = r * 255; od[i + 1] = g * 255; od[i + 2] = b * 255; od[i + 3] = d[i + 3];
      }
      return o;
    },
    colorBalance(img, p) {
      // p.shadows/p.midtones/p.highlights = [ciano↔vermelho, magenta↔verde, amarelo↔azul] em −100..100
      const S = p.shadows || [0, 0, 0], M = p.midtones || [0, 0, 0], H = p.highlights || [0, 0, 0];
      const luts = [0, 1, 2].map(c => {
        const l = new Float32Array(256);
        for (let i = 0; i < 256; i++) {
          const v = i / 255, ws = clamp01(1 - v * 3.2) * 0.7 + clamp01(0.5 - v) * 0.3, wh = clamp01((v - 0.66) * 3.2) * 0.7 + clamp01(v - 0.5) * 0.3, wm = clamp01(1 - Math.abs(v - 0.5) * 2.2);
          l[i] = (S[c] * ws + M[c] * wm + H[c] * wh) / 100 * 0.35;
        }
        return l;
      });
      const o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], y0 = 0.299 * r + 0.587 * g + 0.114 * b;
        let nr = r / 255 + luts[0][r], ng = g / 255 + luts[1][g], nb = b / 255 + luts[2][b];
        if (p.preserveLum !== false) { const y1 = 0.299 * nr + 0.587 * ng + 0.114 * nb, k = y0 / 255 - y1; nr += k; ng += k; nb += k; }
        od[i] = nr * 255; od[i + 1] = ng * 255; od[i + 2] = nb * 255; od[i + 3] = d[i + 3];
      }
      return o;
    },
    blackWhite(img, p) {
      // Mistura P&B por faixas de cor (mesma ideia do ajuste “Preto e branco” do Photoshop)
      const W = { r: (p.reds ?? 40) / 100, y: (p.yellows ?? 60) / 100, g: (p.greens ?? 40) / 100, c: (p.cyans ?? 60) / 100, b: (p.blues ?? 20) / 100, m: (p.magentas ?? 80) / 100 };
      const tint = p.tint ? hex(p.tintColor || '#c8a070') : null, ts = (p.tintAmount ?? 30) / 100;
      const o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        let mx, md, mn, prim, sec;
        if (r >= g && g >= b) { mx = r; md = g; mn = b; prim = W.r; sec = W.y; }
        else if (r >= b && b >= g) { mx = r; md = b; mn = g; prim = W.r; sec = W.m; }
        else if (g >= r && r >= b) { mx = g; md = r; mn = b; prim = W.g; sec = W.y; }
        else if (g >= b && b >= r) { mx = g; md = b; mn = r; prim = W.g; sec = W.c; }
        else if (b >= r && r >= g) { mx = b; md = r; mn = g; prim = W.b; sec = W.m; }
        else { mx = b; md = g; mn = r; prim = W.b; sec = W.c; }
        let v = mn + (md - mn) * sec + (mx - md) * prim;
        v = clamp(v, 0, 255);
        if (tint) { const t = v / 255, k = ts * (1 - Math.abs(2 * t - 1)); od[i] = v + (tint[0] - 128) * k; od[i + 1] = v + (tint[1] - 128) * k; od[i + 2] = v + (tint[2] - 128) * k; }
        else od[i] = od[i + 1] = od[i + 2] = v;
        od[i + 3] = d[i + 3];
      }
      return o;
    },
    photoFilter(img, p) {
      const c = hex(p.color || '#ec8a00'), dens = (p.density ?? 25) / 100, o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2], y = 0.299 * r + 0.587 * g + 0.114 * b;
        let nr = r + (r * c[0] / 255 - r) * dens * 1.6, ng = g + (g * c[1] / 255 - g) * dens * 1.6, nb = b + (b * c[2] / 255 - b) * dens * 1.6;
        nr = nr * (1 - dens * 0.3) + c[0] * dens * 0.3; ng = ng * (1 - dens * 0.3) + c[1] * dens * 0.3; nb = nb * (1 - dens * 0.3) + c[2] * dens * 0.3;
        if (p.preserveLum !== false) { const y1 = 0.299 * nr + 0.587 * ng + 0.114 * nb, k = y - y1; nr += k; ng += k; nb += k; }
        od[i] = nr; od[i + 1] = ng; od[i + 2] = nb; od[i + 3] = d[i + 3];
      }
      return o;
    },
    channelMixer(img, p) {
      const R = p.red || [100, 0, 0], G = p.green || [0, 100, 0], B = p.blue || [0, 0, 100], mono = !!p.monochrome;
      const o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const nr = (r * R[0] + g * R[1] + b * R[2]) / 100 + (R[3] || 0) * 2.55;
        if (mono) { od[i] = od[i + 1] = od[i + 2] = nr; }
        else { od[i] = nr; od[i + 1] = (r * G[0] + g * G[1] + b * G[2]) / 100 + (G[3] || 0) * 2.55; od[i + 2] = (r * B[0] + g * B[1] + b * B[2]) / 100 + (B[3] || 0) * 2.55; }
        od[i + 3] = d[i + 3];
      }
      return o;
    },
    gradientMap(img, p) {
      const stops = (p.stops || ['#000000', '#ffffff']).map(hex), n = stops.length - 1, lut = [];
      for (let i = 0; i < 256; i++) {
        const t = (p.reverse ? 255 - i : i) / 255 * n, k = Math.min(n - 1, Math.floor(t)), f = t - k, a = stops[k], b = stops[k + 1];
        lut.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
      }
      const o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) { const c = lut[Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])]; od[i] = c[0]; od[i + 1] = c[1]; od[i + 2] = c[2]; od[i + 3] = d[i + 3]; }
      return o;
    },
    selectiveColor(img, p) {
      // ajusta C, M, Y, K dentro de uma faixa de cor (vermelhos, amarelos, verdes, cianos, azuis, magentas, brancos, neutros, pretos)
      const range = p.range || 'reds', c = (p.cyan || 0) / 100, m = (p.magenta || 0) / 100, y = (p.yellow || 0) / 100, k = (p.black || 0) / 100;
      const o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), md = r + g + b - mx - mn;
        let w = 0;
        if (range === 'reds') w = r === mx ? mx - md : 0; else if (range === 'yellows') w = b === mn ? md - mn : 0;
        else if (range === 'greens') w = g === mx ? mx - md : 0; else if (range === 'cyans') w = r === mn ? md - mn : 0;
        else if (range === 'blues') w = b === mx ? mx - md : 0; else if (range === 'magentas') w = g === mn ? md - mn : 0;
        else if (range === 'whites') w = clamp01((mn - 0.5) * 2); else if (range === 'blacks') w = clamp01((0.5 - mx) * 2);
        else w = 1 - Math.abs(mx - 0.5) - Math.abs(mn - 0.5);
        if (w <= 0) { od[i] = d[i]; od[i + 1] = d[i + 1]; od[i + 2] = d[i + 2]; od[i + 3] = d[i + 3]; continue; }
        const adj = (v, a) => clamp01(v - a * w * (a > 0 ? v : 1 - v) * (a > 0 ? 1 : -1) * (a > 0 ? 1 : 1));
        let nr = adj(r, c), ng = adj(g, m), nb = adj(b, y);
        nr = clamp01(nr - k * w * (k > 0 ? nr : nr - 1)); ng = clamp01(ng - k * w * (k > 0 ? ng : ng - 1)); nb = clamp01(nb - k * w * (k > 0 ? nb : nb - 1));
        od[i] = nr * 255; od[i + 1] = ng * 255; od[i + 2] = nb * 255; od[i + 3] = d[i + 3];
      }
      return o;
    },
    replaceColor(img, p) {
      const t = hex(p.target || '#ff0000'), fuzz = (p.fuzziness ?? 40) * 2.2, o = make(img.w, img.h), d = img.d, od = o.d;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.sqrt((d[i] - t[0]) ** 2 * 0.3 + (d[i + 1] - t[1]) ** 2 * 0.59 + (d[i + 2] - t[2]) ** 2 * 0.11), w = clamp01(1 - dist / Math.max(1, fuzz));
        let [h, s, l] = rgb2hsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
        h += (p.hue || 0) * w; s = clamp01(s * (1 + (p.saturation || 0) / 100 * w)); l = clamp01(l + (p.lightness || 0) / 100 * w * 0.5);
        const [r, g, b] = hsl2rgb(h, s, l);
        od[i] = r * 255; od[i + 1] = g * 255; od[i + 2] = b * 255; od[i + 3] = d[i + 3];
      }
      return o;
    },
    invert(img) { const l = new Uint8ClampedArray(256).map((_, i) => 255 - i); return lutMap(img, l, l, l); },
    desaturate(img) { return ADJ.hueSat(img, { saturation: -100 }); },
    threshold(img, p) { const t = p.level ?? 128, o = make(img.w, img.h), d = img.d; for (let i = 0; i < d.length; i += 4) { const v = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) >= t ? 255 : 0; o.d[i] = o.d[i + 1] = o.d[i + 2] = v; o.d[i + 3] = d[i + 3]; } return o; },
    posterize(img, p) { const lv = Math.max(2, p.levels || 4), st = 255 / (lv - 1), l = new Uint8ClampedArray(256).map((_, i) => Math.round(i / st) * st); return lutMap(img, l, l, l); },
    equalize(img) {
      const s = stats(img), cdf = new Float32Array(256); let a = 0;
      for (let i = 0; i < 256; i++) { a += s.h[3][i]; cdf[i] = a / Math.max(1, s.n); }
      const o = make(img.w, img.h), d = img.d;
      for (let i = 0; i < d.length; i += 4) {
        const y = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]), k = (cdf[y] * 255 + 0.5) / Math.max(1, y);
        o.d[i] = d[i] * k; o.d[i + 1] = d[i + 1] * k; o.d[i + 2] = d[i + 2] * k; o.d[i + 3] = d[i + 3];
      }
      return o;
    },
    autoTone(img) { const s = stats(img); return lutMap(img, stretchLut(s.pct(s.h[0], 0.001), s.pct(s.h[0], 0.999)), stretchLut(s.pct(s.h[1], 0.001), s.pct(s.h[1], 0.999)), stretchLut(s.pct(s.h[2], 0.001), s.pct(s.h[2], 0.999))); },
    autoContrast(img) { const s = stats(img), l = stretchLut(s.pct(s.h[3], 0.002), s.pct(s.h[3], 0.998)); return lutMap(img, l, l, l); },
    autoColor(img) {
      const d = img.d; let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 16) { const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; if (y > 30 && y < 230) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } }
      if (!n) return copy(img);
      const avg = (r + g + b) / 3 / n, kr = avg / (r / n), kg = avg / (g / n), kb = avg / (b / n);
      const mk = k => new Uint8ClampedArray(256).map((_, i) => i * k);
      return ADJ.autoContrast(lutMap(img, mk(kr), mk(kg), mk(kb)));
    },
    vibrance(img, p) { return P.develop(img, { vibrance: p.vibrance || 0, saturation: p.saturation || 0 }); },
    shadowsHighlights(img, p) { return P.develop(img, { shadows: p.shadows || 0, highlights: p.highlights || 0 }); }
  };

  /* =================== FILTROS =================== */
  function sampler(img) {
    const { w, h, d } = img;
    return (x, y, out, mode) => {
      if (mode === 'clamp') { x = clamp(x, 0, w - 1); y = clamp(y, 0, h - 1); }
      else if (mode === 'wrap') { x = ((x % w) + w) % w; y = ((y % h) + h) % h; }
      const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
      for (let c = 0; c < 4; c++) {
        const g = (xx, yy) => (xx < 0 || yy < 0 || xx >= w || yy >= h) ? (c === 3 ? 0 : 0) : d[(yy * w + xx) * 4 + c];
        const gx = (xx, yy) => g(clamp(xx, 0, w - 1), clamp(yy, 0, h - 1));
        const G = mode === 'transparent' ? g : gx;
        const a = G(x0, y0) + (G(x0 + 1, y0) - G(x0, y0)) * tx, b = G(x0, y0 + 1) + (G(x0 + 1, y0 + 1) - G(x0, y0 + 1)) * tx;
        out[c] = a + (b - a) * ty;
      }
      return out;
    };
  }
  // distorção genérica por mapeamento inverso: fn(x, y) -> [sx, sy]
  function warp(img, fn, mode, onProgress) {
    const { w, h } = img, o = make(w, h), s = sampler(img), px = [0, 0, 0, 0];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const [sx, sy] = fn(x + 0.5, y + 0.5);
        s(sx - 0.5, sy - 0.5, px, mode || 'clamp');
        const t = (y * w + x) * 4; o.d[t] = px[0]; o.d[t + 1] = px[1]; o.d[t + 2] = px[2]; o.d[t + 3] = px[3];
      }
      if (onProgress && y % 128 === 0) onProgress(y / h);
    }
    return o;
  }
  function channels(img) { const n = img.w * img.h, c = [0, 1, 2, 3].map(() => new Float32Array(n)); for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) c[k][i] = img.d[i * 4 + k]; return c; }
  function fromChannels(w, h, c) { const o = make(w, h); for (let i = 0; i < w * h; i++) for (let k = 0; k < 4; k++) o.d[i * 4 + k] = c[k][i]; return o; }
  function gaussImg(img, sigma) { const c = channels(img); return fromChannels(img.w, img.h, c.map(ch => gaussF(ch, img.w, img.h, sigma))); }
  // gaussiano por caixas (cópia local para não depender de internals)
  function boxF(src, w, h, r) {
    r = Math.max(0, Math.round(r)); if (!r) return Float32Array.from(src);
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), inv = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) { const row = y * w; let acc = src[row] * (r + 1); for (let x = 1; x <= r; x++) acc += src[row + Math.min(x, w - 1)]; for (let x = 0; x < w; x++) { tmp[row + x] = acc * inv; acc += src[row + Math.min(x + r + 1, w - 1)] - src[row + Math.max(x - r, 0)]; } }
    for (let x = 0; x < w; x++) { let acc = tmp[x] * (r + 1); for (let y = 1; y <= r; y++) acc += tmp[Math.min(y, h - 1) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = acc * inv; acc += tmp[Math.min(y + r + 1, h - 1) * w + x] - tmp[Math.max(y - r, 0) * w + x]; } }
    return out;
  }
  function gaussF(src, w, h, sigma) {
    if (sigma < 0.3) return Float32Array.from(src);
    const wI = Math.sqrt(12 * sigma * sigma / 3 + 1); let wl = Math.floor(wI); if (wl % 2 === 0) wl--;
    const wu = wl + 2, m = Math.round((12 * sigma * sigma - 3 * wl * wl - 12 * wl - 9) / (-4 * wl - 4));
    let o = src; for (let i = 0; i < 3; i++) o = boxF(o, w, h, ((i < m ? wl : wu) - 1) / 2); return o;
  }
  function guidedF(I, p, w, h, r, eps) {
    const n = w * h, II = new Float32Array(n), Ip = new Float32Array(n);
    for (let i = 0; i < n; i++) { II[i] = I[i] * I[i]; Ip[i] = I[i] * p[i]; }
    const mI = boxF(I, w, h, r), mp = boxF(p, w, h, r), mII = boxF(II, w, h, r), mIp = boxF(Ip, w, h, r), a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = mII[i] - mI[i] * mI[i], c = mIp[i] - mI[i] * mp[i]; a[i] = c / (v + eps); b[i] = mp[i] - a[i] * mI[i]; }
    const ma = boxF(a, w, h, r), mb = boxF(b, w, h, r), q = new Float32Array(n);
    for (let i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
    return q;
  }
  function sobel(L, w, h) {
    const G = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = (xx, yy) => L[clamp(yy, 0, h - 1) * w + clamp(xx, 0, w - 1)];
      const gx = -p(x - 1, y - 1) - 2 * p(x - 1, y) - p(x - 1, y + 1) + p(x + 1, y - 1) + 2 * p(x + 1, y) + p(x + 1, y + 1);
      const gy = -p(x - 1, y - 1) - 2 * p(x, y - 1) - p(x + 1, y - 1) + p(x - 1, y + 1) + 2 * p(x, y + 1) + p(x + 1, y + 1);
      G[y * w + x] = Math.hypot(gx, gy);
    }
    return G;
  }
  function seeds(w, h, cell, seed) {
    const r = rng(seed || 7), cols = Math.ceil(w / cell) + 1, rows = Math.ceil(h / cell) + 1, pts = new Float32Array(cols * rows * 2);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = (j * cols + i) * 2; pts[k] = (i + r()) * cell; pts[k + 1] = (j + r()) * cell; }
    return { cols, rows, pts };
  }

  const FX = {
    gaussian(img, p) { return gaussImg(img, Math.max(0.3, p.radius || 4)); },
    boxBlur(img, p) { const c = channels(img), r = Math.max(1, Math.round(p.radius || 4)); return fromChannels(img.w, img.h, c.map(ch => boxF(ch, img.w, img.h, r))); },
    motionBlur(img, p, prog) {
      const a = (p.angle || 0) * Math.PI / 180, dist = Math.max(1, p.distance || 20), n = Math.min(64, Math.max(4, Math.round(dist))), dx = Math.cos(a), dy = -Math.sin(a);
      const { w, h, d } = img, o = make(w, h), s = sampler(img), px = [0, 0, 0, 0];
      for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, al = 0;
        for (let k = 0; k < n; k++) { const t = (k / (n - 1) - 0.5) * dist; s(x + dx * t, y + dy * t, px, 'clamp'); r += px[0]; g += px[1]; b += px[2]; al += px[3]; }
        const i = (y * w + x) * 4; o.d[i] = r / n; o.d[i + 1] = g / n; o.d[i + 2] = b / n; o.d[i + 3] = al / n; }
        if (prog && y % 64 === 0) prog(y / h); }
      void d; return o;
    },
    radialBlur(img, p, prog) {
      const { w, h } = img, o = make(w, h), s = sampler(img), px = [0, 0, 0, 0], cx = (p.cx ?? 0.5) * w, cy = (p.cy ?? 0.5) * h, amt = (p.amount ?? 20) / 100, spin = p.mode === 'spin', n = 24;
      for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0, al = 0; const vx = x - cx, vy = y - cy;
        for (let k = 0; k < n; k++) {
          const t = (k / (n - 1) - 0.5);
          if (spin) { const ang = t * amt * 0.6, c = Math.cos(ang), sn = Math.sin(ang); s(cx + vx * c - vy * sn, cy + vx * sn + vy * c, px, 'clamp'); }
          else { const f = 1 + t * amt * 0.5; s(cx + vx * f, cy + vy * f, px, 'clamp'); }
          r += px[0]; g += px[1]; b += px[2]; al += px[3];
        }
        const i = (y * w + x) * 4; o.d[i] = r / n; o.d[i + 1] = g / n; o.d[i + 2] = b / n; o.d[i + 3] = al / n; }
        if (prog && y % 64 === 0) prog(y / h); }
      return o;
    },
    surfaceBlur(img, p) {
      const c = channels(img), r = Math.max(1, Math.round(p.radius || 5)), eps = Math.pow((p.threshold ?? 15) / 255, 2) * 2;
      const out = c.slice(0, 3).map(ch => { const f = Float32Array.from(ch, v => v / 255); return Float32Array.from(guidedF(f, f, img.w, img.h, r, eps), v => v * 255); });
      out.push(c[3]); return fromChannels(img.w, img.h, out);
    },
    median(img, p) {
      // filtro de mediana com histograma deslizante (Huang); com limiar = “Poeira e arranhões”
      const { w, h, d } = img, r = clamp(Math.round(p.radius || 2), 1, 12), th = p.threshold || 0, o = make(w, h);
      for (let c = 0; c < 3; c++) {
        for (let y = 0; y < h; y++) {
          const hist = new Uint16Array(256); let cnt = 0;
          for (let yy = y - r; yy <= y + r; yy++) for (let xx = -r; xx <= r; xx++) { hist[d[(clamp(yy, 0, h - 1) * w + clamp(xx, 0, w - 1)) * 4 + c]]++; cnt++; }
          for (let x = 0; x < w; x++) {
            let acc = 0, m = 0; const half = cnt / 2; for (m = 0; m < 256; m++) { acc += hist[m]; if (acc > half) break; }
            const i = (y * w + x) * 4, v = d[i + c];
            o.d[i + c] = Math.abs(v - m) > th ? m : v;
            if (x + 1 < w) for (let yy = y - r; yy <= y + r; yy++) { const ry = clamp(yy, 0, h - 1) * w; hist[d[(ry + clamp(x - r, 0, w - 1)) * 4 + c]]--; hist[d[(ry + clamp(x + r + 1, 0, w - 1)) * 4 + c]]++; }
          }
        }
      }
      for (let i = 3; i < d.length; i += 4) o.d[i] = d[i];
      return o;
    },
    highPass(img, p) { const b = gaussImg(img, Math.max(0.5, p.radius || 3)), o = make(img.w, img.h), d = img.d; for (let i = 0; i < d.length; i += 4) { for (let c = 0; c < 3; c++) o.d[i + c] = 128 + d[i + c] - b.d[i + c]; o.d[i + 3] = d[i + 3]; } return o; },
    unsharp(img, p) { return P.smartSharpen(img, p.amount ?? 100, p.radius ?? 1.5, p.threshold ?? 2); },
    addNoise(img, p) {
      const a = (p.amount ?? 12) / 100 * 255, mono = p.mono !== false, r = rng(p.seed || 11), o = copy(img), d = o.d;
      const gauss = () => { let s = 0; for (let k = 0; k < 4; k++) s += r(); return (s - 2) * 1.7; };
      for (let i = 0; i < d.length; i += 4) { if (mono) { const n = gauss() * a * 0.5; d[i] += n; d[i + 1] += n; d[i + 2] += n; } else { d[i] += gauss() * a * 0.5; d[i + 1] += gauss() * a * 0.5; d[i + 2] += gauss() * a * 0.5; } }
      return o;
    },
    crystallize(img, p) {
      const { w, h, d } = img, cell = Math.max(3, p.size || 18), S = seeds(w, h, cell, 3), o = make(w, h);
      const col = new Float32Array(S.cols * S.rows * 4);
      for (let k = 0; k < S.cols * S.rows; k++) { const sx = clamp(Math.round(S.pts[k * 2]), 0, w - 1), sy = clamp(Math.round(S.pts[k * 2 + 1]), 0, h - 1), j = (sy * w + sx) * 4; for (let c = 0; c < 4; c++) col[k * 4 + c] = d[j + c]; }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ci = Math.floor(x / cell), cj = Math.floor(y / cell); let best = 1e18, bk = 0;
        for (let j = cj - 1; j <= cj + 1; j++) for (let i = ci - 1; i <= ci + 1; i++) {
          if (i < 0 || j < 0 || i >= S.cols || j >= S.rows) continue; const k = j * S.cols + i, dx = S.pts[k * 2] - x, dy = S.pts[k * 2 + 1] - y, dd = dx * dx + dy * dy; if (dd < best) { best = dd; bk = k; }
        }
        const t = (y * w + x) * 4; for (let c = 0; c < 4; c++) o.d[t + c] = col[bk * 4 + c];
      }
      return o;
    },
    pointillize(img, p) {
      const { w, h, d } = img, cell = Math.max(3, p.size || 10), S = seeds(w, h, cell, 5), bg = hex(p.background || '#ffffff'), o = make(w, h), rad = cell * 0.62;
      for (let i = 0; i < w * h; i++) { o.d[i * 4] = bg[0]; o.d[i * 4 + 1] = bg[1]; o.d[i * 4 + 2] = bg[2]; o.d[i * 4 + 3] = d[i * 4 + 3]; }
      for (let k = 0; k < S.cols * S.rows; k++) {
        const sx = S.pts[k * 2], sy = S.pts[k * 2 + 1], j = (clamp(Math.round(sy), 0, h - 1) * w + clamp(Math.round(sx), 0, w - 1)) * 4;
        for (let y = Math.max(0, Math.floor(sy - rad)); y < Math.min(h, sy + rad); y++) for (let x = Math.max(0, Math.floor(sx - rad)); x < Math.min(w, sx + rad); x++) {
          const a = clamp01(rad - Math.hypot(x - sx, y - sy)); if (!a) continue; const t = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) o.d[t + c] += (d[j + c] - o.d[t + c]) * a;
        }
      }
      return o;
    },
    solarize(img) { const l = new Uint8ClampedArray(256).map((_, i) => i > 127 ? 255 - i : i); return lutMap(img, l, l, l); },
    sketch(img, p) {
      const { w, h, d } = img, L = lumaArr(img), inv = Float32Array.from(L, v => 1 - v), bl = gaussF(inv, w, h, Math.max(1, p.radius || 8));
      const o = make(w, h), color = !!p.color, dark = (p.darkness ?? 40) / 100;
      for (let i = 0; i < w * h; i++) {
        let v = clamp01(L[i] / Math.max(1e-3, 1 - bl[i])); v = Math.pow(v, 1 + dark * 3);
        if (color) { o.d[i * 4] = d[i * 4] * 0.35 * v + 255 * v * 0.65; o.d[i * 4 + 1] = d[i * 4 + 1] * 0.35 * v + 255 * v * 0.65; o.d[i * 4 + 2] = d[i * 4 + 2] * 0.35 * v + 255 * v * 0.65; }
        else o.d[i * 4] = o.d[i * 4 + 1] = o.d[i * 4 + 2] = v * 255;
        o.d[i * 4 + 3] = d[i * 4 + 3];
      }
      return o;
    },
    cartoon(img, p) {
      let s = img; for (let k = 0; k < 3; k++) s = FX.surfaceBlur(s, { radius: Math.max(2, (p.smooth || 6)), threshold: 25 });
      s = ADJ.posterize(s, { levels: p.levels || 6 });
      const L = lumaArr(img), E = sobel(gaussF(L, img.w, img.h, 1), img.w, img.h), th = (p.edges ?? 50) / 100 * 0.6 + 0.15, o = copy(s);
      for (let i = 0; i < img.w * img.h; i++) { const e = clamp01((E[i] - th * 0.5) / (th * 0.5)); for (let c = 0; c < 3; c++) o.d[i * 4 + c] *= 1 - e * 0.9; }
      return o;
    },
    watercolor(img, p) {
      let s = P.filter(img, 'oil', 100, { radius: Math.max(2, p.radius || 5) });
      s = FX.surfaceBlur(s, { radius: 4, threshold: 30 });
      const L = lumaArr(s), E = sobel(L, img.w, img.h), r = rng(9), o = copy(s);
      for (let i = 0; i < img.w * img.h; i++) { const e = clamp01(E[i] * 1.5), paper = 0.94 + r() * 0.06; for (let c = 0; c < 3; c++) o.d[i * 4 + c] = (o.d[i * 4 + c] * (1 - e * 0.35)) * paper + 255 * (1 - paper) * 0.5; }
      return ADJ.hueSat(o, { saturation: 15, lightness: 6 });
    },
    glowingEdges(img, p) {
      const L = lumaArr(gaussImg(img, 1)), E = sobel(L, img.w, img.h), o = make(img.w, img.h), d = img.d, k = (p.brightness ?? 60) / 30;
      for (let i = 0; i < img.w * img.h; i++) { const e = clamp01(E[i] * k); for (let c = 0; c < 3; c++) o.d[i * 4 + c] = d[i * 4 + c] * e * 1.4; o.d[i * 4 + 3] = d[i * 4 + 3]; }
      return o;
    },
    chromatic(img, p) {
      const { w, h } = img, s = sampler(img), px = [0, 0, 0, 0], cx = w / 2, cy = h / 2, k = (p.amount ?? 6) / Math.max(w, h), o = make(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const vx = x - cx, vy = y - cy, t = (y * w + x) * 4;
        s(cx + vx * (1 + k), cy + vy * (1 + k), px, 'clamp'); o.d[t] = px[0];
        s(x, y, px, 'clamp'); o.d[t + 1] = px[1]; o.d[t + 3] = px[3];
        s(cx + vx * (1 - k), cy + vy * (1 - k), px, 'clamp'); o.d[t + 2] = px[2];
      }
      return o;
    },
    glitch(img, p) {
      const { w, h, d } = img, r = rng(p.seed || 3), o = copy(img), amt = (p.amount ?? 40) / 100, sh = Math.round((p.shift ?? 8) * Math.max(1, w / 800));
      let y = 0;
      while (y < h) {
        const bh = Math.max(2, Math.round(r() * h * 0.06)), off = r() < amt ? Math.round((r() - 0.5) * w * 0.15 * amt) : 0;
        for (let yy = y; yy < Math.min(h, y + bh); yy++) for (let x = 0; x < w; x++) {
          const t = (yy * w + x) * 4, sx = clamp(x - off, 0, w - 1), sr = clamp(x - off + sh, 0, w - 1), sb = clamp(x - off - sh, 0, w - 1);
          o.d[t] = d[(yy * w + sr) * 4]; o.d[t + 1] = d[(yy * w + sx) * 4 + 1]; o.d[t + 2] = d[(yy * w + sb) * 4 + 2];
        }
        y += bh;
      }
      return o;
    },
    tiltShift(img, p) {
      const { w, h, d } = img, bl = gaussImg(img, Math.max(1, (p.blur ?? 8) * Math.max(1, Math.min(w, h) / 800))), o = make(w, h);
      const fy = (p.focus ?? 50) / 100 * h, band = (p.size ?? 20) / 100 * h / 2, fall = Math.max(1, (p.transition ?? 25) / 100 * h);
      for (let y = 0; y < h; y++) { const t = clamp01((Math.abs(y - fy) - band) / fall); for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; for (let c = 0; c < 4; c++) o.d[i + c] = d[i + c] + (bl.d[i + c] - d[i + c]) * t; } }
      return p.saturate === false ? o : ADJ.hueSat(o, { saturation: 18 });
    },
    colorHalftone(img, p) {
      const { w, h, d } = img, cell = Math.max(3, p.size || 8), o = make(w, h);
      const C = new Float32Array(w * h), M = new Float32Array(w * h), Y = new Float32Array(w * h), K = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) { const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255, k = 1 - Math.max(r, g, b); K[i] = k; const ik = 1 - k || 1; C[i] = (1 - r - k) / ik; M[i] = (1 - g - k) / ik; Y[i] = (1 - b - k) / ik; }
      const chans = [[C, 15, [0, 174, 239]], [M, 75, [236, 0, 140]], [Y, 0, [255, 242, 0]], [K, 45, [20, 20, 20]]].map(([ch, ang, ink]) => [boxF(ch, w, h, Math.floor(cell / 2)), ang * Math.PI / 180, ink]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let r = 255, g = 255, b = 255;
        for (const [A, a, ink] of chans) {
          const ca = Math.cos(a), sa = Math.sin(a), u = x * ca + y * sa, v = -x * sa + y * ca;
          const cu = (Math.floor(u / cell) + 0.5) * cell, cv = (Math.floor(v / cell) + 0.5) * cell;
          const sx = clamp(Math.round(cu * ca - cv * sa), 0, w - 1), sy = clamp(Math.round(cu * sa + cv * ca), 0, h - 1);
          const rad = cell * 0.5 * Math.SQRT2 * Math.sqrt(clamp01(A[sy * w + sx])), cov = clamp01(rad - Math.hypot(u - cu, v - cv) + 0.5);
          r *= 1 - cov * (1 - ink[0] / 255); g *= 1 - cov * (1 - ink[1] / 255); b *= 1 - cov * (1 - ink[2] / 255);
        }
        const t = (y * w + x) * 4; o.d[t] = r; o.d[t + 1] = g; o.d[t + 2] = b; o.d[t + 3] = d[t + 3];
      }
      return o;
    },
    vignette(img, p) { return P.develop(img, { vignette: p.amount ?? -40 }); },
    filmGrain(img, p) { return P.develop(img, { grain: p.amount ?? 40 }); },
    // distorções
    twirl(img, p, prog) {
      const { w, h } = img, cx = w / 2, cy = h / 2, R = (p.radius ?? 80) / 100 * Math.min(w, h) / 2, A = (p.angle ?? 120) * Math.PI / 180;
      return warp(img, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R) return [x, y]; const t = 1 - r / R, a = A * t * t, c = Math.cos(a), s = Math.sin(a); return [cx + dx * c - dy * s, cy + dx * s + dy * c]; }, 'clamp', prog);
    },
    pinch(img, p, prog) {
      const { w, h } = img, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 * (p.radius ?? 90) / 100, k = (p.amount ?? 50) / 100;
      return warp(img, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy); if (r >= R || r === 0) return [x, y]; const t = r / R, f = Math.pow(t, k >= 0 ? 1 + k : 1 / (1 - k)) / t; return [cx + dx * f, cy + dy * f]; }, 'clamp', prog);
    },
    spherize(img, p, prog) {
      const { w, h } = img, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2, k = (p.amount ?? 60) / 100;
      return warp(img, (x, y) => { const dx = (x - cx) / R, dy = (y - cy) / R, r = Math.hypot(dx, dy); if (r >= 1 || r === 0) return [x, y]; const nr = (1 - k) * r + k * Math.asin(r) / (Math.PI / 2), f = nr / r; return [cx + dx * f * R, cy + dy * f * R]; }, 'clamp', prog);
    },
    wave(img, p, prog) {
      const amp = (p.amplitude ?? 12) * Math.max(1, img.w / 1000), len = Math.max(4, (p.wavelength ?? 120) * Math.max(1, img.w / 1000)), dir = p.direction || 'both';
      return warp(img, (x, y) => [x + (dir !== 'vertical' ? amp * Math.sin(2 * Math.PI * y / len) : 0), y + (dir !== 'horizontal' ? amp * Math.sin(2 * Math.PI * x / len) : 0)], 'clamp', prog);
    },
    ripple(img, p, prog) {
      const { w, h } = img, cx = w / 2, cy = h / 2, amp = (p.amplitude ?? 10) * Math.max(1, w / 1000), len = Math.max(4, (p.wavelength ?? 60) * Math.max(1, w / 1000));
      return warp(img, (x, y) => { const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) || 1, s = amp * Math.sin(2 * Math.PI * r / len); return [x + dx / r * s, y + dy / r * s]; }, 'clamp', prog);
    },
    polar(img, p, prog) {
      const { w, h } = img, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2;
      if (p.mode === 'toRect') return warp(img, (x, y) => { const a = x / w * 2 * Math.PI - Math.PI / 2, r = (1 - y / h) * R; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }, 'clamp', prog);
      return warp(img, (x, y) => { const dx = x - cx, dy = y - cy; let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += 2 * Math.PI; return [a / (2 * Math.PI) * w, (1 - Math.hypot(dx, dy) / R) * h]; }, 'clamp', prog);
    },
    lensCorrect(img, p, prog) {
      // positivo corrige barril (grande-angular), negativo corrige almofada
      const { w, h } = img, cx = w / 2, cy = h / 2, R = Math.hypot(cx, cy), k = (p.amount ?? 0) / 100 * 0.35, z = 1 + (p.zoom ?? 0) / 100;
      return warp(img, (x, y) => { const dx = (x - cx) / R, dy = (y - cy) / R, r2 = dx * dx + dy * dy, f = (1 + k * r2) / z; return [cx + dx * f * R, cy + dy * f * R]; }, 'transparent', prog);
    },
    offset(img, p) {
      const { w, h } = img, ox = Math.round((p.x ?? 50) / 100 * w), oy = Math.round((p.y ?? 50) / 100 * h);
      return warp(img, (x, y) => [x - ox, y - oy], 'wrap');
    }
  };

  /* =================== SUPER-RESOLUÇÃO =================== */
  // Ampliação 2× com Lanczos + anti-halo (limita ao mín/máx dos vizinhos de origem)
  function up2(img) {
    const { w, h, d } = img, o = P.resize(img, w * 2, h * 2), od = o.d, W = w * 2;
    for (let y = 0; y < h * 2; y++) {
      const sy = Math.min(h - 2, Math.max(0, Math.floor((y + 0.5) / 2 - 0.5)));
      for (let x = 0; x < W; x++) {
        const sx = Math.min(w - 2, Math.max(0, Math.floor((x + 0.5) / 2 - 0.5))), t = (y * W + x) * 4;
        const a = (sy * w + sx) * 4, b = a + 4, c = a + w * 4, e = c + 4;
        for (let k = 0; k < 4; k++) {
          const mn = Math.min(d[a + k], d[b + k], d[c + k], d[e + k]), mx = Math.max(d[a + k], d[b + k], d[c + k], d[e + k]);
          // anti-halo suave: permite ultrapassar só um pouco
          const v = od[t + k], lo = mn - (mx - mn) * 0.08, hi = mx + (mx - mn) * 0.08;
          od[t + k] = v < lo ? lo : v > hi ? hi : v;
        }
      }
    }
    return o;
  }
  // Filtro de choque (Osher–Rudin) na luminância: afia bordas sem halos
  function shock(img, iters, dt) {
    const { w, h } = img, n = w * h, d = img.d;
    let L = lumaArr(img); const L0 = Float32Array.from(L);
    for (let it = 0; it < iters; it++) {
      const S = gaussF(L, w, h, 1.0), N = new Float32Array(n);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, xm = x > 0 ? i - 1 : i, xp = x < w - 1 ? i + 1 : i, ym = y > 0 ? i - w : i, yp = y < h - 1 ? i + w : i;
        const sx = (S[xp] - S[xm]) / 2, sy = (S[yp] - S[ym]) / 2, sxx = S[xp] - 2 * S[i] + S[xm], syy = S[yp] - 2 * S[i] + S[ym];
        const sxy = ((x < w - 1 && y < h - 1 ? S[yp + 1] : S[i]) - (x > 0 && y < h - 1 ? S[yp - 1] : S[i]) - (x < w - 1 && y > 0 ? S[ym + 1] : S[i]) + (x > 0 && y > 0 ? S[ym - 1] : S[i])) / 4;
        const lap = sxx * sx * sx + 2 * sxy * sx * sy + syy * sy * sy;
        const gx = (L[xp] - L[xm]) / 2, gy = (L[yp] - L[ym]) / 2, g = Math.hypot(gx, gy);
        N[i] = L[i] - dt * Math.sign(lap) * g;
      }
      L = N;
    }
    const o = copy(img);
    for (let i = 0; i < n; i++) { const dl = (L[i] - L0[i]) * 255; o.d[i * 4] = d[i * 4] + dl; o.d[i * 4 + 1] = d[i * 4 + 1] + dl; o.d[i * 4 + 2] = d[i * 4 + 2] + dl; }
    return o;
  }
  function superResolve(img, outW, outH, strength, onProgress) {
    outW = Math.max(1, Math.round(outW)); outH = Math.max(1, Math.round(outH));
    const s = clamp((strength ?? 60) / 100, 0, 1);
    let cur = img;
    // limpeza leve antes de ampliar: ampliar ruído o deixa mais visível
    if (s > 0) cur = P.develop(cur, { denoise: 12 * s, colorDenoise: 30 * s });
    const steps = []; { let w = cur.w; while (w * 2 <= outW * 1.15) { steps.push(1); w *= 2; } }
    steps.forEach((_, i) => {
      cur = up2(cur);
      if (s > 0) cur = shock(cur, 2, 0.12 + 0.18 * s);
      if (onProgress) onProgress((i + 1) / (steps.length + 1) * 0.9);
    });
    cur = P.resize(cur, outW, outH);
    if (s > 0) cur = P.enhanceDetail(cur, 25 + 35 * s, 1);
    if (onProgress) onProgress(1);
    return cur;
  }

  /* =================== MÁSCARAS (seleção e balde) =================== */
  // Máscara de cor (varinha mágica / balde / gama de cores). Retorna Uint8 0..255.
  function floodMask(img, sx, sy, tolerance, contiguous, antialias) {
    const { w, h, d } = img, n = w * h, m = new Uint8ClampedArray(n);
    sx = clamp(Math.round(sx), 0, w - 1); sy = clamp(Math.round(sy), 0, h - 1);
    const s = (sy * w + sx) * 4, r0 = d[s], g0 = d[s + 1], b0 = d[s + 2], a0 = d[s + 3], tol = (tolerance ?? 32) * 2.2;
    const dist = i => { const j = i * 4; return Math.max(Math.abs(d[j] - r0), Math.abs(d[j + 1] - g0), Math.abs(d[j + 2] - b0), Math.abs(d[j + 3] - a0)); };
    if (contiguous !== false) {
      const st = new Int32Array(n), seen = new Uint8Array(n); let top = 0; st[top++] = sy * w + sx; seen[sy * w + sx] = 1;
      while (top) {
        const i = st[--top]; if (dist(i) > tol) continue; m[i] = 255;
        const x = i % w;
        if (x > 0 && !seen[i - 1]) { seen[i - 1] = 1; st[top++] = i - 1; }
        if (x < w - 1 && !seen[i + 1]) { seen[i + 1] = 1; st[top++] = i + 1; }
        if (i >= w && !seen[i - w]) { seen[i - w] = 1; st[top++] = i - w; }
        if (i < n - w && !seen[i + w]) { seen[i + w] = 1; st[top++] = i + w; }
      }
    } else for (let i = 0; i < n; i++) if (dist(i) <= tol) m[i] = 255;
    if (antialias !== false) { const b = boxF(Float32Array.from(m), w, h, 1); for (let i = 0; i < n; i++) m[i] = Math.max(m[i] * 0.75, b[i]); }
    return { w, h, m };
  }
  function featherMask(mask, w, h, r) { const f = Float32Array.from(mask), b = gaussF(f, w, h, r); return Uint8ClampedArray.from(b); }
  function growMask(mask, w, h, r) {
    // expandir (r>0) / contrair (r<0) via distância aproximada com caixas repetidas
    const inv = r < 0, rr = Math.abs(Math.round(r)); let f = Float32Array.from(mask, v => inv ? 255 - v : v);
    f = boxF(f, w, h, rr); const out = new Uint8ClampedArray(w * h);
    for (let i = 0; i < w * h; i++) { const v = f[i] > 2 ? 255 : 0; out[i] = inv ? 255 - v : v; }
    return out;
  }
  function redEye(img, cx, cy, radius, strength) {
    const o = copy(img), { w, h } = img, r = Math.max(2, radius), k = (strength ?? 80) / 100;
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(h, cy + r); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(w, cx + r); x++) {
      const dd = Math.hypot(x - cx, y - cy) / r; if (dd >= 1) continue;
      const t = (y * w + x) * 4, R = o.d[t], G = o.d[t + 1], B = o.d[t + 2], redness = R - Math.max(G, B);
      if (redness > 20 && R > 60) { const f = clamp01(redness / 90) * k * (1 - Math.pow(dd, 4)), nr = (G + B) / 2 * 0.8; o.d[t] = R + (nr - R) * f; o.d[t + 1] = G * (1 - 0.15 * f); o.d[t + 2] = B * (1 - 0.15 * f); }
    }
    return o;
  }

  return { ADJ, FX, adjust: (img, name, p) => { if (!ADJ[name]) throw new Error('Ajuste desconhecido: ' + name); return ADJ[name](img, p || {}); },
    fx: (img, name, p, prog) => { if (FX[name]) return FX[name](img, p || {}, prog); return P.filter(img, name, p && p.__amount != null ? p.__amount : 100, p || {}); },
    superResolve, floodMask, featherMask, growMask, redEye };
}
window.PrismaImgExtra = PrismaImgProcExtra(window.PrismaImgProc);
