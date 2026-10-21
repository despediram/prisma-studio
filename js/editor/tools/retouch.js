/* Prisma Studio — ferramenta retouch: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.retouch = {
    size: 60,
    hardness: 40,
    mode: 'blur',
    strength: 50
  };
  T.registry.retouch = {
    state: S.retouch,
    pointer(type, e, p) {
      return C.pointerPaint("retouch", type, e, p);
    },
    drawOverlay(ctx, v) {
      const tool = 'retouch',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      C.drawPaintCursor(ctx, v, "retouch");
    },
    options() {
      const s = S.retouch,
        O = PS.toolOptions;
      return [O.segment(s, 'oMode', 'mode', [["blur", "Desfocar"], ["sharpen", "Nitidez"], ["smudge", "Borrar"]], () => {
        C.poly = null;
      }), O.range(s, 'oSize', 'Tamanho', 'size', 4, 600, 1, ' px'), O.range(s, 'oHard', 'Dureza', 'hardness', 0, 100, 1, '%'), O.range(s, 'oStr', 'Intensidade', 'strength', 5, 100, 1, '%')];
    }
  };
})();
