/* Prisma Studio — inicialização, abrir arquivos, modos, atalhos e tema. */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc, $ = PS.$;

  /* ---------- tema ---------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem('prisma.theme'); if (t) root.dataset.theme = t; else if (matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme = 'light'; } catch (_) { /* ok */ }
  $('#btnTheme').addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('prisma.theme', root.dataset.theme); } catch (_) { /* ok */ }
    document.querySelector('meta[name=theme-color]').content = root.dataset.theme === 'light' ? '#f4f5f3' : '#1f2226';
    PS.view.themeChanged(); PS.panels.updateHistogram(); PS.poster.update();
  });

  /* ---------- modos ---------- */
  let mode = 'editor';
  async function setMode(m) {
    if (!['editor','poster','design'].includes(m) || m === mode) return;
    if (m === 'poster' && PS.tools.isBusy()) { PS.tools.commitText && PS.tools.commitText(); }
    mode = m;
    PS.$$('.mode').forEach(b => { const on = b.dataset.mode === m; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $('#view-editor').hidden = m !== 'editor';
    $('#view-poster').hidden = m !== 'poster';
    $('#view-design').hidden = m !== 'design';
    if(m==='design'){PS.fx.close();await PS.design.activate();}
    if (m === 'poster') { PS.fx.close(); await PS.poster.refreshSource(); }
    else PS.view.render();
    syncTop();
  }
  PS.$$('.mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  PS.setMode = setMode;

  /* ---------- abrir arquivos ---------- */
  PS.afterOpen = () => { $('#emptyState').hidden = true; $('#zoomBar').hidden = false; syncTop(); if (mode === 'poster') PS.poster.refreshSource(); };
  async function openFile(file) {
    try {
      if (/\.prisma$/i.test(file.name)) { await PS.withBusy('Abrindo projeto', file.name, () => PS.openProject(file)); PS.toast(`Projeto “${doc.name}” aberto com ${doc.layers.length} camadas.`, 'success'); }
      else if (/\.psd$/i.test(file.name) || file.type === 'image/vnd.adobe.photoshop') await PS.openPsd(file);
      else {
        const img = await PS.loadImageFile(file);
        doc.load(img, file.name || 'colada');
        PS.toast(`${file.name || 'Imagem'} aberta — ${PS.fmtInt(doc.w)} × ${PS.fmtInt(doc.h)} px.`, 'success');
      }
      PS.afterOpen();
    } catch (e) { console.error(e); PS.toast(e.message || 'Não foi possível abrir o arquivo.', 'error', 6000); }
  }
  PS.openFile = openFile;
  const pick = () => $(mode==='design'?'#dsProjectInput':'#fileInput').click();
  $('#btnOpen').addEventListener('click', pick);
  $('#btnOpenEmpty').addEventListener('click', pick);
  $('#btnNewEmpty').addEventListener('click', () => PS.newDialog());
  $('#fileInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) openFile(f); });
  $('#btnSample').addEventListener('click', () => { doc.sample(); PS.afterOpen(); });

  const isImg = x => /^image\//.test(x.type) || /\.(png|jpe?g|webp|gif|bmp|avif|svg|psd|prisma)$/i.test(x.name);
  let dragDepth = 0;
  window.addEventListener('dragenter', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragDepth++; $('#dragVeil').hidden = false; $('#dragVeil p').textContent = doc.has && mode === 'editor' ? 'Solte para abrir (Shift = adicionar como camada)' : 'Solte para abrir'; } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#dragVeil').hidden = true; });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', async e => {
    e.preventDefault(); dragDepth = 0; $('#dragVeil').hidden = true;
    const files = [...(e.dataTransfer?.files || [])].filter(isImg);
    if (!files.length) { if (e.dataTransfer?.files?.length) PS.toast('Solte um arquivo de imagem, PSD ou projeto .prisma.', 'warning'); return; }
    if (e.shiftKey && doc.has) { for (const f of files) { try { PS.addImageLayer(await PS.loadImageFile(f), f.name.replace(/\.[^.]+$/, '')); } catch (err) { PS.toast(err.message, 'error'); } } return; }
    openFile(files[0]);
  });
  window.addEventListener('paste', async e => {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) {
      const f = item.getAsFile(); if (!f) return;
      if (doc.has && mode === 'editor') { try { PS.addImageLayer(await PS.loadImageFile(new File([f], 'colada.png', { type: f.type })), 'Colado'); } catch (err) { PS.toast(err.message, 'error'); } }
      else openFile(new File([f], 'colada.png', { type: f.type }));
    } else if (doc.has && mode === 'editor') PS.pasteInternal();
  });

  /* ---------- barra superior ---------- */
  function syncTop() {
    const has = doc.has;
    $('.menubar').hidden=mode==='design';
    if(mode==='design'){ $('#btnUndo').disabled=$('#dsUndo').disabled;$('#btnRedo').disabled=$('#dsRedo').disabled;$('#btnCompare').disabled=true;$('#btnExport').disabled=false;return;}
    $('#btnUndo').disabled = !has || !doc.canUndo();
    $('#btnRedo').disabled = !has || !doc.canRedo();
    $('#btnCompare').disabled = !has || mode !== 'editor';
    $('#btnExport').disabled = !has;
    $('#emptyState').hidden = has; $('#zoomBar').hidden = !has;
    $('#stageHint').hidden = !has || !$('#stageHint').textContent;
  }
  doc.on(type => { if (['load', 'change', 'layers'].includes(type)) syncTop(); });
  window.addEventListener('prisma:designchange',syncTop);
  $('#btnUndo').addEventListener('click', () => mode==='design'?PS.design.undo():doc.undo());
  $('#btnRedo').addEventListener('click', () => mode==='design'?PS.design.redo():doc.redo());
  const toggleCompare = (on) => { PS.view.compare = on == null ? !PS.view.compare : on; $('#btnCompare').setAttribute('aria-pressed', PS.view.compare); PS.view.render(); };
  $('#btnCompare').addEventListener('click', () => toggleCompare());
  $('#btnExport').addEventListener('click', () => mode==='design'?PS.design.exportPng().catch(e=>PS.toast(e.message,'error')):PS.exportDialog());

  /* ---------- ajuda ---------- */
  const SHORTCUTS = [
    ['Novo documento', 'Ctrl N'], ['Abrir', 'Ctrl O'], ['Abrir como camada', 'Ctrl Shift O'], ['Exportar imagem', 'Ctrl S'], ['Salvar projeto', 'Ctrl Alt S'],
    ['Desfazer / refazer', 'Ctrl Z / Ctrl Shift Z'], ['Copiar / recortar / colar', 'Ctrl C / X / V'], ['Copiar mesclado', 'Ctrl Shift C'],
    ['Camada via cópia', 'Ctrl J'], ['Nova camada', 'Ctrl Shift N'], ['Mesclar abaixo', 'Ctrl E'], ['Transformação livre', 'Ctrl T'],
    ['Selecionar tudo / desmarcar', 'Ctrl A / Ctrl D'], ['Inverter seleção', 'Ctrl Shift I'], ['Limpar seleção', 'Delete'], ['Preencher', 'Shift F5'],
    ['Níveis', 'Ctrl L'], ['Curvas', 'Ctrl M'], ['Matiz e saturação', 'Ctrl U'], ['Equilíbrio de cores', 'Ctrl B'], ['Inverter cores', 'Ctrl I'], ['Dessaturar', 'Ctrl Shift U'],
    ['Repetir último filtro', 'Ctrl Alt F'], ['Ajustar à tela / 100%', 'Ctrl 0 / Ctrl 1'], ['Grade', "Ctrl '"], ['Comparar com original', '\\'],
    ['Mover / mão / zoom', 'V / H / Z'], ['Seleção / varinha', 'M / W'], ['Recortar / perspectiva', 'C / P'], ['Pincel / borracha', 'B / E'],
    ['Balde / degradê', 'G / Shift G'], ['Carimbo / corretor', 'S / J'], ['Retoque / clarear-escurecer', 'R / O'], ['Liquefazer', 'Shift X'],
    ['Texto / formas / conta-gotas', 'T / U / I'], ['Trocar cores / cores padrão', 'X / D'], ['Tamanho do pincel', '[ e ]'], ['Mover a vista', 'Espaço + arrastar'],
    ['Editor / Pôster', 'Tab'], ['Zerar um controle', 'duplo clique']
  ];
  $('#btnHelp').addEventListener('click', () => PS.dialog({
    title: 'Atalhos de teclado', okText: 'Fechar', cancelText: '', wide: true,
    body: `<div class="kbd-grid">${SHORTCUTS.map(([a, k]) => `<div><span>${a}</span><span>${k.split(' ').map(x => x === '/' || x === 'e' || x === '+' || x === 'duplo' || x === 'clique' || x === 'arrastar' ? x : `<kbd>${PS.escape(x)}</kbd>`).join(' ')}</span></div>`).join('')}</div>
      <p class="hint" style="margin-top:14px">O Prisma Studio funciona sem internet e não envia suas imagens para lugar nenhum: todo o processamento acontece no seu navegador.</p>`
  }));

  /* ---------- atalhos ---------- */
  const TOOL_KEYS = { v: 'move', h: 'hand', z: 'zoom', m: 'marquee', w: 'wand', c: 'crop', p: 'perspective', b: 'brush', e: 'eraser', g: 'bucket', s: 'clone', j: 'heal', r: 'retouch', o: 'tone', t: 'text', u: 'shape', i: 'picker' };
  const CTRL = {
    n: e => e.shiftKey ? (doc.has && doc.addLayer()) : PS.newDialog(), o: e => e.shiftKey ? PS.openAsLayer() : pick(),
    s: e => e.altKey ? PS.saveProject() : (doc.has && PS.exportDialog()),
    z: e => e.shiftKey ? doc.redo() : doc.undo(), y: () => doc.redo(),
    c: e => e.shiftKey ? PS.copy(true) : PS.copy(false), x: () => PS.cut(),
    j: e => PS.layerViaCopy(e.shiftKey), a: () => doc.selectAll(), d: () => doc.deselect(),
    t: () => PS.tools.set('transform'), e: e => e.shiftKey ? doc.mergeVisible() : doc.mergeDown(),
    l: e => e.shiftKey && e.altKey ? PS.fx.quick('autoContrast', 'Contraste automático') : e.shiftKey ? PS.fx.quick('autoTone', 'Tom automático') : PS.fx.open('adjust', 'levels'),
    m: () => PS.panels.showTab('light', '#curveCanvas'),
    u: e => e.shiftKey ? PS.fx.quick('desaturate', 'Dessaturar') : PS.fx.open('adjust', 'hueSat'),
    b: e => e.shiftKey && e.altKey ? PS.fx.open('adjust', 'blackWhite') : e.shiftKey ? PS.fx.quick('autoColor', 'Cor automática') : PS.fx.open('adjust', 'colorBalance'),
    i: e => e.shiftKey ? doc.invertSelection() : e.altKey ? PS.imageSizeDialog() : PS.fx.quick('invert', 'Inverter'),
    '0': () => PS.view.fit(), '1': () => PS.view.setZoom(1), '=': () => PS.view.zoomStep(1), '+': () => PS.view.zoomStep(1), '-': () => PS.view.zoomStep(-1),
    "'": () => { PS.view.grid = !PS.view.grid; PS.view.render(); },
    ']': e => doc.moveLayer(doc.active, e.shiftKey ? doc.layers.length - 1 : doc.active + 1), '[': e => doc.moveLayer(doc.active, e.shiftKey ? 0 : doc.active - 1)
  };
  window.addEventListener('keydown', e => {
    const ae = document.activeElement, tag = ae?.tagName;
    const typing = (/^(INPUT|TEXTAREA|SELECT)$/.test(tag) && !['range', 'checkbox', 'radio', 'color', 'button'].includes(ae.type)) || ae?.isContentEditable;
    if ($('#dialog').open) return;
    if(mode==='design'){if(PS.design.key(e,typing))e.preventDefault();return;}
    const mod = e.ctrlKey || e.metaKey, k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (mod && k === 'o') { e.preventDefault(); CTRL.o(e); return; }
    if (mod && k === 'n') { e.preventDefault(); CTRL.n(e); return; }
    if (mod && k === 's') { e.preventDefault(); CTRL.s(e); return; }
    if (typing) return;
    if (mod) {
      if (k === 'v') return; // deixa o evento “paste” acontecer
      if (k === 'f' && e.altKey) { e.preventDefault(); PS.repeatFilter(); return; }
      const fn = CTRL[k];
      if (fn && (doc.has || ['n', 'o'].includes(k))) { e.preventDefault(); if (mode !== 'editor' && !['z', 'y'].includes(k)) return; Promise.resolve(fn(e)).catch(err => PS.toast(err.message, 'error')); }
      return;
    }
    if (e.key === 'Tab' && !e.shiftKey && doc.has && !e.altKey) { e.preventDefault(); setMode(mode === 'editor' ? 'poster' : 'editor'); return; }
    if (mode !== 'editor' || !doc.has) return;
    if (e.key === ' ' && !PS.view.spaceDown) { PS.view.spaceDown = true; $('#stage').classList.add('tool-hand'); e.preventDefault(); return; }
    if (PS.tools.key(e)) { e.preventDefault(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (doc.sel) PS.clearSelection(); return; }
    if (e.key === 'F5' && e.shiftKey) { e.preventDefault(); PS.fillDialog(); return; }
    if (e.key === 'F6' && e.shiftKey) { e.preventDefault(); PS.modifySelection('feather'); return; }
    if (e.key === '\\') { toggleCompare(); return; }
    if (e.key === '?') { $('#btnHelp').click(); return; }
    if (k === 'x' && e.shiftKey) { PS.tools.set('liquify'); return; }
    if (k === 'x') { PS.colors.swap(); return; }
    if (k === 'd') { PS.colors.reset(); return; }
    if (k === 'g' && e.shiftKey) { PS.tools.set('gradient'); return; }
    if (e.key === '+' || e.key === '=') { PS.view.zoomStep(1); return; }
    if (e.key === '-' || e.key === '_') { PS.view.zoomStep(-1); return; }
    if (TOOL_KEYS[k] && !e.altKey && !e.shiftKey) PS.tools.set(TOOL_KEYS[k]);
  });
  window.addEventListener('keyup', e => {
    if (e.key === ' ' && PS.view.spaceDown) { PS.view.spaceDown = false; $('#stage').classList.remove('tool-hand'); if (PS.tools.current === 'hand') $('#stage').classList.add('tool-hand'); }
  });

  window.addEventListener('beforeunload', e => { if (doc.has && doc.history.length > 1) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('error', e => { console.error(e.error || e.message); });
  window.addEventListener('unhandledrejection', e => { console.error(e.reason); PS.toast('Algo deu errado: ' + ((e.reason && e.reason.message) || e.reason), 'error', 5000); });

  syncTop();
  PS.tools.set('hand');
})();
