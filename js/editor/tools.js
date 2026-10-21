/* Prisma Studio — registro e roteamento de ferramentas, atalhos e ciclo de ativação. Scripts clássicos para funcionar offline via file://. */
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
  C.META = {
    hand: {
      cls: 'tool-hand',
      hint: ''
    },
    zoom: {
      cls: 'tool-zoom',
      hint: 'Clique para aproximar; Alt + clique para afastar.'
    },
    move: {
      cls: 'tool-move',
      hint: 'Arraste para mover a camada (ou só a área selecionada). Setas movem 1 px; Shift + setas, 10 px.'
    },
    marquee: {
      cls: 'tool-crosshair',
      hint: 'Shift adiciona, Alt subtrai. No laço poligonal, clique os pontos e dê duplo clique (ou Enter) para fechar.'
    },
    wand: {
      cls: 'tool-crosshair',
      hint: 'Clique para selecionar áreas de cor parecida. Shift adiciona, Alt subtrai.'
    },
    crop: {
      cls: 'tool-crosshair',
      hint: 'Arraste as alças para recortar. Enter aplica, Esc cancela.'
    },
    perspective: {
      cls: 'tool-crosshair',
      hint: 'Arraste os 4 cantos até as bordas do objeto (folha, quadro, tela). Enter aplica.'
    },
    transform: {
      cls: 'tool-move',
      hint: 'Cantos escalam (Shift libera a proporção), a alça de cima gira, arrastar dentro move. Enter aplica.',
      destructive: true
    },
    brush: {
      cls: 'tool-brush',
      hint: 'Pinte arrastando. [ e ] mudam o tamanho; Alt + clique pega uma cor.',
      destructive: true
    },
    eraser: {
      cls: 'tool-brush',
      hint: 'Apaga para transparente. No modo “mágica”, clique numa cor para apagá-la.',
      destructive: true
    },
    bucket: {
      cls: 'tool-crosshair',
      hint: 'Clique para preencher com a cor principal.',
      destructive: true
    },
    gradient: {
      cls: 'tool-crosshair',
      hint: 'Arraste para criar o degradê. Shift trava em 45°.',
      destructive: true
    },
    clone: {
      cls: 'tool-brush',
      hint: 'Alt + clique (ou toque longo) define a origem; depois pinte para copiar.',
      destructive: true
    },
    heal: {
      cls: 'tool-brush',
      hint: 'Pinte sobre manchas e riscos e solte. No modo olhos vermelhos, clique no olho.',
      destructive: true
    },
    retouch: {
      cls: 'tool-brush',
      hint: 'Pinte para desfocar, dar nitidez ou borrar só onde passar o pincel.',
      destructive: true
    },
    tone: {
      cls: 'tool-brush',
      hint: 'Clareie, escureça, sature ou dessature por pinceladas.',
      destructive: true
    },
    liquify: {
      cls: 'tool-brush',
      hint: 'Empurre, infle, contraia ou gire os pixels. “Restaurar” desfaz por pinceladas.',
      destructive: true
    },
    text: {
      cls: 'tool-text',
      hint: 'Clique para criar um texto (vira uma camada editável). Clique num texto existente para editar.'
    },
    shape: {
      cls: 'tool-crosshair',
      hint: 'Arraste para desenhar. Shift mantém proporção ou ângulos de 45°.',
      destructive: true
    },
    picker: {
      cls: 'tool-crosshair',
      hint: 'Clique para pegar a cor principal; Alt + clique pega a cor secundária.'
    }
  };
  /* ---------- troca de ferramenta ---------- */
  T.set = async name => {
    if (!C.META[name]) return;
    if (T.current === name && name !== 'hand') {
      C.renderOptions();
      return;
    }
    if (C.xf && name !== 'transform') T.cancelTransform();
    if (C.textEdit && name !== 'text') T.commitText();
    if (C.poly && name !== 'marquee') C.poly = null;
    if (T.current === 'crop' && name !== 'crop') C.crop = null;
    if (T.current === 'perspective' && name !== 'perspective') C.quad = null;
    T.current = name;
    PS.$$('.tool').forEach(b => b.classList.toggle('active', b.dataset.tool === name));
    stage.className = 'stage ' + C.META[name].cls;
    hintEl.textContent = C.META[name].hint;
    hintEl.hidden = !C.META[name].hint || !doc.has;
    if (doc.has && C.META[name].destructive && doc.hasDevelop()) {
      PS.toast('Os ajustes em prévia foram aplicados para usar esta ferramenta.', 'info');
      await doc.ensureFlat();
    }
    if (name === 'crop' && doc.has) C.crop = {
      x: 0,
      y: 0,
      w: doc.w,
      h: doc.h
    };
    if (name === 'perspective' && doc.has) C.resetQuad();
    if (name === 'transform' && doc.has) T.beginTransform();
    C.renderOptions();
    PS.view.render();
  };

  /* ---------- pincéis ---------- */
  C.longPress = null;
  C.liqLast = null;
  T.pointer = (type, e, p) => {
    const tool = T.current,
      v = PS.view;
    if (type === 'leave') {
      C.hover = null;
      v.render();
      return;
    }
    if (p) C.hover = p;
    if (type === 'down' && e.altKey && ['brush', 'bucket', 'gradient', 'shape', 'text'].includes(tool)) {
      T.pickAt(p, false);
      return;
    }
    return T.registry[tool]?.pointer(type, e, p);
  };
  T.drawOverlay = (ctx, v) => {
    C.drawHealPreview(ctx, v);
    T.registry[T.current]?.drawOverlay(ctx, v);
  };
  T.renderOptions = C.renderOptions;
  T.key = e => {
    const tool = T.current;
    if (['brush', 'eraser', 'clone', 'heal', 'retouch', 'tone', 'liquify'].includes(tool) && (e.key === '[' || e.key === ']')) {
      const s = S[tool];
      s.size = PS.clamp(Math.round(s.size * (e.key === ']' ? 1.15 : 1 / 1.15)) + (e.key === ']' ? 1 : -1), 1, 800);
      C.renderOptions();
      PS.view.render();
      return true;
    }
    if (tool === 'move' && e.key.startsWith('Arrow')) {
      const k = e.shiftKey ? 10 : 1,
        dx = e.key === 'ArrowLeft' ? -k : e.key === 'ArrowRight' ? k : 0,
        dy = e.key === 'ArrowUp' ? -k : e.key === 'ArrowDown' ? k : 0;
      T.nudge(dx, dy);
      return true;
    }
    if (e.key === 'Enter') {
      if (tool === 'crop') {
        T.applyCrop();
        return true;
      }
      if (tool === 'perspective') {
        T.applyPerspective();
        return true;
      }
      if (tool === 'transform') {
        T.applyTransform();
        return true;
      }
      if (tool === 'marquee' && C.poly) {
        T.closePolygon();
        return true;
      }
    }
    if (e.key === 'Escape') {
      if (C.textEdit) {
        T.cancelText();
        return true;
      }
      if (C.xf) {
        T.cancelTransform();
        T.set('move');
        return true;
      }
      if (C.poly) {
        C.poly = null;
        PS.view.render();
        return true;
      }
      if (tool === 'crop') {
        C.crop = {
          x: 0,
          y: 0,
          w: doc.w,
          h: doc.h
        };
        PS.view.render();
        return true;
      }
      if (C.stroke) {
        T.cancelStroke();
        return true;
      }
    }
    return false;
  };
  T.isBusy = () => !!(C.stroke || C.xf || C.textEdit || C.poly || C.moveFloat);
  PS.$$('.tool').forEach(b => b.addEventListener('click', () => T.set(b.dataset.tool)));
  doc.on(type => {
    if (type === 'load') {
      C.cloneSrc = null;
      C.textEdit = null;
      C.xf = null;
      C.poly = null;
      T.set(T.current === 'transform' ? 'move' : T.current);
    }
    if (type === 'change' && T.current === 'crop' && C.crop && (C.crop.x + C.crop.w > doc.w + 0.5 || C.crop.y + C.crop.h > doc.h + 0.5)) C.crop = {
      x: 0,
      y: 0,
      w: doc.w,
      h: doc.h
    };
    if (type === 'change' && T.current === 'perspective' && C.quad && C.quad.some(q => q[0] > doc.w * 1.5 || q[1] > doc.h * 1.5)) C.resetQuad();
    if ((type === 'layers' || type === 'selection') && ['move', 'text'].includes(T.current) && !C.textEdit) C.renderOptions();
  });
})();
