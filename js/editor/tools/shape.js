/* Prisma Studio — ferramenta shape: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.shapeDraft = null;
  S.shape = {
    kind: 'rect',
    width: 8,
    fill: false,
    newLayer: true,
    radius: 0
  };
  C.drawShape = function (ctx, sh) {
    const s = S.shape;
    const {
      x0,
      y0,
      x1,
      y1
    } = sh;
    ctx.save();
    ctx.lineWidth = s.width;
    ctx.strokeStyle = doc.fg;
    ctx.fillStyle = doc.bg;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const x = Math.min(x0, x1),
      y = Math.min(y0, y1),
      w = Math.abs(x1 - x0),
      h = Math.abs(y1 - y0);
    ctx.beginPath();
    if (s.kind === 'rect') {
      if (s.radius > 0) ctx.roundRect(x, y, w, h, Math.min(s.radius, w / 2, h / 2));else ctx.rect(x, y, w, h);
    } else if (s.kind === 'ellipse') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);else if (s.kind === 'polygon' || s.kind === 'star') {
      const n = s.kind === 'star' ? 5 : 6,
        cx = x + w / 2,
        cy = y + h / 2;
      for (let i = 0; i < n * (s.kind === 'star' ? 2 : 1); i++) {
        const a = -Math.PI / 2 + i * Math.PI * 2 / (n * (s.kind === 'star' ? 2 : 1)),
          rr = s.kind === 'star' && i % 2 ? 0.45 : 1;
        const px = cx + Math.cos(a) * w / 2 * rr,
          py = cy + Math.sin(a) * h / 2 * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    if (s.fill && !['line', 'arrow'].includes(s.kind)) ctx.fill();
    if (s.width > 0) ctx.stroke();
    if (s.kind === 'arrow') {
      const a = Math.atan2(y1 - y0, x1 - x0),
        L = Math.max(12, s.width * 4);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 - L * Math.cos(a - 0.45), y1 - L * Math.sin(a - 0.45));
      ctx.lineTo(x1 - L * Math.cos(a + 0.45), y1 - L * Math.sin(a + 0.45));
      ctx.closePath();
      ctx.fillStyle = doc.fg;
      ctx.fill();
    }
    ctx.restore();
  };
  T.registry.shape = {
    state: S.shape,
    pointer(type, e, p) {
      const tool = 'shape',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'shape':
          {
            if (type === 'down') C.shapeDraft = {
              x0: p.x,
              y0: p.y,
              x1: p.x,
              y1: p.y
            };else if (type === 'drag' && C.shapeDraft) {
              let x1 = p.x,
                y1 = p.y;
              if (e.shiftKey) {
                const dx = x1 - C.shapeDraft.x0,
                  dy = y1 - C.shapeDraft.y0;
                if (!['line', 'arrow'].includes(S.shape.kind)) {
                  const m = Math.max(Math.abs(dx), Math.abs(dy));
                  x1 = C.shapeDraft.x0 + Math.sign(dx || 1) * m;
                  y1 = C.shapeDraft.y0 + Math.sign(dy || 1) * m;
                } else {
                  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4,
                    L = Math.hypot(dx, dy);
                  x1 = C.shapeDraft.x0 + Math.cos(a) * L;
                  y1 = C.shapeDraft.y0 + Math.sin(a) * L;
                }
              }
              C.shapeDraft.x1 = x1;
              C.shapeDraft.y1 = y1;
              v.render();
            } else if (type === 'up' && C.shapeDraft) {
              const sd = C.shapeDraft;
              C.shapeDraft = null;
              if (Math.hypot(sd.x1 - sd.x0, sd.y1 - sd.y0) < 3) {
                v.render();
                return;
              }
              const name = {
                rect: 'Retângulo',
                ellipse: 'Elipse',
                line: 'Linha',
                arrow: 'Seta',
                polygon: 'Hexágono',
                star: 'Estrela'
              }[S.shape.kind];
              if (S.shape.newLayer && !doc.editMask) {
                const c = PS.canvas(doc.w, doc.h);
                C.drawShape(PS.ctx(c), sd);
                doc.addLayer(c, name, null, name);
              } else {
                doc.ensureRaster();
                const L = doc.layer,
                  x = PS.ctx(doc.base);
                x.save();
                x.translate(-L.x, -L.y);
                C.drawShape(x, sd);
                x.restore();
                doc.commit(name, 'fa-shapes');
              }
            }
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'shape',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (tool === 'shape' && C.shapeDraft) {
        ctx.save();
        imgSpace();
        C.drawShape(ctx, C.shapeDraft);
        ctx.restore();
      }
    },
    options() {
      const s = S.shape,
        O = PS.toolOptions;
      return [O.segment(s, 'shKind', 'kind', [['rect', 'Retângulo', 'fa-regular fa-square'], ['ellipse', 'Elipse', 'fa-regular fa-circle'], ['polygon', 'Hexágono', 'fa-solid fa-draw-polygon'], ['star', 'Estrela', 'fa-regular fa-star'], ['line', 'Linha', 'fa-solid fa-minus'], ['arrow', 'Seta', 'fa-solid fa-arrow-right-long']]), O.range(s, 'oWidth', 'Espessura do contorno', 'width', 0, 200, 1, ' px'), ...(s.kind === 'rect' ? [O.range(s, 'oRadius', 'Cantos arredondados', 'radius', 0, 400, 1, ' px')] : []), O.check(s, 'shFill', 'Preencher com a cor secundária', 'fill'), O.check(s, 'shNew', 'Criar em nova camada', 'newLayer'), O.hint('Contorno usa a cor principal.')];
    }
  };
})();
