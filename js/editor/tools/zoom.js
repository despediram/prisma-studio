/* Prisma Studio — ferramenta zoom: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.zoom = {};
  T.registry.zoom = {
    state: S.zoom,
    pointer(type, e, p) {
      const tool = 'zoom',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'zoom':
          if (type === 'down') v.zoomStep(e.altKey ? -1 : 1, e.clientX - stage.getBoundingClientRect().left, e.clientY - stage.getBoundingClientRect().top);
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'zoom',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
    },
    options() {
      const s = S.zoom,
        O = PS.toolOptions;
      return [O.hint('Use também a roda do mouse ou a pinça no celular.')];
    }
  };
})();
