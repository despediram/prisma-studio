/* Prisma Studio — ferramenta picker: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.picker = {
    sampleAll: true
  };
  C.sampleColor = function (p, all) {
    let src, x, y;
    if (all) {
      src = PS.canvas(1, 1);
      const c = PS.ctx(src);
      c.translate(-Math.floor(p.x), -Math.floor(p.y));
      doc.drawLayers(c, {
        live: true
      });
      x = 0;
      y = 0;
    } else {
      const L = doc.layer;
      src = doc.preview || L.canvas;
      const k = src.width / L.canvas.width;
      x = Math.floor((p.x - L.x) * k);
      y = Math.floor((p.y - L.y) * k);
      if (x < 0 || y < 0 || x >= src.width || y >= src.height) return null;
    }
    const d = PS.ctx(src).getImageData(x, y, 1, 1).data;
    if (d[3] === 0) return null;
    return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  };
  T.pickAt = (p, toBg) => {
    const c = C.sampleColor(p, S.picker.sampleAll);
    if (!c) return;
    if (toBg) doc.bg = c;else doc.fg = c;
    T.lastPicked = c;
    PS.colors && PS.colors.sync();
    C.renderOptions();
  };

  /* ---------- roteamento de ponteiro ---------- */
  T.registry.picker = {
    state: S.picker,
    pointer(type, e, p) {
      const tool = 'picker',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'picker':
          if (type === 'down' || type === 'drag') T.pickAt(p, e.altKey);
          if (type === 'up' && T.lastPicked) PS.toast(`Cor ${T.lastPicked.toUpperCase()} definida como ${e.altKey ? 'secundária' : 'principal'}.`, 'success', 1800);
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'picker',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
    },
    options() {
      const s = S.picker,
        O = PS.toolOptions;
      return [O.check(s, 'oAll', 'Amostrar todas as camadas', 'sampleAll'), O.group([{
        type: 'swatch',
        value: T.lastPicked || doc.fg
      }, O.hint((T.lastPicked || doc.fg).toUpperCase()), O.button('pickCopy', 'Copiar', async () => {
        const ok = await PS.copyText((T.lastPicked || doc.fg).toUpperCase());
        PS.toast(ok ? 'Cor copiada.' : 'Não foi possível copiar.', ok ? 'success' : 'warning');
      })], 'color-row')];
    }
  };
})();
