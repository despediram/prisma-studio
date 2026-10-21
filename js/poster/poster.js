/* Prisma Studio — montador de pôster em várias folhas: prévia, cálculo, PDF e ZIP. */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc;
  const K = PS.PT_PER_MM;

  const DEFAULTS = {
    paper: 'A4', paperW: 210, paperH: 297, orient: 'portrait', margin: 5, overlap: 10,
    mode: 'grid', cols: 2, rows: 2, targetW: 600, targetH: 0, lock: true, lockFrom: 'w', scaleDpi: 100,
    fit: 'contain', safePrint: true, glueStyle: 'tabs', zoom: 1, panX: 0, panY: 0,
    markGlue: true, markCut: true, markLabels: true, guidePage: true, skipBlank: true,
    dpi: 300, format: 'png', pdfOrient: 'auto', view: 'plan', theme: '',
    enhance: 45, lift: 0, border: 0, calX: 100, calY: 100, loupe: null
  };
  let cfg = Object.assign({}, DEFAULTS);
  try { const saved=JSON.parse(localStorage.getItem('prisma.poster') || '{}'); Object.assign(cfg,saved,{panX:0,panY:0,zoom:1,format:saved.precisionGrid===1?saved.format||'png':'png'}); if(saved.mountingVersion!==2){cfg.safePrint=true;cfg.glueStyle='tabs';cfg.margin=Math.max(5,cfg.margin);cfg.fit='contain';cfg.markGlue=true;} } catch (_) { /* sem armazenamento */ }
  cfg.precisionGrid=1;cfg.mountingVersion=2;
  const save = () => { try { localStorage.setItem('prisma.poster', JSON.stringify(cfg)); } catch (_) { /* ignora */ } };

  const src = { canvas: null, preview: null, key: '' };
  let g = null;
  const P = PS.poster = { cfg, get geometry() { return g; } };
  let rasterKey='', raster=null;
  function currentRaster() {
    const key=JSON.stringify([src.key,g.img,g.visible,g.target,cfg.enhance,cfg.lift]);
    if(key!==rasterKey){raster=PS.createPosterRaster(src.canvas,g,cfg);rasterKey=key;}
    return raster;
  }
  P.areaAspect = () => g ? g.target.w / g.target.h : null;

  /* ---------- fonte da arte ---------- */
  P.refreshSource = async () => {
    if (!doc.has) { src.canvas = src.preview = null; src.key = ''; update(); return; }
    const key = doc.version + '|' + JSON.stringify(doc.params);
    if (key !== src.key) {
      if (doc.hasDevelop()) {
        await PS.withBusy('Preparando a arte', 'Aplicando os ajustes do editor em resolução total.', async () => { src.canvas = await doc.finalCanvas(); });
      } else src.canvas = doc.flat();
      const s = Math.min(1, 2200 / Math.max(src.canvas.width, src.canvas.height));
      src.preview = s < 1 ? PS.downscale(src.canvas, src.canvas.width * s, src.canvas.height * s) : src.canvas;
      src.key = key;
      if (cfg.mode === 'size' && cfg.lock) syncTargetFields();
    }
    update();
  };

  /* ---------- controles ---------- */
  const $ = PS.$;
  const paperDims = () => cfg.paper === 'custom' ? [cfg.paperW, cfg.paperH] : PS.PAPERS[cfg.paper];
  function setSeg(id, attr, val) { PS.$$(`#${id} button`).forEach(b => b.classList.toggle('active', b.dataset[attr] === String(val))); }

  function initControls() {
    $('#pPaper').value = cfg.paper; $('#pCustomPaper').hidden = cfg.paper !== 'custom';
    $('#pPaperW').value = cfg.paperW; $('#pPaperH').value = cfg.paperH;
    setSeg('pOrient', 'o', cfg.orient); setSeg('pMode', 'm', cfg.mode); setSeg('pFit', 'f', cfg.fit); setSeg('pViewMode', 'v', cfg.view);
    PS.$$('[data-mode-panel]').forEach(p => { p.hidden = p.dataset.modePanel !== cfg.mode; });
    $('#pCols').value = cfg.cols; $('#pRows').value = cfg.rows;
    $('#pTargetW').value = +(cfg.targetW / 10).toFixed(3); $('#pTargetLock').checked = cfg.lock;
    $('#pSafePrint').checked=cfg.safePrint;$('#pGlueStyle').value=cfg.glueStyle;$('#pScaleDpi').value = cfg.scaleDpi; $('#pMargin').value = cfg.margin; $('#pOverlap').value = cfg.overlap;
    $('#pMarkGlue').checked = cfg.markGlue; $('#pMarkCut').checked = cfg.markCut; $('#pMarkLabels').checked = cfg.markLabels;
    $('#pGuidePage').checked = cfg.guidePage; $('#pSkipBlank').checked = cfg.skipBlank;
    $('#pDpi').value = cfg.dpi; $('#pFormat').value = cfg.format; $('#pPdfOrient').value = cfg.pdfOrient;
    $('#pPromptTheme').value = cfg.theme || '';
    setSeg('pEnhance', 'e', cfg.enhance); $('#pLift').value = cfg.lift; $('#pBorder').value = cfg.border;
    $('#pCalX').value = cfg.calX; $('#pCalY').value = cfg.calY;
  }
  initControls();

  const change = (k, v, opts = {}) => { cfg[k] = v;if(cfg.safePrint&&cfg.margin<5){cfg.margin=5;$('#pMargin').value=5;PS.toast('Modo A4 seguro reserva pelo menos 5 mm para a impressora.','info');} if (opts.resetPan) { cfg.panX = 0; cfg.panY = 0; } save(); update(); };
  $('#pPaper').addEventListener('change', e => { cfg.paper = e.target.value; $('#pCustomPaper').hidden = cfg.paper !== 'custom'; change('paper', cfg.paper); });
  $('#pPaperW').addEventListener('change', e => change('paperW', PS.clamp(+e.target.value || 210, 50, 2000)));
  $('#pPaperH').addEventListener('change', e => change('paperH', PS.clamp(+e.target.value || 297, 50, 2000)));
  PS.$$('#pOrient button').forEach(b => b.addEventListener('click', () => { setSeg('pOrient', 'o', b.dataset.o); change('orient', b.dataset.o, { resetPan: true }); }));
  PS.$$('#pMode button').forEach(b => b.addEventListener('click', () => {
    setSeg('pMode', 'm', b.dataset.m);
    PS.$$('[data-mode-panel]').forEach(p => { p.hidden = p.dataset.modePanel !== b.dataset.m; });
    // ao trocar de modo, parte do tamanho atual para não “pular”
    if (g && b.dataset.m === 'size') { cfg.targetW = g.finalW; cfg.targetH = g.finalH; cfg.lockFrom = 'w'; syncTargetFields(true); }
    change('mode', b.dataset.m, { resetPan: true });
  }));
  PS.$$('#pFit button').forEach(b => b.addEventListener('click', () => { setSeg('pFit', 'f', b.dataset.f); change('fit', b.dataset.f, { resetPan: true }); }));
  PS.$$('#pViewMode button').forEach(b => b.addEventListener('click', () => { setSeg('pViewMode', 'v', b.dataset.v); change('view', b.dataset.v); }));
  $('#pCols').addEventListener('input', e => { if (+e.target.value >= 1) change('cols', PS.clamp(Math.round(+e.target.value), 1, 30), { resetPan: true }); });
  $('#pRows').addEventListener('input', e => { if (+e.target.value >= 1) change('rows', PS.clamp(Math.round(+e.target.value), 1, 30), { resetPan: true }); });
  $('#pTargetW').addEventListener('input', e => { cfg.lockFrom = 'w'; cfg.targetW = (+e.target.value || 0) * 10; syncTargetFields(); change('targetW', cfg.targetW); });
  $('#pTargetH').addEventListener('input', e => { cfg.lockFrom = 'h'; cfg.targetH = (+e.target.value || 0) * 10; syncTargetFields(); change('targetH', cfg.targetH); });
  $('#pTargetLock').addEventListener('change', e => { cfg.lock = e.target.checked; syncTargetFields(); change('lock', cfg.lock, { resetPan: true }); });
  const bindR = (id, key, fmt, k = 1) => PS.bindRange($('#' + id), (v) => change(key, v * k), fmt);
  $('#pSafePrint').addEventListener('change',e=>change('safePrint',e.target.checked));
  $('#pGlueStyle').addEventListener('change',e=>change('glueStyle',e.target.value));
  $('#pSafeA4').addEventListener('click',()=>{Object.assign(cfg,{paper:'A4',paperW:210,paperH:297,orient:'portrait',mode:'grid',safePrint:true,margin:5,overlap:10,fit:'contain',glueStyle:'tabs',zoom:1,panX:0,panY:0,border:0,markGlue:true,markCut:true,markLabels:true});initControls();save();update();PS.toast('A4 seguro: imagem inteira, margem de 5 mm e abas brancas de 10 mm. Confira o tamanho final.','success');});
  bindR('pMargin', 'margin', v => `${PS.fmt(v, 1)} mm`);
  bindR('pOverlap', 'overlap', v => `${PS.fmt(v, 1)} mm`);
  bindR('pScaleDpi', 'scaleDpi', v => `${v} DPI`);
  const zoomCtl = PS.bindRange($('#pZoom'), v => change('zoom', v / 100), v => `${v}%`);
  [['pMarkGlue', 'markGlue'], ['pMarkCut', 'markCut'], ['pMarkLabels', 'markLabels'], ['pGuidePage', 'guidePage'], ['pSkipBlank', 'skipBlank']]
    .forEach(([id, k]) => $('#' + id).addEventListener('change', e => change(k, e.target.checked)));
  $('#pDpi').addEventListener('change', e => change('dpi', +e.target.value));
  $('#pFormat').addEventListener('change', e => change('format', e.target.value));
  $('#pPdfOrient').addEventListener('change', e => change('pdfOrient', e.target.value));
  $('#pPromptTheme').addEventListener('input', e => { cfg.theme = e.target.value; save(); updatePrompt(); });
  PS.$$('#pEnhance button').forEach(b => b.addEventListener('click', () => { setSeg('pEnhance', 'e', b.dataset.e); change('enhance', +b.dataset.e); }));
  bindR('pLift', 'lift', v => `${v}%`);
  bindR('pBorder', 'border', v => v ? `${v} mm` : 'sem borda');
  const calInfo = () => {
    const fx = 100 / (cfg.calX || 100), fy = 100 / (cfg.calY || 100);
    $('#pCalInfo').textContent = Math.abs(fx - 1) < 1e-4 && Math.abs(fy - 1) < 1e-4 ? 'Sem correção informada. Confira as duas medidas na folha de teste.' : `Correção aplicada ao PDF: ${PS.fmt((fx - 1) * 100, 2)}% na horizontal e ${PS.fmt((fy - 1) * 100, 2)}% na vertical.`;
  };
  ['pCalX', 'pCalY'].forEach(id => $('#' + id).addEventListener('input', e => { const v = +e.target.value; if (v >= 80 && v <= 120) { cfg[id === 'pCalX' ? 'calX' : 'calY'] = v; save(); calInfo(); } }));
  calInfo();

  function syncTargetFields(force) {
    const iw = src.canvas ? src.canvas.width : 1, ih = src.canvas ? src.canvas.height : 1, a = iw / ih;
    if (cfg.lock) {
      if (cfg.lockFrom === 'h') cfg.targetW = cfg.targetH * a; else cfg.targetH = cfg.targetW / a;
    }
    if (!cfg.targetH) cfg.targetH = cfg.targetW / a;
    const active = document.activeElement;
    if (force || active !== $('#pTargetW')) $('#pTargetW').value = +(cfg.targetW / 10).toFixed(3);
    if (force || active !== $('#pTargetH')) $('#pTargetH').value = +(cfg.targetH / 10).toFixed(3);
  }

  function renderChips() {
    const [pw0, ph0] = paperDims();
    const gp = $('#pGridPresets'), combos = [[1, 2], [2, 1], [2, 2], [2, 3], [3, 2], [3, 3], [3, 4], [4, 3], [4, 4], [5, 5]];
    gp.innerHTML = combos.map(([c, r]) => {
      const gg = PS.posterGeometry(Object.assign({}, cfg, { mode: 'grid', cols: c, rows: r, paperW: pw0, paperH: ph0 }), 1000, 1000);
      return `<button class="chip${cfg.mode === 'grid' && cfg.cols === c && cfg.rows === r ? ' active' : ''}" data-c="${c}" data-r="${r}" title="${PS.fmt(gg.areaW / 10, 1)} × ${PS.fmt(gg.areaH / 10, 1)} cm">${c}×${r}</button>`;
    }).join('');
    PS.$$('button', gp).forEach(b => b.addEventListener('click', () => { cfg.cols = +b.dataset.c; cfg.rows = +b.dataset.r; $('#pCols').value = cfg.cols; $('#pRows').value = cfg.rows; change('cols', cfg.cols, { resetPan: true }); }));
    const sp = $('#pSizePresets'), sizes = [['30×40', 300, 400], ['40×60', 400, 600], ['50×70', 500, 700], ['60×90', 600, 900], ['70×100', 700, 1000], ['A2', 420, 594], ['A1', 594, 841], ['A0', 841, 1189]];
    sp.innerHTML = sizes.map(([l, w, h]) => `<button class="chip" data-w="${w}" data-h="${h}" title="${l} cm — gira sozinho para acompanhar a imagem">${l}</button>`).join('');
    PS.$$('button', sp).forEach(b => b.addEventListener('click', () => {
      let w = +b.dataset.w, h = +b.dataset.h;
      if (src.canvas && src.canvas.width > src.canvas.height) [w, h] = [h, w];
      cfg.lock = false; $('#pTargetLock').checked = false; cfg.targetW = w; cfg.targetH = h; syncTargetFields(true);
      change('targetW', w, { resetPan: true });
    }));
  }

  /* ---------- atualização principal ---------- */
  function currentCfg() {
    const [pw, ph] = paperDims();
    return Object.assign({}, cfg, { paperW: pw, paperH: ph });
  }
  function update() {
    renderChips();
    const has = !!src.canvas;
    $('#pEmpty').hidden = has;
    $('#pExportPdf').disabled = !has; $('#pExportZip').disabled = !has; $('#pPrintNow').disabled = !has;
    if (!has) { g = null; drawPreview(); $('#pSheets').innerHTML = ''; resetStats(); renderSteps(); updatePrompt(); return; }
    if (cfg.mode === 'size') syncTargetFields();
    g = PS.posterGeometry(currentCfg(), src.canvas.width, src.canvas.height);
    $('#pMargin').value=g.margin;$('#pMargin').parentElement.querySelector('output').textContent=PS.fmt(g.margin,1)+' mm';$('#pOverlap').value=g.ov;$('#pOverlap').parentElement.querySelector('output').textContent=PS.fmt(g.ov,1)+' mm';zoomCtl.set(cfg.zoom*100);
    $('#pPrintLayoutInfo').textContent=`${cfg.glueStyle==='tabs'?'Abas brancas separadas da arte':'Sobreposição com imagem repetida'} · ${PS.fmt(g.margin,1)} mm de margem da impressora · ${PS.fmt(g.ov,1)} mm de cola. A arte montada mede ${PS.fmt(g.finalW/10,2)} × ${PS.fmt(g.finalH/10,2)} cm.`;
    $('#pZoomRow').querySelector('input').disabled = false;
    $('#pCanvas').classList.toggle('draggable', g.canPan);
    // estatísticas
    $('#sSize').textContent = `${PS.fmt(g.finalW / 10, 2)} × ${PS.fmt(g.finalH / 10, 2)} cm`;
    const printed = g.tiles.filter(t => !(t.blank && cfg.skipBlank)).length;
    $('#sSheets').textContent = `${printed} ${PS.PAPER_NAMES[cfg.paper]} · ${g.cols}×${g.rows}`;
    $('#sCell').textContent = `${PS.fmt(g.cw / 10, 1)} × ${PS.fmt(g.ch / 10, 1)} cm`;
    const q = PS.dpiQuality(g.effDpi);
    $('#sDpi').innerHTML = `${Math.round(g.effDpi)} DPI · <span style="color:${q.color}">${q.label}</span>`;
    if (srActive()) $('#sDpi').innerHTML += ' <span class="sr-badge" title="Nitidez calculada na grade única do pôster, sem recalcular as emendas por folha">+ nitidez</span>';
    $('#sDpi').title = q.note;
    $('#sDpiBar').style.width = `${q.pct * 100}%`; $('#sDpiBar').style.background = q.color;
    const notes = [...g.warnings];
    if(g.margin<3)notes.unshift('Margem menor que 3 mm: exige impressão sem bordas. Para impressora comum, use 5 mm; o tamanho ou a quantidade de folhas será recalculado.');
    if(cfg.zoom>1&&cfg.fit==='contain')notes.unshift('Zoom acima de 100% pode cortar a imagem. Use A4 seguro para preservar a arte inteira.');
    if(g.ov===0&&cfg.markGlue)notes.unshift('Sobreposição em 0 mm: não há faixa para cola. Aumente Sobreposição para colar (recomendado: 10 mm).');
    if (g.effDpi < 150) notes.push(`Imagem com pouca resolução para esse tamanho (${q.note}).`);
    if (cfg.fit === 'cover' && (g.img.w - g.artRect.w > 1 || g.img.h - g.artRect.h > 1)) notes.push('Parte da imagem fica fora — arraste para enquadrar.');
    $('#pNote').textContent = notes[0] || `${PS.fmt(g.ov, 1)} mm de sobreposição · margem de ${PS.fmt(g.margin, 1)} mm`;
    $('#pNote').title = notes.join('\n');
    // sugestão de ampliação
    const up = $('#pUpscaleHint');
    if (doc.has && g.effDpi < 200) {
      const want = Math.min(300 / g.effDpi, 4, Math.sqrt(100e6 / (doc.w * doc.h)));
      const f = Math.max(1.5, Math.round(want * 2) / 2);
      up.hidden = want < 1.4;
      up.dataset.f = f;
      up.querySelector('span').textContent = `Ampliar a imagem ${PS.fmt(f, f % 1 ? 1 : 0)}× (≈ ${Math.round(g.effDpi * f)} DPI no pôster)`;
    } else up.hidden = true;
    // sugestão de orientação que gasta menos folhas
    const tip = $('#pOrientTip');
    if (cfg.mode !== 'grid') {
      const other = PS.posterGeometry(Object.assign(currentCfg(), { orient: cfg.orient === 'portrait' ? 'landscape' : 'portrait' }), src.canvas.width, src.canvas.height);
      const nOther = other.tiles.filter(t => !(t.blank && cfg.skipBlank)).length;
      tip.hidden = !(nOther < printed);
      if (!tip.hidden) tip.innerHTML = `<i class="fa-solid fa-lightbulb"></i>Em ${cfg.orient === 'portrait' ? 'paisagem' : 'retrato'} usaria ${nOther} folhas em vez de ${printed}. Trocar`;
    } else tip.hidden = true;
    renderSteps(); drawPreview(); scheduleSheets(); updatePrompt(); scheduleLoupe();
    P.assembly?.invalidate();
  }
  P.update = update;
  P.drawPreview = drawPreview;
  function resetStats() { ['#sSize', '#sSheets', '#sCell', '#sDpi'].forEach(s => { $(s).textContent = '—'; }); $('#sDpiBar').style.width = '0'; $('#pNote').textContent = ''; $('#pUpscaleHint').hidden = true; }

  $('#pOrientTip').addEventListener('click', () => { const o = cfg.orient === 'portrait' ? 'landscape' : 'portrait'; setSeg('pOrient', 'o', o); change('orient', o, { resetPan: true }); });
  $('#pUpscaleHint').addEventListener('click', async e => {
    const f = +e.currentTarget.dataset.f;
    const ok = await PS.upscaleTo(f);
    if (ok) await P.refreshSource();
  });

  function renderSteps() {
    const ol = $('#pSteps');
    if (!g) { ol.innerHTML = '<li>Abra uma imagem para ver as instruções de montagem.</li>'; return; }
    const paper = `${PS.PAPER_NAMES[cfg.paper]} ${g.pageW > g.pageH ? 'paisagem' : 'retrato'}`;
    const rotated = cfg.pdfOrient === 'portrait' && g.pageW > g.pageH;
    const items = [
      `Imprima o PDF em <strong>tamanho real (100%)</strong>, papel ${paper}${rotated ? ' (as páginas saem em pé; depois deite as folhas)' : ''}. ${cfg.guidePage ? 'Meça a régua de 10 cm da primeira página para conferir a escala.' : ''}`,
      `Organize as folhas pelo código: a letra é a linha (A = topo) e o número é a coluna (1 = esquerda).`
    ];
    if (g.ov > 0) {
      items.push(`Nas folhas com vizinha <strong>à esquerda ou acima</strong>, corte só a margem branca desses lados${cfg.markCut ? ', seguindo as marcas de corte' : ''}. <strong>${cfg.glueStyle==='tabs'?'Não corte as abas brancas à direita/embaixo da folha que fica por baixo.':'Não corte a faixa de imagem repetida.'}</strong>`);
      items.push(`Monte da esquerda para a direita e de cima para baixo: deite cada folha por cima da anterior, alinhando a borda cortada ao <strong>início da faixa marcada para cola</strong>, fazendo o fim da arte de uma folha coincidir com o início da arte da próxima. ${cfg.glueStyle==='tabs'?'A aba branca':'A faixa de imagem repetida'} de ${PS.fmt(g.ov, 1)} mm fica escondida — passe cola em bastão ou fita dupla face nela.`);
    } else {
      items.push('Corte a margem branca de todos os lados que encostam em outra folha.');
      items.push('Encoste as bordas sem sobrepor e una por trás com fita adesiva.');
    }
    if(cfg.safePrint)items.push('O modo seguro conserva 5 mm livres nas bordas de cada A4. Recorte as margens esquerda/superior das folhas internas até o início da arte; deixe as abas brancas da folha anterior por baixo.');
    items.push('Confira um detalhe da imagem nos dois extremos de cada emenda antes de colar. Não use Ajustar à página: a escala deve ser idêntica em todas as folhas.');
    items.push('Por fim, apare a margem externa e qualquer sobra fora do contorno azul do tamanho final.');
    ol.innerHTML = items.map(i => `<li>${i}</li>`).join('');
  }

  /* ---------- prévia ---------- */
  const pc = $('#pCanvas'), wrap = $('#pCanvasWrap');
  let layout = null, drawRaf = 0;
  new ResizeObserver(() => drawPreview()).observe(wrap);
  function drawPreview() { if (!drawRaf) drawRaf = requestAnimationFrame(doDraw); }
  function doDraw() {
    drawRaf = 0;
    const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    pc.width = Math.max(1, Math.round(r.width * dpr)); pc.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = pc.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pc.width, pc.height);
    if (!g || !src.preview) { layout = null; return; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const view = cfg.view, pad = 44;
    const exploded = view === 'exploded';
    const gap = exploded ? Math.max(6, g.pageW * 0.06) : 0;
    // extensão em mm do que será desenhado
    let extW, extH, asm = null;
    if(view==='assembly'){P.assembly?.draw(ctx,r.width,r.height,dpr);return;}
    if (exploded) { extW = g.cols * g.pageW + (g.cols - 1) * gap; extH = g.rows * g.pageH + (g.rows - 1) * gap; }
    else if (view === 'assembled') {
      // parede com uma pessoa de 1,70 m como referência de escala; centro do pôster a 1,50 m do chão
      const top = Math.max(1700, 1500 + g.finalH / 2);
      extW = g.finalW + 420; extH = top; asm = { top, center: 1500 };
    }
    else { extW = g.areaW; extH = g.areaH; }
    const s = Math.min((r.width - pad * 2) / extW, (r.height - pad * 2) / extH);
    const X0 = (r.width - extW * s) / 2, Y0 = (r.height - extH * s) / 2;
    layout = { s, X0, Y0 };
    const img = src.preview;

    const drawArt = (clip, offX, offY) => {
      // clip: retângulo em mm do pôster; offX/offY: posição na tela do ponto (0,0) do pôster
      ctx.save(); ctx.beginPath(); ctx.rect(offX + clip.x * s, offY + clip.y * s, clip.w * s, clip.h * s); ctx.clip();
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, offX + g.img.x * s, offY + g.img.y * s, g.img.w * s, g.img.h * s);
      ctx.restore();
    };
    const vis = g.visible;

    if (view === 'plan') {
      // imagem cortada aparece esmaecida fora do alvo
      ctx.save(); ctx.globalAlpha = 0.18; ctx.drawImage(img, X0 + g.img.x * s, Y0 + g.img.y * s, g.img.w * s, g.img.h * s); ctx.restore();
      // papel (células)
      ctx.fillStyle = '#ffffff'; ctx.fillRect(X0, Y0, g.areaW * s, g.areaH * s);
      drawArt(vis, X0, Y0);
      // faixas de sobreposição e emendas
      ctx.save();
      for (let c = 1; c < g.cols; c++) { const x = X0 + c * g.stepX * s; ctx.fillStyle = 'rgba(230,0,126,.22)'; ctx.fillRect(x, Y0, g.ov * s, g.areaH * s); }
      for (let rr = 1; rr < g.rows; rr++) { const y = Y0 + rr * g.stepY * s; ctx.fillStyle = 'rgba(230,0,126,.22)'; ctx.fillRect(X0, y, g.areaW * s, g.ov * s); }
      ctx.strokeStyle = 'rgba(230,0,126,.95)'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      for (let c = 1; c < g.cols; c++) { const x = X0 + c * g.stepX * s; ctx.beginPath(); ctx.moveTo(x, Y0); ctx.lineTo(x, Y0 + g.areaH * s); ctx.stroke(); }
      for (let rr = 1; rr < g.rows; rr++) { const y = Y0 + rr * g.stepY * s; ctx.beginPath(); ctx.moveTo(X0, y); ctx.lineTo(X0 + g.areaW * s, y); ctx.stroke(); }
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(20,24,28,.55)'; ctx.lineWidth = 1;
      g.tiles.forEach(t => ctx.strokeRect(X0 + t.x0 * s + 0.5, Y0 + t.y0 * s + 0.5, g.cw * s - 1, g.ch * s - 1));
      // alvo
      ctx.strokeStyle = css.getPropertyValue('--cyan'); ctx.lineWidth = 2; ctx.setLineDash([]);
      ctx.strokeRect(X0 + g.target.x * s, Y0 + g.target.y * s, g.target.w * s, g.target.h * s);
      ctx.restore();
      // códigos
      g.tiles.forEach(t => {
        const cx = X0 + (t.x0 + g.cw / 2) * s, cy = Y0 + (t.y0 + g.ch / 2) * s;
        const blank = t.blank && cfg.skipBlank;
        badge(ctx, blank ? `${t.code} (vazia)` : t.code, cx, cy, blank);
      });
      rulers(ctx, X0, Y0, g.areaW, g.areaH, s, css);
      loupeMarker(ctx, X0, Y0, s);
    } else if (view === 'assembled') {
      const floorY = Y0 + asm.top * s;
      const AX = X0, AY = floorY - (asm.center + g.finalH / 2) * s, AW = g.finalW * s, AH = g.finalH * s;
      layout.AX = AX; layout.AY = AY;
      ctx.save(); ctx.strokeStyle = css.getPropertyValue('--text-3'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X0 - 20, floorY); ctx.lineTo(X0 + extW * s + 20, floorY); ctx.stroke(); ctx.restore();
      person(ctx, X0 + (g.finalW + 220) * s, floorY, 1700 * s, css);
      const offX = AX - g.finalRect.x * s, offY = AY - g.finalRect.y * s;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillStyle = '#fff';
      ctx.fillRect(AX, AY, AW, AH); ctx.restore();
      drawArt(vis, offX, offY);
      // emendas sutis onde as folhas se encontram
      ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      for (let c = 1; c < g.cols; c++) { const x = offX + c * g.stepX * s; if (x > AX && x < AX + AW) { ctx.beginPath(); ctx.moveTo(x, AY); ctx.lineTo(x, AY + AH); ctx.stroke(); } }
      for (let rr = 1; rr < g.rows; rr++) { const y = offY + rr * g.stepY * s; if (y > AY && y < AY + AH) { ctx.beginPath(); ctx.moveTo(AX, y); ctx.lineTo(AX + AW, y); ctx.stroke(); } }
      ctx.restore();
      rulers(ctx, AX, AY, g.finalW, g.finalH, s, css);
      loupeMarker(ctx, offX, offY, s);
    } else {
      // folhas separadas, como saem da impressora
      g.tiles.forEach(t => {
        const px = X0 + t.c * (g.pageW + gap) * s, py = Y0 + t.r * (g.pageH + gap) * s;
        const blank = t.blank && cfg.skipBlank;
        ctx.save(); ctx.globalAlpha = blank ? 0.35 : 1;
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 3; ctx.fillStyle = '#fff';
        ctx.fillRect(px, py, g.pageW * s, g.pageH * s); ctx.shadowColor = 'transparent';
        const offX = px + (g.margin - t.x0) * s, offY = py + (g.margin - t.y0) * s;
        const core=cfg.glueStyle==='tabs'?PS.posterCoreRect(g,t):{w:g.cw,h:g.ch};
        const cell = { x: t.x0, y: t.y0, w: core.w, h: core.h };
        const inter = { x: Math.max(cell.x, vis.x), y: Math.max(cell.y, vis.y) };
        inter.w = Math.min(cell.x + cell.w, vis.x + vis.w) - inter.x; inter.h = Math.min(cell.y + cell.h, vis.y + vis.h) - inter.y;
        if (inter.w > 0 && inter.h > 0) drawArt(inter, offX, offY);
        if(cfg.markGlue)PS.posterDrawGlueCanvas(ctx,g,t,px,py,s,undefined,cfg.glueStyle);
        ctx.setLineDash([]); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.strokeRect(px + g.margin * s, py + g.margin * s, g.cw * s, g.ch * s);
        ctx.restore();
        badge(ctx, t.code, px + g.pageW * s / 2, py + g.pageH * s / 2, blank);
      });
    }
  }
  function loupeMarker(ctx, ox, oy, s) {
    const r = loupeRect(); if (!r) return;
    ctx.save(); ctx.strokeStyle = '#ffd200'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 3;
    const w = Math.max(10, r.w * s), h = Math.max(8, r.h * s), cx = ox + (r.x + r.w / 2) * s, cy = oy + (r.y + r.h / 2) * s;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h); ctx.restore();
  }
  function badge(ctx, text, x, y, dim) {
    ctx.save(); ctx.font = '700 12px system-ui, sans-serif'; const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = dim ? 'rgba(80,80,80,.75)' : 'rgba(20,24,28,.82)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 0.5); ctx.restore();
  }
  function rulers(ctx, X0, Y0, wmm, hmm, s, css) {
    ctx.save(); ctx.strokeStyle = css.getPropertyValue('--text-3'); ctx.fillStyle = css.getPropertyValue('--text-2'); ctx.lineWidth = 1;
    ctx.font = '10px system-ui, sans-serif';
    const stepCm = [1, 2, 5, 10, 20, 50, 100].find(v => v * 10 * s >= 34) || 100;
    ctx.beginPath(); ctx.moveTo(X0, Y0 - 10); ctx.lineTo(X0 + wmm * s, Y0 - 10); ctx.moveTo(X0 - 10, Y0); ctx.lineTo(X0 - 10, Y0 + hmm * s); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (let cm = 0; cm * 10 <= wmm + 0.01; cm += stepCm) { const x = X0 + cm * 10 * s; ctx.beginPath(); ctx.moveTo(x, Y0 - 14); ctx.lineTo(x, Y0 - 6); ctx.stroke(); ctx.fillText(cm, x, Y0 - 16); }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let cm = 0; cm * 10 <= hmm + 0.01; cm += stepCm) { const y = Y0 + cm * 10 * s; ctx.beginPath(); ctx.moveTo(X0 - 14, y); ctx.lineTo(X0 - 6, y); ctx.stroke(); if (cm) ctx.fillText(cm, X0 - 16, y); }
    ctx.fillText('cm', X0 - 16, Y0 - 16);
    ctx.restore();
  }
  function person(ctx, x, yBase, h, css) {
    if (h < 30) return;
    ctx.save(); ctx.fillStyle = css.getPropertyValue('--text-3'); ctx.globalAlpha = 0.32;
    const u = h / 8;
    ctx.beginPath(); ctx.arc(x + u * 0.6, yBase - h + u * 0.55, u * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x, yBase - h + u * 1.15, u * 1.2, u * 3.2, u * 0.4); ctx.fill();
    ctx.fillRect(x + u * 0.12, yBase - h + u * 4.1, u * 0.42, h - u * 4.1); ctx.fillRect(x + u * 0.66, yBase - h + u * 4.1, u * 0.42, h - u * 4.1);
    ctx.globalAlpha = 1; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('1,70 m', x + u * 0.6, yBase + 12);
    ctx.restore();
  }

  // arrastar para enquadrar / roda para zoom
  let pdrag = null;
  let pclick = null;
  pc.addEventListener('pointerdown', e => {
    if (!g || cfg.view === 'exploded'||cfg.view==='assembly') return;
    pclick = { x: e.clientX, y: e.clientY };
    if (!g.canPan) return;
    pc.setPointerCapture(e.pointerId); pc.classList.add('dragging');
    pdrag = { x: e.clientX, y: e.clientY, px: cfg.panX, py: cfg.panY };
  });
  pc.addEventListener('click', e => {
    if (cfg.view==='assembly') return;
    if (!g || !layout || !pclick || Math.hypot(e.clientX - pclick.x, e.clientY - pclick.y) > 4) return;
    const r = pc.getBoundingClientRect(), ox = cfg.view === 'assembled' ? layout.AX - g.finalRect.x * layout.s : layout.X0, oy = cfg.view === 'assembled' ? layout.AY - g.finalRect.y * layout.s : layout.Y0;
    cfg.loupe = { x: (e.clientX - r.left - ox) / layout.s, y: (e.clientY - r.top - oy) / layout.s };
    drawPreview(); scheduleLoupe(true);
  });
  pc.addEventListener('pointermove', e => {
    if (!pdrag || !layout) return;
    const dx = (e.clientX - pdrag.x) / layout.s, dy = (e.clientY - pdrag.y) / layout.s;
    const slackX = g.img.w - g.artRect.w, slackY = g.img.h - g.artRect.h;
    cfg.panX = Math.abs(slackX) > 0.01 ? PS.clamp(pdrag.px - 2 * dx / slackX, -1, 1) : 0;
    cfg.panY = Math.abs(slackY) > 0.01 ? PS.clamp(pdrag.py - 2 * dy / slackY, -1, 1) : 0;
    g = PS.posterGeometry(currentCfg(), src.canvas.width, src.canvas.height);
    $('#pMargin').value=g.margin;$('#pMargin').parentElement.querySelector('output').textContent=PS.fmt(g.margin,1)+' mm';$('#pOverlap').value=g.ov;$('#pOverlap').parentElement.querySelector('output').textContent=PS.fmt(g.ov,1)+' mm';zoomCtl.set(cfg.zoom*100);
    $('#pPrintLayoutInfo').textContent=`${cfg.glueStyle==='tabs'?'Abas brancas separadas da arte':'Sobreposição com imagem repetida'} · ${PS.fmt(g.margin,1)} mm de margem da impressora · ${PS.fmt(g.ov,1)} mm de cola. A arte montada mede ${PS.fmt(g.finalW/10,2)} × ${PS.fmt(g.finalH/10,2)} cm.`;
    drawPreview();
  });
  const endDrag = () => { if (pdrag) { pdrag = null; pc.classList.remove('dragging'); save(); update(); } };
  pc.addEventListener('pointerup', endDrag); pc.addEventListener('pointercancel', endDrag);
  pc.addEventListener('wheel', e => {
    if (!g) return; e.preventDefault();
    if(cfg.view==='assembly')return;
    const z = PS.clamp(Math.round(cfg.zoom * 100 * Math.exp(-e.deltaY * 0.0015)), 100, 300);
    zoomCtl.set(z); change('zoom', z / 100);
  }, { passive: false });

  /* ---------- miniaturas das folhas ---------- */
  let sheetTimer = 0;
  function scheduleSheets() { clearTimeout(sheetTimer); sheetTimer = setTimeout(renderSheets, 120); }
  function renderSheets() {
    const box = $('#pSheets');
    if (!g) { box.innerHTML = ''; return; }
    const tw = 140, th = Math.round(tw * g.pageH / g.pageW), s = tw / g.pageW;
    box.innerHTML = '';
    g.tiles.forEach(t => {
      const blank = t.blank && cfg.skipBlank;
      const card = document.createElement('div'); card.className = 'sheet-card' + (blank ? ' skipped' : '');
      const c = PS.canvas(tw, th), x = PS.ctx(c);
      x.fillStyle = '#fff'; x.fillRect(0, 0, tw, th);
      x.save(); x.beginPath(); x.rect(g.margin * s, g.margin * s, g.cw * s, g.ch * s); x.clip();
      const vis = g.visible, ix0 = Math.max(t.x0, vis.x), iy0 = Math.max(t.y0, vis.y), ix1 = Math.min(t.x0 + g.cw, vis.x + vis.w), iy1 = Math.min(t.y0 + g.ch, vis.y + vis.h);
      if (ix1 > ix0 && iy1 > iy0) {
        x.beginPath(); x.rect((g.margin + ix0 - t.x0) * s, (g.margin + iy0 - t.y0) * s, (ix1 - ix0) * s, (iy1 - iy0) * s); x.clip();
        x.drawImage(src.preview, (g.margin + g.img.x - t.x0) * s, (g.margin + g.img.y - t.y0) * s, g.img.w * s, g.img.h * s);
      }
      x.restore();
      x.strokeStyle = 'rgba(230,0,126,.9)'; x.setLineDash([3, 2]);
      if (t.right && g.ov > 0) { x.beginPath(); x.moveTo((g.margin + g.stepX) * s, g.margin * s); x.lineTo((g.margin + g.stepX) * s, (g.margin + g.ch) * s); x.stroke(); }
      if (t.bottom && g.ov > 0) { x.beginPath(); x.moveTo(g.margin * s, (g.margin + g.stepY) * s); x.lineTo((g.margin + g.cw) * s, (g.margin + g.stepY) * s); x.stroke(); }
      const th2 = document.createElement('div'); th2.className = 'thumb'; th2.appendChild(c);
      const lbl = document.createElement('span'); lbl.innerHTML = `<b>${t.code}</b>${blank ? ' · pulada' : ''}`;
      card.append(th2, lbl);
      card.title = `Linha ${t.r + 1}, coluna ${t.c + 1}`;
      box.appendChild(card);
    });
  }

  /* ---------- renderização em alta resolução ---------- */
  const LOUPE_MM = { w: 36, h: 27 };
  // O mesmo raster global serve ao PDF, às folhas e à lupa.
  async function renderRegion(rect,dpi,opts={}) {
    return currentRaster().render(rect,dpi,opts);
  }
  P.renderRegion = renderRegion;
  const srActive = () => g && cfg.enhance > 0 && src.canvas && src.canvas.width / g.img.w < cfg.dpi / 25.4 * 0.85;

  /* ---------- lupa de impressão ---------- */
  const loupeC = $('#pLoupe'), loupe = { a: null, b: null, split: 0.5, key: '' };
  let loupeT = 0;
  function loupeRect() {
    const c = cfg.loupe && g && cfg.loupe.x >= g.visible.x && cfg.loupe.x <= g.visible.x + g.visible.w && cfg.loupe.y >= g.visible.y && cfg.loupe.y <= g.visible.y + g.visible.h
      ? cfg.loupe : g ? { x: g.visible.x + g.visible.w / 2, y: g.visible.y + g.visible.h / 2 } : null;
    return c ? { x: c.x - LOUPE_MM.w / 2, y: c.y - LOUPE_MM.h / 2, w: LOUPE_MM.w, h: LOUPE_MM.h } : null;
  }
  P.loupeRect = loupeRect;
  function scheduleLoupe(now) { clearTimeout(loupeT); loupeT = setTimeout(()=>renderLoupe().catch(e=>{$('#pLoupeInfo').textContent='Não foi possível preparar a lupa: '+e.message;}), now ? 0 : 450); }
  async function renderLoupe() {
    if (!g || !src.canvas || $('#view-poster').hidden) return;
    const r = loupeRect(), key = `${src.key}|${JSON.stringify(r)}|${cfg.dpi}|${cfg.enhance}|${cfg.lift}|${JSON.stringify(g.img)}`;
    if (key === loupe.key) { drawLoupe(); return; }
    loupe.key = key;
    const W = loupeC.width, H = loupeC.height;
    const renderer=currentRaster();
    const a = await renderer.render(r, cfg.dpi, { pxW: W, pxH: H, enhance: 0 });
    const strength = cfg.enhance || 45;
    const b = await renderer.render(r, cfg.dpi, { pxW: W, pxH: H, enhance: strength });
    if (loupe.key !== key) return;
    loupe.a = a.c; loupe.b = b.c;
    const sr = src.canvas.width / g.img.w < cfg.dpi / 25.4 * 0.85;
    $('#pLoupeInfo').textContent = sr
      ? `Trecho de ${LOUPE_MM.w} × ${LOUPE_MM.h} mm como sai na impressão. A imagem tem ${Math.round(g.effDpi)} DPI e as folhas serão geradas a ${cfg.dpi} DPI${cfg.enhance ? ' com a nitidez extra ligada' : ' — ligue a nitidez extra para usar a versão da direita'}. Clique na prévia para mudar o lugar.`
      : `A imagem já tem resolução suficiente (${Math.round(g.effDpi)} DPI) — não há o que ampliar aqui. Clique na prévia para olhar outro lugar.`;
    drawLoupe();
  }
  function drawLoupe() {
    const x = loupeC.getContext('2d'), W = loupeC.width, H = loupeC.height;
    if (!loupe.a) { x.clearRect(0, 0, W, H); return; }
    const sp = Math.round(W * loupe.split);
    x.drawImage(loupe.a, 0, 0);
    x.save(); x.beginPath(); x.rect(sp, 0, W - sp, H); x.clip(); x.drawImage(loupe.b, 0, 0); x.restore();
    x.fillStyle = '#fff'; x.fillRect(sp - 1, 0, 2, H); x.strokeStyle = 'rgba(0,0,0,.4)'; x.strokeRect(sp - 1.5, 0, 3, H);
  }
  (() => {
    let on = false;
    const setSplit = e => { const r = loupeC.getBoundingClientRect(); loupe.split = PS.clamp((e.clientX - r.left) / r.width, 0.02, 0.98); drawLoupe(); };
    loupeC.addEventListener('pointerdown', e => { on = true; loupeC.setPointerCapture(e.pointerId); setSplit(e); });
    loupeC.addEventListener('pointermove', e => { if (on) setSplit(e); });
    loupeC.addEventListener('pointerup', () => { on = false; });
  })();

  // Desenha a célula imprimível da folha t.
  async function renderTile(t,dpi,onProgress) {
    const result=await renderRegion({x:t.x0,y:t.y0,w:g.cw,h:g.ch},dpi,{onProgress});
    // Raster limpo. As guias do PDF são vetoriais e ficam na faixa coberta.
    return result.c;
  }
  P.renderTile = renderTile;
  P.getRaster = currentRaster;
  function rotateCW(c) {
    const r = PS.canvas(c.height, c.width), x = PS.ctx(r);
    x.translate(r.width, 0); x.rotate(Math.PI / 2); x.drawImage(c, 0, 0); return r;
  }
  async function encodeTile(c) {
    if (cfg.format === 'png') return { type: 'png', blob: await PS.canvasToBlob(c, 'image/png') };
    return { type: 'jpg', blob: await PS.canvasToBlob(c, 'image/jpeg', cfg.format === 'jpeg85' ? 0.85 : 0.95) };
  }

  /* ---------- PDF ---------- */
  // calibração: compensa impressoras que imprimem ligeiramente maior/menor (escala em torno do centro da página)
  function calibStart(page) {
    const fx = 100 / (cfg.calX || 100), fy = 100 / (cfg.calY || 100);
    if (Math.abs(fx - 1) < 1e-5 && Math.abs(fy - 1) < 1e-5) return false;
    const { pushGraphicsState, concatTransformationMatrix } = window.PDFLib, cx = page.getWidth() / 2, cy = page.getHeight() / 2;
    page.pushOperators(pushGraphicsState(), concatTransformationMatrix(fx, 0, 0, fy, cx * (1 - fx), cy * (1 - fy)));
    return true;
  }
  function calibEnd(page, on) { if (on) page.pushOperators(window.PDFLib.popGraphicsState()); }

  async function buildPdf(prog) {
    if (!window.PDFLib) throw new Error('A biblioteca de PDF não carregou. Confira se a pasta “vendor” está junto do index.html.');
    const { PDFDocument, StandardFonts, rgb, degrees } = window.PDFLib;
    const pdf = await PDFDocument.create();
    pdf.setTitle(`Pôster ${PS.fmt(g.finalW / 10, 2)} × ${PS.fmt(g.finalH / 10, 2)} cm`);
    pdf.setSubject(`Montagem ${cfg.glueStyle||'overlap'}; margem ${g.margin} mm; sobreposição ${g.ov} mm; escala 100%; arte ${g.finalW} x ${g.finalH} mm.`);
    pdf.setCreator('Prisma Studio'); pdf.setProducer('Prisma Studio (pdf-lib)');
    const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const tiles = g.tiles.filter(t => !(t.blank && cfg.skipBlank));
    const landscapeTile = g.pageW > g.pageH, rotate = cfg.pdfOrient === 'portrait' && landscapeTile;
    const PW = rotate ? g.pageH : g.pageW, PH = rotate ? g.pageW : g.pageH; // página no PDF (mm)
    const gray = rgb(0.45, 0.45, 0.45);

    if (cfg.guidePage) await guidePage(pdf, font, bold, rgb);

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      PS.busy.detail(`Folha ${t.code} (${i + 1} de ${tiles.length}) — ${cfg.dpi} DPI${srActive() ? ' com nitidez consistente' : ''}`);
      let c = await renderTile(t, cfg.dpi);
      const placement=c.posterPlacement;
      const physical=PS.posterPrintPlacement(g,t,placement,rotate);
      if (rotate) c = rotateCW(c);
      const enc = await encodeTile(c);
      const bytes = new Uint8Array(await enc.blob.arrayBuffer());
      const im = enc.type === 'png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([PW * K, PH * K]);
      const cal = calibStart(page);
      // mapeia coordenadas da folha (mm, origem no topo-esquerdo) para a página do PDF
      const map = (x, y) => rotate ? [g.pageH - y, x] : [x, y];
      const P2 = (x, y) => { const [a, b] = map(x, y); return { x: a * K, y: (PH - b) * K }; };
      const m = g.margin;
      // O raster tem pixels extras de cobertura. Recorta no PDF sem esticá-lo:
      // cada pixel repetido cai na MESMA coordenada física nas duas folhas.
      const {pushGraphicsState,popGraphicsState,rectangle,clip,endPath}=window.PDFLib;
      const I=physical.image;let C=physical.clip;
      if(cfg.glueStyle==='tabs'){const core=PS.posterCoreRect(g,t,tiles);C=rotate?{x:g.pageH-core.y-core.h,y:core.x,w:core.h,h:core.w}:core;}
      page.pushOperators(pushGraphicsState(),rectangle(C.x*K,(PH-C.y-C.h)*K,C.w*K,C.h*K),clip(),endPath());
      page.drawImage(im,{x:I.x*K,y:(PH-I.y-I.h)*K,width:I.w*K,height:I.h*K});
      page.pushOperators(popGraphicsState());
      // Guias na área repetida, totalmente coberta pela próxima folha.
      if(cfg.markGlue)PS.posterDrawGluePdf(page,g,t,{P2,font:bold,rotate,tiles,style:cfg.glueStyle});
      // marcas de corte (vetoriais, na margem)
      if (cfg.markCut && m >= 1.5) {
        const L = Math.min(m - 0.6, 5), gap = 0.6, th = 0.35;
        const corners = [[m, m], [m + g.cw, m], [m, m + g.ch], [m + g.cw, m + g.ch]];
        corners.forEach(([cx, cy]) => {
          const sxn = cx === m ? -1 : 1, syn = cy === m ? -1 : 1;
          page.drawLine({ start: P2(cx + sxn * gap, cy), end: P2(cx + sxn * (gap + L), cy), thickness: th, color: gray });
          page.drawLine({ start: P2(cx, cy + syn * gap), end: P2(cx, cy + syn * (gap + L)), thickness: th, color: gray });
        });
      }
      // identificação na margem superior
      if (cfg.markLabels && m >= 3) {
        const txt = `${t.code}  ·  linha ${t.r + 1}, coluna ${t.c + 1}  ·  folha ${i + 1} de ${tiles.length}  ·  pôster ${g.cols}×${g.rows}`;
        const size = Math.min(6.5, m * K * 0.45), p = P2(m + 6, m * 0.62);
        page.drawText(txt, { x: p.x, y: p.y, size, font, color: gray, rotate: degrees(rotate ? -90 : 0) });
      }
      calibEnd(page, cal);
      prog?.((i + 1) / tiles.length * 0.9);
      await PS.nextFrame();
    }
    PS.busy.detail('Gravando o arquivo PDF…');
    const bytes = await pdf.save({ useObjectStreams: true });
    if (!bytes || bytes.length < 500 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('o PDF gerado está inválido');
    prog?.(1);
    return new Blob([bytes], { type: 'application/pdf' });
  }

  P.buildPdf = buildPdf;

  async function guidePage(pdf, font, bold, rgb) {
    const W = Math.min(g.pageW, g.pageH), H = Math.max(g.pageW, g.pageH);
    const page = pdf.addPage([W * K, H * K]);
    const cal = calibStart(page);
    const m = Math.max(12, g.margin + 6), dark = rgb(0.1, 0.11, 0.12), mid = rgb(0.4, 0.42, 0.45), mag = rgb(0.9, 0, 0.49), cyan = rgb(0, 0.65, 0.88);
    const T = (txt, x, y, size, f = font, color = dark) => page.drawText(txt, { x: x * K, y: (H - y) * K, size, font: f, color });
    T(`Pôster de ${PS.fmt(g.finalW / 10, 2)} × ${PS.fmt(g.finalH / 10, 2)} cm`, m, m + 6, 17, bold);
    const printed = g.tiles.filter(t => !(t.blank && cfg.skipBlank)).length;
    T(`${printed} folhas ${PS.PAPER_NAMES[cfg.paper]} ${g.pageW > g.pageH ? 'paisagem' : 'retrato'} · grade ${g.cols} × ${g.rows} · sobreposição ${PS.fmt(g.ov, 1)} mm · ${cfg.dpi} DPI`, m, m + 13, 9, font, mid);
    // mapa
    const boxW = W - 2 * m, boxH = H * 0.42, s = Math.min(boxW / g.areaW, boxH / g.areaH);
    const ox = m + (boxW - g.areaW * s) / 2, oy = m + 20;
    // miniatura da arte (JPEG pequeno) recortada na parte visível
    const vis = g.visible, tpx = 1400 / Math.max(vis.w, vis.h);
    const thumb = PS.canvas(vis.w * tpx, vis.h * tpx), tx = PS.ctx(thumb);
    tx.fillStyle = '#fff'; tx.fillRect(0, 0, thumb.width, thumb.height);
    tx.imageSmoothingQuality = 'high';
    tx.drawImage(src.preview, (g.img.x - vis.x) * tpx, (g.img.y - vis.y) * tpx, g.img.w * tpx, g.img.h * tpx);
    const jb = new Uint8Array(await (await PS.canvasToBlob(thumb, 'image/jpeg', 0.85)).arrayBuffer());
    const ji = await pdf.embedJpg(jb);
    page.drawRectangle({ x: ox * K, y: (H - oy - g.areaH * s) * K, width: g.areaW * s * K, height: g.areaH * s * K, color: rgb(1, 1, 1), borderColor: mid, borderWidth: 0.5 });
    page.drawImage(ji, { x: (ox + vis.x * s) * K, y: (H - oy - (vis.y + vis.h) * s) * K, width: vis.w * s * K, height: vis.h * s * K });
    for (let c = 1; c < g.cols; c++) page.drawRectangle({ x: (ox + c * g.stepX * s) * K, y: (H - oy - g.areaH * s) * K, width: Math.max(0.3, g.ov * s) * K, height: g.areaH * s * K, color: mag, opacity: 0.25 });
    for (let r = 1; r < g.rows; r++) page.drawRectangle({ x: ox * K, y: (H - oy - (r * g.stepY + g.ov) * s) * K, width: g.areaW * s * K, height: Math.max(0.3, g.ov * s) * K, color: mag, opacity: 0.25 });
    g.tiles.forEach(t => {
      page.drawRectangle({ x: (ox + t.x0 * s) * K, y: (H - oy - (t.y0 + g.ch) * s) * K, width: g.cw * s * K, height: g.ch * s * K, borderColor: dark, borderWidth: 0.6, opacity: 0, borderOpacity: 0.8 });
      const label = t.code, size = Math.max(6, Math.min(14, g.cw * s * 0.18)), tw = bold.widthOfTextAtSize(label, size) / K;
      const cx = ox + (t.x0 + g.cw / 2) * s, cy = oy + (t.y0 + g.ch / 2) * s;
      page.drawRectangle({ x: (cx - tw / 2 - 1.5) * K, y: (H - cy - size / K * 0.55) * K, width: (tw + 3) * K, height: size * 1.15, color: rgb(1, 1, 1), opacity: 0.85 });
      T(label, cx - tw / 2, cy + size / K * 0.35, size, bold, (t.blank && cfg.skipBlank) ? mid : dark);
    });
    page.drawRectangle({ x: (ox + g.target.x * s) * K, y: (H - oy - (g.target.y + g.target.h) * s) * K, width: g.target.w * s * K, height: g.target.h * s * K, borderColor: cyan, borderWidth: 1, opacity: 0 });
    // instruções
    let y = oy + g.areaH * s + 12;
    T('Como montar', m, y, 12, bold); y += 6;
    const rotated = cfg.pdfOrient === 'portrait' && g.pageW > g.pageH;
    const steps = [
      `Imprima este PDF em tamanho real (100%). Desative "Ajustar à página" e "Reduzir para caber".${rotated ? ' As folhas saem em pé; deite-as para montar.' : ''}`,
      'Confira a régua abaixo com uma régua de verdade: ela deve medir exatamente 10 cm.',
      'A letra do código é a linha (A = topo) e o número é a coluna (1 = esquerda).',
      g.ov > 0 ? 'Nas folhas que têm vizinha à esquerda ou acima, corte a margem branca desses lados pelas marcas de corte.' : 'Corte a margem branca de todos os lados que encostam em outra folha.',
      g.ov > 0 ? `Monte da esquerda para a direita e de cima para baixo. Deite cada folha por cima da anterior, alinhando a borda cortada ao inicio da faixa marcada para cola; a faixa de ${PS.fmt(g.ov, 1)} mm fica escondida. Cole com cola em bastão ou fita dupla face.` : 'Encoste as bordas sem sobrepor e una as folhas por trás com fita.',
      'Nao corte as abas da folha que fica por baixo. Recorte a margem branca esquerda/superior da folha que entra por cima ate o inicio da arte. Confira os detalhes nos dois extremos antes de colar; apare as sobras externas no fim.'
    ];
    const maxW = (W - 2 * m - 8) * K;
    steps.forEach((st, i) => {
      const words = st.split(' '); let line = '', first = true;
      const flush = () => { T(line.trim(), m + 6, y, 9.5, font, dark); if (first) T(`${i + 1}.`, m, y, 9.5, bold, mag); first = false; y += 4.6; line = ''; };
      y += 1.6;
      for (const w of words) { if (font.widthOfTextAtSize(line + w + ' ', 9.5) > maxW) flush(); line += w + ' '; }
      if (line.trim()) flush();
    });
    // régua de calibração de 100 mm
    y += 8;
    const rx = m, ry = y + 4;
    page.drawLine({ start: { x: rx * K, y: (H - ry) * K }, end: { x: (rx + 100) * K, y: (H - ry) * K }, thickness: 0.8, color: dark });
    for (let i = 0; i <= 100; i += 5) {
      const len = i % 10 === 0 ? 4 : 2;
      page.drawLine({ start: { x: (rx + i) * K, y: (H - ry) * K }, end: { x: (rx + i) * K, y: (H - ry + len) * K }, thickness: 0.5, color: dark });
      if (i % 10 === 0) T(String(i / 10), rx + i - 0.8, ry - 5.5, 6.5, font, mid);
    }
    T('Régua de conferência: de 0 a 10 deve medir exatamente 10 cm (100 mm).', rx, ry + 9, 8, font, mid);
    T('Gerado no Prisma Studio — processado inteiramente no seu navegador.', m, H - m + 2, 7.5, font, mid);
    calibEnd(page, cal);
  }

  /* ---------- exportação ---------- */
  async function guard() {
    if (!src.canvas || !g) { PS.toast('Abra uma imagem primeiro.', 'warning'); return false; }
    if(g.sizeLimited){PS.toast('O tamanho pedido excede a grade máxima de 30 × 30 folhas. Reduza a medida ou escolha um papel maior; o arquivo não será gerado com um tamanho diferente.','error',6500);return false;}
    const tiles = g.tiles.filter(t => !(t.blank && cfg.skipBlank)).length;
    const mp = tiles * (g.cw / 25.4 * cfg.dpi) * (g.ch / 25.4 * cfg.dpi) / 1e6;
    if (tiles > 40 || mp > 900) {
      const ok = await PS.dialog({ title: 'Arquivo grande', body: `<p>São ${tiles} folhas a ${cfg.dpi} DPI (cerca de ${PS.fmtInt(mp)} megapixels no total). O processo pode demorar e usar bastante memória. Se preferir, reduza para 200 DPI — a diferença é pouco visível em pôsteres vistos de longe.</p>`, okText: 'Continuar mesmo assim' });
      if (!ok) return false;
    }
    return true;
  }
  $('#pExportPdf').addEventListener('click', async () => {
    if (!(await guard())) return;
    try {
      let blob;
      await PS.withBusy('Gerando o PDF', 'Renderizando as folhas em alta resolução…', async prog => { blob = await buildPdf(prog); });
      PS.download(blob, `poster_${Math.round(g.finalW / 10)}x${Math.round(g.finalH / 10)}cm_${g.cols}x${g.rows}_${cfg.paper}.pdf`);
      PS.toast(`PDF pronto (${PS.bytes(blob.size)}). Imprima em tamanho real (100%).`, 'success', 5000);
    } catch (e) { console.error(e); PS.toast('Não foi possível gerar o PDF: ' + e.message, 'error', 6000); }
  });
  $('#pPrintNow').addEventListener('click', async () => {
    if (!(await guard())) return;
    const win = window.open('', '_blank');
    try {
      let blob;
      await PS.withBusy('Gerando o PDF', 'Ele vai abrir numa nova aba para você imprimir.', async prog => { blob = await buildPdf(prog); });
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url; else { PS.download(blob, 'poster.pdf'); PS.toast('O navegador bloqueou a nova aba; o PDF foi baixado.', 'info'); }
      PS.toast('Na janela de impressão escolha “Tamanho real” ou 100%.', 'success', 6000);
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch (e) { if (win) win.close(); PS.toast('Não foi possível gerar o PDF: ' + e.message, 'error'); }
  });
  $('#pExportZip').addEventListener('click', async () => {
    if (!(await guard())) return;
    if (!window.JSZip) { PS.toast('A biblioteca ZIP não carregou.', 'error'); return; }
    try {
      let blob;
      await PS.withBusy('Gerando as folhas em PNG', '', async prog => {
        const zip = new window.JSZip(), folder = zip.folder('folhas');
        const tiles = g.tiles.filter(t => !(t.blank && cfg.skipBlank));
        for (let i = 0; i < tiles.length; i++) {
          const t = tiles[i]; PS.busy.detail(`Folha ${t.code} (${i + 1} de ${tiles.length})`);
          const b = await PS.setPngDpi(await PS.canvasToBlob(await renderTile(t, cfg.dpi), 'image/png'), cfg.dpi);
          folder.file(`${t.code}_linha${t.r + 1}_coluna${t.c + 1}.png`, b);
          prog((i + 1) / tiles.length * 0.8); await PS.nextFrame();
        }
        // mapa de montagem
        const mapC = PS.canvas(1600, 1600 * g.areaH / g.areaW), mx = PS.ctx(mapC), ms = mapC.width / g.areaW;
        mx.fillStyle = '#fff'; mx.fillRect(0, 0, mapC.width, mapC.height);
        mx.save();mx.beginPath();mx.rect(g.visible.x*ms,g.visible.y*ms,g.visible.w*ms,g.visible.h*ms);mx.clip();
        mx.drawImage(src.preview, g.img.x * ms, g.img.y * ms, g.img.w * ms, g.img.h * ms);mx.restore();
        mx.strokeStyle = '#e6007e'; mx.lineWidth = 2;
        g.tiles.forEach(t => { mx.strokeRect(t.x0 * ms, t.y0 * ms, g.cw * ms, g.ch * ms); });
        mx.font = `700 ${Math.max(14, g.cw * ms * 0.12)}px Arial`; mx.textAlign = 'center'; mx.textBaseline = 'middle';
        g.tiles.forEach(t => { const cx = (t.x0 + g.cw / 2) * ms, cy = (t.y0 + g.ch / 2) * ms; mx.fillStyle = 'rgba(255,255,255,.85)'; mx.fillRect(cx - 40, cy - 20, 80, 40); mx.fillStyle = '#111'; mx.fillText(t.code, cx, cy); });
        zip.file('00_mapa_de_montagem.png', await PS.canvasToBlob(mapC, 'image/png'));
        zip.file('medidas_e_encaixes.json',JSON.stringify({unidade:'mm',dpi:cfg.dpi,tamanhoFinal:g.finalRect,sobreposicao:g.ov,papel:{largura:g.pageW,altura:g.pageH,margem:g.margin},folhas:tiles.map(t=>({codigo:t.code,x:t.x0,y:t.y0,largura:g.cw,altura:g.ch,pixels:PS.posterPixelRect({x:t.x0,y:t.y0,w:g.cw,h:g.ch},cfg.dpi)}))},null,2));
        zip.file('LEIA-ME.txt', [
          `Pôster ${PS.fmt(g.finalW / 10, 1)} x ${PS.fmt(g.finalH / 10, 1)} cm — ${tiles.length} folhas ${PS.PAPER_NAMES[cfg.paper]}`,
          '', `Cada PNG cobre a ÁREA IMPRIMÍVEL da folha (${PS.fmt(g.cw, 1)} x ${PS.fmt(g.ch, 1)} mm a ${cfg.dpi} DPI),`,
          `Há até 1 pixel extra por borda para preservar a fase da imagem. Consulte medidas_e_encaixes.json. Não ajuste cada PNG à página.`,
          'Para imprimir na medida exata, USE O PDF: ele posiciona e recorta o raster sem mudar sua escala.', '',
          ...PS.$$('#pSteps li').map((li, i) => `${i + 1}. ${li.textContent}`)
        ].join('\r\n'));
        blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, md => prog(0.8 + md.percent / 100 * 0.2));
      });
      PS.download(blob, `poster_folhas_${g.cols}x${g.rows}_${cfg.dpi}dpi.zip`);
      PS.toast(`ZIP pronto (${PS.bytes(blob.size)}).`, 'success');
    } catch (e) { console.error(e); PS.toast('Não foi possível gerar o ZIP: ' + e.message, 'error'); }
  });

  /* ---------- texto para IA ---------- */
  function updatePrompt() {
    if (!g) { $('#pIdealPx').value = ''; $('#pPrompt').value = 'Abra uma imagem ou configure o pôster para gerar o texto.'; return; }
    const tw = g.artRect.w, th = g.artRect.h, pw = Math.round(tw / 25.4 * 300), ph = Math.round(th / 25.4 * 300);
    const r = tw >= th ? `${PS.fmt(tw / th, 3)}:1` : `1:${PS.fmt(th / tw, 3)}`;
    $('#pIdealPx').value = `${pw} × ${ph} px`;
    const theme = (cfg.theme || '').trim();
    $('#pPrompt').value = [
      `Crie uma única imagem contínua para um pôster${theme ? `: ${theme}` : ''}.`,
      `Formato: ${tw >= th ? 'horizontal' : 'vertical'}, proporção largura:altura de ${r}. Tamanho ideal: ${pw} × ${ph} pixels (nunca esticar ou distorcer).`,
      `O pôster será impresso com ${PS.fmt(tw / 10, 1)} × ${PS.fmt(th / 10, 1)} cm, então use muitos detalhes finos e nítidos.`,
      'Preencha toda a área até as bordas. Não inclua moldura, margens brancas, marcas de corte, linhas de grade, texto técnico nem foto de um pôster na parede.',
      'Mantenha elementos importantes (rostos, textos, logotipos) afastados das bordas externas, pois a montagem pode aparar alguns milímetros.',
      'Se não for possível gerar exatamente esse tamanho, gere na mesma proporção, na maior resolução disponível.'
    ].join('\n');
  }
  $('#pCopyPx').addEventListener('click', async () => { const ok = await PS.copyText($('#pIdealPx').value); PS.toast(ok ? 'Tamanho copiado.' : 'Não foi possível copiar.', ok ? 'success' : 'warning'); });
  $('#pCopyPrompt').addEventListener('click', async () => { const ok = await PS.copyText($('#pPrompt').value); PS.toast(ok ? 'Texto copiado — cole na sua IA de imagens.' : 'Não foi possível copiar.', ok ? 'success' : 'warning'); });
  $('#pOpen').addEventListener('click', () => $('#fileInput').click());

  doc.on(type => { if ((type === 'load' || type === 'change') && !$('#view-poster').hidden) P.refreshSource(); });
  update();
})();
