/*
 * Prisma Studio — motor de processamento de imagem.
 * Tudo aqui é JavaScript puro, sem dependências: a mesma função-fábrica roda
 * na thread principal e dentro de um Web Worker criado a partir de um Blob
 * (o que funciona até abrindo o index.html direto do disco, via file://).
 *
 * Formato de imagem usado em todo o motor: { w, h, d: Uint8ClampedArray RGBA }.
 */
function PrismaImgProcFactory() {
  'use strict';

  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

  function makeImage(w, h) { return { w, h, d: new Uint8ClampedArray(w * h * 4) }; }

  /* ---------------- Canais em ponto flutuante ---------------- */
  function toFloat(img) {
    const n = img.w * img.h, d = img.d;
    const R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) { R[i] = d[j] / 255; G[i] = d[j + 1] / 255; B[i] = d[j + 2] / 255; }
    return { R, G, B };
  }
  function fromFloat(img, R, G, B) {
    const n = img.w * img.h, out = makeImage(img.w, img.h), o = out.d, s = img.d;
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      o[j] = R[i] * 255 + 0.5; o[j + 1] = G[i] * 255 + 0.5; o[j + 2] = B[i] * 255 + 0.5; o[j + 3] = s[j + 3];
    }
    return out;
  }
  function lumaOf(R, G, B) {
    const n = R.length, L = new Float32Array(n);
    for (let i = 0; i < n; i++) L[i] = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i];
    return L;
  }

  /* ---------------- Filtros de caixa / gaussiano (O(n)) ---------------- */
  function boxBlur(src, w, h, r) {
    r = Math.max(0, Math.round(r));
    if (r === 0) return Float32Array.from(src);
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    const inv = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let acc = src[row] * (r + 1);
      for (let x = 1; x <= r; x++) acc += src[row + Math.min(x, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc * inv;
        acc += src[row + Math.min(x + r + 1, w - 1)] - src[row + Math.max(x - r, 0)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = tmp[x] * (r + 1);
      for (let y = 1; y <= r; y++) acc += tmp[Math.min(y, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = acc * inv;
        acc += tmp[Math.min(y + r + 1, h - 1) * w + x] - tmp[Math.max(y - r, 0) * w + x];
      }
    }
    return out;
  }
  // Aproximação gaussiana com 3 passadas de caixa (Kovesi).
  function gauss(src, w, h, sigma) {
    if (sigma < 0.3) return Float32Array.from(src);
    const n = 3, wIdeal = Math.sqrt(12 * sigma * sigma / n + 1);
    let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
    let out = src;
    for (let i = 0; i < n; i++) out = boxBlur(out, w, h, ((i < m ? wl : wu) - 1) / 2);
    return out;
  }
  // Filtro guiado (He et al.) com guia I e entrada p — preserva bordas.
  function guided(I, p, w, h, r, eps) {
    const n = w * h, II = new Float32Array(n), Ip = new Float32Array(n);
    for (let i = 0; i < n; i++) { II[i] = I[i] * I[i]; Ip[i] = I[i] * p[i]; }
    const mI = boxBlur(I, w, h, r), mp = I === p ? mI : boxBlur(p, w, h, r);
    const mII = boxBlur(II, w, h, r), mIp = I === p ? mII : boxBlur(Ip, w, h, r);
    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const v = mII[i] - mI[i] * mI[i], c = mIp[i] - mI[i] * mp[i];
      a[i] = c / (v + eps); b[i] = mp[i] - a[i] * mI[i];
    }
    const ma = boxBlur(a, w, h, r), mb = boxBlur(b, w, h, r), q = new Float32Array(n);
    for (let i = 0; i < n; i++) q[i] = ma[i] * I[i] + mb[i];
    return q;
  }
  // Redimensiona um canal float (bilinear) — usado para trabalhar em escala reduzida.
  function resampleChannel(src, w, h, nw, nh) {
    const out = new Float32Array(nw * nh), sx = w / nw, sy = h / nh;
    for (let y = 0; y < nh; y++) {
      const fy = Math.min(h - 1, Math.max(0, (y + 0.5) * sy - 0.5)), y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < nw; x++) {
        const fx = Math.min(w - 1, Math.max(0, (x + 0.5) * sx - 0.5)), x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
        const a = src[y0 * w + x0] + (src[y0 * w + x1] - src[y0 * w + x0]) * tx;
        const b = src[y1 * w + x0] + (src[y1 * w + x1] - src[y1 * w + x0]) * tx;
        out[y * nw + x] = a + (b - a) * ty;
      }
    }
    return out;
  }

  /* ---------------- Curvas (spline monotônica de Fritsch–Carlson) ---------------- */
  function curveLUT(points, size) {
    size = size || 1024;
    const lut = new Float32Array(size);
    const pts = (points && points.length >= 2 ? points : [[0, 0], [1, 1]]).slice().sort((a, b) => a[0] - b[0]);
    const n = pts.length, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const dx = [], m = [], t = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { dx[i] = Math.max(1e-6, xs[i + 1] - xs[i]); m[i] = (ys[i + 1] - ys[i]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    for (let k = 0; k < size; k++) {
      const x = k / (size - 1);
      if (x <= xs[0]) { lut[k] = ys[0]; continue; }
      if (x >= xs[n - 1]) { lut[k] = ys[n - 1]; continue; }
      let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const h = dx[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
      lut[k] = clamp01((2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * t[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * t[i + 1]);
    }
    return lut;
  }
  function isIdentityCurve(p) { return !p || p.length < 2 || (p.length === 2 && p[0][0] === 0 && p[0][1] === 0 && p[1][0] === 1 && p[1][1] === 1); }

  /* ---------------- Revelação não destrutiva ---------------- */
  const HSL_CENTERS = [0, 30, 60, 120, 180, 225, 275, 320];
  function neutralParams() {
    return {
      exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
      temperature: 0, tint: 0, vibrance: 0, saturation: 0, clarity: 0, dehaze: 0,
      fade: 0, vignette: 0, grain: 0, sharpen: 0, sharpenRadius: 1, denoise: 0, colorDenoise: 0,
      hslHue: [0, 0, 0, 0, 0, 0, 0, 0], hslSat: [0, 0, 0, 0, 0, 0, 0, 0], hslLum: [0, 0, 0, 0, 0, 0, 0, 0],
      curves: { rgb: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] }
    };
  }
  function isNeutral(p) {
    if (!p) return true;
    const n = neutralParams();
    for (const k of Object.keys(n)) {
      if (k === 'curves') { for (const c of ['rgb', 'r', 'g', 'b']) if (!isIdentityCurve(p.curves && p.curves[c])) return false; continue; }
      if (Array.isArray(n[k])) { if ((p[k] || []).some(v => v)) return false; continue; }
      if (k === 'sharpenRadius') continue;
      if ((p[k] || 0) !== n[k]) return false;
    }
    return true;
  }

  // scale: razão (pixels desta imagem)/(pixels da imagem final). Mantém os raios
  // dos efeitos locais coerentes entre a prévia reduzida e a exportação em resolução total.
  function develop(img, p, scale) {
    p = Object.assign(neutralParams(), p || {});
    scale = scale || 1;
    const w = img.w, h = img.h, n = w * h;
    const { R, G, B } = toFloat(img);
    const minDim = Math.min(w, h);

    // 1) Redução de ruído (luminância por filtro guiado, cor por desfoque em YCbCr)
    if (p.denoise > 0 || p.colorDenoise > 0) {
      const Y = new Float32Array(n), Cb = new Float32Array(n), Cr = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const y = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i];
        Y[i] = y; Cb[i] = B[i] - y; Cr[i] = R[i] - y;
      }
      let Yd = Y, Cbd = Cb, Crd = Cr;
      if (p.denoise > 0) {
        const s = p.denoise / 100, r = Math.max(1, Math.round((1 + 3 * s) * scale));
        Yd = guided(Y, Y, w, h, r, 0.0004 + 0.012 * s * s);
        if (s > 0.6) Yd = guided(Yd, Yd, w, h, r, 0.0004 + 0.006 * s * s);
      }
      if (p.colorDenoise > 0) {
        const s = p.colorDenoise / 100, r = Math.max(1, Math.round((2 + 8 * s) * scale));
        Cbd = guided(Yd, Cb, w, h, r, 0.002 + 0.02 * s); Crd = guided(Yd, Cr, w, h, r, 0.002 + 0.02 * s);
      }
      for (let i = 0; i < n; i++) {
        const y = Yd[i], cb = Cbd[i], cr = Crd[i];
        R[i] = y + cr; B[i] = y + cb; G[i] = (y - 0.299 * R[i] - 0.114 * B[i]) / 0.587;
      }
    }

    // 2) Remoção de névoa (dark channel prior simplificado, trabalhando em escala reduzida)
    if (p.dehaze !== 0) {
      const amt = p.dehaze / 100;
      const f = Math.max(1, Math.round(minDim / 160)), sw = Math.max(1, Math.floor(w / f)), sh = Math.max(1, Math.floor(h / f));
      const dark = new Float32Array(sw * sh);
      let A = 0;
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        let mn = 1;
        for (let yy = y * f; yy < Math.min(h, (y + 1) * f); yy++) for (let xx = x * f; xx < Math.min(w, (x + 1) * f); xx++) {
          const i = yy * w + xx, v = Math.min(R[i], G[i], B[i]); if (v < mn) mn = v;
        }
        dark[y * sw + x] = mn;
      }
      const darkB = boxBlur(dark, sw, sh, 2);
      for (let i = 0; i < darkB.length; i++) if (darkB[i] > A) A = darkB[i];
      A = Math.max(0.6, Math.min(1, A));
      const darkFull = resampleChannel(darkB, sw, sh, w, h);
      const L = lumaOf(R, G, B);
      const t = guided(L, darkFull, w, h, Math.max(2, Math.round(minDim / 120)), 0.001);
      for (let i = 0; i < n; i++) {
        if (amt > 0) {
          const tt = Math.max(0.25, 1 - 0.95 * amt * (t[i] / A));
          R[i] = (R[i] - A) / tt + A; G[i] = (G[i] - A) / tt + A; B[i] = (B[i] - A) / tt + A;
        } else {
          const k = -amt * 0.6;
          R[i] = R[i] * (1 - k) + A * k; G[i] = G[i] * (1 - k) + A * k; B[i] = B[i] * (1 - k) + A * k;
        }
      }
    }

    // 3) Balanço de branco
    if (p.temperature || p.tint) {
      const t = p.temperature / 100, g = p.tint / 100;
      const gr = (1 + 0.25 * t) * (1 + 0.1 * g), gg = 1 - 0.2 * g, gb = (1 - 0.25 * t) * (1 + 0.1 * g);
      for (let i = 0; i < n; i++) { R[i] *= gr; G[i] *= gg; B[i] *= gb; }
    }

    // 4) Exposição (em luz linear)
    if (p.exposure) {
      const k = Math.pow(2, p.exposure);
      const toLin = v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      const toSrgb = v => v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      const LUTN = 4096, inLut = new Float32Array(LUTN + 1);
      for (let i = 0; i <= LUTN; i++) inLut[i] = toSrgb(Math.min(1, toLin(i / LUTN * 2) * k) );
      // Faixa coberta: 0..2 (permite valores acima de 1 vindos do balanço de branco)
      const map = v => { if (v <= 0) return 0; const x = Math.min(2, v) / 2 * LUTN, i0 = x | 0, tt = x - i0; return inLut[i0] + ((inLut[Math.min(LUTN, i0 + 1)] - inLut[i0]) * tt); };
      for (let i = 0; i < n; i++) { R[i] = map(R[i]); G[i] = map(G[i]); B[i] = map(B[i]); }
    }

    // 5) Realces e sombras locais (máscara a partir da luminância desfocada)
    if (p.highlights || p.shadows) {
      const L = lumaOf(R, G, B);
      const base = guided(L, L, w, h, Math.max(2, Math.round(minDim * 0.02)), 0.02);
      const sh = p.shadows / 100, hi = p.highlights / 100;
      for (let i = 0; i < n; i++) {
        const b = clamp01(base[i]), l = L[i];
        const ws = Math.pow(1 - smooth(0, 0.6, b), 2), wh = Math.pow(smooth(0.4, 1, b), 2);
        let nl = l + sh * ws * 0.45 * (sh > 0 ? (1 - l) : l) + hi * wh * 0.45 * (hi > 0 ? (1 - l) : l);
        nl = clamp01(nl);
        const ratio = Math.min(6, (nl + 0.004) / (l + 0.004));
        R[i] *= ratio; G[i] *= ratio; B[i] *= ratio;
      }
    }

    // 6) Brancos, pretos, contraste e desbotar (curva de tons por LUT)
    if (p.whites || p.blacks || p.contrast || p.fade) {
      const bp = -p.blacks / 100 * 0.15, wp = 1 - p.whites / 100 * 0.15, c = p.contrast / 100, fd = p.fade / 100;
      const N = 2048, lut = new Float32Array(N + 1);
      for (let k = 0; k <= N; k++) {
        let v = (k / N * 1.5 - bp) / (wp - bp);
        v = clamp01(v);
        if (c > 0) { const s = v < 0.5 ? 2 * v * v : 1 - 2 * (1 - v) * (1 - v); v = v + c * (s - v); }
        else if (c < 0) v = 0.5 + (v - 0.5) * (1 + c * 0.65);
        if (fd) v = fd * 0.12 + v * (1 - fd * 0.18);
        lut[k] = v;
      }
      const map = v => { if (v <= 0) return lut[0]; const x = Math.min(1.5, v) / 1.5 * N, i0 = x | 0; return lut[i0] + (lut[Math.min(N, i0 + 1)] - lut[i0]) * (x - i0); };
      for (let i = 0; i < n; i++) { R[i] = map(R[i]); G[i] = map(G[i]); B[i] = map(B[i]); }
    }

    // 7) Claridade (contraste local de meios-tons, base preservando bordas)
    if (p.clarity) {
      const L = lumaOf(R, G, B);
      const base = guided(L, L, w, h, Math.max(2, Math.round(minDim * 0.012)), 0.01);
      const k = p.clarity / 100 * 1.3;
      for (let i = 0; i < n; i++) {
        const l = L[i], mid = 1 - Math.pow(2 * clamp01(l) - 1, 2);
        const nl = clamp01(l + k * (l - base[i]) * (0.35 + 0.65 * mid));
        const ratio = Math.min(4, (nl + 0.004) / (l + 0.004));
        R[i] *= ratio; G[i] *= ratio; B[i] *= ratio;
      }
    }

    // 8) Saturação e vibração
    if (p.saturation || p.vibrance) {
      const s = 1 + p.saturation / 100, vb = p.vibrance / 100;
      for (let i = 0; i < n; i++) {
        const r = R[i], g = G[i], b = B[i], y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), cs = mx - mn;
        // Vibração protege tons de pele (laranjas) e cores já saturadas
        const skin = (r > g && g > b) ? 0.5 : 1;
        const k = s * (1 + vb * (1 - clamp01(cs * 1.4)) * (vb > 0 ? skin : 1));
        R[i] = y + (r - y) * k; G[i] = y + (g - y) * k; B[i] = y + (b - y) * k;
      }
    }

    // 9) Ajustes por faixa de cor (HSL de 8 canais)
    const hslOn = p.hslHue.some(v => v) || p.hslSat.some(v => v) || p.hslLum.some(v => v);
    if (hslOn) {
      for (let i = 0; i < n; i++) {
        const r = clamp01(R[i]), g = clamp01(G[i]), b = clamp01(B[i]);
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
        if (dd < 1e-4) continue;
        let s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn), hh;
        if (mx === r) hh = ((g - b) / dd + (g < b ? 6 : 0)); else if (mx === g) hh = (b - r) / dd + 2; else hh = (r - g) / dd + 4;
        hh *= 60;
        let dh = 0, ds = 0, dl = 0;
        for (let c = 0; c < 8; c++) {
          const c0 = HSL_CENTERS[c], prev = HSL_CENTERS[(c + 7) % 8], next = HSL_CENTERS[(c + 1) % 8];
          let diff = hh - c0; if (diff > 180) diff -= 360; if (diff < -180) diff += 360;
          let span = diff >= 0 ? next - c0 : c0 - prev; if (span <= 0) span += 360;
          const wgt = Math.max(0, 1 - Math.abs(diff) / span);
          if (wgt > 0) { dh += wgt * p.hslHue[c]; ds += wgt * p.hslSat[c]; dl += wgt * p.hslLum[c]; }
        }
        if (!dh && !ds && !dl) continue;
        hh = (hh + dh * 0.3 + 360) % 360;
        s = clamp01(s * (1 + ds / 100));
        const nl = clamp01(l + dl / 100 * 0.3 * s * (dl > 0 ? 1 - l : l) * 2);
        const q = nl < 0.5 ? nl * (1 + s) : nl + s - nl * s, pp = 2 * nl - q, H = hh / 360;
        const hue2 = t => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return pp + (q - pp) * 6 * t; if (t < 0.5) return q; if (t < 2 / 3) return pp + (q - pp) * (2 / 3 - t) * 6; return pp; };
        R[i] = hue2(H + 1 / 3); G[i] = hue2(H); B[i] = hue2(H - 1 / 3);
      }
    }

    // 10) Curvas
    const cv = p.curves || {};
    if (!isIdentityCurve(cv.rgb) || !isIdentityCurve(cv.r) || !isIdentityCurve(cv.g) || !isIdentityCurve(cv.b)) {
      const N = 1024, m = curveLUT(cv.rgb, N), lr = curveLUT(cv.r, N), lg = curveLUT(cv.g, N), lb = curveLUT(cv.b, N);
      const look = (lut, v) => lut[Math.round(clamp01(v) * (N - 1))];
      for (let i = 0; i < n; i++) { R[i] = look(lr, look(m, R[i])); G[i] = look(lg, look(m, G[i])); B[i] = look(lb, look(m, B[i])); }
    }

    // 11) Nitidez (máscara de nitidez na luminância, com limiar contra ruído)
    if (p.sharpen > 0) {
      const L = lumaOf(R, G, B), bl = gauss(L, w, h, Math.max(0.4, p.sharpenRadius * scale));
      const k = p.sharpen / 100 * 1.6;
      for (let i = 0; i < n; i++) {
        const dt = L[i] - bl[i], ad = Math.abs(dt), th = ad < 0.008 ? ad / 0.008 : 1;
        const add = k * dt * th;
        R[i] += add; G[i] += add; B[i] += add;
      }
    }

    // 12) Vinheta
    if (p.vignette) {
      const v = p.vignette / 100, cx = w / 2, cy = h / 2, inv = 1 / Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x - cx) * inv, dy = (y - cy) * inv, d = Math.sqrt(dx * dx + dy * dy);
        const f = smooth(0.35, 1.05, d), i = y * w + x;
        if (v < 0) { const k = 1 + v * 0.85 * f; R[i] *= k; G[i] *= k; B[i] *= k; }
        else { const k = v * 0.85 * f; R[i] += (1 - R[i]) * k; G[i] += (1 - G[i]) * k; B[i] += (1 - B[i]) * k; }
      }
    }

    // 13) Granulação (determinística: o mesmo resultado na prévia e na exportação)
    if (p.grain > 0) {
      const a = p.grain / 100 * 0.11;
      for (let y = 0; y < h; y++) {
        const yy = Math.floor(y / scale);
        for (let x = 0; x < w; x++) {
          let s = (Math.floor(x / scale) * 374761393 + yy * 668265263) | 0;
          s = (s ^ (s >>> 13)) * 1274126177 | 0; s ^= s >>> 16;
          const nz = ((s & 0xffff) / 65535 - 0.5) * a, i = y * w + x;
          const l = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i], k = 1 - Math.abs(2 * clamp01(l) - 1) * 0.6;
          R[i] += nz * k; G[i] += nz * k; B[i] += nz * k;
        }
      }
    }
    return fromFloat(img, R, G, B);
  }

  /* ---------------- Análise automática (auto melhorar) ---------------- */
  function analyze(img) {
    const d = img.d, n = img.w * img.h, step = Math.max(1, Math.floor(n / 400000));
    const hist = new Uint32Array(256);
    let rs = 0, gs = 0, bs = 0, cnt = 0, satSum = 0, total = 0;
    for (let i = 0; i < n; i += step) {
      const j = i * 4; if (d[j + 3] < 8) continue;
      const r = d[j], g = d[j + 1], b = d[j + 2], y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      hist[y]++; total++;
      satSum += (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      if (y > 40 && y < 220) { rs += r; gs += g; bs += b; cnt++; }
    }
    const pct = q => { let a = 0, lim = total * q; for (let i = 0; i < 256; i++) { a += hist[i]; if (a >= lim) return i / 255; } return 1; };
    return { pLow: pct(0.005), pHigh: pct(0.995), median: pct(0.5), r: rs / Math.max(1, cnt), g: gs / Math.max(1, cnt), b: bs / Math.max(1, cnt), sat: satSum / Math.max(1, total) };
  }
  function autoParams(img) {
    const a = analyze(img), p = neutralParams();
    p.blacks = Math.round(-Math.min(1, a.pLow / 0.15) * 100);
    p.whites = Math.round(Math.min(1, (1 - a.pHigh) / 0.15) * 100);
    const span = Math.max(0.05, a.pHigh - a.pLow), med = clamp01((a.median - a.pLow) / span);
    p.exposure = Math.round(clamp(Math.log2(0.46 / Math.max(0.05, med)), -1, 1) * 0.6 * 100) / 100;
    if (a.r > 0 && a.b > 0) {
      const t = (a.b - a.r) / (0.25 * (a.r + a.b)) * 100;
      p.temperature = Math.round(clamp(t * 0.6, -50, 50));
      const avg = (a.r + a.b) / 2, tn = (a.g - avg) / (0.2 * a.g + 0.1 * avg) * 100;
      p.tint = Math.round(clamp(tn * 0.6, -40, 40));
    }
    p.contrast = span < 0.6 ? 18 : 8;
    p.shadows = med < 0.35 ? 25 : 10; p.highlights = a.pHigh > 0.97 ? -25 : -10;
    p.vibrance = a.sat < 0.25 ? 25 : 12;
    p.clarity = 12; p.sharpen = 25;
    return p;
  }

  function histogram(img) {
    const d = img.d, n = img.w * img.h, step = Math.max(1, Math.floor(n / 250000));
    const r = new Uint32Array(256), g = new Uint32Array(256), b = new Uint32Array(256), l = new Uint32Array(256);
    for (let i = 0; i < n; i += step) {
      const j = i * 4; if (d[j + 3] < 8) continue;
      r[d[j]]++; g[d[j + 1]]++; b[d[j + 2]]++; l[Math.round(0.2126 * d[j] + 0.7152 * d[j + 1] + 0.0722 * d[j + 2])]++;
    }
    return { r, g, b, l };
  }

  /* ---------------- Reamostragem Lanczos-3 (em faixas, memória controlada) ---------------- */
  function lanczosWeights(inSize, outSize, a) {
    const scale = outSize / inSize, support = scale < 1 ? a / scale : a, fs = scale < 1 ? scale : 1;
    const starts = new Int32Array(outSize), counts = new Int32Array(outSize), ws = [];
    const sinc = x => { if (x === 0) return 1; const px = Math.PI * x; return Math.sin(px) / px; };
    for (let o = 0; o < outSize; o++) {
      const center = (o + 0.5) / scale - 0.5;
      const s = Math.max(0, Math.ceil(center - support)), e = Math.min(inSize - 1, Math.floor(center + support));
      const wts = new Float32Array(e - s + 1); let sum = 0;
      for (let i = s; i <= e; i++) {
        const x = (i - center) * fs;
        const v = Math.abs(x) < a ? sinc(x) * sinc(x / a) : 0; wts[i - s] = v; sum += v;
      }
      for (let k = 0; k < wts.length; k++) wts[k] /= sum || 1;
      starts[o] = s; counts[o] = wts.length; ws.push(wts);
    }
    return { starts, counts, ws };
  }
  function resize(img, nw, nh, onProgress) {
    nw = Math.max(1, Math.round(nw)); nh = Math.max(1, Math.round(nh));
    const { w, h, d } = img, out = makeImage(nw, nh), o = out.d;
    const wx = lanczosWeights(w, nw, 3), wy = lanczosWeights(h, nh, 3);
    // Pré-multiplica alfa para não “vazar” cor de pixels transparentes
    const pre = new Float32Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const a = d[i * 4 + 3] / 255;
      pre[i * 4] = d[i * 4] * a; pre[i * 4 + 1] = d[i * 4 + 1] * a; pre[i * 4 + 2] = d[i * 4 + 2] * a; pre[i * 4 + 3] = d[i * 4 + 3];
    }
    const STRIP = Math.max(16, Math.floor(4e6 / Math.max(1, nw * 4)));
    for (let y0 = 0; y0 < nh; y0 += STRIP) {
      const y1 = Math.min(nh, y0 + STRIP);
      const inS = wy.starts[y0], inE = wy.starts[y1 - 1] + wy.counts[y1 - 1] - 1, rows = inE - inS + 1;
      const tmp = new Float32Array(rows * nw * 4);
      for (let ry = 0; ry < rows; ry++) {
        const srow = (inS + ry) * w * 4, trow = ry * nw * 4;
        for (let x = 0; x < nw; x++) {
          const s = wx.starts[x], c = wx.counts[x], wt = wx.ws[x];
          let r = 0, g = 0, b = 0, a = 0;
          for (let k = 0; k < c; k++) { const j = srow + (s + k) * 4, q = wt[k]; r += pre[j] * q; g += pre[j + 1] * q; b += pre[j + 2] * q; a += pre[j + 3] * q; }
          const t = trow + x * 4; tmp[t] = r; tmp[t + 1] = g; tmp[t + 2] = b; tmp[t + 3] = a;
        }
      }
      for (let y = y0; y < y1; y++) {
        const s = wy.starts[y] - inS, c = wy.counts[y], wt = wy.ws[y];
        for (let x = 0; x < nw; x++) {
          let r = 0, g = 0, b = 0, a = 0;
          for (let k = 0; k < c; k++) { const j = ((s + k) * nw + x) * 4, q = wt[k]; r += tmp[j] * q; g += tmp[j + 1] * q; b += tmp[j + 2] * q; a += tmp[j + 3] * q; }
          const t = (y * nw + x) * 4, al = clamp(a, 0, 255), ia = al > 0.5 ? 255 / al : 0;
          o[t] = r * ia; o[t + 1] = g * ia; o[t + 2] = b * ia; o[t + 3] = al;
        }
      }
      if (onProgress) onProgress(y1 / nh);
    }
    return out;
  }

  /* ---------------- Melhorias de qualidade ---------------- */
  // Realce de detalhes pós-ampliação: decompõe em base (filtro guiado) + detalhe.
  function enhanceDetail(img, amount, radius) {
    const { w, h } = img, { R, G, B } = toFloat(img), L = lumaOf(R, G, B);
    const base = guided(L, L, w, h, Math.max(1, Math.round(radius || 2)), 0.0025);
    const k = (amount || 50) / 100 * 1.5, n = w * h;
    for (let i = 0; i < n; i++) {
      const dt = L[i] - base[i], ad = Math.abs(dt), th = ad < 0.004 ? ad / 0.004 : 1, add = k * dt * th;
      R[i] += add; G[i] += add; B[i] += add;
    }
    return fromFloat(img, R, G, B);
  }
  function upscale(img, factor, opts, onProgress) {
    opts = opts || {};
    let src = img;
    if (opts.denoise > 0) src = develop(src, { denoise: opts.denoise, colorDenoise: Math.min(100, opts.denoise * 1.2) });
    if (onProgress) onProgress(0.1);
    let out = resize(src, img.w * factor, img.h * factor, p => onProgress && onProgress(0.1 + p * 0.75));
    if (opts.detail > 0) out = enhanceDetail(out, opts.detail, Math.max(1, factor));
    if (onProgress) onProgress(1);
    return out;
  }
  function smartSharpen(img, amount, radius, threshold) {
    const { w, h } = img, { R, G, B } = toFloat(img), L = lumaOf(R, G, B), n = w * h;
    const bl = gauss(L, w, h, radius || 1), k = (amount || 80) / 100 * 1.8, th = (threshold || 2) / 255;
    // Máscara de bordas: aplica mais nitidez onde há estrutura, menos em áreas lisas
    const gx = new Float32Array(n);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; gx[i] = Math.abs(L[i + 1] - L[i - 1]) + Math.abs(L[i + w] - L[i - w]);
    }
    const em = boxBlur(gx, w, h, 2);
    for (let i = 0; i < n; i++) {
      const dt = L[i] - bl[i], ad = Math.abs(dt);
      if (ad < th) continue;
      const m = Math.min(1, em[i] * 8), add = k * dt * (0.3 + 0.7 * m);
      R[i] += add; G[i] += add; B[i] += add;
    }
    return fromFloat(img, R, G, B);
  }
  function denoise(img, strength, chroma, preserve) {
    const s = strength / 100, pres = (preserve == null ? 50 : preserve) / 100;
    let out = develop(img, { denoise: strength, colorDenoise: chroma == null ? Math.min(100, strength * 1.3) : chroma });
    if (pres > 0 && s > 0) {
      // devolve parte da textura fina original (evita aspecto de “plástico”)
      const o = out.d, d = img.d, k = pres * 0.35;
      for (let i = 0; i < o.length; i += 4) { o[i] += (d[i] - o[i]) * k; o[i + 1] += (d[i + 1] - o[i + 1]) * k; o[i + 2] += (d[i + 2] - o[i + 2]) * k; }
    }
    return out;
  }
  // Reduz artefatos de blocos JPEG suavizando apenas nas fronteiras de 8 px.
  function deblock(img, strength) {
    const { w, h, d } = img, out = makeImage(w, h), o = out.d, k = (strength || 60) / 100;
    o.set(d);
    const blend = (a, b, t) => a + (b - a) * t;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) for (let x = 7; x < w - 1; x += 8) {
        const i = (y * w + x) * 4, j = i + 4;
        for (let c = 0; c < 3; c++) {
          const a = o[i + c], b = o[j + c], diff = Math.abs(a - b);
          if (diff < 24) { const m = (a + b) / 2; o[i + c] = blend(a, m, k); o[j + c] = blend(b, m, k); if (x > 0) o[i - 4 + c] = blend(o[i - 4 + c], m, k * 0.4); if (x + 2 < w) o[j + 4 + c] = blend(o[j + 4 + c], m, k * 0.4); }
        }
      }
      for (let y = 7; y < h - 1; y += 8) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, j = i + w * 4;
        for (let c = 0; c < 3; c++) {
          const a = o[i + c], b = o[j + c], diff = Math.abs(a - b);
          if (diff < 24) { const m = (a + b) / 2; o[i + c] = blend(a, m, k); o[j + c] = blend(b, m, k); }
        }
      }
    }
    return develop(out, { colorDenoise: 35 * k });
  }

  /* ---------------- Filtros criativos ---------------- */
  function mix(orig, out, amount) {
    if (amount >= 1) return out;
    const a = orig.d, b = out.d;
    for (let i = 0; i < b.length; i += 4) {
      b[i] = a[i] + (b[i] - a[i]) * amount; b[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * amount;
      b[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * amount; b[i + 3] = a[i + 3] + (b[i + 3] - a[i + 3]) * amount;
    }
    return out;
  }
  function mapPixels(img, fn) {
    const out = makeImage(img.w, img.h), o = out.d, d = img.d;
    for (let i = 0; i < d.length; i += 4) { const r = fn(d[i], d[i + 1], d[i + 2]); o[i] = r[0]; o[i + 1] = r[1]; o[i + 2] = r[2]; o[i + 3] = d[i + 3]; }
    return out;
  }
  function hexRgb(hex) { const v = parseInt(String(hex || '#000').slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
  function blurImg(img, sigma) {
    const { w, h } = img, ch = [new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h), new Float32Array(w * h)];
    for (let i = 0; i < w * h; i++) for (let c = 0; c < 4; c++) ch[c][i] = img.d[i * 4 + c];
    const bl = ch.map(c => gauss(c, w, h, sigma)), out = makeImage(w, h);
    for (let i = 0; i < w * h; i++) for (let c = 0; c < 4; c++) out.d[i * 4 + c] = bl[c][i];
    return out;
  }
  function convolve3(img, k, bias) {
    const { w, h, d } = img, out = makeImage(w, h), o = out.d;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, ki = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const j = (clamp(y + dy, 0, h - 1) * w + clamp(x + dx, 0, w - 1)) * 4, q = k[ki++];
        r += d[j] * q; g += d[j + 1] * q; b += d[j + 2] * q;
      }
      const t = (y * w + x) * 4; o[t] = r + bias; o[t + 1] = g + bias; o[t + 2] = b + bias; o[t + 3] = d[t + 3];
    }
    return out;
  }
  function kuwahara(img, radius) {
    const { w, h, d } = img, W = w + 1, n = W * (h + 1);
    const S = [new Float64Array(n), new Float64Array(n), new Float64Array(n)], SL = new Float64Array(n), SL2 = new Float64Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = (y * w + x) * 4, i = (y + 1) * W + x + 1, l = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
      for (let c = 0; c < 3; c++) S[c][i] = d[j + c] + S[c][i - 1] + S[c][i - W] - S[c][i - W - 1];
      SL[i] = l + SL[i - 1] + SL[i - W] - SL[i - W - 1];
      SL2[i] = l * l + SL2[i - 1] + SL2[i - W] - SL2[i - W - 1];
    }
    const sum = (A, x0, y0, x1, y1) => A[(y1 + 1) * W + x1 + 1] - A[y0 * W + x1 + 1] - A[(y1 + 1) * W + x0] + A[y0 * W + x0];
    const out = makeImage(w, h), o = out.d, r = Math.max(1, Math.round(radius));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let best = Infinity, br = 0, bg = 0, bb = 0;
      const quads = [[x - r, y - r, x, y], [x, y - r, x + r, y], [x - r, y, x, y + r], [x, y, x + r, y + r]];
      for (const q of quads) {
        const x0 = clamp(q[0], 0, w - 1), y0 = clamp(q[1], 0, h - 1), x1 = clamp(q[2], 0, w - 1), y1 = clamp(q[3], 0, h - 1);
        const cnt = (x1 - x0 + 1) * (y1 - y0 + 1), m = sum(SL, x0, y0, x1, y1) / cnt, v = sum(SL2, x0, y0, x1, y1) / cnt - m * m;
        if (v < best) { best = v; br = sum(S[0], x0, y0, x1, y1) / cnt; bg = sum(S[1], x0, y0, x1, y1) / cnt; bb = sum(S[2], x0, y0, x1, y1) / cnt; }
      }
      const t = (y * w + x) * 4; o[t] = br; o[t + 1] = bg; o[t + 2] = bb; o[t + 3] = d[t + 3];
    }
    return out;
  }
  function halftone(img, cell, angleDeg, color) {
    const { w, h, d } = img, out = makeImage(w, h), o = out.d;
    cell = Math.max(3, cell);
    const L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    const Lb = boxBlur(L, w, h, Math.floor(cell / 2));
    const a = angleDeg * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const ink = hexRgb(color || '#111111');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x * ca + y * sa, v = -x * sa + y * ca;
      const cu = (Math.floor(u / cell) + 0.5) * cell, cvv = (Math.floor(v / cell) + 0.5) * cell;
      const cx = clamp(Math.round(cu * ca - cvv * sa), 0, w - 1), cy = clamp(Math.round(cu * sa + cvv * ca), 0, h - 1);
      const lum = Lb[cy * w + cx], rad = cell * 0.5 * Math.SQRT2 * Math.sqrt(1 - lum);
      const dist = Math.hypot(u - cu, v - cvv), cov = clamp01(rad - dist + 0.5);
      const t = (y * w + x) * 4;
      o[t] = 255 + (ink[0] - 255) * cov; o[t + 1] = 255 + (ink[1] - 255) * cov; o[t + 2] = 255 + (ink[2] - 255) * cov; o[t + 3] = d[t + 3];
    }
    return out;
  }
  // “Documento escaneado”: estima o fundo do papel e o normaliza para branco.
  function docScan(img, mode, strength) {
    const { w, h, d } = img, f = Math.max(2, Math.round(Math.min(w, h) / 90));
    const sw = Math.ceil(w / f), sh = Math.ceil(h / f), bg = [new Float32Array(sw * sh), new Float32Array(sw * sh), new Float32Array(sw * sh)];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const mx = [0, 0, 0];
      for (let yy = y * f; yy < Math.min(h, (y + 1) * f); yy++) for (let xx = x * f; xx < Math.min(w, (x + 1) * f); xx++) {
        const j = (yy * w + xx) * 4; for (let c = 0; c < 3; c++) if (d[j + c] > mx[c]) mx[c] = d[j + c];
      }
      for (let c = 0; c < 3; c++) bg[c][y * sw + x] = mx[c];
    }
    const big = bg.map(c => resampleChannel(boxBlur(boxBlur(c, sw, sh, 2), sw, sh, 2), sw, sh, w, h));
    const out = makeImage(w, h), o = out.d, k = (strength == null ? 60 : strength) / 100;
    for (let i = 0; i < w * h; i++) {
      const j = i * 4; let r = d[j] / Math.max(30, big[0][i]), g = d[j + 1] / Math.max(30, big[1][i]), b = d[j + 2] / Math.max(30, big[2][i]);
      const cst = 1 + k * 1.5, curve = v => clamp01((v - 1) * cst + 1) ** (1 + k * 1.2);
      r = curve(r); g = curve(g); b = curve(b);
      if (mode === 'bw' || mode === 'gray') {
        let l = 0.299 * r + 0.587 * g + 0.114 * b;
        if (mode === 'bw') l = smooth(0.55 - 0.1 * k, 0.75 - 0.1 * k, l);
        r = g = b = l;
      }
      o[j] = r * 255; o[j + 1] = g * 255; o[j + 2] = b * 255; o[j + 3] = d[j + 3];
    }
    return out;
  }

  function filter(img, name, amount, opt) {
    opt = opt || {};
    const a = amount == null ? 1 : amount / 100;
    let out;
    switch (name) {
      case 'grayscale': out = mapPixels(img, (r, g, b) => { const l = 0.2126 * r + 0.7152 * g + 0.0722 * b; return [l, l, l]; }); break;
      case 'sepia': out = mapPixels(img, (r, g, b) => [r * .393 + g * .769 + b * .189, r * .349 + g * .686 + b * .168, r * .272 + g * .534 + b * .131]); break;
      case 'invert': out = mapPixels(img, (r, g, b) => [255 - r, 255 - g, 255 - b]); break;
      case 'duotone': {
        const c1 = hexRgb(opt.c1 || '#1b1f5e'), c2 = hexRgb(opt.c2 || '#ffcf4a');
        out = mapPixels(img, (r, g, b) => { const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; return [c1[0] + (c2[0] - c1[0]) * l, c1[1] + (c2[1] - c1[1]) * l, c1[2] + (c2[2] - c1[2]) * l]; });
        break;
      }
      case 'posterize': { const lv = Math.max(2, Math.round(opt.levels || 5)), st = 255 / (lv - 1); out = mapPixels(img, (r, g, b) => [Math.round(r / st) * st, Math.round(g / st) * st, Math.round(b / st) * st]); break; }
      case 'threshold': { const t = (opt.level == null ? 128 : opt.level); out = mapPixels(img, (r, g, b) => { const v = (0.299 * r + 0.587 * g + 0.114 * b) >= t ? 255 : 0; return [v, v, v]; }); break; }
      case 'blur': out = blurImg(img, Math.max(0.5, opt.radius || 4)); break;
      case 'pixelate': {
        const s = Math.max(2, Math.round(opt.size || 12)), { w, h, d } = img; out = makeImage(w, h);
        for (let by = 0; by < h; by += s) for (let bx = 0; bx < w; bx += s) {
          let r = 0, g = 0, b = 0, al = 0, c = 0;
          for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { const j = (y * w + x) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; al += d[j + 3]; c++; }
          for (let y = by; y < Math.min(h, by + s); y++) for (let x = bx; x < Math.min(w, bx + s); x++) { const j = (y * w + x) * 4; out.d[j] = r / c; out.d[j + 1] = g / c; out.d[j + 2] = b / c; out.d[j + 3] = al / c; }
        }
        break;
      }
      case 'emboss': out = convolve3(img, [-2, -1, 0, -1, 1, 1, 0, 1, 2], 0); break;
      case 'edges': {
        const { w, h, d } = img; out = makeImage(w, h);
        const L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const p = (xx, yy) => L[clamp(yy, 0, h - 1) * w + clamp(xx, 0, w - 1)];
          const gx = -p(x - 1, y - 1) - 2 * p(x - 1, y) - p(x - 1, y + 1) + p(x + 1, y - 1) + 2 * p(x + 1, y) + p(x + 1, y + 1);
          const gy = -p(x - 1, y - 1) - 2 * p(x, y - 1) - p(x + 1, y - 1) + p(x - 1, y + 1) + 2 * p(x, y + 1) + p(x + 1, y + 1);
          const v = 255 - Math.min(255, Math.hypot(gx, gy)), t = (y * w + x) * 4;
          out.d[t] = out.d[t + 1] = out.d[t + 2] = v; out.d[t + 3] = d[t + 3];
        }
        break;
      }
      case 'oil': out = kuwahara(img, opt.radius || 4); break;
      case 'halftone': out = halftone(img, opt.cell || 10, opt.angle == null ? 45 : opt.angle, opt.ink); break;
      case 'docscan': out = docScan(img, opt.mode || 'color', opt.strength); break;
      case 'deblock': out = deblock(img, opt.strength || 60); break;
      default: throw new Error('Filtro desconhecido: ' + name);
    }
    return mix(img, out, a);
  }

  /* ---------------- Perspectiva (homografia) ---------------- */
  function homography(src, dst) {
    // Resolve H que leva src[i] -> dst[i] (4 pontos), via eliminação gaussiana 8x8
    const A = [], bvec = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); bvec.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); bvec.push(v);
    }
    for (let c = 0; c < 8; c++) {
      let piv = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]]; [bvec[c], bvec[piv]] = [bvec[piv], bvec[c]];
      for (let r = 0; r < 8; r++) if (r !== c) {
        const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; bvec[r] -= f * bvec[c];
      }
    }
    const hv = bvec.map((v, i) => v / A[i][i]);
    return [hv[0], hv[1], hv[2], hv[3], hv[4], hv[5], hv[6], hv[7], 1];
  }
  function perspective(img, quad, ow, oh, onProgress) {
    ow = Math.round(ow); oh = Math.round(oh);
    const H = homography([[0, 0], [ow, 0], [ow, oh], [0, oh]], quad);
    const { w, h, d } = img, out = makeImage(ow, oh), o = out.d;
    for (let y = 0; y < oh; y++) {
      for (let x = 0; x < ow; x++) {
        const X = x + 0.5, Y = y + 0.5, z = H[6] * X + H[7] * Y + 1;
        const sx = (H[0] * X + H[1] * Y + H[2]) / z - 0.5, sy = (H[3] * X + H[4] * Y + H[5]) / z - 0.5;
        const x0 = Math.floor(sx), y0 = Math.floor(sy), tx = sx - x0, ty = sy - y0, t = (y * ow + x) * 4;
        if (x0 < -1 || y0 < -1 || x0 >= w || y0 >= h) { o[t + 3] = 0; continue; }
        for (let c = 0; c < 4; c++) {
          const g = (xx, yy) => d[(clamp(yy, 0, h - 1) * w + clamp(xx, 0, w - 1)) * 4 + c];
          const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * tx, b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * tx;
          o[t + c] = a + (b - a) * ty;
        }
      }
      if (onProgress && y % 64 === 0) onProgress(y / oh);
    }
    return out;
  }

  /* ---------------- Correção de manchas (pull-push + difusão) ---------------- */
  // img: recorte; mask: Uint8Array (1 = preencher)
  function inpaint(img, mask) {
    const { w, h, d } = img, n = w * h;
    const ch = [0, 1, 2].map(c => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = d[i * 4 + c]; return a; });
    const known = new Float32Array(n); for (let i = 0; i < n; i++) known[i] = mask[i] ? 0 : 1;
    // Pirâmide: “pull” (média ponderada pelos pixels conhecidos)
    const levels = [{ w, h, c: ch, k: known }];
    while (levels[levels.length - 1].w > 2 && levels[levels.length - 1].h > 2) {
      const L = levels[levels.length - 1], nw = Math.ceil(L.w / 2), nh = Math.ceil(L.h / 2);
      const nc = [new Float32Array(nw * nh), new Float32Array(nw * nh), new Float32Array(nw * nh)], nk = new Float32Array(nw * nh);
      for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
        let s = [0, 0, 0], kk = 0;
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
          const xx = Math.min(L.w - 1, 2 * x + dx), yy = Math.min(L.h - 1, 2 * y + dy), i = yy * L.w + xx, q = L.k[i];
          kk += q; for (let c = 0; c < 3; c++) s[c] += L.c[c][i] * q;
        }
        const i = y * nw + x; nk[i] = Math.min(1, kk);
        for (let c = 0; c < 3; c++) nc[c][i] = kk > 0 ? s[c] / kk : 0;
      }
      levels.push({ w: nw, h: nh, c: nc, k: nk });
    }
    // “Push”: completa níveis finos a partir dos grossos
    for (let l = levels.length - 2; l >= 0; l--) {
      const L = levels[l], C = levels[l + 1];
      for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
        const i = y * L.w + x, q = L.k[i]; if (q >= 1) continue;
        const ci = Math.min(C.h - 1, y >> 1) * C.w + Math.min(C.w - 1, x >> 1);
        for (let c = 0; c < 3; c++) L.c[c][i] = L.c[c][i] * q + C.c[c][ci] * (1 - q);
        L.k[i] = 1;
      }
    }
    // Difusão para suavizar a transição
    const out = makeImage(w, h); out.d.set(d);
    for (let it = 0; it < 40; it++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (!mask[i]) continue;
      for (let c = 0; c < 3; c++) { const a = ch[c]; a[i] = (a[i - 1] + a[i + 1] + a[i - w] + a[i + w]) * 0.25; }
    }
    for (let i = 0; i < n; i++) if (mask[i]) {
      // um pouco de ruído para não ficar “liso demais”
      const nz = (((i * 2654435761) >>> 0) % 1000 / 1000 - 0.5) * 6;
      out.d[i * 4] = ch[0][i] + nz; out.d[i * 4 + 1] = ch[1][i] + nz; out.d[i * 4 + 2] = ch[2][i] + nz; out.d[i * 4 + 3] = 255;
    }
    return out;
  }

  /* ---------------- Remover fundo por cor ---------------- */
  function colorMask(img, sx, sy, tolerance, contiguous, feather) {
    const { w, h, d } = img, n = w * h, mask = new Float32Array(n);
    sx = clamp(Math.round(sx), 0, w - 1); sy = clamp(Math.round(sy), 0, h - 1);
    const s = (sy * w + sx) * 4, r0 = d[s], g0 = d[s + 1], b0 = d[s + 2];
    const tol = (tolerance / 100) * 441.7, tol2 = tol * tol;
    const near = i => { const j = i * 4, dr = d[j] - r0, dg = d[j + 1] - g0, db = d[j + 2] - b0; return dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11 <= tol2 * 0.5 && d[j + 3] > 0; };
    if (contiguous) {
      const stack = new Int32Array(n), seen = new Uint8Array(n); let top = 0;
      stack[top++] = sy * w + sx; seen[sy * w + sx] = 1;
      while (top) {
        const i = stack[--top]; if (!near(i)) continue; mask[i] = 1;
        const x = i % w, y = (i / w) | 0;
        if (x > 0 && !seen[i - 1]) { seen[i - 1] = 1; stack[top++] = i - 1; }
        if (x < w - 1 && !seen[i + 1]) { seen[i + 1] = 1; stack[top++] = i + 1; }
        if (y > 0 && !seen[i - w]) { seen[i - w] = 1; stack[top++] = i - w; }
        if (y < h - 1 && !seen[i + w]) { seen[i + w] = 1; stack[top++] = i + w; }
      }
    } else for (let i = 0; i < n; i++) if (near(i)) mask[i] = 1;
    const m = feather > 0 ? boxBlur(boxBlur(mask, w, h, feather), w, h, Math.max(1, feather / 2)) : mask;
    const out = makeImage(w, h); out.d.set(d);
    for (let i = 0; i < n; i++) out.d[i * 4 + 3] = d[i * 4 + 3] * (1 - clamp01(m[i]));
    return out;
  }

  // Recorta automaticamente bordas transparentes/uniformes
  function trimBounds(img, tol) {
    const { w, h, d } = img; tol = tol || 10;
    const r0 = d[0], g0 = d[1], b0 = d[2], a0 = d[3];
    const same = j => Math.abs(d[j] - r0) <= tol && Math.abs(d[j + 1] - g0) <= tol && Math.abs(d[j + 2] - b0) <= tol && Math.abs(d[j + 3] - a0) <= tol;
    let top = 0, bottom = h - 1, left = 0, right = w - 1;
    const rowSame = y => { for (let x = 0; x < w; x++) if (!same((y * w + x) * 4)) return false; return true; };
    const colSame = x => { for (let y = top; y <= bottom; y++) if (!same((y * w + x) * 4)) return false; return true; };
    while (top < bottom && rowSame(top)) top++;
    while (bottom > top && rowSame(bottom)) bottom--;
    while (left < right && colSame(left)) left++;
    while (right > left && colSame(right)) right--;
    return { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
  }

  return {
    neutralParams, isNeutral, develop, autoParams, analyze, histogram, curveLUT,
    resize, upscale, enhanceDetail, smartSharpen, denoise, deblock, filter,
    perspective, homography, inpaint, colorMask, trimBounds, HSL_CENTERS
  };
}

