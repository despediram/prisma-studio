/* Prisma Studio — utilidades compartilhadas (DOM, avisos, worker, arquivos). */
(function () {
  'use strict';
  const PS = window.PS = window.PS || {};

  PS.$ = (sel, root) => (root || document).querySelector(sel);
  PS.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  PS.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  PS.MM_PER_INCH = 25.4;
  PS.PT_PER_MM = 72 / 25.4;
  PS.nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
  PS.sleep = ms => new Promise(r => setTimeout(r, ms));

  PS.fmt = (v, dec = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  PS.fmtInt = v => Math.round(v).toLocaleString('pt-BR');
  PS.bytes = b => {
    if (!Number.isFinite(b) || b <= 0) return '0 KB';
    const u = ['B', 'KB', 'MB', 'GB'], i = Math.min(3, Math.floor(Math.log(b) / Math.log(1024)));
    return `${PS.fmt(b / 1024 ** i, i ? 1 : 0)} ${u[i]}`;
  };
  PS.escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Avisos (toast) ---------- */
  PS.toast = (msg, type = 'info', ms = 3400) => {
    const host = PS.$('#toasts');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icon = { success: 'fa-circle-check', error: 'fa-circle-exclamation', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' }[type] || 'fa-circle-info';
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span></span>`;
    el.querySelector('span').textContent = msg;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ms);
  };

  /* ---------- Progresso bloqueante ---------- */
  let busyDepth = 0;
  PS.busy = {
    show(title, detail) {
      busyDepth++;
      const o = PS.$('#busy');
      o.hidden = false;
      PS.$('#busyTitle').textContent = title || 'Processando…';
      PS.$('#busyDetail').textContent = detail || '';
      this.set(0, true);
    },
    set(p, indeterminate) {
      const bar = PS.$('#busyBar');
      bar.classList.toggle('indeterminate', !!indeterminate);
      bar.style.width = indeterminate ? '' : `${Math.round(PS.clamp(p, 0, 1) * 100)}%`;
      PS.$('#busyPct').textContent = indeterminate ? '' : `${Math.round(PS.clamp(p, 0, 1) * 100)}%`;
    },
    detail(t) { PS.$('#busyDetail').textContent = t; },
    hide() { busyDepth = Math.max(0, busyDepth - 1); if (!busyDepth) PS.$('#busy').hidden = true; }
  };
  PS.withBusy = async (title, detail, fn) => {
    PS.busy.show(title, detail);
    await PS.nextFrame(); await PS.nextFrame();
    try { return await fn(p => PS.busy.set(p)); }
    finally { PS.busy.hide(); }
  };

  /* ---------- Caixa de diálogo genérica ---------- */
  PS.dialog = ({ title, body, okText = 'Aplicar', cancelText = 'Cancelar', wide = false, onOpen }) => new Promise(resolve => {
    const dlg = PS.$('#dialog');
    dlg.classList.toggle('wide', wide);
    PS.$('#dialogTitle').textContent = title;
    const content = PS.$('#dialogBody');
    content.innerHTML = '';
    if (typeof body === 'string') content.innerHTML = body; else content.appendChild(body);
    PS.$('#dialogOk').textContent = okText;
    PS.$('#dialogCancel').textContent = cancelText;
    PS.$('#dialogCancel').hidden = !cancelText;
    const done = ok => { dlg.close(); cleanup(); resolve(ok ? content : null); };
    const okH = e => { e.preventDefault(); done(true); };
    const cancelH = () => done(false);
    const closeH = () => { if (dlg.open) return; cleanup(); resolve(null); };
    function cleanup() {
      PS.$('#dialogOk').removeEventListener('click', okH);
      PS.$('#dialogCancel').removeEventListener('click', cancelH);
      dlg.removeEventListener('close', closeH);
    }
    PS.$('#dialogOk').addEventListener('click', okH);
    PS.$('#dialogCancel').addEventListener('click', cancelH);
    dlg.addEventListener('close', closeH);
    dlg.showModal();
    if (onOpen) onOpen(content);
  });

  /* ---------- Worker (criado a partir de Blob para funcionar em file://) ---------- */
  let worker = null, workerFailed = false, seq = 0;
  const pending = new Map();
  function getWorker() {
    if (worker || workerFailed) return worker;
    try {
      const src = `${PrismaImgProcFactory.toString()}\n${PrismaImgProcExtra.toString()}\n${PrismaWorkerMain.toString()}\nPrismaWorkerMain(self);`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = e => {
        const { id, result, error, progress } = e.data, job = pending.get(id);
        if (!job) return;
        if (progress != null) { if (job.onProgress) job.onProgress(progress); return; }
        pending.delete(id);
        if (error) job.reject(new Error(error)); else job.resolve(result);
      };
      worker.onerror = e => {
        console.warn('Worker falhou, usando a thread principal.', e);
        workerFailed = true; worker = null;
        pending.forEach(j => j.reject(new Error('O processamento em segundo plano falhou. Tente de novo.')));
        pending.clear();
      };
    } catch (err) { console.warn(err); workerFailed = true; worker = null; }
    return worker;
  }
  // Executa uma operação do motor; imagens em args são copiadas para não invalidar o original.
  PS.run = (op, args, onProgress) => {
    const w = getWorker();
    const transfer = [];
    const copy = {};
    for (const k of Object.keys(args)) {
      const v = args[k];
      if (v && v.d instanceof Uint8ClampedArray) {
        const d = new Uint8ClampedArray(v.d); copy[k] = { w: v.w, h: v.h, d }; transfer.push(d.buffer);
      } else copy[k] = v;
    }
    if (!w) {
      // fallback síncrono
      const P = window.PrismaImgProc, E = window.PrismaImgExtra;
      return new Promise((resolve, reject) => setTimeout(() => {
        try {
          const a = copy;
          const map = {
            develop: () => P.develop(a.img, a.params, a.scale), autoParams: () => P.autoParams(a.img), histogram: () => P.histogram(a.img),
            resize: () => P.resize(a.img, a.w, a.h, onProgress), upscale: () => P.upscale(a.img, a.factor, a.opts, onProgress),
            enhanceDetail: () => P.enhanceDetail(a.img, a.amount, a.radius), smartSharpen: () => P.smartSharpen(a.img, a.amount, a.radius, a.threshold),
            denoise: () => P.denoise(a.img, a.strength, a.chroma, a.preserve), filter: () => P.filter(a.img, a.name, a.amount, a.opt),
            perspective: () => P.perspective(a.img, a.quad, a.w, a.h, onProgress), inpaint: () => P.inpaint(a.img, a.mask),
            colorMask: () => P.colorMask(a.img, a.x, a.y, a.tolerance, a.contiguous, a.feather), trimBounds: () => P.trimBounds(a.img, a.tol),
            adjust: () => E.adjust(a.img, a.name, a.params), fx: () => E.fx(a.img, a.name, a.params, onProgress),
            superResolve: () => E.superResolve(a.img, a.w, a.h, a.strength, onProgress), floodMask: () => E.floodMask(a.img, a.x, a.y, a.tolerance, a.contiguous, a.antialias),
            alphaBounds: () => E.alphaBounds(a.img), backgroundMask: () => E.backgroundMask(a.img,a.opts,onProgress),
            redEye: () => E.redEye(a.img, a.x, a.y, a.radius, a.strength)
          };
          resolve(map[op]());
        } catch (e) { reject(e); }
      }, 0));
    }
    return new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject, onProgress });
      w.postMessage({ id, op, args: copy }, transfer);
    });
  };

  /* ---------- Canvas ---------- */
  PS.canvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  PS.imageSize = window.PrismaImageSize;
  PS.checkedCanvas = (w, h) => PS.imageSize.create(w, h);
  PS.ctx = (c, opts) => c.getContext('2d', Object.assign({ willReadFrequently: false }, opts || {}));
  PS.cloneCanvas = src => { const c = PS.canvas(src.width, src.height); PS.ctx(c).drawImage(src, 0, 0); return c; };
  PS.getImg = (c, x = 0, y = 0, w = c.width, h = c.height) => {
    const id = PS.ctx(c).getImageData(x, y, w, h);
    return { w: id.width, h: id.height, d: id.data };
  };
  PS.putImg = (img, target) => {
    const c = target || PS.canvas(img.w, img.h);
    if (c.width !== img.w || c.height !== img.h) { c.width = img.w; c.height = img.h; }
    PS.ctx(c).putImageData(new ImageData(img.d, img.w, img.h), 0, 0);
    return c;
  };
  // Redução de alta qualidade: divide pela metade em etapas antes do passo final.
  PS.downscale = (src, w, h) => {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    let cur = src, cw = src.width, ch = src.height;
    while (cw / 2 >= w && ch / 2 >= h) {
      const nw = Math.max(w, Math.floor(cw / 2)), nh = Math.max(h, Math.floor(ch / 2));
      const c = PS.canvas(nw, nh), x = PS.ctx(c);
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.drawImage(cur, 0, 0, nw, nh); cur = c; cw = nw; ch = nh;
    }
    const out = PS.canvas(w, h), ctx = PS.ctx(out);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, w, h);
    return out;
  };
  PS.canvasToBlob = (c, type = 'image/png', q) => new Promise((res, rej) => {
    try { c.toBlob(b => b ? res(b) : rej(new Error('O navegador não conseguiu gerar o arquivo da imagem.')), type, q); } catch (e) { rej(e); }
  });
  PS.loadImageFile = file => new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type || '') && !/\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(file.name || '')) return rej(new Error('Esse arquivo não é uma imagem que o navegador consiga abrir.'));
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Não foi possível decodificar essa imagem. Tente PNG, JPG ou WEBP.')); };
    img.src = url;
  });

  /* ---------- Metadados de DPI ---------- */
  function crc32(bytes) {
    let c = -1;
    for (let i = 0; i < bytes.length; i++) { c ^= bytes[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); }
    return (c ^ -1) >>> 0;
  }
  const u32 = (b, o, v) => { b[o] = v >>> 24 & 255; b[o + 1] = v >>> 16 & 255; b[o + 2] = v >>> 8 & 255; b[o + 3] = v & 255; };
  PS.setPngDpi = async (blob, dpi) => {
    const b = new Uint8Array(await blob.arrayBuffer());
    if (b[0] !== 137 || b[1] !== 80) return blob;
    // remove pHYs existente e insere um novo logo após o IHDR
    const chunk = new Uint8Array(21);
    u32(chunk, 0, 9); chunk.set([112, 72, 89, 115], 4);
    const ppm = Math.round(dpi / 0.0254); u32(chunk, 8, ppm); u32(chunk, 12, ppm); chunk[16] = 1;
    u32(chunk, 17, crc32(chunk.subarray(4, 17)));
    const out = new Uint8Array(b.length + 21);
    out.set(b.subarray(0, 33), 0); out.set(chunk, 33); out.set(b.subarray(33), 54);
    return new Blob([out], { type: 'image/png' });
  };
  PS.setJpegDpi = async (blob, dpi) => {
    const b = new Uint8Array(await blob.arrayBuffer());
    if (b[0] !== 0xFF || b[1] !== 0xD8) return blob;
    const d = Math.round(dpi);
    if (b[2] === 0xFF && b[3] === 0xE0 && b[6] === 0x4A && b[7] === 0x46) {
      b[13] = 1; b[14] = d >> 8; b[15] = d & 255; b[16] = d >> 8; b[17] = d & 255;
      return new Blob([b], { type: 'image/jpeg' });
    }
    const app0 = new Uint8Array([0xFF, 0xE0, 0, 16, 0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 1, d >> 8, d & 255, d >> 8, d & 255, 0, 0]);
    const out = new Uint8Array(b.length + app0.length);
    out.set(b.subarray(0, 2), 0); out.set(app0, 2); out.set(b.subarray(2), 2 + app0.length);
    return new Blob([out], { type: 'image/jpeg' });
  };
  PS.readPngSize = async blob => {
    const h = new Uint8Array(await blob.slice(0, 24).arrayBuffer());
    const r = i => ((h[i] << 24) >>> 0) + (h[i + 1] << 16) + (h[i + 2] << 8) + h[i + 3];
    return { w: r(16), h: r(20) };
  };

  PS.download = (blob, name) => {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  PS.copyText = async text => {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) { /* fallback */ }
    const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; } t.remove(); return ok;
  };

  // Liga rótulos de valor a sliders e permite duplo clique para zerar.
  PS.bindRange = (input, onInput, format) => {
    const out = input.parentElement.querySelector('output') || PS.$(`output[for="${input.id}"]`);
    const show = () => { if (out) out.textContent = format ? format(+input.value) : input.value; };
    input.addEventListener('input', () => { show(); onInput(+input.value, false); });
    input.addEventListener('change', () => onInput(+input.value, true));
    input.addEventListener('dblclick', () => { input.value = input.dataset.default ?? input.defaultValue ?? 0; show(); onInput(+input.value, true); });
    show();
    return { set(v) { input.value = v; show(); } };
  };
})();
