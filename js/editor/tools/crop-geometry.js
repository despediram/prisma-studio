/* Prisma Studio — geometria pura do recorte: seleção e alças com âncora estável.
 * Limita a área ao documento sem travar ao alcançar uma borda. Não altera pixels.
 */
(function(root){
 'use strict';
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const G={
  select(start,end,aspect,W,H){
   const sx=clamp(start.x,0,W),sy=clamp(start.y,0,H),left=end.x<sx,up=end.y<sy;
   let w=Math.max(Math.min(4,W),Math.abs(clamp(end.x,0,W)-sx)),h=Math.max(Math.min(4,H),Math.abs(clamp(end.y,0,H)-sy));
   const maxW=left?sx:W-sx,maxH=up?sy:H-sy;
   if(aspect){w=Math.max(w,h*aspect);w=Math.min(w,maxW,maxH*aspect);h=w/aspect;}
   else {w=Math.min(w,maxW);h=Math.min(h,maxH);}
   return {x:left?sx-w:sx,y:up?sy-h:sy,w,h};
  },
  resize(r,handle,dx,dy,aspect,W,H){
   const west=handle.includes('w'),east=handle.includes('e'),north=handle.includes('n'),south=handle.includes('s');
   if(!aspect){
    const x=west?clamp(r.x+dx,0,r.x+r.w-Math.min(4,r.w)):r.x;
    const y=north?clamp(r.y+dy,0,r.y+r.h-Math.min(4,r.h)):r.y;
    return {x,y,w:east?clamp(r.w+dx,Math.min(4,W-x),W-x):r.x+r.w-x,h:south?clamp(r.h+dy,Math.min(4,H-y),H-y):r.y+r.h-y};
   }
   const ax=west?r.x+r.w:east?r.x:r.x+r.w/2,ay=north?r.y+r.h:south?r.y:r.y+r.h/2;
   const maxW=west?ax:east?W-ax:2*Math.min(ax,W-ax),maxH=north?ay:south?H-ay:2*Math.min(ay,H-ay);
   const xd=west?-dx:dx,yd=(north?-dy:dy)*aspect;
   const desired=(!west&&!east)?(r.h+(north?-dy:dy))*aspect:r.w+((north||south)&&Math.abs(yd)>Math.abs(xd)?yd:xd);
   const limit=Math.min(maxW,maxH*aspect),w=clamp(desired,Math.min(4,4*aspect,limit),limit),h=w/aspect;
   return {x:west?ax-w:east?ax:ax-w/2,y:north?ay-h:south?ay:ay-h/2,w,h};
  }
 };
 if(typeof module==='object'&&module.exports)module.exports=G;
 else root.PS.cropGeometry=G;
})(typeof window==='object'?window:globalThis);
