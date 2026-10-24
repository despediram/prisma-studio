/* Prisma Studio — prévia, refinamento e aplicação do recorte por IA.
 * O diálogo mantém o original intacto até Aplicar; cancelar encerra o worker.
 */
(function(){
 'use strict';const PS=window.PS,$=PS.$,d=PS.doc;
 const dlg=document.createElement('dialog');dlg.id='subjectDialog';dlg.className='subject-dialog';dlg.setAttribute('aria-labelledby','subjectTitle');
 dlg.innerHTML='<header><div><small>PRISMA • IA LOCAL</small><h2 id="subjectTitle">Remover fundo com IA</h2></div><button class="btn icon ghost" id="subjectClose" aria-label="Fechar recorte">✕</button></header><p class="hint">Sua foto fica neste aparelho. O modelo está incluído no aplicativo e funciona sem internet. Revise cabelos, transparências e detalhes antes de aplicar.</p><div class="subject-preview"><canvas id="subjectPreview" aria-label="Prévia do recorte"></canvas></div><div class="subject-view"><button class="btn soft sm" id="subjectBefore" aria-pressed="false">Ver original</button><button class="btn soft sm" id="subjectRun">Remover fundo</button><button class="btn ghost sm" id="subjectStop" hidden>Cancelar análise</button></div><p id="subjectStatus" class="hint" role="status" aria-live="polite">Pronto para analisar a foto.</p><progress id="subjectProgress" max="1" hidden></progress><div id="subjectRefine" hidden><label class="sl"><span>Refinar transparência da borda</span><input id="subjectEdge" type="range" min="-30" max="30" value="0"><output>0</output></label><label class="check"><input id="subjectInvert" type="checkbox"> Inverter área recortada</label></div><footer><button class="btn ghost" id="subjectDownload" disabled>Baixar PNG</button><button class="btn ghost" id="subjectCancel">Cancelar</button><button class="btn primary" id="subjectApply" disabled>Aplicar recorte</button></footer>';
 document.body.append(dlg);let current=null,controller=null,alpha=null,before=false,running=false;
 const cv=$('#subjectPreview'),ctx=PS.ctx(cv),status=$('#subjectStatus'),progress=$('#subjectProgress');
 function close(){controller?.abort();PS.backgroundAI.release();current=null;alpha=null;running=false;dlg.close();}
 function size(){return {w:current.source.naturalWidth||current.source.width,h:current.source.naturalHeight||current.source.height};}
 function mask(w,h){return PS.backgroundAI.mask(alpha,w,h,+$('#subjectEdge').value,$('#subjectInvert').checked);}
 function preview(){if(!current)return;const {w,h}=size(),s=Math.min(1,900/Math.max(w,h));cv.width=Math.max(1,Math.round(w*s));cv.height=Math.max(1,Math.round(h*s));ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(current.source,0,0,cv.width,cv.height);if(alpha&&!before){ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask(cv.width,cv.height),0,0);ctx.globalCompositeOperation='source-over';}}
 function controls(){for(const id of ['subjectRun','subjectApply','subjectDownload','subjectEdge','subjectInvert'])$('#'+id).disabled=running||(!alpha&&['subjectApply','subjectDownload','subjectEdge','subjectInvert'].includes(id));$('#subjectStop').hidden=!running;progress.hidden=!running;$('#subjectRefine').hidden=!alpha;}
 PS.openBackgroundAI=options=>{
  if(dlg.open)return;
  if(!options){if(!d.has){PS.toast('Abra uma imagem primeiro.','info');return;}if(PS.tools.isBusy()){PS.toast('Conclua a ferramenta atual antes de recortar o fundo.','info');return;}const L=d.layer,version=d.version;options={source:L.canvas,name:L.name,apply:result=>PS.backgroundAI.applyEditor(result,L,version)};}
  current=options;alpha=null;before=false;running=false;$('#subjectEdge').value=0;$('#subjectEdge').nextElementSibling.textContent='0';$('#subjectInvert').checked=false;$('#subjectBefore').textContent='Ver original';$('#subjectBefore').setAttribute('aria-pressed','false');status.textContent='Pronto para analisar a foto. A primeira análise prepara o motor local.';controls();preview();PS.mobile?.close();PS.design.closePanel?.();dlg.showModal();
 };
 $('#subjectRun').onclick=async()=>{
  if(running||!current)return;const target=current;controller=new AbortController();running=true;controls();
  try{const result=await PS.backgroundAI.segment(target.source,{signal:controller.signal,onProgress:(text,value)=>{if(current!==target)return;status.textContent=text;if(value===undefined)progress.removeAttribute('value');else progress.value=value;}});if(current!==target)return;alpha=result;before=false;status.textContent='Recorte pronto. Confira o contorno; Aplicar preserva o histórico.';preview();}
  catch(e){if(current===target)status.textContent=e.name==='AbortError'?'Análise cancelada. O original foi preservado.':'Não foi possível recortar: '+e.message;}
  finally{if(current===target){running=false;controls();}}
 };
 $('#subjectStop').onclick=()=>controller?.abort();$('#subjectClose').onclick=$('#subjectCancel').onclick=close;
 dlg.addEventListener('cancel',e=>{e.preventDefault();close();});dlg.addEventListener('keydown',e=>e.stopPropagation());
 $('#subjectBefore').onclick=()=>{before=!before;$('#subjectBefore').setAttribute('aria-pressed',String(before));$('#subjectBefore').textContent=before?'Ver recorte':'Ver original';preview();};
 $('#subjectEdge').oninput=e=>{e.target.nextElementSibling.textContent=e.target.value;preview();};$('#subjectInvert').onchange=preview;
 $('#subjectApply').onclick=async()=>{if(!alpha||running||!current)return;const target=current;running=true;controls();try{await PS.nextFrame();const {w,h}=size();await target.apply(mask(w,h));close();PS.toast('Fundo removido. Desfazer recupera a versão anterior.','success');}catch(e){running=false;status.textContent=e.message;controls();}};
 $('#subjectDownload').onclick=async()=>{if(!alpha||!current||running)return;running=true;controls();try{await PS.nextFrame();const {w,h}=size(),c=PS.canvas(w,h),x=PS.ctx(c);x.drawImage(current.source,0,0,w,h);x.globalCompositeOperation='destination-in';x.drawImage(mask(w,h),0,0);await PS.download(await PS.canvasToBlob(c,'image/png'),String(current.name||'imagem').replace(/[\\/:*?"<>|]/g,'_')+'-sem-fundo.png');c.width=c.height=1;}catch(e){status.textContent=e.message;}finally{running=false;controls();}};
 const button=document.createElement('button');button.id='lyRemoveBgAI';button.className='btn primary block';button.textContent='Remover fundo com IA';button.onclick=()=>PS.openBackgroundAI();$('#lyRemoveBg').before(button);
 d.on(()=>button.disabled=!d.has);button.disabled=!d.has;
})();
