/* Prisma Studio — ferramenta tone: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.tone = {
    size: 70,
    hardness: 30,
    mode: 'dodge',
    strength: 35
  };
  T.registry.tone = {
    state: S.tone,
    pointer(type, e, p) {
      return C.pointerPaint("tone", type, e, p);
    },
    drawOverlay(ctx, v) {
      const tool = 'tone',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      C.drawPaintCursor(ctx, v, "tone");
    },
    options() {
      const s = S.tone,
        O = PS.toolOptions;
      return [O.segment(s, 'oMode', 'mode', [["dodge", "Clarear"], ["burn", "Escurecer"], ["saturate", "Saturar"], ["desaturate", "Dessaturar"]], () => {
        C.poly = null;
      }), O.range(s, 'oSize', 'Tamanho', 'size', 4, 600, 1, ' px'), O.range(s, 'oHard', 'Dureza', 'hardness', 0, 100, 1, '%'), O.range(s, 'oStr', 'Exposição', 'strength', 5, 100, 1, '%')];
    }
  };
})();
