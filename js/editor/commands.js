/* Prisma Studio — barra de menus e comandos (arquivo, editar, imagem, camada, seleção, filtro, exibir). */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc, $ = PS.$;
  const need = () => { if (!doc.has) { PS.toast('Abra ou crie uma imagem primeiro.', 'warning'); return false; } return true; };

  /* =================== ARQUIVO =================== */
  const NEW_PRESETS = [
    ['A4 retrato 300 DPI', 2480, 3508, 300], ['A4 paisagem 300 DPI', 3508, 2480, 300], ['A3 retrato 300 DPI', 3508, 4961, 300], ['Carta 300 DPI', 2550, 3300, 300],
    ['Pôster 60 × 90 cm (150 DPI)', 3543, 5315, 150], ['Foto 10 × 15 cm (300 DPI)', 1181, 1772, 300], ['Instagram quadrado', 1080, 1080, 72], ['Instagram retrato 4:5', 1080, 1350, 72],
    ['Stories / Reels', 1080, 1920, 72], ['Full HD', 1920, 1080, 72], ['4K UHD', 3840, 2160, 72], ['Miniatura YouTube', 1280, 720, 72]
  ];
  PS.newDialog = async () => {
    const body = document.createElement('div');
    body.innerHTML = `<label class="fld"><span>Modelo</span><select class="input" id="ndPreset"><option value="">Personalizado</option>${NEW_PRESETS.map((p, i) => `<option value="${i}">${p[0]} — ${p[1]} × ${p[2]} px</option>`).join('')}</select></label>
      <div class="grid3"><label class="fld"><span>Largura</span><input class="input" type="number" id="ndW" value="1920" min="1"></label><label class="fld"><span>Altura</span><input class="input" type="number" id="ndH" value="1080" min="1"></label>
      <label class="fld"><span>Unidade</span><select class="input" id="ndU"><option value="px">pixels</option><option value="cm">cm</option><option value="mm">mm</option><option value="in">polegadas</option></select></label></div>
      <label class="fld"><span>Resolução (DPI)</span><input class="input" type="number" id="ndDpi" value="300" min="10" max="1200"></label>
      <label class="fld"><span>Fundo</span><select class="input" id="ndBg"><option value="#ffffff">Branco</option><option value="#000000">Preto</option><option value="transparent">Transparente</option><option value="fg">Cor principal</option></select></label>
      <label class="fld"><span>Nome</span><input class="input" id="ndName" value="sem-titulo"></label><p class="hint" id="ndInfo"></p>`;
    const res = await PS.dialog({ title: 'Novo documento', body, okText: 'Criar', onOpen: b => {
      const info = () => { const px = toPx(b); $('#ndInfo', b).textContent = `${PS.fmtInt(px.w)} × ${PS.fmtInt(px.h)} px · ${PS.fmt(px.w * px.h / 1e6, 1)} MP` + (px.w * px.h > 120e6 ? ' — grande demais' : ''); };
      $('#ndPreset', b).addEventListener('change', e => { const p = NEW_PRESETS[e.target.value]; if (!p) return; $('#ndU', b).value = 'px'; $('#ndW', b).value = p[1]; $('#ndH', b).value = p[2]; $('#ndDpi', b).value = p[3]; info(); });
      ['ndW', 'ndH', 'ndU', 'ndDpi'].forEach(id => $('#' + id, b).addEventListener('input', info)); info();
    } });
    if (!res) return;
    const px = toPx(res); if (px.w * px.h > 120e6 || px.w < 1 || px.h < 1) { PS.toast('Tamanho inválido ou grande demais para o navegador.', 'error'); return; }
    let bg = $('#ndBg', res).value; if (bg === 'fg') bg = doc.fg;
    doc.newDocument(px.w, px.h, bg, $('#ndName', res).value || 'sem-titulo');
    PS.afterOpen && PS.afterOpen();
  };
  function toPx(b) {
    const u = $('#ndU', b).value, dpi = +$('#ndDpi', b).value || 300, k = u === 'px' ? 1 : u === 'cm' ? dpi / 2.54 : u === 'mm' ? dpi / 25.4 : dpi;
    return { w: Math.round((+$('#ndW', b).value || 1) * k), h: Math.round((+$('#ndH', b).value || 1) * k) };
  }

  // Projeto .prisma (ZIP com camadas em PNG + JSON)
  PS.saveProject = async () => {
    if (!need()) return;
    if (!window.JSZip) { PS.toast('A biblioteca ZIP não carregou.', 'error'); return; }
    let blob;
    await PS.withBusy('Salvando projeto', 'Guardando todas as camadas sem perda.', async prog => {
      const zip = new window.JSZip(), meta = { app: 'Prisma Studio', version: 2, w: doc.w, h: doc.h, name: doc.name, active: doc.active, fg: doc.fg, bg: doc.bg, layers: [] };
      for (let i = 0; i < doc.layers.length; i++) {
        const L = doc.layers[i];
        zip.file(`camadas/${i}.png`, await PS.canvasToBlob(L.canvas, 'image/png'));
        if (L.mask) zip.file(`camadas/${i}_mascara.png`, await PS.canvasToBlob(L.mask, 'image/png'));
        meta.layers.push({ name: L.name, x: L.x, y: L.y, visible: L.visible, opacity: L.opacity, blend: L.blend, type: L.type, text: L.text, maskEnabled: L.maskEnabled, mask: !!L.mask });
        prog((i + 1) / doc.layers.length * 0.8);
      }
      zip.file('projeto.json', JSON.stringify(meta, null, 1));
      zip.file('previa.jpg', await PS.canvasToBlob(doc.liveSmall(800), 'image/jpeg', 0.85));
      blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } }, m => prog(0.8 + m.percent / 500));
    });
    PS.download(blob, `${doc.name || 'projeto'}.prisma`);
    PS.toast(`Projeto salvo (${PS.bytes(blob.size)}). Abra-o depois com Arquivo › Abrir.`, 'success');
  };
  async function loadImageBlob(blob) { return PS.loadImageFile(new File([blob], 'x.png', { type: 'image/png' })); }
  PS.openProject = async file => {
    const zip = await window.JSZip.loadAsync(file), meta = JSON.parse(await zip.file('projeto.json').async('string'));
    const layers = [];
    for (let i = 0; i < meta.layers.length; i++) {
      const m = meta.layers[i], img = await loadImageBlob(await zip.file(`camadas/${i}.png`).async('blob'));
      const c = PS.canvas(img.naturalWidth, img.naturalHeight); PS.ctx(c).drawImage(img, 0, 0);
      let mask = null; if (m.mask && zip.file(`camadas/${i}_mascara.png`)) { const mi = await loadImageBlob(await zip.file(`camadas/${i}_mascara.png`).async('blob')); mask = PS.canvas(mi.naturalWidth, mi.naturalHeight); PS.ctx(mask).drawImage(mi, 0, 0); }
      layers.push(Object.assign({}, m, { canvas: c, mask }));
    }
    if (meta.fg) doc.fg = meta.fg; if (meta.bg) doc.bg = meta.bg;
    doc.loadLayers(meta.w, meta.h, layers, meta.name, meta.active);
    PS.colors && PS.colors.sync();
  };
  PS.openPsd = async file => {
    const r = await PS.withBusy('Abrindo PSD', file.name, async () => PS.psdRead(await file.arrayBuffer()));
    doc.loadLayers(r.w, r.h, r.layers, file.name.replace(/\.psd$/i, ''));
    PS.toast(`PSD aberto com ${r.layers.length} ${r.layers.length === 1 ? 'camada' : 'camadas'}. Efeitos de camada, grupos e textos editáveis do Photoshop chegam como pixels.`, 'success', 6000);
  };
  PS.exportPsd = async () => {
    if (!need()) return;
    await doc.ensureFlat();
    let blob; await PS.withBusy('Exportando PSD', `${doc.layers.length} camadas`, async () => { blob = PS.psdWrite(doc); });
    PS.download(blob, `${doc.name || 'imagem'}.psd`);
    PS.toast(`PSD exportado com ${doc.layers.length} camadas (${PS.bytes(blob.size)}).`, 'success');
  };
  PS.openAsLayer = () => { const inp = $('#layerFileInput'); inp.value = ''; inp.click(); };
  $('#layerFileInput').addEventListener('change', async e => {
    const files = [...e.target.files]; if (!files.length) return;
    for (const f of files) {
      try { const img = await PS.loadImageFile(f); addImageLayer(img, f.name.replace(/\.[^.]+$/, '')); }
      catch (err) { PS.toast(err.message, 'error'); }
    }
  });
  function addImageLayer(img, name) {
    if (!doc.has) { doc.load(img, name); PS.afterOpen && PS.afterOpen(); return; }
    let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    // grande demais: encaixa dentro do documento
    const k = Math.min(1, doc.w / w, doc.h / h); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
    const c = PS.canvas(w, h), x = PS.ctx(c); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
    const at = doc.sel ? doc.sel.bounds : null;
    doc.addLayer(c, name || 'Imagem', { x: at ? at.x : Math.round((doc.w - w) / 2), y: at ? at.y : Math.round((doc.h - h) / 2) }, 'Colar como camada');
    PS.tools.set('move');
  }
  PS.addImageLayer = addImageLayer;

  /* =================== EDITAR =================== */
  let clip = null;
  function selectedPixels(merged) {
    const src = merged ? doc.composite(1) : null, L = doc.layer;
    const base = merged ? src : L.canvas, ox = merged ? 0 : L.x, oy = merged ? 0 : L.y;
    if (!doc.sel) { return { canvas: PS.cloneCanvas(base), x: ox, y: oy }; }
    const b = doc.sel.bounds, c = PS.canvas(b.w, b.h), x = PS.ctx(c);
    x.drawImage(base, ox - b.x, oy - b.y); x.globalCompositeOperation = 'destination-in'; x.drawImage(doc.sel.canvas, -b.x, -b.y);
    return { canvas: c, x: b.x, y: b.y };
  }
  async function toSystemClipboard(c) {
    try { if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) { const blob = await PS.canvasToBlob(c, 'image/png'); await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); } } catch (_) { /* área de transferência interna continua valendo */ }
  }
  PS.copy = async merged => { if (!need()) return; clip = selectedPixels(merged); clip.t = Date.now(); await toSystemClipboard(clip.canvas); PS.toast(merged ? 'Cópia mesclada.' : 'Copiado.', 'success', 1400); };
  PS.cut = async () => { if (!need()) return; await PS.copy(false); PS.clearSelection('Recortar'); };
  PS.pasteInternal = () => {
    if (!clip) return false;
    doc.addLayer(PS.cloneCanvas(clip.canvas), 'Colado', { x: clip.x, y: clip.y }, 'Colar');
    return true;
  };
  PS.clearSelection = (label = 'Limpar') => {
    if (!need()) return;
    doc.ensureRaster();
    const L = doc.layer, t = doc.base;
    if (!doc.sel) { PS.toast('Faça uma seleção para limpar (ou use Ctrl+A).', 'info'); return; }
    const x = PS.ctx(t); x.save(); x.globalCompositeOperation = 'destination-out'; x.drawImage(doc.selMaskFor(L), 0, 0); x.restore();
    doc.commit(label, 'fa-eraser');
  };
  PS.layerViaCopy = cut => {
    if (!need()) return;
    if (!doc.sel) { doc.duplicateLayer(); return; }
    const px = selectedPixels(false);
    if (cut) { const L = doc.layer, x = PS.ctx(L.canvas); x.save(); x.globalCompositeOperation = 'destination-out'; x.drawImage(doc.selMaskFor(L), 0, 0); x.restore(); L._dirty = true; }
    doc.addLayer(px.canvas, cut ? 'Camada recortada' : 'Camada via cópia', { x: px.x, y: px.y }, cut ? 'Camada via recorte' : 'Camada via cópia');
  };
  PS.fillDialog = async () => {
    if (!need()) return;
    const body = document.createElement('div');
    body.innerHTML = `<label class="fld"><span>Conteúdo</span><select class="input" id="flC"><option value="fg">Cor principal</option><option value="bg">Cor secundária</option><option value="#000000">Preto</option><option value="#808080">Cinza 50%</option><option value="#ffffff">Branco</option><option value="aware">Preenchimento inteligente (conteúdo ao redor)</option></select></label>
      <label class="sl"><span>Opacidade</span><input type="range" id="flO" min="1" max="100" value="100"><output>100%</output></label>
      <p class="hint">${doc.sel ? 'Preenche apenas a seleção.' : 'Sem seleção: preenche a camada inteira.'}</p>`;
    const r = await PS.dialog({ title: 'Preencher', body, okText: 'Preencher', onOpen: b => { const o = $('#flO', b); o.addEventListener('input', () => { o.nextElementSibling.textContent = o.value + '%'; }); } });
    if (!r) return;
    const what = $('#flC', r).value, op = +$('#flO', r).value / 100;
    doc.ensureRaster();
    const L = doc.layer, t = doc.base;
    if (what === 'aware') {
      if (!doc.sel) { PS.toast('O preenchimento inteligente precisa de uma seleção.', 'warning'); return; }
      const b = doc.sel.bounds, pad = Math.ceil(Math.max(b.w, b.h) * 0.6) + 8;
      const x0 = Math.max(0, b.x - L.x - pad), y0 = Math.max(0, b.y - L.y - pad), x1 = Math.min(t.width, b.x - L.x + b.w + pad), y1 = Math.min(t.height, b.y - L.y + b.h + pad);
      const w = x1 - x0, h = y1 - y0, m = doc.selMaskFor(L), md = PS.ctx(m).getImageData(x0, y0, w, h).data, mask = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) mask[i] = md[i * 4 + 3] > 40 ? 1 : 0;
      await PS.withBusy('Preenchimento inteligente', 'Reconstruindo a área a partir do entorno.', async () => {
        const res = await PS.run('inpaint', { img: PS.getImg(t, x0, y0, w, h), mask });
        const c = PS.putImg(res), cx = PS.ctx(c); cx.globalCompositeOperation = 'destination-in'; cx.drawImage(m, x0, y0, w, h, 0, 0, w, h);
        PS.ctx(t).drawImage(c, x0, y0);
      });
      doc.commit('Preenchimento inteligente', 'fa-wand-magic-sparkles'); return;
    }
    const color = what === 'fg' ? doc.fg : what === 'bg' ? doc.bg : what;
    const f = PS.canvas(t.width, t.height), fx = PS.ctx(f); fx.fillStyle = color; fx.fillRect(0, 0, f.width, f.height);
    const out = PS.cloneCanvas(t), ox = PS.ctx(out); ox.globalAlpha = op; ox.drawImage(f, 0, 0);
    doc.base = doc.throughSelection(L, t, out);
    doc.commit('Preencher', 'fa-fill-drip');
  };
  // dilatação/erosão rápidas na GPU desenhando a máscara deslocada em círculo
  function dilate(canvas, r) {
    if (r <= 0) return PS.cloneCanvas(canvas);
    const c = PS.canvas(canvas.width, canvas.height), x = PS.ctx(c), n = Math.max(12, Math.min(48, Math.round(r * 3)));
    x.drawImage(canvas, 0, 0);
    for (let rr = r; rr > 0; rr -= Math.max(1, r / 3)) for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; x.drawImage(canvas, Math.cos(a) * rr, Math.sin(a) * rr); }
    return c;
  }
  function invertMask(canvas) { const c = PS.canvas(canvas.width, canvas.height), x = PS.ctx(c); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'destination-out'; x.drawImage(canvas, 0, 0); return c; }
  const erode = (canvas, r) => invertMask(dilate(invertMask(canvas), r));
  PS.strokeSelectionDialog = async () => {
    if (!need()) return; if (!doc.sel) { PS.toast('Faça uma seleção para contornar.', 'info'); return; }
    const body = document.createElement('div');
    body.innerHTML = `<label class="sl"><span>Largura</span><input type="range" id="stW" min="1" max="100" value="6"><output>6 px</output></label>
      <label class="fld"><span>Posição</span><select class="input" id="stP"><option value="center">Centro</option><option value="inside">Dentro</option><option value="outside">Fora</option></select></label><p class="hint">Usa a cor principal.</p>`;
    const r = await PS.dialog({ title: 'Contornar seleção', body, okText: 'Contornar', onOpen: b => { const i = $('#stW', b); i.addEventListener('input', () => { i.nextElementSibling.textContent = i.value + ' px'; }); } });
    if (!r) return;
    const w = +$('#stW', r).value, pos = $('#stP', r).value, m = doc.sel.canvas;
    const outer = pos === 'inside' ? m : dilate(m, pos === 'center' ? w / 2 : w), inner = pos === 'outside' ? m : erode(m, pos === 'center' ? w / 2 : w);
    const ring = PS.cloneCanvas(outer), rx = PS.ctx(ring); rx.globalCompositeOperation = 'destination-out'; rx.drawImage(inner, 0, 0);
    rx.globalCompositeOperation = 'source-in'; rx.fillStyle = doc.fg; rx.fillRect(0, 0, ring.width, ring.height);
    doc.ensureRaster(); const L = doc.layer; PS.ctx(doc.base).drawImage(ring, -L.x, -L.y);
    doc.commit('Contornar seleção', 'fa-vector-square');
  };
  PS.modifySelection = async kind => {
    if (!need() || !doc.sel) { if (doc.has) PS.toast('Não há seleção.', 'info'); return; }
    const labels = { expand: ['Expandir seleção', 'Expandir em', 8], contract: ['Contrair seleção', 'Contrair em', 8], feather: ['Difusão da seleção', 'Raio da difusão', 10], border: ['Borda da seleção', 'Largura da borda', 10], smooth: ['Suavizar seleção', 'Raio', 6] };
    const [title, lbl, def] = labels[kind], body = document.createElement('div');
    body.innerHTML = `<label class="sl"><span>${lbl}</span><input type="range" id="msR" min="1" max="200" value="${def}"><output>${def} px</output></label>`;
    const r = await PS.dialog({ title, body, okText: 'OK', onOpen: b => { const i = $('#msR', b); i.addEventListener('input', () => { i.nextElementSibling.textContent = i.value + ' px'; }); } });
    if (!r) return;
    const v = +$('#msR', r).value, m = doc.sel.canvas; let out;
    if (kind === 'expand') out = dilate(m, v);
    else if (kind === 'contract') out = erode(m, v);
    else if (kind === 'border') { out = dilate(m, v / 2); const x = PS.ctx(out); x.globalCompositeOperation = 'destination-out'; x.drawImage(erode(m, v / 2), 0, 0); }
    else if (kind === 'smooth') { const t = PS.canvas(m.width, m.height), tx = PS.ctx(t); tx.filter = `blur(${v}px)`; tx.drawImage(m, 0, 0); const id = tx.getImageData(0, 0, t.width, t.height), d = id.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 127 ? 255 : 0; tx.putImageData(id, 0, 0); out = t; }
    else { out = PS.canvas(m.width, m.height); const x = PS.ctx(out); x.filter = `blur(${v / 2}px)`; x.drawImage(m, 0, 0); }
    doc.setSelection(out);
  };
  PS.colorRangeDialog = async () => {
    if (!need()) return;
    const body = document.createElement('div');
    body.innerHTML = `<div class="color-row"><span class="grow">Cor de referência</span><input type="color" id="crC" value="${doc.fg}"></div>
      <label class="sl"><span>Tolerância</span><input type="range" id="crT" min="1" max="120" value="40"><output>40</output></label><p class="hint">Dica: pegue a cor com o conta-gotas (I) antes de abrir.</p>`;
    const r = await PS.dialog({ title: 'Selecionar gama de cores', body, okText: 'Selecionar', onOpen: b => { const i = $('#crT', b); i.addEventListener('input', () => { i.nextElementSibling.textContent = i.value; }); } });
    if (r) PS.tools.selectColorRange($('#crC', r).value, +$('#crT', r).value);
  };

  /* =================== IMAGEM =================== */
  // redimensiona todas as camadas (posições escaladas junto)
  PS.scaleAll = async (newW, newH, method = 'lanczos', strength = 60) => {
    newW = Math.round(newW); newH = Math.round(newH);
    if (newW * newH > 100e6 || newW > 32000 || newH > 32000) { PS.toast('Tamanho acima do limite seguro do navegador (100 MP).', 'error'); return false; }
    await doc.ensureFlat();
    const kx = newW / doc.w, ky = newH / doc.h, results = new Map();
    await PS.withBusy(method === 'sr' ? 'Super-resolução' : 'Redimensionando', `${PS.fmtInt(newW)} × ${PS.fmtInt(newH)} px`, async prog => {
      for (let i = 0; i < doc.layers.length; i++) {
        const L = doc.layers[i], tw = Math.max(1, Math.round(L.canvas.width * kx)), th = Math.max(1, Math.round(L.canvas.height * ky));
        PS.busy.detail(`Camada ${i + 1} de ${doc.layers.length}: ${L.name}`);
        const sub = p => prog((i + p) / doc.layers.length);
        const res = method === 'sr' && kx > 1 ? await PS.run('superResolve', { img: PS.getImg(L.canvas), w: tw, h: th, strength }, sub) : await PS.run('resize', { img: PS.getImg(L.canvas), w: tw, h: th }, sub);
        let m = null; if (L.mask) { m = PS.canvas(tw, th); const mx = PS.ctx(m); mx.imageSmoothingQuality = 'high'; mx.drawImage(L.mask, 0, 0, tw, th); }
        results.set(L, { canvas: PS.putImg(res), mask: m });
      }
    });
    doc.transformAll(newW, newH, L => { const r = results.get(L); return { canvas: r.canvas, mask: r.mask, x: Math.round(L.x * kx), y: Math.round(L.y * ky), rasterize: true }; },
      method === 'sr' ? `Super-resolução ${PS.fmtInt(newW)} × ${PS.fmtInt(newH)}` : `Tamanho da imagem ${PS.fmtInt(newW)} × ${PS.fmtInt(newH)}`, method === 'sr' ? 'fa-up-right-and-down-left-from-center' : 'fa-expand');
    PS.view.fit();
    return true;
  };
  PS.imageSizeDialog = async () => {
    if (!need()) return;
    const body = document.createElement('div');
    body.innerHTML = `<div class="grid3"><label class="fld"><span>Largura</span><input class="input" type="number" id="isW" value="${doc.w}"></label><label class="fld"><span>Altura</span><input class="input" type="number" id="isH" value="${doc.h}"></label>
      <label class="fld"><span>Unidade</span><select class="input" id="isU"><option value="px">pixels</option><option value="pct">%</option><option value="cm">cm</option></select></label></div>
      <label class="fld"><span>Resolução para cm (DPI)</span><input class="input" type="number" id="isDpi" value="300"></label>
      <label class="check"><input type="checkbox" id="isLock" checked> Manter proporção</label>
      <label class="fld"><span>Método</span><select class="input" id="isM"><option value="lanczos">Lanczos-3 (fiel, para reduzir ou ampliar)</option><option value="sr">Super-resolução (mais nítida ao ampliar)</option></select></label><p class="hint" id="isInfo"></p>`;
    const r = await PS.dialog({ title: 'Tamanho da imagem', body, okText: 'Redimensionar', onOpen: b => {
      const W = $('#isW', b), H = $('#isH', b), U = $('#isU', b), D = $('#isDpi', b);
      let unit = 'px';
      const toPx = (v, u, dim) => u === 'px' ? v : u === 'pct' ? dim * v / 100 : v / 2.54 * (+D.value || 300);
      const fromPx = (px, u, dim) => u === 'px' ? Math.round(px) : u === 'pct' ? +(px / dim * 100).toFixed(2) : +(px / (+D.value || 300) * 2.54).toFixed(2);
      const info = () => { const w = toPx(+W.value, U.value, doc.w), h = toPx(+H.value, U.value, doc.h); $('#isInfo', b).textContent = `Resultado: ${PS.fmtInt(w)} × ${PS.fmtInt(h)} px (${PS.fmt(w * h / 1e6, 1)} MP)`; };
      U.addEventListener('change', () => { const w = toPx(+W.value, unit, doc.w), h = toPx(+H.value, unit, doc.h); unit = U.value; W.value = fromPx(w, unit, doc.w); H.value = fromPx(h, unit, doc.h); info(); });
      W.addEventListener('input', () => { if ($('#isLock', b).checked) H.value = fromPx(toPx(+W.value, U.value, doc.w) * doc.h / doc.w, U.value, doc.h); info(); });
      H.addEventListener('input', () => { if ($('#isLock', b).checked) W.value = fromPx(toPx(+H.value, U.value, doc.h) * doc.w / doc.h, U.value, doc.w); info(); });
      D.addEventListener('input', info); info();
    } });
    if (!r) return;
    const U = $('#isU', r).value, dpi = +$('#isDpi', r).value || 300;
    const conv = (v, dim) => U === 'px' ? v : U === 'pct' ? dim * v / 100 : v / 2.54 * dpi;
    await PS.scaleAll(conv(+$('#isW', r).value, doc.w), conv(+$('#isH', r).value, doc.h), $('#isM', r).value);
  };
  PS.canvasSizeDialog = async () => {
    if (!need()) return;
    const body = document.createElement('div');
    body.innerHTML = `<div class="grid2"><label class="fld"><span>Largura (px)</span><input class="input" type="number" id="csW" value="${doc.w}"></label><label class="fld"><span>Altura (px)</span><input class="input" type="number" id="csH" value="${doc.h}"></label></div>
      <span class="fld"><span>Âncora</span></span><div class="anchor" id="csA">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `<button data-a="${i}" class="${i === 4 ? 'active' : ''}" aria-label="Âncora ${i + 1}"></button>`).join('')}</div>
      <label class="fld"><span>Cor da nova área</span><select class="input" id="csF"><option value="transparent">Transparente</option><option value="#ffffff">Branco</option><option value="#000000">Preto</option><option value="bg">Cor secundária</option></select></label>`;
    let anchor = 4;
    const r = await PS.dialog({ title: 'Tamanho da tela', body, okText: 'Aplicar', onOpen: b => PS.$$('#csA button', b).forEach(x => x.addEventListener('click', e => { e.preventDefault(); anchor = +x.dataset.a; PS.$$('#csA button', b).forEach(y => y.classList.toggle('active', y === x)); })) });
    if (!r) return;
    const W = Math.round(+$('#csW', r).value), H = Math.round(+$('#csH', r).value); if (!W || !H) return;
    const ax = anchor % 3, ay = Math.floor(anchor / 3), dx = Math.round((W - doc.w) * ax / 2), dy = Math.round((H - doc.h) * ay / 2);
    let fill = $('#csF', r).value; if (fill === 'bg') fill = doc.bg;
    const bottom = doc.layers[0];
    doc.transformAll(W, H, L => {
      if (L === bottom && fill !== 'transparent') {
        const c = PS.canvas(W, H), x = PS.ctx(c); x.fillStyle = fill; x.fillRect(0, 0, W, H); x.drawImage(L.canvas, L.x + dx, L.y + dy);
        let m = null; if (L.mask) { m = PS.canvas(W, H); const mx = PS.ctx(m); mx.fillStyle = '#fff'; mx.fillRect(0, 0, W, H); mx.globalCompositeOperation = 'destination-out'; mx.fillRect(L.x + dx, L.y + dy, L.mask.width, L.mask.height); mx.globalCompositeOperation = 'source-over'; mx.drawImage(L.mask, L.x + dx, L.y + dy); }
        return { canvas: c, x: 0, y: 0, mask: m };
      }
      return { canvas: L.canvas, x: L.x + dx, y: L.y + dy, mask: L.mask };
    }, `Tamanho da tela ${W} × ${H}`, 'fa-vector-square');
    PS.view.fit();
  };
  PS.rotateCanvas = deg => {
    if (!need()) return;
    const rad = deg * Math.PI / 180, swap = Math.abs(deg) % 180 === 90, W = swap ? doc.h : doc.w, H = swap ? doc.w : doc.h;
    const ow = doc.w, oh = doc.h;
    doc.transformAll(W, H, L => {
      const rot = src => { if (!src) return null; const c = PS.canvas(W, H), x = PS.ctx(c); x.translate(W / 2, H / 2); x.rotate(rad); x.drawImage(src, L.x - ow / 2, L.y - oh / 2); return c; };
      return { canvas: rot(L.canvas), mask: rot(L.mask), x: 0, y: 0 };
    }, `Girar tela ${deg > 0 ? '+' : ''}${deg}°`, deg > 0 ? 'fa-rotate-right' : 'fa-rotate-left');
    PS.view.fit();
  };
  PS.flipCanvas = horizontal => {
    if (!need()) return;
    const W = doc.w, H = doc.h;
    doc.transformAll(W, H, L => {
      const f = src => { if (!src) return null; const c = PS.canvas(src.width, src.height), x = PS.ctx(c); x.translate(horizontal ? c.width : 0, horizontal ? 0 : c.height); x.scale(horizontal ? -1 : 1, horizontal ? 1 : -1); x.drawImage(src, 0, 0); return c; };
      return { canvas: f(L.canvas), mask: f(L.mask), x: horizontal ? W - L.x - L.canvas.width : L.x, y: horizontal ? L.y : H - L.y - L.canvas.height };
    }, horizontal ? 'Espelhar tela na horizontal' : 'Espelhar tela na vertical', horizontal ? 'fa-left-right' : 'fa-up-down');
  };
  PS.flipLayer = horizontal => {
    if (!need()) return; doc.ensureRaster();
    const L = doc.layer, f = src => { const c = PS.canvas(src.width, src.height), x = PS.ctx(c); x.translate(horizontal ? c.width : 0, horizontal ? 0 : c.height); x.scale(horizontal ? -1 : 1, horizontal ? 1 : -1); x.drawImage(src, 0, 0); return c; };
    L.canvas = f(L.canvas); if (L.mask) L.mask = f(L.mask);
    doc.commit(horizontal ? 'Espelhar camada (horizontal)' : 'Espelhar camada (vertical)', 'fa-left-right');
  };
  PS.trim = async () => {
    if (!need()) return;
    const b = await PS.run('trimBounds', { img: PS.getImg(doc.composite(1)), tol: 12 });
    if (b.w === doc.w && b.h === doc.h) { PS.toast('Não há bordas uniformes para aparar.', 'info'); return; }
    await PS.tools.cropTo(b, 'Aparar bordas');
  };

  /* =================== MENUS =================== */
  const K = (s) => s; // texto do atalho
  const hasSel = () => !!doc.sel, hasDoc = () => doc.has;
  const MENU = [
    ['Arquivo', [
      ['Novo…', K('Ctrl+N'), PS.newDialog],
      ['Abrir…', K('Ctrl+O'), () => $('#fileInput').click()],
      ['Abrir como camada…', K('Ctrl+Shift+O'), PS.openAsLayer],
      '-',
      ['Salvar projeto (.prisma)', K('Ctrl+Alt+S'), PS.saveProject, hasDoc],
      ['Exportar imagem…', K('Ctrl+S'), () => PS.exportDialog(), hasDoc],
      ['Exportar PSD (Photoshop)', '', PS.exportPsd, hasDoc],
      '-',
      ['Imprimir como pôster', '', () => PS.setMode('poster'), hasDoc]
    ]],
    ['Editar', [
      ['Desfazer', K('Ctrl+Z'), () => doc.undo(), () => doc.canUndo()],
      ['Refazer', K('Ctrl+Shift+Z'), () => doc.redo(), () => doc.canRedo()],
      '-',
      ['Recortar', K('Ctrl+X'), PS.cut, hasDoc], ['Copiar', K('Ctrl+C'), () => PS.copy(false), hasDoc], ['Copiar mesclado', K('Ctrl+Shift+C'), () => PS.copy(true), hasDoc],
      ['Colar como camada', K('Ctrl+V'), () => { if (!PS.pasteInternal()) PS.toast('Use Ctrl+V para colar da área de transferência do sistema.', 'info'); }, hasDoc],
      '-',
      ['Preencher…', K('Shift+F5'), PS.fillDialog, hasDoc], ['Contornar seleção…', '', PS.strokeSelectionDialog, hasSel], ['Limpar', K('Delete'), () => PS.clearSelection(), hasSel],
      '-',
      ['Transformação livre', K('Ctrl+T'), () => PS.tools.set('transform'), hasDoc],
      ['Espelhar camada na horizontal', '', () => PS.flipLayer(true), hasDoc], ['Espelhar camada na vertical', '', () => PS.flipLayer(false), hasDoc]
    ]],
    ['Imagem', [
      ['Ajustes', '', null, hasDoc, [
        ['Níveis…', K('Ctrl+L'), () => PS.fx.open('adjust', 'levels')], ['Curvas…', K('Ctrl+M'), () => PS.panels.showTab('light', '#curveCanvas')],
        ['Brilho e contraste…', '', () => PS.fx.open('adjust', 'brightnessContrast')], ['Exposição…', '', () => PS.fx.open('adjust', 'exposure')], ['Vibração…', '', () => PS.fx.open('adjust', 'vibrance')],
        '-', ['Matiz e saturação…', K('Ctrl+U'), () => PS.fx.open('adjust', 'hueSat')], ['Equilíbrio de cores…', K('Ctrl+B'), () => PS.fx.open('adjust', 'colorBalance')],
        ['Preto e branco…', K('Ctrl+Alt+Shift+B'), () => PS.fx.open('adjust', 'blackWhite')], ['Filtro de foto…', '', () => PS.fx.open('adjust', 'photoFilter')],
        ['Mixer de canais…', '', () => PS.fx.open('adjust', 'channelMixer')], ['Mapa de degradê…', '', () => PS.fx.open('adjust', 'gradientMap')],
        ['Cor seletiva…', '', () => PS.fx.open('adjust', 'selectiveColor')], ['Substituir cor…', '', () => PS.fx.open('adjust', 'replaceColor')],
        '-', ['Sombras e realces…', '', () => PS.fx.open('adjust', 'shadowsHighlights')], ['Limiar…', '', () => PS.fx.open('adjust', 'threshold')], ['Posterizar…', '', () => PS.fx.open('adjust', 'posterize')],
        '-', ['Inverter', K('Ctrl+I'), () => PS.fx.quick('invert', 'Inverter')], ['Dessaturar', K('Ctrl+Shift+U'), () => PS.fx.quick('desaturate', 'Dessaturar')], ['Equalizar', '', () => PS.fx.quick('equalize', 'Equalizar')]
      ]],
      ['Tom automático', K('Ctrl+Shift+L'), () => PS.fx.quick('autoTone', 'Tom automático'), hasDoc],
      ['Contraste automático', K('Ctrl+Alt+Shift+L'), () => PS.fx.quick('autoContrast', 'Contraste automático'), hasDoc],
      ['Cor automática', K('Ctrl+Shift+B'), () => PS.fx.quick('autoColor', 'Cor automática'), hasDoc],
      '-',
      ['Tamanho da imagem…', K('Ctrl+Alt+I'), PS.imageSizeDialog, hasDoc], ['Tamanho da tela…', K('Ctrl+Alt+C'), PS.canvasSizeDialog, hasDoc],
      ['Girar tela', '', null, hasDoc, [['90° horário', '', () => PS.rotateCanvas(90)], ['90° anti-horário', '', () => PS.rotateCanvas(-90)], ['180°', '', () => PS.rotateCanvas(180)], '-', ['Espelhar tela na horizontal', '', () => PS.flipCanvas(true)], ['Espelhar tela na vertical', '', () => PS.flipCanvas(false)]]],
      ['Cortar para a seleção', '', () => PS.tools.cropTo(doc.sel.bounds, 'Cortar para a seleção'), hasSel], ['Aparar bordas', '', PS.trim, hasDoc],
      '-', ['Melhorar qualidade…', '', () => PS.panels.showTab('enhance'), hasDoc]
    ]],
    ['Camada', [
      ['Nova camada', K('Ctrl+Shift+N'), () => doc.addLayer(), hasDoc], ['Duplicar camada', '', () => doc.duplicateLayer(), hasDoc],
      ['Camada via cópia', K('Ctrl+J'), () => PS.layerViaCopy(false), hasDoc], ['Camada via recorte', K('Ctrl+Shift+J'), () => PS.layerViaCopy(true), hasSel],
      ['Excluir camada', '', () => doc.deleteLayer(), hasDoc],
      '-',
      ['Máscara de camada', '', null, hasDoc, [['Revelar tudo', '', () => doc.addMask(false)], ['A partir da seleção', '', () => doc.addMask(true), hasSel], ['Inverter máscara', '', () => doc.invertMask()], ['Aplicar máscara', '', () => doc.applyMask()], ['Excluir máscara', '', () => doc.deleteMask()], '-', ['Editar máscara / camada', K('\\'), () => { if (doc.layer.mask) { doc.editMask = !doc.editMask; doc.rebuildProxy(); doc.emit('layers'); PS.tools.renderOptions(); } }]]],
      ['Organizar', '', null, hasDoc, [['Trazer para a frente', K('Ctrl+Shift+]'), () => doc.moveLayer(doc.active, doc.layers.length - 1)], ['Avançar', K('Ctrl+]'), () => doc.moveLayer(doc.active, doc.active + 1)], ['Recuar', K('Ctrl+['), () => doc.moveLayer(doc.active, doc.active - 1)], ['Enviar para trás', K('Ctrl+Shift+['), () => doc.moveLayer(doc.active, 0)]]],
      '-',
      ['Rasterizar texto', '', () => doc.rasterizeLayer(), () => doc.layer && doc.layer.type === 'text'],
      ['Mesclar abaixo', K('Ctrl+E'), () => doc.mergeDown(), () => doc.active > 0], ['Mesclar visíveis', K('Ctrl+Shift+E'), () => doc.mergeVisible(), hasDoc], ['Achatar imagem', '', () => doc.flatten(), hasDoc]
    ]],
    ['Seleção', [
      ['Tudo', K('Ctrl+A'), () => doc.selectAll(), hasDoc], ['Desmarcar', K('Ctrl+D'), () => doc.deselect(), hasSel], ['Inverter seleção', K('Ctrl+Shift+I'), () => doc.invertSelection(), hasDoc],
      '-', ['Gama de cores…', '', PS.colorRangeDialog, hasDoc], ['Seleção a partir da camada', '', () => { const L = doc.layer, c = doc.blankCanvas(), x = PS.ctx(c); x.drawImage(L.canvas, L.x, L.y); doc.setSelection(c); }, hasDoc],
      '-', ['Modificar', '', null, hasSel, [['Expandir…', '', () => PS.modifySelection('expand')], ['Contrair…', '', () => PS.modifySelection('contract')], ['Difusão…', K('Shift+F6'), () => PS.modifySelection('feather')], ['Suavizar…', '', () => PS.modifySelection('smooth')], ['Borda…', '', () => PS.modifySelection('border')]]]
    ]],
    ['Filtro', null],
    ['Exibir', [
      ['Aumentar zoom', K('Ctrl++'), () => PS.view.zoomStep(1), hasDoc], ['Diminuir zoom', K('Ctrl+−'), () => PS.view.zoomStep(-1), hasDoc], ['Ajustar à tela', K('Ctrl+0'), () => PS.view.fit(), hasDoc], ['Pixels reais (100%)', K('Ctrl+1'), () => PS.view.setZoom(1), hasDoc],
      '-', ['Grade', K("Ctrl+'"), () => { PS.view.grid = !PS.view.grid; PS.view.render(); }, hasDoc, null, () => PS.view.grid],
      ['Grade de pixels em zoom alto', '', () => { PS.view.pixelGrid = !PS.view.pixelGrid; PS.view.render(); }, hasDoc, null, () => PS.view.pixelGrid],
      ['Comparar com o original', K('\\'), () => $('#btnCompare').click(), hasDoc, null, () => PS.view.compare],
      '-', ['Atalhos de teclado', K('?'), () => $('#btnHelp').click()]
    ]]
  ];
  // menu Filtro montado a partir das definições
  (() => {
    const cats = {}, order = ['Desfoque', 'Nitidez', 'Ruído', 'Pixelização', 'Artístico', 'Estilizar', 'Distorção', 'Outros'];
    Object.entries(PS.FX_DEFS).forEach(([k, d]) => { (cats[d.cat] = cats[d.cat] || []).push([d.title + (d.ctl.length ? '…' : ''), '', () => PS.fx.open('fx', k)]); });
    const items = order.filter(c => cats[c]).map(c => [c, '', null, hasDoc, cats[c]]);
    items.unshift(['Repetir último filtro', K('Ctrl+Alt+F'), () => lastFilter && PS.fx.open('fx', lastFilter), () => !!lastFilter && doc.has], '-');
    MENU.find(m => m[0] === 'Filtro')[1] = items;
  })();
  let lastFilter = null;
  PS.repeatFilter = () => { if (lastFilter && doc.has) PS.fx.open('fx', lastFilter); else PS.toast('Nenhum filtro usado ainda.', 'info'); };
  const origOpen = PS.fx.open; PS.fx.open = (kind, name) => { if (kind === 'fx') lastFilter = name; return origOpen(kind, name); };

  const bar = $('#menubar');
  let openMenu = null;
  function buildList(items) {
    const ul = document.createElement('div'); ul.className = 'menu-list'; ul.setAttribute('role', 'menu');
    for (const it of items) {
      if (it === '-') { const s = document.createElement('div'); s.className = 'menu-sep'; ul.appendChild(s); continue; }
      const [label, sc, fn, enabled, sub, checked] = it;
      const b = document.createElement(sub ? 'div' : 'button'); b.className = 'menu-item'; b.setAttribute('role', 'menuitem');
      const on = !enabled || enabled();
      if (sub) { b.tabIndex = 0; if (!on) b.classList.add('disabled'); } else b.disabled = !on;
      b.innerHTML = `<span class="mi-check">${checked && checked() ? '<i class="fa-solid fa-check"></i>' : ''}</span><span class="mi-label">${label}</span><span class="mi-sc">${sub ? '<i class="fa-solid fa-chevron-right"></i>' : sc}</span>`;
      if (sub) {
        b.classList.add('has-sub');
        const subEl = buildList(sub); subEl.classList.add('sub'); b.appendChild(subEl);
        b.addEventListener('click', e => { e.stopPropagation(); b.classList.toggle('open'); });
      } else b.addEventListener('click', e => { e.stopPropagation(); closeMenus(); if (fn) Promise.resolve(fn()).catch(err => PS.toast(err.message, 'error')); });
      ul.appendChild(b);
    }
    return ul;
  }
  function closeMenus() { PS.$$('.menu-top', bar).forEach(m => { m.classList.remove('open'); const l = m.querySelector('.menu-list'); if (l) l.remove(); }); openMenu = null; }
  function openTop(top, items) { closeMenus(); top.classList.add('open'); top.appendChild(buildList(items)); openMenu = top; }
  MENU.forEach(([name, items]) => {
    const top = document.createElement('div'); top.className = 'menu-top';
    const btn = document.createElement('button'); btn.className = 'menu-btn'; btn.textContent = name; btn.setAttribute('aria-haspopup', 'true');
    top.appendChild(btn);
    btn.addEventListener('click', e => { e.stopPropagation(); if (openMenu === top) closeMenus(); else openTop(top, items); });
    btn.addEventListener('mouseenter', () => { if (openMenu && openMenu !== top) openTop(top, items); });
    bar.appendChild(top);
  });
  document.addEventListener('click', closeMenus);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && openMenu) closeMenus(); });
  PS.closeMenus = closeMenus;
})();
