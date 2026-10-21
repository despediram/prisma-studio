/* Prisma Studio — ferramenta heal: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.heal = {
    size: 30,
    mode: 'spot',
    strength: 85
  };
  T.registry.heal = {
    state: S.heal,
    pointer(type, e, p) {
      return C.pointerPaint("heal", type, e, p);
    },
    drawOverlay(ctx, v) {
      const tool = 'heal',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      C.drawPaintCursor(ctx, v, "heal");
    },
    options() {
      const s = S.heal,
        O = PS.toolOptions;
      return [O.segment(s, 'oMode', 'mode', [["spot", "Manchas"], ["redeye", "Olhos vermelhos"]], () => {
        C.poly = null;
      }), O.range(s, 'oSize', s.mode === 'redeye' ? 'Raio do olho' : 'Tamanho', 'size', 4, 300, 1, ' px'), ...(s.mode === 'redeye' ? [O.range(s, 'oStr', 'Intensidade', 'strength', 5, 100, 1, '%')] : [O.hint('Funciona melhor em manchas, poeira, riscos e pequenos objetos sobre fundos uniformes.')])];
    }
  };
})();
