/* Prisma Studio — ferramenta move: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.moveFloat = null;
  S.move = {};
  C.beginMove = function (p) {
    const L = doc.layer;
    if (L.type === 'text' && !doc.sel) {
      C.drag = {
        start: p,
        x: L.x,
        y: L.y,
        tx: L.text.x,
        ty: L.text.y,
        text: true
      };
      return;
    }
    doc.ensureRaster();
    if (doc.sel) {
      // move só os pixels selecionados (camada “flutuante” temporária)
      const m = doc.selMaskFor(L),
        fl = PS.cloneCanvas(L.canvas),
        fx = PS.ctx(fl);
      fx.globalCompositeOperation = 'destination-in';
      fx.drawImage(m, 0, 0);
      const bx = PS.ctx(L.canvas);
      bx.save();
      bx.globalCompositeOperation = 'destination-out';
      bx.drawImage(m, 0, 0);
      bx.restore();
      C.moveFloat = {
        canvas: fl,
        dx: 0,
        dy: 0,
        selC: doc.sel.canvas
      };
    }
    C.drag = {
      start: p,
      x: L.x,
      y: L.y
    };
  };
  C.endMove = function () {
    const L = doc.layer;
    if (C.moveFloat) {
      const bx = PS.ctx(L.canvas);
      bx.drawImage(C.moveFloat.canvas, C.moveFloat.dx, C.moveFloat.dy);
      const ns = doc.blankCanvas();
      PS.ctx(ns).drawImage(C.moveFloat.selC, C.moveFloat.dx, C.moveFloat.dy);
      const moved = C.moveFloat.dx || C.moveFloat.dy;
      C.moveFloat = null;
      doc.setSelection(ns);
      if (moved) doc.commit('Mover seleção', 'fa-arrows-up-down-left-right');else {
        doc.version++;
        PS.view.render();
      }
    } else if (C.drag && C.drag.text) {
      if (L.text.x !== C.drag.tx || L.text.y !== C.drag.ty) doc.commit('Mover texto', 'fa-arrows-up-down-left-right');
    } else if (C.drag && (L.x !== C.drag.x || L.y !== C.drag.y)) doc.commit('Mover camada', 'fa-arrows-up-down-left-right', 'meta');
    C.drag = null;
  };
  T.nudge = (dx, dy) => {
    const L = doc.layer;
    if (!L) return;
    if (doc.sel) {
      C.beginMove({
        x: 0,
        y: 0
      });
      C.moveFloat.dx = dx;
      C.moveFloat.dy = dy;
      C.endMove();
      return;
    }
    L.x += dx;
    L.y += dy;
    doc.version++;
    PS.view.render();
    clearTimeout(T._nudgeT);
    T._nudgeT = setTimeout(() => doc.commit('Mover camada', 'fa-arrows-up-down-left-right', 'meta'), 400);
  };

  /* ---------- transformação livre ---------- */
  T.registry.move = {
    state: S.move,
    pointer(type, e, p) {
      const tool = 'move',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'move':
          {
            if (type === 'down') C.beginMove(p);else if (type === 'drag' && C.drag) {
              const dx = Math.round(p.x - C.drag.start.x),
                dy = Math.round(p.y - C.drag.start.y);
              if (C.moveFloat) {
                C.moveFloat.dx = dx;
                C.moveFloat.dy = dy;
              } else if (C.drag.text) {
                const L = doc.layer;
                L.text.x = C.drag.tx + dx;
                L.text.y = C.drag.ty + dy;
                T.renderTextLayer(L);
              } else {
                doc.layer.x = C.drag.x + dx;
                doc.layer.y = C.drag.y + dy;
              }
              doc.version++;
              v.render();
            } else if (type === 'up') C.endMove();
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'move',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (C.moveFloat) {
        const L = doc.layer;
        ctx.save();
        imgSpace();
        ctx.globalAlpha = L.opacity;
        ctx.drawImage(C.moveFloat.canvas, L.x + C.moveFloat.dx, L.y + C.moveFloat.dy);
        ctx.restore();
      }
    },
    options() {
      const s = S.move,
        O = PS.toolOptions;
      return [O.hint(doc.sel ? 'Há uma seleção: só a área selecionada será movida.' : `Camada “${doc.layer.name}” em x ${doc.layer.x}, y ${doc.layer.y}.`), O.group([O.button('mvCenter', 'Centralizar', () => {
        const L = doc.layer;
        L.x = Math.round((doc.w - L.canvas.width) / 2);
        L.y = Math.round((doc.h - L.canvas.height) / 2);
        doc.commit('Centralizar camada', 'fa-arrows-to-dot', 'meta');
        C.renderOptions();
      }), O.button('mvReset', 'Posição 0,0', () => {
        doc.layer.x = 0;
        doc.layer.y = 0;
        doc.commit('Mover camada', 'fa-arrows-up-down-left-right', 'meta');
        C.renderOptions();
      })], 'grid2')];
    }
  };
})();
