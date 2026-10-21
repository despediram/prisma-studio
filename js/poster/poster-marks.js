/* Prisma Studio — núcleo visível e abas de colagem compartilhados pelo PDF e prévia.
 * No modo abas, a arte termina antes da faixa branca e continua na folha vizinha.
 * O modo avançado mantém imagem repetida sob as guias de sobreposição.
 */
(function(){
 'use strict';const PS=window.PS,K=PS.PT_PER_MM;
 PS.posterGlueGuides=(g,t,tiles=g.printed||g.tiles)=>{
  if(!(g.ov>0))return [];
  const guides=[],neighbor=(r,c)=>tiles.find(v=>v.r===r&&v.c===c);
  const right=neighbor(t.r,t.c+1),bottom=neighbor(t.r+1,t.c),m=g.margin;
  if(right)guides.push({axis:'vertical',x:m+g.stepX,y:m,w:g.ov,h:g.ch,from:t.code,to:right.code});
  if(bottom)guides.push({axis:'horizontal',x:m,y:m+g.stepY,w:g.cw,h:g.ov,from:t.code,to:bottom.code});
  return guides;
 };
 PS.posterCoreRect=(g,t,tiles)=>{const guides=PS.posterGlueGuides(g,t,tiles);return {x:g.margin,y:g.margin,w:g.cw-(guides.some(v=>v.axis==='vertical')?g.ov:0),h:g.ch-(guides.some(v=>v.axis==='horizontal')?g.ov:0)};};
 PS.posterDrawGluePdf=(page,g,t,{P2,font,rotate=false,tiles,style='overlap'})=>{
  const {rgb,degrees,pushGraphicsState,popGraphicsState,rectangle,clip,endPath}=window.PDFLib,black=rgb(.12,.12,.12),white=rgb(1,1,1);
  for(const q of PS.posterGlueGuides(g,t,tiles)){
   const a=P2(q.x,q.y),b=P2(q.x+q.w,q.y+q.h);
   page.pushOperators(pushGraphicsState(),rectangle(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y)),clip(),endPath());
   page.drawRectangle({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y),color:white,opacity:style==='tabs'?1:.60});
   // A linha fica inteiramente no lado escondido, inclusive sua espessura.
   const inset=Math.min(.35,g.ov*.3),vertical=q.axis==='vertical';
   const start=P2(q.x+(vertical?0:inset),q.y+(vertical?inset:0)),end=vertical?P2(q.x,q.y+q.h-inset):P2(q.x+q.w-inset,q.y);
   page.drawLine({start,end,thickness:Math.min(.6,g.ov*K*.25),dashArray:[3,2],color:black});
   if(g.ov<2.5){page.pushOperators(popGraphicsState());continue;}
   const label=`${q.from} > ${q.to} | COLE ${q.to} SOBRE ESTA FAIXA`,length=(vertical?q.h:q.w)-4;
   const size=Math.min(7,g.ov*K*.45,length*K/font.widthOfTextAtSize(label,1));
   const labelW=font.widthOfTextAtSize(label,size)/K;
   const p=vertical?P2(q.x+q.w*.62,q.y+(q.h+labelW)/2):P2(q.x+(q.w-labelW)/2,q.y+q.h*.62);
   page.drawText(label,{x:p.x,y:p.y,size,font,color:black,rotate:degrees(vertical?(rotate?0:90):(rotate?-90:0))});
   page.pushOperators(popGraphicsState());
  }
 };
 PS.posterDrawGlueCanvas=(ctx,g,t,ox,oy,s,tiles,style='overlap')=>{
  ctx.save();
  for(const q of PS.posterGlueGuides(g,t,tiles)){
   ctx.save();ctx.beginPath();ctx.rect(ox+q.x*s,oy+q.y*s,q.w*s,q.h*s);ctx.clip();
   ctx.fillStyle=style==='tabs'?'#ffffff':'rgba(255,255,255,.6)';ctx.fillRect(ox+q.x*s,oy+q.y*s,q.w*s,q.h*s);
   const inset=Math.min(.35,g.ov*.3),vertical=q.axis==='vertical';
   ctx.strokeStyle='#222';ctx.lineWidth=Math.min(.22,g.ov*.25)*s;ctx.setLineDash([1*s,.7*s]);ctx.beginPath();ctx.moveTo(ox+(q.x+(vertical?0:inset))*s,oy+(q.y+(vertical?inset:0))*s);ctx.lineTo(ox+(vertical?q.x:q.x+q.w-inset)*s,oy+(vertical?q.y+q.h-inset:q.y)*s);ctx.stroke();ctx.setLineDash([]);
   if(g.ov<2.5){ctx.restore();continue;}
   const label=`${q.from} > ${q.to} | COLE ${q.to} SOBRE ESTA FAIXA`,size=Math.min(2.47,g.ov*.45)*s;
   ctx.save();ctx.fillStyle='#222';ctx.font=`${size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
   if(vertical){ctx.translate(ox+(q.x+q.w*.55)*s,oy+(q.y+q.h/2)*s);ctx.rotate(-Math.PI/2);ctx.fillText(label,0,0,(q.h-4)*s);}else ctx.fillText(label,ox+(q.x+q.w/2)*s,oy+(q.y+q.h*.55)*s,(q.w-4)*s);ctx.restore();ctx.restore();
  }
  ctx.restore();
 };
})();
