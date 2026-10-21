/* Prisma Studio — ferramenta hand: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.hand = {};
  T.registry.hand = {
    state: S.hand,
    pointer(type, e, p) {
      const tool = 'hand',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'hand':
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'hand',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
    },
    options() {
      const s = S.hand,
        O = PS.toolOptions;
      return [];
    }
  };
})();
