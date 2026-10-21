/* Prisma Studio — ferramenta clone: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.cloneSrc = null;
  S.clone = {
    size: 50,
    hardness: 55,
    opacity: 100
  };
  T.registry.clone = {
    state: S.clone,
    pointer(type, e, p) {
      return C.pointerPaint("clone", type, e, p);
    },
    drawOverlay(ctx, v) {
      const tool = 'clone',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (tool === 'clone' && C.cloneSrc) {
        let src = C.cloneSrc;
        if (C.stroke && C.stroke.offset) {
          const L = doc.layer;
          src = {
            x: C.stroke.last.x + C.stroke.offset.x,
            y: C.stroke.last.y + C.stroke.offset.y
          };
          void L;
        }
        const [x, y] = toS(src.x, src.y);
        ctx.save();
        ctx.strokeStyle = '#ffd200';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 8, y);
        ctx.lineTo(x + 8, y);
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, S.clone.size / 2 * v.zoom, 0, Math.PI * 2);
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.restore();
      }
      C.drawPaintCursor(ctx, v, "clone");
    },
    options() {
      const s = S.clone,
        O = PS.toolOptions;
      return [O.range(s, 'oSize', 'Tamanho', 'size', 2, 800, 1, ' px'), O.range(s, 'oHard', 'Dureza', 'hardness', 0, 100, 1, '%'), O.range(s, 'oOp', 'Opacidade', 'opacity', 1, 100, 1, '%'), O.hint(C.cloneSrc ? 'Origem definida. Alt + clique para trocar.' : 'Alt + clique (ou toque longo) no ponto a copiar.')];
    }
  };
})();
