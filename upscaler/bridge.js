/* Prisma Studio — ponte restrita entre o ampliador e o documento do editor.
 * Imagens cruzam a ponte como Blob; somente a janela que abriu o painel é aceita.
 * A aplicação é explícita, mescla o resultado e permite recuperar camadas com Desfazer.
 */
(function(){
 'use strict';
 const send=(type,extra={})=>parent.postMessage({type:'prisma-upscale:'+type,...extra},'*');
 addEventListener('message',event=>{
  if(event.source!==parent)return;if(event.data?.type==='prisma-upscale:error'){$('applyEditor').disabled=false;setStatus(event.data.message,'err');return;}if(event.data?.type!=='prisma-upscale:load')return;
  document.documentElement.dataset.theme=event.data.theme==='light'?'light':'dark';
  if(event.data.blob instanceof Blob)loadFile(new File([event.data.blob],event.data.name||'imagem.png',{type:'image/png'}));
 });
 $('applyEditor').addEventListener('click',async()=>{
  if(!finalCanvas||abort)return;
  $('applyEditor').disabled=true;
  try{const blob=await new Promise((resolve,reject)=>finalCanvas.toBlob(b=>b?resolve(b):reject(Error('Não foi possível preparar a imagem.')),'image/png'));send('apply',{blob,w:finalCanvas.width,h:finalCanvas.height});}
  catch(e){setStatus(e.message,'err');$('applyEditor').disabled=false;}
 });
 $('upEngine').addEventListener('change',()=>{refreshPlan();if($('upEngine').value==='classic')$('engine').textContent='Interpolação local · sem IA';else setEngine(navigator.gpu?'webgpu':'wasm',true);});
 $('allowDownloads').addEventListener('change',()=>{if(srcImage&&!abort)analyze();});
 // Processar com novas opções exige outra execução; o resultado anterior não é reaplicado por engano.
 $('upSettings').addEventListener('change',()=>{if(finalCanvas){$('applyEditor').disabled=true;$('dl').disabled=true;hideAfter();setStatus('Opções alteradas. Clique em Melhorar imagem para recalcular.');}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){abort?.abort();send('close');}});
 send('ready');
})();
