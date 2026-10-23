/* Prisma Studio — vista do editor: zoom, pan, composição das camadas, seleção, grade e entrada de ponteiro. */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc;
  const stage = PS.$('#stage'), cv = PS.$('#view'), ctx = cv.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d');

  const view = PS.view = {
    zoom: 1, panX: 0, panY: 0, dpr: 1, cssW: 0, cssH: 0,
    compare: false, split: 0.5, grid: false, gridSize: 0, pixelGrid: true,
    drawImageOverride: null, panning: false, spaceDown: false, antsOffset: 0
  };

  let checker = null;
  function makeChecker() {
    const s = getComputedStyle(document.documentElement);
    const a = s.getPropertyValue('--checker-a').trim() || '#2a2d31', b = s.getPropertyValue('--checker-b').trim() || '#34383d';
    const c = PS.canvas(16, 16), x = PS.ctx(c);
    x.fillStyle = a; x.fillRect(0, 0, 16, 16); x.fillStyle = b; x.fillRect(0, 0, 8, 8); x.fillRect(8, 8, 8, 8);
    checker = ctx.createPattern(c, 'repeat');
  }
  view.themeChanged = () => { makeChecker(); view.render(); };

  function resize() {
    const r = stage.getBoundingClientRect();
    view.dpr = window.devicePixelRatio || 1;
    view.cssW = r.width; view.cssH = r.height;
    cv.width = Math.max(1, Math.round(r.width * view.dpr));
    cv.height = Math.max(1, Math.round(r.height * view.dpr));
    view.render();
  }
  new ResizeObserver(() => { const wasFit = view.isFit; resize(); if (wasFit) view.fit(); }).observe(stage);

  view.toImage = (clientX, clientY) => {
    const r = cv.getBoundingClientRect();
    return { x: (clientX - r.left - view.panX) / view.zoom, y: (clientY - r.top - view.panY) / view.zoom };
  };
  view.toScreen = (x, y) => ({ x: x * view.zoom + view.panX, y: y * view.zoom + view.panY });

  view.fit = () => {
    if (!doc.has) return;
    const mobile=matchMedia('(max-width:860px)').matches,pad=mobile?14:40,footer=mobile?48:70;
    const top = 58;
    const z = Math.min((view.cssW - pad * 2) / doc.w, Math.max(24, view.cssH - top - pad * 2 - footer) / doc.h);
    view.zoom = PS.clamp(z, 0.01, 64);
    view.panX = (view.cssW - doc.w * view.zoom) / 2;
    view.panY = top + Math.max(0, (view.cssH - top - footer - doc.h * view.zoom) / 2);
    view.isFit = true;
    view.render(); updateZoomUI();
  };
  view.setZoom = (z, cx, cy) => {
    z = PS.clamp(z, 0.01, 64);
    if (cx == null) { cx = view.cssW / 2; cy = view.cssH / 2; }
    const ix = (cx - view.panX) / view.zoom, iy = (cy - view.panY) / view.zoom;
    view.zoom = z; view.panX = cx - ix * z; view.panY = cy - iy * z;
    view.isFit = false;
    view.render(); updateZoomUI();
  };
  const STEPS = [0.02, 0.03, 0.05, 0.08, 0.1, 0.125, 0.167, 0.25, 0.333, 0.5, 0.667, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
  view.zoomStep = (dir, cx, cy) => {
    const z = view.zoom;
    const next = dir > 0 ? STEPS.find(s => s > z * 1.01) || 64 : [...STEPS].reverse().find(s => s < z / 1.01) || 0.02;
    view.setZoom(next, cx, cy);
  };
  function updateZoomUI() { PS.$('#zLabel').textContent = `${Math.round(view.zoom * 100)}%`; }
  view.setInfo = text => { PS.$('#zInfo').textContent = text; };

  let raf = 0,
    fullComposition = true,
    dirtyRegion = null;
  // Atualiza a composição somente onde pixels mudaram; overlays usam a tela já composta.
  view.render = region => {
    if (!region) {
      fullComposition = true;
      dirtyRegion = null;
    } else if (!fullComposition) {
      if (!dirtyRegion) dirtyRegion = {
        ...region
      };else {
        const x = Math.min(dirtyRegion.x, region.x),
          y = Math.min(dirtyRegion.y, region.y);
        dirtyRegion = {
          x,
          y,
          w: Math.max(dirtyRegion.x + dirtyRegion.w, region.x + region.w) - x,
          h: Math.max(dirtyRegion.y + dirtyRegion.h, region.y + region.h) - y
        };
      }
    }
    if (!raf) raf = requestAnimationFrame(draw);
  };
  view.renderOverlay = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };
  function draw() {
    raf = 0;
    if (stage.closest('main')?.hidden) return; // Não compõe o editor enquanto outra área está aberta.
    const d = view.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!doc.has) return;
    if (!checker) makeChecker();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    const x = view.panX, y = view.panY, w = doc.w * view.zoom, h = doc.h * view.zoom;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
    ctx.fillStyle = checker; ctx.fillRect(x, y, w, h); ctx.restore();
    if (view.drawImageOverride) view.drawImageOverride(ctx);
    else {
      // composição em uma tela fora da vista (para os modos de mesclagem não interagirem com o xadrez)
      if (off.width !== cv.width || off.height !== cv.height) {
        off.width = cv.width;
        off.height = cv.height;
        fullComposition = true;
      }
      if (fullComposition || dirtyRegion) {
        // A margem cobre a interpolação de pixels no zoom fracionário.
        const area = fullComposition ? {
          x: 0,
          y: 0,
          w: off.width,
          h: off.height
        } : {
          x: Math.max(0, Math.floor((x + dirtyRegion.x * view.zoom) * d) - 3),
          y: Math.max(0, Math.floor((y + dirtyRegion.y * view.zoom) * d) - 3),
          w: Math.ceil(dirtyRegion.w * view.zoom * d) + 6,
          h: Math.ceil(dirtyRegion.h * view.zoom * d) + 6
        };
        const region = fullComposition ? null : {
          x: (area.x / d - x) / view.zoom,
          y: (area.y / d - y) / view.zoom,
          w: area.w / d / view.zoom,
          h: area.h / d / view.zoom
        };
        octx.setTransform(1, 0, 0, 1, 0, 0);
        octx.save();
        octx.beginPath();
        octx.rect(area.x, area.y, area.w, area.h);
        octx.clip();
        octx.clearRect(area.x, area.y, area.w, area.h);
        octx.setTransform(d * view.zoom, 0, 0, d * view.zoom, d * x, d * y);
        octx.imageSmoothingEnabled = view.zoom < 2;
        octx.imageSmoothingQuality = 'high';
        octx.beginPath();
        octx.rect(0, 0, doc.w, doc.h);
        octx.clip();
        doc.drawLayers(octx, {
          live: true,
          region
        });
        octx.restore();
        view.lastCompositionRegion = region;
        fullComposition = false;
        dirtyRegion = null;
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(off, 0, 0); ctx.restore();
      if (view.compare && doc.original) {
        const sx = x + w * view.split;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, Math.max(0, sx - x), h); ctx.clip();
        ctx.fillStyle = checker; ctx.fillRect(x, y, w, h);
        const o = doc.original;
        if (o.width === doc.w && o.height === doc.h) { ctx.imageSmoothingEnabled = view.zoom < 2; ctx.drawImage(o, x, y, w, h); }
        else { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x, y, w, h); }
        ctx.restore();
        ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx, y + h / 2, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        label('Original', x + 10, y + 10, 'left'); label('Editada', x + w - 10, y + 10, 'right');
      }
    }
    // grade de pixels em zoom alto
    if (view.pixelGrid && view.zoom >= 12) {
      ctx.save(); ctx.strokeStyle = 'rgba(128,128,128,.35)'; ctx.lineWidth = 1; ctx.beginPath();
      const x0 = Math.max(0, Math.floor(-x / view.zoom)), x1 = Math.min(doc.w, Math.ceil((view.cssW - x) / view.zoom));
      const y0 = Math.max(0, Math.floor(-y / view.zoom)), y1 = Math.min(doc.h, Math.ceil((view.cssH - y) / view.zoom));
      for (let i = x0; i <= x1; i++) { const sx = Math.round(x + i * view.zoom) + 0.5; ctx.moveTo(sx, y + y0 * view.zoom); ctx.lineTo(sx, y + y1 * view.zoom); }
      for (let j = y0; j <= y1; j++) { const sy = Math.round(y + j * view.zoom) + 0.5; ctx.moveTo(x + x0 * view.zoom, sy); ctx.lineTo(x + x1 * view.zoom, sy); }
      ctx.stroke(); ctx.restore();
    }
    // grade de composição
    if (view.grid) {
      const step = view.gridSize || Math.max(8, Math.round(Math.max(doc.w, doc.h) / 12));
      ctx.save(); ctx.strokeStyle = 'rgba(0,167,225,.45)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = step; i < doc.w; i += step) { const sx = Math.round(x + i * view.zoom) + 0.5; ctx.moveTo(sx, y); ctx.lineTo(sx, y + h); }
      for (let j = step; j < doc.h; j += step) { const sy = Math.round(y + j * view.zoom) + 0.5; ctx.moveTo(x, sy); ctx.lineTo(x + w, sy); }
      ctx.stroke(); ctx.restore();
    }
    // limites da camada ativa quando ela não ocupa a tela toda
    const L = doc.layer;
    if (L && (L.x !== 0 || L.y !== 0 || L.canvas.width !== doc.w || L.canvas.height !== doc.h) && PS.tools && ['move', 'transform'].includes(PS.tools.current)) {
      ctx.save(); ctx.strokeStyle = 'rgba(0,167,225,.8)'; ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + L.x * view.zoom, y + L.y * view.zoom, L.canvas.width * view.zoom, L.canvas.height * view.zoom); ctx.restore();
    }
    // “formigas” da seleção
    if (doc.sel) {
      const s = doc.sel.segs, z = view.zoom;
      ctx.save(); ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < s.length; i += 4) { ctx.moveTo(x + s[i] * z, y + s[i + 1] * z); ctx.lineTo(x + s[i + 2] * z, y + s[i + 3] * z); }
      ctx.strokeStyle = '#000'; ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.lineDashOffset = view.antsOffset; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.restore();
    }
    if (PS.tools && PS.tools.drawOverlay) PS.tools.drawOverlay(ctx, view);
  }
  function label(text, x, y, align) {
    ctx.save(); ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = align; ctx.textBaseline = 'top';
    const m = ctx.measureText(text).width, bx = align === 'right' ? x - m - 16 : x;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.roundRect(bx, y, m + 16, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(text, align === 'right' ? x - 8 : x + 8, y + 5); ctx.restore();
  }
  // animação das formigas (só enquanto existe seleção)
  setInterval(() => { if (doc.sel && !document.hidden) { view.antsOffset = (view.antsOffset + 1) % 8; view.renderOverlay(); } }, 120);

  /* ---------- informações do cursor ---------- */
  const infoEl = PS.$('#zCursor');
  let infoT = 0, eCursorTouch = false;
  function cursorInfo(p) {
    if (!infoEl) return;
    if (!p || p.x < 0 || p.y < 0 || p.x >= doc.w || p.y >= doc.h) { infoEl.textContent = ''; return; }
    const now = performance.now(); if (now - infoT < 60) return; infoT = now;
    if (PS.toolContext?.drag || eCursorTouch) { infoEl.textContent = `x ${Math.floor(p.x)}, y ${Math.floor(p.y)}`; return; }
    const L = doc.layer, lx = Math.floor(p.x - L.x), ly = Math.floor(p.y - L.y);
    let rgb = '';
    if (lx >= 0 && ly >= 0 && lx < L.canvas.width && ly < L.canvas.height) {
      const dd = PS.ctx(L.canvas).getImageData(lx, ly, 1, 1).data;
      rgb = ` · R${dd[0]} G${dd[1]} B${dd[2]}${dd[3] < 255 ? ` A${Math.round(dd[3] / 2.55)}%` : ''}`;
    }
    infoEl.textContent = `x ${Math.floor(p.x)}, y ${Math.floor(p.y)}${rgb}`;
  }

  /* ---------- entrada ---------- */
  const pointers = new Map();
  let pinch = null, panStart = null, toolDown = false, splitDrag = false;
  function startPan(e) { view.panning = true; stage.classList.add('panning'); panStart = { x: e.clientX, y: e.clientY, px: view.panX, py: view.panY }; }
  cv.addEventListener('pointerdown', e => {
    if (!doc.has) return;
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      if (toolDown && PS.tools.cancelStroke) PS.tools.cancelStroke();
      if (toolDown) PS.tools.pointer('cancel', e, view.toImage(e.clientX, e.clientY));
      toolDown = false;
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: view.zoom, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, px: view.panX, py: view.panY };
      return;
    }
    if (view.compare && e.button === 0) {
      const r = cv.getBoundingClientRect(), sx = view.panX + doc.w * view.zoom * view.split;
      if (Math.abs(e.clientX - r.left - sx) < 14) { splitDrag = true; return; }
    }
    const tool = PS.tools.current;
    if (e.button === 1 || e.button === 2 || view.spaceDown || tool === 'hand') { e.preventDefault(); startPan(e); return; }
    if (e.button !== 0) return;
    toolDown = true;
    PS.tools.pointer('down', e, view.toImage(e.clientX, e.clientY));
  });
  cv.addEventListener('pointermove', e => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = cv.getBoundingClientRect();
      const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
      const z = PS.clamp(pinch.z * d / pinch.d, 0.01, 64);
      const ix = (pinch.cx - r.left - pinch.px) / pinch.z, iy = (pinch.cy - r.top - pinch.py) / pinch.z;
      view.zoom = z; view.panX = cx - ix * z; view.panY = cy - iy * z; view.isFit = false;
      view.render(); updateZoomUI(); return;
    }
    if (splitDrag) { const p = view.toImage(e.clientX, e.clientY); view.split = PS.clamp(p.x / doc.w, 0, 1); view.render(); return; }
    if (view.panning && panStart) {
      view.panX = panStart.px + e.clientX - panStart.x; view.panY = panStart.py + e.clientY - panStart.y;
      view.isFit = false; view.render(); return;
    }
    if (!doc.has) return;
    const p = view.toImage(e.clientX, e.clientY);
    eCursorTouch = e.pointerType === 'touch';
    cursorInfo(p);
    // eventos combinados (caneta/mouse rápido) deixam o traço mais fiel
    if (toolDown && ['brush','eraser','clone','heal','retouch','tone','liquify'].includes(PS.tools.current) && e.getCoalescedEvents) {
      const evs = e.getCoalescedEvents();
      if (evs.length > 1) { for (const ce of evs) PS.tools.pointer('drag', ce, view.toImage(ce.clientX, ce.clientY)); return; }
    }
    PS.tools.pointer(toolDown ? 'drag' : 'hover', e, p);
  });
  const end = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    splitDrag = false;
    if (view.panning) { view.panning = false; stage.classList.remove('panning'); panStart = null; return; }
    if (toolDown) { toolDown = false; if(e.type === 'pointercancel' && PS.toolContext?.stroke) PS.tools.cancelStroke(); else PS.tools.pointer(e.type === 'pointercancel' ? 'cancel' : 'up', e, view.toImage(e.clientX, e.clientY)); }
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', e => { cursorInfo(null); if (!toolDown) PS.tools.pointer('leave', e, null); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('dblclick', e => PS.tools.pointer('dblclick', e, view.toImage(e.clientX, e.clientY)));
  cv.addEventListener('wheel', e => {
    if (!doc.has) return;
    e.preventDefault();
    const r = cv.getBoundingClientRect(), cx = e.clientX - r.left, cy = e.clientY - r.top;
    if (e.shiftKey) { view.panX -= e.deltaY; view.panY -= e.deltaX; view.isFit = false; view.render(); return; }
    const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : e.ctrlKey ? 0.01 : 0.0018));
    view.setZoom(view.zoom * k, cx, cy);
  }, { passive: false });

  PS.$('#zIn').addEventListener('click', () => view.zoomStep(1));
  PS.$('#zOut').addEventListener('click', () => view.zoomStep(-1));
  PS.$('#zFit').addEventListener('click', () => view.fit());
  PS.$('#zLabel').addEventListener('click', () => view.fit());
  PS.$('#z100').addEventListener('click', () => view.setZoom(1));

  let lastDocumentSize = '';
  doc.on(type => {
    const size = doc.w + 'x' + doc.h, resized = size !== lastDocumentSize;
    lastDocumentSize = size;
    if (type === 'load') { resize(); view.fit(); }
    else if (resized && view.isFit) view.fit();
    else view.render();
  });
  resize();
})();