/* ---------------- Ponte com o Worker ---------------- */
function PrismaWorkerMain(self) {
  const P = PrismaImgProcFactory();
  const E = typeof PrismaImgProcExtra === 'function' ? PrismaImgProcExtra(P) : null;
  self.onmessage = e => {
    const { id, op, args } = e.data;
    const progress = p => self.postMessage({ id, progress: p });
    try {
      let res;
      switch (op) {
        case 'develop': res = P.develop(args.img, args.params, args.scale); break;
        case 'autoParams': res = P.autoParams(args.img); break;
        case 'histogram': res = P.histogram(args.img); break;
        case 'resize': res = P.resize(args.img, args.w, args.h, progress); break;
        case 'upscale': res = P.upscale(args.img, args.factor, args.opts, progress); break;
        case 'enhanceDetail': res = P.enhanceDetail(args.img, args.amount, args.radius); break;
        case 'smartSharpen': res = P.smartSharpen(args.img, args.amount, args.radius, args.threshold); break;
        case 'denoise': res = P.denoise(args.img, args.strength, args.chroma, args.preserve); break;
        case 'filter': res = P.filter(args.img, args.name, args.amount, args.opt); break;
        case 'perspective': res = P.perspective(args.img, args.quad, args.w, args.h, progress); break;
        case 'inpaint': res = P.inpaint(args.img, args.mask); break;
        case 'colorMask': res = P.colorMask(args.img, args.x, args.y, args.tolerance, args.contiguous, args.feather); break;
        case 'trimBounds': res = P.trimBounds(args.img, args.tol); break;
        case 'adjust': res = E.adjust(args.img, args.name, args.params); break;
        case 'fx': res = E.fx(args.img, args.name, args.params, progress); break;
        case 'superResolve': res = E.superResolve(args.img, args.w, args.h, args.strength, progress); break;
        case 'floodMask': res = E.floodMask(args.img, args.x, args.y, args.tolerance, args.contiguous, args.antialias); break;
        case 'redEye': res = E.redEye(args.img, args.x, args.y, args.radius, args.strength); break;
        default: throw new Error('Operação desconhecida: ' + op);
      }
      const transfer = res && res.d && res.d.buffer ? [res.d.buffer] : res && res.m && res.m.buffer ? [res.m.buffer] : [];
      self.postMessage({ id, result: res }, transfer);
    } catch (err) {
      self.postMessage({ id, error: (err && err.message) || String(err) });
    }
  };
}

window.PrismaImgProc = PrismaImgProcFactory();

