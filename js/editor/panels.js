/* Prisma Studio — painel de ajustes, curvas, cor, estilos, filtros, melhorias e exportação. */
(function () {
  'use strict';
  const PS = window.PS, doc = PS.doc, IP = window.PrismaImgProc;

  /* ---------- abas ---------- */
  PS.$$('.itab').forEach(t => t.addEventListener('click', () => {
    PS.$$('.itab').forEach(x => x.classList.toggle('active', x === t));
    PS.$$('.ipanel').forEach(p => p.classList.toggle('active', p.dataset.panel === t.dataset.tab));
    PS.$('.ipanels').scrollTop = 0;
    if (t.dataset.tab === 'detail') schedulePresetThumbs();
  }));

  /* ---------- sliders de revelação ---------- */
  const fmtParam = (k, v) => k === 'exposure' ? `${v > 0 ? '+' : ''}${PS.fmt(v, 2)}` : k === 'sharpenRadius' ? `${PS.fmt(v, 1)} px` : `${v > 0 && !['sharpen', 'denoise', 'colorDenoise', 'grain', 'fade'].includes(k) ? '+' : ''}${Math.round(v)}`;
  const devInputs = PS.$$('input[data-p]');
  devInputs.forEach(inp => {
    const k = inp.dataset.p, out = inp.parentElement.querySelector('output');
    const show = () => { out.textContent = fmtParam(k, +inp.value); inp.parentElement.classList.toggle('changed', +inp.value !== +(inp.dataset.default || 0)); };
    inp.addEventListener('input', () => { show(); doc.setParam(k, +inp.value); markPreset(null); });
    inp.addEventListener('dblclick', () => { inp.value = inp.dataset.default || 0; show(); doc.setParam(k, +inp.value); });
    inp._show = show; show();
  });
  function syncSliders() {
    devInputs.forEach(inp => { const v = doc.params[inp.dataset.p]; inp.value = v == null ? (inp.dataset.default || 0) : v; inp._show(); });
    renderHsl(); drawCurve();
    PS.$('#applyBar').hidden = !doc.has || !doc.hasDevelop();
  }
  const GROUPS = {
    light: ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'clarity', 'dehaze', 'fade', 'curves'],
    color: ['temperature', 'tint', 'vibrance', 'saturation', 'hslHue', 'hslSat', 'hslLum'],
    detail: ['sharpen', 'sharpenRadius', 'denoise', 'colorDenoise', 'vignette', 'grain']
  };
  PS.$$('[data-reset]').forEach(b => b.addEventListener('click', () => {
    const n = IP.neutralParams(), p = Object.assign({}, doc.params);
    GROUPS[b.dataset.reset].forEach(k => { p[k] = JSON.parse(JSON.stringify(n[k])); });
    doc.setParams(p); markPreset(null);
  }));
  PS.$('#btnAuto').addEventListener('click', async () => {
    if (!doc.has) return;
    const p = await PS.run('autoParams', { img: PS.getImg(doc.proxy) });
    // preserva curvas/HSL que o usuário já tenha feito
    p.curves = doc.params.curves; p.hslHue = doc.params.hslHue; p.hslSat = doc.params.hslSat; p.hslLum = doc.params.hslLum;
    doc.setParams(p);
    PS.toast('Ajustes automáticos calculados pela análise do histograma. Refine nos controles se quiser.', 'success');
  });
  PS.$('#btnApplyDev').addEventListener('click', () => doc.applyDevelop());
  PS.$('#btnDiscardDev').addEventListener('click', () => { doc.discardDevelop(); markPreset('original'); });

  /* ---------- curvas ---------- */
  const cc = PS.$('#curveCanvas'), cx = cc.getContext('2d');
  let curveCh = 'rgb', curveDrag = -1;
  const CH_COLOR = { rgb: '#e9ecef', r: '#ff5a5a', g: '#3ccf6e', b: '#4a9dff' };
  function curvePts() { return doc.params.curves[curveCh]; }
  function drawCurve() {
    const W = cc.width, H = cc.height, css = getComputedStyle(document.documentElement);
    cx.clearRect(0, 0, W, H);
    // histograma ao fundo
    if (lastHist) {
      const h = curveCh === 'rgb' ? lastHist.l : lastHist[curveCh];
      let mx = 1; for (let i = 2; i < 254; i++) mx = Math.max(mx, h[i]);
      cx.fillStyle = 'rgba(128,128,128,.18)'; cx.beginPath(); cx.moveTo(0, H);
      for (let i = 0; i < 256; i++) cx.lineTo(i / 255 * W, H - Math.min(1, h[i] / mx) * H * 0.9);
      cx.lineTo(W, H); cx.fill();
    }
    cx.strokeStyle = css.getPropertyValue('--line'); cx.lineWidth = 1;
    cx.beginPath(); for (let i = 1; i < 4; i++) { cx.moveTo(W * i / 4, 0); cx.lineTo(W * i / 4, H); cx.moveTo(0, H * i / 4); cx.lineTo(W, H * i / 4); } cx.stroke();
    cx.setLineDash([4, 4]); cx.beginPath(); cx.moveTo(0, H); cx.lineTo(W, 0); cx.stroke(); cx.setLineDash([]);
    if (!doc.params || !doc.params.curves) return;
    const lut = IP.curveLUT(curvePts(), 256);
    cx.strokeStyle = CH_COLOR[curveCh] === '#e9ecef' ? css.getPropertyValue('--text') : CH_COLOR[curveCh]; cx.lineWidth = 2;
    cx.beginPath(); for (let i = 0; i < 256; i++) { const x = i / 255 * W, y = H - lut[i] * H; i ? cx.lineTo(x, y) : cx.moveTo(x, y); } cx.stroke();
    curvePts().forEach(([px, py]) => { cx.fillStyle = css.getPropertyValue('--chrome'); cx.strokeStyle = cx.strokeStyle; cx.beginPath(); cx.arc(px * W, H - py * H, 6, 0, Math.PI * 2); cx.fill(); cx.stroke(); });
  }
  function curvePos(e) { const r = cc.getBoundingClientRect(); return [PS.clamp((e.clientX - r.left) / r.width, 0, 1), PS.clamp(1 - (e.clientY - r.top) / r.height, 0, 1)]; }
  cc.addEventListener('pointerdown', e => {
    if (!doc.has) return;
    const [x, y] = curvePos(e), pts = curvePts().map(p => p.slice());
    let i = pts.findIndex(p => Math.hypot(p[0] - x, p[1] - y) < 0.05);
    if (i < 0) { pts.push([x, y]); pts.sort((a, b) => a[0] - b[0]); i = pts.findIndex(p => p[0] === x && p[1] === y); }
    doc.params.curves[curveCh] = pts; curveDrag = i; cc.setPointerCapture(e.pointerId); doc.setParam('curves', doc.params.curves);
  });
  cc.addEventListener('pointermove', e => {
    if (curveDrag < 0) return;
    const [x, y] = curvePos(e), pts = curvePts(), n = pts.length;
    const lo = curveDrag === 0 ? 0 : pts[curveDrag - 1][0] + 0.01, hi = curveDrag === n - 1 ? 1 : pts[curveDrag + 1][0] - 0.01;
    pts[curveDrag] = [curveDrag === 0 || curveDrag === n - 1 ? PS.clamp(x, lo, hi) : PS.clamp(x, lo, hi), y];
    doc.setParam('curves', doc.params.curves); drawCurve();
  });
  cc.addEventListener('pointerup', () => { curveDrag = -1; });
  cc.addEventListener('dblclick', e => {
    const [x, y] = curvePos(e), pts = curvePts(), i = pts.findIndex(p => Math.hypot(p[0] - x, p[1] - y) < 0.05);
    if (i > 0 && i < pts.length - 1) { pts.splice(i, 1); doc.setParam('curves', doc.params.curves); drawCurve(); }
  });
  PS.$$('#curveChannels button').forEach(b => b.addEventListener('click', () => {
    curveCh = b.dataset.ch; PS.$$('#curveChannels button').forEach(x => x.classList.toggle('active', x === b)); drawCurve();
  }));

  /* ---------- HSL ---------- */
  const HSL_NAMES = ['Vermelhos', 'Laranjas', 'Amarelos', 'Verdes', 'Cianos', 'Azuis', 'Roxos', 'Magentas'];
  let hslMode = 'hslHue';
  function renderHsl() {
    const box = PS.$('#hslSliders');
    if (!box.children.length) {
      box.innerHTML = HSL_NAMES.map((n, i) => `<label class="sl"><span>${n}</span><input type="range" min="-100" max="100" value="0" data-hsl="${i}"><output></output></label>`).join('');
      PS.$$('input[data-hsl]', box).forEach(inp => {
        inp.addEventListener('input', () => { const arr = doc.params[hslMode].slice(); arr[+inp.dataset.hsl] = +inp.value; inp.nextElementSibling.textContent = inp.value; doc.setParam(hslMode, arr); });
        inp.addEventListener('dblclick', () => { inp.value = 0; inp.dispatchEvent(new Event('input')); });
      });
    }
    PS.$$('input[data-hsl]', box).forEach(inp => {
      const i = +inp.dataset.hsl, hue = IP.HSL_CENTERS[i];
      inp.value = doc.params[hslMode][i]; inp.nextElementSibling.textContent = inp.value;
      inp.parentElement.classList.toggle('changed', +inp.value !== 0);
      const track = hslMode === 'hslHue' ? `linear-gradient(90deg,hsl(${hue - 30} 80% 55%),hsl(${hue} 80% 55%),hsl(${hue + 30} 80% 55%))`
        : hslMode === 'hslSat' ? `linear-gradient(90deg,hsl(${hue} 0% 55%),hsl(${hue} 90% 52%))` : `linear-gradient(90deg,hsl(${hue} 70% 15%),hsl(${hue} 70% 50%),hsl(${hue} 70% 85%))`;
      inp.style.setProperty('--track', track);
    });
  }
  PS.$$('#hslMode button').forEach(b => b.addEventListener('click', () => {
    hslMode = b.dataset.m; PS.$$('#hslMode button').forEach(x => x.classList.toggle('active', x === b)); renderHsl();
  }));

  /* ---------- estilos prontos ---------- */
  const C = (pts) => ({ rgb: pts, r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] });
  const PRESETS = [
    { id: 'original', name: 'Original', p: {} },
    { id: 'vivid', name: 'Vivo', p: { contrast: 18, vibrance: 35, saturation: 8, clarity: 15, shadows: 12 } },
    { id: 'warm', name: 'Quente', p: { temperature: 28, tint: 6, vibrance: 12, highlights: -10 } },
    { id: 'cool', name: 'Frio', p: { temperature: -26, tint: -4, contrast: 8, vibrance: 10 } },
    { id: 'cinema', name: 'Cinema', p: { contrast: 20, highlights: -25, shadows: 18, saturation: -10, hslHue: [0, -12, 0, 30, 15, 0, 0, 0], hslSat: [0, 20, -20, -30, 20, 25, 0, 0], curves: { rgb: [[0, 0.05], [0.5, 0.5], [1, 0.96]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0.08], [0.5, 0.52], [1, 0.92]] }, vignette: -20 } },
    { id: 'bw', name: 'P&B clássico', p: { saturation: -100, contrast: 15, clarity: 10 } },
    { id: 'bwdrama', name: 'P&B intenso', p: { saturation: -100, contrast: 45, clarity: 35, shadows: -10, vignette: -35, hslLum: [-20, -10, 10, 0, 0, -30, 0, 0] } },
    { id: 'matte', name: 'Fosco', p: { fade: 45, contrast: -5, saturation: -12, curves: C([[0, 0.08], [0.5, 0.5], [1, 0.95]]) } },
    { id: 'vintage', name: 'Vintage', p: { temperature: 22, fade: 35, saturation: -25, contrast: 10, grain: 25, vignette: -30, curves: { rgb: [[0, 0.06], [1, 0.94]], r: [[0, 0.04], [1, 1]], g: [[0, 0], [1, 0.96]], b: [[0, 0.1], [1, 0.85]] } } },
    { id: 'sunset', name: 'Pôr do sol', p: { temperature: 40, tint: 12, vibrance: 30, highlights: -20, hslSat: [20, 30, 15, 0, 0, 0, 0, 10] } },
    { id: 'portrait', name: 'Retrato suave', p: { clarity: -18, shadows: 15, highlights: -10, vibrance: 10, hslSat: [-5, -12, 0, 0, 0, 0, 0, 0], hslLum: [5, 10, 0, 0, 0, 0, 0, 0] } },
    { id: 'pop', name: 'Pôster pop', p: { contrast: 40, saturation: 35, clarity: 30, sharpen: 40, whites: 15, blacks: -15 } }
  ];
  let activePreset = 'original';
  function markPreset(id) { activePreset = id; PS.$$('.preset').forEach(b => b.classList.toggle('active', b.dataset.id === id)); }
  const presetBox = PS.$('#presets');
  presetBox.innerHTML = PRESETS.map(p => `<button class="preset" data-id="${p.id}"><canvas width="96" height="96"></canvas><span>${p.name}</span></button>`).join('');
  PS.$$('.preset', presetBox).forEach(b => b.addEventListener('click', () => {
    const pr = PRESETS.find(p => p.id === b.dataset.id);
    doc.setParams(JSON.parse(JSON.stringify(pr.p)));
    markPreset(pr.id);
  }));
  markPreset('original');
  let thumbTimer = 0, thumbVersion = -1;
  function schedulePresetThumbs() {
    clearTimeout(thumbTimer);
    thumbTimer = setTimeout(async () => {
      if (!doc.has || thumbVersion === doc.version || !PS.$('[data-panel="detail"]').classList.contains('active')) return;
      thumbVersion = doc.version;
      const src = doc.proxy, s = 96 / Math.min(src.width, src.height);
      const small = PS.downscale(src, src.width * s, src.height * s);
      const sq = PS.canvas(96, 96); PS.ctx(sq).drawImage(small, (96 - small.width) / 2, (96 - small.height) / 2);
      const img = PS.getImg(sq);
      for (const pr of PRESETS) {
        const res = IP.isNeutral(pr.p) ? img : await PS.run('develop', { img, params: pr.p, scale: 96 / Math.min(doc.w, doc.h) });
        const canvas = PS.$(`.preset[data-id="${pr.id}"] canvas`);
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(res.d), 96, 96), 0, 0);
      }
    }, 250);
  }

  /* ---------- filtros (atalhos para o menu Filtro) ---------- */
  (() => {
    const box = PS.$('#filterChips'), cats = {};
    Object.entries(PS.FX_DEFS).forEach(([k, d]) => { (cats[d.cat] = cats[d.cat] || []).push([k, d.title]); });
    box.innerHTML = Object.entries(cats).map(([c, items]) => `<div class="fcat"><span>${c}</span><div class="chips">${items.map(([k, t]) => `<button class="chip" data-fx="${k}">${t}</button>`).join('')}</div></div>`).join('');
    PS.$$('[data-fx]', box).forEach(b => b.addEventListener('click', () => PS.fx.open('fx', b.dataset.fx)));
    const abox = PS.$('#adjustChips');
    abox.innerHTML = Object.entries(PS.ADJ_DEFS).map(([k, d]) => `<button class="chip" data-adj="${k}"><i class="fa-solid ${d.icon}"></i>${d.title}</button>`).join('');
    PS.$$('[data-adj]', abox).forEach(b => b.addEventListener('click', () => PS.fx.open('adjust', b.dataset.adj)));
  })();

  /* ---------- melhorar qualidade ---------- */
  let upFactor = 2;
  PS.$$('#upFactor button').forEach(b => b.addEventListener('click', () => { upFactor = +b.dataset.f; PS.$$('#upFactor button').forEach(x => x.classList.toggle('active', x === b)); updateUpInfo(); }));
  ['upDenoise', 'upDetail', 'dnStrength', 'dnChroma', 'dnPreserve', 'shAmount', 'shRadius', 'shThreshold', 'dbStrength'].forEach(id => PS.bindRange(PS.$('#' + id), () => {}));
  function updateUpInfo() {
    if (!doc.has) { PS.$('#upResult').textContent = '—'; PS.$('#btnUpscale').disabled = true; return; }
    const w = Math.round(doc.w * upFactor), h = Math.round(doc.h * upFactor), mp = w * h / 1e6;
    PS.$('#upResult').innerHTML = `Resultado: <strong>${PS.fmtInt(w)} × ${PS.fmtInt(h)} px</strong> (${PS.fmt(mp, 1)} MP) — a 300 DPI imprime ${PS.fmt(w / 300 * 2.54, 1)} × ${PS.fmt(h / 300 * 2.54, 1)} cm.` + (mp > 100 ? ' <span class="hint">Imagem grande: o processamento pode consumir bastante memória.</span>' : '');
    // O tamanho selecionado não tem teto fixo de MP; só rejeita dimensões inválidas.
    PS.$('#btnUpscale').disabled = !PS.imageSize.valid(w, h);
  }
  let upMethod = 'sr';
  PS.$$('#upMethod button').forEach(b => b.addEventListener('click', () => { upMethod = b.dataset.m; PS.$$('#upMethod button').forEach(x => x.classList.toggle('active', x === b)); }));
  PS.upscaleTo = async (factor, method) => {
    const ok = await PS.scaleAll(doc.w * factor, doc.h * factor, method || upMethod, +PS.$('#upDetail').value);
    if (ok) PS.toast(`Imagem ampliada para ${PS.fmtInt(doc.w)} × ${PS.fmtInt(doc.h)} px.`, 'success');
    return ok;
  };
  PS.$('#btnUpscale').addEventListener('click', async () => {
    if (!doc.has) return;
    try { await PS.upscaleTo(upFactor); }
    catch (e) { PS.toast(e.message || 'Não foi possível ampliar a imagem.', 'error', 7000); }
  });
  PS.$('#btnDenoise').addEventListener('click', async () => { if (!doc.has) return; await doc.process('denoise', { strength: +PS.$('#dnStrength').value, chroma: +PS.$('#dnChroma').value, preserve: +PS.$('#dnPreserve').value }, 'Redução de ruído', 'fa-feather', 'Reduzindo ruído'); PS.toast('Ruído reduzido.', 'success'); });
  PS.$('#btnSharpen').addEventListener('click', async () => { if (!doc.has) return; await doc.process('smartSharpen', { amount: +PS.$('#shAmount').value, radius: +PS.$('#shRadius').value, threshold: +PS.$('#shThreshold').value }, 'Nitidez inteligente', 'fa-diamond', 'Aplicando nitidez'); PS.toast('Nitidez aplicada.', 'success'); });
  PS.$('#btnDeblock').addEventListener('click', async () => { if (!doc.has) return; await doc.process('filter', { name: 'deblock', amount: 100, opt: { strength: +PS.$('#dbStrength').value } }, 'Remover artefatos de JPG', 'fa-broom', 'Removendo artefatos'); PS.toast('Artefatos de compressão suavizados.', 'success'); });

  /* ---------- aba imagem ---------- */
  PS.$('#rotL').addEventListener('click', () => PS.rotateCanvas(-90));
  PS.$('#rotR').addEventListener('click', () => PS.rotateCanvas(90));
  PS.$('#flipH').addEventListener('click', () => PS.flipCanvas(true));
  PS.$('#flipV').addEventListener('click', () => PS.flipCanvas(false));

  // Endireitar: maior retângulo sem bordas vazias dentro da imagem girada
  function maxInnerRect(w, h, a) {
    const s = Math.abs(Math.sin(a)), c = Math.abs(Math.cos(a));
    if (s < 1e-9) return [w, h];
    const longW = w >= h, L = longW ? w : h, Sh = longW ? h : w;
    if (Sh <= 2 * s * c * L || Math.abs(s - c) < 1e-10) { const x = 0.5 * Sh; return longW ? [x / s, x / c] : [x / c, x / s]; }
    const c2 = c * c - s * s; return [(w * c - h * s) / c2, (h * c - w * s) / c2];
  }
  const stIn = PS.$('#straighten'), stOut = stIn.parentElement.querySelector('output');
  function straightenGeom() {
    const a = +stIn.value * Math.PI / 180, crop = PS.$('#straightenCrop').checked;
    const s = Math.abs(Math.sin(a)), c = Math.abs(Math.cos(a));
    const [cw, ch] = crop ? maxInnerRect(doc.w, doc.h, a) : [doc.w * c + doc.h * s, doc.w * s + doc.h * c];
    return { a, cw: Math.floor(cw), ch: Math.floor(ch) };
  }
  let stC = null, stV = -1;
  const stCache = () => { if (stV !== doc.version) { stC = doc.liveSmall(2000); stV = doc.version; } return stC; };
  function updateStraighten() {
    const v = +stIn.value; stOut.textContent = `${PS.fmt(v, 1)}°`;
    PS.$('#straightenApply').disabled = !doc.has || v === 0;
    if (!doc.has || v === 0) { PS.view.drawImageOverride = null; PS.view.render(); return; }
    const g = straightenGeom(), V = PS.view;
    PS.view.drawImageOverride = ctx => {
      const z = V.zoom, cx = V.panX + doc.w * z / 2, cy = V.panY + doc.h * z / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(g.a); ctx.drawImage(stCache(), -doc.w * z / 2, -doc.h * z / 2, doc.w * z, doc.h * z); ctx.restore();
      const rw = g.cw * z, rh = g.ch * z;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.rect(0, 0, V.cssW, V.cssH); ctx.rect(cx - rw / 2, cy - rh / 2, rw, rh); ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 1; i < 6; i++) { ctx.moveTo(cx - rw / 2 + rw * i / 6, cy - rh / 2); ctx.lineTo(cx - rw / 2 + rw * i / 6, cy + rh / 2); ctx.moveTo(cx - rw / 2, cy - rh / 2 + rh * i / 6); ctx.lineTo(cx + rw / 2, cy - rh / 2 + rh * i / 6); }
      ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.strokeRect(cx - rw / 2, cy - rh / 2, rw, rh); ctx.restore();
    };
    PS.view.render();
  }
  stIn.addEventListener('input', updateStraighten);
  stIn.addEventListener('dblclick', () => { stIn.value = 0; updateStraighten(); });
  PS.$('#straightenCrop').addEventListener('change', updateStraighten);
  PS.$('#straightenReset').addEventListener('click', () => { stIn.value = 0; updateStraighten(); });
  PS.$('#straightenApply').addEventListener('click', async () => {
    await doc.ensureFlat();
    const g = straightenGeom(), ow = doc.w, oh = doc.h;
    stIn.value = 0; PS.view.drawImageOverride = null;
    doc.transformAll(g.cw, g.ch, L => {
      const rot = src => { if (!src) return null; const c = PS.canvas(g.cw, g.ch), x = PS.ctx(c); x.imageSmoothingQuality = 'high'; x.translate(g.cw / 2, g.ch / 2); x.rotate(g.a); x.drawImage(src, L.x - ow / 2, L.y - oh / 2); return c; };
      return { canvas: rot(L.canvas), mask: rot(L.mask), x: 0, y: 0 };
    }, `Endireitar ${PS.fmt(g.a * 180 / Math.PI, 1)}°`, 'fa-ruler-combined');
    updateStraighten(); PS.view.fit();
  });

  // Redimensionar
  const rsW = PS.$('#rsW'), rsH = PS.$('#rsH'), rsLock = PS.$('#rsLock');
  function rsInfo() {
    const w = +rsW.value || 0, h = +rsH.value || 0;
    PS.$('#rsInfo').textContent = w && h ? `${PS.fmt(w * h / 1e6, 1)} MP · a 300 DPI: ${PS.fmt(w / 300 * 2.54, 1)} × ${PS.fmt(h / 300 * 2.54, 1)} cm` : '';
  }
  rsW.addEventListener('input', () => { if (rsLock.checked && doc.has) rsH.value = Math.max(1, Math.round(+rsW.value * doc.h / doc.w)); rsInfo(); });
  rsH.addEventListener('input', () => { if (rsLock.checked && doc.has) rsW.value = Math.max(1, Math.round(+rsH.value * doc.w / doc.h)); rsInfo(); });
  PS.$('#rsApply').addEventListener('click', async () => {
    const w = Math.round(+rsW.value), h = Math.round(+rsH.value);
    if (!doc.has || !w || !h) return;
    if (w === doc.w && h === doc.h) return;
    try { await PS.scaleAll(w, h, 'lanczos'); } catch (e) { PS.toast(e.message, 'error', 7000); }
  });
  PS.$('#btnTrim').addEventListener('click', () => PS.trim());
  PS.$('#btnFlatten').addEventListener('click', () => doc.has && doc.flatten());

  function renderFacts() {
    const el = PS.$('#imgFacts');
    if (!doc.has) { el.innerHTML = '<dt>Imagem</dt><dd>—</dd>'; return; }
    const cm = dpi => `${PS.fmt(doc.w / dpi * 2.54, 1)} × ${PS.fmt(doc.h / dpi * 2.54, 1)} cm`;
    el.innerHTML = `<dt>Dimensões</dt><dd>${PS.fmtInt(doc.w)} × ${PS.fmtInt(doc.h)} px</dd><dt>Megapixels</dt><dd>${PS.fmt(doc.w * doc.h / 1e6, 1)} MP</dd>
      <dt>Proporção</dt><dd>${ratioText(doc.w, doc.h)}</dd><dt>Impressão a 300 DPI</dt><dd>${cm(300)}</dd><dt>Impressão a 150 DPI</dt><dd>${cm(150)}</dd>`;
    rsW.value = doc.w; rsH.value = doc.h; rsInfo();
  }
  function ratioText(w, h) {
    const g = (a, b) => b ? g(b, a % b) : a, d = g(w, h);
    if (w / d <= 40 && h / d <= 40) return `${w / d}:${h / d}`;
    return w >= h ? `${PS.fmt(w / h, 3)}:1` : `1:${PS.fmt(h / w, 3)}`;
  }
  function renderHistory() {
    const ol = PS.$('#historyList');
    ol.innerHTML = doc.history.map((h, i) => `<li data-i="${i}" class="${i === doc.index ? 'current' : i > doc.index ? 'future' : ''}"><i class="fa-solid ${h.icon}"></i>${PS.escape(h.label)}</li>`).join('');
    PS.$$('li', ol).forEach(li => li.addEventListener('click', () => doc.goto(+li.dataset.i)));
  }

  /* ---------- histograma ---------- */
  let lastHist = null, histTimer = 0;
  function updateHistogram() {
    clearTimeout(histTimer);
    histTimer = setTimeout(() => {
      const hc = PS.$('#histogram'), x = hc.getContext('2d'), W = hc.width, H = hc.height;
      x.clearRect(0, 0, W, H);
      if (!doc.has) { lastHist = null; drawCurve(); return; }
      const small = doc.liveSmall(360);
      lastHist = IP.histogram(PS.getImg(small));
      const dark = document.documentElement.dataset.theme !== 'light';
      x.globalCompositeOperation = dark ? 'lighter' : 'multiply';
      let mx = 1; for (const ch of ['r', 'g', 'b']) for (let i = 1; i < 255; i++) mx = Math.max(mx, lastHist[ch][i]);
      const cols = dark ? { r: 'rgba(255,70,70,.75)', g: 'rgba(60,200,100,.75)', b: 'rgba(70,140,255,.8)' } : { r: 'rgba(255,90,90,.8)', g: 'rgba(90,210,120,.8)', b: 'rgba(90,150,255,.8)' };
      for (const ch of ['r', 'g', 'b']) {
        x.fillStyle = cols[ch]; x.beginPath(); x.moveTo(0, H);
        for (let i = 0; i < 256; i++) x.lineTo(i / 255 * W, H - Math.min(1, Math.sqrt(lastHist[ch][i] / mx)) * (H - 4));
        x.lineTo(W, H); x.closePath(); x.fill();
      }
      x.globalCompositeOperation = 'source-over';
      // avisos de estouro (pontas cortadas)
      const total = lastHist.l.reduce((a, b) => a + b, 0) || 1;
      if (lastHist.l[255] / total > 0.01) { x.fillStyle = '#ffd200'; x.fillRect(W - 4, 0, 4, H); }
      if (lastHist.l[0] / total > 0.01) { x.fillStyle = '#00a7e1'; x.fillRect(0, 0, 4, H); }
      drawCurve();
    }, 60);
  }

  /* ---------- exportar ---------- */
  PS.exportDialog = async () => {
    if (!doc.has) return;
    const body = document.createElement('div');
    body.innerHTML = `
      <label class="fld"><span>Nome do arquivo</span><input class="input" id="exName" value="${PS.escape(doc.name)}-editada"></label>
      <div class="seg block" id="exFmt"><button class="active" data-f="image/png">PNG</button><button data-f="image/jpeg">JPG</button><button data-f="image/webp">WEBP</button></div>
      <label class="sl" id="exQRow" hidden><span>Qualidade</span><input type="range" id="exQ" min="40" max="100" value="92"><output></output></label>
      <div class="grid2"><label class="fld"><span>Largura (px)</span><input class="input" type="number" id="exW" value="${doc.w}" min="1"></label>
      <label class="fld"><span>Altura (px)</span><input class="input" type="number" id="exH" value="${doc.h}" min="1"></label></div>
      <label class="fld"><span>Resolução gravada no arquivo</span><select class="input" id="exDpi"><option value="72">72 DPI (telas)</option><option value="150">150 DPI</option><option value="300" selected>300 DPI (impressão)</option></select></label>
      <p class="hint" id="exInfo"></p>`;
    let fmt = 'image/png';
    const p = PS.dialog({ title: 'Exportar imagem', body, okText: 'Baixar', onOpen: b => {
      const q = PS.$('#exQ', b), qOut = q.nextElementSibling, w = PS.$('#exW', b), h = PS.$('#exH', b);
      const info = () => {
        const dpi = +PS.$('#exDpi', b).value;
        PS.$('#exInfo', b).textContent = `Tamanho impresso a ${dpi} DPI: ${PS.fmt(+w.value / dpi * 2.54, 1)} × ${PS.fmt(+h.value / dpi * 2.54, 1)} cm.` + (fmt === 'image/jpeg' ? ' Áreas transparentes ficam brancas no JPG.' : '');
        qOut.textContent = q.value + '%';
      };
      PS.$$('#exFmt button', b).forEach(btn => btn.addEventListener('click', e => { e.preventDefault(); fmt = btn.dataset.f; PS.$$('#exFmt button', b).forEach(x => x.classList.toggle('active', x === btn)); PS.$('#exQRow', b).hidden = fmt === 'image/png'; info(); }));
      w.addEventListener('input', () => { h.value = Math.max(1, Math.round(+w.value * doc.h / doc.w)); info(); });
      h.addEventListener('input', () => { w.value = Math.max(1, Math.round(+h.value * doc.w / doc.h)); info(); });
      q.addEventListener('input', info); PS.$('#exDpi', b).addEventListener('change', info); info();
    } });
    const res = await p;
    if (!res) return;
    const name = (PS.$('#exName', res).value || 'imagem').replace(/[\\/:*?"<>|]/g, '_');
    const W = Math.round(+PS.$('#exW', res).value), H = Math.round(+PS.$('#exH', res).value), q = +PS.$('#exQ', res).value / 100, dpi = +PS.$('#exDpi', res).value;
    try {
      if (!PS.imageSize.valid(W, H)) throw new Error('Informe dimensões válidas em pixels inteiros.');
      let blob;
      await PS.withBusy('Exportando imagem', `${PS.fmtInt(W)} × ${PS.fmtInt(H)} px`, async prog => {
        let c = await doc.finalCanvas();
        if (W !== c.width || H !== c.height) {
          c = PS.putImg(await PS.run('resize', { img: PS.getImg(c), w: W, h: H }, prog));
        }
        if (fmt === 'image/jpeg') { const f = PS.canvas(c.width, c.height), x = PS.ctx(f); x.fillStyle = '#fff'; x.fillRect(0, 0, f.width, f.height); x.drawImage(c, 0, 0); c = f; }
        blob = await PS.canvasToBlob(c, fmt, q);
        if (fmt === 'image/png') blob = await PS.setPngDpi(blob, dpi);
        if (fmt === 'image/jpeg') blob = await PS.setJpegDpi(blob, dpi);
        if (fmt === 'image/webp' && blob.type !== 'image/webp') throw new Error('este navegador não exporta WEBP; use PNG ou JPG');
      });
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[fmt];
      PS.download(blob, `${name}.${ext}`);
      PS.toast(`Imagem exportada (${PS.bytes(blob.size)}).`, 'success');
    } catch (e) { PS.toast('Não foi possível exportar: ' + e.message, 'error'); }
  };

  /* ---------- sincronização ---------- */
  doc.on(type => {
    if (type === 'params') { syncSliders(); }
    if (type === 'preview' || type === 'params' || type === 'load' || type === 'change') updateHistogram();
    if (type === 'load' || type === 'change') {
      renderFacts(); renderHistory(); updateUpInfo(); schedulePresetThumbs();
      PS.$('#docName').textContent = doc.name || 'Sem imagem';
      PS.$('#docDims').textContent = `${PS.fmtInt(doc.w)} × ${PS.fmtInt(doc.h)} px`;
      PS.view.setInfo(`${PS.fmtInt(doc.w)} × ${PS.fmtInt(doc.h)} px`);
    }
    if (type === 'load') { syncSliders(); markPreset('original'); stIn.value = 0; updateStraighten(); }
    PS.$('#applyBar').hidden = !doc.has || !doc.hasDevelop();
  });
  syncSliders(); renderFacts();
  PS.panels = {
    updateHistogram, renderFacts,
    showTab(tab, focusSel) {
      const t = PS.$(`.itab[data-tab="${tab}"]`); if (t) t.click();
      if (focusSel) setTimeout(() => { const el = PS.$(focusSel); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 50);
    }
  };
})();
