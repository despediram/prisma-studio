/* Prisma Studio — pictogramas vetoriais próprios da interface.
 * Traços escaláveis, sem downloads ou imagens rasterizadas nos botões; file:// compatível.
 */
(function(){
 'use strict';const P=window.PS;
 const paths={
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 editor:'<path d="m4 20 11-11 4 4L8 24M14 10l4-4 4 4-4 4M4 4v4M2 6h4M20 2v4M18 4h4" transform="translate(0 -2)"/>',
 design:'<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M3 10h18M10 10v11M6 6.5h.01M9 6.5h.01"/>',
 poster:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18M3 12h18m-7-4 2-2 2 2m-2-2v4"/>',
 folder:'<path d="M3 8V5a2 2 0 0 1 2-2h4l3 3h7a2 2 0 0 1 2 2v2M3 8h17a1 1 0 0 1 1 1l-2 10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2l1-11Z"/>',
 undo:'<path d="m9 4-5 5 5 5M4 9h10a6 6 0 0 1 0 12h-3"/>',redo:'<path d="m15 4 5 5-5 5m5-5H10a6 6 0 0 0 0 12h3"/>',
 export:'<path d="M12 3v12m-4-4 4 4 4-4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 recent:'<path d="M4 8a9 9 0 1 1-1 8M3 3v6h6M12 7v5l3 2"/>',
 crop:'<path d="M6 3v13a2 2 0 0 0 2 2h13M3 6h13a2 2 0 0 1 2 2v13"/>',
 text:'<path d="M5 6V3h14v3M12 3v18M8 21h8"/>',
 move:'<path d="M12 2v20M2 12h20m-13-7 3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3m14-6 3 3-3 3"/>',
 brush:'<path d="m10 14 9-11a2 2 0 0 1 3 3L13 17M10 14l3 3M9 15c-5-2-3 6-7 6 5 2 11-1 9-5"/>',
 eraser:'<path d="m3 14 10-11a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3L11 21H8l-5-4a2 2 0 0 1 0-3Zm4-4 10 7M10 21h12"/>',
 select:'<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/>',
 zoom:'<circle cx="10" cy="10" r="7"/><path d="m15 15 7 7M7 10h6M10 7v6"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>',
 options:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="var(--chrome)"/><circle cx="16" cy="12" r="2" fill="var(--chrome)"/><circle cx="10" cy="18" r="2" fill="var(--chrome)"/>',
 fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h8v8H8z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 sparkle:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7ZM20 2v4M18 4h4"/>',
 photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 18 6-5 4 3 4-6 4 6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 print:'<path d="M6 8V3h12v5M6 17H3V9h18v8h-3M6 14h12v7H6zM17 11h1"/>',
 ruler:'<path d="m3 16 13-13 5 5L8 21l-5-5Zm5-5 2 2m2-6 2 2m2-6 2 2"/>'
 };
 P.icon=name=>'<svg class="ps-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.grid)+'</svg>';
 P.setIcon=(button,name)=>{const old=button?.querySelector('i,svg.ps-icon');if(old)old.outerHTML=P.icon(name);};
})();
