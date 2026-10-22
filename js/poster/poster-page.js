/* Prisma Studio — desenho compartilhado da arte e do recorte físico de cada folha.
 * A margem descreve o que a impressora não imprime; não cria uma segunda moldura.
 * A sangria repete somente os pixels de borda, fora da arte final, sem ampliá-la.
 * No modo celular, preenche também sobras de proporção nas folhas; são aparadas
 * no acabamento. O retângulo final e os detalhes originais permanecem intactos.
 */
(function(){
 'use strict';const PS=window.PS;
 PS.posterPageArtRect=(g,t,cfg,tiles=g.printed)=>{
  const guides=cfg.glueStyle==='tabs'?PS.posterGlueGuides(g,t,tiles):[],extra=cfg.glueStyle==='tabs'?PS.posterSeamBleed(g):0;
  const core=cfg.glueStyle==='tabs'?PS.posterCoreRect(g,t,tiles):{x:g.margin,y:g.margin,w:g.cw,h:g.ch};
  const right=guides.some(v=>v.axis==='vertical'),bottom=guides.some(v=>v.axis==='horizontal');
  core.w+=right?extra:0;core.h+=bottom?extra:0;
  if(!cfg.bleed)return core;
  return{x:0,y:0,w:right?core.x+core.w:g.pageW,h:bottom?core.y+core.h:g.pageH};
 };
 PS.posterDrawSource=(ctx,source,g,rect,ox,oy,s,bleed=false,edgeFill=false)=>{
  const v=g.visible,extra=bleed&&!g.border?(edgeFill?Math.max(g.areaW,g.areaH,g.pageW,g.pageH):g.margin):0;
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

/* Molde físico único: primeiro calcula o recorte global, depois coloca arte e
 * guias DENTRO da folha. PDF, PNG e prévia usam este mesmo resultado A4.
 * Nenhum arredondamento de raster pode aumentar a caixa física da página.
 */
(function(){
 'use strict';const PS=window.PS;
 PS.posterSheetPlan=(g,t,cfg,dpi)=>{
  if(!Number.isFinite(dpi)||dpi<=0)throw Error('DPI inválido.');
  const width=Math.round(g.pageW*dpi/25.4),height=Math.round(g.pageH*dpi/25.4);
  if(width<1||height<1||width*height>60e6)throw Error('Folha excede o limite de 60 MP. Reduza o DPI.');
  const clip=PS.posterPageArtRect(g,t,cfg,g.printed);
  if(clip.x<0||clip.y<0||clip.x+clip.w>g.pageW+1e-7||clip.y+clip.h>g.pageH+1e-7)throw Error('A arte ou a aba excede a folha.');
  const crop={x:t.x0-g.margin,y:t.y0-g.margin,w:g.pageW,h:g.pageH};
  const left=Math.max(crop.x+clip.x,g.visible.x),top=Math.max(crop.y+clip.y,g.visible.y);
  const right=Math.min(crop.x+clip.x+clip.w,g.visible.x+g.visible.w),bottom=Math.min(crop.y+clip.y+clip.h,g.visible.y+g.visible.h);
  const w=Math.max(0,right-left),h=Math.max(0,bottom-top),mmPerPixel=g.mmPerPx;
  return{width,height,pageW:g.pageW,pageH:g.pageH,crop,clip,
   sourceCrop:w>0&&h>0?{x:Math.max(0,(left-g.img.x)/mmPerPixel),y:Math.max(0,(top-g.img.y)/mmPerPixel),w:w/mmPerPixel,h:h/mmPerPixel}:null,
   artInside:w>0&&h>0?{x:left-crop.x,y:top-crop.y,w,h}:null,
   placement:{x:crop.x,y:crop.y,w:g.pageW,h:g.pageH}};
 };
 PS.createPosterSheetRenderer=(source,geometry,settings)=>{
  const g=JSON.parse(JSON.stringify(geometry)),cfg={...settings};
  const raster=PS.createPosterRaster(source,g,cfg);
  const render=async(t,dpi,opts={})=>{
   const plan=PS.posterSheetPlan(g,t,cfg,dpi),raw=await raster.render(plan.crop,dpi,opts);
   const c=PS.canvas(plan.width,plan.height),x=PS.ctx(c),sx=plan.width/g.pageW,sy=plan.height/g.pageH;
   x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.save();x.scale(sx,sy);
   // A compensação manual fica dentro do molde, nunca na caixa do PDF.
   const fx=100/(cfg.calX||100),fy=100/(cfg.calY||100);
   x.translate(g.pageW/2,g.pageH/2);x.scale(fx,fy);x.translate(-g.pageW/2,-g.pageH/2);
   x.save();x.beginPath();x.rect(plan.clip.x,plan.clip.y,plan.clip.w,plan.clip.h);x.clip();
   const p=raw.placement;x.imageSmoothingQuality='high';
   x.drawImage(raw.c,p.x-plan.crop.x,p.y-plan.crop.y,p.w,p.h);x.restore();
   if(cfg.markGlue)PS.posterDrawGlueCanvas(x,g,t,0,0,1,g.printed,cfg.glueStyle);
   // Marcas e identificação pertencem à margem, sem ocupar espaço extra no papel.
   const m=g.margin;
   if(cfg.markCut&&m>=1.5){
    const L=Math.min(m-.6,5),gap=.6;x.strokeStyle='#737373';x.lineWidth=.35/PS.PT_PER_MM;
    x.beginPath();for(const[cx,cy]of[[m,m],[m+g.cw,m],[m,m+g.ch],[m+g.cw,m+g.ch]]){
     const a=cx===m?-1:1,b=cy===m?-1:1;
     x.moveTo(cx+a*gap,cy);x.lineTo(cx+a*(gap+L),cy);x.moveTo(cx,cy+b*gap);x.lineTo(cx,cy+b*(gap+L));
    }x.stroke();
   }
   if(cfg.markLabels&&m>=3){x.fillStyle='#737373';x.font=`${Math.min(6.5,m*PS.PT_PER_MM*.45)/PS.PT_PER_MM}px Arial`;x.fillText(`${t.code} · linha ${t.r+1}, coluna ${t.c+1} · pôster ${g.cols}×${g.rows}`,m+6,m*.62);}
   x.restore();c.posterPlacement=plan.placement;
   // Libera o raster temporário grande; o cache em blocos continua limitado.
   raw.c.width=raw.c.height=1;
   return{c,placement:plan.placement,plan};
  };
  return{geometry:g,settings:cfg,render};
 };
})();
