/* Prisma Studio — ferramenta eraser: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.eraser = {
    spacing: 12,
    flow: 100,
    size: 60,
    hardness: 60,
    opacity: 100,
    mode: 'normal',
    tolerance: 18,
    contiguous: true,
    feather: 2
  };
  C.magicErase = async function (p) {
    const q = C.toLayer(p),
      s = S.eraser;
    await doc.process('colorMask', {
      x: q.x,
      y: q.y,
      tolerance: s.tolerance,
      contiguous: s.contiguous,
      feather: s.feather
    }, 'Borracha mágica', 'fa-wand-magic', 'Removendo fundo');
  };
  T.registry.eraser = {
    state: S.eraser,
    pointer(type, e, p) {
      return C.pointerPaint("eraser", type, e, p);
    },
    drawOverlay(ctx, v) {
      const tool = 'eraser',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      C.drawPaintCursor(ctx, v, "eraser");
    },
    options() {
      const s = S.eraser,
        O = PS.toolOptions;
      return [O.segment(s, 'oMode', 'mode', [["normal", "Borracha"], ["magic", "Borracha mágica"]], () => {
        C.poly = null;
      }), ...(s.mode === 'magic' ? [O.range(s, 'oTol', 'Tolerância', 'tolerance', 1, 80), O.range(s, 'oFeather', 'Suavizar borda', 'feather', 0, 12, 1, ' px'), O.check(s, 'oCont', 'Somente áreas conectadas', 'contiguous'), O.hint('Clique num fundo liso para torná-lo transparente.')] : [O.range(s, 'oSize', 'Tamanho', 'size', 1, 800, 1, ' px'), O.range(s, 'oHard', 'Dureza', 'hardness', 0, 100, 1, '%'), O.range(s, 'oOp', 'Opacidade', 'opacity', 1, 100, 1, '%'), O.range(s, 'oSpacing', 'Espaçamento', 'spacing', 1, 200, 1, '%'), O.range(s, 'oFlow', 'Fluxo', 'flow', 1, 100, 1, '%'), O.range(s, 'oSmooth', 'Suavização do traço', 'smoothing', 0, 95, 1, '%')])];
    }
  };
})();
