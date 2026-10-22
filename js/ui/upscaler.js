/* Prisma Studio — painel integrado de ampliação e restauração.
 * Carrega o ampliador sob demanda; o documento só muda ao aplicar o resultado.
 * A operação guarda um comando de documento inteiro para restaurar todas as camadas.
 */
(function(){
 'use strict';const PS=window.PS,$=PS.$,doc=PS.doc;
 const dlg=document.createElement('dialog');dlg.id='upscalerDialog';dlg.className='upscaler-dialog';dlg.setAttribute('aria-labelledby','upscalerTitle');
 dlg.innerHTML='<header><div><small>PRISMA STUDIO</small><h2 id="upscalerTitle">Ampliar e restaurar</h2></div><button class="btn icon ghost" type="button" aria-label="Fechar ampliador">✕</button></header><p class="upscaler-note">A prévia usa a imagem visível. Aplicar cria uma imagem mesclada; Desfazer recupera as camadas e máscaras anteriores.</p><iframe title="Ampliador e restaurador de imagens"></iframe>';
 document.body.append(dlg);const frame=$('iframe',dlg);let sourceVersion,sourceName,ready=false,pending=null;
 const close=()=>{dlg.close();frame.removeAttribute('src');ready=false;pending=null;};$('button',dlg).onclick=close;dlg.addEventListener('cancel',e=>{e.preventDefault();close();});
 function deliver(){if(ready&&pending){frame.contentWindow.postMessage({type:'prisma-upscale:load',...pending},'*');pending=null;}}
 PS.openUpscaler=async()=>{
  if(!doc.has){PS.toast('Abra uma imagem primeiro.','warning');return;}
  if(PS.tools.isBusy())PS.tools.commitText?.();
  PS.mobile?.close();PS.design.closePanel?.();PS.fx.close();
  const c=doc.composite(1,{live:true});sourceVersion=doc.version;sourceName=doc.name;
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob){PS.toast('Não foi possível preparar a imagem.','error');return;}
  pending={blob,name:doc.name+'.png',theme:document.documentElement.dataset.theme};dlg.showModal();frame.src='upscaler/index.html';
 };
 addEventListener('message',async event=>{
  if(event.source!==frame.contentWindow||!dlg.open)return;const m=event.data;
  if(m?.type==='prisma-upscale:ready'){ready=true;deliver();return;}
  if(m?.type==='prisma-upscale:close'){close();return;}
  if(m?.type==='prisma-upscale:download'&&m.blob instanceof Blob){const url=URL.createObjectURL(m.blob),a=document.createElement('a');a.href=url;a.download=String(m.name||'imagem-ampliada.png').replace(/[\\/]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;}
  if(m?.type!=='prisma-upscale:apply'||!(m.blob instanceof Blob))return;
  try{
   if(doc.version!==sourceVersion||doc.name!==sourceName)throw Error('O documento mudou. Feche e reabra o ampliador para usar a versão atual.');
   const img=await PS.loadImageFile(new File([m.blob],'ampliada.png',{type:'image/png'}));const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
   if(!w||!h||w*h>100e6||Math.max(w,h)>32000)throw Error('O resultado excede o tamanho suportado pelo editor.');
   const c=PS.canvas(w,h);PS.ctx(c).drawImage(img,0,0);
   doc.layers=[doc.makeLayer(c,'Imagem ampliada')];doc.size={w,h};doc.active=0;doc.editMask=false;doc.sel=null;
   doc.commit('Ampliar e restaurar imagem','fa-up-right-and-down-left-from-center','all');
   close();PS.afterOpen();PS.view.fit();if(document.body.dataset.mode==='poster')await PS.poster.refreshSource();PS.toast('Imagem aplicada. Desfazer restaura as camadas anteriores.','success');
  }catch(e){PS.toast(e.message,'error',7000);frame.contentWindow.postMessage({type:'prisma-upscale:error',message:e.message},'*');}
 });
 const b=document.createElement('button');b.id='btnUpscaler';b.className='btn icon ghost';b.title='Ampliar e restaurar imagem';b.setAttribute('aria-label',b.title);b.innerHTML='<i class="fa-solid fa-up-right-and-down-left-from-center"></i>';
 $('#btnExport').before(b);b.onclick=()=>PS.openUpscaler().catch(e=>PS.toast(e.message,'error'));
 const launch=document.createElement('button');launch.id='btnUpscaleAI';launch.className='btn soft block';launch.textContent='Abrir ampliador de IA e restauração';$('#btnUpscale').after(launch);launch.onclick=b.onclick;
 doc.on(()=>{b.disabled=launch.disabled=!doc.has;});b.disabled=launch.disabled=!doc.has;
})();
