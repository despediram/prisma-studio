/* Prisma Studio — ferramenta bucket: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  S.bucket = {
    tolerance: 32,
    contiguous: true,
    sampleAll: false,
    opacity: 100
  };
  C.bucketFill = async function (p) {
    doc.ensureRaster();
    const L = doc.layer,
      target = doc.base,
      s = S.bucket;
    const src = s.sampleAll ? doc.composite(1) : target,
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
      id.data[i * 4 + 3] = res.m[i];
    }
    PS.ctx(m).putImageData(id, 0, 0);
    const fill = PS.canvas(target.width, target.height),
      fx = PS.ctx(fill);
    fx.drawImage(m, s.sampleAll ? -L.x : 0, s.sampleAll ? -L.y : 0);
    fx.globalCompositeOperation = 'source-in';
    fx.fillStyle = doc.editMask ? C.lum(doc.fg) < 0.5 ? '#000' : '#fff' : doc.fg;
    fx.fillRect(0, 0, fill.width, fill.height);
    const out = PS.cloneCanvas(target),
      ox = PS.ctx(out);
    ox.globalAlpha = s.opacity / 100;
    if (doc.editMask && C.lum(doc.fg) < 0.5) ox.globalCompositeOperation = 'destination-out';
    ox.drawImage(fill, 0, 0);
    doc.base = doc.throughSelection(L, target, out);
    doc.commit('Balde de tinta', 'fa-fill-drip');
  };
  T.registry.bucket = {
    state: S.bucket,
    pointer(type, e, p) {
      const tool = 'bucket',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'bucket':
          if (type === 'down' && C.inDoc(p)) C.bucketFill(p);
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'bucket',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
    },
    options() {
      const s = S.bucket,
        O = PS.toolOptions;
      return [O.range(s, 'oTol', 'Tolerância', 'tolerance', 0, 120), O.range(s, 'oOp', 'Opacidade', 'opacity', 1, 100, 1, '%'), O.check(s, 'oCont', 'Somente áreas conectadas', 'contiguous'), O.check(s, 'oAll', 'Usar todas as camadas', 'sampleAll')];
    }
  };
})();
