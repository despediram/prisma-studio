/* Prisma Studio — geometria do pôster. Tudo em milímetros; pixels só aparecem na renderização.
 *
 * Modelo:
 *  - Cada folha tem uma área imprimível (célula) = papel − margem não imprimível nos 4 lados.
 *  - Folhas vizinhas compartilham uma faixa de sobreposição (ov) dentro das células.
 *  - Passo entre folhas = célula − ov. A grade cobre: célula + (n − 1) × passo.
 *  - O “alvo” é o retângulo do pôster final; a imagem é encaixada nele (preencher ou inteira),
 *    nunca esticada.
 */
(function () {
  'use strict';
  const PS = window.PS;

  PS.PAPERS = {
    A5: [148, 210], A4: [210, 297], A3: [297, 420],
    Letter: [215.9, 279.4], Oficio: [216, 330], Legal: [215.9, 355.6], Tabloid: [279.4, 431.8],
    A2: [420, 594], A1: [594, 841], A0: [841, 1189],
    P10x15: [100, 150], P13x18: [130, 180], P15x21: [150, 210], P20x25: [200, 250], P20x30: [200, 300]
  };
  PS.PAPER_NAMES = { A5: 'A5', A4: 'A4', A3: 'A3', Letter: 'Carta', Oficio: 'Ofício', Legal: 'Legal', Tabloid: 'Tabloide', A2: 'A2', A1: 'A1', A0: 'A0',
    P10x15: 'foto 10×15', P13x18: 'foto 13×18', P15x21: 'foto 15×21', P20x25: 'foto 20×25', P20x30: 'foto 20×30', custom: 'personalizado' };

  const MAX_GRID = 30;

  PS.posterGeometry = (cfg, imgW, imgH) => {
    const g = { warnings: [] };
    // papel orientado
    let pw = cfg.paperW, ph = cfg.paperH;
    if ((cfg.orient === 'landscape') !== (pw > ph)) [pw, ph] = [ph, pw];
    g.pageW = pw; g.pageH = ph;
    g.margin = PS.clamp(cfg.safePrint===true?Math.max(5,cfg.margin):cfg.margin, 0, Math.min(pw, ph) / 4);
    g.cw = pw - 2 * g.margin; g.ch = ph - 2 * g.margin;
    g.ov = PS.clamp(cfg.overlap, 0, Math.min(g.cw, g.ch) / 3);
    if (g.ov !== cfg.overlap) g.warnings.push('A sobreposição foi limitada a um terço da área útil da folha.');
    g.stepX = g.cw - g.ov; g.stepY = g.ch - g.ov;
    const aspect = imgW && imgH ? imgW / imgH : 1;

    // 1) retângulo-alvo (tamanho final desejado) e grade
    let tW, tH;
    const need = (len, cell, step) => len <= cell + 1e-6 ? 1 : Math.ceil((len - cell) / step - 1e-6) + 1;
    if (cfg.mode === 'grid') {
      g.cols = PS.clamp(Math.round(cfg.cols) || 1, 1, MAX_GRID); g.rows = PS.clamp(Math.round(cfg.rows) || 1, 1, MAX_GRID);
      g.areaW = g.cw + (g.cols - 1) * g.stepX; g.areaH = g.ch + (g.rows - 1) * g.stepY;
      tW = g.areaW; tH = g.areaH;
    } else {
      if (cfg.mode === 'size') {
        tW = Math.max(10, cfg.targetW || 0); tH = Math.max(10, cfg.targetH || 0);
        if (cfg.lock) {
          if (cfg.lockFrom === 'h') tW = tH * aspect; else tH = tW / aspect;
        }
      } else {
        const dpi = Math.max(1, cfg.scaleDpi || 100);
        tW = imgW / dpi * 25.4; tH = imgH / dpi * 25.4;
      }
      g.requestedW=tW;g.requestedH=tH;
      g.cols = need(tW, g.cw, g.stepX); g.rows = need(tH, g.ch, g.stepY);
      if (g.cols > MAX_GRID || g.rows > MAX_GRID) {
        g.sizeLimited=true;
        g.warnings.push(`O tamanho pedido exigiria ${g.cols} × ${g.rows} folhas; limitado a ${MAX_GRID} por lado.`);
        g.cols = Math.min(g.cols, MAX_GRID); g.rows = Math.min(g.rows, MAX_GRID);
      }
      g.areaW = g.cw + (g.cols - 1) * g.stepX; g.areaH = g.ch + (g.rows - 1) * g.stepY;
      if (tW > g.areaW) { tH *= g.areaW / tW; tW = g.areaW; }
      if (tH > g.areaH) { tW *= g.areaH / tH; tH = g.areaH; }
    }
    g.target = { x: (g.areaW - tW) / 2, y: (g.areaH - tH) / 2, w: tW, h: tH };

    // 2) encaixe da imagem no alvo (preencher/inteira) + zoom + deslocamento; a borda branca encolhe a área da arte
    const bd = PS.clamp(cfg.border || 0, 0, Math.min(g.target.w, g.target.h) / 3);
    g.border = bd;
    const T = { x: g.target.x + bd, y: g.target.y + bd, w: g.target.w - 2 * bd, h: g.target.h - 2 * bd }, zoom = Math.max(1, cfg.zoom || 1);
    g.artRect = T;
    let s = cfg.fit === 'contain' ? Math.min(T.w / imgW, T.h / imgH) : Math.max(T.w / imgW, T.h / imgH);
    s *= zoom;
    const iw = imgW * s, ih = imgH * s;
    const slackX = iw - T.w, slackY = ih - T.h;
    const px = PS.clamp(cfg.panX || 0, -1, 1), py = PS.clamp(cfg.panY || 0, -1, 1);
    g.img = { x: T.x - slackX / 2 * (1 + px), y: T.y - slackY / 2 * (1 + py), w: iw, h: ih };
    g.mmPerPx = s;                 // mm por pixel da imagem
    g.effDpi = imgW / (iw / 25.4);     // pixels da imagem por polegada impressa
    g.canPan = slackX > 0.01 || slackY > 0.01 || zoom > 1;

    // 3) parte visível = imagem ∩ alvo — é o pôster que efetivamente aparece
    const vx0 = Math.max(T.x, g.img.x), vy0 = Math.max(T.y, g.img.y);
    const vx1 = Math.min(T.x + T.w, g.img.x + g.img.w), vy1 = Math.min(T.y + T.h, g.img.y + g.img.h);
    g.visible = { x: vx0, y: vy0, w: Math.max(0, vx1 - vx0), h: Math.max(0, vy1 - vy0) };
    g.finalW = (cfg.fit === 'contain' ? g.visible.w : T.w) + 2 * bd;
    g.finalH = (cfg.fit === 'contain' ? g.visible.h : T.h) + 2 * bd;
    // retângulo do pôster final (com a borda) — usado na vista montada
    g.finalRect = cfg.fit === 'contain' ? { x: g.visible.x - bd, y: g.visible.y - bd, w: g.finalW, h: g.finalH } : { ...g.target };

    // 4) folhas
    g.tiles = [];
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
      const x0 = c * g.stepX, y0 = r * g.stepY;
      const ix0 = Math.max(x0, g.visible.x), iy0 = Math.max(y0, g.visible.y);
      const ix1 = Math.min(x0 + g.cw, g.visible.x + g.visible.w), iy1 = Math.min(y0 + g.ch, g.visible.y + g.visible.h);
      const blank = !(ix1 - ix0 > 0.05 && iy1 - iy0 > 0.05);
      g.tiles.push({ r, c, x0, y0, blank, code: tileCode(r, c), right: c < g.cols - 1, bottom: r < g.rows - 1, left: c > 0, top: r > 0 });
    }
    g.printed = g.tiles.filter(t => !t.blank || !cfg.skipBlank);
    g.total = g.tiles.length;
    return g;
  };

  function tileCode(r, c) {
    let s = '', n = r;
    do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return s + (c + 1);
  }
  PS.tileCode = tileCode;

  PS.dpiQuality = dpi => {
    if (dpi >= 240) return { label: 'Excelente', color: 'var(--ok)', pct: 1, note: 'nítido mesmo de perto' };
    if (dpi >= 150) return { label: 'Boa', color: 'var(--ok)', pct: 0.75, note: 'ótimo a partir de meio metro' };
    if (dpi >= 100) return { label: 'Aceitável', color: 'var(--yellow)', pct: 0.5, note: 'bom visto a 1 m ou mais' };
    if (dpi >= 60) return { label: 'Baixa', color: '#ff8a3d', pct: 0.3, note: 'vai parecer borrado de perto' };
    return { label: 'Muito baixa', color: 'var(--danger)', pct: 0.15, note: 'pixels visíveis' };
  };
})();

