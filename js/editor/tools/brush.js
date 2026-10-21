/* Prisma Studio — ferramenta brush: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.brush = {
    spacing: 12,
    flow: 100,
    size: 40,
    hardness: 70,
    opacity: 100,
    smoothing: 30,
    pressure: true
  };
  T.registry.brush = {
    state: S.brush,
    pointer(type, e, p) {
      return C.pointerPaint("brush", type, e, p);
    },
    drawOverlay(ctx, v) {
      const tool = 'brush',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      C.drawPaintCursor(ctx, v, "brush");
    },
    options() {
      const s = S.brush,
        O = PS.toolOptions;
      return [O.range(s, 'oSize', 'Tamanho', 'size', 1, 800, 1, ' px'), O.range(s, 'oHard', 'Dureza', 'hardness', 0, 100, 1, '%'), O.range(s, 'oOp', 'Opacidade', 'opacity', 1, 100, 1, '%'), O.range(s, 'oSpacing', 'Espaçamento', 'spacing', 1, 200, 1, '%'), O.range(s, 'oFlow', 'Fluxo', 'flow', 1, 100, 1, '%'), O.range(s, 'oSmooth', 'Suavização do traço', 'smoothing', 0, 95, 1, '%'), O.check(s, 'oPress', 'Pressão da caneta muda o tamanho', 'pressure')];
    }
  };
})();
