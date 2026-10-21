/* Prisma Studio — leitura e gravação de PSD (Photoshop) com camadas, 8 bits RGB. Implementação própria da especificação Adobe. */
(function () {
  'use strict';
  const PS = window.PS;
  const BLEND_KEYS = { 'source-over': 'norm', multiply: 'mul ', screen: 'scrn', overlay: 'over', 'soft-light': 'sLit', 'hard-light': 'hLit', darken: 'dark', lighten: 'lite', 'color-dodge': 'div ', 'color-burn': 'idiv', difference: 'diff', exclusion: 'smud', hue: 'hue ', saturation: 'sat ', color: 'colr', luminosity: 'lum ' };
  const KEY_BLENDS = Object.fromEntries(Object.entries(BLEND_KEYS).map(([a, b]) => [b, a]));

  class W {
    constructor() { this.buf = new Uint8Array(1 << 20); this.n = 0; }
    ensure(k) { if (this.n + k <= this.buf.length) return; let s = this.buf.length; while (s < this.n + k) s *= 2; const b = new Uint8Array(s); b.set(this.buf.subarray(0, this.n)); this.buf = b; }
    u8(v) { this.ensure(1); this.buf[this.n++] = v & 255; }
    u16(v) { this.u8(v >> 8); this.u8(v); }
    i16(v) { this.u16(v < 0 ? v + 65536 : v); }
    u32(v) { this.u16((v >>> 16) & 65535); this.u16(v & 65535); }
    i32(v) { this.u32(v >>> 0); }
    str(s) { for (const ch of s) this.u8(ch.charCodeAt(0)); }
    bytes(b) { this.ensure(b.length); this.buf.set(b, this.n); this.n += b.length; }
    pad(m) { while (this.n % m) this.u8(0); }
    at(pos, v) { this.buf[pos] = v >>> 24 & 255; this.buf[pos + 1] = v >>> 16 & 255; this.buf[pos + 2] = v >>> 8 & 255; this.buf[pos + 3] = v & 255; }
    out() { return this.buf.slice(0, this.n); }
  }
  const latin = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '_').slice(0, 255);

  // RLE PackBits por linha (tamanho bem menor que bruto)
  function packRow(src, off, len) {
    const out = []; let i = 0;
    while (i < len) {
      let run = 1; while (i + run < len && run < 128 && src[off + i + run] === src[off + i]) run++;
      if (run > 1) { out.push(257 - run, src[off + i]); i += run; continue; }
      let lit = 1; while (i + lit < len && lit < 128 && !(i + lit + 1 < len && src[off + i + lit] === src[off + i + lit + 1])) lit++;
      out.push(lit - 1); for (let k = 0; k < lit; k++) out.push(src[off + i + k]); i += lit;
    }
    return out;
  }
  function rleChannel(plane, w, h) {
    const rows = []; let total = 0;
    for (let y = 0; y < h; y++) { const r = packRow(plane, y * w, w); rows.push(r); total += r.length; }
    const data = new Uint8Array(h * 2 + total); let p = 0;
    rows.forEach(r => { data[p++] = r.length >> 8; data[p++] = r.length & 255; });
    rows.forEach(r => { data.set(r, p); p += r.length; });
    return data;
  }
  function planes(img) {
    const n = img.w * img.h, out = [new Uint8Array(n), new Uint8Array(n), new Uint8Array(n), new Uint8Array(n)];
    for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) out[c][i] = img.d[i * 4 + c];
    return out;
  }

  PS.psdWrite = (doc) => {
    const w = new W(), Wd = doc.w, Hd = doc.h;
    w.str('8BPS'); w.u16(1); for (let i = 0; i < 6; i++) w.u8(0);
    w.u16(3); w.u32(Hd); w.u32(Wd); w.u16(8); w.u16(3);
    w.u32(0); // dados de modo de cor
    w.u32(0); // recursos de imagem
    // camadas e máscaras
    const lmPos = w.n; w.u32(0);
    const liPos = w.n; w.u32(0);
    w.i16(doc.layers.length);
    const chanData = [];
    for (const L of doc.layers) {
      // aplica a máscara no alfa (compatível com todos os leitores)
      let src = L.canvas;
      if (L.mask && L.maskEnabled) { const t = PS.cloneCanvas(src), tx = PS.ctx(t); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(L.mask, 0, 0); src = t; }
      const lw = src.width, lh = src.height, pl = planes(PS.getImg(src));
      const chans = [[-1, pl[3]], [0, pl[0]], [1, pl[1]], [2, pl[2]]].map(([id, p]) => ({ id, data: rleChannel(p, lw, lh) }));
      chanData.push(chans);
      w.i32(L.y); w.i32(L.x); w.i32(L.y + lh); w.i32(L.x + lw);
      w.u16(chans.length);
      chans.forEach(c => { w.i16(c.id); w.u32(c.data.length + 2); });
      w.str('8BIM'); w.str(BLEND_KEYS[L.blend] || 'norm');
      w.u8(Math.round(L.opacity * 255)); w.u8(0); w.u8(L.visible ? 0 : 2); w.u8(0);
      const exPos = w.n; w.u32(0);
      w.u32(0); // máscara
      w.u32(0); // faixas de mesclagem
      const name = latin(L.name); w.u8(name.length); w.str(name); while ((w.n - exPos - 4) % 4) w.u8(0);
      // nome Unicode (acentos)
      w.str('8BIM'); w.str('luni'); const uni = String(L.name).slice(0, 250), len = 4 + uni.length * 2, padLen = len + (len % 4 ? 4 - len % 4 : 0);
      w.u32(padLen); w.u32(uni.length); for (const ch of uni) w.u16(ch.charCodeAt(0)); for (let k = len; k < padLen; k++) w.u8(0);
      w.at(exPos, w.n - exPos - 4);
    }
    chanData.forEach(chans => chans.forEach(c => { w.u16(1); w.bytes(c.data); }));
    if ((w.n - liPos - 4) % 2) w.u8(0);
    w.at(liPos, w.n - liPos - 4);
    w.u32(0); // máscara global
    w.at(lmPos, w.n - lmPos - 4);
    // imagem mesclada (sobre branco, RLE)
    const flat = PS.canvas(Wd, Hd), fx = PS.ctx(flat); fx.fillStyle = '#fff'; fx.fillRect(0, 0, Wd, Hd); fx.drawImage(doc.composite(1), 0, 0);
    const fp = planes(PS.getImg(flat));
    w.u16(1);
    const rles = [0, 1, 2].map(c => { const rows = []; for (let y = 0; y < Hd; y++) rows.push(packRow(fp[c], y * Wd, Wd)); return rows; });
    rles.forEach(rows => rows.forEach(r => w.u16(r.length)));
    rles.forEach(rows => rows.forEach(r => w.bytes(r)));
    return new Blob([w.out()], { type: 'image/vnd.adobe.photoshop' });
  };

  /* ---------- leitura ---------- */
  PS.psdRead = async (buffer) => {
    const b = new Uint8Array(buffer), dv = new DataView(buffer); let p = 0;
    const u8 = () => b[p++], u16 = () => { const v = dv.getUint16(p); p += 2; return v; }, i16 = () => { const v = dv.getInt16(p); p += 2; return v; };
    const u32 = () => { const v = dv.getUint32(p); p += 4; return v; }, i32 = () => { const v = dv.getInt32(p); p += 4; return v; }, str = n => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(b[p++]); return s; };
    if (str(4) !== '8BPS') throw new Error('Arquivo PSD inválido.');
    const ver = u16(); if (ver !== 1) throw new Error('Arquivos PSB (documentos grandes) não são suportados.');
    p += 6; const nch = u16(), H = u32(), Wd = u32(), depth = u16(), mode = u16();
    if (depth !== 8) throw new Error(`Só PSD de 8 bits é suportado (este tem ${depth} bits).`);
    if (mode !== 3 && mode !== 1) throw new Error('Só PSD em RGB ou tons de cinza é suportado.');
    { const a = u32(); p += a; } { const a = u32(); p += a; }
    const lmLen = u32(), lmEnd = p + lmLen, layers = [];
    const unpack = (len, out, o0, n) => { const end = p + len; let o = o0; while (p < end && o < o0 + n) { let c = b[p++]; if (c > 127) c -= 256; if (c >= 0) { for (let k = 0; k <= c; k++) out[o++] = b[p++]; } else if (c !== -128) { const v = b[p++]; for (let k = 0; k < 1 - c; k++) out[o++] = v; } } p = end; };
    const readChannel = (w, h, size) => {
      const start = p, comp = u16(), n = w * h, out = new Uint8Array(n);
      if (comp === 0) { out.set(b.subarray(p, p + n)); }
      else if (comp === 1) { const lens = []; for (let y = 0; y < h; y++) lens.push(u16()); let o = 0; for (let y = 0; y < h; y++) { unpack(lens[y], out, o, w); o += w; } }
      else throw new Error('Este PSD usa compressão ZIP, que ainda não é suportada.');
      p = start + size; return out;
    };
    if (lmLen > 0) {
      const liLen = u32(), liEnd = p + liLen;
      if (liLen > 0) {
        let count = i16(); count = Math.abs(count);
        const recs = [];
        for (let i = 0; i < count; i++) {
          const top = i32(), left = i32(), bottom = i32(), right = i32(), nc = u16(), chans = [];
          for (let k = 0; k < nc; k++) chans.push({ id: i16(), len: u32() });
          str(4); const key = str(4), opacity = u8(); u8(); const flags = u8(); u8();
          const exLen = u32(), exEnd = p + exLen;
          { const a = u32(); p += a; } { const a = u32(); p += a; }
          const nl = u8(); let name = str(nl); while ((p - (exEnd - exLen)) % 4) p++;
          let isDivider = false;
          while (p + 12 <= exEnd) {
            const sig = str(4), k = str(4), len = u32(), e0 = p;
            if (k === 'luni') { const n = u32(); let s = ''; for (let j = 0; j < n; j++) s += String.fromCharCode(u16()); name = s.replace(/\0+$/, ''); }
            if (k === 'lsct' || k === 'lsdk') { const t = u32(); if (t === 3 || t === 1 || t === 2) isDivider = true; }
            p = e0 + len + (len % 2); if (sig !== '8BIM' && sig !== '8B64') break;
          }
          p = exEnd;
          recs.push({ top, left, w: right - left, h: bottom - top, chans, blend: KEY_BLENDS[key] || 'source-over', opacity: opacity / 255, visible: !(flags & 2), name, isDivider });
        }
        for (const r of recs) {
          const pl = {};
          for (const c of r.chans) {
            const isUserMask = c.id < -1;
            if (r.w <= 0 || r.h <= 0 || isUserMask) { p += c.len; continue; }
            pl[c.id] = readChannel(r.w, r.h, c.len);
          }
          if (r.w <= 0 || r.h <= 0 || r.isDivider) continue;
          const c = PS.canvas(r.w, r.h), id = new ImageData(r.w, r.h), n = r.w * r.h;
          for (let i = 0; i < n; i++) {
            const R = pl[0] ? pl[0][i] : 0;
            id.data[i * 4] = R; id.data[i * 4 + 1] = mode === 1 ? R : pl[1] ? pl[1][i] : 0; id.data[i * 4 + 2] = mode === 1 ? R : pl[2] ? pl[2][i] : 0;
            id.data[i * 4 + 3] = pl[-1] ? pl[-1][i] : 255;
          }
          PS.ctx(c).putImageData(id, 0, 0);
          layers.push({ canvas: c, name: r.name || 'Camada', x: r.left, y: r.top, opacity: r.opacity, blend: r.blend, visible: r.visible });
        }
      }
      p = lmEnd;
    }
    if (!layers.length) {
      // sem camadas: usa a imagem mesclada
      const comp = u16(), n = Wd * H, chans = [];
      if (comp === 1) { const lens = []; for (let c = 0; c < nch; c++) for (let y = 0; y < H; y++) lens.push(u16()); let li = 0; for (let c = 0; c < nch; c++) { const out = new Uint8Array(n); let o = 0; for (let y = 0; y < H; y++) { unpack(lens[li++], out, o, Wd); o += Wd; } chans.push(out); } }
      else if (comp === 0) { for (let c = 0; c < nch; c++) { chans.push(b.slice(p, p + n)); p += n; } }
      else throw new Error('Compressão de PSD não suportada.');
      const c = PS.canvas(Wd, H), id = new ImageData(Wd, H);
      for (let i = 0; i < n; i++) { id.data[i * 4] = chans[0][i]; id.data[i * 4 + 1] = (chans[1] || chans[0])[i]; id.data[i * 4 + 2] = (chans[2] || chans[0])[i]; id.data[i * 4 + 3] = nch > 3 && mode === 3 ? chans[3][i] : 255; }
      PS.ctx(c).putImageData(id, 0, 0);
      layers.push({ canvas: c, name: 'Fundo', x: 0, y: 0, opacity: 1, blend: 'source-over', visible: true });
    }
    return { w: Wd, h: H, layers };
  };
})();
