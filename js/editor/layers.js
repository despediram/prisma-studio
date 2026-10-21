/* Prisma Studio — painel de camadas e cores principal/secundária. */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc, $ = PS.$;
  const list = $('#layerList'), blendSel = $('#layerBlend'), opIn = $('#layerOpacity');

  blendSel.innerHTML = PS.BLENDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

  function thumb(L, size = 40) {
    const c = PS.canvas(size, size), x = PS.ctx(c), src = L.canvas;
    // xadrez pequeno
    for (let i = 0; i < size; i += 5) for (let j = 0; j < size; j += 5) { x.fillStyle = ((i + j) / 5) % 2 ? '#c9c9c9' : '#fff'; x.fillRect(i, j, 5, 5); }
    const k = Math.min(size / doc.w, size / doc.h), ox = (size - doc.w * k) / 2, oy = (size - doc.h * k) / 2;
    x.drawImage(src, ox + L.x * k, oy + L.y * k, src.width * k, src.height * k);
    return c;
  }
  function maskThumb(L, size = 40) {
    const c = PS.canvas(size, size), x = PS.ctx(c); x.fillStyle = '#000'; x.fillRect(0, 0, size, size);
    const k = Math.min(size / doc.w, size / doc.h), ox = (size - doc.w * k) / 2, oy = (size - doc.h * k) / 2;
    x.drawImage(L.mask, ox + L.x * k, oy + L.y * k, L.mask.width * k, L.mask.height * k);
    return c;
  }

  let renderT = 0;
  function render() { clearTimeout(renderT); renderT = setTimeout(doRender, 30); }
  function doRender() {
    if (!doc.has) { list.innerHTML = ''; return; }
    const L = doc.layer;
    blendSel.value = L.blend; opIn.value = Math.round(L.opacity * 100); $('#layerOpacityOut').textContent = `${Math.round(L.opacity * 100)}%`;
    list.innerHTML = '';
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const l = doc.layers[i], row = document.createElement('div');
      row.className = 'layer' + (i === doc.active ? ' active' : '') + (l.visible ? '' : ' hidden-layer');
      row.dataset.i = i; row.draggable = true;
      row.innerHTML = `<button class="lvis" aria-label="${l.visible ? 'Ocultar' : 'Mostrar'} camada" title="${l.visible ? 'Ocultar' : 'Mostrar'}"><i class="fa-regular ${l.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
        <span class="lthumb${i === doc.active && !doc.editMask ? ' on' : ''}"></span>${l.mask ? `<span class="lthumb mask${i === doc.active && doc.editMask ? ' on' : ''}${l.maskEnabled ? '' : ' off'}" title="Máscara (clique para editar; Shift + clique desativa)"></span>` : ''}
        <span class="lname">${l.type === 'text' ? '<i class="fa-solid fa-font"></i> ' : ''}${PS.escape(l.name)}</span>
        <span class="lmeta">${l.blend !== 'source-over' ? PS.BLENDS.find(b => b[0] === l.blend)[1] : ''}${l.opacity < 1 ? ` ${Math.round(l.opacity * 100)}%` : ''}</span>`;
      row.querySelector('.lthumb').appendChild(thumb(l));
      if (l.mask) row.querySelector('.lthumb.mask').appendChild(maskThumb(l));
      row.querySelector('.lvis').addEventListener('click', e => { e.stopPropagation(); doc.setLayerProp(l, 'visible', !l.visible, l.visible ? 'Ocultar camada' : 'Mostrar camada'); });
      row.addEventListener('click', e => {
        const onMask = e.target.closest('.lthumb.mask');
        if (onMask && e.shiftKey) { doc.setLayerProp(l, 'maskEnabled', !l.maskEnabled, 'Ativar/desativar máscara'); return; }
        doc.setActive(i);
        const wantMask = !!onMask;
        if (doc.active === i && doc.editMask !== wantMask && (!wantMask || l.mask)) { doc.editMask = wantMask; doc.rebuildProxy(); doc.emit('layers'); PS.tools.renderOptions(); }
        else if (!onMask && doc.editMask) { doc.editMask = false; doc.emit('layers'); }
      });
      row.querySelector('.lname').addEventListener('dblclick', e => {
        e.stopPropagation();
        const span = e.currentTarget, inp = document.createElement('input');
        inp.className = 'input lrename'; inp.value = l.name; span.replaceWith(inp); inp.focus(); inp.select();
        const done = ok => { if (ok && inp.value.trim() && inp.value !== l.name) { l.name = inp.value.trim(); doc.commit('Renomear camada', 'fa-i-cursor', 'meta'); } else render(); };
        inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); if (ev.key === 'Escape') done(false); });
        inp.addEventListener('blur', () => done(true));
      });
      // arrastar para reordenar
      row.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', String(i)); row.classList.add('dragging'); });
      row.addEventListener('dragend', () => row.classList.remove('dragging'));
      row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('drop'); });
      row.addEventListener('dragleave', () => row.classList.remove('drop'));
      row.addEventListener('drop', e => { e.preventDefault(); row.classList.remove('drop'); const from = +e.dataTransfer.getData('text/plain'); if (!Number.isNaN(from)) doc.moveLayer(from, i); });
      list.appendChild(row);
    }
    $('#lyMaskBtn').title = L.mask ? 'Aplicar a máscara' : (doc.sel ? 'Máscara a partir da seleção' : 'Adicionar máscara');
    $('#lyMergeBtn').disabled = doc.active === 0;
    $('#lyDelBtn').disabled = doc.layers.length <= 1;
    $('#layerCount').textContent = `${doc.layers.length} ${doc.layers.length === 1 ? 'camada' : 'camadas'}`;
  }
  blendSel.addEventListener('change', () => doc.setLayerProp(doc.layer, 'blend', blendSel.value, 'Modo de mesclagem'));
  opIn.addEventListener('input', () => { doc.layer.opacity = +opIn.value / 100; $('#layerOpacityOut').textContent = `${opIn.value}%`; doc.version++; PS.view.render(); });
  opIn.addEventListener('change', () => doc.commit('Opacidade da camada', 'fa-droplet', 'meta'));
  $('#lyNewBtn').addEventListener('click', () => doc.has && doc.addLayer());
  $('#lyDupBtn').addEventListener('click', () => doc.has && doc.duplicateLayer());
  $('#lyDelBtn').addEventListener('click', () => doc.has && doc.deleteLayer());
  $('#lyMergeBtn').addEventListener('click', () => doc.has && doc.mergeDown());
  $('#lyUpBtn').addEventListener('click', () => doc.has && doc.moveLayer(doc.active, doc.active + 1));
  $('#lyDownBtn').addEventListener('click', () => doc.has && doc.moveLayer(doc.active, doc.active - 1));
  $('#lyMaskBtn').addEventListener('click', () => { if (!doc.has) return; if (doc.layer.mask) doc.applyMask(); else doc.addMask(!!doc.sel); });
  $('#lyCollapse').addEventListener('click', () => { const d = $('#layersDock'); d.classList.toggle('collapsed'); $('#lyCollapse').setAttribute('aria-expanded', !d.classList.contains('collapsed')); });

  doc.on(t => { if (['layers', 'load', 'change', 'active', 'selection'].includes(t)) render(); });

  /* ---------- cores principal / secundária ---------- */
  const fgEl = $('#fgColor'), bgEl = $('#bgColor'), picker = $('#colorPickerInput');
  let editing = 'fg';
  const colors = PS.colors = {
    sync() { fgEl.style.background = doc.fg; bgEl.style.background = doc.bg; fgEl.title = `Cor principal ${doc.fg.toUpperCase()} (clique para trocar)`; bgEl.title = `Cor secundária ${doc.bg.toUpperCase()}`; },
    swap() { [doc.fg, doc.bg] = [doc.bg, doc.fg]; colors.sync(); PS.tools.renderOptions(); },
    reset() { doc.fg = '#000000'; doc.bg = '#ffffff'; colors.sync(); PS.tools.renderOptions(); }
  };
  fgEl.addEventListener('click', () => { editing = 'fg'; picker.value = doc.fg; picker.click(); });
  bgEl.addEventListener('click', () => { editing = 'bg'; picker.value = doc.bg; picker.click(); });
  picker.addEventListener('input', () => { doc[editing] = picker.value; colors.sync(); });
  picker.addEventListener('change', () => PS.tools.renderOptions());
  $('#swapColors').addEventListener('click', colors.swap);
  $('#resetColors').addEventListener('click', colors.reset);
  colors.sync();
})();
