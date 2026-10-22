/* Prisma Studio — documento com camadas, máscaras, seleção, histórico e revelação não destrutiva. */
(function () {
  'use strict';
  const PS = window.PS, IP = window.PrismaImgProc;
  const PROXY_MAX = 1600;
  const HISTORY_BYTES = 900e6;

  const listeners = new Set();
  let uid = 1;
  const doc = PS.doc = {
    name: '', size: { w: 0, h: 0 }, layers: [], active: 0, editMask: false,
    sel: null, history: [], index: -1,
    params: IP.neutralParams(),
    proxy: null, proxyScale: 1, preview: null, overrideView: null,
    original: null, version: 0, fg: '#000000', bg: '#ffffff',
    get has() { return this.layers.length > 0; },
    get w() { return this.size.w; },
    get h() { return this.size.h; },
    get layer() { return this.layers[this.active] || null; },
    // alvo das edições de pixel: a camada ativa ou a máscara dela
    get base() { const L = this.layer; if (!L) return null; return this.editMask && L.mask ? L.mask : L.canvas; },
    set base(c) { const L = this.layer; if (!L) return; if (this.editMask && L.mask) L.mask = c; else L.canvas = c; L._dirty = true; },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(type) { listeners.forEach(fn => { try { fn(type); } catch (e) { console.error(e); } }); }
  };
  PS.BLENDS = [
    ['source-over', 'Normal'], ['multiply', 'Multiplicação'], ['screen', 'Divisão (tela)'], ['overlay', 'Sobrepor'],
    ['soft-light', 'Luz suave'], ['hard-light', 'Luz direta'], ['darken', 'Escurecer'], ['lighten', 'Clarear'],
    ['color-dodge', 'Subexposição de cores'], ['color-burn', 'Superexposição de cores'], ['difference', 'Diferença'],
    ['exclusion', 'Exclusão'], ['hue', 'Matiz'], ['saturation', 'Saturação'], ['color', 'Cor'], ['luminosity', 'Luminosidade']
  ];

  /* ---------- camadas ---------- */
  doc.makeLayer = (canvas, name, extra) => Object.assign({
    id: uid++, name: name || `Camada ${uid - 1}`, canvas, x: 0, y: 0, visible: true, opacity: 1,
    blend: 'source-over', mask: null, maskEnabled: true, type: 'raster', text: null, locked: false, _dirty: true
  }, extra || {});
  doc.layerById = id => doc.layers.find(l => l.id === id);
  doc.blankCanvas = () => PS.canvas(doc.w, doc.h);

  let proxyPyramid = [],
    proxyLayerId = null,
    proxyWidth = 0,
    proxyHeight = 0;
  const proxyMatches = () => doc.layer && proxyLayerId === doc.layer.id && proxyWidth === doc.layer.canvas.width && proxyHeight === doc.layer.canvas.height;
  function rebuildProxy(region = null) {
    const L = doc.layer;
    if (!L) {
      doc.proxy = null;
      proxyPyramid = [];
      proxyLayerId = null;
      return;
    }
    const src = L.canvas,
      s = Math.min(1, PROXY_MAX / Math.max(src.width, src.height));
    const pw = Math.max(1, Math.round(src.width * s)),
      ph = Math.max(1, Math.round(src.height * s));
    if (!region || !proxyMatches() || !doc.proxy || doc.proxy.width !== pw || doc.proxy.height !== ph) {
      proxyPyramid = [];
      let w = src.width,
        h = src.height;
      while (w / 2 >= pw && h / 2 >= ph) {
        w = Math.max(pw, Math.floor(w / 2));
        h = Math.max(ph, Math.floor(h / 2));
        proxyPyramid.push(PS.canvas(w, h));
      }
      proxyPyramid.push(PS.canvas(pw, ph));
      region = {
        x: 0,
        y: 0,
        w: src.width,
        h: src.height
      };
    }
    let previous = src,
      r = region;
    for (const c of proxyPyramid) {
      const sx = c.width / previous.width,
        sy = c.height / previous.height;
      // Expande o recorte em cada nível para incluir o suporte do filtro.
      const x = Math.max(0, Math.floor(r.x * sx) - 4),
        y = Math.max(0, Math.floor(r.y * sy) - 4);
      const x1 = Math.min(c.width, Math.ceil((r.x + r.w) * sx) + 4),
        y1 = Math.min(c.height, Math.ceil((r.y + r.h) * sy) + 4);
      const cx = PS.ctx(c);
      cx.save();
      cx.beginPath();
      cx.rect(x, y, x1 - x, y1 - y);
      cx.clip();
      cx.clearRect(x, y, x1 - x, y1 - y);
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(previous, 0, 0, c.width, c.height);
      cx.restore();
      previous = c;
      r = {
        x,
        y,
        w: x1 - x,
        h: y1 - y
      };
    }
    proxyLayerId = L.id;
    proxyWidth = src.width;
    proxyHeight = src.height;
    doc.proxyScale = s;
    doc.proxy = previous;
  }
  doc.rebuildProxy = rebuildProxy;

  /* ---------- composição ---------- */
  function maskedSource(L, src) {
    if (!L.mask || !L.maskEnabled || doc.editMask && L === doc.layer && doc.showMask) return src;
    const t = PS.canvas(src.width, src.height), x = PS.ctx(t);
    x.drawImage(src, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(L.mask, 0, 0, src.width, src.height);
    return t;
  }
  // desenha as camadas no contexto (que já deve ter a transformação imagem → destino)
  doc.drawLayers = (ctx, opts = {}) => {
    for (const L of doc.layers) {
      if (!L.visible) continue;
      let src = L.canvas;
      if (opts.substitute && opts.substitute.layer === L) src = opts.substitute.canvas;else if (opts.live && L === doc.layer) src = doc.overrideView || doc.preview || L.canvas;
      if (opts.live && doc.editMask && doc.showMask && L === doc.layer && L.mask) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.fillRect(L.x, L.y, L.canvas.width, L.canvas.height);
        ctx.drawImage(L.mask, L.x, L.y);
        ctx.restore();
        continue;
      }
      // Máscaras também são compostas em recortes locais durante um traço.
      let s,
        local = null;
      if (opts.region && L.mask && L.maskEnabled) {
        const r = opts.region,
          x = Math.max(0, Math.floor(r.x - L.x)),
          y = Math.max(0, Math.floor(r.y - L.y));
        const w = Math.min(L.canvas.width, Math.ceil(r.x + r.w - L.x)) - x,
          h = Math.min(L.canvas.height, Math.ceil(r.y + r.h - L.y)) - y;
        if (w <= 0 || h <= 0) continue;
        s = PS.canvas(w, h);
        const tx = PS.ctx(s);
        tx.drawImage(src, 0, 0, src.width, src.height, -x, -y, L.canvas.width, L.canvas.height);
        tx.globalCompositeOperation = 'destination-in';
        tx.drawImage(L.mask, -x, -y);
        local = {
          x,
          y,
          w,
          h
        };
      } else s = maskedSource(L, src);
      ctx.save();
      ctx.globalAlpha = L.opacity;
      ctx.globalCompositeOperation = L.blend;
      if (local) ctx.drawImage(s, L.x + local.x, L.y + local.y);else ctx.drawImage(s, L.x, L.y, L.canvas.width, L.canvas.height);
      ctx.restore();
    }
  };
  doc.composite = (scale = 1, opts = {}) => {
    const c = PS.canvas(doc.w * scale, doc.h * scale), x = PS.ctx(c);
    x.imageSmoothingQuality = 'high';
    x.scale(c.width / doc.w, c.height / doc.h);
    doc.drawLayers(x, opts);
    return c;
  };
  let flatCache = { key: '', c: null };
  doc.flat = () => {
    const key = String(doc.version);
    if (flatCache.key !== key) flatCache = { key, c: doc.layers.length === 1 && isPlain(doc.layers[0]) ? doc.layers[0].canvas : doc.composite(1) };
    return flatCache.c;
  };
  const isPlain = L => L.visible && L.opacity === 1 && L.blend === 'source-over' && !L.mask && L.x === 0 && L.y === 0 && L.canvas.width === doc.w && L.canvas.height === doc.h;
  doc.liveSmall = (max = 360) => { const s = Math.min(1, max / Math.max(doc.w, doc.h)); return doc.composite(s, { live: true }); };

  /* ---------- carregar / novo ---------- */
  function reset(w, h, name) {
    doc.size = { w, h }; doc.name = name; doc.layers = []; doc.active = 0; doc.editMask = false; doc.showMask = false;
    doc.sel = null; doc.params = IP.neutralParams(); doc.preview = null; doc.overrideView = null;
  }
  function finishLoad() {
    doc.history = []; doc.index = -1;
    snapshot('Abrir imagem', 'fa-folder-open');
    doc.original = doc.composite(1);
    doc.version++; rebuildProxy();
    doc.emit('load'); doc.emit('layers'); doc.emit('selection');
  }
  doc.load = (source, name) => {
    const w = source.naturalWidth || source.width, h = source.naturalHeight || source.height;
    // Preserva todos os pixels; a capacidade real é verificada antes de trocar o documento.
    const c = PS.checkedCanvas(w, h), x = PS.ctx(c);
    x.imageSmoothingQuality = 'high'; x.drawImage(source, 0, 0, c.width, c.height);
    reset(c.width, c.height, (name || 'imagem').replace(/\.[a-z0-9]+$/i, ''));
    doc.layers = [doc.makeLayer(c, 'Fundo')];
    finishLoad();
  };
  doc.newDocument = (w, h, fill, name) => {
    w = Math.round(w); h = Math.round(h);
    const c = PS.checkedCanvas(w, h);
    reset(w, h, name || 'sem-titulo');
    if (fill && fill !== 'transparent') { const x = PS.ctx(c); x.fillStyle = fill; x.fillRect(0, 0, w, h); }
    doc.layers = [doc.makeLayer(c, fill === 'transparent' ? 'Camada 1' : 'Fundo')];
    finishLoad();
  };
  // carrega um projeto já montado (lista de camadas)
  doc.loadLayers = (w, h, layers, name, active) => {
    reset(w, h, name || 'projeto');
    doc.layers = layers.map(l => doc.makeLayer(l.canvas, l.name, l));
    doc.active = PS.clamp(active ?? doc.layers.length - 1, 0, doc.layers.length - 1);
    finishLoad();
  };

  /* ---------- histórico de comandos ----------
   * Uma sombra do estado corrente permite manter commit() após a mutação.
   * Ela é única, não cresce com os passos. Os comandos retêm somente deltas.
   * ImageData evita perdas por alfa pré-multiplicado em sucessivos undo/redo.
   */
  const TILE = 256;
  let baseline = null,
    shadows = new Map();
  const metaKeys = ['id', 'name', 'x', 'y', 'visible', 'opacity', 'blend', 'maskEnabled', 'type', 'text', 'locked'];
  const copy = v => v == null ? v : JSON.parse(JSON.stringify(v));
  function metadata() {
    return {
      size: {
        ...doc.size
      },
      active: doc.active,
      layers: doc.layers.map(L => {
        const m = {};
        metaKeys.forEach(k => {
          m[k] = copy(L[k]);
        });
        m.dim = [L.canvas.width, L.canvas.height];
        m.maskDim = L.mask ? [L.mask.width, L.mask.height] : null;
        return m;
      })
    };
  }
  const targetKey = (id, kind) => id + ':' + kind;
  function syncShadows(reuse = false) {
    const previous = shadows;
    shadows = new Map();
    doc.layers.forEach(L => ['canvas', 'mask'].forEach(kind => {
      if (L[kind]) {
        const key = targetKey(L.id, kind),
          old = reuse && previous.get(key);
        shadows.set(key, {
          canvas: old ? old.canvas : PS.cloneCanvas(L[kind]),
          source: L[kind]
        });
      }
    }));
    baseline = metadata();
    doc.layers.forEach(L => {
      L._dirty = false;
    });
  }
  function snapshot(label, icon) {
    syncShadows();
    doc.history = [{
      label,
      icon: icon || 'fa-folder-open',
      bytes: 0,
      do() {},
      undo() {}
    }];
    doc.index = 0;
  }
  // Recorta o menor retângulo diferente de cada bloco, sem manter blocos vazios.
  function diffTarget(id, kind, before, after, patches, region) {
    const sameSize = before && after && before.width === after.width && before.height === after.height;
    const W = Math.max(before?.width || 0, after?.width || 0),
      H = Math.max(before?.height || 0, after?.height || 0);
    const startX = sameSize && region ? Math.max(0, Math.floor(region.x / TILE) * TILE) : 0;
    const startY = sameSize && region ? Math.max(0, Math.floor(region.y / TILE) * TILE) : 0;
    const endX = sameSize && region ? Math.min(W, region.x + region.w) : W;
    const endY = sameSize && region ? Math.min(H, region.y + region.h) : H;
    for (let y = startY; y < endY; y += TILE) for (let x = startX; x < endX; x += TILE) {
      const read = c => c && x < c.width && y < c.height ? PS.ctx(c).getImageData(x, y, Math.min(TILE, c.width - x), Math.min(TILE, c.height - y)) : null;
      let a = read(before),
        b = read(after),
        dx = x,
        dy = y;
      if (sameSize) {
        const aa = new Uint32Array(a.data.buffer),
          bb = new Uint32Array(b.data.buffer);
        let x0 = a.width,
          y0 = a.height,
          x1 = -1,
          y1 = -1;
        for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) {
          const px = i % a.width,
            py = Math.floor(i / a.width);
          x0 = Math.min(x0, px);
          x1 = Math.max(x1, px);
          y0 = Math.min(y0, py);
          y1 = Math.max(y1, py);
        }
        if (x1 < 0) continue;
        dx += x0;
        dy += y0;
        const crop = img => {
          const out = new ImageData(x1 - x0 + 1, y1 - y0 + 1);
          for (let row = 0; row < out.height; row++) out.data.set(img.data.subarray(((y0 + row) * img.width + x0) * 4, ((y0 + row) * img.width + x1 + 1) * 4), row * out.width * 4);
          return out;
        };
        a = crop(a);
        b = crop(b);
      }
      patches.push({
        id,
        kind,
        x: dx,
        y: dy,
        before: a,
        after: b
      });
    }
  }
  function restoreState(state, patches, side) {
    const live = new Map(doc.layers.map(L => [L.id, L]));
    doc.size = {
      ...state.size
    };
    doc.layers = state.layers.map(m => {
      const L = live.get(m.id) || {};
      metaKeys.forEach(k => {
        L[k] = copy(m[k]);
      });
      if (!L.canvas || L.canvas.width !== m.dim[0] || L.canvas.height !== m.dim[1]) L.canvas = PS.canvas(...m.dim);
      if (!m.maskDim) L.mask = null;else if (!L.mask || L.mask.width !== m.maskDim[0] || L.mask.height !== m.maskDim[1]) L.mask = PS.canvas(...m.maskDim);
      L._dirty = false;
      return L;
    });
    const byId = new Map(doc.layers.map(L => [L.id, L]));
    for (const L of doc.layers) for (const kind of ['canvas', 'mask']) {
      const c = L[kind],
        key = targetKey(L.id, kind),
        old = shadows.get(key);
      if (!c) shadows.delete(key);else if (!old || old.canvas.width !== c.width || old.canvas.height !== c.height) shadows.set(key, {
        canvas: PS.canvas(c.width, c.height),
        source: c
      });
    }
    patches.forEach(p => {
      const c = byId.get(p.id)?.[p.kind],
        img = p[side];
      if (c && img) {
        PS.ctx(c).putImageData(img, p.x, p.y);
        PS.ctx(shadows.get(targetKey(p.id, p.kind)).canvas).putImageData(img, p.x, p.y);
      }
    });
    doc.active = PS.clamp(state.active, 0, doc.layers.length - 1);
    if (doc.editMask && !doc.layer?.mask) doc.editMask = false;
  }
  function command(label, icon, before, after, patches) {
    // A conta inclui os buffers efetivamente retidos e os metadados serializados.
    const states = new TextEncoder().encode(JSON.stringify([before, after]));
    const bytes = patches.reduce((n, p) => n + (p.before?.data.byteLength || 0) + (p.after?.data.byteLength || 0), 0) + states.byteLength;
    // Retém o buffer contabilizado em vez de duas árvores de objetos invisíveis à conta.
    before = after = null;
    return {
      label,
      icon: icon || 'fa-pen',
      bytes,
      patches,
      do() {
        restoreState(JSON.parse(new TextDecoder().decode(states))[1], patches, 'after');
      },
      undo() {
        restoreState(JSON.parse(new TextDecoder().decode(states))[0], patches, 'before');
      }
    };
  }
  Object.defineProperty(doc, 'historyBytes', {
    get: () => doc.history.reduce((n, c) => n + c.bytes, 0)
  });
  // Memória de trabalho fixa da ponte commit(): não cresce com o número de passos.
  Object.defineProperty(doc, 'historyWorkingBytes', {
    get: () => [...shadows.values()].reduce((n, s) => n + s.canvas.width * s.canvas.height * 4, 0)
  });
  doc.historyLimit = HISTORY_BYTES;
  // region é opcional, em coordenadas locais do alvo, e só limita a leitura de pixels.
  doc.commit = (label, icon, scope = 'layer', region = null) => {
    if (!baseline) {
      snapshot(label, icon);
      return;
    }
    const after = metadata(),
      patches = [],
      present = new Set();
    for (const L of doc.layers) for (const kind of ['canvas', 'mask']) {
      const key = targetKey(L.id, kind),
        old = shadows.get(key),
        c = L[kind];
      present.add(key);
      const pixelChange = scope === 'all' || scope === 'layer' && L === doc.layer || L._dirty || old?.source !== c;
      if (!pixelChange) continue;
      const area = region && L === doc.layer && kind === (doc.editMask ? 'mask' : 'canvas') ? region : null;
      diffTarget(L.id, kind, old?.canvas, c, patches, area);
      if (c) {
        if (!old || old.canvas.width !== c.width || old.canvas.height !== c.height) shadows.set(key, {
          canvas: PS.cloneCanvas(c),
          source: c
        });else {
          for (const p of patches) if (p.id === L.id && p.kind === kind && p.after) PS.ctx(old.canvas).putImageData(p.after, p.x, p.y);
          old.source = c;
        }
      } else shadows.delete(key);
    }
    for (const [key, old] of shadows) if (!present.has(key)) {
      const [id, kind] = key.split(':');
      diffTarget(+id, kind, old.canvas, null, patches);
      shadows.delete(key);
    }
    const cmd = command(label, icon, baseline, after, patches);
    doc.history.splice(doc.index + 1);
    doc.history.push(cmd);
    doc.index = doc.history.length - 1;
    baseline = after;
    doc.layers.forEach(L => {
      L._dirty = false;
    });
    // O primeiro item é uma âncora. Evictar só o prefixo preserva a cadeia linear.
    while (doc.historyBytes > doc.historyLimit && doc.history.length > 1) {
      doc.history.splice(0, 2, {
        label: 'Estado anterior (limite de memória)',
        icon: 'fa-clock',
        bytes: 0,
        do() {},
        undo() {}
      });
      doc.index--;
    }
    changed(patches);
  };
  function changed(patches = []) {
    doc.version++;
    const areas = patches.filter(p => p.id === doc.layer?.id && p.kind === 'canvas').map(p => ({
      x: p.x,
      y: p.y,
      w: p.after?.width || p.before?.width || 0,
      h: p.after?.height || p.before?.height || 0
    }));
    if (!proxyMatches() || !doc.proxy) rebuildProxy();else if (areas.length) {
      const x = Math.min(...areas.map(r => r.x)),
        y = Math.min(...areas.map(r => r.y));
      rebuildProxy({
        x,
        y,
        w: Math.max(...areas.map(r => r.x + r.w)) - x,
        h: Math.max(...areas.map(r => r.y + r.h)) - y
      });
    }
    doc.preview = null;
    doc.requestPreview();
    doc.emit('change');
    doc.emit('layers');
  }
  doc.replace = (canvas, label, icon) => {
    doc.base = canvas;
    doc.commit(label, icon);
  };
  doc.goto = i => {
    if (!Number.isInteger(i) || i < 0 || i >= doc.history.length || i === doc.index) return;
    const patches = [];
    while (doc.index > i) {
      patches.push(...doc.history[doc.index].patches);
      doc.history[doc.index].undo();
      doc.index--;
    }
    while (doc.index < i) {
      patches.push(...doc.history[doc.index + 1].patches);
      doc.history[doc.index + 1].do();
      doc.index++;
    }
    syncShadows(true);
    changed(patches);
    if (doc.sel && (doc.sel.canvas.width !== doc.w || doc.sel.canvas.height !== doc.h)) doc.setSelection(null);
  };
  doc.undo = () => doc.goto(doc.index - 1);
  doc.redo = () => doc.goto(doc.index + 1);
  doc.canUndo = () => doc.index > 0;
  doc.canRedo = () => doc.index < doc.history.length - 1;

  /* ---------- operações de camadas ---------- */
  doc.setActive = i => {
    i = PS.clamp(i, 0, doc.layers.length - 1);
    if (i === doc.active) return;
    if (doc.hasDevelop()) { PS.toast('Aplique ou descarte os ajustes em prévia antes de trocar de camada.', 'warning'); return; }
    doc.active = i; doc.editMask = false; doc.showMask = false; doc.overrideView = null; doc.preview = null;
    rebuildProxy(); doc.emit('layers'); doc.emit('active');
  };
  doc.addLayer = (canvas, name, extra, label) => {
    const L = doc.makeLayer(canvas || doc.blankCanvas(), name || `Camada ${doc.layers.length + 1}`, extra);
    doc.layers.splice(doc.active + 1, 0, L);
    doc.active = doc.active + 1; doc.editMask = false;
    doc.commit(label || 'Nova camada', 'fa-layer-group');
    return L;
  };
  doc.duplicateLayer = () => {
    const L = doc.layer; if (!L) return;
    const n = doc.makeLayer(PS.cloneCanvas(L.canvas), L.name + ' cópia', { x: L.x, y: L.y, opacity: L.opacity, blend: L.blend, visible: L.visible, mask: L.mask ? PS.cloneCanvas(L.mask) : null, type: L.type, text: L.text ? { ...L.text } : null });
    doc.layers.splice(doc.active + 1, 0, n); doc.active++;
    doc.commit('Duplicar camada', 'fa-clone');
  };
  doc.deleteLayer = () => {
    if (doc.layers.length <= 1) { PS.toast('O documento precisa de pelo menos uma camada.', 'info'); return; }
    doc.layers.splice(doc.active, 1); doc.active = Math.max(0, doc.active - 1); doc.editMask = false;
    doc.commit('Excluir camada', 'fa-trash', 'meta');
  };
  doc.moveLayer = (from, to) => {
    to = PS.clamp(to, 0, doc.layers.length - 1); if (from === to) return;
    const [L] = doc.layers.splice(from, 1); doc.layers.splice(to, 0, L); doc.active = to;
    doc.commit('Reorganizar camadas', 'fa-arrows-up-down', 'meta');
  };
  doc.setLayerProp = (L, k, v, label) => { L[k] = v; doc.version++; doc.emit('change'); doc.emit('layers'); if (label) doc.commit(label, 'fa-sliders', 'meta'); };
  // rasteriza a camada no tamanho do documento (posição 0,0, máscara aplicada)
  function layerToDocCanvas(L, applyMask = true) {
    const c = doc.blankCanvas(), x = PS.ctx(c);
    x.drawImage(applyMask ? maskedSource(L, L.canvas) : L.canvas, L.x, L.y);
    return c;
  }
  doc.mergeDown = () => {
    const i = doc.active; if (i <= 0) { PS.toast('Não há camada abaixo para mesclar.', 'info'); return; }
    const top = doc.layers[i], bottom = doc.layers[i - 1];
    const c = layerToDocCanvas(bottom), x = PS.ctx(c);
    if (top.visible) { x.globalAlpha = top.opacity; x.globalCompositeOperation = top.blend; x.drawImage(maskedSource(top, top.canvas), top.x, top.y); }
    Object.assign(bottom, { canvas: c, x: 0, y: 0, mask: null, type: 'raster', text: null, _dirty: true });
    doc.layers.splice(i, 1); doc.active = i - 1;
    doc.commit('Mesclar abaixo', 'fa-object-group', 'meta');
  };
  doc.mergeVisible = () => {
    const c = doc.composite(1);
    const keep = doc.layers.filter(l => !l.visible);
    const L = doc.makeLayer(c, 'Mesclada');
    doc.layers = [...keep, L]; doc.active = doc.layers.length - 1; doc.editMask = false;
    doc.commit('Mesclar visíveis', 'fa-object-group', 'meta');
  };
  doc.flatten = () => {
    const c = doc.blankCanvas(), x = PS.ctx(c); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(doc.composite(1), 0, 0);
    doc.layers = [doc.makeLayer(c, 'Fundo')]; doc.active = 0; doc.editMask = false;
    doc.commit('Achatar imagem', 'fa-layer-group', 'meta');
  };
  doc.rasterizeLayer = (L = doc.layer, silent) => {
    if (!L || L.type !== 'text') return;
    L.type = 'raster'; L.text = null; L._dirty = true;
    if (!silent) doc.commit('Rasterizar texto', 'fa-font');
  };
  // máscaras
  doc.addMask = (fromSelection) => {
    const L = doc.layer; if (!L) return;
    const m = PS.canvas(L.canvas.width, L.canvas.height), x = PS.ctx(m);
    if (fromSelection && doc.sel) x.drawImage(doc.sel.canvas, -L.x, -L.y);
    else { x.fillStyle = '#fff'; x.fillRect(0, 0, m.width, m.height); }
    L.mask = m; L.maskEnabled = true; doc.editMask = true;
    doc.commit(fromSelection ? 'Máscara a partir da seleção' : 'Adicionar máscara', 'fa-mask');
  };
  doc.applyMask = () => {
    const L = doc.layer; if (!L || !L.mask) return;
    L.canvas = maskedSource(Object.assign({}, L, { maskEnabled: true }), L.canvas); L.mask = null; doc.editMask = false;
    doc.commit('Aplicar máscara', 'fa-mask');
  };
  doc.deleteMask = () => { const L = doc.layer; if (!L || !L.mask) return; L.mask = null; doc.editMask = false; doc.commit('Excluir máscara', 'fa-mask'); };
  doc.invertMask = () => {
    const L = doc.layer; if (!L || !L.mask) return;
    const m = PS.canvas(L.mask.width, L.mask.height), x = PS.ctx(m); x.fillStyle = '#fff'; x.fillRect(0, 0, m.width, m.height);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(L.mask, 0, 0); L.mask = m; doc.commit('Inverter máscara', 'fa-mask');
  };

  // aplica uma transformação de tela inteira em todas as camadas (girar, espelhar, recortar, redimensionar)
  doc.transformAll = (newW, newH, fn, label, icon) => {
    for (const L of doc.layers) {
      const r = fn(L);
      L.canvas = r.canvas; L.x = r.x; L.y = r.y; if (L.mask) L.mask = r.mask || null; L._dirty = true;
      if (L.type === 'text' && r.rasterize !== false) { L.type = 'raster'; L.text = null; }
    }
    doc.size = { w: Math.round(newW), h: Math.round(newH) };
    if (doc.sel) doc.setSelection(null);
    doc.commit(label, icon, 'all');
  };

  /* ---------- seleção ---------- */
  // sel = { canvas (alfa = seleção), segs (contorno para as “formigas”), bounds }
  doc.setSelection = canvas => {
    if (!canvas) { doc.sel = null; doc.emit('selection'); return; }
    const s = Math.min(1, 1100 / Math.max(doc.w, doc.h));
    const sw = Math.max(1, Math.round(doc.w * s)), sh = Math.max(1, Math.round(doc.h * s));
    const small = PS.canvas(sw, sh); PS.ctx(small).drawImage(canvas, 0, 0, sw, sh);
    const a = PS.ctx(small).getImageData(0, 0, sw, sh).data;
    const at = (x, y) => (x < 0 || y < 0 || x >= sw || y >= sh) ? 0 : a[(y * sw + x) * 4 + 3] > 127 ? 1 : 0;
    const segs = []; let minx = Infinity, miny = Infinity, maxx = -1, maxy = -1;
    const kx = doc.w / sw, ky = doc.h / sh;
    for (let y = 0; y <= sh; y++) for (let x = 0; x <= sw; x++) {
      const v = at(x, y);
      if (v) { if (x < minx) minx = x; if (y < miny) miny = y; if (x > maxx) maxx = x; if (y > maxy) maxy = y; }
      if (v !== at(x - 1, y)) segs.push(x * kx, y * ky, x * kx, (y + 1) * ky);
      if (v !== at(x, y - 1)) segs.push(x * kx, y * ky, (x + 1) * kx, y * ky);
    }
    if (maxx < 0) { doc.sel = null; doc.emit('selection'); PS.toast('A seleção ficou vazia.', 'info'); return; }
    doc.sel = { canvas, segs: Float32Array.from(segs), bounds: { x: Math.floor(minx * kx), y: Math.floor(miny * ky), w: Math.ceil((maxx - minx + 1) * kx), h: Math.ceil((maxy - miny + 1) * ky) } };
    doc.emit('selection');
  };
  doc.selectAll = () => { const c = doc.blankCanvas(), x = PS.ctx(c); x.fillStyle = '#fff'; x.fillRect(0, 0, doc.w, doc.h); doc.setSelection(c); };
  doc.deselect = () => doc.setSelection(null);
  doc.invertSelection = () => {
    const c = doc.blankCanvas(), x = PS.ctx(c); x.fillStyle = '#fff'; x.fillRect(0, 0, doc.w, doc.h);
    if (doc.sel) { x.globalCompositeOperation = 'destination-out'; x.drawImage(doc.sel.canvas, 0, 0); }
    doc.setSelection(c);
  };
  // combina uma nova forma com a seleção atual: mode = new | add | subtract | intersect
  doc.combineSelection = (shape, mode) => {
    if (mode === 'new' || !doc.sel) { doc.setSelection(shape); return; }
    const c = PS.cloneCanvas(doc.sel.canvas), x = PS.ctx(c);
    x.globalCompositeOperation = mode === 'add' ? 'source-over' : mode === 'subtract' ? 'destination-out' : 'destination-in';
    x.drawImage(shape, 0, 0); doc.setSelection(c);
  };
  doc.selMaskFor = L => { if (!doc.sel) return null; const m = PS.canvas(L.canvas.width, L.canvas.height); PS.ctx(m).drawImage(doc.sel.canvas, -L.x, -L.y); return m; };
  // mistura “processado” sobre “original” apenas dentro da seleção (interpolação exata em alfa pré-multiplicado)
  doc.throughSelection = (L, original, processed) => {
    if (!doc.sel || original.width !== processed.width || original.height !== processed.height) return processed;
    const m = doc.selMaskFor(L);
    const r = PS.cloneCanvas(original), rx = PS.ctx(r);
    rx.globalCompositeOperation = 'destination-out'; rx.drawImage(m, 0, 0);
    const t = PS.cloneCanvas(processed), tx = PS.ctx(t);
    tx.globalCompositeOperation = 'destination-in'; tx.drawImage(m, 0, 0);
    rx.globalCompositeOperation = 'lighter'; rx.drawImage(t, 0, 0);
    return r;
  };
  doc.selectionMaskImg = () => doc.sel ? PS.getImg(doc.sel.canvas) : null;

  /* ---------- revelação (ajustes ao vivo na camada ativa) ---------- */
  doc.hasDevelop = () => !IP.isNeutral(doc.params);
  let devBusy = false, devQueued = false, previewRevision = 0;
  function selPreview(res) {
    // limita a prévia à seleção (em escala de prévia)
    if (!doc.sel) return res;
    const L = doc.layer, m = PS.canvas(res.width, res.height), mx = PS.ctx(m);
    mx.scale(res.width / L.canvas.width, res.height / L.canvas.height); mx.drawImage(doc.sel.canvas, -L.x, -L.y);
    const r = PS.cloneCanvas(doc.proxy), rx = PS.ctx(r);
    rx.globalCompositeOperation = 'destination-out'; rx.drawImage(m, 0, 0);
    const t = PS.cloneCanvas(res), tx = PS.ctx(t); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(m, 0, 0);
    rx.globalCompositeOperation = 'lighter'; rx.drawImage(t, 0, 0);
    return r;
  }
  doc.selPreview = selPreview;
  doc.requestPreview = () => {
    const revision = ++previewRevision;
    if (!doc.proxy) return;
    if (!doc.hasDevelop()) {
      doc.preview = null;
      doc.emit('preview');
      return;
    }
    const accelerated = PS.gpuPreview?.render(doc.proxy, doc.params, doc.version);
    if (accelerated) {
      doc.preview = selPreview(accelerated);
      doc.emit('preview');
      return;
    }
    if (devBusy) {
      devQueued = true;
      return;
    }
    devBusy = true;
    devQueued = false;
    const ver = doc.version,
      params = JSON.parse(JSON.stringify(doc.params));
    PS.run('develop', {
      img: PS.getImg(doc.proxy),
      params,
      scale: doc.proxyScale
    }).then(res => {
      if (ver === doc.version && revision === previewRevision && doc.hasDevelop()) {
        doc.preview = selPreview(PS.putImg(res));
        doc.emit('preview');
      }
    }).catch(err => {
      console.error(err);
      PS.toast('Falha ao calcular a prévia: ' + err.message, 'error');
    }).finally(() => {
      devBusy = false;
      if (devQueued) doc.requestPreview();
    });
  };
  doc.setParam = (key, value) => { doc.params[key] = value; doc.requestPreview(); doc.emit('params'); };
  doc.setParams = p => { doc.params = Object.assign(IP.neutralParams(), p); doc.requestPreview(); doc.emit('params'); };
  doc.renderFullLayer = async (onProgress) => {
    const L = doc.layer;
    const res = await PS.run('develop', { img: PS.getImg(L.canvas), params: doc.params, scale: 1 }, onProgress);
    return doc.throughSelection(L, L.canvas, PS.putImg(res));
  };
  doc.applyDevelop = async () => {
    if (!doc.hasDevelop()) return;
    if (doc.layer.type === 'text') doc.rasterizeLayer(doc.layer, true);
    await PS.withBusy('Aplicando ajustes', `Camada “${doc.layer.name}” em resolução total.`, async () => {
      const c = await doc.renderFullLayer();
      doc.params = IP.neutralParams(); doc.preview = null;
      doc.layer.canvas = c; doc.layer._dirty = true;
      doc.commit('Ajustes de luz e cor', 'fa-sliders');
      doc.emit('params');
    });
    PS.toast('Ajustes aplicados.', 'success');
  };
  doc.discardDevelop = () => { doc.params = IP.neutralParams(); doc.preview = null; doc.emit('params'); doc.emit('preview'); };
  doc.ensureFlat = async () => { if (doc.hasDevelop()) await doc.applyDevelop(); };
  // texto vira pixels antes de edições de pixel
  doc.ensureRaster = () => { const L = doc.layer; if (L && L.type === 'text') { doc.rasterizeLayer(L, true); PS.toast('A camada de texto foi rasterizada para edição de pixels.', 'info'); } };

  // imagem final (todas as camadas + ajustes pendentes)
  let finalCache = { key: '', canvas: null };
  doc.finalCanvas = async (onProgress) => {
    if (!doc.has) return null;
    if (!doc.hasDevelop()) return doc.flat();
    const key = doc.version + JSON.stringify(doc.params) + doc.active;
    if (finalCache.key === key) return finalCache.canvas;
    const sub = await doc.renderFullLayer(onProgress);
    const c = doc.composite(1, { substitute: { layer: doc.layer, canvas: sub } });
    finalCache = { key, canvas: c };
    return c;
  };

  // operação do motor na camada (ou máscara) ativa, respeitando a seleção
  doc.process = async (op, args, label, icon, busyTitle, opts = {}) => {
    await doc.ensureFlat();
    doc.ensureRaster();
    const L = doc.layer, target = doc.base;
    let out;
    await PS.withBusy(busyTitle || label, `${PS.fmtInt(target.width)} × ${PS.fmtInt(target.height)} px`, async prog => {
      const res = await PS.run(op, Object.assign({ img: PS.getImg(target) }, args), prog);
      out = PS.putImg(res);
    });
    if (out.width === target.width && out.height === target.height && !opts.ignoreSelection) out = doc.throughSelection(L, target, out);
    else if (out.width !== target.width || out.height !== target.height) {
      // mudou de tamanho: ajusta a tela do documento quando é camada única
      if (doc.layers.length === 1 && L.x === 0 && L.y === 0 && !doc.editMask) {
        doc.size = { w: out.width, h: out.height }; if (L.mask) L.mask = null; if (doc.sel) doc.setSelection(null);
      }
    }
    doc.replace(out, label, icon);
    return out;
  };

  /* ---------- imagem de exemplo ---------- */
  doc.sample = () => {
    const w = 2400, h = 1600, c = PS.canvas(w, h), x = PS.ctx(c);
    const sky = x.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, '#1d3b6e'); sky.addColorStop(0.55, '#e0745a'); sky.addColorStop(1, '#ffc56b');
    x.fillStyle = sky; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,236,190,.95)'; x.beginPath(); x.arc(w * 0.68, h * 0.5, 120, 0, Math.PI * 2); x.fill();
    const layers = [['#4a3a5c', 0.55, 0.0018, 90], ['#33294a', 0.64, 0.0026, 70], ['#1f1a33', 0.74, 0.0035, 55]];
    for (const [col, base, f, amp] of layers) {
      x.fillStyle = col; x.beginPath(); x.moveTo(0, h);
      for (let px = 0; px <= w; px += 8) x.lineTo(px, h * base + Math.sin(px * f) * amp + Math.sin(px * f * 3.7) * amp * 0.35);
      x.lineTo(w, h); x.closePath(); x.fill();
    }
    const lake = x.createLinearGradient(0, h * 0.8, 0, h);
    lake.addColorStop(0, '#d9785f'); lake.addColorStop(1, '#1b2a4a');
    x.fillStyle = lake; x.fillRect(0, h * 0.82, w, h * 0.18);
    const id = x.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    x.putImageData(id, 0, 0);
    doc.load(c, 'exemplo');
  };
})();
