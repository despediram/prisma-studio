/* Prisma Studio — ferramenta crop: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.crop = null;
  S.crop = {
    aspect: 'free'
  };
  C.ASPECTS = {
    free: null,
    orig: 'orig',
    '1:1': 1,
    '4:3': 4 / 3,
    '3:4': 3 / 4,
    '3:2': 3 / 2,
    '2:3': 2 / 3,
    '16:9': 16 / 9,
    '9:16': 9 / 16,
    '4:5': 4 / 5,
    a4p: 210 / 297,
    a4l: 297 / 210,
    poster: 'poster'
  };
  C.aspectValue = function () {
    const a = C.ASPECTS[S.crop.aspect];
    if (a === 'orig') return doc.w / doc.h;
    if (a === 'poster') return PS.poster && PS.poster.areaAspect ? PS.poster.areaAspect() : null;
    return a;
  };
  C.constrainCrop = function (r) {
    const a = C.aspectValue();
    r.w = Math.max(4, r.w);
    r.h = Math.max(4, r.h);
    if (a) {
      r.h = r.w / a;
      if (r.w > doc.w) {
        r.w = doc.w;
        r.h = r.w / a;
      }
      if (r.h > doc.h) {
        r.h = doc.h;
        r.w = r.h * a;
      }
    }
    r.w = Math.min(r.w, doc.w);
    r.h = Math.min(r.h, doc.h);
    r.x = PS.clamp(r.x, 0, doc.w - r.w);
    r.y = PS.clamp(r.y, 0, doc.h - r.h);
    return r;
  };
  C.resetCropToAspect = function () {
    const a = C.aspectValue();
    let w = doc.w,
      h = doc.h;
    if (a) {
      if (w / h > a) w = h * a;else h = w / a;
    }
    C.crop = {
      x: (doc.w - w) / 2,
      y: (doc.h - h) / 2,
      w,
      h
    };
    PS.view.render();
    C.renderOptions();
  };
  C.cropHandles = () => {
    const {
      x,
      y,
      w,
      h
    } = C.crop;
    return {
      nw: [x, y],
      n: [x + w / 2, y],
      ne: [x + w, y],
      e: [x + w, y + h / 2],
      se: [x + w, y + h],
      s: [x + w / 2, y + h],
      sw: [x, y + h],
      w: [x, y + h / 2]
    };
  };
  C.hitHandle = function (p, handles, tol) {
    for (const [k, [hx, hy]] of Object.entries(handles)) if (Math.abs(p.x - hx) <= tol && Math.abs(p.y - hy) <= tol) return k;
    return null;
  };
  T.cropTo = async (r, label) => {
    await doc.ensureFlat();
    r = {
      x: Math.round(r.x),
      y: Math.round(r.y),
      w: Math.max(1, Math.round(r.w)),
      h: Math.max(1, Math.round(r.h))
    };
    doc.transformAll(r.w, r.h, L => {
      const c = PS.canvas(r.w, r.h);
      PS.ctx(c).drawImage(L.canvas, L.x - r.x, L.y - r.y);
      let m = null;
      if (L.mask) {
        m = PS.canvas(r.w, r.h);
        PS.ctx(m).drawImage(L.mask, L.x - r.x, L.y - r.y);
      }
      return {
        canvas: c,
        x: 0,
        y: 0,
        mask: m
      };
    }, label || `Recortar ${r.w} × ${r.h}`, 'fa-crop-simple');
    PS.view.fit();
  };
  T.applyCrop = async () => {
    if (!C.crop) return;
    if (Math.round(C.crop.w) === doc.w && Math.round(C.crop.h) === doc.h) {
      PS.toast('O recorte ocupa a imagem inteira — nada para recortar.', 'info');
      return;
    }
    await T.cropTo(C.crop);
    C.crop = {
      x: 0,
      y: 0,
      w: doc.w,
      h: doc.h
    };
    C.renderOptions();
  };

  /* ---------- perspectiva ---------- */
  T.registry.crop = {
    state: S.crop,
    pointer(type, e, p) {
      const tool = 'crop',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'crop':
          {
            if (!C.crop) return;
            if (type === 'down') {
              const h = C.hitHandle(p, C.cropHandles(), tol);
              if (h) C.drag = {
                kind: 'handle',
                h,
                start: p,
                r: {
                  ...C.crop
                }
              };else if (p.x >= C.crop.x && p.x <= C.crop.x + C.crop.w && p.y >= C.crop.y && p.y <= C.crop.y + C.crop.h) C.drag = {
                kind: 'move',
                start: p,
                r: {
                  ...C.crop
                }
              };else C.drag = {
                kind: 'new',
                start: p
              };
            } else if (type === 'drag' && C.drag) {
              const dx = p.x - C.drag.start.x,
                dy = p.y - C.drag.start.y;
              if (C.drag.kind === 'move') {
                C.crop.x = PS.clamp(C.drag.r.x + dx, 0, doc.w - C.crop.w);
                C.crop.y = PS.clamp(C.drag.r.y + dy, 0, doc.h - C.crop.h);
              } else if (C.drag.kind === 'new') {
                const x0 = PS.clamp(Math.min(C.drag.start.x, p.x), 0, doc.w),
                  y0 = PS.clamp(Math.min(C.drag.start.y, p.y), 0, doc.h);
                const x1 = PS.clamp(Math.max(C.drag.start.x, p.x), 0, doc.w),
                  y1 = PS.clamp(Math.max(C.drag.start.y, p.y), 0, doc.h);
                C.crop = C.constrainCrop({
                  x: x0,
                  y: y0,
                  w: x1 - x0,
                  h: y1 - y0
                });
              } else {
                const r = {
                    ...C.drag.r
                  },
                  h = C.drag.h;
                if (h.includes('w')) {
                  const nx = PS.clamp(r.x + dx, 0, r.x + r.w - 4);
                  r.w += r.x - nx;
                  r.x = nx;
                }
                if (h.includes('e')) r.w = PS.clamp(r.w + dx, 4, doc.w - r.x);
                if (h.includes('n')) {
                  const ny = PS.clamp(r.y + dy, 0, r.y + r.h - 4);
                  r.h += r.y - ny;
                  r.y = ny;
                }
                if (h.includes('s')) r.h = PS.clamp(r.h + dy, 4, doc.h - r.y);
                const a = C.aspectValue();
                if (a) {
                  const right = C.drag.r.x + C.drag.r.w,
                    bottom = C.drag.r.y + C.drag.r.h;
                  if (h === 'n' || h === 's') r.w = r.h * a;else r.h = r.w / a;
                  if (h.includes('w')) r.x = right - r.w;
                  if (h.includes('n')) r.y = bottom - r.h;
                  if (r.x < 0 || r.y < 0 || r.x + r.w > doc.w || r.y + r.h > doc.h) break;
                }
                C.crop = r;
              }
              v.render();
              C.updateCropFields();
            } else if (type === 'up') C.drag = null;else if (type === 'dblclick') T.applyCrop();
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'crop',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (tool === 'crop' && C.crop) {
        const [x, y] = toS(C.crop.x, C.crop.y),
          w = C.crop.w * v.zoom,
          h = C.crop.h * v.zoom,
          [ix, iy] = toS(0, 0),
          iw = doc.w * v.zoom,
          ih = doc.h * v.zoom;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.beginPath();
        ctx.rect(ix, iy, iw, ih);
        ctx.rect(x, y, w, h);
        ctx.fill('evenodd');
        ctx.strokeStyle = 'rgba(255,255,255,.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 3; i++) {
          ctx.moveTo(x + w * i / 3, y);
          ctx.lineTo(x + w * i / 3, y + h);
          ctx.moveTo(x, y + h * i / 3);
          ctx.lineTo(x + w, y + h * i / 3);
        }
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = '#fff';
        Object.values(C.cropHandles()).forEach(([hx, hy]) => {
          const [sx, sy] = toS(hx, hy);
          ctx.fillRect(sx - 5, sy - 5, 10, 10);
        });
        const txt = `${Math.round(C.crop.w)} × ${Math.round(C.crop.h)} px`;
        ctx.font = '600 12px system-ui';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(0,0,0,.7)';
        ctx.beginPath();
        ctx.roundRect(x + w / 2 - tw / 2 - 8, y + h + 8, tw + 16, 22, 11);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, x + w / 2, y + h + 19);
        ctx.restore();
      }
    },
    options() {
      const s = S.crop,
        O = PS.toolOptions;
      return [O.select(s, 'cropAspect', 'Proporção', 'aspect', [['free', 'Livre'], ['orig', 'Original'], ['1:1', 'Quadrado 1:1'], ['4:5', '4:5 (feed)'], ['4:3', '4:3'], ['3:4', '3:4'], ['3:2', '3:2'], ['2:3', '2:3'], ['16:9', '16:9'], ['9:16', '9:16 (stories)'], ['a4p', 'A4 retrato'], ['a4l', 'A4 paisagem'], ['poster', 'Igual ao pôster configurado']], C.resetCropToAspect), O.hint(C.crop ? `${Math.round(C.crop.w)} × ${Math.round(C.crop.h)} px` : '', 'cropDims'), O.group([O.button('cropReset', 'Redefinir', () => {
        s.aspect = 'free';
        C.resetCropToAspect();
      }), O.button('cropApply', 'Recortar', T.applyCrop, '', 'primary')], 'row-actions')];
    }
  };
})();
