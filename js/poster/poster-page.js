/* Prisma Studio — desenho compartilhado da arte e do recorte físico de cada folha.
 * A margem descreve o que a impressora não imprime; não cria uma segunda moldura.
 * A sangria repete somente os pixels de borda, fora da arte final, sem ampliá-la.
 */
(function(){
 'use strict';const PS=window.PS;
 PS.posterPageArtRect=(g,t,cfg,tiles=g.printed)=>{
  const core=cfg.glueStyle==='tabs'?PS.posterCoreRect(g,t,tiles):{x:g.margin,y:g.margin,w:g.cw,h:g.ch};
  if(!cfg.bleed)return core;
  const guides=cfg.glueStyle==='tabs'?PS.posterGlueGuides(g,t,tiles):[];
  return{x:0,y:0,w:guides.some(v=>v.axis==='vertical')?core.x+core.w:g.pageW,h:guides.some(v=>v.axis==='horizontal')?core.y+core.h:g.pageH};
 };
 PS.posterDrawSource=(ctx,source,g,rect,ox,oy,s,bleed=false)=>{
  const v=g.visible,extra=bleed&&!g.border?g.margin:0;
  const left=Math.max(rect.x,v.x-extra),top=Math.max(rect.y,v.y-extra),right=Math.min(rect.x+rect.w,v.x+v.w+extra),bottom=Math.min(rect.y+rect.h,v.y+v.h+extra);
  if(right<=left||bottom<=top)return;
  ctx.save();ctx.beginPath();ctx.rect(ox+left*s,oy+top*s,(right-left)*s,(bottom-top)*s);ctx.clip();ctx.imageSmoothingQuality='high';
  // Mantém o desenho central idêntico ao raster anterior; só as faixas externas são repetidas.
  ctx.drawImage(source,ox+g.img.x*s,oy+g.img.y*s,g.img.w*s,g.img.h*s);
  if(extra){
   const xs=[left,...[v.x,v.x+v.w].filter(a=>a>left&&a<right),right],ys=[top,...[v.y,v.y+v.h].filter(a=>a>top&&a<bottom),bottom];
   const toX=a=>(a-g.img.x)*source.width/g.img.w,toY=a=>(a-g.img.y)*source.height/g.img.h;
   for(let j=0;j<ys.length-1;j++)for(let i=0;i<xs.length-1;i++){
    const x0=xs[i],x1=xs[i+1],y0=ys[j],y1=ys[j+1],outsideX=x1<=v.x||x0>=v.x+v.w,outsideY=y1<=v.y||y0>=v.y+v.h;
    if(!outsideX&&!outsideY)continue;
    let sx=toX(x0),sy=toY(y0),sw=(x1-x0)*source.width/g.img.w,sh=(y1-y0)*source.height/g.img.h;
    if(outsideX){sx=x1<=v.x?toX(v.x):toX(v.x+v.w)-1;sw=1;}
    if(outsideY){sy=y1<=v.y?toY(v.y):toY(v.y+v.h)-1;sh=1;}
    sx=PS.clamp(sx,0,source.width-1);sy=PS.clamp(sy,0,source.height-1);sw=Math.min(sw,source.width-sx);sh=Math.min(sh,source.height-sy);
    ctx.drawImage(source,sx,sy,sw,sh,ox+x0*s,oy+y0*s,(x1-x0)*s,(y1-y0)*s);
   }
  }
  ctx.restore();
 };
})();
