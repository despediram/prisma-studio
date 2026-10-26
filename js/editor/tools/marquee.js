/* Prisma Studio — ferramenta marquee: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.sel = null;
  C.poly = null;
  S.marquee = {
    mode: 'rect',
    combine: 'new',
    feather: 0
  };
  C.selCombine = function (e, def) {
    return e && e.shiftKey && e.altKey ? 'intersect' : e && e.shiftKey ? 'add' : e && e.altKey ? 'subtract' : def;
  };
  C.shapeToSel = function (drawFn, combine) {
    const c = doc.blankCanvas(),
      x = PS.ctx(c);
    x.fillStyle = '#fff';
    drawFn(x);
    if (S.marquee.feather > 0) {
      const f = PS.canvas(doc.w, doc.h),
        fx = PS.ctx(f);
      fx.filter = `blur(${S.marquee.feather}px)`;
      fx.drawImage(c, 0, 0);
      doc.combineSelection(f, combine);
    } else doc.combineSelection(c, combine);
  };
  T.closePolygon = () => {
    if (!C.poly) return;
    const pl = C.poly;
    C.poly = null;
    if (pl.pts.length > 2) C.shapeToSel(x => {
      x.beginPath();
      pl.pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b));
      x.closePath();
      x.fill();
    }, pl.combine);
    PS.view.render();
  };

  /* ---------- sobreposição na tela ---------- */
  T.registry.marquee = {
    state: S.marquee,
    pointer(type, e, p) {
      if (type === 'cancel') { C.sel = null; C.poly = null; PS.view.render(); return; }
      const tool = 'marquee',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'marquee':
          {
            const mode = S.marquee.mode;
            if (mode === 'polygon') {
              if (type === 'down') {
                if (!C.poly) C.poly = {
                  pts: [[p.x, p.y]],
                  combine: C.selCombine(e, S.marquee.combine)
                };else {
                  const f = C.poly.pts[0];
                  if (C.poly.pts.length > 2 && Math.hypot(f[0] - p.x, f[1] - p.y) * v.zoom < 10) {
                    T.closePolygon();
                    return;
                  }
                  C.poly.pts.push([p.x, p.y]);
                }
                v.render();
              } else if (type === 'dblclick') T.closePolygon();else v.render();
              break;
            }
            if (type === 'down') {
              if (mode === 'lasso') C.sel = {
                pts: [[p.x, p.y]],
                combine: C.selCombine(e, S.marquee.combine)
              };else C.sel = {
                x0: p.x,
                y0: p.y,
                x1: p.x,
                y1: p.y,
                combine: C.selCombine(e, S.marquee.combine)
              };
            } else if (type === 'drag' && C.sel) {
              if (mode === 'lasso') C.sel.pts.push([p.x, p.y]);else {
                let x1 = p.x,
                  y1 = p.y;
                if (e.shiftKey && C.sel.combine !== 'add') {
                  const m = Math.max(Math.abs(x1 - C.sel.x0), Math.abs(y1 - C.sel.y0));
                  x1 = C.sel.x0 + Math.sign(x1 - C.sel.x0 || 1) * m;
                  y1 = C.sel.y0 + Math.sign(y1 - C.sel.y0 || 1) * m;
                }
                C.sel.x1 = x1;
                C.sel.y1 = y1;
              }
              v.render();
            } else if (type === 'up' && C.sel) {
              const s = C.sel;
              C.sel = null;
              if (mode === 'lasso') {
                if (s.pts.length > 2) C.shapeToSel(x => {
                  x.beginPath();
                  s.pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b));
                  x.closePath();
                  x.fill();
                }, s.combine);else if (s.combine === 'new') doc.deselect();
              } else {
                const x0 = Math.min(s.x0, s.x1),
                  y0 = Math.min(s.y0, s.y1),
                  w = Math.abs(s.x1 - s.x0),
                  h = Math.abs(s.y1 - s.y0);
                if (w < 2 || h < 2) {
                  if (s.combine === 'new') doc.deselect();
                  v.render();
                  break;
                }
                C.shapeToSel(x => {
                  x.beginPath();
                  if (mode === 'ellipse') x.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);else x.rect(x0, y0, w, h);
                  x.fill();
                }, s.combine);
              }
              v.render();
            }
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'marquee',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (tool === 'marquee' && (C.sel || C.poly)) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#fff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 2;
        ctx.beginPath();
        if (C.poly) {
          C.poly.pts.forEach(([x, y], i) => {
            const [a, b] = toS(x, y);
            i ? ctx.lineTo(a, b) : ctx.moveTo(a, b);
          });
          if (C.hover) ctx.lineTo(...toS(C.hover.x, C.hover.y));
        } else if (C.sel.pts) C.sel.pts.forEach(([x, y], i) => {
          const [a, b] = toS(x, y);
          i ? ctx.lineTo(a, b) : ctx.moveTo(a, b);
        });else {
          const [x, y] = toS(Math.min(C.sel.x0, C.sel.x1), Math.min(C.sel.y0, C.sel.y1)),
            w = Math.abs(C.sel.x1 - C.sel.x0) * v.zoom,
            h = Math.abs(C.sel.y1 - C.sel.y0) * v.zoom;
          if (S.marquee.mode === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);else ctx.rect(x, y, w, h);
        }
        ctx.stroke();
        ctx.restore();
      }
    },
    options() {
      const s = S.marquee,
        O = PS.toolOptions;
      return [O.segment(s, 'oMode', 'mode', [["rect", "Retangular", "fa-regular fa-square"], ["ellipse", "Elíptica", "fa-regular fa-circle"], ["lasso", "Laço", "fa-solid fa-signature"], ["polygon", "Laço poligonal", "fa-solid fa-draw-polygon"]], () => {
        C.poly = null;
      }), O.segment(s, 'oCombine', 'combine', [['new', 'Nova seleção', 'fa-regular fa-square'], ['add', 'Adicionar (Shift)', 'fa-solid fa-square-plus'], ['subtract', 'Subtrair (Alt)', 'fa-solid fa-square-minus'], ['intersect', 'Interseção', 'fa-solid fa-object-ungroup']]), O.range(s, 'oFeather', 'Difusão', 'feather', 0, 100, 1, ' px')];
    }
  };
})();