/* Prisma Studio — posicionamento físico do raster e juntas de montagem.
 * Mantém a origem fracionária no PDF: arredondar pixels nunca muda o tamanho
 * físico da folha ou a escala da imagem. Coordenadas em mm, origem superior.
 */
(function () {
  'use strict';
  const PS=window.PS;
  PS.posterPrintPlacement=(g,t,placement,rotate=false)=>{
    const m=g.margin,ox=m+placement.x-t.x0,oy=m+placement.y-t.y0;
    return rotate?{
      pageW:g.pageH,pageH:g.pageW,
      image:{x:g.pageH-oy-placement.h,y:ox,w:placement.h,h:placement.w},
      clip:{x:m,y:m,w:g.ch,h:g.cw}
    }:{pageW:g.pageW,pageH:g.pageH,image:{x:ox,y:oy,w:placement.w,h:placement.h},clip:{x:m,y:m,w:g.cw,h:g.ch}};
  };
  PS.posterJoints=g=>{
    const active=new Map(g.printed.map(t=>[t.code,t])),joints=[];
    for(const t of g.printed)for(const [dc,dr] of [[1,0],[0,1]]){
      const other=active.get(PS.tileCode(t.r+dr,t.c+dc));if(!other)continue;
      const x=Math.max(t.x0,other.x0),y=Math.max(t.y0,other.y0);
      const w=Math.min(t.x0+g.cw,other.x0+g.cw)-x,h=Math.min(t.y0+g.ch,other.y0+g.ch)-y;
      joints.push({a:t.code,b:other.code,axis:dc?'vertical':'horizontal',rect:{x,y,w:Math.max(0,w),h:Math.max(0,h)}});
    }
    return joints;
  };
})();
