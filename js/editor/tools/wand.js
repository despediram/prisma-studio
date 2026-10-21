/* Prisma Studio — ferramenta wand: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.wand = {
    tolerance: 32,
    contiguous: true,
    sampleAll: true,
    combine: 'new'
  };
  C.wandAt = async function (p, e) {
    const s = S.wand,
      L = doc.layer,
      src = s.sampleAll ? doc.composite(1) : L.canvas,
      q = s.sampleAll ? p : C.toLayer(p);
    const res = await PS.run('floodMask', {
      img: PS.getImg(src),
      x: q.x,
      y: q.y,
      tolerance: s.tolerance,
      contiguous: s.contiguous,
      antialias: true
    });
    const m = PS.canvas(res.w, res.h),
      id = new ImageData(res.w, res.h);
    for (let i = 0; i < res.m.length; i++) {
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255;
      id.data[i * 4 + 3] = res.m[i];
    }
    PS.ctx(m).putImageData(id, 0, 0);
    const c = doc.blankCanvas();
    PS.ctx(c).drawImage(m, s.sampleAll ? 0 : L.x, s.sampleAll ? 0 : L.y);
    doc.combineSelection(c, C.selCombine(e, s.combine));
  };
  T.selectColorRange = async (hexColor, tolerance) => {
    // Seleção › Gama de cores: seleciona todos os pixels parecidos com a cor
    const src = doc.composite(1),
      c = PS.canvas(1, 1),
      x = PS.ctx(c);
    x.fillStyle = hexColor;
    x.fillRect(0, 0, 1, 1);
    const img = PS.getImg(src),
      t = PS.getImg(c),
      n = img.w * img.h,
      d = img.d,
      tol = (tolerance ?? 40) * 2.2;
    const out = new ImageData(img.w, img.h);
    for (let i = 0; i < n; i++) {
      const j = i * 4,
        dist = Math.max(Math.abs(d[j] - t.d[0]), Math.abs(d[j + 1] - t.d[1]), Math.abs(d[j + 2] - t.d[2]));
      out.data[j] = out.data[j + 1] = out.data[j + 2] = 255;
      out.data[j + 3] = PS.clamp((1 - dist / tol) * 255 * 1.6, 0, 255);
    }
    const m = doc.blankCanvas();
    PS.ctx(m).putImageData(out, 0, 0);
    doc.setSelection(m);
  };

  /* ---------- mover ---------- */
  T.registry.wand = {
    state: S.wand,
    pointer(type, e, p) {
      const tool = 'wand',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'wand':
          if (type === 'down') C.wandAt(p, e);
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'wand',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
    },
    options() {
      const s = S.wand,
        O = PS.toolOptions;
      return [O.range(s, 'oTol', 'Tolerância', 'tolerance', 0, 120), O.check(s, 'oCont', 'Somente áreas conectadas', 'contiguous'), O.check(s, 'oAll', 'Usar todas as camadas', 'sampleAll'), O.segment(s, 'oCombine', 'combine', [['new', 'Nova seleção', 'fa-regular fa-square'], ['add', 'Adicionar (Shift)', 'fa-solid fa-square-plus'], ['subtract', 'Subtrair (Alt)', 'fa-solid fa-square-minus'], ['intersect', 'Interseção', 'fa-solid fa-object-ungroup']])];
    }
  };
})();
