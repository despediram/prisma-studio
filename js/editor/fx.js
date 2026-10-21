/* Prisma Studio — painel flutuante para ajustes (Imagem › Ajustes) e filtros (menu Filtro), com prévia ao vivo. */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc, $ = PS.$;

  // Controles: [chave, rótulo, tipo, padrão, min, max, passo, {px:true} | opções]
  const R = (k, l, def, min, max, step = 1, extra) => ({ k, l, t: 'range', def, min, max, step, ...(extra || {}) });
  const C = (k, l, def) => ({ k, l, t: 'color', def });
  const B = (k, l, def) => ({ k, l, t: 'check', def });
  const S = (k, l, def, opts) => ({ k, l, t: 'select', def, opts });

  const ADJ = {
    levels: { title: 'Níveis', icon: 'fa-chart-simple', ctl: [S('channel', 'Canal', 'rgb', [['rgb', 'RGB'], ['r', 'Vermelho'], ['g', 'Verde'], ['b', 'Azul']]), R('inBlack', 'Entrada: preto', 0, 0, 253), R('gamma', 'Tons médios (gama)', 1, 0.1, 5, 0.01), R('inWhite', 'Entrada: branco', 255, 2, 255), R('outBlack', 'Saída: preto', 0, 0, 255), R('outWhite', 'Saída: branco', 255, 0, 255)], histo: true },
    brightnessContrast: { title: 'Brilho e contraste', icon: 'fa-sun', ctl: [R('brightness', 'Brilho', 0, -100, 100), R('contrast', 'Contraste', 0, -100, 100)] },
    exposure: { title: 'Exposição', icon: 'fa-camera', ctl: [R('exposure', 'Exposição (EV)', 0, -4, 4, 0.05), R('offset', 'Deslocamento', 0, -0.3, 0.3, 0.005), R('gamma', 'Correção de gama', 1, 0.2, 3, 0.01)] },
    vibrance: { title: 'Vibração', icon: 'fa-droplet', ctl: [R('vibrance', 'Vibração', 30, -100, 100), R('saturation', 'Saturação', 0, -100, 100)] },
    hueSat: { title: 'Matiz e saturação', icon: 'fa-palette', ctl: [R('hue', 'Matiz', 0, -180, 180), R('saturation', 'Saturação', 0, -100, 100), R('lightness', 'Luminosidade', 0, -100, 100), B('colorize', 'Colorir', false), R('colorHue', 'Matiz de colorir', 30, 0, 360), R('colorSat', 'Saturação de colorir', 35, 0, 100)] },
    colorBalance: { title: 'Equilíbrio de cores', icon: 'fa-scale-balanced', ctl: [S('tone', 'Tons', 'midtones', [['shadows', 'Sombras'], ['midtones', 'Tons médios'], ['highlights', 'Realces']]), R('cr', 'Ciano ↔ Vermelho', 0, -100, 100), R('mg', 'Magenta ↔ Verde', 0, -100, 100), R('yb', 'Amarelo ↔ Azul', 0, -100, 100), B('preserveLum', 'Preservar luminosidade', true)],
      // guarda os três grupos de tons separadamente
      state: () => ({ shadows: [0, 0, 0], midtones: [0, 0, 0], highlights: [0, 0, 0] }),
      map: (p, st) => { st[p.tone] = [p.cr, p.mg, p.yb]; return { shadows: st.shadows, midtones: st.midtones, highlights: st.highlights, preserveLum: p.preserveLum }; },
      onTone: (p, st) => { const v = st[p.tone]; return { cr: v[0], mg: v[1], yb: v[2] }; } },
    blackWhite: { title: 'Preto e branco', icon: 'fa-circle-half-stroke', ctl: [R('reds', 'Vermelhos', 40, -200, 300), R('yellows', 'Amarelos', 60, -200, 300), R('greens', 'Verdes', 40, -200, 300), R('cyans', 'Cianos', 60, -200, 300), R('blues', 'Azuis', 20, -200, 300), R('magentas', 'Magentas', 80, -200, 300), B('tint', 'Tonalizar', false), C('tintColor', 'Cor do tom', '#c8a070'), R('tintAmount', 'Força do tom', 30, 0, 100)] },
    photoFilter: { title: 'Filtro de foto', icon: 'fa-camera-retro', ctl: [S('preset', 'Filtro', '#ec8a00', [['#ec8a00', 'Aquecimento (85)'], ['#fa9600', 'Aquecimento (LBA)'], ['#006dff', 'Resfriamento (80)'], ['#00b5ff', 'Resfriamento (LBB)'], ['#ff0000', 'Vermelho'], ['#00ff00', 'Verde'], ['#ac7a33', 'Sépia'], ['custom', 'Personalizado']]), C('color', 'Cor personalizada', '#ec8a00'), R('density', 'Densidade', 25, 1, 100), B('preserveLum', 'Preservar luminosidade', true)],
      map: p => ({ color: p.preset === 'custom' ? p.color : p.preset, density: p.density, preserveLum: p.preserveLum }) },
    channelMixer: { title: 'Mixer de canais', icon: 'fa-sliders', ctl: [S('out', 'Canal de saída', 'red', [['red', 'Vermelho'], ['green', 'Verde'], ['blue', 'Azul']]), R('r', 'Vermelho %', 100, -200, 200), R('g', 'Verde %', 0, -200, 200), R('b', 'Azul %', 0, -200, 200), R('c', 'Constante %', 0, -100, 100), B('monochrome', 'Monocromático', false)],
      state: () => ({ red: [100, 0, 0, 0], green: [0, 100, 0, 0], blue: [0, 0, 100, 0] }),
      map: (p, st) => { st[p.out] = [p.r, p.g, p.b, p.c]; return { red: st.red, green: st.green, blue: st.blue, monochrome: p.monochrome }; },
      onTone: (p, st, key) => { const v = st[p[key] || p.out]; return { r: v[0], g: v[1], b: v[2], c: v[3] }; }, toneKey: 'out' },
    gradientMap: { title: 'Mapa de degradê', icon: 'fa-swatchbook', ctl: [C('c1', 'Sombras', '#14163a'), C('c2', 'Tons médios', '#d0506a'), C('c3', 'Realces', '#ffe7a8'), B('three', 'Usar três cores', true), B('reverse', 'Inverter', false)],
      map: p => ({ stops: p.three ? [p.c1, p.c2, p.c3] : [p.c1, p.c3], reverse: p.reverse }) },
    selectiveColor: { title: 'Cor seletiva', icon: 'fa-eye-dropper', ctl: [S('range', 'Cores', 'reds', [['reds', 'Vermelhos'], ['yellows', 'Amarelos'], ['greens', 'Verdes'], ['cyans', 'Cianos'], ['blues', 'Azuis'], ['magentas', 'Magentas'], ['whites', 'Brancos'], ['neutrals', 'Neutros'], ['blacks', 'Pretos']]), R('cyan', 'Ciano', 0, -100, 100), R('magenta', 'Magenta', 0, -100, 100), R('yellow', 'Amarelo', 0, -100, 100), R('black', 'Preto', 0, -100, 100)] },
    replaceColor: { title: 'Substituir cor', icon: 'fa-repeat', ctl: [C('target', 'Cor a substituir', '#ff0000'), R('fuzziness', 'Tolerância', 40, 1, 200), R('hue', 'Matiz', 0, -180, 180), R('saturation', 'Saturação', 0, -100, 100), R('lightness', 'Luminosidade', 0, -100, 100)], pickTarget: 'target' },
    threshold: { title: 'Limiar', icon: 'fa-circle-half-stroke', ctl: [R('level', 'Nível', 128, 1, 255)] },
    posterize: { title: 'Posterizar', icon: 'fa-layer-group', ctl: [R('levels', 'Níveis', 4, 2, 32)] },
    shadowsHighlights: { title: 'Sombras e realces', icon: 'fa-adjust', ctl: [R('shadows', 'Clarear sombras', 35, 0, 100), R('highlights', 'Recuperar realces', -25, -100, 0)] }
  };

  const FX = {
    // Desfoque
    gaussian: { title: 'Desfoque gaussiano', cat: 'Desfoque', ctl: [R('radius', 'Raio', 4, 0.5, 120, 0.5, { px: true })] },
    boxBlur: { title: 'Desfoque de caixa', cat: 'Desfoque', ctl: [R('radius', 'Raio', 6, 1, 120, 1, { px: true })] },
    motionBlur: { title: 'Desfoque de movimento', cat: 'Desfoque', ctl: [R('angle', 'Ângulo', 0, -90, 90), R('distance', 'Distância', 30, 2, 400, 1, { px: true })] },
    radialBlur: { title: 'Desfoque radial', cat: 'Desfoque', ctl: [S('mode', 'Tipo', 'zoom', [['zoom', 'Zoom'], ['spin', 'Giro']]), R('amount', 'Quantidade', 20, 1, 100), R('cx', 'Centro X', 0.5, 0, 1, 0.01), R('cy', 'Centro Y', 0.5, 0, 1, 0.01)] },
    surfaceBlur: { title: 'Desfoque de superfície', cat: 'Desfoque', ctl: [R('radius', 'Raio', 5, 1, 40, 1, { px: true }), R('threshold', 'Limiar', 15, 1, 100)] },
    tiltShift: { title: 'Miniatura (tilt-shift)', cat: 'Desfoque', ctl: [R('focus', 'Posição do foco %', 55, 0, 100), R('size', 'Faixa nítida %', 18, 0, 80), R('transition', 'Transição %', 22, 1, 60), R('blur', 'Desfoque', 8, 1, 40), B('saturate', 'Realçar cores', true)] },
    // Nitidez
    unsharp: { title: 'Máscara de nitidez', cat: 'Nitidez', ctl: [R('amount', 'Quantidade %', 100, 1, 300), R('radius', 'Raio', 1.5, 0.3, 10, 0.1, { px: true }), R('threshold', 'Limiar', 2, 0, 40)] },
    highPass: { title: 'Passa-alta', cat: 'Nitidez', ctl: [R('radius', 'Raio', 3, 0.5, 40, 0.5, { px: true })], note: 'Use numa camada duplicada com o modo “Sobrepor” para dar nitidez sem halos.' },
    // Ruído
    addNoise: { title: 'Adicionar ruído', cat: 'Ruído', ctl: [R('amount', 'Quantidade', 12, 1, 100), B('mono', 'Monocromático', true)] },
    median: { title: 'Mediana', cat: 'Ruído', ctl: [R('radius', 'Raio', 2, 1, 12)] },
    dust: { title: 'Poeira e arranhões', cat: 'Ruído', op: 'median', ctl: [R('radius', 'Raio', 2, 1, 12), R('threshold', 'Limiar', 20, 0, 128)] },
    filmGrain: { title: 'Granulação de filme', cat: 'Ruído', ctl: [R('amount', 'Quantidade', 40, 1, 100)] },
    // Pixelização
    pixelate: { title: 'Mosaico (pixelar)', cat: 'Pixelização', ctl: [R('size', 'Tamanho da célula', 14, 2, 200, 1, { px: true })] },
    crystallize: { title: 'Cristalizar', cat: 'Pixelização', ctl: [R('size', 'Tamanho da célula', 20, 3, 200, 1, { px: true })] },
    pointillize: { title: 'Pontilhar', cat: 'Pixelização', ctl: [R('size', 'Tamanho da célula', 10, 3, 100, 1, { px: true }), C('background', 'Fundo', '#ffffff')] },
    halftone: { title: 'Meio-tom (retícula P&B)', cat: 'Pixelização', ctl: [R('cell', 'Tamanho do ponto', 10, 3, 80, 1, { px: true }), R('angle', 'Ângulo', 45, 0, 90), C('ink', 'Tinta', '#111111')] },
    colorHalftone: { title: 'Meio-tom colorido (CMYK)', cat: 'Pixelização', ctl: [R('size', 'Tamanho do ponto', 8, 3, 60, 1, { px: true })] },
    // Artístico
    oil: { title: 'Pintura a óleo', cat: 'Artístico', ctl: [R('radius', 'Pincelada', 4, 1, 16, 1, { px: true })] },
    watercolor: { title: 'Aquarela', cat: 'Artístico', ctl: [R('radius', 'Pincelada', 5, 2, 12, 1, { px: true })] },
    sketch: { title: 'Desenho a lápis', cat: 'Artístico', ctl: [R('radius', 'Traço', 8, 1, 40, 1, { px: true }), R('darkness', 'Escuridão', 40, 0, 100), B('color', 'Manter cores', false)] },
    cartoon: { title: 'Desenho animado', cat: 'Artístico', ctl: [R('smooth', 'Suavização', 6, 2, 20, 1, { px: true }), R('levels', 'Níveis de cor', 6, 2, 16), R('edges', 'Contornos', 50, 0, 100)] },
    posterizeFx: { title: 'Posterizar', cat: 'Artístico', op: 'posterize', ctl: [R('levels', 'Níveis', 5, 2, 16)] },
    duotone: { title: 'Duotone', cat: 'Artístico', ctl: [C('c1', 'Sombras', '#1b1f5e'), C('c2', 'Luzes', '#ffcf4a')] },
    glowingEdges: { title: 'Arestas brilhantes', cat: 'Estilizar', ctl: [R('brightness', 'Brilho', 60, 10, 100)] },
    edges: { title: 'Contornos', cat: 'Estilizar', ctl: [] },
    emboss: { title: 'Relevo', cat: 'Estilizar', ctl: [] },
    solarize: { title: 'Solarizar', cat: 'Estilizar', ctl: [] },
    chromatic: { title: 'Aberração cromática', cat: 'Estilizar', ctl: [R('amount', 'Deslocamento', 6, 1, 60, 1, { px: true })] },
    glitch: { title: 'Glitch', cat: 'Estilizar', ctl: [R('amount', 'Intensidade', 40, 5, 100), R('shift', 'Separação RGB', 8, 0, 40), R('seed', 'Variação', 3, 1, 99)] },
    vignette: { title: 'Vinheta', cat: 'Estilizar', ctl: [R('amount', 'Quantidade', -40, -100, 100)] },
    docscan: { title: 'Documento escaneado', cat: 'Estilizar', ctl: [S('mode', 'Modo', 'color', [['color', 'Colorido'], ['gray', 'Tons de cinza'], ['bw', 'Preto e branco']]), R('strength', 'Intensidade', 60, 0, 100)] },
    // Distorção
    twirl: { title: 'Redemoinho', cat: 'Distorção', ctl: [R('angle', 'Ângulo', 120, -720, 720), R('radius', 'Raio %', 80, 10, 100)] },
    pinch: { title: 'Comprimir / inflar', cat: 'Distorção', ctl: [R('amount', 'Quantidade', 50, -100, 100), R('radius', 'Raio %', 90, 10, 100)] },
    spherize: { title: 'Esferizar', cat: 'Distorção', ctl: [R('amount', 'Quantidade', 60, -100, 100)] },
    wave: { title: 'Onda', cat: 'Distorção', ctl: [R('amplitude', 'Amplitude', 12, 1, 100), R('wavelength', 'Comprimento', 120, 10, 800), S('direction', 'Direção', 'both', [['both', 'Ambas'], ['horizontal', 'Horizontal'], ['vertical', 'Vertical']])] },
    ripple: { title: 'Ondulação (água)', cat: 'Distorção', ctl: [R('amplitude', 'Amplitude', 10, 1, 60), R('wavelength', 'Comprimento', 60, 8, 400)] },
    polar: { title: 'Coordenadas polares', cat: 'Distorção', ctl: [S('mode', 'Conversão', 'toPolar', [['toPolar', 'Retangular → polar'], ['toRect', 'Polar → retangular']])] },
    lensCorrect: { title: 'Correção de lente', cat: 'Distorção', ctl: [R('amount', 'Barril ↔ almofada', 0, -100, 100), R('zoom', 'Zoom', 0, -30, 50)] },
    offset: { title: 'Deslocamento (padrão contínuo)', cat: 'Outros', ctl: [R('x', 'Horizontal %', 50, 0, 100), R('y', 'Vertical %', 50, 0, 100)], note: 'Útil para criar texturas que se repetem sem emenda.' }
  };
  PS.FX_DEFS = FX; PS.ADJ_DEFS = ADJ;

  const panel = $('#fxPanel'), body = $('#fxBody');
  let cur = null, busy = false, queued = false;

  function paramsOf(scaleForPreview) {
    const p = {};
    cur.def.ctl.forEach(c => { let v = cur.vals[c.k]; if (scaleForPreview && c.px) v = Math.max(c.min * 0.5, v * doc.proxyScale); p[c.k] = v; });
    return cur.def.map ? cur.def.map(p, cur.state) : p;
  }
  async function preview() {
    if (!cur) return;
    if (busy) { queued = true; return; }
    busy = true; queued = false;
    const myCur = cur, params = paramsOf(true);
    try {
      const res = await PS.run(myCur.op, { img: PS.getImg(doc.proxy), name: myCur.name, params });
      if (cur === myCur) { let c = PS.putImg(res); if (c.width === doc.proxy.width && c.height === doc.proxy.height) c = doc.selPreview(c); doc.overrideView = c; PS.view.render(); PS.panels && PS.panels.updateHistogram(); $('#fxStatus').textContent = ''; }
    } catch (e) { $('#fxStatus').textContent = e.message; }
    busy = false; if (queued) preview();
  }
  function close() { cur = null; panel.hidden = true; doc.overrideView = null; PS.view.render(); PS.panels && PS.panels.updateHistogram(); }

  PS.fx = {
    open: async (kind, name) => {
      if (!doc.has) { PS.toast('Abra uma imagem primeiro.', 'warning'); return; }
      const def = (kind === 'adjust' ? ADJ : FX)[name]; if (!def) return;
      if (cur) close();
      await doc.ensureFlat();
      if (doc.layer.type === 'text') { PS.toast('A camada de texto será rasterizada ao aplicar.', 'info'); }
      cur = { kind, name: def.op || name, def, vals: {}, state: def.state ? def.state() : null, op: kind === 'adjust' ? 'adjust' : 'fx' };
      def.ctl.forEach(c => { cur.vals[c.k] = c.def; });
      $('#fxTitle').textContent = def.title + (doc.sel ? ' (na seleção)' : '');
      body.innerHTML = (def.note ? `<p class="hint">${def.note}</p>` : '') + def.ctl.map(c => {
        if (c.t === 'range') return `<label class="sl"><span>${c.l}</span><input type="range" data-k="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" value="${c.def}"><output>${c.def}</output></label>`;
        if (c.t === 'color') return `<div class="color-row"><span class="grow">${c.l}</span><input type="color" data-k="${c.k}" value="${c.def}">${def.pickTarget === c.k ? '<button class="btn ghost sm" id="fxUseFg" title="Usar a cor principal (pegue com o conta-gotas)">Usar cor principal</button>' : ''}</div>`;
        if (c.t === 'check') return `<label class="check"><input type="checkbox" data-k="${c.k}" ${c.def ? 'checked' : ''}> ${c.l}</label>`;
        return `<label class="fld"><span>${c.l}</span><select class="input" data-k="${c.k}">${c.opts.map(([v, l]) => `<option value="${v}"${v === c.def ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`;
      }).join('') + '<p class="hint" id="fxStatus"></p>';
      PS.$$('[data-k]', body).forEach(el => {
        const c = def.ctl.find(x => x.k === el.dataset.k);
        const read = () => c.t === 'range' ? +el.value : c.t === 'check' ? el.checked : el.value;
        el.addEventListener(c.t === 'select' || c.t === 'check' ? 'change' : 'input', () => {
          cur.vals[c.k] = read();
          if (c.t === 'range') el.nextElementSibling.textContent = Number.isInteger(c.step) ? el.value : (+el.value).toFixed(2);
          // controles que trocam o grupo editado (tons / canal)
          if (def.onTone && (c.k === 'tone' || c.k === (def.toneKey || 'tone'))) {
            const v = def.onTone(cur.vals, cur.state, c.k);
            Object.entries(v).forEach(([k, val]) => { cur.vals[k] = val; const inp = PS.$(`[data-k="${k}"]`, body); if (inp) { inp.value = val; inp.nextElementSibling.textContent = val; } });
          }
          preview();
        });
        if (c.t === 'range') el.addEventListener('dblclick', () => { el.value = c.def; el.dispatchEvent(new Event('input')); });
      });
      const useFg = $('#fxUseFg'); if (useFg) useFg.addEventListener('click', () => { const inp = PS.$(`[data-k="${def.pickTarget}"]`, body); inp.value = doc.fg; inp.dispatchEvent(new Event('input')); });
      panel.hidden = false;
      preview();
    },
    close,
    // ajustes de um clique (sem diálogo)
    quick: async (name, label) => {
      if (!doc.has) return;
      await doc.process('adjust', { name, params: {} }, label, 'fa-wand-magic-sparkles', label);
    }
  };
  $('#fxCancel').addEventListener('click', close);
  $('#fxClose').addEventListener('click', close);
  $('#fxReset').addEventListener('click', () => { if (cur) { const { kind, def } = cur; const name = Object.keys(kind === 'adjust' ? ADJ : FX).find(k => (kind === 'adjust' ? ADJ : FX)[k] === def); PS.fx.open(kind, name); } });
  $('#fxApply').addEventListener('click', async () => {
    if (!cur) return;
    const c = cur, params = paramsOf(false);
    doc.overrideView = null;
    try { await doc.process(c.op, { name: c.name, params }, c.def.title, c.kind === 'adjust' ? 'fa-sliders' : 'fa-wand-magic', `Aplicando: ${c.def.title}`); PS.toast(`“${c.def.title}” aplicado.`, 'success'); }
    catch (e) { PS.toast('Não foi possível aplicar: ' + e.message, 'error'); }
    close();
  });
  // arrastar o painel pelo título
  (() => {
    const head = $('#fxHead'); let st = null;
    head.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const r = panel.getBoundingClientRect(); st = { x: e.clientX, y: e.clientY, l: r.left, t: r.top }; head.setPointerCapture(e.pointerId); });
    head.addEventListener('pointermove', e => { if (!st) return; panel.style.left = `${st.l + e.clientX - st.x}px`; panel.style.top = `${st.t + e.clientY - st.y}px`; panel.style.right = 'auto'; });
    head.addEventListener('pointerup', () => { st = null; });
  })();
  doc.on(t => { if ((t === 'load' || t === 'active') && cur) close(); });
})();
