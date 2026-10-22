/* Prisma Studio — ferramenta transform: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.xf = null;
  S.transform = {
    keepRatio: true
  };
  /* ---------- transformação livre ---------- */
  T.beginTransform = () => {
    const L = doc.layer;
    if (!L) return;
    if (L.type === 'text') doc.rasterizeLayer(L, true);
    C.xf = {
      L,
      orig: PS.cloneCanvas(L.canvas),
      mask: L.mask ? PS.cloneCanvas(L.mask) : null,
      w: L.canvas.width,
      h: L.canvas.height,
      cx: L.x + L.canvas.width / 2,
      cy: L.y + L.canvas.height / 2,
      sx: 1,
      sy: 1,
      ang: 0,
      flipX: 1,
      flipY: 1,
      prevVisible: L.visible
    };
    L.visible = false;
    C.renderOptions();
    PS.view.render();
  };
  C.xfCorners = function () {
    const hw = C.xf.w * C.xf.sx / 2,
      hh = C.xf.h * C.xf.sy / 2,
      c = Math.cos(C.xf.ang),
      s = Math.sin(C.xf.ang);
    const P = (lx, ly) => [C.xf.cx + lx * c - ly * s, C.xf.cy + lx * s + ly * c];
    return {
      nw: P(-hw, -hh),
      n: P(0, -hh),
      ne: P(hw, -hh),
      e: P(hw, 0),
      se: P(hw, hh),
      s: P(0, hh),
      sw: P(-hw, hh),
      w: P(-hw, 0),
      rot: P(0, -hh - 28 / PS.view.zoom)
    };
  };
  C.HDIR = {
    nw: [-1, -1],
    n: [0, -1],
    ne: [1, -1],
    e: [1, 0],
    se: [1, 1],
    s: [0, 1],
    sw: [-1, 1],
    w: [-1, 0]
  };
  C.drawXf = function (ctx) {
    ctx.save();
    ctx.translate(C.xf.cx, C.xf.cy);
    ctx.rotate(C.xf.ang);
    ctx.scale(C.xf.sx * C.xf.flipX, C.xf.sy * C.xf.flipY);
    ctx.globalAlpha = C.xf.L.opacity;
    ctx.imageSmoothingQuality = 'high';
    let src = C.xf.orig;
    if (C.xf.mask && C.xf.L.maskEnabled) {
      const t = PS.cloneCanvas(C.xf.orig),
        tx = PS.ctx(t);
      tx.globalCompositeOperation = 'destination-in';
      tx.drawImage(C.xf.mask, 0, 0);
      src = t;
    }
    ctx.drawImage(src, -C.xf.w / 2, -C.xf.h / 2);
    ctx.restore();
  };
  T.applyTransform = () => {
    if (!C.xf) return;
    const {
        L
      } = C.xf,
      k = C.xfCorners(),
      xs = [k.nw[0], k.ne[0], k.se[0], k.sw[0]],
      ys = [k.nw[1], k.ne[1], k.se[1], k.sw[1]];
    const x0 = Math.floor(Math.min(...xs)),
      y0 = Math.floor(Math.min(...ys)),
      x1 = Math.ceil(Math.max(...xs)),
      y1 = Math.ceil(Math.max(...ys));
    const W = Math.max(1, x1 - x0),
      H = Math.max(1, y1 - y0);
    const render = src => {
      const c = PS.checkedCanvas(W, H),
        x = PS.ctx(c);
      x.imageSmoothingQuality = 'high';
      x.translate(C.xf.cx - x0, C.xf.cy - y0);
      x.rotate(C.xf.ang);
      x.scale(C.xf.sx * C.xf.flipX, C.xf.sy * C.xf.flipY);
      x.drawImage(src, -C.xf.w / 2, -C.xf.h / 2);
      return c;
    };
    try {
      const canvas = render(C.xf.orig), mask = C.xf.mask ? render(C.xf.mask) : null;
      L.canvas = canvas; if (mask) L.mask = mask;
    } catch (e) { PS.toast(e.message, 'error', 7000); return; }
    L.x = x0;
    L.y = y0;
    L.visible = C.xf.prevVisible;
    L._dirty = true;
    const changed = C.xf.sx !== 1 || C.xf.sy !== 1 || C.xf.ang !== 0 || C.xf.flipX !== 1 || C.xf.flipY !== 1 || x0 !== L.x;
    C.xf = null;
    doc.commit(changed ? 'Transformação livre' : 'Mover camada', 'fa-up-right-and-down-left-from-center');
    T.set('move');
  };
  T.cancelTransform = () => {
    if (!C.xf) return;
    C.xf.L.visible = C.xf.prevVisible;
    C.xf = null;
    doc.version++;
    PS.view.render();
    C.renderOptions();
  };
  T.flipTransform = axis => {
    if (!C.xf) return;
    if (axis === 'h') C.xf.flipX *= -1;else C.xf.flipY *= -1;
    PS.view.render();
  };

  /* ---------- recorte ---------- */
  T.registry.transform = {
    state: S.transform,
    pointer(type, e, p) {
      const tool = 'transform',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'transform':
          {
            if (!C.xf) return;
            if (type === 'down') {
              const k = C.xfCorners(),
                ht = 10 / v.zoom;
              if (Math.hypot(p.x - k.rot[0], p.y - k.rot[1]) < ht * 1.4) C.drag = {
                kind: 'rot',
                a0: Math.atan2(p.y - C.xf.cy, p.x - C.xf.cx),
                ang: C.xf.ang
              };else {
                const h = Object.keys(C.HDIR).find(n => Math.hypot(p.x - k[n][0], p.y - k[n][1]) < ht);
                if (h) C.drag = {
                  kind: 'scale',
                  h,
                  st: {
                    ...C.xf
                  }
                };else C.drag = {
                  kind: 'move',
                  start: p,
                  cx: C.xf.cx,
                  cy: C.xf.cy
                };
              }
            } else if (type === 'drag' && C.drag) {
              if (C.drag.kind === 'move') {
                C.xf.cx = C.drag.cx + p.x - C.drag.start.x;
                C.xf.cy = C.drag.cy + p.y - C.drag.start.y;
              } else if (C.drag.kind === 'rot') {
                let a = C.drag.ang + Math.atan2(p.y - C.xf.cy, p.x - C.xf.cx) - C.drag.a0;
                if (e.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
                C.xf.ang = a;
              } else {
                const st = C.drag.st,
                  [hx, hy] = C.HDIR[C.drag.h],
                  c = Math.cos(st.ang),
                  s = Math.sin(st.ang);
                const W = st.w * st.sx,
                  H = st.h * st.sy,
                  ax = -hx * W / 2,
                  ay = -hy * H / 2;
                const awx = st.cx + ax * c - ay * s,
                  awy = st.cy + ax * s + ay * c; // âncora no mundo
                const rx = p.x - awx,
                  ry = p.y - awy,
                  lx = rx * c + ry * s,
                  ly = -rx * s + ry * c; // ponteiro no referencial local a partir da âncora
                let nW = hx ? Math.max(2, Math.abs(lx)) : W,
                  nH = hy ? Math.max(2, Math.abs(ly)) : H;
                const keep = S.transform.keepRatio !== e.shiftKey && hx && hy;
                if (keep) {
                  const f = Math.max(nW / W, nH / H);
                  nW = W * f;
                  nH = H * f;
                }
                C.xf.sx = nW / st.w;
                C.xf.sy = nH / st.h;
                const ox = hx ? hx * nW / 2 : 0,
                  oy = hy ? hy * nH / 2 : 0; // novo centro em relação à âncora
                C.xf.cx = awx + ox * c - oy * s;
                C.xf.cy = awy + ox * s + oy * c;
              }
              v.render();
              C.updateXfFields();
            } else if (type === 'up') C.drag = null;else if (type === 'dblclick') T.applyTransform();
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'transform',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (C.xf) {
        ctx.save();
        imgSpace();
        C.drawXf(ctx);
        ctx.restore();
        const k = C.xfCorners();
        ctx.save();
        ctx.strokeStyle = '#00a7e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ['nw', 'ne', 'se', 'sw'].forEach((n, i) => {
          const [x, y] = toS(...k[n]);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
        const [nx, ny] = toS(...k.n),
          [rx, ry] = toS(...k.rot);
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(rx, ry);
        ctx.stroke();
        Object.keys(C.HDIR).forEach(n => {
          const [x, y] = toS(...k[n]);
          ctx.fillStyle = '#fff';
          ctx.fillRect(x - 5, y - 5, 10, 10);
          ctx.strokeRect(x - 5, y - 5, 10, 10);
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },
    options() {
      const s = S.transform,
        O = PS.toolOptions;
      return C.xf ? [O.group([O.number('xfW', 'Largura %', Math.round(C.xf.sx * 1000) / 10, v => {
        if (!C.xf) return;
        C.xf.sx = Math.max(.01, v / 100);
        if (s.keepRatio) C.xf.sy = C.xf.sx;
        C.updateXfFields();
        PS.view.render();
      }, .1), O.number('xfH', 'Altura %', Math.round(C.xf.sy * 1000) / 10, v => {
        if (!C.xf) return;
        C.xf.sy = Math.max(.01, v / 100);
        if (s.keepRatio) C.xf.sx = C.xf.sy;
        C.updateXfFields();
        PS.view.render();
      }, .1), O.number('xfA', 'Ângulo °', Math.round(C.xf.ang * 1800 / Math.PI) / 10, v => {
        if (C.xf) C.xf.ang = v * Math.PI / 180;
        PS.view.render();
      }, .5)], 'grid3'), O.check(s, 'oKeep', 'Manter proporção nos cantos', 'keepRatio'), O.group([O.button('xfFH', 'Espelhar', () => T.flipTransform('h'), 'fa-solid fa-left-right'), O.button('xfFV', 'Espelhar', () => T.flipTransform('v'), 'fa-solid fa-up-down')], 'grid2'), O.group([O.button('xfCancel', 'Cancelar', () => {
        T.cancelTransform();
        T.set('move');
      }), O.button('xfApply', 'Aplicar', T.applyTransform, '', 'primary')], 'row-actions')] : [O.hint('Selecione uma camada para transformar.')];
    }
  };
})();
