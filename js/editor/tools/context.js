/* Prisma Studio — contexto compartilhado e utilitários geométricos das ferramentas. */
(function () {
  'use strict';

  const PS = window.PS,
    S = {};
  const T = PS.tools = {
    current: 'hand',
    S,
    registry: {}
  };
  const C = PS.toolContext = {
    PS,
    doc: PS.doc,
    IP: PrismaImgProc,
    EX: PrismaImgExtra,
    T,
    S,
    stage: PS.$('#stage'),
    optsEl: PS.$('#toolOptions'),
    hintEl: PS.$('#stageHint')
  };
  C.renderOptions = () => PS.toolOptions.render(T.registry[T.current]);
})();
/* Prisma Studio — utilitários compartilhados, sem painel de opções. Scripts clássicos para funcionar offline via file://. */
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
  C.PALETTE = ['#ffffff', '#000000', '#e6007e', '#00a7e1', '#ffd200', '#2fbf71', '#ff6b35', '#7a4dff'];
  C.hover = null;
  C.drag = null;
  C.lum = hex => {
    const v = parseInt(hex.slice(1), 16);
    return (0.299 * (v >> 16 & 255) + 0.587 * (v >> 8 & 255) + 0.114 * (v & 255)) / 255;
  };
  C.toLayer = (p, L = doc.layer) => ({
    x: p.x - L.x,
    y: p.y - L.y
  });
  C.inDoc = p => p.x >= 0 && p.y >= 0 && p.x < doc.w && p.y < doc.h;
  C.resetQuad = function () {
    const ix = doc.w * 0.08,
      iy = doc.h * 0.08;
    C.quad = [[ix, iy], [doc.w - ix, iy], [doc.w - ix, doc.h - iy], [ix, doc.h - iy]];
  };
})();
