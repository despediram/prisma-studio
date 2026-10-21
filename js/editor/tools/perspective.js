/* Prisma Studio — ferramenta perspective: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.quad = null;
  S.perspective = {
    out: 'auto'
  };
  /* ---------- perspectiva ---------- */
  T.applyPerspective = async () => {
    if (!C.quad) return;
    const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let ow = (d(C.quad[0], C.quad[1]) + d(C.quad[3], C.quad[2])) / 2,
      oh = (d(C.quad[0], C.quad[3]) + d(C.quad[1], C.quad[2])) / 2;
    if (S.perspective.out === 'a4p') oh = ow * 297 / 210;
    if (S.perspective.out === 'a4l') oh = ow * 210 / 297;
    if (S.perspective.out === 'square') oh = ow;
    const k = Math.min(1, 12000 / Math.max(ow, oh));
    ow *= k;
    oh *= k;
    const L = doc.layer,
      q = C.quad.map(([x, y]) => [x - L.x, y - L.y]);
    if (doc.layers.length > 1) PS.toast('A perspectiva é aplicada à camada ativa.', 'info');
    await doc.process('perspective', {
      quad: q,
      w: Math.round(ow),
      h: Math.round(oh)
    }, 'Corrigir perspectiva', 'fa-vector-polygon', 'Corrigindo perspectiva', {
      ignoreSelection: true
    });
    C.resetQuad();
    PS.view.fit();
  };

  /* ---------- conta-gotas ---------- */
  T.registry.perspective = {
    state: S.perspective,
    pointer(type, e, p) {
      const tool = 'perspective',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'perspective':
          {
            if (!C.quad) return;
            if (type === 'down') {
              const i = C.quad.findIndex(q => Math.hypot(q[0] - p.x, q[1] - p.y) < 14 / v.zoom);
              C.drag = i >= 0 ? {
                i
              } : null;
            } else if (type === 'drag' && C.drag) {
              C.quad[C.drag.i] = [PS.clamp(p.x, -doc.w * 0.5, doc.w * 1.5), PS.clamp(p.y, -doc.h * 0.5, doc.h * 1.5)];
              v.render();
            } else if (type === 'up') C.drag = null;else v.render();
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'perspective',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (tool === 'perspective' && C.quad) {
        const pts = C.quad.map(q => toS(q[0], q[1]));
        ctx.save();
        const [ix, iy] = toS(0, 0);
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.beginPath();
        ctx.rect(ix, iy, doc.w * v.zoom, doc.h * v.zoom);
        ctx.moveTo(...pts[0]);
        pts.slice(1).forEach(q => ctx.lineTo(...q));
        ctx.closePath();
        ctx.fill('evenodd');
        try {
          const H = IP.homography([[0, 0], [1, 0], [1, 1], [0, 1]], pts);
          const map = (u, w2) => {
            const z = H[6] * u + H[7] * w2 + 1;
            return [(H[0] * u + H[1] * w2 + H[2]) / z, (H[3] * u + H[4] * w2 + H[5]) / z];
          };
          ctx.strokeStyle = 'rgba(0,167,225,.55)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 1; i < 6; i++) {
            const t = i / 6;
            ctx.moveTo(...map(t, 0));
            ctx.lineTo(...map(t, 1));
            ctx.moveTo(...map(0, t));
            ctx.lineTo(...map(1, t));
          }
          ctx.stroke();
        } catch (_) {/* quadrilátero degenerado */}
        ctx.strokeStyle = '#00a7e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(...pts[0]);
        pts.slice(1).forEach(q => ctx.lineTo(...q));
        ctx.closePath();
        ctx.stroke();
        pts.forEach(([x, y]) => {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#00a7e1';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
        ctx.restore();
      }
    },
    options() {
      const s = S.perspective,
        O = PS.toolOptions;
      return [O.select(s, 'perspOut', 'Formato do resultado', 'out', [['auto', 'Automático (pelas medidas)'], ['a4p', 'Folha A4 em pé'], ['a4l', 'Folha A4 deitada'], ['square', 'Quadrado']]), O.hint('Ótimo para fotos de documentos, quadros e telas tiradas de lado.'), O.group([O.button('perspReset', 'Redefinir', () => {
        C.resetQuad();
        PS.view.render();
      }), O.button('perspApply', 'Corrigir', T.applyPerspective, '', 'primary')], 'row-actions')];
    }
  };
})();
