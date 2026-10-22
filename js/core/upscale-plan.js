/* Prisma Studio — cálculo puro dos tamanhos de ampliação.
 * O orçamento limita a área e cada lado; não mede a memória livre do aparelho.
 * Medidas recomendadas sempre arredondam para baixo, preservando a proporção.
 */
(function(root){
 'use strict';
 function valid(w,h,mp,side=32000){return Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0&&w*h<=mp*1e6&&Math.max(w,h)<=side;}
 function fit(w,h,mp,side=32000,maximum=Infinity){
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||!Number.isFinite(mp)||mp<=0)throw Error('Dimensões inválidas.');
  const k=Math.min(maximum,Math.sqrt(mp*1e6/(w*h)),side/w,side/h);
  const W=Math.max(1,Math.floor(w*k)),H=Math.max(1,Math.floor(h*k));
  return {w:W,h:H,factor:Math.min(W/w,H/h),reduced:W<w||H<h};
 }
 const api={valid,fit,recommend:(w,h,mp,side=32000)=>fit(w,h,mp,side,2)};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PrismaUpscalePlan=api;
})(typeof window==='undefined'?globalThis:window);
