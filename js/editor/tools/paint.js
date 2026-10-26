/* Prisma Studio — motor compartilhado de carimbos, composição e correção. Scripts clássicos para funcionar offline via file://. */
(function () {
  'use strict';

  const PS = window.PS,
    C = PS.toolContext;
  const {
    doc,
    IP,
    EX,
    T,
    S,
    stage,
    optsEl,
    hintEl
  } = C;
  C.stroke = null;
  C.stampCache = new Map();
  C.softStamp = function (diam, hardness, color) {
    diam = Math.max(1, Math.round(diam));
    const key = `${diam}|${hardness}|${color}`;
    if (C.stampCache.has(key)) return C.stampCache.get(key);
    const c = PS.canvas(diam, diam),
      x = PS.ctx(c),
      r = diam / 2;
    const g = x.createRadialGradient(r, r, 0, r, r, r),
      h = PS.clamp(hardness / 100, 0, 0.99);
    const rgb = parseInt(color.slice(1), 16),
      rr = rgb >> 16 & 255,
      gg = rgb >> 8 & 255,
      bb = rgb & 255;
    g.addColorStop(0, color);
    g.addColorStop(h, color);
    g.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
    x.fillStyle = g;
    x.beginPath();
    x.arc(r, r, r, 0, Math.PI * 2);
    x.fill();
    if (C.stampCache.size > 60) C.stampCache.clear();
    C.stampCache.set(key, c);
    return c;
  };
  C.effectCanvas = function (src, tool) {
    const s = S[tool],
      k = s.strength / 100,
      c = PS.canvas(src.width, src.height),
      x = PS.ctx(c);
    if (tool === 'retouch' && s.mode === 'sharpen') {
      const res = IP.smartSharpen(PS.getImg(src), 60 + 140 * k, 1.2, 2);
      return PS.putImg(res);
    }
    const f = tool === 'retouch' ? `blur(${Math.max(1, s.size * (0.03 + 0.12 * k))}px)` : s.mode === 'dodge' ? `brightness(${1 + 0.45 * k}) saturate(${1 - 0.1 * k})` : s.mode === 'burn' ? `brightness(${1 - 0.4 * k}) saturate(${1 + 0.15 * k})` : s.mode === 'saturate' ? `saturate(${1 + 1.2 * k})` : `saturate(${1 - k})`;
    x.filter = f;
    x.drawImage(src, 0, 0);
    return c;
  };
  C.PAINT = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone'];
  C.beginStroke = function (p, kind, e) {
    const s = S[kind],
      target = doc.base;
    const tiled = kind === 'brush' || kind === 'eraser' || kind === 'tone';
    C.stroke = {
      kind,
      last: p,
      raw: p,
      tiled,
      tiles: tiled ? new Map() : null,
      distance: 0,
      snapshot: tiled ? null : PS.cloneCanvas(target),
      layer: tiled ? null : PS.canvas(target.width, target.height),
      bbox: {
        x0: Infinity,
        y0: Infinity,
        x1: -Infinity,
        y1: -Infinity
      },
      size: s.size,
      offset: null,
      selMask: !tiled && doc.sel ? doc.selMaskFor(doc.layer) : null,
      pressure: e && e.pointerType === 'pen' && e.pressure ? e.pressure : 1
    };
    if (kind === 'clone') {
      if (!C.cloneSrc) {
        PS.toast('Defina a origem primeiro: Alt + clique (ou toque longo) no ponto que será copiado.', 'warning');
        C.stroke = null;
        return;
      }
      C.stroke.offset = {
        x: C.cloneSrc.x - p.x,
        y: C.cloneSrc.y - p.y
      };
    }
    if (kind === 'retouch' && s.mode === 'smudge') {
      C.stroke.smudge = null;
    } else if (!tiled && (kind === 'retouch' || kind === 'tone')) C.stroke.effect = C.effectCanvas(C.stroke.snapshot, kind);
    const q = C.toLayer(p);
    C.stamp(q.x, q.y);
    C.compositeStroke();
  };
  C.stamp = function (x, y) {
    const st = C.stroke,
      s = S[st.kind],
      pr = st.kind === 'brush' && s.pressure ? Math.max(0.1, st.pressure) : 1;
    const d = Math.max(1, st.size * pr),
      r = d / 2,
      lx = st.tiled ? null : PS.ctx(st.layer);
    st.bbox.x0 = Math.min(st.bbox.x0, x - r - 2);
    st.bbox.y0 = Math.min(st.bbox.y0, y - r - 2);
    st.bbox.x1 = Math.max(st.bbox.x1, x + r + 2);
    st.bbox.y1 = Math.max(st.bbox.y1, y + r + 2);
    if (st.tiled) {
      C.stampTiles(st, x, y, d);
      return;
    }
    const masking = doc.editMask;
    if (st.kind === 'brush') lx.drawImage(C.softStamp(d, s.hardness, masking ? '#ffffff' : doc.fg), x - r, y - r);else if (st.kind === 'eraser') lx.drawImage(C.softStamp(d, s.hardness, '#000000'), x - r, y - r);else if (st.kind === 'heal') lx.drawImage(C.softStamp(d, 100, '#e6007e'), x - r, y - r);else if (st.kind === 'clone' || st.kind === 'retouch' || st.kind === 'tone') {
      const D = Math.ceil(d),
        tmp = PS.canvas(D, D),
        tx = PS.ctx(tmp);
      if (st.kind === 'retouch' && S.retouch.mode === 'smudge') {
        // borrar: carrega a cor do ponto anterior e mistura com o que está embaixo
        const under = PS.canvas(D, D),
          ux = PS.ctx(under);
        ux.drawImage(doc.base, x - r, y - r, D, D, 0, 0, D, D);
        if (st.smudge) {
          ux.globalAlpha = 0.35 + 0.6 * S.retouch.strength / 100;
          ux.drawImage(st.smudge, 0, 0);
        }
        st.smudge = under;
        tx.drawImage(under, 0, 0);
      } else {
        const src = st.kind === 'clone' ? st.snapshot : st.effect,
          ox = st.offset ? st.offset.x : 0,
          oy = st.offset ? st.offset.y : 0;
        tx.drawImage(src, x + ox - r, y + oy - r, D, D, 0, 0, D, D);
      }
      tx.globalCompositeOperation = 'destination-in';
      tx.drawImage(C.softStamp(D, s.hardness, '#000000'), 0, 0);
      lx.drawImage(tmp, x - r, y - r);
      if (st.kind === 'retouch' && S.retouch.mode === 'smudge') {
        C.compositeStroke();
      }
    }
  };
  C.strokeTo = function (p, e) {
    const st = C.stroke;
    if (e && e.pointerType === 'pen' && e.pressure) st.pressure = e.pressure;
    // suavização (estabilizador)
    const sm = st.kind === 'brush' || st.kind === 'eraser' ? (S[st.kind].smoothing || 0) / 100 * 0.85 : 0;
    const target = {
      x: st.raw.x + (p.x - st.raw.x) * (1 - sm),
      y: st.raw.y + (p.y - st.raw.y) * (1 - sm)
    };
    if (st.tiled) {
      const a = C.toLayer(st.raw),
        b = C.toLayer(target),
        dx = b.x - a.x,
        dy = b.y - a.y,
        dist = Math.hypot(dx, dy);
      const spacing = Math.max(1, st.size * (S[st.kind].spacing ?? 12) / 100);
      if (dist > 0) {
        let step = spacing - st.distance;
        for (; step <= dist; step += spacing) C.stamp(a.x + dx * step / dist, a.y + dy * step / dist);
        st.distance = (st.distance + dist) % spacing;
      }
      st.raw = target;
      st.last = target;
      C.compositeStroke();
      return;
    }
    st.raw = target;
    const a = C.toLayer(st.last),
      b = C.toLayer(target),
      dx = b.x - a.x,
      dy = b.y - a.y,
      dist = Math.hypot(dx, dy);
    const spacing = Math.max(1, st.size * (st.kind === 'retouch' && S.retouch.mode === 'smudge' ? 0.08 : 0.12));
    if (dist < spacing) return;
    const n = Math.floor(dist / spacing);
    for (let i = 1; i <= n; i++) C.stamp(a.x + dx * i / n, a.y + dy * i / n);
    st.last = {
      x: a.x + dx * n / n + doc.layer.x,
      y: a.y + dy * n / n + doc.layer.y
    };
    C.compositeStroke();
  };
  C.compositeStroke = function () {
    const st = C.stroke;
    if (!st || st.kind === 'heal') {
      PS.view.render();
      return;
    }
    if (st.tiled) {
      C.compositeTiles(st);
      return;
    }
    const target = doc.base,
      W = target.width,
      H = target.height;
    const b = st.bbox,
      x0 = Math.max(0, Math.floor(b.x0)),
      y0 = Math.max(0, Math.floor(b.y0));
    const x1 = Math.min(W, Math.ceil(b.x1)),
      y1 = Math.min(H, Math.ceil(b.y1)),
      w = x1 - x0,
      h = y1 - y0;
    if (w <= 0 || h <= 0) return;
    let src = st.layer,
      sx = x0,
      sy = y0;
    if (st.selMask) {
      const t = PS.canvas(w, h),
        tx = PS.ctx(t);
      tx.drawImage(st.layer, x0, y0, w, h, 0, 0, w, h);
      tx.globalCompositeOperation = 'destination-in';
      tx.drawImage(st.selMask, x0, y0, w, h, 0, 0, w, h);
      src = t;
      sx = 0;
      sy = 0;
    }
    const bx = PS.ctx(target);
    bx.save();
    bx.clearRect(x0, y0, w, h);
    bx.drawImage(st.snapshot, x0, y0, w, h, x0, y0, w, h);
    const s = S[st.kind];
    bx.globalAlpha = (s.opacity ?? 100) / 100;
    let erase = st.kind === 'eraser';
    if (doc.editMask && st.kind === 'brush') erase = C.lum(doc.fg) < 0.5;
    if (doc.editMask && st.kind === 'eraser') erase = false;
    if (erase) bx.globalCompositeOperation = 'destination-out';
    if (doc.editMask && st.kind === 'eraser') {
      // borracha na máscara = revelar (pinta branco)
      const t = PS.canvas(w, h),
        tx = PS.ctx(t);
      tx.drawImage(src, sx, sy, w, h, 0, 0, w, h);
      tx.globalCompositeOperation = 'source-in';
      tx.fillStyle = '#fff';
      tx.fillRect(0, 0, w, h);
      src = t;
      sx = 0;
      sy = 0;
    }
    bx.drawImage(src, sx, sy, w, h, x0, y0, w, h);
    bx.restore();
    PS.view.render();
  };
  C.endStroke = async function () {
    const st = C.stroke;
    C.stroke = null;
    if (!st) return;
    if (st.kind === 'heal') return C.healArea(st);
    const labels = {
      brush: ['Pincel', 'fa-paintbrush'],
      eraser: ['Borracha', 'fa-eraser'],
      clone: ['Carimbo clonar', 'fa-stamp'],
      retouch: [{
        blur: 'Desfocar',
        sharpen: 'Nitidez',
        smudge: 'Borrar'
      }[S.retouch.mode], 'fa-droplet'],
      tone: [{
        dodge: 'Subexpor (clarear)',
        burn: 'Superexpor (escurecer)',
        saturate: 'Saturar',
        desaturate: 'Dessaturar'
      }[S.tone.mode], 'fa-circle-half-stroke']
    };
    const b = st.bbox,
      region = st.tiled ? {
        x: b.x0,
        y: b.y0,
        w: b.x1 - b.x0,
        h: b.y1 - b.y0
      } : null;
    doc.commit(...labels[st.kind], 'layer', region);
  };
  T.cancelStroke = () => {
    if (!C.stroke) return;
    const t = doc.base,
      bx = PS.ctx(t);
    if (C.stroke.tiled) for (const tile of C.stroke.tiles.values()) bx.putImageData(tile.before, tile.x, tile.y);else {
      bx.clearRect(0, 0, t.width, t.height);
      bx.drawImage(C.stroke.snapshot, 0, 0);
    }
    C.stroke = null;
    PS.view.render();
  };
  C.healPreview = null;
  C.healArea = async function (st) {
    if (S.heal.mode === "objects") return C.removeObject(st);
    const target = doc.base,
      pad = Math.ceil(st.size * 1.5),
      b = st.bbox;
    const x0 = Math.max(0, Math.floor(b.x0 - pad)),
      y0 = Math.max(0, Math.floor(b.y0 - pad));
    const x1 = Math.min(target.width, Math.ceil(b.x1 + pad)),
      y1 = Math.min(target.height, Math.ceil(b.y1 + pad)),
      w = x1 - x0,
      h = y1 - y0;
    if (w < 3 || h < 3) {
      PS.view.render();
      return;
    }
    const region = PS.getImg(target, x0, y0, w, h),
      m = PS.getImg(st.layer, x0, y0, w, h);
    const mask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) mask[i] = m.d[i * 4 + 3] > 20 ? 1 : 0;
    C.healPreview = {
      canvas: st.layer,
      L: doc.layer
    };
    PS.view.render();
    try {
      const res = await PS.run('inpaint', {
        img: region,
        mask
      });
      const c = PS.putImg(res),
        bx = PS.ctx(target);
      const soft = PS.canvas(w, h),
        sx = PS.ctx(soft);
      sx.drawImage(c, 0, 0);
      sx.globalCompositeOperation = 'destination-in';
      sx.filter = 'blur(1.5px)';
      sx.drawImage(st.layer, x0, y0, w, h, 0, 0, w, h);
      bx.drawImage(soft, x0, y0);
      C.healPreview = null;
      doc.commit('Corretor de manchas', 'fa-bandage');
    } catch (err) {
      C.healPreview = null;
      PS.toast('Não foi possível corrigir: ' + err.message, 'error');
      PS.view.render();
    }
  };
  C.redEyeAt = async function (p) {
    const target = doc.base,
      q = C.toLayer(p),
      r = Math.max(6, S.heal.size);
    const x0 = Math.max(0, Math.floor(q.x - r)),
      y0 = Math.max(0, Math.floor(q.y - r)),
      w = Math.min(target.width, Math.ceil(q.x + r)) - x0,
      h = Math.min(target.height, Math.ceil(q.y + r)) - y0;
    if (w < 2 || h < 2) return;
    const res = await PS.run('redEye', {
      img: PS.getImg(target, x0, y0, w, h),
      x: q.x - x0,
      y: q.y - y0,
      radius: r,
      strength: S.heal.strength
    });
    PS.ctx(target).putImageData(new ImageData(res.d, res.w, res.h), x0, y0);
    doc.commit('Olhos vermelhos', 'fa-eye');
  };
  C.pointerPaint = function (tool, type, e, p) {
    if (C.objectRemovalBusy) return;
    const v = PS.view,
      tol = 9 / v.zoom;
    switch (tool) {
      case 'brush':
      case 'eraser':
      case 'clone':
      case 'retouch':
      case 'tone':
      case 'heal':
        {
          if (type === 'down') {
            if (doc.hasDevelop()) {
              doc.ensureFlat();
              return;
            }
            doc.ensureRaster();
            if (tool === 'eraser' && S.eraser.mode === 'magic') {
              if (C.inDoc(p)) C.magicErase(p);
              return;
            }
            if (tool === 'heal' && S.heal.mode === 'redeye') {
              C.redEyeAt(p);
              return;
            }
            if (tool === 'clone' && (e.altKey || e.metaKey)) {
              C.cloneSrc = {
                ...p
              };
              PS.toast('Origem do carimbo definida.', 'success', 1600);
              v.render();
              C.renderOptions();
              return;
            }
            if (tool === 'clone' && e.pointerType === 'touch') C.longPress = setTimeout(() => {
              C.cloneSrc = {
                ...p
              };
              C.stroke = null;
              PS.toast('Origem do carimbo definida.', 'success', 1600);
              v.render();
            }, 550);
            C.beginStroke(p, tool, e);
          } else if (type === 'drag' && C.stroke) {
            if (C.longPress) {
              clearTimeout(C.longPress);
              C.longPress = null;
            }
            C.strokeTo(p, e);
          } else if (type === 'up') {
            if (C.longPress) {
              clearTimeout(C.longPress);
              C.longPress = null;
            }
            C.endStroke();
          } else v.render();
          break;
        }
    }
  };
  C.drawPaintCursor = function (ctx, v, tool) {
    const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'],
      toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
    if (brushTools.includes(tool) && C.hover && !(tool === 'eraser' && S.eraser.mode === 'magic')) {
      const [x, y] = toS(C.hover.x, C.hover.y),
        r = Math.max(2, S[tool].size / 2 * v.zoom);
      ctx.save();
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,0,0,.8)';
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.restore();
    }
  };
  C.drawHealPreview = function (ctx, v) {
    const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
    if (C.healPreview || C.stroke && C.stroke.kind === 'heal') {
      const L = doc.layer;
      ctx.save();
      ctx.globalAlpha = 0.5;
      imgSpace();
      ctx.drawImage(C.healPreview ? C.healPreview.canvas : C.stroke.layer, L.x, L.y);
      ctx.restore();
    }
  };
})();
