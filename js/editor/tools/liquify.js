/* Prisma Studio — ferramenta liquify: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
(function () {
  'use strict';

  const C = PS.toolContext;
  const {
    PS: P,
    doc,
    IP,
    EX,
    T,
    S,
    stage,
    optsEl,
    hintEl
  } = C;
  S.liquify = {
    size: 140,
    mode: 'push',
    strength: 60
  };
  C.liq = null;
  C.liquifyStep = function (p, prev) {
    const target = doc.base,
      W = target.width,
      H = target.height,
      s = S.liquify,
      R = s.size / 2,
      k = s.strength / 100;
    const c = C.toLayer(p),
      pv = C.toLayer(prev || p),
      dx = c.x - pv.x,
      dy = c.y - pv.y;
    const x0 = Math.max(0, Math.floor(c.x - R - 2)),
      y0 = Math.max(0, Math.floor(c.y - R - 2));
    const x1 = Math.min(W, Math.ceil(c.x + R + 2)),
      y1 = Math.min(H, Math.ceil(c.y + R + 2)),
      w = x1 - x0,
      h = y1 - y0;
    if (w <= 1 || h <= 1) return;
    const bx = PS.ctx(target),
      src = bx.getImageData(x0, y0, w, h),
      out = new ImageData(w, h),
      sd = src.data,
      od = out.data;
    od.set(sd);
    const orig = s.mode === 'restore' ? PS.ctx(C.liq.orig).getImageData(x0, y0, w, h).data : null;
    const sample = (sx, sy, j) => {
      // amostragem bilinear dentro da região (bordas presas)
      sx = PS.clamp(sx - x0, 0, w - 1.001);
      sy = PS.clamp(sy - y0, 0, h - 1.001);
      const ix = Math.floor(sx),
        iy = Math.floor(sy),
        tx = sx - ix,
        ty = sy - iy,
        a = (iy * w + ix) * 4,
        b = a + 4,
        cc = a + w * 4,
        d2 = cc + 4;
      for (let ch = 0; ch < 4; ch++) od[j + ch] = (sd[a + ch] * (1 - tx) + sd[b + ch] * tx) * (1 - ty) + (sd[cc + ch] * (1 - tx) + sd[d2 + ch] * tx) * ty;
    };
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const rx = x + 0.5 - c.x,
        ry = y + 0.5 - c.y,
        dist = Math.hypot(rx, ry);
      if (dist >= R) continue;
      const f = Math.pow(1 - dist / R, 2) * k,
        j = ((y - y0) * w + (x - x0)) * 4;
      if (s.mode === 'push') sample(x - dx * f * 1.2, y - dy * f * 1.2, j);else if (s.mode === 'bloat') sample(c.x + rx * (1 - 0.12 * f) - 0.5, c.y + ry * (1 - 0.12 * f) - 0.5, j);else if (s.mode === 'pucker') sample(c.x + rx * (1 + 0.12 * f) - 0.5, c.y + ry * (1 + 0.12 * f) - 0.5, j);else if (s.mode === 'twirl' || s.mode === 'twirlccw') {
        const a = (s.mode === 'twirl' ? 1 : -1) * 0.12 * f,
          co = Math.cos(a),
          si = Math.sin(a);
        sample(c.x + rx * co - ry * si - 0.5, c.y + rx * si + ry * co - 0.5, j);
      } else if (s.mode === 'restore') {
        const t = f * 0.5;
        for (let ch = 0; ch < 4; ch++) od[j + ch] = sd[j + ch] + (orig[j + ch] - sd[j + ch]) * t;
      }
    }
    bx.putImageData(out, x0, y0);
    PS.view.render();
  };
  T.registry.liquify = {
    state: S.liquify,
    pointer(type, e, p) {
      const tool = 'liquify',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'liquify':
          {
            if (type === 'down') {
              if (doc.hasDevelop()) {
                doc.ensureFlat();
                return;
              }
              doc.ensureRaster();
              C.liq = {
                orig: PS.cloneCanvas(doc.base)
              };
              C.liqLast = p;
              C.liquifyStep(p, p);
            } else if (type === 'drag' && C.liq) {
              if (Math.hypot(p.x - C.liqLast.x, p.y - C.liqLast.y) * v.zoom >= 2) {
                C.liquifyStep(p, C.liqLast);
                C.liqLast = p;
              }
            } else if (type === 'up' && C.liq) {
              C.liq = null;
              doc.commit('Liquefazer', 'fa-water');
            } else v.render();
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'liquify',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      C.drawPaintCursor(ctx, v, "liquify");
    },
    options() {
      const s = S.liquify,
        O = PS.toolOptions;
      return [O.segment(s, 'oMode', 'mode', [["push", "Empurrar", "fa-solid fa-hand-point-right"], ["bloat", "Inflar", "fa-solid fa-expand"], ["pucker", "Contrair", "fa-solid fa-compress"], ["twirl", "Girar horário", "fa-solid fa-rotate-right"], ["twirlccw", "Girar anti-horário", "fa-solid fa-rotate-left"], ["restore", "Restaurar", "fa-solid fa-rotate"]], () => {
        C.poly = null;
      }), O.range(s, 'oSize', 'Tamanho', 'size', 10, 800, 1, ' px'), O.range(s, 'oStr', 'Pressão', 'strength', 5, 100, 1, '%')];
    }
  };
})();
