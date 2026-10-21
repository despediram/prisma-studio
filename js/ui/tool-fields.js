/* Prisma Studio — sincronização de campos de transformação, recorte e fontes locais. Scripts clássicos para funcionar offline via file://. */
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
  C.updateCropFields = function () {
    const o = PS.$('#cropDims');
    if (o && C.crop) o.textContent = `${Math.round(C.crop.w)} × ${Math.round(C.crop.h)} px`;
  };
  C.updateXfFields = function () {
    if (!C.xf) return;
    const a = PS.$('#xfW'),
      b = PS.$('#xfH'),
      c = PS.$('#xfA');
    if (a && document.activeElement !== a) a.value = Math.round(C.xf.sx * 1000) / 10;
    if (b && document.activeElement !== b) b.value = Math.round(C.xf.sy * 1000) / 10;
    if (c && document.activeElement !== c) c.value = Math.round(C.xf.ang * 1800 / Math.PI) / 10;
  };
  C.FONTS = ['system-ui', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Impact', 'Courier New', 'Palatino Linotype', 'Segoe UI', 'Tahoma', 'Comic Sans MS', 'Brush Script MT'];
  C.customFonts = [];
  PS.$('#fontInput').addEventListener('change', async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[^\w\s-]/g, '');
      const face = new FontFace(name, await f.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      C.customFonts.push(name);
      C.updateText('family', name);
      C.renderOptions();
      PS.toast(`Fonte “${name}” carregada.`, 'success');
    } catch (err) {
      PS.toast('Não foi possível carregar essa fonte. Use TTF, OTF, WOFF ou WOFF2.', 'error');
    }
  });
})();
