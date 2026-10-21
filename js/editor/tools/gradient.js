/* Prisma Studio — ferramenta gradient: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.gradDraft = null;
  S.gradient = {
    kind: 'linear',
    colors: 'fgbg',
    opacity: 100,
    reverse: false
  };
  C.GRAD_PRESETS = {
    fgbg: () => [doc.fg, doc.bg],
    fgclear: () => [doc.fg, doc.fg + '00'],
    bw: () => ['#000000', '#ffffff'],
    rainbow: () => ['#ff0040', '#ff9900', '#ffee00', '#22cc55', '#0099ff', '#6633ff', '#ff00aa'],
    sunset: () => ['#1d2b64', '#e0745a', '#ffc56b'],
    chrome: () => ['#2b2b2b', '#e8e8e8', '#4d4d4d', '#ffffff']
  };
  C.makeGradient = function (ctx, g) {
    const s = S.gradient;
    let {
      x0,
      y0,
      x1,
      y1
    } = g;
    let grad;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    if (s.kind === 'radial') grad = ctx.createRadialGradient(x0, y0, 0, x0, y0, len);else if (s.kind === 'angle' && ctx.createConicGradient) grad = ctx.createConicGradient(Math.atan2(y1 - y0, x1 - x0), x0, y0);else if (s.kind === 'reflected') grad = ctx.createLinearGradient(x0 - (x1 - x0), y0 - (y1 - y0), x1, y1);else grad = ctx.createLinearGradient(x0, y0, x1, y1);
    let cols = C.GRAD_PRESETS[s.colors]();
    if (s.reverse) cols = cols.slice().reverse();
    if (s.kind === 'reflected') cols = [...cols.slice().reverse(), ...cols.slice(1)];
    cols.forEach((c, i) => grad.addColorStop(i / (cols.length - 1), c));
    return grad;
  };
  C.applyGradient = async function (g) {
    doc.ensureRaster();
    const L = doc.layer,
      target = doc.base,
      t = PS.canvas(target.width, target.height),
      x = PS.ctx(t);
    x.translate(-L.x, -L.y);
    x.fillStyle = C.makeGradient(x, g);
    x.fillRect(L.x, L.y, t.width, t.height);
    let result;
    if (doc.editMask) {
      // na máscara, o brilho do degradê vira transparência
      const id = x.getImageData(0, 0, t.width, t.height),
        d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * d[i + 3] / 255;
        d[i] = d[i + 1] = d[i + 2] = 255;
        d[i + 3] = v;
      }
      result = PS.canvas(t.width, t.height);
      PS.ctx(result).putImageData(id, 0, 0);
    } else {
      result = PS.cloneCanvas(target);
      const rx = PS.ctx(result);
      rx.globalAlpha = S.gradient.opacity / 100;
      rx.drawImage(t, 0, 0);
    }
    doc.base = doc.throughSelection(L, target, result);
    doc.commit('Degradê', 'fa-swatchbook');
  };
  T.registry.gradient = {
    state: S.gradient,
    pointer(type, e, p) {
      const tool = 'gradient',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'gradient':
          {
            if (type === 'down') C.gradDraft = {
              x0: p.x,
              y0: p.y,
              x1: p.x,
              y1: p.y
            };else if (type === 'drag' && C.gradDraft) {
              let x1 = p.x,
                y1 = p.y;
              if (e.shiftKey) {
                const a = Math.round(Math.atan2(y1 - C.gradDraft.y0, x1 - C.gradDraft.x0) / (Math.PI / 4)) * Math.PI / 4,
                  L = Math.hypot(x1 - C.gradDraft.x0, y1 - C.gradDraft.y0);
                x1 = C.gradDraft.x0 + Math.cos(a) * L;
                y1 = C.gradDraft.y0 + Math.sin(a) * L;
              }
              C.gradDraft.x1 = x1;
              C.gradDraft.y1 = y1;
              v.render();
            } else if (type === 'up' && C.gradDraft) {
              const g = C.gradDraft;
              C.gradDraft = null;
              if (Math.hypot(g.x1 - g.x0, g.y1 - g.y0) > 2) C.applyGradient(g);else v.render();
            }
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'gradient',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (tool === 'gradient' && C.gradDraft) {
        ctx.save();
        imgSpace();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = C.makeGradient(ctx, C.gradDraft);
        ctx.beginPath();
        ctx.rect(0, 0, doc.w, doc.h);
        if (doc.sel) {
          ctx.clip();
        }
        ctx.fillRect(0, 0, doc.w, doc.h);
        ctx.restore();
        const [a, b] = toS(C.gradDraft.x0, C.gradDraft.y0),
          [c, d] = toS(C.gradDraft.x1, C.gradDraft.y1);
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0,0,0,.6)';
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
        ctx.stroke();
        [[a, b], [c, d]].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
        });
        ctx.restore();
      }
    },
    options() {
      const s = S.gradient,
        O = PS.toolOptions;
      return [O.segment(s, 'oKind', 'kind', [['linear', 'Linear'], ['radial', 'Radial'], ['angle', 'Angular'], ['reflected', 'Refletido']]), O.select(s, 'oColors', 'Cores', 'colors', [['fgbg', 'Principal → secundária'], ['fgclear', 'Principal → transparente'], ['bw', 'Preto → branco'], ['sunset', 'Pôr do sol'], ['rainbow', 'Arco-íris'], ['chrome', 'Cromado']]), O.range(s, 'oOp', 'Opacidade', 'opacity', 1, 100, 1, '%'), O.check(s, 'oRev', 'Inverter', 'reverse')];
    }
  };
})();
