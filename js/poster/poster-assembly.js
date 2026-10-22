/* Prisma Studio — montagem das folhas realmente geradas para impressão.
 * Prepara cada folha na resolução escolhida, conserva uma miniatura e libera
 * o canvas grande. A sobreposição segue a mesma origem em mm usada no PDF.
 * Revisões cancelam resultados obsoletos sem substituir uma montagem nova.
 */
(function () {
  'use strict';
  const PS=window.PS,P=PS.poster,$=PS.$,pc=$('#pCanvas');
  const controls=$('#pAssemblyControls'),status=$('#pAssemblyStatus'),step=$('#pAssemblyStep'),zoom=$('#pAssemblyZoom');
  let key='',revision=0,sheets=[],ready=false,working=false,count=0,pan={x:0,y:0},drag=null,layout=null,scheduled=0;
  const signature=()=>JSON.stringify([PS.doc.version,PS.doc.params,P.geometry?.img,P.geometry?.visible,P.cfg.dpi,P.cfg.enhance,P.cfg.lift,P.geometry?.pageW,P.geometry?.pageH,P.geometry?.ov,P.geometry?.margin,P.cfg.bleed,P.cfg.glueStyle,P.cfg.markGlue,P.cfg.skipBlank]);
  const A=P.assembly={
    invalidate(){
      controls.hidden=P.cfg.view!=='assembly'||$('#view-poster').hidden;
      if(controls.hidden){clearTimeout(scheduled);if(working){revision++;working=false;key='';}return;}
      const sig=signature();if(sig!==key){revision++;key=sig;sheets=[];ready=false;working=false;pan={x:0,y:0};clearTimeout(scheduled);scheduled=setTimeout(()=>prepare(),180);}
      P.drawPreview();
    },
    draw(ctx,width,height){
      const g=P.geometry;if(!g)return;
      const base=Math.max(.001,Math.min((width-64)/(g.areaW+2*g.margin),(height-64)/(g.areaH+2*g.margin))),s=base*(+zoom.value/100);
      const ox=(width-g.areaW*s)/2+pan.x,oy=(height-g.areaH*s)/2+pan.y;layout={s,ox,oy};
      const shown=Math.min(+step.value||0,sheets.length);
      ctx.save();ctx.fillStyle='rgba(128,128,128,.12)';ctx.fillRect(ox-g.margin*s,oy-g.margin*s,(g.areaW+2*g.margin)*s,(g.areaH+2*g.margin)*s);
      for(let i=0;i<shown;i++){
        const {tile:t,canvas,placement:p}=sheets[i],left=t.left?0:g.margin,top=t.top?0:g.margin;
        // Removidas somente as margens esquerda/superior das folhas internas.
        const right=g.ov===0&&t.right?0:g.margin,bottom=g.ov===0&&t.bottom?0:g.margin;
        const paper={x:t.x0-left,y:t.y0-top,w:g.cw+left+right,h:g.ch+top+bottom};
        ctx.fillStyle='#fff';ctx.fillRect(ox+paper.x*s,oy+paper.y*s,paper.w*s,paper.h*s);
        const printed=sheets.map(v=>v.tile),core=P.cfg.glueStyle==='tabs'?PS.posterCoreRect(g,t,printed):{w:g.cw,h:g.ch};
        ctx.save();ctx.beginPath();ctx.rect(ox+t.x0*s,oy+t.y0*s,core.w*s,core.h*s);ctx.clip();ctx.imageSmoothingQuality='high';
        ctx.drawImage(canvas,ox+p.x*s,oy+p.y*s,p.w*s,p.h*s);ctx.restore();
        if(P.cfg.markGlue)PS.posterDrawGlueCanvas(ctx,g,t,ox+(t.x0-g.margin)*s,oy+(t.y0-g.margin)*s,s,sheets.map(v=>v.tile),P.cfg.glueStyle);
      }
      if($('#pAssemblyGuides').checked){
        ctx.strokeStyle='#00a7e1';ctx.lineWidth=1.5;ctx.strokeRect(ox+g.finalRect.x*s,oy+g.finalRect.y*s,g.finalRect.w*s,g.finalRect.h*s);
        ctx.strokeStyle='rgba(230,0,126,.9)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
        for(const joint of PS.posterJoints(g)){const a=joint.rect;if(joint.axis==='vertical'){ctx.beginPath();ctx.moveTo(ox+a.x*s,oy+a.y*s);ctx.lineTo(ox+a.x*s,oy+(a.y+a.h)*s);ctx.stroke();}else{ctx.beginPath();ctx.moveTo(ox+a.x*s,oy+a.y*s);ctx.lineTo(ox+(a.x+a.w)*s,oy+a.y*s);ctx.stroke();}}
        ctx.setLineDash([]);ctx.font='600 12px system-ui';ctx.textBaseline='top';
        for(let i=0;i<shown;i++){const t=sheets[i].tile,x=ox+(t.x0+3)*s,y=oy+(t.y0+3)*s;ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(x-3,y-2,36,20);ctx.fillStyle='#fff';ctx.fillText(t.code,x,y);}
      }
      ctx.restore();
      if(!sheets.length){ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-2');ctx.fillText(working?'Preparando as folhas na resolução de impressão…':'Abra a montagem para conferir as emendas.',width/2,height/2);ctx.textAlign='left';}
      const current=sheets[shown-1];
      if(ready&&P.cfg.glueStyle==='image')status.textContent=current?`${shown}/${count}: ${current.tile.code} · ${g.ov} mm de imagem repetida no arquivo. Apare a borda branca esquerda/superior que a impressora criar na folha de cima e faça dois detalhes distantes coincidirem antes de colar. A prévia mostra o PDF; margens e reduções do aplicativo de impressão não são conhecidas pelo site.`:'Nenhuma folha colocada. Avance o controle para montar.';
      else if(ready){status.textContent=current?`${shown}/${count}: ${current.tile.code} · ${g.ov>0?'aba de '+PS.fmt(g.ov,2)+' mm por baixo':'encoste sem sobrepor'} · corte a margem ${current.tile.left?'esquerda':''}${current.tile.left&&current.tile.top?' e ':''}${current.tile.top?'superior':''}${!current.tile.left&&!current.tile.top?'externa somente no acabamento':''}${current.tile.left||current.tile.top?' em '+PS.fmt(g.margin,1)+' mm medidos da borda do papel':''}. Faça a arte coincidir nas duas pontas e cubra o pontilhado. Arraste para olhar; use o zoom para conferir o encaixe.`:'Nenhuma folha colocada. Avance o controle para montar.';}
      $('#pAssemblyCount').textContent=`${shown} / ${count} folhas`;
    },
    async prepare(){return prepare();},
    get ready(){return ready;},get sheets(){return sheets;}
  };
  async function prepare(){
    if(!P.geometry||P.cfg.view!=='assembly'||$('#view-poster').hidden||working)return;
    const token=revision,renderer=P.getRaster(),g=JSON.parse(JSON.stringify(P.geometry)),tiles=g.printed;
    const dpi=P.cfg.dpi;working=true;ready=false;count=tiles.length;step.max=String(count);step.value=String(count);
    try{
      for(let i=0;i<tiles.length;i++){
        if(token!==revision)return;
        status.textContent=`Preparando ${tiles[i].code} · ${i+1}/${count} · ${dpi} DPI. As folhas usam a mesma imagem e a mesma escala.`;
        const t=tiles[i],out=await renderer.render({x:t.x0,y:t.y0,w:g.cw,h:g.ch},dpi);
        if(token!==revision)return;
        const scale=Math.min(1,1100/Math.max(out.c.width,out.c.height));
        const canvas=scale<1?PS.downscale(out.c,out.c.width*scale,out.c.height*scale):out.c;
        sheets.push({tile:t,canvas,placement:out.placement});P.drawPreview();await PS.nextFrame();
      }
      ready=true;P.drawPreview();
    }catch(e){if(token===revision){key='';status.textContent='Não foi possível preparar a montagem: '+e.message+'. Reduza o DPI e tente novamente.';}}
    finally{if(token===revision)working=false;}
  }
  step.addEventListener('input',()=>P.drawPreview());zoom.addEventListener('input',()=>P.drawPreview());$('#pAssemblyGuides').addEventListener('change',()=>P.drawPreview());
  $('#pAssemblyPrev').addEventListener('click',()=>{step.value=Math.max(0,+step.value-1);P.drawPreview();});$('#pAssemblyNext').addEventListener('click',()=>{step.value=Math.min(count,+step.value+1);P.drawPreview();});
  $('#pAssemblyReset').addEventListener('click',()=>{zoom.value=100;pan={x:0,y:0};step.value=count;P.drawPreview();});
  pc.addEventListener('pointerdown',e=>{if(P.cfg.view!=='assembly')return;pc.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};});
  pc.addEventListener('pointermove',e=>{if(!drag||P.cfg.view!=='assembly')return;pan={x:drag.px+e.clientX-drag.x,y:drag.py+e.clientY-drag.y};P.drawPreview();});
  const end=()=>{drag=null;};pc.addEventListener('pointerup',end);pc.addEventListener('pointercancel',end);
  pc.addEventListener('wheel',e=>{if(P.cfg.view!=='assembly')return;e.preventDefault();zoom.value=PS.clamp(+zoom.value*Math.exp(-e.deltaY*.0015),100,500);P.drawPreview();},{passive:false});
  new MutationObserver(()=>A.invalidate()).observe($('#view-poster'),{attributes:true,attributeFilter:['hidden']});
  A.invalidate();
})();
