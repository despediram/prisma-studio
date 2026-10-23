/* Prisma Studio — ferramenta text: estado, ponteiro, sobreposição e esquema declarativo. Scripts clássicos para funcionar offline via file://. */
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
  C.textEdit = null;
  S.text = {
    text: 'Seu texto',
    family: 'system-ui',
    size: 120,
    stroke: '#000000',
    strokeW: 0,
    bold: true,
    italic: false,
    align: 'left',
    shadow: true,
    lineH: 1.15,
    letter: 0
  };
  C.fontStr = t => `${t.italic ? 'italic ' : ''}${t.bold ? '700 ' : '400 '}${t.size}px ${/\s/.test(t.family) && !/,/.test(t.family) ? `"${t.family}"` : t.family}`;
  const measureContext = PS.ctx(PS.canvas(1, 1));
  C.textBox = function (t) {
    const c = measureContext;
    c.font = C.fontStr(t);
    if ('letterSpacing' in c) c.letterSpacing = `${t.letter || 0}px`;
    const lines = String(t.text || '').split('\n'),
      lh = t.size * t.lineH;
    const w = Math.max(10, ...lines.map(l => c.measureText(l).width));
    let x0 = t.x;
    if (t.align === 'center') x0 = t.x - w / 2;else if (t.align === 'right') x0 = t.x - w;
    return {
      x: x0,
      y: t.y,
      w,
      h: lines.length * lh,
      lines,
      lh
    };
  };
  C.drawText = function (ctx, t) {
    const b = C.textBox(t);
    ctx.save();
    ctx.font = C.fontStr(t);
    ctx.textAlign = t.align;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${t.letter || 0}px`;
    if (t.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = t.size * 0.08;
      ctx.shadowOffsetY = t.size * 0.03;
    }
    b.lines.forEach((line, i) => {
      const y = t.y + i * b.lh + (b.lh - t.size) / 2;
      if (t.strokeW > 0) {
        ctx.strokeStyle = t.stroke;
        ctx.lineWidth = t.strokeW * 2;
        ctx.strokeText(line, t.x, y);
      }
      ctx.fillStyle = t.color;
      ctx.fillText(line, t.x, y);
    });
    ctx.restore();
  };
  // Reutiliza a tela da camada e limpa somente os limites antigos/novos do texto.
  // Digitação e arraste são agrupados em um desenho por quadro, sem alocar outra imagem inteira.
  T.renderTextLayer = L => {
    if (!L.canvas || L.canvas.width !== doc.w || L.canvas.height !== doc.h) L.canvas = PS.canvas(doc.w, doc.h);
    const b = C.textBox(L.text), pad = Math.ceil(L.text.size * .45 + L.text.strokeW * 2 + 6);
    const next = {x:Math.floor(b.x-pad), y:Math.floor(b.y-pad), w:Math.ceil(b.w+pad*2), h:Math.ceil(b.h+pad*2)};
    const old = L._textBounds || {x:0,y:0,w:doc.w,h:doc.h};
    const x=Math.max(0,Math.min(old.x,next.x)), y=Math.max(0,Math.min(old.y,next.y));
    const area={x,y,w:Math.max(0,Math.min(doc.w,Math.max(old.x+old.w,next.x+next.w))-x),h:Math.max(0,Math.min(doc.h,Math.max(old.y+old.h,next.y+next.h))-y)};
    const ctx=PS.ctx(L.canvas);ctx.save();ctx.beginPath();ctx.rect(area.x,area.y,area.w,area.h);ctx.clip();ctx.clearRect(area.x,area.y,area.w,area.h);C.drawText(ctx,L.text);ctx.restore();
    L._textBounds=next;L.x=0;L.y=0;L._dirty=true;
    return area;
  };
  let textFrame=0, pendingText=null;
  C.flushText = () => {
    if(textFrame)cancelAnimationFrame(textFrame);textFrame=0;
    const L=pendingText;pendingText=null;
    if(L && doc.layers.includes(L)){const area=T.renderTextLayer(L);PS.view.render(area);}
  };
  C.scheduleText = L => {pendingText=L;if(!textFrame)textFrame=requestAnimationFrame(C.flushText);};
  C.ensureTextFont = () => {
    const L=C.textEdit?.L;if(!L)return;
    document.fonts.load(C.fontStr(L.text)).then(()=>{if(C.textEdit?.L===L)C.scheduleText(L);}).catch(()=>{});
  };
  C.textLayerAt = function (p) {
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const L = doc.layers[i];
      if (L.type !== 'text' || !L.visible) continue;
      const b = C.textBox(L.text);
      if (p.x >= b.x - 8 && p.x <= b.x + b.w + 8 && p.y >= b.y - 8 && p.y <= b.y + b.h + 8) return i;
    }
    return -1;
  };
  C.startTextEdit = function (i, isNew) {
    if (i !== doc.active) {
      doc.active = i;
      doc.editMask = false;
      doc.rebuildProxy();
      doc.emit('layers');
    }
    const L = doc.layer;
    L._textBounds = null; // O histórico pode ter restaurado outros limites nessa tela.
    C.textEdit = {
      L,
      isNew,
      before: {
        ...L.text
      }
    };
    C.renderOptions();
    PS.mobile?.open('options');
    window.dispatchEvent(new Event('prisma:toolchange'));
    C.ensureTextFont();
    setTimeout(() => {
      const ta = PS.$('#txtValue');
      if (ta) {
        ta.focus();
        if (isNew) ta.select();
      }
    }, 30);
  };
  T.commitText = () => {
    if (!C.textEdit) return;
    C.flushText();
    const {
      L,
      isNew,
      before
    } = C.textEdit;
    C.textEdit = null;
    if (!String(L.text.text).trim()) {
      const i = doc.layers.indexOf(L);
      if (i >= 0 && doc.layers.length > 1) {
        doc.layers.splice(i, 1);
        doc.active = Math.max(0, i - 1);
      }
      doc.commit('Texto removido', 'fa-font', 'meta');
      C.renderOptions();
      return;
    }
    if (isNew || JSON.stringify(before) !== JSON.stringify(L.text)) doc.commit(isNew ? 'Texto' : 'Editar texto', 'fa-font');
    C.renderOptions();
    window.dispatchEvent(new Event('prisma:toolchange'));
    PS.view.render();
  };
  T.cancelText = () => {
    if (!C.textEdit) return;
    if(textFrame)cancelAnimationFrame(textFrame);textFrame=0;pendingText=null;
    const {
      L,
      isNew,
      before
    } = C.textEdit;
    C.textEdit = null;
    const i = doc.layers.indexOf(L);
    if (isNew) {
      doc.layers.splice(i, 1);
      doc.active = Math.max(0, i - 1);
      doc.version++;
      doc.rebuildProxy();
      doc.emit('layers');
      doc.emit('change');
    } else {
      L.text = before;
      T.renderTextLayer(L);
      doc.version++;
      doc.emit('change');
    }
    C.renderOptions();
    window.dispatchEvent(new Event('prisma:toolchange'));
    PS.view.render();
  };
  C.updateText = function (k, v) {
    S.text[k] = v;
    if (C.textEdit) {
      C.textEdit.L.text[k] = v;
      C.scheduleText(C.textEdit.L);
      if(k==='family'||k==='bold'||k==='italic')C.ensureTextFont();
      doc.version++;
    }
  };
  T.registry.text = {
    state: S.text,
    pointer(type, e, p) {
      const tool = 'text',
        v = PS.view,
        tol = 9 / v.zoom;
      switch (tool) {
        case 'text':
          {
            if (type === 'down') {
              if (C.textEdit) {
                const b = C.textBox(C.textEdit.L.text);
                if (p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol) {
                  C.drag = {
                    start: p,
                    x: C.textEdit.L.text.x,
                    y: C.textEdit.L.text.y
                  };
                  return;
                }
                T.commitText();
              }
              const hit = C.textLayerAt(p);
              if (hit >= 0) {
                C.startTextEdit(hit, false);
                const t = doc.layer.text;
                C.drag = {
                  start: p,
                  x: t.x,
                  y: t.y
                };
                return;
              }
              const t = Object.assign({}, S.text, {
                x: p.x,
                y: p.y - S.text.size * 0.6,
                color: doc.fg
              });
              const L = doc.makeLayer(PS.canvas(doc.w, doc.h), (t.text || 'Texto').slice(0, 24), {
                type: 'text',
                text: t
              });
              T.renderTextLayer(L);
              doc.layers.splice(doc.active + 1, 0, L);
              doc.active++;
              doc.editMask = false;
              doc.version++;
              doc.rebuildProxy();
              doc.emit('layers');
              C.startTextEdit(doc.active, true);
              C.drag = {
                start: p,
                x: t.x,
                y: t.y
              };
              v.render();
            } else if (type === 'drag' && C.drag && C.textEdit) {
              const t = C.textEdit.L.text;
              t.x = C.drag.x + p.x - C.drag.start.x;
              t.y = C.drag.y + p.y - C.drag.start.y;
              C.scheduleText(C.textEdit.L);
              doc.version++;
            } else if (type === 'up' || type === 'cancel') { C.drag = null; C.flushText(); }
            break;
          }
      }
    },
    drawOverlay(ctx, v) {
      const tool = 'text',
        toS = (x, y) => [x * v.zoom + v.panX, y * v.zoom + v.panY];
      const brushTools = ['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'];
      const imgSpace = () => ctx.setTransform(v.dpr * v.zoom, 0, 0, v.dpr * v.zoom, v.dpr * v.panX, v.dpr * v.panY);
      if (C.textEdit) {
        const b = C.textBox(C.textEdit.L.text);
        const [x, y] = toS(b.x, b.y);
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#00a7e1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 4, y - 4, b.w * v.zoom + 8, b.h * v.zoom + 8);
        ctx.restore();
      }
    },
    options() {
      const s = S.text,
        O = PS.toolOptions;
      return (() => {
        const o = C.textEdit ? C.textEdit.L.text : s,
          field = (id, label, key, min, max, step = 1) => ({
            ...O.number(id, label, o[key] || 0, v => C.updateText(key, PS.clamp(v, min, max)), step),
            min,
            max
          });
        return [...(!C.textEdit ? [O.button('txtInsert', 'Adicionar texto na imagem', () => {
          const at={x:doc.w*.15,y:doc.h*.35}; T.registry.text.pointer('down', {pointerType:'mouse'}, at); T.registry.text.pointer('up', {}, at);
        }, 'fa-solid fa-plus', 'primary')] : []), {
          type: 'textarea',
          id: 'txtValue',
          label: 'Texto',
          value: o.text,
          onChange: v => {
            C.updateText('text', v);
            if (C.textEdit) C.textEdit.L.name = (v || 'Texto').split('\n')[0].slice(0, 24);
          },
          onKey: e => {
            e.stopPropagation();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              T.commitText();
            }
            if (e.key === 'Escape') T.cancelText();
          }
        }, O.group([{
          type: 'select',
          id: 'txtFamily',
          label: 'Fonte',
          value: o.family,
          items: [...C.FONTS, ...C.customFonts].map(v => [v, v]),
          onChange: v => C.updateText('family', v)
        }, field('txtSize', 'Tamanho (px)', 'size', 6, 3000)], 'grid2'), {
          type: 'buttons',
          id: 'txtStyle',
          items: [...['bold', 'italic', 'shadow'].map((key, i) => ({
            key,
            label: ['Negrito', 'Itálico', 'Sombra'][i],
            icon: ['fa-solid fa-bold', 'fa-solid fa-italic', ''][i],
            active: o[key],
            onClick: () => {
              C.updateText(key, !o[key]);
              C.renderOptions();
            }
          })), ...['left', 'center', 'right'].map((a, i) => ({
            align: a,
            label: ['Esquerda', 'Centro', 'Direita'][i],
            icon: 'fa-solid fa-align-' + a,
            active: o.align === a,
            onClick: () => {
              C.updateText('align', a);
              C.renderOptions();
            }
          }))]
        }, O.group([field('txtLine', 'Entrelinha', 'lineH', .6, 3, .05), field('txtLetter', 'Espaçamento', 'letter', -20, 200)], 'grid2'), {
          type: 'color',
          id: 'txtColor',
          label: 'Cor do texto',
          value: o.color || doc.fg,
          onChange: v => C.updateText('color', v)
        }, O.group([{
          type: 'color',
          id: 'txtStroke',
          label: 'Contorno',
          value: o.stroke,
          onChange: v => C.updateText('stroke', v)
        }, field('txtStrokeW', 'Espessura do contorno', 'strokeW', 0, 200)], 'grid2'), O.group([O.button('txtFont', 'Importar fonte', () => PS.$('#fontInput').click(), 'fa-solid fa-upload'), ...(C.textEdit ? [O.button('txtCancel', 'Cancelar', T.cancelText), O.button('txtApply', 'Concluir', T.commitText, '', 'primary')] : [])], 'row-actions'), O.hint(C.textEdit ? 'Ctrl + Enter conclui. O texto continua editável depois: clique nele com esta ferramenta.' : 'Clique na imagem para criar um texto.')];
      })();
    }
  };
})();
