/* Prisma Studio — integração de criação e inferência local nos três ambientes.
 * Exercita os mesmos comandos usados pela interface, incluindo desfazer e máscaras.
 */
window.prismaTestCreative=async function(P,sample){
 'use strict';const D=P.design,E=D.edit,check=(v,m)=>{if(!v)throw Error(m);};
 const results={},errors=[],error=e=>errors.push(e.message||String(e.reason));
 window.addEventListener('error',error);window.addEventListener('unhandledrejection',error);
 try{
  await P.setMode('design');await D.ready;await D.localFontsReady;
  const start=D.canvas.getObjects().length;
  await D.addTextStyle('editorial');check(D.canvas.getObjects().length===start+2,'Combinação de texto incompleta');
  await D.undo();check(D.canvas.getObjects().length===start,'Desfazer texto falhou');await D.redo();check(D.canvas.getObjects().length===start+2,'Refazer texto falhou');results.text=true;
  D.addSymbol('arrow');check(E.selected().type==='path','Elemento vetorial inválido');
  await D.setCreativeBackground('ocean');let saved=JSON.parse(E.serialize());await D.load(saved);check(D.canvas.getObjects().some(o=>o.prismaName==='Fundo • Mar e céu'),'Fundo não sobreviveu à reabertura');results.background=true;
  const beforeSize=E.fmt().w;await D.resizePage('custom',{w:900,h:700});check(E.fmt().w===900,'Tamanho não aplicado');await D.undo();check(E.fmt().w===beforeSize,'Desfazer tamanho falhou');await D.redo();saved=JSON.parse(E.serialize());await D.load(saved);check(E.fmt().w===900&&E.fmt().h===700,'Tamanho personalizado não foi reaberto');results.sizes=true;
  const photo=P.canvas(240,180),x=P.ctx(photo);x.fillStyle='#e6007e';x.fillRect(0,0,240,180);x.fillStyle='#00a7e1';x.fillRect(100,40,70,100);
  const pageCount=D.pages.length;await D.createCollage('four',[photo,photo,photo,photo],20);check(D.pages.length===pageCount+1,'Colagem apagou a página anterior');check(D.canvas.getObjects().length===4,'Colagem não tem quatro fotos independentes');for(const o of D.canvas.getObjects()){const r=o.getBoundingRect();check(r.left>=19&&r.top>=19&&r.left+r.width<=881&&r.top+r.height<=681,'Foto fora da célula');}results.collage=true;
  const blob=await P.canvasToBlob(photo);await D.addPhoto(new File([blob],'foto.png',{type:'image/png'}));check(E.selected().type==='image','Importação de foto falhou');results.photo=true;
  await P.setMode('editor');P.doc.newDocument(240,180,'transparent','Teste IA');P.afterOpen();P.ctx(P.doc.base).drawImage(photo,0,0);P.doc.commit('Foto original');
  const L=P.doc.layer,original=P.ctx(L.canvas).getImageData(0,0,1,1).data.join(','),version=P.doc.version;
  const alpha=new Uint8ClampedArray(320*320);for(let y=0;y<320;y++)for(let z=0;z<160;z++)alpha[y*320+z]=255;
  P.backgroundAI.applyEditor(P.backgroundAI.mask(alpha,240,180),L,version);check(!!L.mask&&P.ctx(L.canvas).getImageData(0,0,1,1).data.join(',')===original,'IA alterou pixels originais');P.doc.undo();check(!P.doc.layer.mask,'Desfazer máscara falhou');P.doc.redo();check(!!P.doc.layer.mask,'Refazer máscara falhou');results.mask=true;
  let stale=false;try{P.backgroundAI.applyEditor(P.backgroundAI.mask(alpha,240,180),L,version);}catch{stale=true;}check(stale,'Recorte antigo foi aplicado após editar');
  const controller=new AbortController();controller.abort();let aborted=false;try{await P.backgroundAI.segment(photo,{signal:controller.signal});}catch(e){aborted=e.name==='AbortError';}check(aborted,'Cancelamento não respeitado');results.cancel=true;
  if(sample){const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Foto de validação não carregou'));img.src=sample;});const stop=new AbortController(),pending=P.backgroundAI.segment(img,{signal:stop.signal});setTimeout(()=>stop.abort(),20);let cancelled=false;try{await pending;}catch(e){cancelled=e.name==='AbortError';}check(cancelled,'Cancelar análise ativa falhou');const begin=performance.now(),prediction=await P.backgroundAI.segment(img);let opaque=0,clear=0;for(const v of prediction){opaque+=v>220;clear+=v<30;}check(opaque>100&&clear>100,'Inferência real não distinguiu assunto e fundo');results.inference={milliseconds:Math.round(performance.now()-begin),opaque,clear};P.backgroundAI.release();}
  check(!errors.length,'Erro no editor: '+errors.join('; '));return results;
 }finally{window.removeEventListener('error',error);window.removeEventListener('unhandledrejection',error);}
};
