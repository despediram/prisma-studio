/* Prisma Studio — traços de pincel/borracha em blocos locais de 256 px.
 * Guarda o estado anterior apenas ao tocar um bloco e acumula fluxo nele.
 * Opacidade limita o traço inteiro; fluxo controla a tinta de cada carimbo.
 */
(function () {
  'use strict';

  const PS = window.PS,
    C = PS.toolContext,
    doc = PS.doc,
    S = PS.tools.S,
    TILE = 256;
  C.stampTiles = (st, x, y, d) => {
    const target = doc.base,
      r = d / 2,
      s = S[st.kind];
    const x0 = Math.max(0, Math.floor(x - r - 2)),
      y0 = Math.max(0, Math.floor(y - r - 2));
    const x1 = Math.min(target.width, Math.ceil(x + r + 2)),
      y1 = Math.min(target.height, Math.ceil(y + r + 2));
    if (x1 <= x0 || y1 <= y0) return;
    const stamp = C.softStamp(d, s.hardness, st.kind === 'brush' ? doc.editMask ? '#ffffff' : doc.fg : '#000000');
    for (let ty = Math.floor(y0 / TILE) * TILE; ty < y1; ty += TILE) for (let tx = Math.floor(x0 / TILE) * TILE; tx < x1; tx += TILE) {
      const key = tx + ',' + ty;
      let tile = st.tiles.get(key);
      if (!tile) {
        const w = Math.min(TILE, target.width - tx),
          h = Math.min(TILE, target.height - ty);
        tile = {
          x: tx,
          y: ty,
          w,
          h,
          before: PS.ctx(target).getImageData(tx, ty, w, h),
          paint: PS.canvas(w, h),
          effect: null,
          dirty: null
        };
        if (st.kind === 'tone') {
          const original = PS.canvas(w, h);
          PS.ctx(original).putImageData(tile.before, 0, 0);
          tile.effect = C.effectCanvas(original, 'tone');
        }
        st.tiles.set(key, tile);
      }
      const px = PS.ctx(tile.paint);
      px.globalAlpha = (s.flow ?? 100) / 100;
      px.drawImage(stamp, x - r - tx, y - r - ty);
      const area = {
        x: Math.max(tx, x0),
        y: Math.max(ty, y0),
        x1: Math.min(tx + tile.w, x1),
        y1: Math.min(ty + tile.h, y1)
      };
      if (!tile.dirty) tile.dirty = area;else {
        tile.dirty.x = Math.min(tile.dirty.x, area.x);
        tile.dirty.y = Math.min(tile.dirty.y, area.y);
        tile.dirty.x1 = Math.max(tile.dirty.x1, area.x1);
        tile.dirty.y1 = Math.max(tile.dirty.y1, area.y1);
      }
    }
  };
  C.compositeTiles = st => {
    const bx = PS.ctx(doc.base),
      s = S[st.kind],
      L = doc.layer;
    let bounds = null;
    for (const tile of st.tiles.values()) {
      const a = tile.dirty;
      if (!a) continue;
      tile.dirty = null;
      const w = a.x1 - a.x,
        h = a.y1 - a.y,
        lx = a.x - tile.x,
        ly = a.y - tile.y;
      bx.putImageData(tile.before, tile.x, tile.y, lx, ly, w, h);
      let src = tile.paint,
        sx = lx,
        sy = ly;
      if (st.kind === 'tone' || doc.sel || doc.editMask && st.kind === 'eraser') {
        src = PS.canvas(w, h);
        const tx = PS.ctx(src);
        if (st.kind === 'tone') {
          tx.drawImage(tile.effect, lx, ly, w, h, 0, 0, w, h);
          tx.globalCompositeOperation = 'destination-in';
        }
        tx.drawImage(tile.paint, lx, ly, w, h, 0, 0, w, h);
        if (doc.sel) {
          tx.globalCompositeOperation = 'destination-in';
          tx.drawImage(doc.sel.canvas, -L.x - a.x, -L.y - a.y);
        }
        if (doc.editMask && st.kind === 'eraser') {
          tx.globalCompositeOperation = 'source-in';
          tx.fillStyle = '#fff';
          tx.fillRect(0, 0, w, h);
        }
        sx = sy = 0;
      }
      bx.save();
      bx.globalAlpha = (s.opacity ?? 100) / 100;
      const erase = doc.editMask ? st.kind === 'brush' && C.lum(doc.fg) < .5 : st.kind === 'eraser';
      bx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
      bx.drawImage(src, sx, sy, w, h, a.x, a.y, w, h);
      bx.restore();
      if (!bounds) bounds = {
        ...a
      };else {
        bounds.x = Math.min(bounds.x, a.x);
        bounds.y = Math.min(bounds.y, a.y);
        bounds.x1 = Math.max(bounds.x1, a.x1);
        bounds.y1 = Math.max(bounds.y1, a.y1);
      }
    }
    if (bounds) PS.view.render({
      x: bounds.x + L.x,
      y: bounds.y + L.y,
      w: bounds.x1 - bounds.x,
      h: bounds.y1 - bounds.y
    });else PS.view.renderOverlay();
  };
})();
